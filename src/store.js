// Progress persistence on the device (localStorage), with export/import for backups.
const KEY = 'french-daily.v1';

export function emptyProgress() {
  return { version: 1, cards: {}, days: {}, seenVerbs: [], settings: {}, created: Date.now() };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    return { ...emptyProgress(), ...JSON.parse(raw) };
  } catch {
    return emptyProgress();
  }
}

export function save(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function exportJson(progress) {
  return JSON.stringify({ app: 'french-daily', exported: new Date().toISOString(), progress }, null, 0);
}

export function importJson(text) {
  const data = JSON.parse(text);
  const p = data.progress ?? data;
  if (!p || typeof p.cards !== 'object') throw new Error('Not a French Daily backup');
  return { ...emptyProgress(), ...p };
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {}
}
