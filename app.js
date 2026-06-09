// ============================
// 时间感校准实验室 v2 - 杂志风重制版
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

// --- Canvas 动效系统 ---
const canvas = document.getElementById('anim-canvas');
const ctx = canvas.getContext('2d');
let animFrame = null;
let animElements = [];
let currentAnim = 'none';

function resizeCanvas() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 三轮动效主题：每轮风格不同但视觉统一（线条/点/几何，浅色系）
const animThemes = {
  // 第一轮：缓慢漂浮的细线段，像水面涟漪
  ripple: {
    init(w, h) {
      const els = [];
      for (let i = 0; i < 20; i++) {
        els.push({
          x: Math.random() * w, y: Math.random() * h,
          len: 30 + Math.random() * 60,
          angle: Math.random() * Math.PI * 2,
          speed: 0.1 + Math.random() * 0.2,
          drift: (Math.random() - 0.5) * 0.003,
          opacity: 0.08 + Math.random() * 0.12,
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
        if (e.x < -80) e.x = w + 80;
        if (e.x > w + 80) e.x = -80;
        if (e.y < -80) e.y = h + 80;
        if (e.y > h + 80) e.y = -80;

        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.angle) * e.len, e.y + Math.sin(e.angle) * e.len);
        ctx.strokeStyle = `rgba(26, 26, 26, ${e.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
  },
  // 第二轮：同心圆慢慢扩散消失
  pulse: {
    init(w, h) {
      const els = [];
      for (let i = 0; i < 5; i++) {
        els.push({
          x: w / 2 + (Math.random() - 0.5) * w * 0.3,
          y: h / 2 + (Math.random() - 0.5) * h * 0.3,
          r: Math.random() * 50,
          maxR: 100 + Math.random() * 150,
          speed: 0.3 + Math.random() * 0.3,
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
          e.x = w / 2 + (Math.random() - 0.5) * w * 0.3;
          e.y = h / 2 + (Math.random() - 0.5) * h * 0.3;
        }
        const opacity = 0.12 * (1 - e.r / e.maxR);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(26, 26, 26, ${opacity})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
    }
  },
  // 第三轮：随机漂移的小圆点网格
  drift: {
    init(w, h) {
      const els = [];
      const cols = 12, rows = 16;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          els.push({
            baseX: (i + 0.5) * (w / cols),
            baseY: (j + 0.5) * (h / rows),
            offsetX: 0, offsetY: 0,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: 1.5 + Math.random() * 1.5,
          });
        }
      }
      return els;
    },
    draw(els, w, h, ctx) {
      ctx.clearRect(0, 0, w, h);
      els.forEach(e => {
        e.vx += (Math.random() - 0.5) * 0.05;
        e.vy += (Math.random() - 0.5) * 0.05;
        e.vx *= 0.98; e.vy *= 0.98;
        e.offsetX += e.vx; e.offsetY += e.vy;
        // 弹回
        if (Math.abs(e.offsetX) > 20) e.vx *= -0.5;
        if (Math.abs(e.offsetY) > 20) e.vy *= -0.5;

        ctx.beginPath();
        ctx.arc(e.baseX + e.offsetX, e.baseY + e.offsetY, e.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(26, 26, 26, 0.1)';
        ctx.fill();
      });
    }
  },
};

const roundAnimKeys = ['ripple', 'pulse', 'drift'];

function startAnim(themeName) {
  if (animFrame) cancelAnimationFrame(animFrame);
  currentAnim = themeName;
  if (themeName === 'none') { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
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
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  currentAnim = 'none';
}

// --- Audio ---
function initAudio() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}
function playBeep(freq = 800, duration = 0.08) {
  if (!state.audioCtx) return;
  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();
  osc.connect(gain); gain.connect(state.audioCtx.destination);
  osc.frequency.value = freq; osc.type = 'sine';
  gain.gain.setValueAtTime(0.2, state.audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + duration);
  osc.start(); osc.stop(state.audioCtx.currentTime + duration);
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

// --- 页面导航（带过渡动画）---
function goToPage(page) {
  const current = document.querySelector('.page.active');
  if (current) {
    current.classList.add('exit');
    current.classList.remove('active');
    setTimeout(() => current.classList.remove('exit'), 800);
  }
  setTimeout(() => {
    document.getElementById(`page-${page}`).classList.add('active');
  }, 100);
  state.currentPage = page;
  if (page === 'landing' || page === 'intro' || page === 'feedback') stopAnim();
}

function startTest() {
  initAudio();
  state.currentRound = 0;
  state.results = [];
  state.targetTimes = generateTargetTimes();
  showTestRound();
}

function showTestRound() {
  const round = state.currentRound;
  const target = state.targetTimes[round];
  document.getElementById('round-label').textContent = `Round ${round + 1} / 3`;
  document.getElementById('target-time').textContent = target;
  document.getElementById('test-ui').style.opacity = '1';
  document.getElementById('btn-ready').style.display = '';
  document.getElementById('tap-hint').classList.remove('show');
  state.isTiming = false;
  goToPage('test');
  startAnim(roundAnimKeys[round]);
}

function beginTiming() {
  document.getElementById('test-ui').style.opacity = '0';
  document.getElementById('btn-ready').style.display = 'none';
  setTimeout(() => document.getElementById('tap-hint').classList.add('show'), 500);
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
  document.getElementById('fb-round').textContent = `Round ${round + 1}`;
  document.getElementById('fb-value').textContent = r.elapsed.toFixed(1);
  document.getElementById('fb-detail').textContent = `目标 ${r.target} 秒 · 偏差 ${r.diff > 0 ? '+' : ''}${r.diff.toFixed(1)} 秒`;
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
  if (round >= 2) { btn.textContent = '查看时间人格'; btn.onclick = showResult; }
  else { btn.textContent = '下一轮'; btn.onclick = nextRound; }
  goToPage('feedback');
}

function nextRound() { state.currentRound++; showTestRound(); }

// --- 人物数据 ---
const characters = [
  { name: '拿破仑', tag: '精密加速者', desc: '他用 4 小时睡眠换取帝国版图，每一秒都被精确压榨。你的内在时钟是一台校准过的快表——始终比世界快半拍，但从不出错。', speed: 0, stability: 0, img: 'portraits/napoleon.jpg' },
  { name: '特斯拉', tag: '灵感闪电', desc: '他在雷电中看见交流电的未来，时间被思维的密度压缩。你比现实快，但快得有章法——像一颗跳动频率偏高的心脏。', speed: 0, stability: 1, img: 'portraits/tesla.jpg' },
  { name: '毕加索', tag: '时间的立体派', desc: '他把一天活成五天，但没人知道下一笔落在哪里。你的时间感像他的画——打碎了重组，每一刻都是即兴。', speed: 0, stability: 2, img: 'portraits/picasso.jpg' },
  { name: '康德', tag: '人形原子钟', desc: '柯尼斯堡的居民用他的散步时间对表。你的时间感精确得令人不安——你确定自己不是一台仪器？', speed: 1, stability: 0, img: 'portraits/kant.jpg' },
  { name: '诸葛亮', tag: '借东风的人', desc: '他算天时、度地利、量人心，对时机的拿捏从不急躁也不迟钝。你的时间感如同一位善弈者——大局了然，偶有妙手。', speed: 1, stability: 1, img: 'portraits/zhuge.jpg' },
  { name: '莫扎特', tag: '即兴变奏曲', desc: '他 5 岁作曲，35 岁燃尽，时间准不准对他毫无意义——因为每一刻都在创造。你的时间不快不慢，但从不重复。', speed: 1, stability: 2, img: 'portraits/mozart.jpg' },
  { name: '达尔文', tag: '地质纪年者', desc: '他花 20 年写一本书，像地层一样缓慢而确定地堆积证据。你的内在时钟比现实慢半拍，但这份从容是一种罕见的定力。', speed: 2, stability: 0, img: 'portraits/darwin.jpg' },
  { name: '村上春树', tag: '长跑节拍器', desc: '每天凌晨 4 点起床，用重复抵抗混沌。你的时间流得比别人慢一些，像长距离跑者的呼吸——稳中带着微微的起伏。', speed: 2, stability: 1, img: 'portraits/murakami.jpg' },
  { name: '李白', tag: '醉中仙', desc: '他举杯邀月、对影成三人，时间在他那里是一壶酒的事。你的内在时钟散漫、自在、不可捉摸——天地间一蜉蝣，何必计较快慢。', speed: 2, stability: 2, img: 'portraits/libai.jpg' },
];

// --- 结果计算 ---
function calculateResult() {
  const percents = state.results.map(r => r.percent);
  const avgPercent = percents.reduce((a, b) => a + b, 0) / percents.length;
  const volatility = Math.max(...percents) - Math.min(...percents);

  let speedIdx = avgPercent < -10 ? 0 : avgPercent > 10 ? 2 : 1;
  let stabilityIdx = volatility < 12 ? 0 : volatility < 28 ? 1 : 2;
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

function showResult() {
  const { avgPercent, character, trendLabel, trendDesc, percents } = calculateResult();

  // 核心数据
  const absAvg = Math.abs(avgPercent).toFixed(0);
  const dir = avgPercent < -1 ? '快' : avgPercent > 1 ? '慢' : '精准';
  document.getElementById('res-speed').innerHTML = dir === '精准'
    ? '精准 <span class="unit">±0%</span>'
    : `${dir} ${absAvg}<span class="unit">%</span>`;

  const equivMin = (60 * (1 + avgPercent / 100)).toFixed(0);
  document.getElementById('res-equiv').textContent = `你的体感 1 小时 = 现实 ${equivMin} 分钟`;
  const dailyDiff = Math.abs((avgPercent / 100) * 24 * 60).toFixed(0);
  document.getElementById('res-daily').textContent = `你每天比别人${avgPercent < 0 ? '多' : '少'}"活" ${dailyDiff} 分钟`;

  // 趋势柱状图
  const trendEl = document.getElementById('trend-visual');
  trendEl.innerHTML = '';
  const maxAbs = Math.max(30, ...percents.map(Math.abs));
  percents.forEach((p, i) => {
    const bar = document.createElement('div');
    bar.className = 'trend-bar';
    bar.style.height = `${Math.abs(p) / maxAbs * 50 + 10}px`;
    bar.style.background = p < 0 ? '#1a1a1a' : '#a0a0a0';
    bar.dataset.label = `R${i + 1}: ${p > 0 ? '+' : ''}${p.toFixed(0)}%`;
    trendEl.appendChild(bar);
  });
  document.getElementById('trend-label').textContent = trendLabel;
  document.getElementById('trend-desc').textContent = trendDesc;

  // 人物
  document.getElementById('char-name').textContent = character.name;
  document.getElementById('char-tag').textContent = `「${character.tag}」`;
  document.getElementById('char-desc').textContent = character.desc;

  // 人物照片（如果存在）
  const portrait = document.getElementById('char-portrait');
  const img = new Image();
  img.src = character.img;
  img.onload = () => {
    portrait.innerHTML = '';
    portrait.appendChild(img);
  };

  goToPage('result');

  // 粒子聚合文字动画
  setTimeout(() => startTextParticles(character.name), 600);
}

// --- 粒子聚合成文字 ---
function startTextParticles(text) {
  const tc = document.getElementById('char-text-canvas');
  const tCtx = tc.getContext('2d');
  const w = 280, h = 80;
  tc.width = w * devicePixelRatio;
  tc.height = h * devicePixelRatio;
  tc.style.width = w + 'px';
  tc.style.height = h + 'px';
  tCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  // 用 canvas 渲染文字并扫描像素得到目标点
  tCtx.clearRect(0, 0, w, h);
  tCtx.fillStyle = '#000';
  tCtx.font = `bold ${Math.min(36, w / text.length * 1.2)}px "Noto Serif SC", serif`;
  tCtx.textAlign = 'center';
  tCtx.textBaseline = 'middle';
  tCtx.fillText(text, w / 2, h / 2);

  const imageData = tCtx.getImageData(0, 0, w * devicePixelRatio, h * devicePixelRatio);
  const targets = [];
  const step = 3; // 采样间隔
  for (let y = 0; y < imageData.height; y += step) {
    for (let x = 0; x < imageData.width; x += step) {
      const idx = (y * imageData.width + x) * 4;
      if (imageData.data[idx + 3] > 128) {
        targets.push([x / devicePixelRatio, y / devicePixelRatio]);
      }
    }
  }

  // 限制粒子数
  const maxParticles = 300;
  const selectedTargets = targets.length > maxParticles
    ? targets.filter((_, i) => i % Math.ceil(targets.length / maxParticles) === 0).slice(0, maxParticles)
    : targets;

  // 初始化粒子（从随机位置出发）
  const particles = selectedTargets.map(t => ({
    x: Math.random() * w, y: Math.random() * h,
    tx: t[0], ty: t[1], r: 1.2,
    vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
  }));

  let frame = 0;
  const totalFrames = 90;

  function animate() {
    tCtx.clearRect(0, 0, w, h);
    frame++;
    const progress = Math.min(frame / totalFrames, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    particles.forEach(p => {
      if (progress < 1) {
        p.x += (p.tx - p.x) * ease * 0.08 + p.vx * (1 - ease);
        p.y += (p.ty - p.y) * ease * 0.08 + p.vy * (1 - ease);
        p.vx *= 0.95; p.vy *= 0.95;
      } else {
        p.x = p.tx + (Math.random() - 0.5) * 0.8;
        p.y = p.ty + (Math.random() - 0.5) * 0.8;
      }
      tCtx.beginPath();
      tCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      tCtx.fillStyle = `rgba(26, 26, 26, ${0.6 + ease * 0.4})`;
      tCtx.fill();
    });

    if (frame < totalFrames + 60) {
      requestAnimationFrame(animate);
    }
  }
  animate();
}

// --- 重新开始 & 分享 ---
function restart() {
  stopAnim();
  state.currentRound = 0;
  state.results = [];
  goToPage('landing');
}

function shareResult() {
  // 提示截图
  const card = document.getElementById('result-card');
  card.style.boxShadow = '0 0 0 2px var(--border)';
  setTimeout(() => { card.style.boxShadow = ''; },2000);
  if (navigator.share) {
    navigator.share({ title: '我的时间人格', text: document.getElementById('char-name').textContent + ' — ' + document.getElementById('char-tag').textContent });
  } else {
    alert('长按截图保存，分享给朋友看看你的时间人格');
  }
}

// --- 初始化 ---
startAnim('none');