/* Набор иконок (inline SVG) */
window.Icons = (function () {
  const s = (p, extra) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" ${extra || ''}>${p}</svg>`;

  const set = {
    cards: s('<rect x="2.5" y="5" width="8" height="14" rx="2" transform="rotate(-6 6.5 12)"/><rect x="13.5" y="5" width="8" height="14" rx="2" transform="rotate(6 17.5 12)"/>'),
    heart: s('<path d="M12 20.5C6 16.6 3.5 13.7 3.5 10.4 3.5 7.6 5.7 5.5 8.4 5.5c1.6 0 3 .8 3.6 2 .6-1.2 2-2 3.6-2 2.7 0 4.9 2.1 4.9 4.9 0 3.3-2.5 6.2-8.5 10.1Z"/>'),
    heartFill: s('<path d="M12 20.5C6 16.6 3.5 13.7 3.5 10.4 3.5 7.6 5.7 5.5 8.4 5.5c1.6 0 3 .8 3.6 2 .6-1.2 2-2 3.6-2 2.7 0 4.9 2.1 4.9 4.9 0 3.3-2.5 6.2-8.5 10.1Z" fill="currentColor"/>'),
    chat: s('<path d="M20.5 11.8c0 4-3.8 7.2-8.5 7.2-1 0-2-.1-2.9-.4L4 20.5l1.3-3.6C4.1 15.5 3.5 13.7 3.5 11.8c0-4 3.8-7.3 8.5-7.3s8.5 3.3 8.5 7.3Z"/>'),
    user: s('<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.6-3.6 3.6-5.6 7.2-5.6s6.6 2 7.2 5.6"/>'),
    close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
    back: s('<path d="M15 5l-7 7 7 7"/>'),
    forward: s('<path d="M9 5l7 7-7 7"/>'),
    star: s('<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8L12 3.6Z"/>'),
    rewind: s('<path d="M4 9h11a5 5 0 1 1 0 10H8"/><path d="M7.5 5.5L4 9l3.5 3.5"/>'),
    bolt: s('<path d="M13 3L5.5 13.5H11L10.5 21 18.5 10H13L13 3Z"/>'),
    more: s('<circle cx="5.5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor"/>'),
    settings: s('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1Z"/>'),
    filter: s('<path d="M4 6h16M7 12h10M10 18h4"/>'),
    pin: s('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>'),
    search: s('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-3.6-3.6"/>'),
    send: s('<path d="M4.5 12l15-7-4.5 15-3.5-6-7-2Z"/>'),
    check: s('<path d="M5 12.5l4.5 4.5L19 7"/>'),
    verified: s('<path d="M12 3l2.2 1.7 2.8-.2.6 2.7 2.3 1.6-1.3 2.5 1.3 2.5-2.3 1.6-.6 2.7-2.8-.2L12 21l-2.2-1.7-2.8.2-.6-2.7L4.1 15l1.3-2.5L4.1 10l2.3-1.6.6-2.7 2.8.2L12 3Z" fill="currentColor" stroke="none"/><path d="M8.6 12.2l2.3 2.3 4.5-4.7" stroke="#fff" stroke-width="2"/>'),
    lock: s('<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7"/>'),
    plus: s('<path d="M12 5v14M5 12h14"/>'),
    camera: s('<path d="M4 8.5h3l1.5-2.2h7L17 8.5h3a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5V10A1.5 1.5 0 0 1 4 8.5Z"/><circle cx="12" cy="13.5" r="3.2"/>'),
    edit: s('<path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5Z"/>'),
    shield: s('<path d="M12 3l7.5 3v5.5c0 4.5-3.1 8.2-7.5 9.5-4.4-1.3-7.5-5-7.5-9.5V6L12 3Z"/>'),
    bell: s('<path d="M18 15.5V10a6 6 0 1 0-12 0v5.5L4.5 18h15L18 15.5Z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>'),
    moon: s('<path d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2Z"/>'),
    logout: s('<path d="M14 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2.5"/><path d="M10.5 12H21m0 0l-3-3m3 3l-3 3"/>'),
    crown: s('<path d="M4 17l-1.5-9 5 3.5L12 5l4.5 6.5 5-3.5L20 17H4Z"/><path d="M4 20h16"/>'),
    eye: s('<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>'),
    flag: s('<path d="M6 21V4m0 0h11l-2 3.5L17 11H6"/>'),
    info: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8.2v.2"/>'),
    ruler: s('<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7.5 8v3M12 8v4M16.5 8v3"/>'),
    glass: s('<path d="M8 3h8l-.7 5.2A3.4 3.4 0 0 1 12 11a3.4 3.4 0 0 1-3.3-2.8L8 3Z"/><path d="M12 11v9M8.5 20h7"/>'),
    work: s('<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5"/>'),
    trash: s('<path d="M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l1 12.5A1.5 1.5 0 0 0 9 21h6a1.5 1.5 0 0 0 1.5-1.5L17.5 7"/>')
  };

  function hydrate(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(el => {
      const name = el.getAttribute('data-icon');
      if (set[name] && !el.querySelector('svg')) el.innerHTML = set[name];
    });
  }
  return { set, hydrate, get: n => set[n] || '' };
})();
