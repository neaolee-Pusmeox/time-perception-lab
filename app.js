// ============================
// 时间感校准实验室 v3.1 — 移动优先 + 钟表头像 + 稳健保存
// ============================

const state = {
  currentPage: 'landing',
  currentRound: 0,
  targetTimes: [],
  results: [],
  isTiming: false,
  startTime: 0,
  audioCtx: null,
};

// --- Canvas 背景动效 ---
const canvas = document.getElementById('anim-canvas');
const ctx = canvas.getContext('2d');
let animFrame = null;
let animElements = [];

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', () => {
  resizeCanvas();
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
});
resizeCanvas();
document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);

const animThemes = {
  ripple: {
    init(w, h) {
      const els = [];
      const count = w < 600 ? 24 : 38;
      for (let i = 0; i < count; i++) {
        els.push({
          x: Math.random() * w, y: Math.random() * h,
          len: 50 + Math.random() * 90,
          angle: Math.random() * Math.PI * 2,
          speed: 0.15 + Math.random() * 0.3,
          drift: (Math.random() - 0.5) * 0.004,
          opacity: 0.22 + Math.random() * 0.18,
          width: 0.8 + Math.random() * 0.8,
        });
      }
      return els;
    },
    draw(els, w, h, ctx) {
      ctx.clearRect(0, 0, w, h);
      els.forEach(e => {
        e.angle += e.drift;
        e.x += Math.cos(e.angle) * e.speed;
        e.y += Math.sin(e.angle) * e.speed;
        if (e.x < -100) e.x = w + 100;
        if (e.x > w + 100) e.x = -100;
        if (e.y < -100) e.y = h + 100;
        if (e.y > h + 100) e.y = -100;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.angle) * e.len, e.y + Math.sin(e.angle) * e.len);
        ctx.strokeStyle = `rgba(26, 26, 26, ${e.opacity})`;
        ctx.lineWidth = e.width;
        ctx.lineCap = 'round';
        ctx.stroke();
      });
    }
  },
  pulse: {
    init(w, h) {
      const els = [];
      const count = w < 600 ? 6 : 8;
      for (let i = 0; i < count; i++) {
        els.push({
          x: Math.random() * w * 0.9 + w * 0.05,
          y: Math.random() * h * 0.9 + h * 0.05,
          r: Math.random() * 80,
          maxR: 160 + Math.random() * 220,
          speed: 0.45 + Math.random() * 0.4,
        });
      }
      return els;
    },
    draw(els, w, h, ctx) {
      ctx.clearRect(0, 0, w, h);
      els.forEach(e => {
        e.r += e.speed;
        if (e.r > e.maxR) {
          e.r = 0;
          e.x = Math.random() * w * 0.9 + w * 0.05;
          e.y = Math.random() * h * 0.9 + h * 0.05;
          e.maxR = 160 + Math.random() * 220;
       }
        const opacity = 0.32 * (1 - e.r / e.maxR);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(26, 26, 26, ${opacity})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });
    }
  },
  drift: {
    init(w, h) {
      const els = [];
      const cols = w < 600 ? 10 : 16;
      const rows = w < 600 ? 16 : 22;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          els.push({
            baseX: (i + 0.5) * (w / cols),
            baseY: (j + 0.5) * (h / rows),
            offsetX: 0, offsetY: 0,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: 1.8 + Math.random() * 2.2,
        o: 0.25 + Math.random() * 0.2,
          });
        }
      }
      return els;
    },
    draw(els, w, h, ctx) {
      ctx.clearRect(0, 0, w, h);
      els.forEach(e => {
        e.vx += (Math.random() - 0.5) * 0.08;
        e.vy += (Math.random() - 0.5) * 0.08;
        e.vx *= 0.97; e.vy *= 0.97;
        e.offsetX += e.vx; e.offsetY += e.vy;
        if (Math.abs(e.offsetX) > 28) e.vx *= -0.6;
        if (Math.abs(e.offsetY) > 28) e.vy *= -0.6;
        ctx.beginPath();
        ctx.arc(e.baseX + e.offsetX, e.baseY + e.offsetY, e.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(26, 26, 26, ${e.o})`;
        ctx.fill();
      });
    }
  },
};
const roundAnimKeys = ['ripple', 'pulse', 'drift'];

function startAnim(themeName) {
  if (animFrame) cancelAnimationFrame(animFrame);
  if (themeName === 'none') {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    return;
  }
  const theme = animThemes[themeName];
  const w = window.innerWidth, h = window.innerHeight;
  animElements = theme.init(w, h);
  function loop() {
    theme.draw(animElements, w, h, ctx);
    animFrame = requestAnimationFrame(loop);
  }
  loop();
}
function stopAnim() {
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = null;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

// --- Audio ---
function initAudio() {
  if (!state.audioCtx) {
    try { state.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { state.audioCtx = null; }
  }
}
function playBeep(freq = 800, duration = 0.08) {
  if (!state.audioCtx) return;
  try {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.frequency.value = freq; osc.type = 'sine';
    gain.gain.setValueAtTime(0.18, state.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + duration);
    osc.start(); osc.stop(state.audioCtx.currentTime + duration);
  } catch (e) { /* noop */ }
}

// --- 时长生成 ---
function generateTargetTimes() {
  let times = [];
  for (let attempt = 0; attempt < 200; attempt++) {
    const a = 5 + Math.floor(Math.random() * 16);
    const b = 5 + Math.floor(Math.random() * 16);
    const c = 5 + Math.floor(Math.random() * 16);
    const sorted = [a, b, c].sort((x, y) => x - y);
    if (sorted[1] - sorted[0] >= 4 && sorted[2] - sorted[1] >= 4) {
      times = [a, b, c].sort(() => Math.random() - 0.5);
      break;
    }
  }
  if (times.length === 0) times = [7, 13, 19];
  return times;
}

// --- 页面导航 ---
function goToPage(page) {
  const target = document.getElementById(`page-${page}`);
  if (!target) return;
  document.querySelectorAll('.page.active').forEach(el => {
    if (el !== target) {
      el.classList.add('exit');
      el.classList.remove('active');
      setTimeout(() => el.classList.remove('exit'), 700);
    }
  });
  requestAnimationFrame(() => target.classList.add('active'));
  state.currentPage = page;
  if (page === 'landing' || page === 'intro' || page === 'feedback' || page === 'result') {
    stopAnim();
  }
}

function startTest() {
  initAudio();
  state.currentRound = 0;
  state.results = [];
  state.targetTimes = generateTargetTimes();
  showTestRound();
}

function updateRoundDots(idx, doneCount) {
  const dots = document.querySelectorAll('#round-dots .round-dot');
  dots.forEach((d, i) => {
    d.classList.remove('active', 'done');
    if (i < doneCount) d.classList.add('done');
    else if (i === idx) d.classList.add('active');
  });
}

function showTestRound() {
  const round = state.currentRound;
  const target = state.targetTimes[round];
  document.getElementById('round-label').textContent = `Round ${round + 1} / 3`;
  document.getElementById('target-time').textContent = target;
  document.getElementById('test-ui').style.opacity = '1';
  document.getElementById('btn-ready').style.display = '';
  document.getElementById('tap-hint').classList.remove('show');
  updateRoundDots(round, round);
  state.isTiming = false;
  goToPage('test');
  startAnim(roundAnimKeys[round]);
}

function beginTiming() {
  document.getElementById('test-ui').style.opacity = '0';
  document.getElementById('btn-ready').style.display = 'none';
  // 提示放到屏幕中央偏下、字体加粗放大、无呼吸动效
  setTimeout(() => document.getElementById('tap-hint').classList.add('show'), 450);
  playBeep(880, 0.1);
  state.startTime = performance.now();
  state.isTiming = true;
}

document.getElementById('page-test').addEventListener('pointerdown', (e) => {
  if (!state.isTiming) return;
  if (e.target.tagName === 'BUTTON') return;
  e.preventDefault();
  const elapsed = (performance.now() - state.startTime) / 1000;
  state.isTiming = false;
  playBeep(660, 0.08);
  stopAnim();
  recordResult(elapsed);
});

function recordResult(elapsed) {
  const target = state.targetTimes[state.currentRound];
  const diff = elapsed - target;
  const percent = (diff / target) * 100;
  state.results.push({ target, elapsed, diff, percent });
  showFeedback();
}

function showFeedback() {
  const round = state.currentRound;
  const r = state.results[round];
  document.getElementById('fb-round').textContent = `Round ${round + 1} of 3`;
  document.getElementById('fb-value').innerHTML = `${r.elapsed.toFixed(1)}<span class="unit">s</span>`;
  document.getElementById('fb-detail').textContent = `目标 ${r.target} 秒 · 偏差 ${r.diff >= 0 ? '+' : '−'}${Math.abs(r.diff).toFixed(1)} 秒`;
  const absP = Math.abs(r.percent).toFixed(0);
  if (r.diff < -0.3) {
    document.getElementById('fb-percent').textContent = `快了 ${absP}%`;
    document.getElementById('fb-comment').textContent = '你的时间跑得比现实快一拍';
  } else if (r.diff > 0.3) {
    document.getElementById('fb-percent').textContent = `慢了 ${absP}%`;
    document.getElementById('fb-comment').textContent = '你的时间比现实流得更从容';
  } else {
    document.getElementById('fb-percent').textContent = '几乎精准';
    document.getElementById('fb-comment').textContent = '你的内在时钟校准得令人惊叹';
  }
  const btn = document.getElementById('btn-next');
  if (round >= 2) { btn.textContent = '查看时间人格 →'; btn.onclick = showResult; }
  else { btn.textContent = '下一轮 →'; btn.onclick = nextRound; }
  goToPage('feedback');
}

function nextRound() { state.currentRound++; showTestRound(); }

// --- 人物数据 ---
const characters = [
  { no: '01', name: '拿破仑',     tag: '精密加速者',     desc: '他用 4 小时睡眠换取帝国版图，每一秒都被精确压榨。你的内在时钟是一台校准过的快表——始终比世界快半拍，但从不出错。', speed: 0, stability: 0, img: 'portraits/napoleon.jpg' },
  { no: '02', name: '特斯拉',     tag: '灵感闪电',       desc: '他在雷电中看见交流电的未来，时间被思维的密度压缩。你比现实快，但快得有章法——像一颗跳动频率偏高的心脏。',     speed: 0, stability: 1, img: 'portraits/tesla.jpg' },
  { no: '03', name: '毕加索',     tag: '时间的立体派',   desc: '他把一天活成五天，但没人知道下一笔落在哪里。你的时间感像他的画——打碎了重组，每一刻都是即兴。',                 speed: 0, stability: 2, img: 'portraits/picasso.jpg' },
  { no: '04', name: '康德',       tag: '人形原子钟',     desc: '柯尼斯堡的居民用他的散步时间对表。你的时间感精确得令人不安——你确定自己不是一台仪器？',                       speed: 1, stability: 0, img: 'portraits/kant.jpg' },
  { no: '05', name: '诸葛亮',     tag: '借东风的人',     desc: '他算天时、度地利、量人心，对时机的拿捏从不急躁也不迟钝。你的时间感如同一位善弈者——大局了然，偶有妙手。',     speed: 1, stability: 1, img: 'portraits/zhuge.jpg' },
  { no: '06', name: '莫扎特',     tag: '即兴变奏曲',     desc: '他 5 岁作曲，35 岁燃尽，时间准不准对他毫无意义——因为每一刻都在创造。你的时间不快不慢，但从不重复。',         speed: 1, stability: 2, img: 'portraits/mozart.jpg' },
  { no: '07', name: '达尔文',     tag: '地质纪年者',     desc: '他花 20 年写一本书，像地层一样缓慢而确定地堆积证据。你的内在时钟比现实慢半拍，但这份从容是一种罕见的定力。',   speed: 2, stability: 0, img: 'portraits/darwin.jpg' },
  { no: '08', name: '村上春树',   tag: '长跑节拍器',     desc: '每天凌晨 4 点起床，用重复抵抗混沌。你的时间流得比别人慢一些，像长距离跑者的呼吸——稳中带着微微的起伏。',         speed: 2, stability: 1, img: 'portraits/murakami.jpg' },
  { no: '09', name: '李白',       tag: '醉中仙',         desc: '他举杯邀月、对影成三人，时间在他那里是一壶酒的事。你的内在时钟散漫、自在、不可捉摸——天地间一蜉蝣，何必计较快慢。',  speed: 2, stability: 2, img: 'portraits/libai.jpg' },
];

// --- 结果计算 ---
function calculateResult() {
  const percents = state.results.map(r => r.percent);
  const avgPercent = percents.reduce((a, b) => a + b, 0) / percents.length;
  const volatility = Math.max(...percents) - Math.min(...percents);
  const speedIdx = avgPercent < -10 ? 0 : avgPercent > 10 ? 2 : 1;
  const stabilityIdx = volatility < 12 ? 0 : volatility < 28 ? 1 : 2;
  const character = characters.find(c => c.speed === speedIdx && c.stability === stabilityIdx);
  const absPercents = percents.map(Math.abs);
  let trendLabel, trendDesc;
  if (absPercents[2] < absPercents[0] && absPercents[1] <= absPercents[0]) {
    trendLabel = '逐渐校准型'; trendDesc = '越来越准，你的大脑在实时学习';
  } else if (absPercents[2] > absPercents[0] && absPercents[1] >= absPercents[0]) {
    trendLabel = '逐渐失焦型'; trendDesc = '越来越偏，你的耐心电池在衰减';
  } else if (volatility < 12) {
    trendLabel = '稳定偏移型'; trendDesc = '三次一致地偏移，内部时钟有固定偏差';
  } else {
    trendLabel = '混沌波动型'; trendDesc = '忽快忽慢，时间感取决于当下状态';
  }
  return { avgPercent, volatility, character, trendLabel, trendDesc, percents };
}

// --- 生成钟表刻度 & 数字（SVG 版本，viewBox 200x200，圆心 100,100 半径 92） ---
function renderClockTicks() {
  const ticksG = document.getElementById('clock-ticks-svg');
  const numsG = document.getElementById('clock-nums-svg');
  if (!ticksG || !numsG) return;
  ticksG.innerHTML = '';
  numsG.innerHTML = '';
  const svgNS = 'http://www.w3.org/2000/svg';
  const cx = 100, cy = 100;
  const rOuter = 92;
  const rMajor = 84;
  const rMinor = 88;
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * Math.PI / 180; // -90 让 0 在 12 点
    const isMajor = i % 3 === 0;
    const rIn = isMajor ? rMajor : rMinor;
    const x1 = cx + Math.cos(angle) * rOuter;
    const y1 = cy + Math.sin(angle) * rOuter;
    const x2 = cx + Math.cos(angle) * rIn;
    const y2 = cy + Math.sin(angle) * rIn;
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('class', isMajor ? 'tick-major' : 'tick-minor');
    ticksG.appendChild(line);
  }
  const rNum = 76;
  const nums = [
    { num: 'XII', a: -90 },
    { num: 'III', a: 0 },
    { num: 'VI',  a: 90 },
    { num: 'IX',  a: 180 },
  ];
  nums.forEach(({ num, a }) => {
    const rad = a * Math.PI / 180;
    const x = cx + Math.cos(rad) * rNum;
    const y = cy + Math.sin(rad) * rNum;
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('class', 'clock-num');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.textContent = num;
    numsG.appendChild(t);
  });
}

function showResult() {
  const { avgPercent, character, trendLabel, trendDesc, percents } = calculateResult();

  // result-no 已删除，character.no 不再渲染到页面

  const absAvg = Math.abs(avgPercent).toFixed(0);
  const dir = avgPercent < -1 ? '快' : avgPercent > 1 ? '慢' : '精准';
  const speedEl = document.getElementById('res-speed');
  if (dir === '精准') {
    speedEl.innerHTML = `精准 <span class="pct">±0%</span>`;
    speedEl.classList.remove('fast');
  } else {
    speedEl.innerHTML = `${dir} ${absAvg}<span class="pct">%</span>`;
    speedEl.classList.toggle('fast', dir === '快');
  }

  const flowFactor = 1 + avgPercent / 100;
  const equivMin = Math.max(1, Math.round(60 / flowFactor));
  document.getElementById('eq-hour').textContent = equivMin;
  const dailyDiff = Math.abs(Math.round((avgPercent / 100) * 24 * 60));
  document.getElementById('eq-direction').textContent = avgPercent < 0 ? '多' : '少';
  document.getElementById('eq-daily').textContent = dailyDiff;

  // 趋势柱状
  const trendEl = document.getElementById('trend-visual');
  trendEl.innerHTML = '';
  const maxAbs = Math.max(20, ...percents.map(Math.abs));
  percents.forEach((p, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'trend-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'trend-bar' + (p > 0 ? ' pos' : '');
    bar.style.height = '0px';
    const label = document.createElement('div');
    label.className = 'trend-bar-label';
    label.textContent = `R${i + 1} ${p > 0 ? '+' : ''}${p.toFixed(0)}%`;
    wrap.appendChild(bar); wrap.appendChild(label);
    trendEl.appendChild(wrap);
    setTimeout(() => {
      const ratio = Math.abs(p) / maxAbs;
      bar.style.height = `calc(${ratio * 100}% + 4px)`;
    }, 200 + i * 120);
  });
  document.getElementById('trend-label').textContent = trendLabel;
  document.getElementById('trend-desc').textContent = trendDesc;

  document.getElementById('char-tag').textContent = `「${character.tag}」`;
  document.getElementById('char-desc').textContent = character.desc;

  // 钟表外圈刻度
  renderClockTicks();

  // 表针：快 → 顺时针偏，慢 → 逆时针偏；最大 ±60°
  const hand = document.getElementById('clock-hand');
  const handAngle = Math.max(-60, Math.min(60, avgPercent * 1.5));
  // 先复位
  hand.style.transform = 'rotate(0deg)';
  // 触发布局后再设目标角度，让 transition 生效
  requestAnimationFrame(() => {
    setTimeout(() => {
      hand.style.transform = `rotate(${handAngle}deg)`;
    }, 200);
  });

  // 头像（缺图回退首字母）
  const portrait = document.getElementById('char-portrait');
  portrait.innerHTML = `<div class="portrait-placeholder">${character.name[0]}</div>`;
  const img = new Image();
  // 注意：不要设置 crossOrigin。本地静态图无需也不应触发 CORS，
  // file:// 或不带 ACAO 头的本地服务器都会让带 crossOrigin 的请求 onerror。
  // html2canvas 这边通过 allowTaint:true / freezeNameCanvasForCapture 兜底。
  img.onload = () => {
    portrait.innerHTML = '';
    portrait.appendChild(img);
  };
  img.onerror = (e) => {
    console.warn('portrait load failed:', character.img, e);
    // 保留占位首字母
  };
  img.src = character.img;

  goToPage('result');

  // 字体就绪后再启动姓名粒子（避免首屏渲染回退字体）
  ensureFontsThenRun(() => startNameParticles(character.name), 500);
}

function ensureFontsThenRun(fn, delay = 0) {
  const run = () => setTimeout(fn, delay);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(run).catch(run);
  } else {
    run();
  }
}

// --- 粒子聚合成姓名 ---
let nameParticleFrame = null;
function startNameParticles(text) {
  if (nameParticleFrame) cancelAnimationFrame(nameParticleFrame);
  const tc = document.getElementById('name-canvas');
  const tCtx = tc.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = tc.getBoundingClientRect();
  const w = Math.max(280, rect.width);
  const h = Math.max(64, rect.height);
  tc.width = w * dpr;
  tc.height = h * dpr;
  tc.style.width = w + 'px';
  tc.style.height = h + 'px';
  tCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const off = document.createElement('canvas');
  off.width = w * dpr;
  off.height = h * dpr;
  const oCtx = off.getContext('2d');
  oCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  oCtx.fillStyle = '#000';
  const fontSize = Math.min(h * 0.85, w / Math.max(2, text.length) * 1.5);
  oCtx.font = `900 ${fontSize}px "Noto Serif SC", "Songti SC", serif`;
  oCtx.textAlign = 'center';
  oCtx.textBaseline = 'middle';
  oCtx.fillText(text, w / 2, h / 2);

  const imageData = oCtx.getImageData(0, 0, off.width, off.height);
  const targets = [];
  const step = Math.max(2, Math.floor(dpr * 2));
  for (let y = 0; y < imageData.height; y += step) {
    for (let x = 0; x < imageData.width; x += step) {
      const idx = (y * imageData.width + x) * 4;
      if (imageData.data[idx + 3] > 128) {
        targets.push([x / dpr, y / dpr]);
      }
    }
  }
  const maxParticles = 520;
  const selectedTargets = targets.length > maxParticles
    ? targets.filter((_, i) => i % Math.ceil(targets.length / maxParticles) === 0).slice(0, maxParticles)
    : targets;

  const particles = selectedTargets.map(t => {
    const fromEdge = Math.random();
    let sx, sy;
    if (fromEdge < 0.25) { sx = Math.random() * w; sy = -20; }
    else if (fromEdge < 0.5) { sx = w + 20; sy = Math.random() * h; }
    else if (fromEdge < 0.75) { sx = Math.random() * w; sy = h + 20; }
    else { sx = -20; sy = Math.random() * h; }
    return {
      x: sx, y: sy, tx: t[0], ty: t[1],
      r: 1.4 + Math.random() * 0.6,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      delay: Math.floor(Math.random() * 24),
    };
  });

  let frame = 0;
  const totalFrames = 80;
  function animate() {
    tCtx.clearRect(0, 0, w, h);
    frame++;
    particles.forEach(p => {
      if (frame < p.delay) return;
      const localFrame = frame - p.delay;
      const progress = Math.min(localFrame / totalFrames, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      if (progress < 1) {
        p.x += (p.tx - p.x) * (0.05 + ease * 0.18) + p.vx * (1 - ease) * 0.5;
        p.y += (p.ty - p.y) * (0.05 + ease * 0.18) + p.vy * (1 - ease) * 0.5;
        p.vx *= 0.92; p.vy *= 0.92;
      } else {
        p.x = p.tx + (Math.random() - 0.5) * 0.7;
        p.y = p.ty + (Math.random() - 0.5) * 0.7;
      }
      const alpha = 0.55 + ease * 0.45;
      tCtx.beginPath();
      tCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      tCtx.fillStyle = `rgba(26, 26, 26, ${alpha})`;
      tCtx.fill();
    });
    if (frame < totalFrames + 60) {
      nameParticleFrame = requestAnimationFrame(animate);
    } else {
      // 定格为完整字形：略小半径 + 满不透明，提高可读性
      tCtx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        tCtx.beginPath();
        tCtx.arc(p.tx, p.ty, Math.max(1, p.r - 0.2), 0, Math.PI * 2);
        tCtx.fillStyle = 'rgba(26, 26, 26, 1)';
        tCtx.fill();
      });
      nameParticleFrame = null;
    }
  }
  animate();
}

// --- 重新开始 ---
function restart() {
  stopAnim();
  if (nameParticleFrame) cancelAnimationFrame(nameParticleFrame);
  state.currentRound = 0;
  state.results = [];
  goToPage('landing');
}

// --- toast & html2canvas 保存图片 ---
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2400);
}

/**
 * 把 #name-canvas 临时替换为同尺寸的 <img>（dataURL），
 * 避免 html2canvas 在某些环境下读取 canvas 像素时出错。
 * 返回一个 restore() 函数。
 */
function freezeNameCanvasForCapture() {
  const nc = document.getElementById('name-canvas');
  if (!nc) return () => {};
  try {
    const dataUrl = nc.toDataURL('image/png');
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.width = nc.style.width || (nc.offsetWidth + 'px');
    img.style.height = nc.style.height || (nc.offsetHeight + 'px');
    img.style.display = 'block';
    img.style.maxWidth = '360px';
    img.style.width = '100%';
    img.dataset.frozen = '1';
    nc.style.display = 'none';
    nc.parentNode.insertBefore(img, nc.nextSibling);
    return () => {
      img.remove();
      nc.style.display = '';
    };
  } catch (e) {
    console.warn('name-canvas freeze failed:', e);
    return () => {};
  }
}

async function saveImage() {
  if (typeof html2canvas === 'undefined') {
    showToast('图片组件未就绪，请稍后再试');
    return;
  }
  const card = document.getElementById('result-card');
  showToast('正在生成图片');

  // 等姓名粒子动画收敛
  await new Promise(res => setTimeout(res, 250));
  // 字体保险
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) { /* noop */ }
  }

  const restoreCanvas = freezeNameCanvasForCapture();
  card.classList.add('capture-mode');

  try {
    const canvasOut = await html2canvas(card, {
      backgroundColor: '#f5f2ed',
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: false,
      allowTaint: true,
      logging: false,
      foreignObjectRendering: false,
      // 强制使用当前可见尺寸，避免 1240px max-width 抓到超大空白
      width: card.offsetWidth,
      height: card.offsetHeight,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    });

    const charName = (document.querySelector('#char-tag').textContent || '').replace(/[「」]/g, '').trim() || '我的时间人格';
    const filename = `时间人格_${charName}_${Date.now()}.png`;

    // 尝试 Web Share（仅移动端；桌面端 canShare 误报会导致系统弹窗报错）
    const blob = await new Promise(res => canvasOut.toBlob(res, 'image/png'));
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (blob && isMobile && navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: '我的时间人格', text: charName });
          showToast('已分享');
          return;
        }
      } catch (e) { /* fallback to download */ }
    }
    // 桌面端：触发下载（用 blob URL 而非 dataURL，避免巨大字符串延迟）
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
    showToast('已保存到下载文件夹');
  } catch (err) {
    console.error('saveImage failed:', err);
    showToast('生成失败，可长按截图保存');
  } finally {
    card.classList.remove('capture-mode');
    restoreCanvas();
  }
}

// 初始化
startAnim('none');