// State-Machine für den Frage-Flow
import { setProgress, scrollToTop } from './render.js';

const STORAGE_KEY = 'innerformel_session';

let fragen = [];
let currentIndex = 0;
let profil = 'standard';

// ── Initialisierung ──────────────────────────────────────────────────────────

export async function initDialogue() {
  const params = new URLSearchParams(window.location.search);
  profil = params.get('profil') === 'mehrere-standbeine' ? 'mehrere-standbeine' : 'standard';

  const katalog = await loadFragenKatalog();
  fragen = katalog[profil] || katalog['standard'];

  const saved = getSavedSession();
  currentIndex = saved.currentIndex || 0;

  renderQuestion();
}

async function loadFragenKatalog() {
  const res = await fetch('/data/frage-katalog.json');
  return res.json();
}

// ── Session-Speicherung ──────────────────────────────────────────────────────

function getSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { antworten: {}, currentIndex: 0 };
  } catch {
    return { antworten: {}, currentIndex: 0 };
  }
}

function saveAnswer(frageId, antwort) {
  const session = getSavedSession();
  session.antworten[frageId] = antwort;
  session.currentIndex = currentIndex;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getAllAnswers() {
  const session = getSavedSession();
  return fragen.map(f => ({
    id: f.id,
    frage: f.frage,
    antwort: session.antworten[f.id] || ''
  }));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Rendering ────────────────────────────────────────────────────────────────

function renderQuestion() {
  const frage = fragen[currentIndex];
  const session = getSavedSession();
  const savedAnswer = session.antworten[frage.id] || '';
  const total = fragen.length;
  const progress = ((currentIndex) / total) * 100;

  setProgress(progress);

  document.getElementById('question-counter').textContent =
    `Frage ${currentIndex + 1} von ${total}`;

  document.getElementById('question-text').textContent = frage.frage;

  const textarea = document.getElementById('answer-input');
  textarea.value = savedAnswer;
  textarea.focus();

  updateCharHint(savedAnswer.length, frage.min_zeichen);
  updateNavButtons();
  scrollToTop();
}

function updateCharHint(len, min) {
  const hint = document.getElementById('char-hint');
  if (!hint) return;
  if (len < min) {
    hint.textContent = `Mindestens ${min - len} Zeichen mehr — damit Bernhard wirklich etwas erkennen kann.`;
    hint.className = 'char-hint warn';
  } else {
    hint.textContent = '';
    hint.className = 'char-hint';
  }
}

function updateNavButtons() {
  const backBtn = document.getElementById('btn-back');
  const nextBtn = document.getElementById('btn-next');
  const isLast = currentIndex === fragen.length - 1;

  if (backBtn) backBtn.style.display = currentIndex === 0 ? 'none' : '';
  if (nextBtn) nextBtn.textContent = isLast ? 'Diagnose erstellen →' : 'Weiter →';
}

// ── Navigation ───────────────────────────────────────────────────────────────

export function goNext() {
  const frage = fragen[currentIndex];
  const textarea = document.getElementById('answer-input');
  const antwort = textarea.value.trim();

  if (antwort.length < frage.min_zeichen) {
    updateCharHint(antwort.length, frage.min_zeichen);
    textarea.focus();
    textarea.style.borderColor = 'var(--color-error)';
    setTimeout(() => { textarea.style.borderColor = ''; }, 2000);
    return false;
  }

  saveAnswer(frage.id, antwort);

  if (currentIndex < fragen.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    // Letzte Frage → zur Ergebnis-Seite
    const session = getSavedSession();
    session.currentIndex = currentIndex;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    const params = new URLSearchParams(window.location.search);
    window.location.href = 'ergebnis.html' + (params.toString() ? '?' + params.toString() : '');
  }

  return true;
}

export function goBack() {
  if (currentIndex > 0) {
    // Aktuelle Antwort zwischenspeichern ohne Validierung
    const frage = fragen[currentIndex];
    const textarea = document.getElementById('answer-input');
    if (textarea.value.trim().length > 0) {
      saveAnswer(frage.id, textarea.value.trim());
    }
    currentIndex--;
    renderQuestion();
  }
}

// ── Textarea-Live-Hint ───────────────────────────────────────────────────────

export function onAnswerInput() {
  const frage = fragen[currentIndex];
  const textarea = document.getElementById('answer-input');
  updateCharHint(textarea.value.length, frage.min_zeichen);
}
