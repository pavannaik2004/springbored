const DEFAULTS = { enabled: false, mode: 'skip', leadSeconds: 5, autoNext: true };
const MIN_LEAD = 1;
const MAX_LEAD = 60;

const $ = (id) => document.getElementById(id);
const els = {
  toggle: $('toggle'),
  toggleText: $('toggleText'),
  statusText: $('statusText'),
  timeline: $('timeline'),
  caption: $('caption'),
  tailLabel: $('tailLabel'),
  note: $('note'),
  less: $('less'),
  more: $('more'),
  lead: $('lead'),
  autoNext: $('autoNext'),
  modes: document.querySelectorAll('input[name="mode"]'),
};

let settings = { ...DEFAULTS };
let noteTimer;

function defaultNote() {
  return settings.enabled
    ? 'Stopping takes effect right away.'
    : 'Reloads this page and skips every video.';
}

function note(message) {
  clearTimeout(noteTimer);
  els.note.textContent = message || defaultNote();
  if (message) noteTimer = setTimeout(() => { els.note.textContent = defaultNote(); }, 2500);
}

function render() {
  const { enabled, mode, leadSeconds, autoNext } = settings;
  document.body.classList.toggle('running', enabled);
  els.toggleText.textContent = enabled ? 'Stop skipping' : 'Start skipping';
  els.statusText.textContent = enabled ? 'Running' : 'Off';
  els.timeline.dataset.mode = mode;
  els.caption.textContent = mode === 'fast'
    ? `Plays at 16x until the last ${leadSeconds}s, then at normal speed.`
    : `Jumps to the last ${leadSeconds}s of each video and lets it finish.`;
  els.lead.textContent = `${leadSeconds}s`;
  els.tailLabel.textContent = `last ${leadSeconds}s`;
  els.less.disabled = leadSeconds <= MIN_LEAD;
  els.more.disabled = leadSeconds >= MAX_LEAD;
  els.autoNext.checked = autoNext;
  els.modes.forEach((input) => { input.checked = input.value === mode; });
}

function save(patch, message) {
  Object.assign(settings, patch);
  chrome.storage.sync.set(patch);
  render();
  note(message);
}

chrome.storage.sync.get(DEFAULTS, (stored) => {
  settings = { ...DEFAULTS, ...stored };
  render();
  note();
});

els.toggle.addEventListener('click', () => {
  if (settings.enabled) {
    save({ enabled: false }, 'Stopped.');
    return;
  }
  save({ enabled: true }, 'Reloading the page…');
  // Reload the current tab so Springbored picks up the video from a clean start.
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) chrome.tabs.reload(tab.id);
  });
});

els.modes.forEach((input) => {
  input.addEventListener('change', () => save({ mode: input.value }, 'Saved.'));
});

function stepLead(delta) {
  const leadSeconds = Math.min(MAX_LEAD, Math.max(MIN_LEAD, settings.leadSeconds + delta));
  if (leadSeconds !== settings.leadSeconds) save({ leadSeconds }, 'Saved.');
}

els.less.addEventListener('click', () => stepLead(-1));
els.more.addEventListener('click', () => stepLead(1));
els.autoNext.addEventListener('change', () => save({ autoNext: els.autoNext.checked }, 'Saved.'));
