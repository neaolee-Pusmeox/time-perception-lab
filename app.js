// ============================
// 时间感校准实验室 - 核心逻辑
// ============================

// --- 全局状态 ---
const state = {
  currentPage: 'landing',
  currentRound: 0,
  targetTimes: [],
  results: [],
  isTiming: false,
  startTime: 0,
  audioCtx: null,
};

// --- 粒子系统 ---
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let currentTheme = 'landing';
let animFrameId = null;

const themes = {
  landing: {
    bg: '#0a0a0f',
    count: 30,
    radiusRange: [2, 4],
    colorFn: () => `hsla(${200 + Math.random() * 40}, 50%, 60%, ${0.2 + Math.random() * 0.3})`,
    speedRange: [0.1, 0.2],
    connectDist: 0,
  },
  ocean: {
    bg: null, // gradient
    bgGradient: (ctx, w, h) => {
      const g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h) * 0.7);
      g.addColorStop(0, '#0d2b3e');
      g.addColorStop(1, '#0a1628');
      return g;
    },
    count: 40,
    radiusRange: [2, 8],
    colorFn: () => `hsla(${170 + Math.random() * 30}, ${60 + Math.random() * 20}%, ${50 + Math.random() * 20}%, ${0.2 + Math.random() * 0.4})`,
    speedRange: [0.1, 0.3],
    connectDist: 0,
  },
  cosmos: {
    bg: '#000000',
    count: 100,
    radiusRange: [1, 3],
    colorFn: () => `hsla(${30 + Math.random() * 20}, ${40 + Math.random() * 40}%, ${70 + Math.random() * 20}%, ${0.5 + Math.random() * 0.5})`,
    speedRange: [0.2, 0.5],
    connectDist: 0,
    twinkle: true,
  },
  micro: {
    bg: '#0f0f1a',
    count: 50,
    radiusRange: [3, 5],
    colorFn: () => {
      const isCyan = Math.random() < 0.2;
      if (isCyan) return `hsla(${140 + Math.random() * 40}, 70%, 60%, 0.7)`;
      return `hsla(${280 + Math.random() * 60}, 70%, ${60 + Math.random() * 20}%, 0.7)`;
    },
    speedRange: [0.5, 1.0],
    connectDist: 80,
    repulsion: true,
  },
};

const roundThemes = ['ocean', 'cosmos', 'micro'];

function resizeCanvas() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
}

function createParticles(themeName) {
  const theme = themes[themeName];
  particles = [];
  const w = window.innerWidth, h = window.innerHeight;
  for (let i = 0; i < theme.count; i++) {
    const r = theme.radiusRange[0] + Math.random() * (theme.radiusRange[1] - theme.radiusRange[0]);
    const speed = theme.speedRange[0] + Math.random() * (theme.speedRange[1] - theme.speedRange[0]);
    const angle = Math.random() * Math.PI * 2;
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: theme.colorFn(),
      opacity: 0.5 + Math.random() * 0.5,
      twinklePhase: Math.random() * 1000,
    });
  }
}

function drawParticles(themeName) {
  const theme = themes[themeName];
  const w = window.innerWidth, h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);

  // Background
  if (theme.bgGradient) {
    ctx.fillStyle = theme.bgGradient(ctx, w, h);
  } else {
    ctx.fillStyle = theme.bg;
  }
  ctx.fillRect(0, 0, w, h);

  // Update & draw particles
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    // Brownian motion: add random nudge each frame
    p.vx += (Math.random() - 0.5) * 0.1;
    p.vy += (Math.random() - 0.5) * 0.1;
    // Clamp speed
    const maxSpd = theme.speedRange[1] * 1.5;
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (spd > maxSpd) { p.vx *= maxSpd / spd; p.vy *= maxSpd / spd; }

    p.x += p.vx;
    p.y += p.vy;

    // Bounce or wrap
    if (theme.repulsion) {
      if (p.x < p.r || p.x > w - p.r) p.vx *= -1;
      if (p.y < p.r || p.y > h - p.r) p.vy *= -1;
      p.x = Math.max(p.r, Math.min(w - p.r, p.x));
      p.y = Math.max(p.r, Math.min(h - p.r, p.y));
    } else {
      if (p.x < -p.r) p.x = w + p.r;
      if (p.x > w + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = h + p.r;
      if (p.y > h + p.r) p.y = -p.r;
    }

    // Repulsion between particles
    if (theme.repulsion) {
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = q.x - p.x, dy = q.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40 && dist > 0) {
          const force = 0.05 / dist;
          p.vx -= dx * force; p.vy -= dy * force;
          q.vx += dx * force; q.vy += dy * force;
        }
      }
    }

    // Twinkle
    let alpha = p.opacity;
    if (theme.twinkle) {
      p.twinklePhase += 0.01 + Math.random() * 0.02;
      if (Math.sin(p.twinklePhase) > 0.95) alpha = 1;
    }

    // Draw
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Connection lines (micro theme)
  if (theme.connectDist > 0) {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[j].x - particles[i].x;
        const dy = particles[j].y - particles[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < theme.connectDist) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(200, 180, 255, ${0.08 * (1 - dist / theme.connectDist)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  animFrameId = requestAnimationFrame(() => drawParticles(themeName));
}

function switchTheme(themeName) {
  currentTheme = themeName;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  createParticles(themeName);
  drawParticles(themeName);
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
  osc.connect(gain);
  gain.connect(state.audioCtx.destination);
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.3, state.audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + duration);
  osc.start();
  osc.stop(state.audioCtx.currentTime + duration);
}

// --- 时长生成 ---
function generateTargetTimes() {
  // 在 5-20 之间生成三个值，相邻差值 >= 4，顺序打乱
  let times = [];
  const min = 5, max = 20, minGap = 4;
  let attempts = 0;
  while (attempts < 100) {
    const a = min + Math.floor(Math.random() * (max - min + 1));
    const b = min + Math.floor(Math.random() * (max - min + 1));
    const c = min + Math.floor(Math.random() * (max - min + 1));
    const sorted =[a, b, c].sort((x, y) => x - y);
    if (sorted[1] - sorted[0] >= minGap && sorted[2] - sorted[1] >= minGap) {
      // Shuffle
      times = [a, b, c].sort(() => Math.random() - 0.5);
      break;
    }
    attempts++;
  }
  if (times.length === 0) times = [6, 12, 19]; // fallback
  return times;
}

// --- 页面导航 ---
function goToPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  state.currentPage = page;

  if (page === 'landing' || page === 'intro') {
    switchTheme('landing');
  }
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
  document.getElementById('round-label').textContent = `第 ${round + 1} 轮`;
  document.getElementById('target-time').textContent = target;
  document.getElementById('test-info').style.opacity = '1';
  document.getElementById('btn-ready').style.display = '';
  document.getElementById('tap-hint').classList.remove('visible');
  state.isTiming = false;
  goToPage('test');
  switchTheme(roundThemes[round]);
}

function beginTiming() {
  // 淡出 UI
  document.getElementById('test-info').style.opacity = '0';
  document.getElementById('btn-ready').style.display = 'none';
  setTimeout(() => {
    document.getElementById('tap-hint').classList.add('visible');
  }, 500);
  // 起始提示音
  playBeep(880, 0.1);
  // 开始计时
  state.startTime = performance.now();
  state.isTiming = true;
}

// 全屏点击事件（计时态）
document.getElementById('page-test').addEventListener('pointerdown', (e) => {
  if (!state.isTiming) return;
  if (e.target.tagName === 'BUTTON') return;
  e.preventDefault();
  const elapsed = (performance.now() - state.startTime) / 1000;
  state.isTiming = false;
  playBeep(660, 0.08);
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
  document.getElementById('fb-round').textContent = `第 ${round + 1} 轮结果`;
  document.getElementById('fb-value').textContent = `${r.elapsed.toFixed(1)} 秒`;
  document.getElementById('fb-detail').textContent = `目标 ${r.target} 秒 · 偏差 ${r.diff > 0 ? '+' : ''}${r.diff.toFixed(1)} 秒`;

  const absPercent = Math.abs(r.percent).toFixed(0);
  if (r.diff < -0.3) {
    document.getElementById('fb-percent').textContent = `快了 ${absPercent}%`;
    document.getElementById('fb-comment').textContent = '你的时间跑得比现实快一拍';
  } else if (r.diff > 0.3) {
    document.getElementById('fb-percent').textContent = `慢了 ${absPercent}%`;
    document.getElementById('fb-comment').textContent = '你的时间比现实流得更从容';
  } else {
    document.getElementById('fb-percent').textContent = '几乎精准';
    document.getElementById('fb-comment').textContent = '你的内在时钟校准得令人惊叹';
  }

  const btnNext = document.getElementById('btn-next');
  if (round >= 2) {
    btnNext.textContent = '查看我的时间人格';
    btnNext.onclick = showResult;
  } else {
    btnNext.textContent = '进入下一轮';
    btnNext.onclick = nextRound;
  }
  goToPage('feedback');
}

function nextRound() {
  state.currentRound++;
  showTestRound();
}

// --- 结果计算 ---
const characters = [
  // [快慢][稳定性] -> 0:快 1:中 2:慢 x 0:稳 1:中 2:混
  { name: '拿破仑', tag: '精密加速者', desc: '他用 4 小时睡眠换取帝国版图，每一秒都被精确压榨。你的内在时钟是一台校准过的快表——始终比世界快半拍，但从不出错。', speed: 0, stability: 0 },
  { name: '尼古拉·特斯拉', tag: '灵感闪电', desc: '他在雷电中看见交流电的未来，时间被思维的密度压缩。你比现实快，但快得有章法——像一颗跳动频率偏高的心脏。', speed: 0, stability: 1 },
  { name: '毕加索', tag: '时间的立体派', desc: '他把一天活成五天，但没人知道下一笔落在哪里。你的时间感像他的画——打碎了重组，每一刻都是即兴。', speed: 0, stability: 2 },
  { name: '康德', tag: '人形原子钟', desc: '柯尼斯堡的居民用他的散步时间对表。你的时间感精确得令人不安——你确定自己不是一台仪器？', speed: 1, stability: 0 },
  { name: '诸葛亮', tag: '借东风的人', desc: '他算天时、度地利、量人心，对时机的拿捏从不急躁也不迟钝。你的时间感如同一位善弈者——大局了然，偶有妙手。', speed: 1, stability: 1 },
  { name: '莫扎特', tag: '即兴变奏曲', desc: '他 5 岁作曲，35 岁燃尽，时间准不准对他毫无意义——因为每一刻都在创造。你的时间不快不慢，但从不重复。', speed: 1, stability: 2 },
  { name: '达尔文', tag: '地质纪年者', desc: '他花 20 年写一本书，像地层一样缓慢而确定地堆积证据。你的内在时钟比现实慢半拍，但这份从容是一种罕见的定力。', speed: 2, stability: 0 },
  { name: '村上春树', tag: '长跑节拍器', desc: '每天凌晨 4 点起床，用重复抵抗混沌。你的时间流得比别人慢一些，像长距离跑者的呼吸——稳中带着微微的起伏。', speed: 2, stability: 1 },
  { name: '李白', tag: '醉中仙', desc: '他举杯邀月、对影成三人，时间在他那里是一壶酒的事。你的内在时钟散漫、自在、不可捉摸——天地间一蜉蝣，何必计较快慢。', speed: 2, stability: 2 },
];

function calculateResult() {
  const percents = state.results.map(r => r.percent);
  const avgPercent = percents.reduce((a, b) => a + b, 0) / percents.length;
  const volatility = Math.max(...percents) - Math.min(...percents);

  // 快慢维度: 正值 = 用户点早了 = 觉得时间过得快 (注意：偏差 = elapsed - target)
  // elapsed < target → diff 为负 → percent 为负 → 用户感觉时间快（提前点了）
  // 所以 percent < -10 是"快"，percent > 10 是"慢"
  let speedIdx;
  if (avgPercent < -10) speedIdx = 0; // 偏快
  else if (avgPercent > 10) speedIdx = 2; // 偏慢
  else speedIdx = 1; // 居中

  let stabilityIdx;
  if (volatility < 12) stabilityIdx = 0;
  else if (volatility < 28) stabilityIdx = 1;
  else stabilityIdx = 2;

  const character = characters.find(c => c.speed === speedIdx && c.stability === stabilityIdx);

  // 趋势判定
  const absPercents = percents.map(Math.abs);
  let trendLabel, trendDesc;
  if (absPercents[2] < absPercents[0] && absPercents[1] <= absPercents[0]) {
    trendLabel = '逐渐校准型';
    trendDesc = '越来越准，你的大脑在实时学习';
  } else if (absPercents[2] > absPercents[0] && absPercents[1] >= absPercents[0]) {
    trendLabel = '逐渐失焦型';
    trendDesc = '越来越偏，你的耐心电池在衰减';
  } else if (volatility < 12) {
    trendLabel = '稳定偏移型';
    trendDesc = '三次一致地偏移，内部时钟有固定偏差';
  } else {
    trendLabel = '混沌波动型';
    trendDesc = '忽快忽慢，时间感取决于当下状态';
  }

  return { avgPercent, volatility, character, trendLabel, trendDesc, percents };
}

function showResult() {
  const result = calculateResult();
  const { avgPercent, character, trendLabel, trendDesc, percents } = result;

  // 核心数据
  const absAvg = Math.abs(avgPercent).toFixed(0);
  const direction = avgPercent < -1 ? '快' : avgPercent > 1 ? '慢' : '≈';
  document.getElementById('res-speed').innerHTML = direction === '≈'
    ? '精准 <span>±0%</span>'
    : `${direction} ${absAvg}<span>%</span>`;

  const equivMinutes = (60 * (1 + avgPercent / 100)).toFixed(0);
  document.getElementById('res-equiv').textContent = `你的体感 1 小时 = 现实 ${equivMinutes} 分钟`;
  const dailyDiff = Math.abs(((avgPercent / 100) * 24 * 60)).toFixed(0);
  const dailyWord = avgPercent < 0 ? '多' : '少';
  document.getElementById('res-daily').textContent = `你每天比别人${dailyWord}"活" ${dailyDiff} 分钟`;

  // 趋势
  document.getElementById('trend-label').textContent = trendLabel;
  document.getElementById('trend-desc').textContent = trendDesc;
  drawTrendChart(percents);

  // 人物
  document.getElementById('char-name').textContent = character.name;
  document.getElementById('char-tag').textContent = `「${character.tag}」`;
  document.getElementById('char-desc').textContent = character.desc;

  goToPage('result');
  switchTheme('landing');

  // 粒子聚合动画（延迟执行）
  setTimeout(() => {
    startCharacterAnimation(character.name);
  }, 800);
}

function drawTrendChart(percents) {
  const chartCanvas = document.getElementById('trend-chart');
  const cCtx = chartCanvas.getContext('2d');
  const w = chartCanvas.width = chartCanvas.offsetWidth * devicePixelRatio;
  const h = chartCanvas.height = chartCanvas.offsetHeight * devicePixelRatio;
  cCtx.scale(devicePixelRatio, devicePixelRatio);
  const cw = chartCanvas.offsetWidth, ch = chartCanvas.offsetHeight;
  cCtx.clearRect(0, 0, cw, ch);

  // 零线
  const midY = ch / 2;
  cCtx.strokeStyle = 'rgba(255,255,255,0.1)';
  cCtx.lineWidth = 1;
  cCtx.setLineDash([4, 4]);
  cCtx.beginPath();
  cCtx.moveTo(40, midY);
  cCtx.lineTo(cw - 40, midY);
  cCtx.stroke();
  cCtx.setLineDash([]);

  // 数据点
  const maxAbs = Math.max(30, ...percents.map(Math.abs));
  const points = percents.map((p, i) => ({
    x: 40 + (i / 2) * (cw - 80),
    y: midY - (p / maxAbs) * (ch / 2 - 10),
  }));

  // 连线
  cCtx.strokeStyle = 'rgba(255,255,255,0.4)';
  cCtx.lineWidth = 2;
  cCtx.beginPath();
  points.forEach((pt, i) => i === 0 ? cCtx.moveTo(pt.x, pt.y) : cCtx.lineTo(pt.x, pt.y));
  cCtx.stroke();

  // 点
  points.forEach((pt, i) => {
    cCtx.beginPath();
    cCtx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    cCtx.fillStyle = percents[i] < 0 ? '#5bb5e0' : '#e07b5b';
    cCtx.fill();
    // Label
    cCtx.fillStyle = '#a0a0b0';
    cCtx.font = '11px sans-serif';
    cCtx.textAlign = 'center';
    cCtx.fillText(`${percents[i] > 0 ? '+' : ''}${percents[i].toFixed(0)}%`, pt.x, pt.y - 12);
  });

  // 标签
  cCtx.fillStyle = '#606070';
  cCtx.font = '10px sans-serif';
  cCtx.textAlign = 'center';
  points.forEach((pt, i) => {
    cCtx.fillText(`第${i + 1}轮`, pt.x, ch - 4);
  });
}

// --- 粒子聚合动效 ---
// 人物轮廓采样点数据（简化版 - 每人250个点）
const characterPaths = {};

// 生成符号化轮廓采样点
function generateCharacterPoints(name) {
  const points = [];
  const cx = 150, cy = 150;
  // 每个人物用特征符号生成点位
  switch (name) {
    case '拿破仑': // 双角帽轮廓
      generateHatShape(points, cx, cy);
      break;
    case '尼古拉·特斯拉': // 闪电 + 头像轮廓
      generateTeslaShape(points, cx, cy);
      break;
    case '毕加索': // 立体派碎片面孔
      generatePicassoShape(points, cx, cy);
      break;
    case '康德': // 直立人形 + 圆顶帽
      generateKantShape(points, cx, cy);
      break;
    case '诸葛亮': // 羽扇 + 纶巾
      generateZhugeShape(points, cx, cy);
      break;
    case '莫扎特': // 假发 + 音符
      generateMozartShape(points, cx, cy);
      break;
    case '达尔文': // 树形（进化树）
      generateDarwinShape(points, cx, cy);
      break;
    case '村上春树': // 跑步人形
      generateMurakamiShape(points, cx, cy);
      break;
    case '李白': // 举杯 + 月亮
      generateLibaiShape(points, cx, cy);
      break;
  }
  return points;
}

// 辅助：沿路径等距采样
function samplePath(pathPoints, count) {
  const result = [];
  const totalLen = pathLength(pathPoints);
  const step = totalLen / count;
  let dist = 0, idx = 0;
  for (let i = 0; i < count; i++) {
    const targetDist = i * step;
    while (idx < pathPoints.length - 1) {
      const dx = pathPoints[idx + 1][0] - pathPoints[idx][0];
      const dy = pathPoints[idx + 1][1] - pathPoints[idx][1];
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (dist + segLen >= targetDist) {
        const t = (targetDist - dist) / segLen;
        result.push([
          pathPoints[idx][0] + dx * t,
          pathPoints[idx][1] + dy * t
        ]);
        break;
      }
      dist += segLen;
      idx++;
    }
    if (result.length <= i) result.push(pathPoints[pathPoints.length - 1]);
  }
  return result;
}

function pathLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i-1][0], dy = pts[i][1] - pts[i-1][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

// --- 九个人物的形状生成 ---
// 每个函数生成约250个坐标点 [x, y]，画布300x300

function generateHatShape(points) {
  // 拿破仑：双角帽侧影 + 头部轮廓
  const hat = [];
  // 帽子左角
  for (let t = 0; t <= 1; t += 0.02) {
    hat.push([60 + t * 30, 100 - Math.sin(t * Math.PI) * 40]);
  }
  // 帽顶
  for (let t = 0; t <= 1; t += 0.01) {
    hat.push([90 + t * 120, 60 + Math.sin(t * Math.PI) * 8]);
  }
  // 帽子右角
  for (let t = 0; t <= 1; t += 0.02) {
    hat.push([210 + t * 30, 100 - Math.sin(t * Math.PI) * 40]);
  }
  // 帽檐
  for (let t = 0; t <= 1; t += 0.01) {
    hat.push([70 + t * 160, 105]);
  }
  // 头部椭圆
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    hat.push([150 + Math.cos(a) * 35, 155 + Math.sin(a) * 40]);
  }
  // 肩膀
  for (let t = 0; t <= 1; t += 0.02) {
    hat.push([100 + t * 100, 200 + Math.sin(t * Math.PI) * 10]);
  }
  const sampled = samplePath(hat, 250);
  points.push(...sampled);
}

function generateTeslaShape(points) {
  // 特斯拉：闪电符号 + 圆形头部
  const shape = [];
  // 头部圆
  for (let a = 0; a < Math.PI * 2; a += 0.06) {
    shape.push([150 + Math.cos(a) * 30, 80 + Math.sin(a) * 30]);
  }
  // 身体
  for (let t = 0; t <= 1; t += 0.02) {
    shape.push([150, 110 + t * 60]);
  }
  // 闪电（右侧）
  const lightning = [[200, 60], [185, 110], [210, 110], [180, 170], [205, 170], [175, 240]];
  for (let i = 0; i < lightning.length - 1; i++) {
    for (let t = 0; t <= 1; t += 0.03) {
      shape.push([
        lightning[i][0] + (lightning[i+1][0] - lightning[i][0]) * t,
        lightning[i][1] + (lightning[i+1][1] - lightning[i][1]) * t,
      ]);
    }
  }
  // 电弧线条
  for (let a = 0; a < Math.PI; a += 0.04) {
    shape.push([80 + a * 30, 200 + Math.sin(a * 5) * 15]);
  }
  const sampled = samplePath(shape, 250);
  points.push(...sampled);
}

function generatePicassoShape(points) {
  // 毕加索：立体派面孔（不对称几何碎片）
  const shape = [];
  // 左眼（三角形）
  const eye1 = [[100, 100], [120, 80], [130, 110], [100, 100]];
  eye1.forEach((p, i) => { if (i < eye1.length - 1) for (let t = 0; t <= 1; t += 0.04) shape.push([eye1[i][0] + (eye1[i+1][0]-eye1[i][0])*t, eye1[i][1] + (eye1[i+1][1]-eye1[i][1])*t]); });
  // 右眼（圆形偏上）
  for (let a = 0; a < Math.PI * 2; a += 0.08) shape.push([190 + Math.cos(a) * 15, 90 + Math.sin(a) * 12]);
  // 鼻子（折线）
  const nose = [[150, 80], [160, 130], [140, 150]];
  nose.forEach((p, i) => { if (i < nose.length - 1) for (let t = 0; t <= 1; t += 0.04) shape.push([nose[i][0]+(nose[i+1][0]-nose[i][0])*t, nose[i][1]+(nose[i+1][1]-nose[i][1])*t]); });
  // 脸部轮廓（不规则多边形）
  const face = [[80, 70], [150, 50], [220, 75], [230, 150], [200, 220], [130, 230], [70, 180], [80, 70]];
  face.forEach((p, i) => { if (i < face.length - 1) for (let t = 0; t <= 1; t += 0.02) shape.push([face[i][0]+(face[i+1][0]-face[i][0])*t, face[i][1]+(face[i+1][1]-face[i][1])*t]); });
  // 嘴（波浪线）
  for (let t = 0; t <= 1; t += 0.02) shape.push([110 + t * 80, 190 + Math.sin(t * Math.PI * 3) * 10]);
  const sampled = samplePath(shape, 250);
  points.push(...sampled);
}

function generateKantShape(points) {
  // 康德：圆顶礼帽 + 直立身形 + 时钟
  const shape = [];
  // 礼帽
  for (let t = 0; t <= 1; t += 0.01) shape.push([110 + t * 80, 40]); // 帽顶
  for (let t = 0; t <= 1; t += 0.02) shape.push([110, 40 + t * 40]); // 左边
  for (let t = 0; t <= 1; t += 0.02) shape.push([190, 40 + t * 40]); // 右边
  for (let t = 0; t <= 1; t += 0.01) shape.push([90 + t * 120, 80]); // 帽檐
  // 头
  for (let a = 0; a < Math.PI * 2; a += 0.07) shape.push([150 + Math.cos(a) * 25, 115 + Math.sin(a) * 28]);
  // 身体（矩形）
  for (let t = 0; t <= 1; t += 0.02) shape.push([130, 145 + t * 80]);
  for (let t = 0; t <= 1; t += 0.02) shape.push([170, 145 + t * 80]);
  for (let t = 0; t <= 1; t += 0.02) shape.push([130 + t * 40, 225]);
  // 小时钟（右下角）
  for (let a = 0; a < Math.PI * 2; a += 0.06) shape.push([240 + Math.cos(a) * 20, 230 + Math.sin(a) * 20]);
  shape.push([240, 230]); shape.push([240, 215]); // 时针
  shape.push([240, 230]); shape.push([252, 230]); // 分针
  const sampled = samplePath(shape, 250);
  points.push(...sampled);
}

function generateZhugeShape(points) {
  // 诸葛亮：羽扇 + 纶巾侧影
  const shape = [];
  // 纶巾（高冠）
  for (let t = 0; t <= 1; t += 0.02) shape.push([140 + t * 20, 30 + t * 30]);
  for (let t = 0; t <= 1; t += 0.02) shape.push([130, 30 + t * 30]);
  for (let t = 0; t <= 1; t += 0.02) shape.push([170, 35 + t * 25]);
  // 头部
  for (let a = 0; a < Math.PI * 2; a += 0.06) shape.push([150 + Math.cos(a) * 28, 90 + Math.sin(a) * 25]);
  // 身体（宽袍）
  const robe = [[120, 120], [100, 200], [90, 260], [150, 270], [210, 260], [200, 200], [180, 120]];
  robe.forEach((p, i) => { if (i < robe.length - 1) for (let t = 0; t <= 1; t += 0.02) shape.push([robe[i][0]+(robe[i+1][0]-robe[i][0])*t, robe[i][1]+(robe[i+1][1]-robe[i][1])*t]); });
  // 羽扇（左手持）
  for (let a = -0.5; a < 1.5; a += 0.04) {
    const r = 35 + Math.sin(a * 2) * 5;
    shape.push([70 + Math.cos(a) * r, 180 + Math.sin(a) * r]);
  }
  // 扇柄
  for (let t = 0; t <= 1; t += 0.03) shape.push([70 + t * 20, 210 + t * 30]);
  const sampled = samplePath(shape, 250);
  points.push(...sampled);
}

function generateMozartShape(points) {
  // 莫扎特：假发卷 + 音符
  const shape = [];
  // 假发（波浪卷）
  for (let a = 0; a < Math.PI * 1.5; a += 0.04) {
    const r = 40 + Math.sin(a * 6) * 8;
    shape.push([150 + Math.cos(a + Math.PI * 0.75) * r, 80 + Math.sin(a + Math.PI * 0.75) * r * 0.7]);
  }
  // 脸
  for (let a = 0; a < Math.PI * 2; a += 0.07) shape.push([150 + Math.cos(a) * 22, 100 + Math.sin(a) * 25]);
  // 身体
  for (let t = 0; t <= 1; t += 0.02) shape.push([135 + t * 30, 130]);
  for (let t = 0; t <= 1; t += 0.02) shape.push([130, 130 + t * 60]);
  for (let t = 0; t <= 1; t += 0.02) shape.push([170, 130 + t * 60]);
  // 音符1
  for (let a = 0; a < Math.PI * 2; a += 0.1) shape.push([60 + Math.cos(a) * 8, 220 + Math.sin(a) * 6]);
  shape.push([68, 220]); shape.push([68, 185]); // 符杆
  shape.push([68, 185]); shape.push([80, 190]); // 符尾
  // 音符2
  for (let a = 0; a < Math.PI * 2; a += 0.1) shape.push([240 + Math.cos(a) * 8, 200 + Math.sin(a) * 6]);
  shape.push([248, 200]); shape.push([248, 165]);
  const sampled = samplePath(shape, 250);
  points.push(...sampled);
}

function generateDarwinShape(points) {
  // 达尔文：进化树
  const shape = [];
  // 树干
  for (let t = 0; t <= 1; t += 0.01) shape.push([150, 280 - t * 150]);
  // 左分支
  for (let t = 0; t <= 1; t += 0.02) shape.push([150 - t * 60, 130 - t * 40]);
  for (let t = 0; t <= 1; t += 0.02) shape.push([90 - t * 20, 90 - t * 30]);
  for (let t = 0; t <= 1; t += 0.02) shape.push([90 + t * 10, 90 - t * 40]);
  // 右分支
  for (let t = 0; t <= 1; t += 0.02) shape.push([150 + t * 60, 130 - t * 40]);
  for (let t = 0; t <= 1; t += 0.02) shape.push([210 + t * 20, 90 - t * 30]);
  for (let t = 0; t <= 1; t += 0.02) shape.push([210 - t * 10, 90 - t * 40]);
  // 中间分支
  for (let t = 0; t <= 1; t += 0.02) shape.push([150 - t * 25, 160 - t * 50]);
  for (let t = 0; t <= 1; t += 0.02) shape.push([150 + t * 25, 160 - t * 50]);
  // 根部
  for (let t = 0; t <= 1; t += 0.02) shape.push([150 - t * 30, 280 + t * 10]);
  for (let t = 0; t <= 1; t += 0.02) shape.push([150 + t * 30, 280 + t * 10]);
  const sampled = samplePath(shape, 250);
  points.push(...sampled);
}

function generateMurakamiShape(points) {
  // 村上春树：跑步人形
  const shape = [];
  // 头
  for (let a = 0; a < Math.PI * 2; a += 0.07) shape.push([150 + Math.cos(a) * 18, 60 + Math.sin(a) * 18]);
  // 身体（前倾）
  for (let t = 0; t <= 1; t += 0.02) shape.push([150 + t * 10, 80 + t * 70]);
  // 左臂（后摆）
  for (let t = 0; t <= 1; t += 0.03) shape.push([145 - t * 40, 100 + t * 30]);
  // 右臂（前摆）
  for (let t = 0; t <= 1; t += 0.03) shape.push([155 + t * 35, 100 - t * 10]);
  // 左腿（后蹬）
  for (let t = 0; t <= 1; t += 0.02) shape.push([155 - t * 40, 150 + t * 70]);
  for (let t = 0; t <= 1; t += 0.03) shape.push([115 - t * 20, 220 + t * 20]);
  // 右腿（前迈）
  for (let t = 0; t <= 1; t += 0.02) shape.push([160 + t * 40, 150 + t * 50]);
  for (let t = 0; t <= 1; t += 0.03) shape.push([200 + t * 15, 200 + t * 30]);
  // 地面线
  for (let t = 0; t <= 1; t += 0.01) shape.push([60 + t * 180, 260]);
  const sampled = samplePath(shape, 250);
  points.push(...sampled);
}

function generateLibaiShape(points) {
  // 李白：举杯望月
  const shape = [];
  // 月亮（右上）
  for (let a = 0.3; a < Math.PI * 1.7; a += 0.04) shape.push([230 + Math.cos(a) * 30, 60 + Math.sin(a) * 30]);
  for (let a = 0.6; a < Math.PI * 1.4; a += 0.05) shape.push([225 + Math.cos(a) * 20, 60 + Math.sin(a) * 20]); // 内弧（月牙）
  // 头
  for (let a = 0; a < Math.PI * 2; a += 0.07) shape.push([120 + Math.cos(a) * 20, 100 + Math.sin(a) * 22]);
  // 发髻
  for (let a = 0; a < Math.PI; a += 0.06) shape.push([120 + Math.cos(a + Math.PI) * 12, 75 + Math.sin(a + Math.PI) * 15]);
  // 身体（宽袍飘逸）
  for (let t = 0; t <= 1; t += 0.02) shape.push([120 + t * 5, 125 + t * 90]);
  // 袍子左摆
  for (let t = 0; t <= 1; t += 0.02) shape.push([100 - t * 20, 150 + t * 70]);
  // 袍子右摆
  for (let t = 0; t <= 1; t += 0.02) shape.push([140 + t * 15, 150 + t * 70]);
  // 右手举杯
  for (let t = 0; t <= 1; t += 0.03) shape.push([135 + t * 30, 140 - t * 30]);
  // 酒杯
  for (let a = 0; a < Math.PI; a += 0.08) shape.push([170 + Math.cos(a) * 8, 105 + Math.sin(a) * 5]);
  shape.push([162, 105]); shape.push([166, 95]); // 杯脚
  shape.push([178, 105]); shape.push([174, 95]);
  const sampled = samplePath(shape, 250);
  points.push(...sampled);
}

// --- 粒子聚合动画引擎 ---
let charAnimParticles = [];
let charAnimTargets = [];
let charAnimPhase = 'idle'; // idle | shrink | explode | converge | idle_hover
let charAnimStart = 0;
let charAnimFrame = null;

function startCharacterAnimation(characterName) {
  const charCanvas = document.getElementById('character-canvas');
  const cCtx = charCanvas.getContext('2d');
  const size = 300;
  charCanvas.width = size * devicePixelRatio;
  charCanvas.height = size * devicePixelRatio;
  charCanvas.style.width = size + 'px';
  charCanvas.style.height = size + 'px';
  cCtx.scale(devicePixelRatio, devicePixelRatio);

  // 生成目标点
  charAnimTargets = [];
  generateCharacterPoints(characterName).forEach(p => {
    if (Array.isArray(p)) charAnimTargets.push(p);
  });
  // 确保有250个点
  while (charAnimTargets.length < 250) {
    charAnimTargets.push([Math.random() * 300, Math.random() * 300]);
  }
  charAnimTargets = charAnimTargets.slice(0, 250);

  // 初始化粒子（随机分布）
  charAnimParticles = charAnimTargets.map(() => ({
    x: Math.random() * size,
    y: Math.random() * size,
    r: 1.5 + Math.random(),
  }));

  charAnimPhase = 'shrink';
  charAnimStart = performance.now();
  if (charAnimFrame) cancelAnimationFrame(charAnimFrame);
  animateCharacter(cCtx, size);
}

function animateCharacter(cCtx, size) {
  const now = performance.now();
  const elapsed = now - charAnimStart;
  cCtx.clearRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2;

  if (charAnimPhase === 'shrink' && elapsed < 300) {
    // 收缩到中心
    const t = elapsed / 300;
    charAnimParticles.forEach(p => {
      p.x += (cx - p.x) * 0.08;
      p.y += (cy - p.y) * 0.08;
    });
  } else if (charAnimPhase === 'shrink' && elapsed >= 300) {
    charAnimPhase = 'explode';
    charAnimStart = now;
    // 爆散
    charAnimParticles.forEach(p => {
      p.vx = (Math.random() - 0.5) * 12;
      p.vy = (Math.random() - 0.5) * 12;
    });
  } else if (charAnimPhase === 'explode' && elapsed < 200) {
    charAnimParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.9;
      p.vy *= 0.9;
    });
  } else if (charAnimPhase === 'explode' && elapsed >= 200) {
    charAnimPhase = 'converge';
    charAnimStart = now;
  } else if (charAnimPhase === 'converge') {
    const duration = 1000;
    const t = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
    charAnimParticles.forEach((p, i) => {
      const target = charAnimTargets[i];
      p.x += (target[0] - p.x) * ease * 0.1;
      p.y += (target[1] - p.y) * ease * 0.1;
    });
    if (t >= 1) {
      charAnimPhase = 'idle_hover';
      // Snap to target
      charAnimParticles.forEach((p, i) => {
        p.x = charAnimTargets[i][0];
        p.y = charAnimTargets[i][1];
      });
    }
  } else if (charAnimPhase === 'idle_hover') {
    // 微幅抖动
    charAnimParticles.forEach((p, i) => {
      p.x = charAnimTargets[i][0] + (Math.random() - 0.5) * 2;
      p.y = charAnimTargets[i][1] + (Math.random() - 0.5) * 2;
    });
  }

  // 绘制粒子
  charAnimParticles.forEach(p => {
    cCtx.beginPath();
    cCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    cCtx.fillStyle = 'rgba(200, 210, 255, 0.8)';
    cCtx.fill();
  });

  charAnimFrame = requestAnimationFrame(() => animateCharacter(cCtx, size));
}

// --- 重新开始 & 分享 ---
function restart() {
  if (charAnimFrame) cancelAnimationFrame(charAnimFrame);
  state.currentRound = 0;
  state.results = [];
  goToPage('landing');
}

function shareResult() {
  // 使用 html2canvas 或 canvas 导出
  // 简化版：提示用户截图
  const charCard = document.getElementById('character-card');
  charCard.style.border = '1px solid rgba(255,255,255,0.3)';
  alert('长按截图保存，分享给朋友看看你的时间人格吧！');
  setTimeout(() => {
    charCard.style.border = '1px solid rgba(255,255,255,0.1)';
  }, 2000);
}

// --- 初始化 ---
window.addEventListener('resize', () => {
  resizeCanvas();
  if (currentTheme) {
    createParticles(currentTheme);
  }
});

resizeCanvas();
switchTheme('landing');