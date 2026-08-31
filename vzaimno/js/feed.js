/* Лента анкет со свайпами */
window.Feed = (function () {
  const { $, $$, esc, years, km, toast } = UI;
  const photoIndex = {};
  let busy = false;

  function card(p, depth) {
    const idx = photoIndex[p.id] || 0;
    const cls = depth === 1 ? ' swipe--behind' : depth >= 2 ? ' swipe--behind swipe--behind2' : '';
    return `
      <article class="swipe${cls}" data-id="${p.id}" style="z-index:${10 - depth}">
        <img class="swipe__photo" src="${p.photos[idx]}" alt="Фото ${esc(p.name)}">
        <div class="swipe__shade"></div>
        <div class="swipe__bars">${p.photos.map((_, i) =>
          `<span class="swipe__bar ${i === idx ? 'is-active' : ''}"></span>`).join('')}</div>
        <button class="swipe__nav swipe__nav--prev" data-photo="prev" aria-label="Предыдущее фото"></button>
        <button class="swipe__nav swipe__nav--next" data-photo="next" aria-label="Следующее фото"></button>
        ${p.online ? '<span class="swipe__online"><i></i>Онлайн</span>' : ''}
        <span class="stamp stamp--like">Нравится</span>
        <span class="stamp stamp--nope">Нет</span>
        <span class="stamp stamp--super">Супер</span>
        <button class="swipe__more" data-detail aria-label="Подробнее" data-icon="info"></button>
        <div class="swipe__info">
          <h2 class="swipe__name">${esc(p.name)} <span class="swipe__age">${p.age}</span>
            ${p.verified ? `<span class="swipe__verified">${Icons.get('verified')}</span>` : ''}</h2>
          <div class="swipe__meta">${Icons.get('pin')}<span>${esc(p.city)}, ${km(p.distance)}</span></div>
          <p class="swipe__bio">${esc(p.bio)}</p>
          <div class="swipe__tags">${p.interests.slice(0, 3).map(t =>
            `<span class="swipe__tag">${esc(t)}</span>`).join('')}</div>
        </div>
      </article>`;
  }

  function empty() {
    return `
      <div class="empty">
        <div class="empty__icon">${Icons.get('cards')}</div>
        <div class="empty__title">Анкеты закончились</div>
        <p class="empty__text">Попробуйте расширить фильтры поиска — увеличить радиус или возрастной диапазон.</p>
        <div class="stack" style="margin-top:20px">
          <button class="btn btn--primary btn--block" data-open-filters>Изменить фильтры</button>
          <button class="btn btn--ghost btn--block" data-restart>Показать анкеты заново</button>
        </div>
      </div>`;
  }

  function render() {
    const list = Store.feed().slice(0, 3);
    const view = $('#view');
    view.innerHTML = `
      <div class="feed">
        <div class="deck" id="deck">
          ${list.length ? list.map((p, i) => card(p, i)).reverse().join('') : empty()}
        </div>
        ${list.length ? `
        <div class="actions">
          <button class="action action--sm action--back" data-act="rewind" aria-label="Вернуть" data-icon="rewind"
            ${Store.state.history.length ? '' : 'disabled'}></button>
          <button class="action action--nope" data-act="pass" aria-label="Пропустить" data-icon="close"></button>
          <button class="action action--sm action--super" data-act="super" aria-label="Суперсимпатия" data-icon="star"></button>
          <button class="action action--like" data-act="like" aria-label="Нравится" data-icon="heartFill"></button>
          <button class="action action--sm action--boost" data-act="boost" aria-label="Поднять анкету" data-icon="bolt"></button>
        </div>` : ''}
      </div>`;
    Icons.hydrate(view);
    bind();
  }

  function topCard() { return $('#deck .swipe:last-child'); }

  function bind() {
    const view = $('#view');

    view.querySelectorAll('[data-act]').forEach(btn => {
      btn.onclick = () => {
        const act = btn.dataset.act;
        if (act === 'rewind') return rewind();
        if (act === 'boost') return boost();
        swipeOut(act);
      };
    });

    const restart = view.querySelector('[data-restart]');
    if (restart) restart.onclick = () => {
      Store.state.decisions = {}; Store.state.history = []; Store.save(); render();
    };
    const openF = view.querySelector('[data-open-filters]');
    if (openF) openF.onclick = openFilters;

    const top = topCard();
    if (top) attachDrag(top);
  }

  function attachDrag(el) {
    let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, moved = false;

    el.addEventListener('pointerdown', e => {
      if (busy || e.button === 2) return;
      dragging = true; moved = false;
      startX = e.clientX; startY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
    });

    el.addEventListener('pointermove', e => {
      if (!dragging) return;
      dx = e.clientX - startX;
      dy = e.clientY - startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
      const like = el.querySelector('.stamp--like');
      const nope = el.querySelector('.stamp--nope');
      const sup = el.querySelector('.stamp--super');
      const up = dy < -60 && Math.abs(dx) < 60;
      like.style.opacity = up ? 0 : Math.max(0, Math.min(1, dx / 110));
      nope.style.opacity = up ? 0 : Math.max(0, Math.min(1, -dx / 110));
      sup.style.opacity = up ? Math.min(1, -dy / 130) : 0;
    });

    function finish(e) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-dragging');
      const id = el.dataset.id;

      if (!moved) {
        // при захвате указателя e.target — сама карточка, поэтому ищем цель по координатам
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        const nav = hit && hit.closest('[data-photo]');
        if (nav) { flipPhoto(id, nav.dataset.photo); return; }
        if (hit && hit.closest('[data-detail]')) { openDetail(id); return; }
      }
      if (dy < -110 && Math.abs(dx) < 90) return swipeOut('super');
      if (dx > 95) return swipeOut('like');
      if (dx < -95) return swipeOut('pass');

      el.style.transition = 'transform .28s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = '';
      $$('.stamp', el).forEach(s => (s.style.opacity = 0));
      setTimeout(() => (el.style.transition = ''), 300);
      dx = dy = 0;
    }

    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
  }

  function flipPhoto(id, dir) {
    const p = Data.byId(id);
    const cur = photoIndex[id] || 0;
    const next = dir === 'next'
      ? Math.min(p.photos.length - 1, cur + 1)
      : Math.max(0, cur - 1);
    if (next === cur) return;
    photoIndex[id] = next;
    const el = topCard();
    el.querySelector('.swipe__photo').src = p.photos[next];
    $$('.swipe__bar', el).forEach((b, i) => b.classList.toggle('is-active', i === next));
  }

  function swipeOut(verdict) {
    const el = topCard();
    if (!el || busy) return;
    busy = true;
    const id = el.dataset.id;
    const profile = Data.byId(id);
    const off = verdict === 'pass' ? -520 : verdict === 'like' ? 520 : 0;
    const offY = verdict === 'super' ? -720 : 60;

    el.classList.add('is-animating');
    el.style.transform = `translate(${off}px, ${offY}px) rotate(${off / 20}deg)`;
    el.style.opacity = '0';

    const matched = Store.decide(id, verdict);
    setTimeout(() => {
      busy = false;
      render();
      App.refreshBadges();
      if (matched) UI.showMatch(profile);
      else if (verdict === 'super') toast('Суперсимпатия отправлена');
    }, 300);
  }

  function rewind() {
    if (!Store.state.premium) {
      return UI.openSheet('Вернуть анкету', premiumPitch('Возврат анкет доступен в подписке «Взаимно+».'), mountPremium);
    }
    const id = Store.rewind();
    if (!id) return toast('Нечего возвращать');
    render();
    toast('Анкета возвращена');
  }

  function boost() {
    UI.openSheet('Поднять анкету', premiumPitch('Ваша анкета будет показана первой в вашем городе в течение 30 минут.'), mountPremium);
  }

  function premiumPitch(text) {
    return `
      <div class="promo" style="margin:0 0 16px">
        <div class="promo__title">Взаимно+</div>
        <p class="promo__text">${esc(text)}</p>
        <ul class="stack" style="gap:8px;font-size:14px">
          <li class="row">${Icons.get('check')}<span>Видно, кто вас лайкнул</span></li>
          <li class="row">${Icons.get('check')}<span>Безлимитные симпатии и возврат анкет</span></li>
          <li class="row">${Icons.get('check')}<span>5 суперсимпатий каждую неделю</span></li>
          <li class="row">${Icons.get('check')}<span>Режим невидимки и подъём анкеты</span></li>
        </ul>
      </div>
      <button class="btn btn--primary btn--block" data-buy>Подключить за 399 ₽ / мес</button>`;
  }

  function mountPremium(body) {
    body.querySelector('[data-buy]').onclick = () => {
      Store.state.premium = true; Store.save();
      UI.closeSheet();
      toast('Подписка «Взаимно+» активна');
      App.render();
    };
  }

  function openDetail(id) {
    const p = Data.byId(id);
    const html = `
      <div class="detail__photo" style="border-radius:20px;overflow:hidden">
        <img src="${p.photos[0]}" alt="${esc(p.name)}">
      </div>
      <div class="detail__body" style="padding:16px 0 0">
        <h2 class="detail__name">${esc(p.name)}, ${p.age}
          ${p.verified ? `<span class="swipe__verified" style="color:var(--blue)">${Icons.get('verified')}</span>` : ''}</h2>
        <div class="detail__row">${Icons.get('pin')}<span>${esc(p.city)}, ${km(p.distance)}</span></div>
        <div class="detail__row">${Icons.get('work')}<span>${esc(p.job)}</span></div>
        <div class="detail__row">${Icons.get('ruler')}<span>${p.height} см · ${esc(p.education)} образование</span></div>
        <div class="detail__row">${Icons.get('heart')}<span>${esc(Data.goalLabel(p.goal))}</span></div>
        <div class="detail__section">
          <h3>О себе</h3>
          <p style="font-size:14.5px;line-height:1.5">${esc(p.bio)}</p>
        </div>
        <div class="detail__section">
          <h3>Интересы</h3>
          <div class="chips">${p.interests.map(t => `<span class="chip chip--sm">${esc(t)}</span>`).join('')}</div>
        </div>
        <div class="detail__actions">
          <button class="action action--nope" data-d="pass" data-icon="close"></button>
          <button class="action action--sm action--super" data-d="super" data-icon="star"></button>
          <button class="action action--like" data-d="like" data-icon="heartFill"></button>
        </div>
        <button class="btn btn--ghost btn--block" data-report>Пожаловаться на анкету</button>
      </div>`;
    UI.openSheet('Анкета', html, body => {
      body.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
        UI.closeSheet();
        const verdict = b.dataset.d;
        if (topCard() && topCard().dataset.id === id) swipeOut(verdict);
        else {
          const matched = Store.decide(id, verdict);
          render(); App.refreshBadges();
          if (matched) UI.showMatch(p);
        }
      });
      body.querySelector('[data-report]').onclick = () => {
        UI.closeSheet(); toast('Жалоба отправлена на модерацию');
      };
    });
  }

  function openFilters() {
    const f = Store.state.filters;
    const html = `
      <div class="stack" style="gap:22px">
        <div>
          <div class="section__title">Показывать</div>
          <div class="segment" id="f-gender">
            ${[['f', 'Женщин'], ['m', 'Мужчин'], ['any', 'Всех']].map(([v, l]) =>
              `<button class="segment__item ${f.gender === v ? 'is-active' : ''}" data-v="${v}">${l}</button>`).join('')}
          </div>
        </div>
        <div>
          <div class="row row--between"><span class="section__title" style="margin:0">Возраст</span>
            <b id="f-age-label">${f.ageMin}–${f.ageMax}</b></div>
          <div class="row" style="gap:12px;margin-top:10px">
            <input class="range" type="range" id="f-age-min" min="18" max="70" value="${f.ageMin}">
            <input class="range" type="range" id="f-age-max" min="18" max="70" value="${f.ageMax}">
          </div>
        </div>
        <div>
          <div class="row row--between"><span class="section__title" style="margin:0">Расстояние</span>
            <b id="f-dist-label">${f.distance} км</b></div>
          <input class="range" type="range" id="f-dist" min="1" max="100" value="${f.distance}" style="margin-top:10px">
        </div>
        <div>
          <div class="section__title">Цель знакомства</div>
          <select class="field__select" id="f-goal">
            <option value="any" ${f.goal === 'any' ? 'selected' : ''}>Любая</option>
            ${Data.GOALS.map(g => `<option value="${g.id}" ${f.goal === g.id ? 'selected' : ''}>${esc(g.label)}</option>`).join('')}
          </select>
        </div>
        <label class="row row--between">
          <span><b>Только онлайн</b><br><span class="muted" style="font-size:13px">Кто сейчас в приложении</span></span>
          <span class="switch"><input type="checkbox" id="f-online" ${f.onlineOnly ? 'checked' : ''}><span class="switch__track"></span></span>
        </label>
        <button class="btn btn--primary btn--block" data-apply>Показать анкеты</button>
        <button class="btn btn--ghost btn--block" data-reset>Сбросить фильтры</button>
      </div>`;

    UI.openSheet('Фильтры поиска', html, body => {
      const min = body.querySelector('#f-age-min');
      const max = body.querySelector('#f-age-max');
      const dist = body.querySelector('#f-dist');
      const sync = () => {
        if (+min.value > +max.value) max.value = min.value;
        body.querySelector('#f-age-label').textContent = min.value + '–' + max.value;
      };
      min.oninput = max.oninput = sync;
      dist.oninput = () => (body.querySelector('#f-dist-label').textContent = dist.value + ' км');
      body.querySelectorAll('#f-gender [data-v]').forEach(b => b.onclick = () => {
        body.querySelectorAll('#f-gender [data-v]').forEach(x => x.classList.remove('is-active'));
        b.classList.add('is-active');
      });
      body.querySelector('[data-apply]').onclick = () => {
        f.gender = body.querySelector('#f-gender .is-active').dataset.v;
        f.ageMin = +min.value; f.ageMax = +max.value;
        f.distance = +dist.value;
        f.goal = body.querySelector('#f-goal').value;
        f.onlineOnly = body.querySelector('#f-online').checked;
        Store.save(); UI.closeSheet(); render();
        toast('Фильтры применены');
      };
      body.querySelector('[data-reset]').onclick = () => {
        Object.assign(f, { gender: 'f', ageMin: 20, ageMax: 35, distance: 50, goal: 'any', onlineOnly: false });
        Store.save(); UI.closeSheet(); render();
      };
    });
  }

  function onKey(e) {
    if ($('#screen-main').hidden || App.tab !== 'feed') return;
    if (!$('#sheet').hidden || !$('#match').hidden) return;
    if (e.key === 'ArrowLeft') swipeOut('pass');
    if (e.key === 'ArrowRight') swipeOut('like');
    if (e.key === 'ArrowUp') swipeOut('super');
  }
  document.addEventListener('keydown', onKey);

  return { render, openFilters, openDetail, premiumPitch, mountPremium };
})();
