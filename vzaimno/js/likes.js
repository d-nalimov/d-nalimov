/* Симпатии: кто вас лайкнул и взаимные пары */
window.Likes = (function () {
  const { $, esc, toast } = UI;
  let mode = 'incoming';

  function gcard(p, opts) {
    const blur = opts && opts.blur;
    return `
      <button class="gcard ${blur ? 'gcard--blur' : ''}" data-id="${p.id}">
        <img src="${p.photos[0]}" alt="">
        <div class="gcard__shade"></div>
        ${p.online ? '<span class="gcard__badge">Онлайн</span>' : ''}
        ${blur ? `<span class="gcard__lock">${Icons.get('lock')}</span>` : `
          <div class="gcard__info">
            <div class="gcard__name">${esc(p.name)}, ${p.age}</div>
            <div class="gcard__sub">${esc(p.city)}</div>
          </div>`}
      </button>`;
  }

  function render() {
    const st = Store.state;
    const incoming = st.incomingLikes.map(Data.byId).filter(Boolean);
    const matches = st.matches.map(Data.byId).filter(Boolean);
    const blur = !st.premium;
    const view = $('#view');

    const body = mode === 'incoming'
      ? (incoming.length
        ? `${blur ? `
            <div class="promo">
              <div class="promo__title">${incoming.length} ${UI.plural(incoming.length, 'человек', 'человека', 'человек')} оценили вашу анкету</div>
              <p class="promo__text">Подключите «Взаимно+», чтобы увидеть, кому вы понравились, и ответить взаимностью.</p>
              <button class="btn btn--soft btn--sm" data-premium>Показать анкеты</button>
            </div>` : ''}
          <div class="grid">${incoming.map(p => gcard(p, { blur })).join('')}</div>`
        : emptyBlock('heart', 'Пока никого', 'Оценивайте анкеты в поиске — те, кому вы понравитесь, появятся здесь.'))
      : (matches.length
        ? `<div class="grid">${matches.map(p => gcard(p, {})).join('')}</div>`
        : emptyBlock('cards', 'Нет взаимных симпатий', 'Ставьте лайки в поиске. Когда симпатия окажется взаимной, пара появится здесь.'));

    view.innerHTML = `
      <div class="section" style="padding-bottom:0">
        <div class="segment">
          <button class="segment__item ${mode === 'incoming' ? 'is-active' : ''}" data-mode="incoming">Вы понравились</button>
          <button class="segment__item ${mode === 'matches' ? 'is-active' : ''}" data-mode="matches">Взаимные</button>
        </div>
      </div>
      ${body}`;
    Icons.hydrate(view);

    view.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; render(); });

    const pr = view.querySelector('[data-premium]');
    if (pr) pr.onclick = () => UI.openSheet('Взаимно+', Feed.premiumPitch('Смотрите, кому вы понравились, и отвечайте сразу.'), Feed.mountPremium);

    view.querySelectorAll('.gcard').forEach(c => c.onclick = () => {
      const p = Data.byId(c.dataset.id);
      if (mode === 'incoming') {
        if (!Store.state.premium) {
          return UI.openSheet('Взаимно+', Feed.premiumPitch('Откройте анкеты тех, кто вас лайкнул.'), Feed.mountPremium);
        }
        return respond(p);
      }
      App.openChat(p.id);
    });
  }

  function respond(p) {
    UI.openSheet(p.name + ', ' + p.age, `
      <div class="detail__photo" style="border-radius:20px;overflow:hidden"><img src="${p.photos[0]}" alt=""></div>
      <p style="margin:14px 0;font-size:14.5px">${esc(p.bio)}</p>
      <div class="chips" style="margin-bottom:18px">${p.interests.map(t => `<span class="chip chip--sm">${esc(t)}</span>`).join('')}</div>
      <div class="stack">
        <button class="btn btn--primary btn--block" data-r="like">Ответить взаимностью</button>
        <button class="btn btn--ghost btn--block" data-r="pass">Пропустить</button>
      </div>`, body => {
      body.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
        UI.closeSheet();
        const st = Store.state;
        st.incomingLikes = st.incomingLikes.filter(x => x !== p.id);
        if (b.dataset.r === 'like') { st.decisions[p.id] = 'like'; Store.addMatch(p.id); UI.showMatch(p); }
        else { st.decisions[p.id] = 'pass'; toast('Анкета скрыта'); }
        Store.save(); render(); App.refreshBadges();
      });
    });
  }

  function emptyBlock(icon, title, text) {
    return `<div class="empty">
      <div class="empty__icon">${Icons.get(icon)}</div>
      <div class="empty__title">${esc(title)}</div>
      <p class="empty__text">${esc(text)}</p>
    </div>`;
  }

  return { render };
})();
