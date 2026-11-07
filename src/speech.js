// French text-to-speech using the device's built-in voices.
let voice = null;

function chooseVoice() {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  const fr = voices.filter((v) => /^fr(-|_)FR/i.test(v.lang) || v.lang === 'fr');
  const preferred = ['Amélie', 'Thomas', 'Audrey', 'Aurélie', 'Marie', 'Google français'];
  voice =
    fr.find((v) => /enhanced|premium/i.test(v.name)) ||
    preferred.map((n) => fr.find((v) => v.name.includes(n))).find(Boolean) ||
    fr[0] ||
    voices.find((v) => v.lang.startsWith('fr')) ||
    null;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  chooseVoice();
  window.speechSynthesis.onvoiceschanged = chooseVoice;
}

export const canSpeak = () => typeof window !== 'undefined' && !!window.speechSynthesis;

export function speak(text, { rate = 0.92 } = {}) {
  if (!canSpeak() || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/___/g, ''));
  u.lang = 'fr-FR';
  if (voice) u.voice = voice;
  u.rate = rate;
  window.speechSynthesis.speak(u);
}
