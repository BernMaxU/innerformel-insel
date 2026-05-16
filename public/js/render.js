// DOM-Helpers

export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

export function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
}

export function setHTML(selector, html) {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = html;
}

export function show(selector) {
  const el = document.querySelector(selector);
  if (el) el.style.display = '';
}

export function hide(selector) {
  const el = document.querySelector(selector);
  if (el) el.style.display = 'none';
}

export function setProgress(percent) {
  const fill = document.querySelector('.progress-bar-fill');
  if (fill) fill.style.width = Math.min(100, Math.max(0, percent)) + '%';
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
