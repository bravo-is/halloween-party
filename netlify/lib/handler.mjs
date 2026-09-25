import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE = 'after_dark_host';
const tokenPattern = /^[a-f0-9]{48}$/;
function equal(a,b) { const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y); }
function signature(value,secret){return createHmac('sha256',secret).update(value).digest('hex');}
export function makeSession(secret,now=Date.now()){const expires=String(now+8*60*60*1000);return `${expires}.${signature(expires,secret)}`;}
export function validSession(cookie,secret,now=Date.now()){
  if(!secret) return false;
  const value=cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
  if(!value) return false;
  const [expires,sig]=value.split('.');return /^\d+$/.test(expires)&&Number(expires)>now&&Number(expires)<=now+8*60*60*1000&&!!sig&&equal(sig,signature(expires,secret));
}
export function createHandler({getStore,password,party}){
  async function guestsIn(store){
    const guests=[];
    for await(const page of store.list({prefix:'invite/',paginate:true})){
      guests.push(...(await Promise.all(page.blobs.map(blob=>store.get(blob.key,{type:'json'})))).filter(Boolean));
    }
    return guests;
  }
  return async request => {
    const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
    const url=new URL(request.url);
    const secret=password();
    const cookie=(value,age)=>`${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${url.protocol==='https:'?'; Secure':''}`;
    if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405,{'Allow':'GET, POST'});
    try{
      if(request.method==='GET'){
        if(url.searchParams.get('view')==='board'){
          const store=getStore();const guests=await guestsIn(store);
          const announcement=await store.get('board/announcement',{type:'json'});
          return json({invitedCount:guests.reduce((sum,g)=>sum+1+(g.plusOneAllowed?1:0),0),announcement:announcement||{text:'',updatedAt:null}});
        }
        const token=url.searchParams.get('invite');
        if(!tokenPattern.test(token||''))return json({error:'This invitation is not valid. Ask your hosts for your personal link.'},404);
        const guest=await getStore().get(`invite/${token}`,{type:'json'});
        if(!guest)return json({error:'We could not find this invitation. Ask your hosts for a new link.'},404);
        return json({name:guest.name,status:guest.status,note:guest.note,plusOneAllowed:!!guest.plusOneAllowed,plusOne:!!guest.plusOne,party});
      }
      // JSON requests plus exact-origin validation prevent cross-site form submissions.
      if(request.headers.get('origin') && request.headers.get('origin')!==url.origin)return json({error:'Origin not allowed.'},403);
      if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required.'},415);
      const raw=await request.text();if(raw.length>8192)return json({error:'Request is too large.'},413);
      let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid JSON.'},400);}
      if(!body||typeof body!=='object')return json({error:'Invalid request.'},400);
      if(body.action==='rsvp'){
        if(!tokenPattern.test(body.token||'')||!['yes','no'].includes(body.status)||typeof body.note!=='string'||body.note.length>1000)return json({error:'Choose a response and keep your note under 1,000 characters.'},400);
        const store=getStore();const guest=await store.get(`invite/${body.token}`,{type:'json'});
        if(!guest)return json({error:'Invitation not found.'},404);
        if(body.plusOne!==undefined&&typeof body.plusOne!=='boolean')return json({error:'Choose whether you are bringing a guest.'},400);
        if(body.plusOne&&!guest.plusOneAllowed)return json({error:'This invitation does not include a +1.'},400);
        const updated={...guest,status:body.status,note:body.note.trim(),plusOne:body.status==='yes'&&!!body.plusOne,updatedAt:new Date().toISOString()};
        await store.setJSON(`invite/${body.token}`,updated);
        return json({status:updated.status});
      }
      if(!secret)return json({error:'Host access needs an ADMIN_PASSWORD set in Netlify.'},503);
      if(body.action==='login'){
        if(typeof body.password!=='string'||!equal(signature(body.password,secret),signature(secret,secret)))return json({error:'No entry for sinners. (wrong password)'},401);
        return json({ok:true},200,{'Set-Cookie':cookie(makeSession(secret),28800)});
      }
      if(body.action==='logout')return json({ok:true},200,{'Set-Cookie':cookie('',0)});
      if(!validSession(request.headers.get('cookie'),secret))return json({error:'Sign in to view the guest list.'},401);
      if(body.action==='announcement'){
        if(typeof body.text!=='string'||body.text.length>3000)return json({error:'Keep the announcement under 3,000 characters.'},400);
        const announcement={text:body.text.trim(),updatedAt:new Date().toISOString()};
        await getStore().setJSON('board/announcement',announcement);return json({announcement});
      }
      if(body.action==='edit'){
        if(!tokenPattern.test(body.token||'')||typeof body.plusOneAllowed!=='boolean')return json({error:'Invalid invitation update.'},400);
        const store=getStore();const guest=await store.get(`invite/${body.token}`,{type:'json'});
        if(!guest)return json({error:'Invitation not found.'},404);
        const updated={...guest,plusOneAllowed:body.plusOneAllowed,plusOne:body.plusOneAllowed&&!!guest.plusOne};
        await store.setJSON(`invite/${body.token}`,updated);return json({guest:updated});
      }
      if(body.action==='list'){
        const store=getStore();const guests=await guestsIn(store);
        return json({guests:guests.sort((a,b)=>a.name.localeCompare(b.name)),announcement:await store.get('board/announcement',{type:'json'})});
      }
      if(body.action==='create'){
        if(body.plusOneAllowed!==undefined&&typeof body.plusOneAllowed!=='boolean')return json({error:'Invalid +1 option.'},400);
        if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>100)return json({error:'Enter a guest name of 1–100 characters.'},400);
        const token=randomBytes(24).toString('hex');
        const guest={token,name:body.name.trim(),status:'pending',note:'',plusOneAllowed:!!body.plusOneAllowed,plusOne:false,createdAt:new Date().toISOString(),updatedAt:null};
        await getStore().setJSON(`invite/${token}`,guest);return json({guest},201);
      }
      return json({error:'Unknown action.'},400);
    }catch(error){console.error('Invitation API failed:',error instanceof Error?error.message:'Unknown error');return json({error:'The door is temporarily stuck. Please try again.'},500);}
  };
}
