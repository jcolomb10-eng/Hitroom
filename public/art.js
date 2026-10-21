// Emblèmes de rang et médailles d'exploits, dessinés en SVG (nets à toutes les tailles, légers, animables).
// Chaque dessin porte ses propres dégradés (identifiants uniques) pour s'afficher même après un écran caché.
(() => {
  let uid = 0;
  const nid = () => 'a' + (++uid).toString(36);

  // étoile à 5 branches
  const star = (cx, cy, r, ri = r * 0.45) => {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? ri : r;
      d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  };
  const lin = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const rad = (id, c, o = 0.75) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${o}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;

  const SHIELD = 'M60 14L92 26V58C92 80 78 96 60 106C42 96 28 80 28 58V26Z';
  const SHIELD_IN = 'M60 22L85 31.5V58C85 76 74 89 60 97C46 89 35 76 35 58V31.5Z';
  const WING = 'M31 40C22 38 13 33 7 25C12 26 17 26 21 25C15 23 10 19 7 14C13 16 19 17 24 16C19 13 16 10 14 6C21 10 28 15 33 22Z';
  const wings = (fill, y = 0) => `<g transform="translate(0 ${y})"><path d="${WING}" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width="1"/><path d="${WING}" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width="1" transform="translate(120 0) scale(-1 1)"/></g>`;
  const CROWN = 'M40 30L45 12L53 22L60 6L67 22L75 12L80 30Z';
  const crown = (f1, f2, id) => `${lin(id, [f1, f2])}<path d="${CROWN}" fill="url(#${id})" stroke="rgba(0,0,0,.4)" stroke-width="1.2"/><circle cx="60" cy="6" r="2.6" fill="#fff"/><circle cx="45" cy="12" r="2" fill="#fff"/><circle cx="75" cy="12" r="2" fill="#fff"/><rect x="40" y="27" width="40" height="5" rx="2" fill="${f2}" stroke="rgba(0,0,0,.35)" stroke-width="1"/>`;
  const gloss = '<path d="M38 26Q60 16 82 26Q78 44 60 48Q42 44 38 26Z" fill="#fff" opacity=".22"/>';
  // couronne de laurier : deux branches qui remontent de chaque côté de l'étoile
  const laurel = (c) => {
    let s = '<path d="M60 84C48 82 41 74 40 62M60 84C72 82 79 74 80 62" fill="none" stroke="' + c + '" stroke-width="1.8" stroke-linecap="round"/>';
    for (let i = 0; i < 5; i++) {
      const a = (250 - i * 22) * Math.PI / 180, x = 60 + 21 * Math.cos(a) * -1, y = 62 - 21 * Math.sin(a);
      const rot = -90 + i * 22 + 30;
      s += `<ellipse cx="${(120 - x).toFixed(1)}" cy="${y.toFixed(1)}" rx="5.5" ry="2.4" fill="${c}" transform="rotate(${rot} ${(120 - x).toFixed(1)} ${y.toFixed(1)})"/>`;
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="5.5" ry="2.4" fill="${c}" transform="rotate(${-rot} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    return s;
  };
  // scintillements (étoiles à 4 branches) autour des rangs élevés
  const twinkle = (x, y, r, cls) => `<path class="${cls}" d="M${x} ${y - r}Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="#fff"/>`;

  // couleurs : [clair, moyen, foncé, halo]
  const C = [
    ['#ffd9b8', '#d08850', '#7a3f16', '#ff9a4d'],
    ['#ffffff', '#c3cad6', '#6c7586', '#dfe8ff'],
    ['#fff6c2', '#ffc93a', '#a86a00', '#ffcf3a'],
    ['#f3fffd', '#8fe3dc', '#2b8f88', '#7ff7ee'],
    ['#e8f6ff', '#6ab8ff', '#1b4fd1', '#5aa8ff'],
    ['#ffd0da', '#ff3b62', '#8a0024', '#ff2e5c'],
    ['#d6ffef', '#2fe39c', '#05794a', '#2ff0a8'],
    ['#f3dcff', '#b46bff', '#4b119e', '#b05cff'],
    ['#fff1b8', '#ffb627', '#c0123a', '#ff4d6d'],
  ];

  function emblem(t, size = 40, anim = false) {
    t = Math.max(0, Math.min(8, t | 0));
    const [l, m, d, h] = C[t];
    const g = nid(), gi = nid(), gh = nid(), gc = nid(), gf = nid();
    let back = '', body = '', front = '';
    const glow = `${rad(gh, h, t >= 4 ? 0.8 : 0.55)}<circle cx="60" cy="60" r="${t >= 7 ? 58 : 52}" fill="url(#${gh})"${anim && t >= 5 ? ' class="em-pulse"' : ''}/>`;
    const shield = `${lin(g, [l, m, d])}${lin(gi, [d, m], 0, 1)}<path d="${SHIELD}" fill="url(#${g})" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/><path d="${SHIELD_IN}" fill="url(#${gi})" opacity=".55"/>`;
    if (t <= 3) {
      if (t >= 2) back += wings(m, 12);
      body = shield;
      if (t === 0) front = `<path d="${star(60, 60, 17)}" fill="${l}" stroke="${d}" stroke-width="1.5"/>`;
      if (t === 1) front = `<path d="${star(49, 60, 12)}" fill="#fff" stroke="${d}" stroke-width="1.2"/><path d="${star(71, 60, 12)}" fill="#fff" stroke="${d}" stroke-width="1.2"/>`;
      if (t === 2) front = `<path d="${star(60, 52, 13)}" fill="#fff" stroke="${d}" stroke-width="1.2"/><path d="${star(46, 70, 9)}" fill="#fff" stroke="${d}" stroke-width="1"/><path d="${star(74, 70, 9)}" fill="#fff" stroke="${d}" stroke-width="1"/>`;
      if (t === 3) front = laurel('#fff') + `<path d="${star(60, 58, 13)}" fill="#fff" stroke="${d}" stroke-width="1.2"/>`;
      front += gloss;
    } else if (t === 4) {
      // diamant taillé
      body = `${lin(g, [l, m, d], 0.4, 1)}<path d="M36 34H84L100 52L60 104L20 52Z" fill="url(#${g})" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>
        <path d="M36 34L46 52H74L84 34Z" fill="${l}" opacity=".85"/><path d="M20 52H46L60 104Z" fill="${d}" opacity=".55"/><path d="M100 52H74L60 104Z" fill="${m}" opacity=".7"/>
        <path d="M46 52H74L60 104Z" fill="${l}" opacity=".35"/><path d="M36 34L20 52H46Z" fill="#fff" opacity=".35"/><path d="M84 34L100 52H74Z" fill="${d}" opacity=".35"/>`;
      front = '<path d="M50 38L55 45" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>';
    } else if (t === 5) {
      // rubis : gemme coussin à facettes
      body = `${lin(g, [l, m, d], 0.3, 1)}<path d="M60 14L98 36V80L60 104L22 80V36Z" fill="url(#${g})" stroke="rgba(0,0,0,.5)" stroke-width="1.5"/>
        <path d="M60 30L82 43V71L60 86L38 71V43Z" fill="${m}"/><path d="M60 30L82 43L60 56L38 43Z" fill="${l}" opacity=".75"/>
        <path d="M38 43L60 56V86L38 71Z" fill="${d}" opacity=".5"/><path d="M82 43L60 56V86L82 71Z" fill="${d}" opacity=".25"/>
        <path d="M60 14L60 30M98 36L82 43M98 80L82 71M60 104V86M22 80L38 71M22 36L38 43" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/>`;
      front = '<path d="M46 40L52 37" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>';
    } else if (t === 6) {
      // émeraude : taille à degrés
      body = `${lin(g, [l, m, d], 0.3, 1)}<path d="M42 16H78L100 38V82L78 104H42L20 82V38Z" fill="url(#${g})" stroke="rgba(0,0,0,.5)" stroke-width="1.5"/>
        <path d="M46 26H74L90 42V78L74 94H46L30 78V42Z" fill="${m}" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/>
        <path d="M51 36H69L80 47V73L69 84H51L40 73V47Z" fill="${d}" opacity=".55" stroke="rgba(255,255,255,.3)" stroke-width="1.2"/>
        <path d="M42 16L46 26M78 16L74 26M100 38L90 42M100 82L90 78M78 104L74 94M42 104L46 94M20 82L30 78M20 38L30 42" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/>`;
      front = '<path d="M48 31H62" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>';
    } else {
      // maître et grand maître : blason couronné et ailé
      if (t === 8) {
        back += `${lin(gf, ['#fff3a0', '#ff8a00', '#ff1f4b'], 0, 1)}<g${anim ? ' class="em-flame"' : ''}><path d="M60 2C66 14 78 18 76 34C84 28 86 20 86 14C96 26 98 44 88 58H32C22 44 24 26 34 14C34 20 36 28 44 34C42 18 54 14 60 2Z" fill="url(#${gf})" opacity=".95"/></g>`;
      }
      back += wings(t === 8 ? '#ffcf4a' : m, 10) + wings(t === 8 ? '#ff6a3d' : l, 22);
      body = shield;
      front = `<path d="${star(60, 64, 14)}" fill="#fff" stroke="${d}" stroke-width="1.2"/>` + (t === 8 ? `<circle cx="60" cy="64" r="22" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>` : '') + gloss;
      front += `<g transform="translate(0 ${t === 8 ? 2 : 4})">${crown(t === 8 ? '#fff6c2' : l, t === 8 ? '#ffb627' : m, gc)}</g>`;
    }
    if (t >= 4 && size >= 32) front += twinkle(20, 24, 6, anim ? 'em-tw' : '') + twinkle(100, 30, 4.5, anim ? 'em-tw em-tw2' : '') + (t >= 7 ? twinkle(98, 92, 5, anim ? 'em-tw em-tw3' : '') : '');
    return `<svg class="emb" viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true">${glow}${back}${body}${front}</svg>`;
  }

  // médailles d'exploits : un dessin par exploit, contour selon le niveau (0 bronze, 1 argent, 2 or, 3 légendaire)
  const LEVELS = [
    ['#ffd2ad', '#c9783d', '#6e3510'],
    ['#ffffff', '#b9c2d0', '#5f6878'],
    ['#fff4b0', '#ffc021', '#9c6200'],
    ['#ff7ad9', '#a34dff', '#2fd4ff'],
  ];
  const ICONS = {
    first: '<path d="M54 40V74A8 8 0 1 1 48 66.3V44L74 38V66A8 8 0 1 1 68 58.3V46Z" fill="#fff"/><rect x="34" y="36" width="5" height="5" rx="1" fill="#ffd34d" transform="rotate(20 36 38)"/><rect x="80" y="74" width="5" height="5" rx="1" fill="#2fd4ff" transform="rotate(-25 82 76)"/><rect x="82" y="34" width="4" height="4" rx="1" fill="#ff5fa2"/><circle cx="36" cy="80" r="2.5" fill="#7dffb0"/>',
    win: '<path d="M44 36H76V48C76 58 69 65 60 66C51 65 44 58 44 48Z" fill="#ffd34d" stroke="#a36a00" stroke-width="1.5"/><path d="M44 40H36C36 50 40 54 46 55M76 40H84C84 50 80 54 74 55" fill="none" stroke="#ffd34d" stroke-width="3.5"/><rect x="56" y="65" width="8" height="9" fill="#ffc021"/><rect x="46" y="74" width="28" height="7" rx="2" fill="#ffd34d" stroke="#a36a00" stroke-width="1.2"/><path d="M52 40Q54 52 60 56" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7" stroke-linecap="round"/>',
    fire: '<path d="M60 30C66 42 78 46 76 62C76 74 68 82 60 82C50 82 42 74 43 62C44 54 50 50 50 42C55 47 56 52 56 56C60 50 62 42 60 30Z" fill="#ff7a1a"/><path d="M60 50C63 58 70 61 69 69C68 76 64 80 60 80C55 80 51 76 52 70C53 65 57 63 57 58C59 61 60 63 60 64C61 60 61 56 60 50Z" fill="#ffe066"/>',
    flash: '<path d="M64 28L42 64H58L54 92L78 52H62Z" fill="#ffe066" stroke="#c78a00" stroke-width="1.5" stroke-linejoin="round"/><path d="M62 34L50 56" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>',
    artist: '<rect x="50" y="30" width="20" height="34" rx="10" fill="#fff"/><path d="M53 38H67M53 44H67M53 50H67" stroke="#a9a3b8" stroke-width="1.6"/><path d="M42 54C42 66 50 72 60 72C70 72 78 66 78 54" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M60 72V84M50 86H70" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>',
    title: '<circle cx="60" cy="60" r="26" fill="#120c18" stroke="#fff" stroke-width="2"/><circle cx="60" cy="60" r="19" fill="none" stroke="#3a3248" stroke-width="1.5"/><circle cx="60" cy="60" r="13" fill="none" stroke="#3a3248" stroke-width="1.5"/><circle cx="60" cy="60" r="8" fill="#ff3ea0"/><circle cx="60" cy="60" r="2" fill="#120c18"/><path d="M42 48A22 22 0 0 1 52 39" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>',
    perfect: '<text x="60" y="71" text-anchor="middle" font-family="Poppins,system-ui,sans-serif" font-weight="900" font-size="30" fill="#fff" letter-spacing="-1">100</text><path d="M38 78Q60 86 82 78" stroke="#ff3ea0" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M40 84Q60 92 80 84" stroke="#2fd4ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    marathon: '<path d="M38 64V58C38 45 48 36 60 36C72 36 82 45 82 58V64" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><rect x="33" y="60" width="11" height="18" rx="5" fill="#fff"/><rect x="76" y="60" width="11" height="18" rx="5" fill="#fff"/><circle cx="60" cy="68" r="11" fill="#120c18" stroke="#ffd34d" stroke-width="2.5"/><path d="M60 62V68L64 71" stroke="#ffd34d" stroke-width="2.2" stroke-linecap="round" fill="none"/><rect x="57" y="53" width="6" height="4" rx="1" fill="#ffd34d"/>',
  };

  function medal(icon, level = 0, size = 56) {
    level = Math.max(0, Math.min(3, level | 0));
    const [l, m, d] = LEVELS[level];
    const r = nid(), rb = nid(), dk = nid(), hl = nid();
    const ribbon = level === 3 ? ['#ff3ea0', '#a34dff'] : [m, d];
    return `<svg class="med" viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true"><defs>
      ${lin(r, level === 3 ? ['#ffd34d', '#ff7ad9', '#a34dff', '#2fd4ff'] : [l, m, d], 1, 1)}${lin(rb, ribbon)}${lin(dk, ['#3a2652', '#140c1f'])}${rad(hl, level === 3 ? '#ff7ad9' : m, 0.55)}</defs>
      <circle cx="60" cy="58" r="58" fill="url(#${hl})"${level === 3 ? ' class="em-pulse"' : ''}/>
      <path d="M40 88L32 116L46 108L54 116L58 92Z" fill="url(#${rb})" stroke="rgba(0,0,0,.35)"/><path d="M80 88L88 116L74 108L66 116L62 92Z" fill="url(#${rb})" stroke="rgba(0,0,0,.35)"/>
      <circle cx="60" cy="58" r="44" fill="url(#${r})" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>
      <circle cx="60" cy="58" r="35" fill="url(#${dk})" stroke="rgba(0,0,0,.5)" stroke-width="1.5"/>
      <g transform="translate(0 -2)">${ICONS[icon] || ''}</g>
      <path d="M30 44Q60 6 90 44Q60 30 30 44Z" fill="#fff" opacity=".18"/>
      ${[0, 1, 2, 3].slice(0, level + 1).map(i => `<path d="${star(60 + (i - level / 2) * 9, 100, 3.6)}" fill="#fff"/>`).join('')}
    </svg>`;
  }

  window.HitArt = { emblem, medal, ICONS: Object.keys(ICONS) };
})();
