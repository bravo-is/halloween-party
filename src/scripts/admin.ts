import QRCode from 'qrcode';
type Guest = {token:string;name:string;status:'yes'|'no'|'pending';note:string;updatedAt:string|null};
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
  guests = (await api('list')).guests;
  $('#login').hidden=true;$('#dashboard').hidden=false;$('#logout').hidden=false;
  $('#total-count').textContent=String(guests.length);
  for(const status of ['yes','no','pending']) $(`#${status}-count`).textContent=String(guests.filter(g=>g.status===status).length);
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
    const meta=document.createElement('div');meta.className='guest-meta';const badge=document.createElement('span');badge.className='badge';badge.textContent=({yes:'Coming ↗',no:'Can’t make it',pending:'Awaiting a sign'})[guest.status];meta.append(badge);
    if(guest.updatedAt){const time=document.createElement('span');time.textContent=`Updated ${new Date(guest.updatedAt).toLocaleDateString()}`;meta.append(time);}
    info.append(name,meta);if(guest.note){const note=document.createElement('p');note.className='guest-note';note.textContent=guest.note;info.append(note);}
    const actions=document.createElement('div');actions.className='guest-actions';
    const copy=document.createElement('button');copy.className='button';copy.textContent='Copy link ↗';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(inviteUrl(guest.token));copy.textContent='Copied ✓';setTimeout(()=>copy.textContent='Copy link ↗',2000);}catch{$('#admin-message').textContent='Clipboard unavailable. Open the QR view to copy the invitation URL.';}});
    const qr=document.createElement('button');qr.className='button';qr.textContent='QR code ⊞';qr.addEventListener('click',async()=>{try{const url=inviteUrl(guest.token);const image=await QRCode.toDataURL(url,{width:720,margin:3,color:{dark:'#0c0d0f',light:'#ffffff'},errorCorrectionLevel:'M'});$<HTMLImageElement>('#qr-image').src=image;$<HTMLAnchorElement>('#qr-download').href=image;$<HTMLAnchorElement>('#qr-url').href=url;$('#qr-url').textContent=url;$('#qr-title').textContent=`For ${guest.name}`;$<HTMLDialogElement>('#qr-dialog').showModal();}catch{$('#admin-message').textContent='Could not create QR code. Please try again.';}});
    actions.append(copy,qr);row.append(info,actions);list.append(row);
  });
}
$('#login').addEventListener('submit',async e=>{e.preventDefault();const button=$<HTMLButtonElement>('#login button');button.disabled=true;try{await api('login',{password:$<HTMLInputElement>('#password').value});$<HTMLInputElement>('#password').value='';await refresh();}catch(error){$('#login-message').textContent=(error as Error).message;}finally{button.disabled=false;}});
$('#logout').addEventListener('click',async()=>{try{await api('logout');showLogin();}catch{$('#admin-message').textContent='Could not sign out. Please try again.';}});
$('#add-guest').addEventListener('click',()=>{$<HTMLDialogElement>('#create-dialog').showModal();});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog')!.close()));
$('#create-form').addEventListener('submit',async e=>{e.preventDefault();const button=$<HTMLButtonElement>('#create-form button:not([type="button"])');button.disabled=true;try{await api('create',{name:$<HTMLInputElement>('#name').value});$<HTMLFormElement>('#create-form').reset();$<HTMLDialogElement>('#create-dialog').close();await refresh();$('#admin-message').textContent='Invitation created. Copy the link or save its QR code to share.';}catch(error){$('#create-message').textContent=(error as Error).message;}finally{button.disabled=false;}});
$('#search').addEventListener('input',render);$('#filter').addEventListener('change',render);
$('#refresh').addEventListener('click',()=>refresh().catch(error=>$('#admin-message').textContent=error.message));
refresh().catch(error=>{if(!error.message.includes('Sign in'))$('#login-message').textContent=error.message;});

