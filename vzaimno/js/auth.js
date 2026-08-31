/* Вход по номеру телефона и заполнение анкеты */
window.Auth = (function () {
  const { $, $$, esc, toast } = UI;
  let resendTimer = null;

  function formatPhone(value) {
    let d = value.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (!d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    const p = d.slice(1);
    let out = '+7';
    if (p.length) out += ' (' + p.slice(0, 3);
    if (p.length >= 3) out += ') ' + p.slice(3, 6);
    if (p.length >= 6) out += '-' + p.slice(6, 8);
    if (p.length >= 8) out += '-' + p.slice(8, 10);
    return out;
  }

  function initAuth() {
    const phoneInput = $('#input-phone');
    const formPhone = $('#form-phone');
    const formCode = $('#form-code');
    const phoneErr = $('#phone-error');
    const codeErr = $('#code-error');

    phoneInput.addEventListener('input', () => {
      phoneInput.value = formatPhone(phoneInput.value);
      phoneErr.hidden = true;
    });
    phoneInput.addEventListener('focus', () => {
      if (!phoneInput.value) phoneInput.value = '+7 ';
    });

    formPhone.addEventListener('submit', e => {
      e.preventDefault();
      const digits = phoneInput.value.replace(/\D/g, '');
      if (digits.length !== 11) {
        phoneErr.textContent = 'Введите номер полностью';
        phoneErr.hidden = false;
        return;
      }
      Store.state.auth.phone = phoneInput.value;
      Store.save();
      $('#code-phone').textContent = phoneInput.value;
      formPhone.hidden = true;
      formCode.hidden = false;
      $$('.codeinput__cell').forEach(c => (c.value = ''));
      $$('.codeinput__cell')[0].focus();
      startResendTimer();
    });

    $('#btn-change-phone').addEventListener('click', () => {
      formCode.hidden = true;
      formPhone.hidden = false;
      clearInterval(resendTimer);
    });

    const cells = $$('.codeinput__cell');
    cells.forEach((cell, i) => {
      cell.addEventListener('input', () => {
        cell.value = cell.value.replace(/\D/g, '').slice(0, 1);
        codeErr.hidden = true;
        if (cell.value && i < cells.length - 1) cells[i + 1].focus();
        if (cells.every(c => c.value)) formCode.requestSubmit();
      });
      cell.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !cell.value && i > 0) cells[i - 1].focus();
      });
      cell.addEventListener('paste', e => {
        const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '');
        if (!text) return;
        e.preventDefault();
        cells.forEach((c, k) => (c.value = text[k] || ''));
        if (cells.every(c => c.value)) formCode.requestSubmit();
      });
    });

    formCode.addEventListener('submit', e => {
      e.preventDefault();
      const code = cells.map(c => c.value).join('');
      if (code !== '1234') {
        codeErr.textContent = 'Неверный код. Для демо введите 1234';
        codeErr.hidden = false;
        cells.forEach(c => (c.value = ''));
        cells[0].focus();
        return;
      }
      clearInterval(resendTimer);
      Store.state.auth.loggedIn = true;
      Store.save();
      if (!Store.state.me.name) Onboarding.start();
      else App.enterApp();
    });

    $('#btn-resend').addEventListener('click', () => { toast('Код отправлен повторно'); startResendTimer(); });
  }

  function startResendTimer() {
    let left = 60;
    const btn = $('#btn-resend'), label = $('#resend-timer');
    btn.disabled = true;
    label.hidden = false;
    label.textContent = '(' + left + ')';
    clearInterval(resendTimer);
    resendTimer = setInterval(() => {
      left--;
      label.textContent = '(' + left + ')';
      if (left <= 0) { clearInterval(resendTimer); btn.disabled = false; label.hidden = true; }
    }, 1000);
  }

  return { initAuth, formatPhone };
})();

/* Пошаговая анкета */
window.Onboarding = (function () {
  const { $, esc, toast } = UI;
  let step = 0;
  const draft = { name: '', age: '', gender: 'm', lookingFor: 'f', goal: 'dating', city: 'Москва', interests: [] };

  const steps = [
    {
      title: 'Как вас зовут?',
      sub: 'Имя увидят все, кому вы понравитесь',
      render: () => `
        <label class="field" style="margin-bottom:14px">
          <span class="field__label">Имя</span>
          <input class="field__input" id="onb-name" maxlength="20" placeholder="Например, Даниил" value="${esc(draft.name)}">
        </label>
        <label class="field">
          <span class="field__label">Возраст</span>
          <input class="field__input" id="onb-age" type="number" min="18" max="90" inputmode="numeric" placeholder="18+" value="${esc(draft.age)}">
        </label>
        <p class="field__hint">Регистрация доступна с 18 лет.</p>`,
      mount: () => {
        $('#onb-name').oninput = e => (draft.name = e.target.value);
        $('#onb-age').oninput = e => (draft.age = e.target.value);
      },
      valid: () => {
        if (draft.name.trim().length < 2) return 'Введите имя';
        const a = parseInt(draft.age, 10);
        if (!a || a < 18 || a > 90) return 'Возраст от 18 до 90 лет';
        return null;
      }
    },
    {
      title: 'Расскажите о себе',
      sub: 'Это поможет подобрать подходящие анкеты',
      render: () => `
        <div class="section__title">Ваш пол</div>
        <div class="pick" style="margin-bottom:22px">
          ${[['m', 'Мужчина'], ['f', 'Женщина']].map(([v, l]) => `
            <button class="pick__item ${draft.gender === v ? 'is-active' : ''}" data-gender="${v}">
              <span class="pick__radio"></span><span>${l}</span>
            </button>`).join('')}
        </div>
        <div class="section__title">Кого вы ищете</div>
        <div class="pick">
          ${[['f', 'Женщин'], ['m', 'Мужчин'], ['any', 'Всех']].map(([v, l]) => `
            <button class="pick__item ${draft.lookingFor === v ? 'is-active' : ''}" data-looking="${v}">
              <span class="pick__radio"></span><span>${l}</span>
            </button>`).join('')}
        </div>`,
      mount: body => {
        body.querySelectorAll('[data-gender]').forEach(b => b.onclick = () => {
          draft.gender = b.dataset.gender; render();
        });
        body.querySelectorAll('[data-looking]').forEach(b => b.onclick = () => {
          draft.lookingFor = b.dataset.looking; render();
        });
      },
      valid: () => null
    },
    {
      title: 'Что вы ищете?',
      sub: 'Цель знакомства видна в вашей анкете',
      render: () => `
        <div class="pick">
          ${Data.GOALS.map(g => `
            <button class="pick__item ${draft.goal === g.id ? 'is-active' : ''}" data-goal="${g.id}">
              <span class="pick__radio"></span>
              <span>${esc(g.label)}<small>${esc(g.hint)}</small></span>
            </button>`).join('')}
        </div>`,
      mount: body => {
        body.querySelectorAll('[data-goal]').forEach(b => b.onclick = () => {
          draft.goal = b.dataset.goal; render();
        });
      },
      valid: () => null
    },
    {
      title: 'Интересы и город',
      sub: 'Выберите от 3 до 8 интересов',
      render: () => `
        <label class="field" style="margin-bottom:20px">
          <span class="field__label">Город</span>
          <select class="field__select" id="onb-city">
            ${Data.CITIES.map(c => `<option ${c === draft.city ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </label>
        <div class="section__title">Интересы (${draft.interests.length}/8)</div>
        <div class="chips">
          ${Data.INTERESTS.map(t => `
            <button class="chip" data-tag="${esc(t)}" aria-pressed="${draft.interests.includes(t)}">${esc(t)}</button>`).join('')}
        </div>`,
      mount: body => {
        $('#onb-city').onchange = e => (draft.city = e.target.value);
        body.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => {
          const t = b.dataset.tag;
          const i = draft.interests.indexOf(t);
          if (i > -1) draft.interests.splice(i, 1);
          else if (draft.interests.length >= 8) return toast('Не больше 8 интересов');
          else draft.interests.push(t);
          render();
        });
      },
      valid: () => draft.interests.length < 3 ? 'Выберите минимум 3 интереса' : null
    }
  ];

  function render() {
    const s = steps[step];
    const body = $('#onboarding-body');
    body.innerHTML = `<h2 class="onboarding__title">${esc(s.title)}</h2>
      <p class="onboarding__sub">${esc(s.sub)}</p>${s.render()}`;
    if (s.mount) s.mount(body);
    $('#onb-progress').style.width = ((step + 1) / steps.length * 100) + '%';
    $('#onb-counter').textContent = (step + 1) + '/' + steps.length;
    $('#onb-next').textContent = step === steps.length - 1 ? 'Начать знакомиться' : 'Далее';
  }

  function next() {
    const err = steps[step].valid();
    if (err) return toast(err);
    if (step < steps.length - 1) { step++; render(); return; }
    finish();
  }

  function back() {
    if (step === 0) {
      Store.state.auth.loggedIn = false; Store.save();
      App.showScreen('auth');
      return;
    }
    step--; render();
  }

  function finish() {
    const me = Store.state.me;
    me.name = draft.name.trim();
    me.age = parseInt(draft.age, 10);
    me.gender = draft.gender;
    me.goal = draft.goal;
    me.city = draft.city;
    me.interests = draft.interests.slice();
    me.photos = [Avatar.url('me-' + me.name, 0, me.gender)];
    Store.state.filters.gender = draft.lookingFor;
    Store.seedLikes();
    Store.save();
    App.enterApp();
    UI.toast('Анкета создана');
  }

  function start() {
    step = 0;
    App.showScreen('onboarding');
    render();
  }

  return { start, next, back };
})();
