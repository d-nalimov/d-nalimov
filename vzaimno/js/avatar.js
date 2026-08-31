/* Генератор изображений анкет: детерминированные SVG-портреты */
window.Avatar = (function () {
  const BG = [
    ['#F6EEDC', '#E6D2AC'], ['#FBE4E4', '#F0B9BB'], ['#E2ECF9', '#B9CFEC'],
    ['#E4F1E8', '#B9D9C6'], ['#F2E6F4', '#D6BCDF'], ['#FCEBDA', '#EFC79B'],
    ['#E8E6F8', '#C2BEE8'], ['#E1F0F1', '#B4D9DC'], ['#F7E9E1', '#E2C1AC']
  ];
  const HAIR = ['#1A1613', '#3B2A1B', '#6B3B1E', '#8C6B3F', '#232A36', '#C0A16B'];
  const SKIN = ['#F7DFC9', '#EFCFB0', '#E0B894', '#C99873'];
  const CLOTH = ['#1F2A37', '#7A2B2E', '#2E4C3B', '#3A3A55', '#5C4632', '#26343F'];

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return Math.abs(h);
  }

  /* волосы позади головы */
  function hairBack(v, tone) {
    switch (v) {
      case 0: return `<path d="M74 150h152v134q0 18-18 18h-116q-18 0-18-18Z" fill="${tone}"/>
                      <circle cx="150" cy="152" r="78" fill="${tone}"/>`;
      case 2: return `<circle cx="150" cy="64" r="28" fill="${tone}"/><circle cx="150" cy="154" r="76" fill="${tone}"/>`;
      case 3: return `<g fill="${tone}"><circle cx="96" cy="122" r="34"/><circle cx="150" cy="98" r="38"/>
                      <circle cx="204" cy="122" r="34"/><circle cx="84" cy="166" r="28"/><circle cx="216" cy="166" r="28"/></g>`;
      case 4: return `<path d="M76 150h148v92h-30l-6-52h-76l-6 52H76Z" fill="${tone}"/>
                      <circle cx="150" cy="152" r="76" fill="${tone}"/>`;
      default: return `<circle cx="150" cy="154" r="75" fill="${tone}"/>`;
    }
  }

  /* волосы поверх лица */
  function hairFront(v, tone) {
    if (v === 4) return `<path d="M80 156a70 70 0 0 1 140 0v-24H80Z" fill="${tone}"/>`;
    if (v === 1) return `<path d="M82 154a68 68 0 0 1 136 0c-12-38-38-56-68-56s-56 18-68 56Z" fill="${tone}"/>`;
    return `<path d="M80 156a70 70 0 0 1 140 0c-8-40-38-62-70-62s-62 22-70 62Z" fill="${tone}"/>`;
  }

  function beard(tone) {
    return `<path d="M86 168c0 52 28 78 64 78s64-26 64-78c0 34-128 34-128 0Z" fill="${tone}" opacity=".95"/>`;
  }

  function build(seed, index, gender) {
    const h = hash(seed + '#' + (index || 0));
    const bg = BG[h % BG.length];
    const pool = gender === 'f' ? [0, 2, 3, 4] : gender === 'm' ? [1, 5, 3] : [0, 1, 2, 3, 4, 5];
    const v = pool[(h >> 3) % pool.length];
    const tone = HAIR[(h >> 6) % HAIR.length];
    const skin = SKIN[(h >> 10) % SKIN.length];
    const cloth = CLOTH[(h >> 13) % CLOTH.length];
    const shift = ((h >> 17) % 11) - 5;
    const withBeard = gender !== 'f' && (v === 5 || (h >> 19) % 3 === 0);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 500" width="300" height="500">
  <defs><linearGradient id="b" x1="0" y1="0" x2=".5" y2="1">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient></defs>
  <rect width="300" height="500" fill="url(#b)"/>
  <circle cx="150" cy="248" r="140" fill="#FFFFFF" opacity=".26"/>
  <g transform="translate(${shift} 60)">
    <path d="M126 196h48v104h-48Z" fill="${skin}"/>
    <path d="M8 400c0-80 62-124 142-124s142 44 142 124Z" fill="${cloth}"/>
    <rect x="8" y="396" width="284" height="48" fill="${cloth}"/>
    ${hairBack(v, tone)}
    <circle cx="150" cy="164" r="70" fill="${skin}"/>
    <circle cx="80" cy="176" r="12" fill="${skin}"/>
    <circle cx="220" cy="176" r="12" fill="${skin}"/>
    ${withBeard ? beard(tone) : ''}
    ${hairFront(v, tone)}
    <circle cx="124" cy="164" r="6" fill="#1B1712"/>
    <circle cx="176" cy="164" r="6" fill="#1B1712"/>
    <path d="M112 146c8-6 18-6 25-2M163 144c7-4 17-4 25 2" stroke="${tone}" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M133 196c10 9 24 9 34 0" stroke="#8A4B44" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M150 168v14c0 4-3 6-7 6" stroke="#D8A98A" stroke-width="4" stroke-linecap="round" fill="none"/>
  </g>
</svg>`;
  }

  const cache = new Map();
  function url(seed, index, gender) {
    const key = seed + '|' + (index || 0) + '|' + (gender || '');
    if (!cache.has(key)) {
      cache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(build(seed, index, gender)));
    }
    return cache.get(key);
  }
  return { url };
})();
