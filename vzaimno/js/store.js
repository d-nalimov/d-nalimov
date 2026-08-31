/* Состояние приложения и сохранение в localStorage */
window.Store = (function () {
  const KEY = 'vzaimno.state.v1';

  const defaults = () => ({
    version: 1,
    auth: { phone: '', loggedIn: false },
    me: {
      name: '', age: null, gender: 'm', goal: 'dating',
      city: 'Москва', bio: '', interests: [], job: '', height: null,
      photos: [], verified: false
    },
    filters: { gender: 'f', ageMin: 20, ageMax: 35, distance: 50, goal: 'any', onlineOnly: false },
    decisions: {},          // profileId -> 'like' | 'pass' | 'super'
    incomingLikes: [],      // кто лайкнул вас
    matches: [],            // взаимные симпатии
    chats: {},              // matchId -> { messages:[], unread:0 }
    premium: false,
    theme: 'light',
    stats: { likes: 0, views: 0 },
    history: []             // для «вернуть анкету»
  });

  let state = defaults();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = Object.assign(defaults(), JSON.parse(raw));
    } catch (e) { state = defaults(); }
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function reset() { state = defaults(); save(); }

  /* --- анкеты --- */
  function matchesFilters(p) {
    const f = state.filters;
    if (f.gender !== 'any' && p.gender !== f.gender) return false;
    if (p.age < f.ageMin || p.age > f.ageMax) return false;
    if (p.distance > f.distance) return false;
    if (f.goal !== 'any' && p.goal !== f.goal) return false;
    if (f.onlineOnly && !p.online) return false;
    return true;
  }

  function feed() {
    return Data.PROFILES.filter(p => !state.decisions[p.id] && matchesFilters(p));
  }

  function decide(id, verdict) {
    state.decisions[id] = verdict;
    state.history.push({ id, verdict });
    if (state.history.length > 20) state.history.shift();
    state.stats.views++;
    if (verdict !== 'pass') state.stats.likes++;

    let matched = false;
    if (verdict === 'like' || verdict === 'super') {
      const liked = state.incomingLikes.includes(id);
      const chance = verdict === 'super' ? 0.65 : 0.35;
      if (liked || Math.random() < chance) {
        matched = true;
        addMatch(id);
      }
    }
    save();
    return matched;
  }

  function rewind() {
    const last = state.history.pop();
    if (!last) return null;
    delete state.decisions[last.id];
    const mi = state.matches.indexOf(last.id);
    if (mi > -1) { state.matches.splice(mi, 1); delete state.chats[last.id]; }
    save();
    return last.id;
  }

  function addMatch(id) {
    if (state.matches.includes(id)) return;
    state.matches.unshift(id);
    state.incomingLikes = state.incomingLikes.filter(x => x !== id);
    if (!state.chats[id]) state.chats[id] = { messages: [], unread: 0, ts: Date.now() };
  }

  function pushMessage(id, from, text) {
    if (!state.chats[id]) state.chats[id] = { messages: [], unread: 0, ts: Date.now() };
    const chat = state.chats[id];
    chat.messages.push({ from, text, ts: Date.now() });
    chat.ts = Date.now();
    if (from === 'them') chat.unread++;
    save();
  }

  function readChat(id) {
    if (state.chats[id]) { state.chats[id].unread = 0; save(); }
  }

  function unreadTotal() {
    return Object.values(state.chats).reduce((n, c) => n + (c.unread || 0), 0);
  }

  function seedLikes() {
    if (state.incomingLikes.length) return;
    const pool = Data.PROFILES.filter(p => !state.decisions[p.id]);
    state.incomingLikes = pool.slice(0, 7).map(p => p.id);
    save();
  }

  function toggleInterest(tag) {
    const list = state.me.interests;
    const i = list.indexOf(tag);
    if (i > -1) list.splice(i, 1);
    else if (list.length < 8) list.push(tag);
    save();
  }

  function completeness() {
    const m = state.me;
    const checks = [!!m.name, !!m.age, !!m.city, !!m.bio, m.interests.length >= 3,
      m.photos.length >= 1, m.photos.length >= 3, !!m.job];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
  }

  return {
    get state() { return state; },
    load, save, reset, feed, decide, rewind, addMatch, pushMessage, readChat,
    unreadTotal, seedLikes, toggleInterest, completeness, matchesFilters
  };
})();
