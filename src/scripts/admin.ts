import QRCode from 'qrcode';
type Guest = {token:string;name:string;status:'yes'|'no'|'pending';note:string;updatedAt:string|null;plusOneAllowed?:boolean;plusOne?:boolean};
let guests: Guest[] = [];
const $ = <T extends HTMLElement = HTMLElement>(s:string) => document.querySelector<T>(s)!;
async function api(action:string, body:Record<string,unknown> = {}) {
  const response = await fetch('/.netlify/functions/api', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...body})});
  const data = await response.json();
  if (!response.ok) { if(response.status === 401) showLogin(); throw new Error(data.error || 'Something went wrong. Try again.'); }
  return data;
}
function showLogin(){ $('#login').hidden=false;$('#dashboard').hidden=true;$('#logout').hidden=true;guests=[];$('#guest-list').replaceChildren(); }
async function refresh(){
  const data = await api('list'); guests = data.guests;
  $<HTMLTextAreaElement>('#announcement').value = data.announcement?.text || '';
  $('#login').hidden=true;$('#dashboard').hidden=false;$('#logout').hidden=false;
  $('#total-count').textContent=String(guests.reduce((sum,g)=>sum+1+(g.plusOneAllowed?1:0),0));
  for(const status of ['yes','no','pending']) $(`#${status}-count`).textContent=String(guests.filter(g=>g.status===status).reduce((sum,g)=>sum+1+(status==='yes'&&g.plusOne?1:0),0));
  render();
}
const inviteUrl = (token:string) => `${location.origin}/?invite=${encodeURIComponent(token)}#invitation`;
function render(){
  const query=$<HTMLInputElement>('#search').value.toLowerCase();const filter=$<HTMLSelectElement>('#filter').value;
  const filtered=guests.filter(g=>g.name.toLowerCase().includes(query)&&(filter==='all'||g.status===filter));
  const list=$('#guest-list');list.replaceChildren();
  if(!filtered.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=guests.length?'No souls match your search.':'The night starts with an invitation. Add your first guest.';list.append(empty);}
  filtered.forEach(guest=>{
    const row=document.createElement('article');row.className='guest-row';
    const info=document.createElement('div');const name=document.createElement('h3');name.textContent=guest.name;
    const meta=document.createElement('div');meta.className='guest-meta';const badge=document.createElement('span');badge.className='badge';badge.textContent=({yes:'Coming ↗︎',no:'Can’t make it',pending:'Awaiting a sign'})[guest.status];meta.append(badge);
    if(guest.updatedAt){const time=document.createElement('span');time.textContent=`Updated ${new Date(guest.updatedAt).toLocaleDateString()}`;meta.append(time);}
    info.append(name,meta);if(guest.note){const note=document.createElement('p');note.className='guest-note';note.textContent=guest.note;info.append(note);}
    const actions=document.createElement('div');actions.className='guest-actions';
    const copy=document.createElement('button');copy.className='button';copy.textContent='Copy link ↗︎';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(inviteUrl(guest.token));copy.textContent='Copied ✓︎';setTimeout(()=>copy.textContent='Copy link ↗︎',2000);}catch{$('#admin-message').textContent='Clipboard unavailable. Open the QR view to copy the invitation URL.';}});
    const qr=document.createElement('button');qr.className='button';qr.textContent='QR code ⊞';qr.addEventListener('click',async()=>{try{const url=inviteUrl(guest.token);const image=await QRCode.toDataURL(url,{width:720,margin:3,color:{dark:'#0c0d0f',light:'#ffffff'},errorCorrectionLevel:'M'});const qrImage=new Image();qrImage.id='qr-image';qrImage.alt='Personal invitation QR code';qrImage.width=720;qrImage.height=720;qrImage.src=image;$('#qr-image-slot').replaceChildren(qrImage);$<HTMLAnchorElement>('#qr-download').href=image;$<HTMLAnchorElement>('#qr-url').href=url;$('#qr-url').textContent=url;$('#qr-title').textContent=`For ${guest.name}`;$<HTMLDialogElement>('#qr-dialog').showModal();}catch{$('#admin-message').textContent='Could not create QR code. Please try again.';}});
    const extra=document.createElement('button');extra.className='button';extra.textContent=guest.plusOneAllowed?'Remove +1':'Allow +1';extra.setAttribute('aria-label',`${extra.textContent} for ${guest.name}`);
    extra.addEventListener('click',async()=>{extra.disabled=true;try{await api('edit',{token:guest.token,plusOneAllowed:!guest.plusOneAllowed});await refresh();$('#admin-message').textContent='Invitation updated. The existing link and QR code still work.';}catch(error){$('#admin-message').textContent=(error as Error).message;}finally{extra.disabled=false;}});
    if(guest.plusOneAllowed){const detail=document.createElement('p');detail.className='subtle';detail.textContent=guest.plusOne?'Bringing a +1':'+1 allowed · not attending or not yet confirmed';info.append(detail);}
    actions.append(extra,copy,qr);row.append(info,actions);list.append(row);
  });
}
$('#login').addEventListener('submit',async e=>{e.preventDefault();const button=$<HTMLButtonElement>('#login button');button.disabled=true;try{await api('login',{password:$<HTMLInputElement>('#password').value});$<HTMLInputElement>('#password').value='';$('#login-message').classList.remove('error');await refresh();}catch(error){$('#login-message').textContent=(error as Error).message;$('#login-message').classList.add('error');}finally{button.disabled=false;}});
$('#logout').addEventListener('click',async()=>{try{await api('logout');showLogin();}catch{$('#admin-message').textContent='Could not sign out. Please try again.';}});
$('#add-guest').addEventListener('click',()=>{$<HTMLDialogElement>('#create-dialog').showModal();});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog')!.close()));
$('#create-form').addEventListener('submit',async e=>{e.preventDefault();const button=$<HTMLButtonElement>('#create-form button:not([type="button"])');button.disabled=true;try{await api('create',{name:$<HTMLInputElement>('#name').value,plusOneAllowed:$<HTMLInputElement>('#create-plus-one').checked});$<HTMLFormElement>('#create-form').reset();$<HTMLDialogElement>('#create-dialog').close();await refresh();$('#admin-message').textContent='Invitation created. Copy the link or save its QR code to share.';}catch(error){$('#create-message').textContent=(error as Error).message;}finally{button.disabled=false;}});
$('#search').addEventListener('input',render);$('#filter').addEventListener('change',render);
$('#refresh').addEventListener('click',()=>refresh().catch(error=>$('#admin-message').textContent=error.message));
refresh().catch(error=>{if(!error.message.includes('Sign in'))$('#login-message').textContent=error.message;});


$('#announcement-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=$<HTMLButtonElement>('#announcement-form button');button.disabled=true;
  try{await api('announcement',{text:$<HTMLTextAreaElement>('#announcement').value});$('#announcement-message').textContent='Saved. The public board is updated.';}
  catch(error){$('#announcement-message').textContent=(error as Error).message;}
  finally{button.disabled=false;}
});
