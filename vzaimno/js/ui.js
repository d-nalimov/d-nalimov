/* Общие UI-помощники */
window.UI = (function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function plural(n, one, few, many) {
    const n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
    return many;
  }

  const years = n => n + ' ' + plural(n, 'год', 'года', 'лет');
  const km = n => n + ' км от вас';

  function time(ts) {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function ago(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'сейчас';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин';
    if (diff < 86400) return time(ts);
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'вчера';
    return days + ' ' + plural(days, 'день', 'дня', 'дней');
  }

  function toast(text) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; }, 1800);
    setTimeout(() => el.remove(), 2100);
  }

  function openSheet(title, html, onMount) {
    const sheet = $('#sheet');
    $('#sheet-title').textContent = title;
    $('#sheet-body').innerHTML = html;
    sheet.hidden = false;
    Icons.hydrate(sheet);
    if (onMount) onMount($('#sheet-body'));
  }

  function closeSheet() { $('#sheet').hidden = true; $('#sheet-body').innerHTML = ''; }

  function showMatch(profile) {
    const me = Store.state.me;
    const box = $('#match');
    const myPhoto = me.photos[0] || Avatar.url('me', 0, me.gender);
    box.innerHTML = `
      <div class="match__inner">
        <div class="match__title">Взаимная симпатия</div>
        <p class="match__text">Вы и ${esc(profile.name)} понравились друг другу</p>
        <div class="match__pair">
          <div class="avatar"><img src="${myPhoto}" alt=""></div>
          <div class="avatar"><img src="${profile.photos[0]}" alt=""></div>
        </div>
        <div class="match__btns">
          <button class="btn btn--soft btn--block" data-act="write">Написать сообщение</button>
          <button class="btn btn--ghost btn--block" data-act="continue">Продолжить поиск</button>
        </div>
      </div>`;
    box.hidden = false;
    box.onclick = e => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      box.hidden = true;
      if (act.dataset.act === 'write') App.openChat(profile.id);
    };
  }

  function confirm(title, text, okLabel, onOk) {
    openSheet(title, `
      <p class="muted" style="margin-bottom:18px">${esc(text)}</p>
      <div class="stack">
        <button class="btn btn--primary btn--block" data-ok>${esc(okLabel)}</button>
        <button class="btn btn--ghost btn--block" data-close-sheet>Отмена</button>
      </div>`, body => {
      body.querySelector('[data-ok]').onclick = () => { closeSheet(); onOk(); };
    });
  }

  return { $, $$, esc, plural, years, km, time, ago, toast, openSheet, closeSheet, showMatch, confirm };
})();
