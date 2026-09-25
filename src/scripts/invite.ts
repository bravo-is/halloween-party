fetch('/.netlify/functions/api?view=board').then(async response => {
  if (!response.ok) throw new Error();
  const data = await response.json();
  document.querySelector('#public-count')!.textContent = String(data.invitedCount);
  document.querySelector('#announcement-text')!.textContent = data.announcement.text || 'More details as the night draws near. Check back for updates from your hosts.';
  if(data.announcement.text && data.announcement.updatedAt) document.querySelector('#announcement-date')!.textContent = `Updated ${new Date(data.announcement.updatedAt).toLocaleDateString()}`;
}).catch(() => { document.querySelector('#announcement-text')!.textContent = 'Party updates and invited count are unavailable. Please reload to try again.'; });
const token = new URLSearchParams(location.search).get('invite');
const form = document.querySelector<HTMLFormElement>('#rsvp-form')!;
const message = document.querySelector<HTMLElement>('#rsvp-message')!;
if (token) {
  document.querySelector('#invite-message')!.textContent = 'Finding your name among the spirits…';
  fetch(`/.netlify/functions/api?invite=${encodeURIComponent(token)}`).then(async response => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Your invitation could not be loaded.');
    document.querySelector('#guest-name')!.textContent = data.name;
    document.querySelector('#venue')!.textContent = [data.party.location, data.party.address].filter(Boolean).join('. ');
    document.querySelector<HTMLElement>('#plus-one-choice')!.hidden = !data.plusOneAllowed;
    document.querySelector<HTMLInputElement>('#plus-one')!.checked = !!data.plusOne;
    if(data.plusOneAllowed) document.querySelector('#admission-label')!.textContent = 'ADMIT YOU + ONE BEAUTIFUL SOUL';
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
    const response = await fetch('/.netlify/functions/api', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'rsvp', token, status: new FormData(form).get('status'), note: form.note.value, plusOne: new FormData(form).get('status') === 'yes' && document.querySelector<HTMLInputElement>('#plus-one')!.checked}) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    message.textContent = data.status === 'yes' ? 'You’re on the list. See you in heaven. ✧' : 'Saved. You’ll be missed on the other side.';
  } catch { message.textContent = 'Could not save your RSVP. Please try again.'; }
  finally { button.disabled = false; }
});

form.addEventListener('change', () => { const declined = form.querySelector<HTMLInputElement>('input[value="no"]')!.checked; const extra = document.querySelector<HTMLInputElement>('#plus-one')!; extra.disabled = declined; if(declined) extra.checked = false; });
