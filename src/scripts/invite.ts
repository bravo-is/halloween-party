const token = new URLSearchParams(location.search).get('invite');
const form = document.querySelector<HTMLFormElement>('#rsvp-form')!;
const message = document.querySelector<HTMLElement>('#rsvp-message')!;
if (token) {
  document.querySelector('#invite-message')!.textContent = 'Finding your name among the spirits…';
  fetch(`/.netlify/functions/api?invite=${encodeURIComponent(token)}`).then(async response => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Your invitation could not be loaded.');
    document.querySelector('#guest-name')!.textContent = data.name;
    document.querySelector('#venue')!.textContent = `${data.party.location}. ${data.party.address}`;
    form.note.value = data.note || '';
    if (data.status !== 'pending') form.querySelector<HTMLInputElement>(`input[value="${data.status}"]`)!.checked = true;
    document.querySelector<HTMLElement>('#invite-loading')!.hidden = true;
    form.hidden = false;
  }).catch(error => { document.querySelector('#invite-message')!.textContent = error.message; });
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector<HTMLButtonElement>('button')!;
  button.disabled = true; message.textContent = 'Sealing your RSVP…';
  try {
    const response = await fetch('/.netlify/functions/api', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'rsvp', token, status: new FormData(form).get('status'), note: form.note.value}) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    message.textContent = data.status === 'yes' ? 'You’re on the list. See you in heaven. ✧' : 'Saved. You’ll be missed on the other side.';
  } catch { message.textContent = 'Could not save your RSVP. Please try again.'; }
  finally { button.disabled = false; }
});
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelector('.hero')?.addEventListener('pointermove', (event) => {
    const e = event as PointerEvent;
    const scene = document.querySelector<HTMLElement>('.orb-scene')!;
    scene.style.setProperty('--mx', `${(e.clientX / innerWidth - .5) * 18}px`);
    scene.style.setProperty('--my', `${(e.clientY / innerHeight - .5) * 18}px`);
  });
}
