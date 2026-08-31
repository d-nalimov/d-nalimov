/* Точка входа: экраны, вкладки, верхняя панель */
window.App = (function () {
  const { $, $$ } = UI;

  const state = { tab: 'feed', mode: 'main', chatId: null };

  function showScreen(name) {
    ['auth', 'onboarding', 'main'].forEach(s => {
      $('#screen-' + s).hidden = s !== name;
    });
    UI.closeSheet();
  }

  function enterApp() {
    Store.seedLikes();
    showScreen('main');
    state.mode = 'main';
    go('feed');
    refreshBadges();
  }

  function go(tab) {
    state.tab = tab;
    state.mode = 'main';
    state.chatId = null;
    $$('#tabbar .tab').forEach(t => t.classList.toggle('is-active', t.dataset.tab === tab));
    $('#tabbar').hidden = false;
    render();
  }

  function render() {
    renderTopbar();
    if (state.mode === 'chat') return;
    if (state.tab === 'feed') Feed.render();
    else if (state.tab === 'likes') Likes.render();
    else if (state.tab === 'chats') Chats.renderList();
    else Profile.render();
    $('#view').scrollTop = 0;
  }

  function renderTopbar() {
    const left = $('#topbar-left'), title = $('#topbar-title'), right = $('#topbar-right');

    if (state.mode === 'chat') {
      left.innerHTML = '<button class="iconbtn" data-back data-icon="back"></button>';
      title.innerHTML = Chats.peerHeader(state.chatId);
      title.style.flex = '1';
      right.innerHTML = '<button class="iconbtn" data-peer-menu data-icon="more"></button>';
      Icons.hydrate($('#topbar'));
      left.querySelector('[data-back]').onclick = () => go('chats');
      title.querySelector('[data-peer]').onclick = () => Feed.openDetail(state.chatId);
      right.querySelector('[data-peer-menu]').onclick = () => Chats.peerMenu(state.chatId);
      return;
    }

    title.style.flex = '';
    const titles = { feed: 'Взаимно', likes: 'Симпатии', chats: 'Сообщения', profile: 'Профиль' };
    left.innerHTML = '';
    right.innerHTML = '';
    title.innerHTML = state.tab === 'feed'
      ? '<img src="assets/mark.svg" alt="" class="topbar__mark"><span>Взаимно</span>'
      : `<span>${titles[state.tab]}</span>`;

    if (state.tab === 'feed') {
      right.innerHTML = '<button class="iconbtn" data-filters data-icon="filter"></button>';
      Icons.hydrate(right);
      right.querySelector('[data-filters]').onclick = Feed.openFilters;
    }
    if (state.tab === 'likes' && !Store.state.premium) {
      right.innerHTML = '<button class="iconbtn" data-crown data-icon="crown" style="color:var(--gold)"></button>';
      Icons.hydrate(right);
      right.querySelector('[data-crown]').onclick = () =>
        UI.openSheet('Взаимно+', Feed.premiumPitch('Смотрите, кому вы понравились.'), Feed.mountPremium);
    }
    if (state.tab === 'profile') {
      right.innerHTML = '<button class="iconbtn" data-settings data-icon="settings"></button>';
      Icons.hydrate(right);
      right.querySelector('[data-settings]').onclick = Feed.openFilters;
    }
  }

  function setMode(mode, id) {
    state.mode = mode;
    state.chatId = id || null;
    $('#tabbar').hidden = mode === 'chat';
    renderTopbar();
  }

  function openChat(id) {
    showScreen('main');
    state.tab = 'chats';
    $$('#tabbar .tab').forEach(t => t.classList.toggle('is-active', t.dataset.tab === 'chats'));
    Chats.open(id);
  }

  function refreshBadges() {
    const likes = Store.state.incomingLikes.length;
    const unread = Store.unreadTotal();
    const bl = $('#badge-likes'), bc = $('#badge-chats');
    bl.textContent = likes; bl.hidden = !likes;
    bc.textContent = unread; bc.hidden = !unread;
  }

  function applyTheme() {
    document.documentElement.dataset.theme = Store.state.theme || 'light';
  }

  function boot() {
    Store.load();
    applyTheme();
    Icons.hydrate(document);
    Auth.initAuth();

    $$('#tabbar .tab').forEach(t => t.onclick = () => go(t.dataset.tab));
    $('#onb-next').onclick = Onboarding.next;
    $('#onb-back').onclick = Onboarding.back;

    $('#sheet').addEventListener('click', e => {
      if (e.target.closest('[data-close-sheet]')) UI.closeSheet();
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (!$('#sheet').hidden) UI.closeSheet();
      else if (!$('#match').hidden) $('#match').hidden = true;
      else if (state.mode === 'chat') go('chats');
    });

    const st = Store.state;
    if (st.auth.loggedIn && st.me.name) enterApp();
    else if (st.auth.loggedIn) Onboarding.start();
    else showScreen('auth');
  }

  document.addEventListener('DOMContentLoaded', boot);

  return {
    get tab() { return state.tab; },
    get mode() { return state.mode; },
    get chatId() { return state.chatId; },
    showScreen, enterApp, go, render, setMode, openChat, refreshBadges, applyTheme
  };
})();
