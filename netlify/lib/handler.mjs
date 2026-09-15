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
  return async request => {
    const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
    const url=new URL(request.url);
    const secret=password();
    const cookie=(value,age)=>`${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${url.protocol==='https:'?'; Secure':''}`;
    if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405,{'Allow':'GET, POST'});
    try{
      if(request.method==='GET'){
        const token=url.searchParams.get('invite');
        if(!tokenPattern.test(token||''))return json({error:'This invitation is not valid. Ask your hosts for your personal link.'},404);
        const guest=await getStore().get(`invite/${token}`,{type:'json'});
        if(!guest)return json({error:'We could not find this invitation. Ask your hosts for a new link.'},404);
        return json({name:guest.name,status:guest.status,note:guest.note,party});
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
        const updated={...guest,status:body.status,note:body.note.trim(),updatedAt:new Date().toISOString()};
        await store.setJSON(`invite/${body.token}`,updated);
        return json({status:updated.status});
      }
      if(!secret)return json({error:'Host access needs an ADMIN_PASSWORD set in Netlify.'},503);
      if(body.action==='login'){
        if(typeof body.password!=='string'||!equal(signature(body.password,secret),signature(secret,secret)))return json({error:'That password does not open this door.'},401);
        return json({ok:true},200,{'Set-Cookie':cookie(makeSession(secret),28800)});
      }
      if(body.action==='logout')return json({ok:true},200,{'Set-Cookie':cookie('',0)});
      if(!validSession(request.headers.get('cookie'),secret))return json({error:'Sign in to view the guest list.'},401);
      if(body.action==='list'){
        const store=getStore();const guests=[];
        for await(const page of store.list({prefix:'invite/',paginate:true})){
          const records=await Promise.all(page.blobs.map(blob=>store.get(blob.key,{type:'json'})));
          guests.push(...records.filter(Boolean));
        }
        return json({guests:guests.sort((a,b)=>a.name.localeCompare(b.name))});
      }
      if(body.action==='create'){
        if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>100)return json({error:'Enter a guest name of 1–100 characters.'},400);
        const token=randomBytes(24).toString('hex');
        const guest={token,name:body.name.trim(),status:'pending',note:'',createdAt:new Date().toISOString(),updatedAt:null};
        await getStore().setJSON(`invite/${token}`,guest);return json({guest},201);
      }
      return json({error:'Unknown action.'},400);
    }catch(error){console.error('Invitation API failed:',error instanceof Error?error.message:'Unknown error');return json({error:'The door is temporarily stuck. Please try again.'},500);}
  };
}
