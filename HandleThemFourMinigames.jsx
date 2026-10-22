import React, { useState, useRef, useEffect } from 'react';

/* ============================================================
   HandleThem — neurovizuální trénink pro florbalisty
   One-page UI/UX demo (frontend only). 4 minihry + dashboard.
   ============================================================ */

// ---------------- DESIGN TOKENS ----------------
const T = {
  bg: '#0A0B10', panelSolid: '#14161F',
  panel: 'rgba(255,255,255,0.035)',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.15)',
  text: '#EAECEF', textDim: '#9AA0AD', textFaint: '#6A7080',
  brand1: '#FF6B4A', brand2: '#FF3D77',
  reaction: '#FF6B4A', peripheral: '#FFB020', zablesk: '#A56BFF', tracking: '#5B8DEF', ok: '#22D07A',
};
const BRAND = `linear-gradient(135deg, ${T.brand1} 0%, ${T.brand2} 100%)`;
const FIRE = BRAND; // brand gradient používaný napříč hrami
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const mix = (hex, other, amt) => { const a = parseInt(hex.slice(1), 16), b = parseInt(other.slice(1), 16); const r = Math.round(((a >> 16 & 255) * (1 - amt)) + ((b >> 16 & 255) * amt)); const g = Math.round(((a >> 8 & 255) * (1 - amt)) + ((b >> 8 & 255) * amt)); const bl = Math.round(((a & 255) * (1 - amt)) + ((b & 255) * amt)); return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`; };
const rand = (a) => a[Math.floor(Math.random() * a.length)];

// ---------------- MOCK ÚČET ----------------
const USER = { name: 'Ondra', initials: 'ON', level: 7, xp: 2340, xpNext: 3500, streak: 5, streakBest: 12, sessions: 128, timeTotal: '9h 42m', stimuli: '5 210' };
const WEEK = [{ d: 'Po', v: 42 }, { d: 'Út', v: 68 }, { d: 'St', v: 30 }, { d: 'Čt', v: 86 }, { d: 'Pá', v: 54 }, { d: 'So', v: 96 }, { d: 'Ne', v: 61 }];
const RECENT = [
  { game: 'reaction', when: 'Dnes · 9:12', dur: '4 min', detail: '88 % · 0,41 s', measured: 'voice' },
  { game: 'tracking', when: 'Včera · 18:40', dur: '6 min', detail: '92 % úspěšnost', measured: 'targets' },
  { game: 'zablesk', when: 'Po · 7:55', dur: '5 min', detail: '96 podnětů', measured: 'volume' },
  { game: 'peripheral', when: 'Ne · 20:10', dur: '3 min', detail: '72 podnětů', measured: 'volume' },
];

// ---------------- DATA HER ----------------
const COLORS = [
  { name: 'ČERVENÁ', hex: '#ff4d4d' }, { name: 'MODRÁ', hex: '#4d8bff' }, { name: 'ZELENÁ', hex: '#22d07a' },
  { name: 'ŽLUTÁ', hex: '#ffd60a' }, { name: 'ORANŽOVÁ', hex: '#ff9f1c' }, { name: 'FIALOVÁ', hex: '#b15cff' },
  { name: 'RŮŽOVÁ', hex: '#ff5fa2' }, { name: 'TYRKYSOVÁ', hex: '#27d6e6' },
];
const COMMANDS = ['OTOČKA','DŘEP','VÝSKOK','STŮJ','VLEVO','VPRAVO','DOZADU','KLEK','DOTYK','TLESK','ZRYCHLI','KLIČKA'];
const ARROWS = ['←','→','↑','↓'];

const MODE_INFO = {
  numbers: { label: 'Čísla',  task: 'Vyslov číslo nahlas' },
  colors:  { label: 'Barvy',  task: 'Pojmenuj barvu' },
  words:   { label: 'Pokyny', task: 'Proveď daný pohyb' },
  stroop:  { label: 'Stroop', task: 'Řekni BARVU písma (ignoruj slovo)' },
  arrows:  { label: 'Šipky',  task: 'Klička daným směrem' },
};
const GAMES = {
  reaction:   { idx: '01', name: 'REAKCE',     tag: 'Rychlá reakce na střídající se podněty',  skill: 'Reakce • přepínání pozornosti', accent: T.reaction },
  peripheral: { idx: '02', name: 'PERIFERIE',  tag: 'Hlava dole na míčku, vnímej celé hřiště', skill: 'Periferní vidění • přehled',     accent: T.peripheral },
  zablesk:    { idx: '03', name: 'ZÁBLESK',    tag: 'Zachyť a zapamatuj si, co problikne',     skill: 'Rozpoznání • paměťový rozsah',   accent: T.zablesk },
  tracking:   { idx: '04', name: 'SLED',       tag: 'Udrž v hlavě více pohyblivých míčků',     skill: 'Sledování objektů • přehled',    accent: T.tracking },
};
const HOWTO = {
  reaction: 'Na obrazovce bliká jeden podnět. U dribblingu hlavou nahoru hned reaguj — vyslov číslo/barvu nebo proveď pokyn.',
  peripheral: 'Oči nech pevně na středovém křížku (jako na míčku). Co blikne v okraji, pojmenuj — aniž bys hnul očima.',
  zablesk: 'Krátce problikne několik znaků najednou. Zapamatuj si je a po zhasnutí je vyjmenuj nahlas. Trénuje rychlé rozpoznání a paměťový rozsah — jako čtení hry na jeden pohled.',
  tracking: 'Zapamatuj si zvýrazněné míčky. Pak se všechny rozpohybují stejně — sleduj je očima. Po zastavení označ ty správné.',
};
function defaultsFor(g) {
  if (g === 'reaction')   return { modes: ['numbers', 'colors'], diff: 'med', speed: 1.4, duration: 60, gap: 0, randomPos: false, sound: false, progressive: false, voice: false };
  if (g === 'peripheral') return { type: 'colors', diff: 'med', speed: 1.6, flash: 0.40, spread: 'far', duration: 60, sound: true, voice: false };
  if (g === 'zablesk')    return { type: 'numbers', diff: 'med', count: 4, flash: 0.38, speed: 2.5, duration: 60, sound: true, voice: false };
  if (g === 'tracking')   return { difficulty: 'med', rounds: 5 };
}

function makeReactionStim(active, prevKey) {
  let s, key, guard = 0;
  do {
    const type = rand(active);
    if (type === 'numbers') { const n = 1 + Math.floor(Math.random() * 99); s = { type, text: String(n), color: '#fff2e8', glow: T.brand1 }; key = 'n' + n; }
    else if (type === 'colors') { const c = rand(COLORS); s = { type, circle: c.hex }; key = 'c' + c.hex; }
    else if (type === 'words') { const w = rand(COMMANDS); s = { type, text: w, color: '#fff2e8', glow: T.brand1 }; key = 'w' + w; }
    else if (type === 'stroop') { const word = rand(COLORS); let ink = rand(COLORS), g = 0; while (ink.name === word.name && g < 12) { ink = rand(COLORS); g++; } s = { type, text: word.name, color: ink.hex, glow: ink.hex }; key = 's' + word.name + ink.hex; }
    else { const a = rand(ARROWS); s = { type, text: a, color: '#ffcf9c', glow: T.brand1 }; key = 'a' + a; }
    guard++;
  } while (key === prevKey && guard < 6);
  return { ...s, key };
}
const PERI_FAR  = [{left:8,top:12},{left:50,top:8},{left:92,top:12},{left:92,top:50},{left:92,top:88},{left:50,top:92},{left:8,top:88},{left:8,top:50}];
const PERI_NEAR = [{left:26,top:28},{left:50,top:22},{left:74,top:28},{left:78,top:50},{left:74,top:72},{left:50,top:78},{left:26,top:72},{left:22,top:50}];

const reactionConfig = {
  generate(prevKey, s) { const st = makeReactionStim(s.modes, prevKey); if (s.randomPos) st.pos = { left: 14 + Math.random() * 72, top: 20 + Math.random() * 60 }; return st; },
  centerLayer: null,
  showMs: (s, el) => { let ms = s.speed * 1000; if (s.progressive) { const steps = Math.floor(el / 15000); ms = Math.max(450, ms - steps * 150); } return ms; },
  cycleMs: (s, el) => reactionConfig.showMs(s, el) + s.gap * 1000,
  legend: (s) => s.modes.map((m) => MODE_INFO[m].task),
};
const peripheralConfig = {
  generate(prevKey, s) {
    const pos = rand(s.spread === 'near' ? PERI_NEAR : PERI_FAR);
    let st;
    if (s.type === 'colors') st = { circle: rand(COLORS).hex, size: 'peri' };
    else if (s.type === 'arrows') st = { text: rand(ARROWS), color: '#ffcf9c', glow: T.brand1, size: 'peri' };
    else { const n = 1 + Math.floor(Math.random() * 9); st = { text: String(n), color: '#fff2e8', glow: T.brand1, size: 'peri' }; }
    st.pos = pos; st.key = (st.circle || st.text) + pos.left + '_' + pos.top + Math.random();
    return st;
  },
  centerLayer: () => <FixationCross />,
  showMs: (s) => s.flash * 1000,
  cycleMs: (s) => s.speed * 1000,
  legend: () => ['Dívej se stále na střed (+)', 'Pojmenuj podnět, který blikne v okraji — očima nehni'],
};
const zablescConfig = {
  generate(prevKey, s) {
    const items = [];
    for (let i = 0; i < s.count; i++) {
      if (s.type === 'colors') items.push({ hex: rand(COLORS).hex });
      else items.push({ text: String(1 + Math.floor(Math.random() * 9)), color: '#fff2e8', glow: T.zablesk });
    }
    return { cluster: items, key: 'z' + Math.random() };
  },
  centerLayer: null,
  showMs: (s) => s.flash * 1000,
  cycleMs: (s) => s.speed * 1000,
  legend: () => ['Znaky jen krátce probliknou', 'Zapamatuj si je a po zhasnutí je vyjmenuj (nahlas)'],
};

// ---------------- IKONY ----------------
function GameIcon({ game, size = 28, color }) {
  const c = color || GAMES[game].accent;
  const common = { width: size, height: size, viewBox: '0 0 32 32', fill: 'none', stroke: c, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (game === 'reaction') return <svg {...common} fill={c} stroke="none"><path d="M18 3 L7 18 h6 l-2 11 12-16 h-7 z" /></svg>;
  if (game === 'peripheral') return (
    <svg {...common}>
      <line x1="16" y1="11" x2="16" y2="21" /><line x1="11" y1="16" x2="21" y2="16" />
      <circle cx="5" cy="5" r="2" fill={c} stroke="none" /><circle cx="27" cy="5" r="2" fill={c} stroke="none" />
      <circle cx="5" cy="27" r="2" fill={c} stroke="none" /><circle cx="27" cy="27" r="2" fill={c} stroke="none" />
    </svg>
  );
  if (game === 'zablesk') return (
    <svg {...common}>
      <circle cx="16" cy="16" r="2.6" fill={c} stroke="none" />
      <path d="M16 4v5M16 23v5M4 16h5M23 16h5M8 8l3.2 3.2M20.8 20.8 24 24M24 8l-3.2 3.2M8 24l3.2-3.2" />
    </svg>
  );
  return (
    <svg {...common}>
      <path d="M7 21 Q16 5 26 21" strokeDasharray="3 3" opacity="0.55" />
      <circle cx="7" cy="21" r="3.2" fill={c} stroke="none" />
      <circle cx="18" cy="10" r="3" fill={c} stroke="none" opacity="0.45" />
      <circle cx="26" cy="21" r="3" fill={c} stroke="none" opacity="0.45" />
    </svg>
  );
}
function Icon({ name, color = T.brand1, size = 15 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', style: { flexShrink: 0 } };
  const M = {
    grid:   <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    gauge:  <><path d="M4 17a8 8 0 0 1 16 0" /><path d="M12 17l4.5-4.5" /></>,
    clock:  <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    timer:  <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 2h5" /></>,
    target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" /></>,
    flash:  <path d="M13 2 5 13h5l-1 9 9-12h-5z" fill={color} stroke="none" />,
    flame:  <path d="M12 3s5 3.5 5 8.5a5 5 0 0 1-10 0c0-1.6.8-2.8.8-2.8 0 1 .9 1.8 1.7 1.8 0-3 2.5-4.5 2.5-7.5z" fill={color} stroke="none" />,
    sound:  <><path d="M4 9v6h4l5 4V5L8 9H4z" fill={color} stroke="none" /><path d="M17 8a5 5 0 0 1 0 8" /></>,
    sliders:<><path d="M4 8h9M19 8h1M4 16h3M13 16h7" /><circle cx="15" cy="8" r="2.4" /><circle cx="9" cy="16" r="2.4" /></>,
    shuffle:<path d="M3 7h4l9 10h4M3 17h4l2.5-2.8M16 5l4 2-4 2M16 19l4-2" />,
    refresh:<><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v4h-4" /></>,
    percent:<><path d="M5 19 19 5" /><circle cx="7" cy="7" r="2.2" /><circle cx="17" cy="17" r="2.2" /></>,
    activity:<path d="M3 12h4l3 8 4-16 3 8h4" />,
    trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0V4z" /><path d="M6 4H4v1.5A3 3 0 0 0 7 8.5M18 4h2v1.5a3 3 0 0 1-3 3M9.5 15h5M12 12v3M9 20h6M10.5 20l.4-3M13.5 20l-.4-3" /></>,
    globe:  <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 2.4 14.6 0 17M12 3.5c-2.4 2.4-2.4 14.6 0 17" /></>,
    moon:   <path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z" />,
    logout: <><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
    chevron:<path d="M6 9l6 6 6-6" />,
    mic:    <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></>,
    layers: <><path d="M12 3 3 8l9 5 9-5-9-5z" /><path d="M4 13l8 4 8-4" /></>,
    check:  <path d="M4 12l5 5 11-11" />,
    bell:   <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  };
  return <svg {...p}>{M[name]}</svg>;
}
function InfinityMark({ size = 30, glow = true }) {
  const w = size, h = size * 0.62;
  return (
    <svg width={w} height={h} viewBox="0 0 40 24" fill="none" style={{ filter: glow ? `drop-shadow(0 0 8px ${hexA(T.brand2, .5)})` : 'none' }}>
      <defs><linearGradient id="htg" x1="0" y1="0" x2="40" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor={T.brand1} /><stop offset="1" stopColor={T.brand2} /></linearGradient></defs>
      <path d="M20 12 C20 5 4 5 4 12 C4 19 20 19 20 12 C20 5 36 5 36 12 C36 19 20 19 20 12 Z" stroke="url(#htg)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
function Wordmark({ size = 19 }) {
  return (
    <span style={{ fontWeight: 800, fontSize: size, letterSpacing: -0.4, color: T.text }}>
      Handle<span style={{ background: BRAND, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Them</span>
    </span>
  );
}

// ---------------- HERNÍ VIZUÁLY ----------------
function Disc({ hex, size = 'big', label, labelColor }) {
  const d = size === 'big' ? 'clamp(150px,34vmin,440px)' : 'clamp(80px,13vmin,150px)';
  return (
    <div style={{ width: d, height: d, borderRadius: '50%', background: hex, display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 0 60px ${hex}, 0 0 130px ${hex}aa, inset 0 0 60px rgba(255,255,255,.18)` }}>
      {label && <span style={{ fontSize: 'clamp(1.6rem,7vmin,4rem)', fontWeight: 900, letterSpacing: 1, color: labelColor || '#000' }}>{label}</span>}
    </div>
  );
}
function BigText({ text, color, glow, size = 'big' }) {
  const fs = size === 'big' ? 'clamp(4rem,24vmin,22rem)' : 'clamp(2.4rem,11vmin,7rem)';
  return <div style={{ fontSize: fs, fontWeight: 900, lineHeight: 1, color, textShadow: `0 0 40px ${glow}, 0 0 90px ${glow}88` }}>{text}</div>;
}
function FixationCross() {
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 54, textAlign: 'center' }}>
      <div style={{ fontSize: 'clamp(2.4rem,8vmin,4.5rem)', color: T.brand1, fontWeight: 300, textShadow: `0 0 26px ${T.brand1}` }}>+</div>
    </div>
  );
}
function renderStim(st) {
  if (st.cluster) {
    const n = st.cluster.length;
    const fs = `clamp(1.8rem, ${Math.max(6, 15 / n)}vmin, ${Math.max(3, 9 - n * 0.6)}rem)`;
    const ds = `clamp(46px, ${Math.max(8, 22 / n)}vmin, ${Math.max(66, 150 - n * 14)}px)`;
    return (
      <div style={{ display: 'flex', gap: 'clamp(12px,4vmin,34px)', alignItems: 'center', justifyContent: 'center' }}>
        {st.cluster.map((it, i) => it.hex
          ? <div key={i} style={{ width: ds, height: ds, borderRadius: '50%', background: it.hex, boxShadow: `0 0 30px ${it.hex}, inset 0 0 24px rgba(255,255,255,.18)` }} />
          : <div key={i} style={{ fontSize: fs, fontWeight: 900, color: it.color, textShadow: `0 0 30px ${it.glow}` }}>{it.text}</div>)}
      </div>
    );
  }
  if (st.circle) return <Disc hex={st.circle} size={st.size || 'big'} label={st.label} labelColor={st.labelColor} />;
  return <BigText text={st.text} color={st.color} glow={st.glow} size={st.size || 'big'} />;
}

function StyleTag() {
  return <style dangerouslySetInnerHTML={{ __html: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *{box-sizing:border-box;}
    .ht-root{font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;}
    @keyframes stimIn{0%{opacity:0;transform:translate(-50%,-50%) scale(.82);}100%{opacity:1;transform:translate(-50%,-50%) scale(1);}}
    @keyframes popIn{0%{opacity:0;transform:scale(.6);}60%{opacity:1;transform:scale(1.12);}100%{transform:scale(1);}}
    @keyframes drift{0%,100%{transform:translate(0,0);}50%{transform:translate(40px,-30px);}}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes pulse{0%,100%{opacity:.35;}50%{opacity:.85;}}
    @keyframes swapIn{0%{opacity:0;transform:scale(.85);}100%{opacity:1;transform:scale(1);}}
    @keyframes dialIn{0%{opacity:0;transform:scale(.92);}100%{opacity:1;transform:scale(1);}}
    .cockpit{display:grid;gap:16px;grid-template-columns:1fr;grid-template-areas:"dial" "left" "right";}
    .area-left{grid-area:left;} .area-dial{grid-area:dial;} .area-right{grid-area:right;}
    @media(min-width:1000px){.cockpit{grid-template-columns:240px minmax(0,1fr) 280px;grid-template-areas:"left dial right";align-items:start;}}
    @keyframes rise{0%{opacity:0;transform:translateY(10px);}100%{opacity:1;transform:translateY(0);}}
    .rise{animation:rise .5s ease both;}
    .fire-range{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:6px;background:rgba(255,255,255,.09);outline:none;}
    .fire-range::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.45);border:none;}
    .fire-range::-moz-range-thumb{width:20px;height:20px;border:none;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.45);}
    .gbtn{transition:filter .15s, transform .15s, background .15s, border-color .15s;} .gbtn:hover{filter:brightness(1.08);transform:translateY(-1px);} .gbtn:active{transform:translateY(0);}
    .navlink{position:relative;color:${T.textDim};font-size:14px;font-weight:500;cursor:pointer;padding:6px 2px;transition:color .15s;} .navlink:hover{color:${T.text};}
    .navlink.active{color:${T.text};} .navlink.active::after{content:'';position:absolute;left:0;right:0;bottom:-6px;height:2px;border-radius:2px;background:${BRAND};}
    .softcard{transition:transform .18s, border-color .18s, background .18s;} .softcard:hover{transform:translateY(-2px);border-color:${T.borderStrong};}
    @media(max-width:860px){.ht-navlinks{display:none !important;} .ht-usermeta{display:none !important;}}
  `}} />;
}
function Bg() {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: `radial-gradient(circle at 50% -10%, #15121c 0%, ${T.bg} 55%, #06060a 100%)`, zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '-12%', left: '-8%', width: 520, height: 520, background: `radial-gradient(circle, ${hexA(T.brand1, .16)}, transparent 70%)`, filter: 'blur(30px)', animation: 'drift 16s ease-in-out infinite', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-14%', right: '-10%', width: 560, height: 560, background: `radial-gradient(circle, ${hexA(T.brand2, .14)}, transparent 70%)`, filter: 'blur(34px)', animation: 'drift 20s ease-in-out infinite reverse', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '40%', right: '30%', width: 320, height: 320, background: `radial-gradient(circle, ${hexA(T.tracking, .08)}, transparent 70%)`, filter: 'blur(30px)', zIndex: 0 }} />
    </>
  );
}

// ---------------- STYLY ----------------
const card = { background: T.panel, border: `1px solid ${T.border}`, borderRadius: 20, padding: '20px 22px', backdropFilter: 'blur(10px)' };
const sectionTitle = { fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: T.textDim, fontWeight: 700, marginBottom: 12 };
const chip = (a, accent = T.brand1) => ({ padding: '10px 16px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all .15s', userSelect: 'none',
  border: a ? '1px solid transparent' : `1px solid ${T.border}`, background: a ? BRAND : 'rgba(255,255,255,0.02)', color: a ? '#160d0c' : T.textDim, boxShadow: a ? `0 6px 20px ${hexA(T.brand2, .35)}` : 'none' });
const bigBtn = { border: 'none', cursor: 'pointer', color: '#170d0c', fontWeight: 800, fontSize: 17, letterSpacing: .3, padding: '15px 26px', borderRadius: 14, background: BRAND, boxShadow: `0 10px 30px ${hexA(T.brand2, .4)}`, width: '100%' };
const ghostBtn = { border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)', color: T.text, fontWeight: 600, fontSize: 14, padding: '11px 18px', borderRadius: 12, cursor: 'pointer' };

function SecTitle({ icon, color = T.brand1, children }) {
  return <div style={{ ...sectionTitle, color, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={icon} color={color} size={15} />{children}</div>;
}
function Slider({ label, value, suffix, min, max, step, onChange, hint }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: T.text }}>
        <span>{label}</span><span style={{ color: T.brand1, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{value}{suffix}</span>
      </div>
      <input className="fire-range" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      {hint && <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}
function Toggle({ label, hint, on, onClick }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={onClick}>
      <div>
        <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 2 }}>{hint}</div>
      </div>
      <div style={{ width: 48, height: 27, borderRadius: 999, flexShrink: 0, position: 'relative', transition: 'all .18s',
        background: on ? BRAND : 'rgba(255,255,255,0.1)', boxShadow: on ? `0 0 14px ${hexA(T.brand2, .5)}` : 'none' }}>
        <div style={{ position: 'absolute', top: 3, left: on ? 24 : 3, width: 21, height: 21, borderRadius: '50%', background: '#fff', transition: 'all .18s' }} />
      </div>
    </div>
  );
}
const fmt = (ms) => { const t = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

// ============================ NAVBAR ============================
function Navbar({ onHome }) {
  const noop = (e) => e.preventDefault();
  const xpFrac = USER.xp / USER.xpNext;
  const R = 20, C = 2 * Math.PI * R;
  const iconBtn = { width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, cursor: 'pointer' };
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 64, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(14px,4vw,28px)', background: 'rgba(10,11,16,0.72)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${T.border}` }}>
      <div className="gbtn" onClick={onHome} style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }}>
        <InfinityMark size={34} /><Wordmark size={19} />
      </div>

      <div className="ht-navlinks" style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
        <a className="navlink active" href="#" onClick={noop}>Trénink</a>
        <a className="navlink" href="#" onClick={noop}>Statistiky</a>
        <a className="navlink" href="#" onClick={noop}>Žebříček</a>
        <a className="navlink" href="#" onClick={noop}>O tréninku</a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="gbtn" onClick={noop} style={{ ...iconBtn, width: 'auto', gap: 6, padding: '0 12px', color: T.textDim, fontSize: 13, fontWeight: 600 }}>
          <Icon name="globe" color={T.textDim} size={16} /> CZ <Icon name="chevron" color={T.textDim} size={13} />
        </button>
        <button className="gbtn" onClick={noop} style={iconBtn}><Icon name="moon" color={T.textDim} size={17} /></button>
        <div style={{ width: 1, height: 26, background: T.border, margin: '0 2px' }} />
        <div className="ht-usermeta" style={{ textAlign: 'right', lineHeight: 1.2 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{USER.name}</div>
          <div style={{ fontSize: 11, color: T.textFaint }}>Level {USER.level}</div>
        </div>
        <div style={{ position: 'relative', width: 44, height: 44 }}>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <defs><linearGradient id="xpg" x1="0" y1="0" x2="44" y2="44"><stop stopColor={T.brand1} /><stop offset="1" stopColor={T.brand2} /></linearGradient></defs>
            <circle cx="22" cy="22" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
            <circle cx="22" cy="22" r={R} fill="none" stroke="url(#xpg)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - xpFrac)} />
          </svg>
          <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#170d0c' }}>{USER.initials}</div>
        </div>
        <button className="gbtn" onClick={noop} style={iconBtn} title="Odhlásit"><Icon name="logout" color={T.textDim} size={17} /></button>
      </div>
    </nav>
  );
}

function Footer() {
  const noop = (e) => e.preventDefault();
  return (
    <footer style={{ position: 'relative', zIndex: 1, borderTop: `1px solid ${T.border}`, marginTop: 48, padding: '26px clamp(14px,4vw,28px)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <InfinityMark size={28} glow={false} />
        <div>
          <Wordmark size={15} />
          <div style={{ fontSize: 11.5, color: T.textFaint }}>Neurovizuální trénink pro florbalisty</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20, fontSize: 13, color: T.textDim }}>
        <a href="#" onClick={noop} style={{ color: T.textDim, textDecoration: 'none' }}>Podmínky</a>
        <a href="#" onClick={noop} style={{ color: T.textDim, textDecoration: 'none' }}>Soukromí</a>
        <a href="#" onClick={noop} style={{ color: T.textDim, textDecoration: 'none' }}>Kontakt</a>
      </div>
      <div style={{ fontSize: 12.5, color: T.textFaint }}>© 2026 HandleThem</div>
    </footer>
  );
}

// ============================ DASHBOARD ============================
function StatCard({ icon, label, value, sub, accent = T.brand1 }) {
  return (
    <div className="softcard" style={{ ...card, flex: '1 1 150px', minWidth: 150, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textDim, fontSize: 11.5, fontWeight: 600, letterSpacing: .4, textTransform: 'uppercase' }}>
        <Icon name={icon} color={accent} size={15} />{label}
      </div>
      <div style={{ fontSize: 27, fontWeight: 800, marginTop: 8, letterSpacing: -.5, color: T.text }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.textFaint, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function LevelCard() {
  const frac = USER.xp / USER.xpNext;
  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...sectionTitle, margin: 0 }}>Úroveň</span><Icon name="trophy" color={T.peripheral} size={17} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
        <div style={{ fontSize: 26, fontWeight: 800, background: BRAND, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Level {USER.level}</div>
        <div style={{ fontSize: 12.5, color: T.textFaint }}>{USER.xp} / {USER.xpNext} XP</div>
      </div>
      <div style={{ height: 9, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginTop: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${frac * 100}%`, background: BRAND, borderRadius: 999, boxShadow: `0 0 14px ${hexA(T.brand2, .6)}` }} />
      </div>
      <div style={{ fontSize: 12, color: T.textFaint, marginTop: 8 }}>Do dalšího levelu zbývá {USER.xpNext - USER.xp} XP</div>
    </div>
  );
}
function RecentCard() {
  const mIcon = (m) => (m === 'voice' ? 'mic' : m === 'targets' ? 'target' : 'layers');
  const mColor = (m) => (m === 'volume' ? T.textFaint : T.ok);
  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ ...sectionTitle, margin: 0 }}>Poslední tréninky</span>
        <span style={{ fontSize: 12, color: T.brand1, cursor: 'pointer' }}>Vše</span>
      </div>
      {RECENT.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < RECENT.length - 1 ? `1px solid ${T.border}` : 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: hexA(GAMES[r.game].accent, .12), border: `1px solid ${hexA(GAMES[r.game].accent, .3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GameIcon game={r.game} size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{GAMES[r.game].name}</div>
            <div style={{ fontSize: 11.5, color: T.textFaint }}>{r.when} · {r.dur}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: mColor(r.measured), fontWeight: 600, whiteSpace: 'nowrap' }}>
            <Icon name={mIcon(r.measured)} color={mColor(r.measured)} size={12} />{r.detail}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11, color: T.textFaint, marginTop: 10, lineHeight: 1.5, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <Icon name="mic" color={T.textFaint} size={12} />
        <span>Přesnost a reakci měříme jen u interaktivních režimů — Sled (dotyk) a hlasový režim (beta). Ostatní ukazují objem a čas.</span>
      </div>
    </div>
  );
}
function WeeklyCard() {
  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...sectionTitle, margin: 0 }}>Tento týden</span>
        <span style={{ fontSize: 12, color: T.textFaint }}>min / den</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96, marginTop: 14 }}>
        {WEEK.map((w, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', height: `${w.v}%`, borderRadius: 6, background: i === 5 ? BRAND : 'rgba(255,255,255,0.1)', boxShadow: i === 5 ? `0 0 14px ${hexA(T.brand2, .5)}` : 'none', transition: 'height .3s' }} />
            <span style={{ fontSize: 10.5, color: T.textFaint }}>{w.d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// kruhový výběr tréninku
function annular(a0d, a1d, R, r) {
  const cx = 100, cy = 100, a0 = a0d * Math.PI / 180, a1 = a1d * Math.PI / 180;
  const P = (a, rad) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  const [x0o, y0o] = P(a0, R), [x1o, y1o] = P(a1, R), [x1i, y1i] = P(a1, r), [x0i, y0i] = P(a0, r);
  const large = (a1d - a0d) > 180 ? 1 : 0;
  return `M ${x0o} ${y0o} A ${R} ${R} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${r} ${r} 0 ${large} 0 ${x0i} ${y0i} Z`;
}
const QUAD = [
  { key: 'reaction',   a0: 180, a1: 270, lx: 25, ly: 25 },
  { key: 'peripheral', a0: 270, a1: 360, lx: 75, ly: 25 },
  { key: 'zablesk',    a0: 0,   a1: 90,  lx: 75, ly: 75 },
  { key: 'tracking',   a0: 90,  a1: 180, lx: 25, ly: 75 },
];
function Dial({ onPick, big }) {
  const [hover, setHover] = useState(null);
  const box = big ? 'min(92vw, 500px)' : 'min(78vw, 380px)';
  const fg = hover ? GAMES[hover] : null;
  const RIN = 40, ROUT = 96;
  const ease = 'cubic-bezier(.34,1.56,.64,1)';

  return (
    <div>
      <div style={{ position: 'relative', width: box, height: box, margin: '0 auto', animation: 'dialIn .5s cubic-bezier(.16,1,.3,1) both' }}>
        <div style={{ position: 'absolute', inset: '2%', borderRadius: '50%', pointerEvents: 'none', animation: 'spin 34s linear infinite' }}>
          <span style={{ position: 'absolute', left: '50%', top: 0, transform: 'translate(-50%,-50%)', width: 9, height: 9, borderRadius: '50%', background: T.brand1, boxShadow: `0 0 12px ${T.brand1}` }} />
          <span style={{ position: 'absolute', left: '50%', top: '100%', transform: 'translate(-50%,-50%)', width: 6, height: 6, borderRadius: '50%', background: T.brand2, boxShadow: `0 0 10px ${T.brand2}` }} />
        </div>
        <div style={{ position: 'absolute', inset: '-2%', borderRadius: '50%', pointerEvents: 'none', animation: 'spin 60s linear infinite reverse' }}>
          <span style={{ position: 'absolute', left: '50%', top: 0, transform: 'translate(-50%,-50%)', width: 4, height: 4, borderRadius: '50%', background: hexA('#ffffff', .5) }} />
        </div>

        <svg viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            {Object.keys(GAMES).map((k) => {
              const a = GAMES[k].accent;
              return (
                <linearGradient key={k} id={`w-${k}`} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                  <stop stopColor={mix(a, '#ffffff', 0.12)} /><stop offset="1" stopColor={mix(a, '#000000', 0.22)} />
                </linearGradient>
              );
            })}
          </defs>
          {QUAD.map((q) => {
            const g = GAMES[q.key], on = hover === q.key, dim = hover && !on;
            return (
              <path key={q.key} d={annular(q.a0 + 3.2, q.a1 - 3.2, ROUT, RIN)} fill={`url(#w-${q.key})`}
                stroke={hexA('#ffffff', on ? 0.28 : 0.07)} strokeWidth={on ? 1.4 : 1}
                onMouseEnter={() => setHover(q.key)} onMouseLeave={() => setHover((h) => (h === q.key ? null : h))} onClick={() => onPick(q.key)}
                style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: on ? 'scale(1.05)' : 'scale(1)', opacity: dim ? 0.4 : 1, cursor: 'pointer',
                  filter: on ? `drop-shadow(0 0 13px ${hexA(g.accent, .7)})` : 'none', transition: `transform .28s ${ease}, opacity .25s ease, filter .2s ease` }} />
            );
          })}
          <circle cx="100" cy="100" r={RIN + 0.5} fill={T.bg} />
          <circle cx="100" cy="100" r={RIN} fill={T.panelSolid} stroke={T.border} strokeWidth="1" />
          <circle cx="100" cy="100" r={RIN - 1} fill="none" stroke={hexA(fg ? fg.accent : T.brand1, .6)} strokeWidth="1.4" style={{ animation: 'pulse 3s ease-in-out infinite' }} />
        </svg>

        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '34%', textAlign: 'center', pointerEvents: 'none' }}>
          <div key={hover || 'default'} style={{ animation: 'swapIn .18s ease both' }}>
            {fg ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><GameIcon game={hover} size={big ? 26 : 22} color={fg.accent} /></div>
                <div style={{ fontSize: 'clamp(.7rem,2.4vw,.95rem)', fontWeight: 800, color: fg.accent }}>{fg.name}</div>
                <div style={{ fontSize: 'clamp(.5rem,1.7vw,.6rem)', color: T.textDim, marginTop: 3, letterSpacing: 1.5 }}>SPUSTIT ›</div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center' }}><InfinityMark size={big ? 34 : 30} /></div>
                <div style={{ fontSize: 'clamp(.5rem,1.8vw,.62rem)', letterSpacing: 2, color: T.textDim, marginTop: 6 }}>VYBER TRÉNINK</div>
              </>
            )}
          </div>
        </div>

        {QUAD.map((q) => {
          const g = GAMES[q.key], on = hover === q.key, dim = hover && !on;
          const tc = idealText(g.accent);
          return (
            <div key={q.key} style={{ position: 'absolute', left: `${q.lx}%`, top: `${q.ly}%`, transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transform: on ? 'scale(1.14)' : 'scale(1)', opacity: dim ? 0.55 : 1, transition: `transform .28s ${ease}, opacity .25s ease` }}>
                <GameIcon game={q.key} size={big ? 27 : 22} color={tc} />
                <div style={{ fontSize: big ? 'clamp(.74rem,2.5vw,1rem)' : 'clamp(.64rem,2.3vw,.84rem)', fontWeight: 800, color: tc, textShadow: '0 1px 4px rgba(0,0,0,.35)' }}>{g.name}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, minHeight: 74, display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: `1px solid ${fg ? hexA(fg.accent, .35) : T.border}`, transition: 'border-color .2s' }}>
        <div key={hover || 'hint'} style={{ animation: 'swapIn .18s ease both', display: 'flex', alignItems: 'center', gap: 14, width: fg ? 'auto' : '100%' }}>
          {fg ? (
            <>
              <div style={{ flexShrink: 0 }}><GameIcon game={hover} size={34} color={fg.accent} /></div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: fg.accent }}>{fg.name}</div>
                <div style={{ fontSize: 12.5, color: T.textDim, marginTop: 2, lineHeight: 1.5 }}>{HOWTO[hover]}</div>
              </div>
            </>
          ) : <div style={{ fontSize: 13.5, color: T.textFaint, textAlign: 'center', width: '100%' }}>Najeď na výseč pro popis · klikni pro výběr tréninku</div>}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ onPick }) {
  return (
    <div className="rise" style={{ maxWidth: 1180, margin: '0 auto', padding: '6px clamp(14px,4vw,28px) 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem,4vw,2rem)', fontWeight: 800, letterSpacing: -.6, color: T.text }}>Ahoj, {USER.name}</h1>
          <p style={{ margin: '4px 0 0', color: T.textDim, fontSize: 14 }}>Vyber si dnešní trénink a jdeme na to.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 12, background: hexA(T.brand1, .1), border: `1px solid ${hexA(T.brand1, .3)}` }}>
          <Icon name="flame" color={T.brand1} size={17} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{USER.streak} dní v řadě</span>
          <span style={{ fontSize: 12, color: T.textFaint }}>· nejdéle {USER.streakBest}</span>
        </div>
      </div>

      <div className="cockpit">
        <div className="area-left" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatTile icon="timer" label="Čas celkem" value={USER.timeTotal} accent={T.brand1} />
          <StatTile icon="activity" label="Tréninků" value={USER.sessions} accent={T.tracking} />
          <StatTile icon="flame" label="Série" value={`${USER.streak} dní`} accent={T.peripheral} />
          <StatTile icon="layers" label="Podnětů" value={USER.stimuli} accent={T.zablesk} />
          <LevelCard />
        </div>

        <div className="area-dial" style={{ ...card, padding: 'clamp(18px,3vw,30px)', borderColor: hexA(T.brand1, .16), background: `radial-gradient(120% 90% at 50% -20%, ${hexA(T.brand1, .06)}, transparent 60%), ${T.panel}`, alignSelf: 'stretch' }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 'clamp(1.25rem,3.4vw,1.7rem)', fontWeight: 800, letterSpacing: -.4, color: T.text }}>Vyber trénink</div>
            <div style={{ fontSize: 13, color: T.textDim, marginTop: 3 }}>4 neurovizuální minihry — klikni na výseč</div>
          </div>
          <Dial onPick={onPick} big />
        </div>

        <div className="area-right" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <RecentCard />
          <WeeklyCard />
        </div>
      </div>
    </div>
  );
}

// ---------------- MODERN UI HELPERS ----------------
function idealText(hex) { const n = parseInt(hex.slice(1), 16); const L = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; return L > 0.62 ? '#160d0c' : '#fff'; }

function Segmented({ options, value, onChange, accent = T.brand1 }) {
  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  const n = options.length;
  const txt = idealText(accent);
  return (
    <div style={{ position: 'relative', display: 'flex', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, borderRadius: 12, padding: 4 }}>
      <div style={{ position: 'absolute', top: 4, bottom: 4, left: `calc(${(idx * 100) / n}% + 4px)`, width: `calc(${100 / n}% - 8px)`, borderRadius: 9, background: accent, boxShadow: `0 4px 14px ${hexA(accent, .45)}`, transition: 'left .24s cubic-bezier(.4,0,.2,1)' }} />
      {options.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{ position: 'relative', zIndex: 1, flex: 1, background: 'transparent', border: 'none', cursor: 'pointer', padding: '9px 4px', fontSize: 13.5, fontWeight: 700, color: o.key === value ? txt : T.textDim, transition: 'color .2s' }}>{o.label}</button>
      ))}
    </div>
  );
}

function Choice({ active, onClick, accent = T.brand1, children }) {
  return (
    <button onClick={onClick} className="gbtn" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 11, cursor: 'pointer', fontWeight: 700, fontSize: 13.5,
      border: active ? `1px solid ${hexA(accent, .6)}` : `1px solid ${T.border}`, background: active ? hexA(accent, .14) : 'rgba(255,255,255,0.02)', color: active ? T.text : T.textDim }}>
      {active && <Icon name="check" color={accent} size={13} />}{children}
    </button>
  );
}

function MSlider({ label, value, display, suffix, min, max, step, onChange, accent = T.brand1, hint }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
        <span style={{ fontSize: 13, color: T.text }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: accent, background: hexA(accent, .13), padding: '2px 9px', borderRadius: 8 }}>{display}{suffix}</span>
      </div>
      <input className="fire-range" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ background: `linear-gradient(90deg, ${accent} ${pct}%, rgba(255,255,255,0.09) ${pct}%)` }} />
      {hint && <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 7 }}>{hint}</div>}
    </div>
  );
}

function StatTile({ icon, label, value, accent = T.brand1 }) {
  return (
    <div className="softcard" style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hexA(accent, .12), border: `1px solid ${hexA(accent, .3)}` }}><Icon name={icon} color={accent} size={18} /></div>
      <div>
        <div style={{ fontSize: 11, color: T.textDim, textTransform: 'uppercase', letterSpacing: .3, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: -.4, marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function arcOnly(a0d, a1d, R) {
  const cx = 100, cy = 100, a0 = a0d * Math.PI / 180, a1 = a1d * Math.PI / 180;
  const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0), x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
  const large = (a1d - a0d) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`;
}

const PRESETS = {
  reaction:   { easy: { speed: 2.0, gap: 0.2, randomPos: false, progressive: false }, med: { speed: 1.4, gap: 0.0, randomPos: false, progressive: false }, hard: { speed: 0.9, gap: 0.0, randomPos: true, progressive: true } },
  peripheral: { easy: { spread: 'near', flash: 0.55, speed: 2.0 }, med: { spread: 'far', flash: 0.40, speed: 1.6 }, hard: { spread: 'far', flash: 0.25, speed: 1.2 } },
  zablesk:    { easy: { count: 3, flash: 0.50, speed: 3.0 }, med: { count: 4, flash: 0.38, speed: 2.5 }, hard: { count: 5, flash: 0.25, speed: 2.0 } },
};
function presetSummary(game, s) {
  if (game === 'reaction') return `${s.speed.toFixed(1)} s interval${s.gap > 0 ? ` · ${s.gap.toFixed(1)} s pauza` : ''}${s.randomPos ? ' · náhodná pozice' : ''}${s.progressive ? ' · zrychlování' : ''}`;
  if (game === 'peripheral') return `${s.speed.toFixed(1)} s interval · ${s.flash.toFixed(2)} s záblesk · ${s.spread === 'far' ? 'daleko' : 'blízko'}`;
  if (game === 'zablesk') return `${s.count} znaky · ${s.flash.toFixed(2)} s záblesk · ${s.speed.toFixed(1)} s na vybavení`;
  const c = TRACK_PRESETS[s.difficulty]; return `${c.dots} míčků · ${c.targets} cílové · ${c.track}s pohyb`;
}

// ============================ ENGINE (intervalové hry) ============================
function StimulusEngine({ settings, config, onExit }) {
  const [phase, setPhase] = useState('countdown');
  const [stim, setStim] = useState(null);
  const [count, setCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [cd, setCd] = useState(3);
  const phaseRef = useRef('countdown'); const countRef = useRef(0); const prevKeyRef = useRef(null);
  const runStartRef = useRef(0); const accumRef = useRef(0); const timersRef = useRef([]); const audioRef = useRef(null);
  const add = (t) => { timersRef.current.push(t); return t; };
  const clearAll = () => { timersRef.current.forEach((t) => { clearTimeout(t); clearInterval(t); }); timersRef.current = []; };
  const setPh = (p) => { phaseRef.current = p; setPhase(p); };
  const nowEl = () => accumRef.current + (phaseRef.current === 'running' ? Date.now() - runStartRef.current : 0);
  const beep = () => {
    if (!settings.sound) return;
    try {
      let ctx = audioRef.current; if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); audioRef.current = ctx; }
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = 680;
      g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.13);
    } catch (e) {}
  };
  const cycleRef = useRef(null);
  function cycle() {
    if (phaseRef.current !== 'running') return;
    const el = nowEl();
    const st = config.generate(prevKeyRef.current, settings, el);
    prevKeyRef.current = st.key; setStim(st);
    setCount((c) => { const n = c + 1; countRef.current = n; return n; });
    beep();
    const showMs = config.showMs(settings, el), cycleMs = config.cycleMs(settings, el);
    add(setTimeout(() => {
      if (phaseRef.current !== 'running') return;
      setStim(null);
      add(setTimeout(() => { if (phaseRef.current === 'running') cycleRef.current(); }, Math.max(0, cycleMs - showMs)));
    }, showMs));
  }
  useEffect(() => { cycleRef.current = cycle; });
  const tick = () => { if (phaseRef.current !== 'running') return; const e = nowEl(); setElapsed(e); if (settings.duration && e / 1000 >= settings.duration) finish(); };
  function begin() { accumRef.current = 0; runStartRef.current = Date.now(); setPh('running'); setElapsed(0); add(setInterval(tick, 200)); cycleRef.current(); }
  useEffect(() => {
    let c = 3; setCd(3);
    const id = setInterval(() => { c -= 1; if (c <= 0) { clearInterval(id); begin(); } else setCd(c); }, 800);
    timersRef.current.push(id); return () => clearAll();
  }, []);
  const pause = () => { if (phaseRef.current !== 'running') return; accumRef.current += Date.now() - runStartRef.current; setPh('paused'); clearAll(); };
  const resume = () => { runStartRef.current = Date.now(); setPh('running'); add(setInterval(tick, 200)); cycleRef.current(); };
  const finish = () => { const secs = Math.round(nowEl() / 1000); clearAll(); setPh('done'); onExit({ reps: countRef.current, secs }); };
  const remaining = settings.duration ? settings.duration * 1000 - elapsed : null;

  return (
    <div className="ht-root" style={{ position: 'fixed', inset: 0, background: '#06060a', overflow: 'hidden', zIndex: 50 }}>
      <div style={{ position: 'absolute', top: 16, left: 18, right: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 60, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 14, fontWeight: 600, alignItems: 'center' }}>
          <span style={{ color: T.brand1 }}>● {count}</span>
          <span>{settings.duration ? fmt(remaining) : fmt(elapsed)}</span>
          {settings.voice && <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.ok }}><Icon name="mic" color={T.ok} size={13} />HLAS</span>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {phase === 'running' && <button className="gbtn" style={ghostBtn} onClick={pause}>Pauza</button>}
          {phase === 'paused' && <button className="gbtn" style={ghostBtn} onClick={resume}>Pokračovat</button>}
          <button className="gbtn" style={{ ...ghostBtn, color: '#FF7A6A', borderColor: hexA('#FF4D4D', .4) }} onClick={finish}>Stop</button>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', zIndex: 60, fontSize: 12, color: T.textFaint, padding: '0 16px', lineHeight: 1.6 }}>
        {config.legend(settings).map((l, i) => <div key={i}>{l}</div>)}
      </div>
      {config.centerLayer && phase !== 'countdown' && config.centerLayer(settings)}
      {phase === 'countdown' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 55 }}>
          <div key={cd} style={{ fontSize: 'clamp(6rem,30vmin,22rem)', fontWeight: 900, background: BRAND, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'popIn .6s ease' }}>{cd}</div>
        </div>
      )}
      {phase === 'paused' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 55, background: 'rgba(6,6,10,.6)' }}>
          <div style={{ fontSize: 'clamp(2rem,8vmin,5rem)', fontWeight: 800, letterSpacing: 6, color: T.brand1 }}>PAUZA</div>
        </div>
      )}
      {phase === 'running' && stim && (
        <div key={stim.key + count} style={{ position: 'absolute', left: stim.pos ? `${stim.pos.left}%` : '50%', top: stim.pos ? `${stim.pos.top}%` : '50%', transform: 'translate(-50%,-50%)', animation: 'stimIn .16s ease-out', textAlign: 'center', zIndex: 55 }}>
          {renderStim(stim)}
        </div>
      )}
    </div>
  );
}

// ============================ SLED ============================
const TRACK_PRESETS = {
  easy: { dots: 6, targets: 2, speed: 85, track: 4, label: 'Lehká' },
  med:  { dots: 8, targets: 3, speed: 145, track: 6, label: 'Střední' },
  hard: { dots: 10, targets: 4, speed: 205, track: 7, label: 'Těžká' },
};
const DOT_R = 26;
function TrackingGame({ settings, onExit }) {
  const cfg = TRACK_PRESETS[settings.difficulty] || TRACK_PRESETS.med;
  const totalRounds = settings.rounds;
  const [phase, setPhase] = useState('countdown');
  const [round, setRound] = useState(1);
  const [cd, setCd] = useState(3);
  const [dots, setDots] = useState([]);
  const [score, setScore] = useState({ correct: 0, possible: 0 });
  const [roundHit, setRoundHit] = useState(0);
  const areaRef = useRef(null); const rafRef = useRef(null); const lastTsRef = useRef(0);
  const physRef = useRef([]); const elRefs = useRef({}); const sizeRef = useRef({ w: 0, h: 0 });
  const phaseRef = useRef('countdown'); const timersRef = useRef([]); const dotsRef = useRef([]);
  const scoreRef = useRef({ correct: 0, possible: 0 });
  const setPh = (p) => { phaseRef.current = p; setPhase(p); };
  const add = (t) => { timersRef.current.push(t); return t; };
  const clearTimers = () => { timersRef.current.forEach((t) => clearTimeout(t)); timersRef.current = []; };
  const applyTransforms = () => { physRef.current.forEach((p) => { const el = elRefs.current[p.id]; if (el) el.style.transform = `translate(${p.x - DOT_R}px,${p.y - DOT_R}px)`; }); };
  function buildRound() {
    const rect = areaRef.current.getBoundingClientRect();
    const w = rect.width, h = rect.height; sizeRef.current = { w, h };
    const idx = [...Array(cfg.dots).keys()];
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const targetSet = new Set(idx.slice(0, cfg.targets));
    const phys = [];
    for (let i = 0; i < cfg.dots; i++) {
      const ang = Math.random() * Math.PI * 2;
      phys.push({ id: i, x: DOT_R + Math.random() * (w - 2 * DOT_R), y: DOT_R + Math.random() * (h - 2 * DOT_R), vx: Math.cos(ang) * cfg.speed, vy: Math.sin(ang) * cfg.speed, isTarget: targetSet.has(i) });
    }
    physRef.current = phys;
    const ds = phys.map((p) => ({ id: p.id, isTarget: p.isTarget, selected: false }));
    dotsRef.current = ds; setDots(ds); setRoundHit(0);
    requestAnimationFrame(() => applyTransforms());
    setPh('show');
    add(setTimeout(() => {
      setPh('move'); lastTsRef.current = performance.now(); rafRef.current = requestAnimationFrame(step);
      add(setTimeout(() => { cancelAnimationFrame(rafRef.current); setPh('pick'); }, cfg.track * 1000));
    }, 2000));
  }
  function step(ts) {
    const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000); lastTsRef.current = ts;
    const { w, h } = sizeRef.current;
    physRef.current.forEach((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < DOT_R) { p.x = DOT_R; p.vx *= -1; } if (p.x > w - DOT_R) { p.x = w - DOT_R; p.vx *= -1; }
      if (p.y < DOT_R) { p.y = DOT_R; p.vy *= -1; } if (p.y > h - DOT_R) { p.y = h - DOT_R; p.vy *= -1; }
      const el = elRefs.current[p.id]; if (el) el.style.transform = `translate(${p.x - DOT_R}px,${p.y - DOT_R}px)`;
    });
    rafRef.current = requestAnimationFrame(step);
  }
  const toggleDot = (id) => {
    if (phaseRef.current !== 'pick') return;
    const ds = dotsRef.current.map((d) => ({ ...d }));
    const d = ds.find((x) => x.id === id);
    const selCount = ds.filter((x) => x.selected).length;
    if (!d.selected && selCount >= cfg.targets) return;
    d.selected = !d.selected; dotsRef.current = ds; setDots(ds);
  };
  const evaluate = () => {
    const hit = dotsRef.current.filter((d) => d.selected && d.isTarget).length;
    const ns = { correct: scoreRef.current.correct + hit, possible: scoreRef.current.possible + cfg.targets };
    scoreRef.current = ns; setScore(ns); setRoundHit(hit); setPh('result');
  };
  const advance = () => {
    if (round >= totalRounds) { clearTimers(); cancelAnimationFrame(rafRef.current); onExit({ correct: scoreRef.current.correct, possible: scoreRef.current.possible, rounds: totalRounds }); }
    else { setRound((r) => r + 1); buildRound(); }
  };
  useEffect(() => {
    let c = 3; setCd(3);
    const id = setInterval(() => { c -= 1; if (c <= 0) { clearInterval(id); buildRound(); } else setCd(c); }, 800);
    timersRef.current.push(id);
    return () => { clearTimers(); cancelAnimationFrame(rafRef.current); };
  }, []);
  const selectedCount = dots.filter((d) => d.selected).length;
  const dotVisual = (d) => {
    let bg = '#39414F', glow = 'none', border = 'none';
    if (phase === 'show') { if (d.isTarget) { bg = T.brand1; glow = `0 0 26px ${T.brand1}`; } }
    else if (phase === 'pick') { if (d.selected) { bg = T.brand1; glow = `0 0 22px ${T.brand1}`; } }
    else if (phase === 'result') {
      if (d.isTarget && d.selected) { bg = T.ok; glow = `0 0 22px ${T.ok}`; }
      else if (d.selected && !d.isTarget) { bg = '#FF4D4D'; glow = '0 0 18px #FF4D4D'; }
      else if (d.isTarget && !d.selected) { bg = '#252b36'; border = `3px solid ${T.peripheral}`; }
      else bg = '#252b36';
    }
    return { bg, glow, border };
  };
  return (
    <div className="ht-root" style={{ position: 'fixed', inset: 0, background: '#06060a', overflow: 'hidden', zIndex: 50 }}>
      <div style={{ position: 'absolute', top: 16, left: 18, right: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 60, color: T.textDim }}>
        <div style={{ display: 'flex', gap: 18, fontSize: 14, fontWeight: 600 }}>
          <span style={{ color: T.brand1 }}>Kolo {round}/{totalRounds}</span>
          <span>{score.correct}/{score.possible}</span>
        </div>
        <button className="gbtn" style={{ ...ghostBtn, color: '#FF7A6A', borderColor: hexA('#FF4D4D', .4) }}
          onClick={() => { clearTimers(); cancelAnimationFrame(rafRef.current); onExit({ correct: scoreRef.current.correct, possible: scoreRef.current.possible, rounds: round - 1 }); }}>Stop</button>
      </div>
      <div ref={areaRef} style={{ position: 'absolute', left: 14, right: 14, top: 64, bottom: 96 }}>
        {dots.map((d) => {
          const v = dotVisual(d);
          return <div key={d.id} ref={(el) => { elRefs.current[d.id] = el; }} onClick={() => toggleDot(d.id)}
            style={{ position: 'absolute', left: 0, top: 0, width: DOT_R * 2, height: DOT_R * 2, borderRadius: '50%', background: v.bg, boxShadow: v.glow, border: v.border, transition: 'background .18s, box-shadow .18s, border .18s', cursor: phase === 'pick' ? 'pointer' : 'default' }} />;
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 22, left: 0, right: 0, textAlign: 'center', zIndex: 60 }}>
        {phase === 'show' && <div style={{ color: T.brand1, fontWeight: 700, fontSize: 15 }}>Zapamatuj si zvýrazněné míčky…</div>}
        {phase === 'move' && <div style={{ color: T.textFaint, fontSize: 14 }}>Sleduj je očima</div>}
        {phase === 'pick' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ color: T.textDim, fontSize: 14 }}>Označ {cfg.targets} cílové míčky ({selectedCount}/{cfg.targets})</div>
            <button className="gbtn" style={{ ...bigBtn, width: 'auto', opacity: selectedCount === cfg.targets ? 1 : .4, cursor: selectedCount === cfg.targets ? 'pointer' : 'not-allowed' }} disabled={selectedCount !== cfg.targets} onClick={evaluate}>Vyhodnotit</button>
          </div>
        )}
        {phase === 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ color: roundHit === cfg.targets ? T.ok : T.peripheral, fontWeight: 800, fontSize: 18 }}>{roundHit}/{cfg.targets} správně</div>
            <button className="gbtn" style={{ ...bigBtn, width: 'auto' }} onClick={advance}>{round >= totalRounds ? 'Zobrazit výsledek' : 'Další kolo'}</button>
          </div>
        )}
      </div>
      {phase === 'countdown' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 55 }}>
          <div key={cd} style={{ fontSize: 'clamp(6rem,30vmin,22rem)', fontWeight: 900, background: BRAND, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'popIn .6s ease' }}>{cd}</div>
        </div>
      )}
    </div>
  );
}

// ============================ DONE ============================
function DoneScreen({ summary, onReplay, onMenu }) {
  const isTrack = summary.possible !== undefined;
  const acc = isTrack && summary.possible > 0 ? Math.round((summary.correct / summary.possible) * 100) : 0;
  return (
    <div style={{ maxWidth: 440, margin: '0 auto', padding: '40px clamp(14px,4vw,28px)' }}>
      <div className="rise" style={{ textAlign: 'center', ...card, padding: '28px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><GameIcon game={summary.game} size={34} /></div>
        <div style={{ fontSize: 12.5, letterSpacing: 3, color: T.brand1, fontWeight: 700, marginBottom: 2 }}>TRÉNINK DOKONČEN</div>
        <div style={{ fontSize: 12, color: T.textFaint, letterSpacing: 2, marginBottom: 20 }}>{GAMES[summary.game].name}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 36, margin: '4px 0 26px' }}>
          {isTrack ? (<><Stat big={acc + '%'} label="ÚSPĚŠNOST" /><Stat big={`${summary.correct}/${summary.possible}`} label="SPRÁVNĚ" /></>)
                   : (<><Stat big={summary.reps} label="PODNĚTŮ" /><Stat big={fmt(summary.secs * 1000)} label="ČAS" /></>)}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="gbtn" style={bigBtn} onClick={onReplay}>Znovu</button>
          <button className="gbtn" style={{ ...ghostBtn, flex: '0 0 auto' }} onClick={onMenu}>Přehled</button>
        </div>
      </div>
    </div>
  );
}
function Stat({ big, label }) {
  return (
    <div>
      <div style={{ fontSize: 44, fontWeight: 900, background: BRAND, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{big}</div>
      <div style={{ fontSize: 12, color: T.textDim, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

// ============================ SETUP ============================
function Setup({ game, settings, setSettings, onStart, onBack }) {
  const g = GAMES[game];
  const s = settings;
  const CUSTOM_KEYS = ['speed', 'gap', 'flash', 'count', 'spread', 'randomPos', 'progressive'];
  const upd = (k, v) => setSettings((p) => ({ ...p, [k]: v, ...(CUSTOM_KEYS.includes(k) ? { diff: 'custom' } : {}) }));
  const toggleMode = (m) => setSettings((p) => ({ ...p, modes: p.modes.includes(m) ? p.modes.filter((x) => x !== m) : [...p.modes, m] }));
  const setDiff = (level) => { if (level === 'custom') { setSettings((p) => ({ ...p, diff: 'custom' })); return; } setSettings((p) => ({ ...p, ...PRESETS[game][level], diff: level })); };
  const startDisabled = game === 'reaction' && s.modes.length === 0;
  const custom = s.diff === 'custom';
  const diffOpts = [{ key: 'easy', label: 'Lehká' }, { key: 'med', label: 'Střední' }, { key: 'hard', label: 'Těžká' }, { key: 'custom', label: 'Vlastní' }];

  return (
    <div className="rise" style={{ maxWidth: 560, margin: '0 auto', padding: '8px clamp(14px,4vw,28px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <button className="gbtn" style={{ ...ghostBtn, padding: '9px 14px' }} onClick={onBack}>←</button>
        <div style={{ width: 46, height: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hexA(g.accent, .13), border: `1px solid ${hexA(g.accent, .35)}` }}><GameIcon game={game} size={28} /></div>
        <div><div style={{ fontSize: 25, fontWeight: 800, color: g.accent, lineHeight: 1 }}>{g.name}</div><div style={{ fontSize: 12, color: T.textFaint, marginTop: 3 }}>{g.skill}</div></div>
      </div>

      <div style={{ ...card, marginBottom: 16, borderColor: hexA(g.accent, .25), display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ marginTop: 2 }}><GameIcon game={game} size={30} /></div>
        <div><div style={{ ...sectionTitle, color: g.accent, marginBottom: 6 }}>Jak hrát</div><p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: T.textDim }}>{HOWTO[game]}</p></div>
      </div>

      {game === 'reaction' && (
        <div style={{ ...card, marginBottom: 16 }}>
          <SecTitle icon="grid">Co trénovat</SecTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {Object.keys(MODE_INFO).map((m) => <Choice key={m} active={s.modes.includes(m)} accent={g.accent} onClick={() => toggleMode(m)}>{MODE_INFO[m].label}</Choice>)}
          </div>
          {s.modes.length === 0 && <div style={{ marginTop: 12, fontSize: 13, color: '#FF7A6A' }}>Vyber aspoň jeden typ podnětu.</div>}
        </div>
      )}
      {game === 'peripheral' && (
        <div style={{ ...card, marginBottom: 16 }}>
          <SecTitle icon="grid">Typ podnětu v okraji</SecTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {[['colors', 'Barvy'], ['arrows', 'Šipky'], ['numbers', 'Čísla']].map(([k, l]) => <Choice key={k} active={s.type === k} accent={g.accent} onClick={() => upd('type', k)}>{l}</Choice>)}
          </div>
        </div>
      )}
      {game === 'zablesk' && (
        <div style={{ ...card, marginBottom: 16 }}>
          <SecTitle icon="grid">Typ znaků</SecTitle>
          <div style={{ display: 'flex', gap: 9 }}>
            {[['numbers', 'Čísla'], ['colors', 'Barvy']].map(([k, l]) => <Choice key={k} active={s.type === k} accent={g.accent} onClick={() => upd('type', k)}>{l}</Choice>)}
          </div>
        </div>
      )}

      <div style={{ ...card, marginBottom: 16 }}>
        <SecTitle icon="sliders">Obtížnost</SecTitle>
        {game === 'tracking'
          ? <Segmented accent={g.accent} value={s.difficulty} onChange={(v) => upd('difficulty', v)} options={Object.keys(TRACK_PRESETS).map((k) => ({ key: k, label: TRACK_PRESETS[k].label }))} />
          : <Segmented accent={g.accent} value={s.diff} onChange={setDiff} options={diffOpts} />}
        <div style={{ marginTop: 11, fontSize: 12, color: T.textFaint, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="gauge" color={T.textFaint} size={13} />{presetSummary(game, s)}</div>

        {custom && game === 'reaction' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <MSlider label="Interval mezi podněty" value={s.speed} display={s.speed.toFixed(1)} suffix=" s" min={0.5} max={4} step={0.1} accent={g.accent} onChange={(v) => upd('speed', v)} hint="Nižší = rychleji a těžší" />
            <MSlider label="Prodleva (prázdná obrazovka)" value={s.gap} display={s.gap.toFixed(1)} suffix=" s" min={0} max={1.5} step={0.1} accent={g.accent} onChange={(v) => upd('gap', v)} />
            <Toggle label="Náhodná pozice na obrazovce" hint="Nutí periferní vidění a pohyb hlavy" on={s.randomPos} onClick={() => upd('randomPos', !s.randomPos)} />
            <Toggle label="Postupné zrychlování" hint="Každých 15 s se to zrychlí" on={s.progressive} onClick={() => upd('progressive', !s.progressive)} />
          </div>
        )}
        {custom && game === 'peripheral' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <div>
              <div style={{ fontSize: 13, color: T.text, marginBottom: 9 }}>Vzdálenost od středu</div>
              <div style={{ display: 'flex', gap: 9 }}>{[['near', 'Blízko'], ['far', 'Daleko']].map(([k, l]) => <Choice key={k} active={s.spread === k} accent={g.accent} onClick={() => upd('spread', k)}>{l}</Choice>)}</div>
            </div>
            <MSlider label="Interval mezi bliknutími" value={s.speed} display={s.speed.toFixed(1)} suffix=" s" min={0.8} max={4} step={0.1} accent={g.accent} onChange={(v) => upd('speed', v)} />
            <MSlider label="Doba bliknutí" value={s.flash} display={s.flash.toFixed(2)} suffix=" s" min={0.15} max={0.8} step={0.05} accent={g.accent} onChange={(v) => upd('flash', v)} hint="Kratší = těžší" />
          </div>
        )}
        {custom && game === 'zablesk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <div>
              <div style={{ fontSize: 13, color: T.text, marginBottom: 9 }}>Počet znaků naráz</div>
              <div style={{ display: 'flex', gap: 9 }}>{[3, 4, 5].map((n) => <Choice key={n} active={s.count === n} accent={g.accent} onClick={() => upd('count', n)}>{n}</Choice>)}</div>
            </div>
            <MSlider label="Doba probliknutí" value={s.flash} display={s.flash.toFixed(2)} suffix=" s" min={0.15} max={0.7} step={0.05} accent={g.accent} onChange={(v) => upd('flash', v)} hint="Kratší = těžší" />
            <MSlider label="Interval (čas na vybavení)" value={s.speed} display={s.speed.toFixed(1)} suffix=" s" min={1.5} max={5} step={0.1} accent={g.accent} onChange={(v) => upd('speed', v)} />
          </div>
        )}
      </div>

      {game === 'tracking' ? (
        <div style={{ ...card, marginBottom: 16 }}>
          <SecTitle icon="refresh">Počet kol</SecTitle>
          <div style={{ display: 'flex', gap: 9 }}>{[3, 5, 8].map((r) => <Choice key={r} active={s.rounds === r} onClick={() => upd('rounds', r)}>{r}</Choice>)}</div>
        </div>
      ) : (
        <div style={{ ...card, marginBottom: 16 }}>
          <SecTitle icon="clock">Délka tréninku</SecTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {[30, 60, 90, 120].map((d) => <Choice key={d} active={s.duration === d} onClick={() => upd('duration', d)}>{d}s</Choice>)}
            <Choice active={s.duration === null} onClick={() => upd('duration', null)}>∞</Choice>
          </div>
        </div>
      )}

      {game !== 'tracking' && (
        <div style={{ ...card, marginBottom: 24 }}>
          <SecTitle icon="sound">Možnosti</SecTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Toggle label="Hlasový režim (beta)" hint="Přes mikrofon rozpozná odpověď a změří přesnost i rychlost. Kvalita závisí na mikrofonu a hluku okolí." on={s.voice} onClick={() => upd('voice', !s.voice)} />
            <Toggle label="Zvukový signál" hint="Sluchový spouštěč při změně" on={s.sound} onClick={() => upd('sound', !s.sound)} />
          </div>
        </div>
      )}

      <button className="gbtn" style={{ ...bigBtn, opacity: startDisabled ? .45 : 1, cursor: startDisabled ? 'not-allowed' : 'pointer' }} disabled={startDisabled} onClick={onStart}>▶  SPUSTIT</button>
    </div>
  );
}

// ============================ APP ============================
export default function App() {
  const [view, setView] = useState('menu');
  const [game, setGame] = useState(null);
  const [settings, setSettings] = useState(null);
  const [summary, setSummary] = useState(null);
  const pick = (g) => { setGame(g); setSettings(defaultsFor(g)); setView('setup'); };
  const onExit = (sum) => { setSummary({ game, ...sum }); setView('done'); };
  const goHome = () => { setView('menu'); setGame(null); };

  if (view === 'play') {
    return <><StyleTag />{game === 'tracking'
      ? <TrackingGame settings={settings} onExit={onExit} />
      : <StimulusEngine settings={settings} config={game === 'reaction' ? reactionConfig : game === 'peripheral' ? peripheralConfig : zablescConfig} onExit={onExit} />}</>;
  }

  let inner;
  if (view === 'done') inner = <DoneScreen summary={summary} onReplay={() => setView('play')} onMenu={goHome} />;
  else if (view === 'setup') inner = <Setup game={game} settings={settings} setSettings={setSettings} onStart={() => setView('play')} onBack={goHome} />;
  else inner = <Dashboard onPick={pick} />;

  return (
    <div className="ht-root" style={{ minHeight: '100vh', position: 'relative', color: T.text, background: T.bg }}>
      <StyleTag />
      <Bg />
      <Navbar onHome={goHome} />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 88 }}>{inner}</div>
      <Footer />
    </div>
  );
}
