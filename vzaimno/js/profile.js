/* Профиль пользователя и настройки */
window.Profile = (function () {
  const { $, esc, toast } = UI;

  function render() {
    const me = Store.state.me;
    const st = Store.state;
    const done = Store.completeness();
    const view = $('#view');

    view.innerHTML = `
      <div class="profile__head">
        <div class="profile__avatar"><img src="${me.photos[0] || Avatar.url('me', 0, me.gender)}" alt=""></div>
        <div class="profile__name">${esc(me.name || 'Без имени')}${me.age ? ', ' + me.age : ''}</div>
        <div class="profile__loc">${esc(me.city)} · ${esc(Data.goalLabel(me.goal))}</div>
        ${st.premium ? `<div class="chip" style="margin-top:10px;background:var(--gold);color:#fff">Взаимно+</div>` : ''}
        <div class="profile__stats">
          <div class="stat"><div class="stat__num">${st.stats.views}</div><div class="stat__lbl">просмотров</div></div>
          <div class="stat"><div class="stat__num">${st.incomingLikes.length}</div><div class="stat__lbl">симпатий</div></div>
          <div class="stat"><div class="stat__num">${st.matches.length}</div><div class="stat__lbl">пар</div></div>
        </div>
      </div>

      ${done < 100 ? `
        <div class="completeness">
          <div class="completeness__row"><span>Анкета заполнена</span><span>${done}%</span></div>
          <div class="progress"><div class="progress__bar" style="width:${done}%"></div></div>
          <p class="muted" style="font-size:13px;margin-top:10px">Заполненные анкеты показывают чаще.</p>
        </div>` : ''}

      <div class="section">
        <div class="section__title">Фотографии</div>
        <div class="photos" id="photos">
          ${me.photos.map((src, i) => `
            <div class="photo ${i === 0 ? 'photo--main' : ''}">
              <img src="${src}" alt="">
              <button class="photo__del" data-del="${i}" aria-label="Удалить" data-icon="close"></button>
            </div>`).join('')}
          ${me.photos.length < 6 ? `<button class="photo photo--add" data-add>${Icons.get('plus')}</button>` : ''}
        </div>
      </div>

      <div class="section" style="padding-top:0">
        <div class="section__title">О себе</div>
        <div class="card">
          <p style="font-size:14.5px;line-height:1.5;${me.bio ? '' : 'color:var(--muted)'}">
            ${esc(me.bio || 'Расскажите о себе — так анкету открывают чаще.')}</p>
          ${me.interests.length ? `<div class="chips" style="margin-top:14px">
            ${me.interests.map(t => `<span class="chip chip--sm">${esc(t)}</span>`).join('')}</div>` : ''}
          <button class="btn btn--soft btn--sm" style="margin-top:14px" data-edit>Редактировать анкету</button>
        </div>
      </div>

      ${!st.premium ? `
        <div class="promo">
          <div class="promo__title">Взаимно+</div>
          <p class="promo__text">Смотрите, кому вы понравились, возвращайте анкеты и получайте суперсимпатии.</p>
          <button class="btn btn--soft btn--sm" data-premium>Подробнее</button>
        </div>` : ''}

      <div class="menu">
        <button class="menuitem" data-m="filters">${Icons.get('filter')}
          <span class="menuitem__label">Настройки поиска</span>
          <span class="menuitem__value">${st.filters.ageMin}–${st.filters.ageMax}, ${st.filters.distance} км</span></button>
        <button class="menuitem" data-m="verify">${Icons.get('shield')}
          <span class="menuitem__label">Верификация</span>
          <span class="menuitem__value">${me.verified ? 'Пройдена' : 'Не пройдена'}</span></button>
        <button class="menuitem" data-m="notify">${Icons.get('bell')}
          <span class="menuitem__label">Уведомления</span></button>
        <button class="menuitem" data-m="theme">${Icons.get('moon')}
          <span class="menuitem__label">Тёмная тема</span>
          <span class="switch"><input type="checkbox" id="theme-switch" ${st.theme === 'dark' ? 'checked' : ''}><span class="switch__track"></span></span></button>
        <button class="menuitem" data-m="privacy">${Icons.get('eye')}
          <span class="menuitem__label">Приватность</span></button>
        <button class="menuitem" data-m="logout">${Icons.get('logout')}
          <span class="menuitem__label">Выйти</span></button>
      </div>
      <div class="section center">
        <button class="linkbtn" data-m="wipe" style="color:var(--muted);font-size:13px">Удалить аккаунт и данные</button>
        <p class="muted" style="font-size:12px;margin-top:10px">Взаимно · демо-версия интерфейса</p>
      </div>`;
    Icons.hydrate(view);
    bind(view);
  }

  function bind(view) {
    const me = Store.state.me;

    const add = view.querySelector('[data-add]');
    if (add) add.onclick = () => {
      me.photos.push(Avatar.url('me-' + me.name + '-' + Date.now(), me.photos.length, me.gender));
      Store.save(); render(); toast('Фото добавлено');
    };
    view.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      me.photos.splice(+b.dataset.del, 1); Store.save(); render();
    });

    const edit = view.querySelector('[data-edit]');
    if (edit) edit.onclick = openEdit;

    const prem = view.querySelector('[data-premium]');
    if (prem) prem.onclick = () => UI.openSheet('Взаимно+', Feed.premiumPitch('Больше возможностей для знакомств.'), Feed.mountPremium);

    const themeSwitch = view.querySelector('#theme-switch');
    if (themeSwitch) themeSwitch.onchange = e => {
      e.stopPropagation();
      Store.state.theme = e.target.checked ? 'dark' : 'light';
      Store.save();
      App.applyTheme();
    };

    view.querySelectorAll('[data-m]').forEach(b => b.onclick = e => {
      if (e.target.closest('.switch')) return;
      const m = b.dataset.m;
      if (m === 'filters') return Feed.openFilters();
      if (m === 'theme') {
        const sw = view.querySelector('#theme-switch');
        sw.checked = !sw.checked;
        sw.onchange({ target: sw, stopPropagation() {} });
        return;
      }
      if (m === 'verify') return verify();
      if (m === 'notify') return notifications();
      if (m === 'privacy') return privacy();
      if (m === 'logout') return UI.confirm('Выйти из аккаунта?', 'Анкета и переписки сохранятся на этом устройстве.', 'Выйти', () => {
        Store.state.auth.loggedIn = false; Store.save(); App.showScreen('auth');
      });
      if (m === 'wipe') return UI.confirm('Удалить аккаунт?', 'Все данные, включая пары и переписки, будут стёрты.', 'Удалить', () => {
        Store.reset(); location.reload();
      });
    });
  }

  function openEdit() {
    const me = Store.state.me;
    UI.openSheet('Редактирование анкеты', `
      <div class="stack" style="gap:16px">
        <label class="field"><span class="field__label">Имя</span>
          <input class="field__input" id="e-name" maxlength="20" value="${esc(me.name)}"></label>
        <label class="field"><span class="field__label">О себе</span>
          <textarea class="field__area" id="e-bio" maxlength="300" placeholder="Что вам важно в людях, чем занимаетесь, куда зовёте на первое свидание">${esc(me.bio)}</textarea>
          <span class="field__hint" id="e-count">${me.bio.length}/300</span></label>
        <label class="field"><span class="field__label">Работа</span>
          <input class="field__input" id="e-job" maxlength="40" placeholder="Например, специалист по ИБ" value="${esc(me.job)}"></label>
        <label class="field"><span class="field__label">Рост, см</span>
          <input class="field__input" id="e-height" type="number" min="140" max="220" inputmode="numeric" value="${me.height || ''}"></label>
        <label class="field"><span class="field__label">Город</span>
          <select class="field__select" id="e-city">
            ${Data.CITIES.map(c => `<option ${c === me.city ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select></label>
        <label class="field"><span class="field__label">Цель знакомства</span>
          <select class="field__select" id="e-goal">
            ${Data.GOALS.map(g => `<option value="${g.id}" ${g.id === me.goal ? 'selected' : ''}>${esc(g.label)}</option>`).join('')}
          </select></label>
        <div>
          <div class="field__label">Интересы <span id="e-icount">(${me.interests.length}/8)</span></div>
          <div class="chips" id="e-tags">
            ${Data.INTERESTS.map(t => `<button class="chip" data-tag="${esc(t)}" aria-pressed="${me.interests.includes(t)}">${esc(t)}</button>`).join('')}
          </div>
        </div>
        <button class="btn btn--primary btn--block" data-save>Сохранить</button>
      </div>`, body => {
      const bio = body.querySelector('#e-bio');
      bio.oninput = () => (body.querySelector('#e-count').textContent = bio.value.length + '/300');
      body.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => {
        const t = b.dataset.tag;
        const active = b.getAttribute('aria-pressed') === 'true';
        if (!active && me.interests.length >= 8) return toast('Не больше 8 интересов');
        Store.toggleInterest(t);
        b.setAttribute('aria-pressed', String(!active));
        body.querySelector('#e-icount').textContent = '(' + me.interests.length + '/8)';
      });
      body.querySelector('[data-save]').onclick = () => {
        const name = body.querySelector('#e-name').value.trim();
        if (name.length < 2) return toast('Введите имя');
        me.name = name;
        me.bio = bio.value.trim();
        me.job = body.querySelector('#e-job').value.trim();
        me.height = parseInt(body.querySelector('#e-height').value, 10) || null;
        me.city = body.querySelector('#e-city').value;
        me.goal = body.querySelector('#e-goal').value;
        Store.save(); UI.closeSheet(); render(); toast('Анкета обновлена');
      };
    });
  }

  function verify() {
    const me = Store.state.me;
    if (me.verified) return UI.openSheet('Верификация', '<p class="muted">Ваша анкета подтверждена. Значок виден другим пользователям.</p>');
    UI.openSheet('Верификация', `
      <p class="muted" style="margin-bottom:16px">Сделайте селфи с указанным жестом. Мы сравним его с фотографиями анкеты — фото не публикуется.</p>
      <div class="card center" style="margin-bottom:16px">
        <div class="empty__icon" style="margin:0 auto 12px">${Icons.get('camera')}</div>
        <div style="font-weight:600">Повторите жест на экране</div>
        <p class="muted" style="font-size:13px;margin-top:4px">Занимает меньше минуты</p>
      </div>
      <button class="btn btn--primary btn--block" data-go>Пройти верификацию</button>`, body => {
      body.querySelector('[data-go]').onclick = () => {
        me.verified = true; Store.save(); UI.closeSheet(); render(); toast('Анкета верифицирована');
      };
    });
  }

  function notifications() {
    const opts = [['Новые симпатии', true], ['Сообщения', true], ['Взаимные симпатии', true], ['Советы и новости сервиса', false]];
    UI.openSheet('Уведомления', `<div class="stack">${opts.map(([l, on], i) => `
      <label class="row row--between"><span>${l}</span>
        <span class="switch"><input type="checkbox" ${on ? 'checked' : ''} data-n="${i}"><span class="switch__track"></span></span></label>`).join('')}
      </div>`, body => {
      body.querySelectorAll('[data-n]').forEach(c => c.onchange = () => toast('Настройки сохранены'));
    });
  }

  function privacy() {
    UI.openSheet('Приватность', `<div class="stack">
      <label class="row row--between"><span>Показывать расстояние<br><span class="muted" style="font-size:13px">Другие видят, как далеко вы</span></span>
        <span class="switch"><input type="checkbox" checked data-p><span class="switch__track"></span></span></label>
      <label class="row row--between"><span>Показывать статус «в сети»</span>
        <span class="switch"><input type="checkbox" checked data-p><span class="switch__track"></span></span></label>
      <label class="row row--between"><span>Режим невидимки<br><span class="muted" style="font-size:13px">Доступно в подписке «Взаимно+»</span></span>
        <span class="switch"><input type="checkbox" ${Store.state.premium ? '' : 'disabled'} data-p><span class="switch__track"></span></span></label>
      </div>`, body => {
      body.querySelectorAll('[data-p]').forEach(c => c.onchange = () => toast('Настройки сохранены'));
    });
  }

  return { render };
})();
