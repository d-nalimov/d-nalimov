/* Диалоги и переписка */
window.Chats = (function () {
  const { $, esc, toast } = UI;
  let query = '';
  let replyTimer = null;

  function lastMessage(chat) {
    if (!chat || !chat.messages.length) return null;
    return chat.messages[chat.messages.length - 1];
  }

  function renderList() {
    const st = Store.state;
    const all = st.matches.map(id => ({ p: Data.byId(id), chat: st.chats[id] })).filter(x => x.p);
    const fresh = all.filter(x => !lastMessage(x.chat));
    let talks = all.filter(x => lastMessage(x.chat));
    talks.sort((a, b) => (b.chat.ts || 0) - (a.chat.ts || 0));
    if (query) {
      const q = query.toLowerCase();
      talks = talks.filter(x => x.p.name.toLowerCase().includes(q) ||
        (lastMessage(x.chat).text || '').toLowerCase().includes(q));
    }

    const view = $('#view');
    view.innerHTML = `
      ${fresh.length ? `
        <div class="storyline">
          ${fresh.map(x => `
            <button class="story" data-open="${x.p.id}">
              <span class="story__ring"><span class="avatar"><img src="${x.p.photos[0]}" alt=""></span></span>
              <span class="story__name">${esc(x.p.name)}</span>
            </button>`).join('')}
        </div>` : ''}
      ${all.length ? `
        <div class="search"><div class="search__wrap">${Icons.get('search')}
          <input class="search__input" id="chat-search" placeholder="Поиск по сообщениям" value="${esc(query)}">
        </div></div>` : ''}
      ${talks.length ? `<div class="list">${talks.map(x => item(x)).join('')}</div>` :
        (all.length ? `<div class="empty">
            <div class="empty__title">Начните первым</div>
            <p class="empty__text">У вас ${fresh.length} ${UI.plural(fresh.length, 'новая пара', 'новые пары', 'новых пар')} без переписки. Напишите — так шанс на ответ выше.</p>
          </div>` : `<div class="empty">
            <div class="empty__icon">${Icons.get('chat')}</div>
            <div class="empty__title">Сообщений пока нет</div>
            <p class="empty__text">Переписка открывается после взаимной симпатии.</p>
          </div>`)}`;
    Icons.hydrate(view);

    const search = $('#chat-search');
    if (search) search.oninput = e => {
      query = e.target.value;
      const pos = e.target.selectionStart;
      renderList();
      const el = $('#chat-search');
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    };
    view.querySelectorAll('[data-open]').forEach(b => b.onclick = () => open(b.dataset.open));
  }

  function item(x) {
    const msg = lastMessage(x.chat);
    const preview = (msg.from === 'me' ? 'Вы: ' : '') + msg.text;
    return `
      <button class="listitem" data-open="${x.p.id}">
        <span class="avatar avatar--56 ${x.p.online ? 'avatar--online' : ''}"><img src="${x.p.photos[0]}" alt=""></span>
        <span class="listitem__body">
          <span class="listitem__title">${esc(x.p.name)}${x.p.verified ?
            `<span style="width:15px;height:15px;color:var(--blue)">${Icons.get('verified')}</span>` : ''}</span>
          <span class="listitem__sub">${esc(preview)}</span>
        </span>
        <span class="listitem__meta">
          <span>${UI.ago(msg.ts)}</span>
          ${x.chat.unread ? '<span class="unreaddot"></span>' : ''}
        </span>
      </button>`;
  }

  function open(id) {
    const p = Data.byId(id);
    if (!p) return;
    Store.readChat(id);
    App.setMode('chat', id);
    App.refreshBadges();

    const view = $('#view');
    view.innerHTML = `
      <div class="chat">
        <div class="chat__log" id="chat-log"></div>
        ${!Store.state.chats[id].messages.length ? `
          <div class="icebreakers">${Data.ICEBREAKERS.map(t =>
            `<button class="chip chip--sm" data-ice="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
        <form class="composer" id="composer">
          <textarea class="composer__input" id="composer-input" rows="1" placeholder="Сообщение" maxlength="1000"></textarea>
          <button class="composer__send" type="submit" id="composer-send" disabled aria-label="Отправить" data-icon="send"></button>
        </form>
      </div>`;
    Icons.hydrate(view);
    drawLog(id);

    view.querySelectorAll('[data-ice]').forEach(b => b.onclick = () => send(id, b.dataset.ice));

    const input = $('#composer-input');
    const sendBtn = $('#composer-send');
    input.oninput = () => {
      sendBtn.disabled = !input.value.trim();
      input.style.height = 'auto';
      input.style.height = Math.min(120, input.scrollHeight) + 'px';
    };
    input.onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#composer').requestSubmit(); }
    };
    $('#composer').onsubmit = e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      input.style.height = 'auto';
      sendBtn.disabled = true;
      send(id, text);
    };
    input.focus();
  }

  function drawLog(id) {
    const log = $('#chat-log');
    if (!log) return;
    const msgs = Store.state.chats[id].messages;
    const p = Data.byId(id);
    log.innerHTML = msgs.length ? msgs.map((m, i) => {
      const seq = i > 0 && msgs[i - 1].from === m.from;
      return `<div class="msg msg--${m.from === 'me' ? 'out' : 'in'} ${seq ? 'msg--seq' : ''}">
        ${esc(m.text)}<span class="msg__time">${UI.time(m.ts)}</span></div>`;
    }).join('') : `
      <div class="empty" style="padding:24px 12px">
        <div class="avatar avatar--72" style="margin:0 auto 12px"><img src="${p.photos[0]}" alt=""></div>
        <div class="empty__title">${esc(p.name)}, ${p.age}</div>
        <p class="empty__text">Вы понравились друг другу. Напишите первое сообщение.</p>
      </div>`;
    log.scrollTop = log.scrollHeight;
  }

  function send(id, text) {
    Store.pushMessage(id, 'me', text);
    const ice = document.querySelector('.icebreakers');
    if (ice) ice.remove();
    drawLog(id);
    clearTimeout(replyTimer);
    replyTimer = setTimeout(() => reply(id), 900 + Math.random() * 900);
  }

  function reply(id) {
    const log = $('#chat-log');
    const inChat = App.mode === 'chat' && App.chatId === id;
    if (inChat && log) {
      const t = document.createElement('div');
      t.className = 'typing';
      t.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(t);
      log.scrollTop = log.scrollHeight;
    }
    setTimeout(() => {
      const text = Data.REPLIES[Math.floor(Math.random() * Data.REPLIES.length)];
      Store.pushMessage(id, 'them', text);
      if (App.mode === 'chat' && App.chatId === id) { Store.readChat(id); drawLog(id); }
      else if (App.tab === 'chats') renderList();
      App.refreshBadges();
    }, 1200 + Math.random() * 800);
  }

  function peerHeader(id) {
    const p = Data.byId(id);
    return `<button class="chatpeer" data-peer>
      <span class="avatar avatar--40"><img src="${p.photos[0]}" alt=""></span>
      <span>
        <span class="chatpeer__name">${esc(p.name)}</span>
        <span class="chatpeer__status ${p.online ? '' : 'chatpeer__status--off'}">${p.online ? 'В сети' : 'Был(а) ' + esc(p.lastSeen)}</span>
      </span>
    </button>`;
  }

  function peerMenu(id) {
    const p = Data.byId(id);
    UI.openSheet(p.name, `
      <div class="menu" style="border:0">
        <button class="menuitem" data-m="profile">${Icons.get('user')}<span class="menuitem__label">Открыть анкету</span></button>
        <button class="menuitem" data-m="mute">${Icons.get('bell')}<span class="menuitem__label">Отключить уведомления</span></button>
        <button class="menuitem" data-m="report">${Icons.get('flag')}<span class="menuitem__label">Пожаловаться</span></button>
        <button class="menuitem" data-m="delete" style="color:var(--red)">${Icons.get('trash')}<span class="menuitem__label">Удалить пару</span></button>
      </div>`, body => {
      body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
        const m = b.dataset.m;
        UI.closeSheet();
        if (m === 'profile') return Feed.openDetail(id);
        if (m === 'mute') return toast('Уведомления отключены');
        if (m === 'report') return toast('Жалоба отправлена на модерацию');
        UI.confirm('Удалить пару?', 'Переписка с ' + p.name + ' будет удалена без возможности восстановления.', 'Удалить', () => {
          const st = Store.state;
          st.matches = st.matches.filter(x => x !== id);
          delete st.chats[id];
          st.decisions[id] = 'pass';
          Store.save();
          App.setMode('main');
          App.go('chats');
          toast('Пара удалена');
        });
      });
    });
  }

  return { renderList, open, peerHeader, peerMenu };
})();
