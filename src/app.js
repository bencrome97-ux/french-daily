import { indexContent, buildCards, verbCards, mastery, verbMastery } from './engine/cards.js';
import { makeExercise, levelFor } from './engine/exercises.js';
import { planSession, recordAnswer, markVerbKnown, streak, dueTomorrow, DEFAULT_SETTINGS } from './engine/session.js';
import { dayNumber } from './engine/fsrs.js';
import { check } from './engine/answer.js';
import { PERSON_LABELS, auxForms, agree } from './engine/french.js';
import * as store from './store.js';
import { speak, canSpeak } from './speech.js';

/* ---------------- State ---------------- */
const app = document.getElementById('app');
let content = null;
let meta = {};
let progress = store.load();
let view = 'home';
let session = null;
let wordsCat = null;
let wordsQuery = '';

const today = () => dayNumber(new Date());
const settings = () => ({ ...DEFAULT_SETTINGS, ...progress.settings });
const persist = () => store.save(progress);

/* ---------------- Helpers ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (sel, root = document) => root.querySelector(sel);

const I = {
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  verbs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
  words: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14z"/><path d="M8 7h8M8 11h6"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  bigcheck: '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  flame: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2c1 3.5-1.5 5-1.5 7.5 0 1.4 1 2.5 2.3 2.5 1.6 0 2.4-1.4 2.2-3.2C17.6 10.6 19 13 19 15.5 19 19.1 15.9 22 12 22s-7-2.9-7-6.5C5 10.3 10.5 7.6 12 2z"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  house: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/></svg>',
};

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function applyTheme() {
  const t = settings().theme || 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

const FR_DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const FR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function frDate(d = new Date()) {
  return `${FR_DAYS[d.getDay()]} ${d.getDate()} ${FR_MONTHS[d.getMonth()]}`;
}
function greeting() {
  const h = new Date().getHours();
  return h >= 18 || h < 4 ? 'Bonsoir' : 'Bonjour';
}

function tabs(active) {
  const t = (id, label, icon) => `<button class="tab ${active === id ? 'on' : ''}" data-go="${id}">${icon}<span>${label}</span></button>`;
  return `<nav class="tabs">${t('home', 'Today', I.today)}${t('verbs', 'Verbs', I.verbs)}${t('words', 'Words', I.words)}</nav>`;
}

function segsHtml(segs, fill = null, good = false) {
  return segs
    .map((s) => {
      if (s.t === 'text') return esc(s.v);
      if (s.t === 'hl') return `<span class="hl">${esc(s.v)}</span>`;
      if (fill !== null) return `<span class="blank filled ${good ? 'good' : ''}">${esc(fill)}</span>`;
      return '<span class="blank"></span>';
    })
    .join('');
}

/* ---------------- Home ---------------- */
function renderHome() {
  view = 'home';
  const t = today();
  const day = progress.days[t];
  const st = streak(progress, t);
  const s = settings();
  const plan = planSession(content, progress, t, { rng: () => 0.5 });
  const cards = plan.filter((q) => q.kind === 'card').map((q) => q.card);
  const st0 = (c) => progress.cards[c.id];
  const verbRev = cards.filter((c) => c.kind !== 'w' && st0(c)?.reps).length;
  const verbNew = cards.filter((c) => c.kind !== 'w' && !st0(c)?.reps).length;
  const wordRev = cards.filter((c) => c.kind === 'w' && st0(c)?.reps).length;
  const wordNew = cards.filter((c) => c.kind === 'w' && !st0(c)?.reps).length;
  const minutes = Math.max(2, Math.round(cards.length * 0.42));
  const done = day?.done;

  const name = (s.name ?? 'Ben').trim();
  let hero;
  if (done) {
    const tomorrow = dueTomorrow(content, progress, t);
    hero = `
      <div class="card hero done">
        <div class="row"><div class="check-badge">${I.check}</div><div><div class="eyebrow" style="color:var(--good)">Fait pour aujourd’hui</div><h2 style="margin:2px 0 0">Today’s session is done</h2></div></div>
        <p class="meta" style="margin:14px 0 18px">${day.reviews} cards · ${Math.round((day.correct / Math.max(1, day.reviews)) * 100)}% right first time · about ${tomorrow} due tomorrow.</p>
        <button class="btn ghost" data-act="start-extra">Practise a little more</button>
      </div>`;
  } else if (!cards.length) {
    hero = `
      <div class="card hero">
        <div class="eyebrow accent">All caught up</div>
        <h2>Nothing due right now</h2>
        <p class="meta">Every word and verb is resting until its next review. Add new notes in Notion and they’ll appear tomorrow.</p>
        <button class="btn ghost" data-act="start-extra">Practise anyway</button>
      </div>`;
  } else {
    const mix = [
      verbRev && `<span><b>${verbRev}</b> verb reviews</span>`,
      verbNew && `<span><b>${verbNew}</b> new verb forms</span>`,
      wordRev && `<span><b>${wordRev}</b> word reviews</span>`,
      wordNew && `<span><b>${wordNew}</b> new words</span>`,
    ].filter(Boolean).join('');
    hero = `
      <div class="card hero">
        <div class="eyebrow accent">Today’s session</div>
        <h2>${cards.length} cards · about ${minutes} min</h2>
        <p class="meta">${day?.reviews ? 'Pick up where you left off.' : 'Verbs first, words woven in.'}</p>
        <div class="mix">${mix}</div>
        <button class="btn primary" data-act="start">${day?.reviews ? 'Continue' : 'Commencer'}</button>
      </div>`;
  }

  // Week strip
  const now = new Date();
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const n = t - i;
    const on = progress.days[n]?.done;
    week.push(`<div class="d">${FR_DAYS[d.getDay()].slice(0, 1).toUpperCase()}<div class="dot ${on ? 'on' : ''} ${i === 0 ? 'today' : ''}">${on ? I.check.replace('width="24" height="24"', 'width="14" height="14"') : ''}</div></div>`);
  }

  // Mastery summary
  const vm = content.verbs.map((v) => verbMastery(v, progress).bucket);
  const count = (arr, b) => arr.filter((x) => x === b).length;
  const wm = content.vocab.map((w) => mastery(progress.cards['w:' + w.id]));
  const bar = (arr) => {
    const n = arr.length || 1;
    return `<div class="meter"><i class="m-solid" style="width:${(count(arr, 'solid') / n) * 100}%"></i><i class="m-familiar" style="width:${(count(arr, 'familiar') / n) * 100}%"></i><i class="m-learning" style="width:${(count(arr, 'learning') / n) * 100}%"></i></div>`;
  };

  // Trickiest verbs
  const tricky = content.verbs
    .map((v) => {
      const lapses = verbCards(v).reduce((a, c) => a + (progress.cards[c.id]?.lapses ?? 0), 0);
      return { v, lapses };
    })
    .filter((x) => x.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses)
    .slice(0, 3);
  const trickyHtml = tricky.length
    ? `<div class="section-title"><h3>Keep an eye on</h3></div>
       <div class="card tricky">${tricky
         .map(({ v }) => `<button class="tricky-row" data-verb="${v.id}"><div style="flex:1"><div class="inf">${esc(v.inf)}</div><div class="forms">${esc(v.forms.join(' · '))}</div></div><span class="chev">${I.chev}</span></button>`)
         .join('')}</div>`
    : '';

  app.innerHTML = `
    <main class="screen with-tabs">
      <div class="home-head">
        <span class="pill flame ${st ? '' : 'off'}">${I.flame} ${st} day${st === 1 ? '' : 's'}</span>
        <button class="icon-btn" data-go="settings" aria-label="Settings">${I.gear}</button>
      </div>
      <div class="eyebrow">${esc(frDate())}</div>
      <h1 class="greeting">${greeting()}${name ? `, <em>${esc(name)}</em>` : ''}.</h1>
      ${hero}
      <div class="card week" style="margin-top:14px">${week.join('')}</div>
      <div class="section-title"><h3>Your French</h3></div>
      <div class="stats">
        <button class="card stat" data-go="verbs" style="text-align:left"><div class="num">${count(vm, 'solid') + count(vm, 'familiar')}<span class="faint" style="font-size:16px"> / ${content.verbs.length}</span></div><div class="lbl">verbs getting solid</div>${bar(vm)}</button>
        <button class="card stat" data-go="words" style="text-align:left"><div class="num">${count(wm, 'solid') + count(wm, 'familiar')}<span class="faint" style="font-size:16px"> / ${content.vocab.length}</span></div><div class="lbl">words getting solid</div>${bar(wm)}</button>
      </div>
      <div class="legend"><span><i class="m-solid"></i>Solid</span><span><i class="m-familiar"></i>Familiar</span><span><i class="m-learning"></i>Learning</span></div>
      ${trickyHtml}
    </main>
    ${tabs('home')}`;
}

/* ---------------- Session ---------------- */
function startSession(extra = false) {
  const plan = planSession(content, progress, today(), { extra });
  if (!plan.length) {
    toast('Nothing to practise right now');
    return;
  }
  session = {
    queue: plan,
    idx: 0,
    total: plan.filter((q) => q.kind === 'card').length,
    graded: new Set(),
    results: [],
    missed: [],
    extra,
  };
  nextItem();
}

function nextItem() {
  if (!session) return renderHome();
  if (session.idx >= session.queue.length) return finishSession();
  const item = session.queue[session.idx];
  if (item.kind === 'intro') {
    if ((progress.seenVerbs ?? []).includes(item.verbId)) {
      session.idx++;
      return nextItem();
    }
    return renderIntro(item.verbId);
  }
  const card = item.card;
  const state = progress.cards[card.id];
  const seen = new Set(progress.seenVerbs ?? []);
  const opts = { seen };
  if (item.retry) opts.level = Math.min(1, levelFor(state));
  session.ex = makeExercise(card, state, content, opts);
  session.ex.isNew = !state?.reps && !item.retry;
  session.ex.card = card;
  session.answered = false;
  renderExercise();
}

function sessionTop() {
  const pct = (session.graded.size / Math.max(1, session.total)) * 100;
  return `<div class="s-top">
      <button class="icon-btn" data-act="quit" aria-label="Close">${I.close}</button>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <span class="s-count">${Math.min(session.graded.size + 1, session.total)} / ${session.total}</span>
    </div>`;
}

function renderIntro(verbId) {
  const v = content.verbById.get(verbId);
  app.innerHTML = `
    <main class="screen">
      ${sessionTop()}
      <div class="stage">
        <div class="tagline"><span class="new-badge">New verb</span></div>
        <h1 class="intro-inf" lang="fr">${esc(v.inf)}</h1>
        <div class="intro-en">${esc(v.en)}</div>
        ${verbChips(v)}
        ${conjTable(v, false)}
        ${v.note ? `<div class="note">${esc(v.note)}</div>` : ''}
        <div class="answers">
          <button class="btn primary" data-act="intro-learn">Let’s learn it</button>
          <button class="btn quiet" data-act="intro-know">I already know this one</button>
        </div>
      </div>
    </main>`;
  session.introVerb = verbId;
}

function verbChips(v) {
  const groupLabel = { er: 'Regular -er', ir: 'Regular -ir', irregular: 'Irregular', 'er-spelling': '-er, spelling change' }[v.group] || v.group;
  const pcLine = !v.pp ? '' : v.reflexive ? `il s’est ${v.pp}` : v.aux === 'etre' ? `il est ${v.pp}` : `j’ai ${v.pp}`;
  return `<div class="chips">
      ${groupLabel ? `<span class="chip">${esc(groupLabel)}</span>` : ''}
      ${v.pp ? `<span class="chip ${v.aux === 'etre' ? 'etre' : ''}">${v.aux === 'etre' ? 'être' : 'avoir'} · ${esc(pcLine)}</span>` : ''}
    </div>`;
}

function conjTable(v, withMastery) {
  const persons = v.persons ?? [0, 1, 2, 3, 4, 5];
  const refl = ['me', 'te', 'se', 'nous', 'vous', 'se'];
  const subj = ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];
  const rows = persons
    .map((p) => {
      const f = v.forms[p];
      const vowel = /^[aeiouyhéèêâîô]/i.test(f);
      let pre = '';
      if (v.reflexive) pre = p === 0 || p === 1 || p === 2 || p === 5 ? (vowel ? refl[p].slice(0, 1) + '’' : refl[p] + ' ') : refl[p] + ' ';
      const subjText = p === 0 && vowel && !v.reflexive ? 'j’' : subj[p];
      const spoken = `${p === 0 && vowel && !v.reflexive ? 'j’' : ['je', 'tu', 'il', 'nous', 'vous', 'ils'][p] + ' '}${pre}${f}`;
      const m = withMastery ? mastery(progress.cards[`v:${v.id}:${p}`]) : null;
      return `<button class="conj-row" data-say="${esc(spoken)}"><span class="p">${esc(subjText)}</span><span class="f" lang="fr">${esc(pre)}<b>${esc(f)}</b></span>${withMastery ? `<span class="mdot ${m}"></span>` : `<span class="faint">${I.speaker}</span>`}</button>`;
    })
    .join('');
  return `<div class="card conj">${rows}</div>`;
}

function renderExercise() {
  const ex = session.ex;
  let prompt = '';
  if (ex.segs) {
    prompt = `<p class="sentence" lang="fr">${segsHtml(ex.segs)}</p>${ex.en ? `<div class="translation">${esc(ex.en)}</div>` : ''}`;
  } else if (ex.big) {
    prompt = `<p class="big ${ex.bigLang === 'en' ? 'en' : ''}" ${ex.bigLang === 'fr' ? 'lang="fr"' : ''}>${esc(ex.big)}</p>`;
  } else if (ex.prompt) {
    prompt = `<p class="big en" style="font-size:24px">${esc(ex.prompt)}</p>`;
  }
  const canHear = canSpeak() && (ex.type === 'recognise' || ex.type === 'w-fr-en');
  const hint = ex.hint ? `<div class="hint">${esc(ex.hint)}</div>` : '';

  let answers = '';
  if (ex.mode === 'choice') {
    const long = ex.options.some((o) => o.label.length > 14);
    answers = `<div class="options ${long ? 'list' : ''} ${ex.wide ? 'wide' : ''}">${ex.options
      .map((o, i) => `<button class="opt" data-opt="${i}" lang="${ex.type === 'w-fr-en' ? 'en' : 'fr'}">${esc(o.label)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</button>`)
      .join('')}</div>`;
  } else if (ex.mode === 'tiles') {
    session.built = [];
    prompt += `<div class="build-area" id="build"></div>`;
    answers = `<div class="tiles" id="tiles">${ex.tiles.map((t, i) => `<button class="tile" data-tile="${i}" lang="fr">${esc(t)}</button>`).join('')}</div>
      <button class="btn primary" data-act="check-tiles" style="margin-top:22px" disabled>Check</button>`;
  } else {
    answers = `<div class="type-wrap">
        <input class="type-input" id="typed" lang="fr" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Type in French…" />
        <div class="accents">${['é', 'è', 'ê', 'à', 'â', 'ç', 'ù', 'î', 'ô', 'û', 'ë', 'œ', '’'].map((a) => `<button data-accent="${a}">${a}</button>`).join('')}</div>
        <button class="btn primary" data-act="check-typed">Check</button>
      </div>`;
  }

  app.innerHTML = `
    <main class="screen">
      ${sessionTop()}
      <div class="stage">
        <div class="tagline">${ex.isNew ? '<span class="new-badge">New</span>' : ''}<span class="eyebrow accent">${esc(ex.tag)}</span><span class="spacer"></span>${canHear ? `<button class="speak-btn" data-act="speak">${I.speaker} Listen</button>` : ''}</div>
        ${prompt}
        ${hint}
        <div class="answers ${ex.mode === 'type' ? 'top' : ''}" id="answers">${answers}</div>
      </div>
    </main>
    <div class="sheet" id="sheet"></div>`;
  if (ex.mode === 'type') setTimeout(() => $('#typed')?.focus(), 250);
}

function grade(result, chosenLabel = null) {
  const ex = session.ex;
  const card = ex.card;
  if (session.answered) return;
  session.answered = true;
  const first = !session.graded.has(card.id);
  if (first) {
    session.graded.add(card.id);
    recordAnswer(progress, card, result, today());
    persist();
    session.results.push(result);
  }
  if (result === 'wrong') {
    // Ask again a few cards later.
    const at = Math.min(session.queue.length, session.idx + 4);
    session.queue.splice(at, 0, { kind: 'card', card, retry: true });
    if (first) session.missed.push({ reveal: ex.reveal, en: ex.revealEn ? ex.revealEn : ex.en, explain: ex.explain });
  }
  // Fill the blank in the sentence.
  const sentence = $('.sentence');
  if (sentence && ex.segs && ex.mode !== 'tiles') {
    const right = ex.options?.find((o) => o.correct)?.label ?? ex.accepted?.[0];
    sentence.innerHTML = segsHtml(ex.segs, right, result !== 'wrong');
  }
  showSheet(result, chosenLabel);
  if (settings().autoplay && ex.speak) speak(ex.speak);
}

const PRAISE = ['Très bien', 'Parfait', 'Exactement', 'Bien joué', 'C’est ça'];
function showSheet(result, chosenLabel) {
  const ex = session.ex;
  const sheet = $('#sheet');
  const good = result !== 'wrong';
  const chosen = chosenLabel && ex.options?.find((o) => o.label === chosenLabel && !o.correct);
  let explain = ex.explain || '';
  if (chosen?.why) explain = `<b>Your pick:</b> ${esc(chosen.why)}.<br>${esc(explain)}`;
  else explain = esc(explain);
  if (result === 'accent') explain = `Watch the accents: <b>${esc(ex.accepted[0])}</b>. ` + explain;
  const verdict = good ? (result === 'accent' ? 'Nearly perfect' : PRAISE[Math.floor(Math.random() * PRAISE.length)]) : 'Pas tout à fait';
  const fullFr = ex.reveal;
  const fullEn = ex.revealEn || ex.en || '';
  const example = ex.example ? `<div class="full-en" style="margin-top:8px" lang="fr"><i>${esc(ex.example.fr)}</i>${ex.example.en ? ` · ${esc(ex.example.en)}` : ''}</div>` : '';
  const house = ex.house && !good ? `<div class="explain house">${I.house}<span><b>House of Être:</b> aller, venir, arriver, partir, entrer, sortir, monter, descendre, rester, tomber, naître, mourir, retourner, rentrer, devenir, revenir, plus every reflexive verb.</span></div>` : '';
  sheet.className = `sheet ${good ? 'good' : 'bad'}`;
  sheet.innerHTML = `
    <div class="sheet-row"><div class="verdict">${good ? I.check : ''}${esc(verdict)}</div>${canSpeak() && ex.speak ? `<button class="speak-btn" data-act="speak">${I.speaker} Listen</button>` : ''}</div>
    <div class="full" lang="fr">${esc(fullFr)}</div>
    ${fullEn ? `<div class="full-en">${esc(fullEn)}</div>` : ''}
    ${example}
    ${explain ? `<div class="explain">${explain}</div>` : ''}
    ${house}
    <button class="btn ${good ? 'primary' : 'accent'}" data-act="continue">Continue</button>`;
  $('#answers')?.classList.add('answered');
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('open')));
}

function onOption(i) {
  const ex = session.ex;
  if (session.answered) return;
  const o = ex.options[i];
  const buttons = [...document.querySelectorAll('.opt')];
  buttons.forEach((b, j) => {
    const oj = ex.options[j];
    if (oj.correct) b.classList.add('right');
    else if (j === i) b.classList.add('wrong');
    else b.classList.add('dim');
  });
  grade(o.correct ? 'exact' : 'wrong', o.label);
}

function onTile(i) {
  if (session.answered) return;
  const ex = session.ex;
  session.built.push(i);
  $(`[data-tile="${i}"]`).classList.add('used');
  renderBuilt();
  $('[data-act="check-tiles"]').disabled = session.built.length === 0;
  void ex;
}
function renderBuilt() {
  const ex = session.ex;
  $('#build').innerHTML = session.built.map((ti, k) => `<button class="tile" data-built="${k}" lang="fr">${esc(ex.tiles[ti])}</button>`).join('');
}
function onBuilt(k) {
  if (session.answered) return;
  const ti = session.built[k];
  session.built.splice(k, 1);
  $(`[data-tile="${ti}"]`).classList.remove('used');
  renderBuilt();
  $('[data-act="check-tiles"]').disabled = session.built.length === 0;
}
function checkTiles() {
  const ex = session.ex;
  const got = session.built.map((i) => ex.tiles[i].toLowerCase());
  const want = ex.answerTiles.map((t) => t.toLowerCase());
  const ok = got.length === want.length && got.every((g, i) => g === want[i]);
  $('#build').style.borderColor = ok ? 'var(--good)' : 'var(--accent)';
  $('[data-act="check-tiles"]').disabled = true;
  grade(ok ? 'exact' : 'wrong');
}

function checkTyped() {
  const ex = session.ex;
  const input = $('#typed');
  const res = check(input.value, ex.accepted, { ignoreArticle: ex.ignoreArticle });
  input.classList.add(res === 'wrong' ? 'bad' : 'good');
  input.blur();
  if (res === 'wrong' && input.value.trim()) ex.explain = `You wrote “${input.value.trim()}”. ${ex.explain || ''}`;
  else if (ex.ignoreArticle && res !== 'wrong' && ex.wordId) {
    const w = content.wordById.get(ex.wordId);
    const typedArticle = /^(le|la|les|l['’]|un|une)\b/i.test(input.value.trim());
    if (!typedArticle && (w.g === 'm' || w.g === 'f')) ex.explain = `Remember the article: ${w.fr} (${w.g === 'f' ? 'feminine' : 'masculine'}).`;
  }
  $('[data-act="check-typed"]').disabled = true;
  grade(res);
}

function finishSession() {
  const t = today();
  const day = (progress.days[t] ??= { reviews: 0, correct: 0, newV: 0, newW: 0, done: false });
  day.done = true;
  persist();
  const n = session.results.length;
  const right = session.results.filter((r) => r !== 'wrong').length;
  const st = streak(progress, t);
  const missed = session.missed;
  app.innerHTML = `
    <main class="screen">
      <div class="done-hero">
        <div class="big-check">${I.bigcheck}</div>
        <div class="eyebrow accent">${esc(frDate())}</div>
        <h1>C’est fait.</h1>
        <p class="muted" style="margin-top:8px">${right === n ? 'Every card right first time. Superbe.' : 'Each mistake just told the app what to bring back sooner.'}</p>
      </div>
      <div class="done-grid">
        <div class="card stat"><div class="num">${n}</div><div class="lbl">cards</div></div>
        <div class="card stat"><div class="num">${n ? Math.round((right / n) * 100) : 0}%</div><div class="lbl">first try</div></div>
        <div class="card stat"><div class="num" style="color:var(--accent)">${st}</div><div class="lbl">day streak</div></div>
      </div>
      ${missed.length ? `<div class="section-title"><h3>Coming back soon</h3></div><div class="card watch">${missed.slice(0, 6).map((m) => `<div class="watch-row"><span class="fr" lang="fr">${esc(m.reveal)}</span></div>`).join('')}</div>` : ''}
      <div style="margin-top:auto;padding-top:28px">
        <button class="btn primary" data-go="home">Done</button>
      </div>
    </main>`;
  session = null;
}

/* ---------------- Verbs ---------------- */
const TIERS = [
  ['foundation', 'Foundation'],
  ['core', 'Core'],
  ['house', 'House of Être'],
  ['everyday', 'Everyday'],
  ['reflexive', 'Reflexive'],
];
function renderVerbs() {
  view = 'verbs';
  const all = content.verbs.map((v) => ({ v, m: verbMastery(v, progress) }));
  const n = (b) => all.filter((x) => x.m.bucket === b).length;
  const groups = TIERS.map(([id, label]) => {
    const list = all.filter((x) => (x.v.tier || 'everyday') === id);
    if (!list.length) return '';
    return `<div class="group-h">${label} · ${list.length}</div><div class="verb-grid">${list
      .map(({ v, m }) => `<button class="vchip ${m.bucket}" data-verb="${v.id}"><span class="ring"></span><span class="inf" lang="fr">${esc(v.inf)}</span><span class="en">${esc(v.en.replace(/^to /, ''))}</span></button>`)
      .join('')}</div>`;
  }).join('');
  app.innerHTML = `
    <main class="screen with-tabs">
      <div class="eyebrow">${content.verbs.length} verbs from your notes</div>
      <h1 class="page-title">Verbs</h1>
      <div class="legend" style="margin-top:2px"><span><i class="m-solid"></i>${n('solid')} solid</span><span><i class="m-familiar"></i>${n('familiar')} familiar</span><span><i class="m-learning"></i>${n('learning')} learning</span><span><i style="background:var(--track)"></i>${n('new')} not started</span></div>
      ${groups}
    </main>
    ${tabs('verbs')}`;
}

function openVerb(id) {
  const v = content.verbById.get(id);
  const pcEx = v.pp ? pcExample(v) : '';
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="panel">
      <div class="grab"></div>
      <div class="row"><div class="spacer"></div><button class="icon-btn" data-act="close-ov" aria-label="Close">${I.close}</button></div>
      <h1 class="intro-inf" style="margin-top:0" lang="fr">${esc(v.inf)}</h1>
      <div class="intro-en">${esc(v.en)}</div>
      ${verbChips(v)}
      ${conjTable(v, true)}
      ${pcEx ? `<div class="note" lang="fr"><span class="eyebrow">Past · passé composé</span><br><span class="serif" style="font-size:18px">${esc(pcEx)}</span></div>` : ''}
      ${v.note ? `<div class="note">${esc(v.note)}</div>` : ''}
      <p class="faint" style="font-size:12.5px;margin-top:14px">Tap a row to hear it. Dots show how well each form is sticking.</p>
    </div>`;
  ov.addEventListener('click', (e) => {
    if (e.target === ov || e.target.closest('[data-act="close-ov"]')) ov.remove();
  });
  document.body.appendChild(ov);
}

function pcExample(v) {
  if (v.aux === 'etre') {
    const r = v.reflexive;
    return `je ${r ? 'me ' : ''}suis ${v.pp}(e) · elle ${r ? 's’' : ''}est ${agree(v.pp, 'etre', 'elle')} · ils ${r ? 'se ' : ''}sont ${agree(v.pp, 'etre', 'ils')}`;
  }
  const forms = auxForms('avoir');
  return `j’${forms[0]} ${v.pp} · tu ${forms[1]} ${v.pp} · nous ${forms[3]} ${v.pp}`;
}

/* ---------------- Words ---------------- */
function renderWords() {
  view = 'words';
  const cats = [];
  for (const w of content.vocab) if (!cats.includes(w.cat)) cats.push(w.cat);
  let body;
  if (wordsQuery || wordsCat) {
    const q = wordsQuery.toLowerCase();
    const list = content.vocab.filter((w) => (wordsCat ? w.cat === wordsCat : true) && (!q || w.fr.toLowerCase().includes(q) || w.en.toLowerCase().includes(q)));
    body = list.length
      ? `<div class="card">${list
          .map((w) => `<div class="word-row" data-say="${esc(w.fr)}"><span class="mdot ${mastery(progress.cards['w:' + w.id])}"></span><span class="fr" lang="fr">${esc(w.fr)}</span><span class="en">${esc(w.en)}</span></div>`)
          .join('')}</div>`
      : `<div class="empty">No words match “${esc(wordsQuery)}”.</div>`;
  } else {
    body = `<div class="card">${cats
      .map((c) => {
        const ws = content.vocab.filter((w) => w.cat === c);
        const solid = ws.filter((w) => ['solid', 'familiar'].includes(mastery(progress.cards['w:' + w.id]))).length;
        const started = ws.filter((w) => mastery(progress.cards['w:' + w.id]) !== 'new').length;
        return `<button class="cat-row" data-cat="${esc(c)}"><div style="flex:1"><div class="name">${esc(c)}</div><div class="sub">${ws.length} words · ${started} started</div></div><div class="meter"><i class="m-solid" style="width:${(solid / ws.length) * 100}%"></i><i class="m-learning" style="width:${((started - solid) / ws.length) * 100}%"></i></div><span class="chev">${I.chev}</span></button>`;
      })
      .join('')}</div>`;
  }
  app.innerHTML = `
    <main class="screen with-tabs">
      ${wordsCat ? `<button class="icon-btn" data-act="cat-back" aria-label="Back" style="margin-left:-10px">${I.back}</button>` : `<div class="eyebrow">${content.vocab.length} words & phrases</div>`}
      <h1 class="page-title">${esc(wordsCat || 'Words')}</h1>
      <input class="search" id="wsearch" type="search" placeholder="Search French or English" value="${esc(wordsQuery)}" autocomplete="off" autocorrect="off" autocapitalize="off" />
      ${body}
    </main>
    ${tabs('words')}`;
}

/* ---------------- Settings ---------------- */
function renderSettings() {
  view = 'settings';
  const s = settings();
  const stepper = (key, min, max) => `<div class="stepper"><button data-step="${key}" data-d="-1" data-min="${min}" data-max="${max}">−</button><span>${s[key]}</span><button data-step="${key}" data-d="1" data-min="${min}" data-max="${max}">+</button></div>`;
  const theme = s.theme || 'auto';
  const updated = meta.updated ? new Date(meta.updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'unknown';
  app.innerHTML = `
    <main class="screen">
      <div class="row"><button class="icon-btn" data-go="home" aria-label="Back" style="margin-left:-10px">${I.back}</button></div>
      <h1 class="page-title">Settings</h1>
      <div class="set-group card">
        <div class="set-row"><div><div class="t">Your name</div><div class="d">Used in the greeting</div></div><input class="text-input" id="name" value="${esc(s.name ?? 'Ben')}" /></div>
        <div class="set-row"><div><div class="t">New verb forms a day</div><div class="d">Each verb has 7 cards (6 people + past)</div></div>${stepper('newVerbCards', 0, 30)}</div>
        <div class="set-row"><div><div class="t">New words a day</div></div>${stepper('newWords', 0, 30)}</div>
        <div class="set-row"><div><div class="t">Max reviews per session</div><div class="d">Extra reviews roll over to tomorrow</div></div>${stepper('maxReviews', 8, 60)}</div>
      </div>
      <div class="set-group card">
        <div class="set-row"><div><div class="t">Read answers aloud</div><div class="d">Off is best on the train without headphones</div></div><button class="switch ${s.autoplay ? 'on' : ''}" data-toggle="autoplay" aria-label="Read answers aloud"></button></div>
        <div class="set-row"><div class="t">Appearance</div><div class="seg">${['auto', 'light', 'dark'].map((t) => `<button data-theme-set="${t}" class="${theme === t ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
      </div>
      <div class="set-group card">
        <button class="set-row" data-act="export" style="width:100%"><div class="t">Back up progress</div><span class="chev">${I.chev}</span></button>
        <label class="set-row" style="cursor:pointer"><div class="t">Restore from backup</div><input type="file" id="import" accept="application/json,.json" hidden /><span class="chev">${I.chev}</span></label>
        <button class="set-row" data-act="reset" style="width:100%"><div class="t" style="color:var(--accent)">Reset all progress</div></button>
      </div>
      <p class="faint" style="font-size:13px;text-align:center;margin-top:22px">${content.verbs.length} verbs · ${content.vocab.length} words · synced from Notion ${esc(updated)}</p>
    </main>`;
}

/* ---------------- Router & events ---------------- */
function go(where) {
  window.speechSynthesis?.cancel?.();
  if (where === 'home') renderHome();
  else if (where === 'verbs') renderVerbs();
  else if (where === 'words') { wordsCat = null; wordsQuery = ''; renderWords(); }
  else if (where === 'settings') renderSettings();
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-go],[data-act],[data-opt],[data-tile],[data-built],[data-accent],[data-verb],[data-cat],[data-say],[data-step],[data-toggle],[data-theme-set]');
  if (!el) return;
  if (el.dataset.go) return go(el.dataset.go);
  if (el.dataset.opt !== undefined) return onOption(+el.dataset.opt);
  if (el.dataset.tile !== undefined) return onTile(+el.dataset.tile);
  if (el.dataset.built !== undefined) return onBuilt(+el.dataset.built);
  if (el.dataset.accent) {
    const inp = $('#typed');
    if (!inp) return;
    const pos = inp.selectionStart ?? inp.value.length;
    inp.value = inp.value.slice(0, pos) + el.dataset.accent + inp.value.slice(inp.selectionEnd ?? pos);
    inp.focus();
    inp.setSelectionRange(pos + 1, pos + 1);
    return;
  }
  if (el.dataset.verb) return openVerb(el.dataset.verb);
  if (el.dataset.cat) { wordsCat = el.dataset.cat; renderWords(); window.scrollTo(0, 0); return; }
  if (el.dataset.say) return speak(el.dataset.say);
  if (el.dataset.step) {
    const k = el.dataset.step;
    const v = Math.min(+el.dataset.max, Math.max(+el.dataset.min, settings()[k] + +el.dataset.d));
    progress.settings[k] = v;
    persist();
    el.parentElement.querySelector('span').textContent = v;
    return;
  }
  if (el.dataset.toggle) {
    const k = el.dataset.toggle;
    progress.settings[k] = !settings()[k];
    persist();
    el.classList.toggle('on', progress.settings[k]);
    return;
  }
  if (el.dataset.themeSet) {
    progress.settings.theme = el.dataset.themeSet;
    persist();
    applyTheme();
    renderSettings();
    return;
  }
  switch (el.dataset.act) {
    case 'start': return startSession(false);
    case 'start-extra': return startSession(true);
    case 'quit': session = null; return renderHome();
    case 'speak': return speak(session?.ex?.speak);
    case 'continue':
      session.idx++;
      return nextItem();
    case 'check-tiles': return checkTiles();
    case 'check-typed': return checkTyped();
    case 'intro-learn':
      progress.seenVerbs ??= [];
      if (!progress.seenVerbs.includes(session.introVerb)) progress.seenVerbs.push(session.introVerb);
      persist();
      session.idx++;
      return nextItem();
    case 'intro-know': {
      const vid = session.introVerb;
      const cards = verbCards(content.verbById.get(vid));
      markVerbKnown(progress, cards, today());
      persist();
      // Drop this verb's new cards from today's queue.
      const before = session.queue.length;
      session.queue = session.queue.filter((q, i) => i <= session.idx || !(q.kind === 'card' && q.card.verbId === vid));
      session.total -= before - session.queue.length;
      toast(`Nice. ${content.verbById.get(vid).inf} will come back in a few days to check.`);
      session.idx++;
      return nextItem();
    }
    case 'cat-back': wordsCat = null; wordsQuery = ''; renderWords(); return;
    case 'export': {
      const blob = new Blob([store.exportJson(progress)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `french-daily-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      return;
    }
    case 'reset':
      if (confirm('Reset all progress? This can’t be undone.')) {
        progress = store.emptyProgress();
        persist();
        toast('Progress reset');
        renderSettings();
      }
      return;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'typed' && !session?.answered) {
    e.preventDefault();
    checkTyped();
  } else if (e.key === 'Enter' && session?.answered && view !== 'settings') {
    const c = $('[data-act="continue"]');
    if (c) c.click();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'wsearch') {
    wordsQuery = e.target.value;
    const pos = e.target.selectionStart;
    renderWords();
    const inp = $('#wsearch');
    inp.focus();
    inp.setSelectionRange(pos, pos);
  } else if (e.target.id === 'name') {
    progress.settings.name = e.target.value;
    persist();
  }
});

document.addEventListener('change', async (e) => {
  if (e.target.id === 'import' && e.target.files?.[0]) {
    try {
      progress = store.importJson(await e.target.files[0].text());
      persist();
      toast('Progress restored');
      renderSettings();
    } catch (err) {
      toast('That file isn’t a valid backup');
    }
  }
});

/* ---------------- Boot ---------------- */
async function loadJson(path) {
  const r = await fetch(path, { cache: 'no-cache' });
  if (!r.ok) throw new Error(path);
  return r.json();
}

async function boot() {
  applyTheme();
  try {
    const [verbs, vocab, m] = await Promise.all([loadJson('content/verbs.json'), loadJson('content/vocab.json'), loadJson('content/meta.json').catch(() => ({}))]);
    content = indexContent({ verbs, vocab });
    meta = m;
  } catch (err) {
    app.innerHTML = `<main class="screen"><div class="empty" style="margin-top:30vh">Couldn’t load your notes. Check your connection and try again.</div></main>`;
    return;
  }
  store.requestPersistence();
  renderHome();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// Refresh the home screen when returning to the app on a new day.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && view === 'home' && !session && content) renderHome();
});

boot();
