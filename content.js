// Springbored content script.
// Runs in every frame, but bails out immediately unless the frame belongs to
// an Infosys Springboard page (the player may live in a cross-origin iframe).
(() => {
  'use strict';

  const SITE = /onwingspan\.com|springboard/i;

  function isSpringboard() {
    if (SITE.test(location.hostname)) return true;
    const ancestors = location.ancestorOrigins;
    if (ancestors) {
      for (let i = 0; i < ancestors.length; i++) {
        if (SITE.test(ancestors[i])) return true;
      }
    }
    return false;
  }

  if (!isSpringboard()) return;

  const IS_TOP = window === window.top;
  const MSG = '__springbored';
  const FAST_RATE = 16; // Chrome's maximum playbackRate
  const DEFAULTS = { enabled: false, mode: 'skip', leadSeconds: 5, autoNext: true };

  let settings = { ...DEFAULTS };
  const videoState = new WeakMap();
  let navigating = false;

  chrome.storage.sync.get(DEFAULTS, (stored) => {
    settings = { ...DEFAULTS, ...stored };
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const key in changes) settings[key] = changes[key].newValue;
    if (!settings.enabled || settings.mode !== 'fast') resetPlaybackRates();
  });

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function waitFor(condition, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (condition()) return true;
      await sleep(250);
    }
    return false;
  }

  // ---------- status pill (top frame only) ----------

  let pill;
  let pillTimer;

  function status(message) {
    console.debug('[Springbored]', message);
    if (IS_TOP) showPill(message);
    else window.top.postMessage({ [MSG]: 'status', message }, '*');
  }

  function showPill(message) {
    if (!pill) {
      pill = document.createElement('div');
      Object.assign(pill.style, {
        position: 'fixed',
        left: '16px',
        bottom: '16px',
        zIndex: '2147483647',
        padding: '8px 12px',
        borderRadius: '999px',
        background: 'rgba(0, 124, 195, 0.94)',
        borderLeft: '4px solid #f15922',
        color: '#fff',
        font: '13px/1.2 system-ui, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        transition: 'opacity 0.3s',
      });
      document.documentElement.appendChild(pill);
    }
    pill.textContent = '⏭ ' + message;
    pill.style.opacity = '1';
    clearTimeout(pillTimer);
    pillTimer = setTimeout(() => { pill.style.opacity = '0'; }, 4000);
  }

  // ---------- video handling (every frame) ----------

  function findVideos(root = document, out = []) {
    root.querySelectorAll('video').forEach((v) => out.push(v));
    return out;
  }

  function findVideosDeep() {
    const videos = findVideos();
    if (videos.length) return videos;
    // Fall back to open shadow roots only when the light DOM has no <video>.
    const walk = (root) => {
      root.querySelectorAll('*').forEach((el) => {
        if (el.shadowRoot) {
          findVideos(el.shadowRoot, videos);
          walk(el.shadowRoot);
        }
      });
    };
    walk(document);
    return videos;
  }

  function play(video) {
    if (!video.paused || video.ended) return;
    video.play().catch(() => {
      // Autoplay policy: muted playback is always allowed.
      video.muted = true;
      video.play().catch(() => {});
    });
  }

  function resetPlaybackRates() {
    for (const video of findVideosDeep()) {
      if (video.playbackRate === FAST_RATE) video.playbackRate = 1;
    }
  }

  function handleVideo(video) {
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;

    const key = (video.currentSrc || video.src) + '|' + Math.round(duration);
    let st = videoState.get(video);
    if (!st || st.key !== key) {
      st = { key, seeks: 0, lastSeek: 0, finished: false };
      videoState.set(video, st);
      status(`New video detected (${Math.round(duration)}s)`);
      play(video);
    }

    if (video.ended || video.currentTime >= duration - 0.3) {
      onFinished(st);
      return;
    }

    const lead = Math.max(1, Number(settings.leadSeconds) || DEFAULTS.leadSeconds);
    const target = duration - lead;

    if (settings.mode === 'fast') {
      const rate = video.currentTime < target ? FAST_RATE : 1;
      if (video.playbackRate !== rate) video.playbackRate = rate;
      play(video);
      return;
    }

    // Skip mode. Re-seek a few times in case the player restores a saved position.
    const now = Date.now();
    if (target > 1 && video.currentTime < target - 1 && st.seeks < 5 && now - st.lastSeek > 2000) {
      video.currentTime = target;
      st.seeks++;
      st.lastSeek = now;
      status(`Jumped to the last ${lead}s`);
    }
    if (st.seeks > 0) play(video);
  }

  function onFinished(st) {
    if (st.finished) return;
    st.finished = true;
    if (!settings.autoNext) {
      status('Video finished');
      return;
    }
    status('Video finished — moving to next…');
    // Give the platform a moment to record completion before navigating.
    setTimeout(() => {
      if (!settings.enabled || !settings.autoNext) return;
      if (IS_TOP) goNext();
      else window.top.postMessage({ [MSG]: 'next' }, '*');
    }, 2500);
  }

  setInterval(() => {
    if (!settings.enabled) return;
    for (const video of findVideosDeep()) handleVideo(video);
  }, 1000);

  // ---------- navigation (top frame only) ----------

  if (!IS_TOP) return;

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object' || !(MSG in data)) return;
    if (data[MSG] === 'status' && typeof data.message === 'string') showPill(data.message);
    if (data[MSG] === 'next' && settings.enabled && settings.autoNext) goNext();
  });

  const CLICKABLE = 'button, a, [role="button"], [tabindex]';
  const NEXT_ICONS = new Set([
    'navigate_next', 'chevron_right', 'arrow_forward_ios', 'arrow_forward',
    'keyboard_arrow_right', 'skip_next',
  ]);
  // Expanders in the "Contents" tree also use right chevrons; never click those.
  const TREE_ITEM = 'mat-tree, mat-tree-node, [role="tree"], [role="treeitem"], mat-expansion-panel-header, [aria-expanded]';

  function mediaRect() {
    const video = findVideosDeep()[0];
    if (video) return video.getBoundingClientRect();
    // Player is in an iframe: use the largest visible iframe as the player area.
    let best = null;
    let bestArea = 0;
    for (const frame of document.querySelectorAll('iframe')) {
      const r = frame.getBoundingClientRect();
      if (r.width * r.height > bestArea) {
        best = r;
        bestArea = r.width * r.height;
      }
    }
    return best;
  }

  function isDisabled(el) {
    return el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('disabled');
  }

  function findNextButton() {
    const area = mediaRect();
    const scored = new Map();
    const add = (el, score) => {
      if (!el || isDisabled(el)) return;
      scored.set(el, Math.max(scored.get(el) || 0, score));
    };

    for (const el of document.querySelectorAll(CLICKABLE)) {
      const label = ['aria-label', 'title', 'mattooltip', 'ng-reflect-message']
        .map((attr) => el.getAttribute(attr))
        .filter(Boolean)
        .join(' ');
      const text = el.textContent.trim();
      const haystack = (label + ' ' + (text.length <= 20 ? text : '')).toLowerCase();
      if (/\bprev/.test(haystack)) continue;
      if (/\b(play next|up next|next)\b/.test(haystack)) add(el, 10);
    }

    for (const icon of document.querySelectorAll('mat-icon, .mat-icon, .material-icons, .material-icons-outlined, i')) {
      const text = icon.textContent.trim().toLowerCase();
      const cls = String(icon.className || '');
      if (!NEXT_ICONS.has(text) && !/(chevron|arrow|angle)[-_]right|\bnext\b/.test(cls)) continue;
      if (icon.closest(TREE_ITEM)) continue;
      add(icon.closest(CLICKABLE) || icon, 5);
    }

    let best = null;
    let bestScore = -Infinity;
    for (const [el, base] of scored) {
      const r = el.getBoundingClientRect();
      let score = base;
      if (r.width > 0 && r.height > 0) score += 3;
      if (area && r.width > 0) {
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const onPlayer = cx >= area.left - 10 && cx <= area.right + 10 && cy >= area.top - 10 && cy <= area.bottom + 10;
        if (onPlayer) score += 20;
        else if (base < 10) continue; // bare arrow icons only count when on the player
        score += cx / 10000; // tie-break: prefer the right-most
      }
      if (score > bestScore) {
        best = el;
        bestScore = score;
      }
    }
    return best;
  }

  function revealControls() {
    // Players often hide the prev/next arrows until the mouse moves over them.
    const target = findVideosDeep()[0] || document.querySelector('iframe');
    if (!target) return;
    const r = target.getBoundingClientRect();
    const init = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    for (const type of ['mouseover', 'mouseenter', 'mousemove']) {
      target.dispatchEvent(new MouseEvent(type, init));
      target.parentElement?.dispatchEvent(new MouseEvent(type, init));
    }
  }

  async function goNext() {
    if (navigating) return;
    navigating = true;
    try {
      const startUrl = location.href;
      for (let attempt = 0; attempt < 3 && location.href === startUrl; attempt++) {
        revealControls();
        await sleep(400);
        const button = findNextButton();
        if (!button) {
          status('Could not find the Next button — click it manually');
          return;
        }
        button.click();
        status('Moving to the next item…');
        await waitFor(() => location.href !== startUrl, 6000);
      }
    } finally {
      navigating = false;
    }
  }
})();
