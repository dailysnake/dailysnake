const canvas = document.querySelector('#game-board');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score');
const bestScoreEl = document.querySelector('#best-score');
const speedLabel = document.querySelector('#speed-label');
const overlay = document.querySelector('#game-overlay');
const overlayTitle = document.querySelector('#overlay-title');
const overlayCopy = document.querySelector('#overlay-copy');
const startButtons = [document.querySelector('#start-button'), document.querySelector('#mobile-start-button')];
const pauseButtons = [document.querySelector('#pause-button'), document.querySelector('#mobile-pause-button')];

const GRID = 20;
const CELL = canvas.width / GRID;
let snake;
let food;
let direction;
let nextDirection;
let score = 0;
let bestScore = Number(localStorage.getItem('orchard-snake-best') || 0);
let timer = null;
let state = 'idle';

bestScoreEl.textContent = formatScore(bestScore);

function formatScore(value) {
  return String(value).padStart(2, '0');
}

function resetGame() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  direction = { x: 1, y: 0 };
  nextDirection = { ...direction };
  score = 0;
  scoreEl.textContent = formatScore(score);
  speedLabel.textContent = '速度 1';
  food = createFood();
  draw();
}

function createFood() {
  const openCells = [];
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (!snake?.some(part => part.x === x && part.y === y)) openCells.push({ x, y });
    }
  }
  return openCells[Math.floor(Math.random() * openCells.length)];
}

function startGame() {
  clearTimeout(timer);
  resetGame();
  state = 'running';
  overlay.classList.add('hidden');
  setButtonState();
  scheduleTick();
}

function togglePause() {
  if (state === 'running') {
    state = 'paused';
    clearTimeout(timer);
    overlayTitle.textContent = '游戏暂停';
    overlayCopy.textContent = '按空格键或暂停按钮继续';
    overlay.classList.remove('hidden');
  } else if (state === 'paused') {
    state = 'running';
    overlay.classList.add('hidden');
    scheduleTick();
  }
  setButtonState();
}

function setButtonState() {
  startButtons.forEach(button => { button.textContent = state === 'idle' ? '开始游戏' : '重新开始'; });
  pauseButtons.forEach(button => {
    button.disabled = state === 'idle' || state === 'over';
    button.textContent = state === 'paused' ? '继续' : '暂停';
  });
}

function getDelay() {
  return Math.max(65, 150 - Math.floor(score / 4) * 9);
}

function scheduleTick() {
  timer = setTimeout(tick, getDelay());
}

function tick() {
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const hitWall = head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID;
  const willEat = head.x === food.x && head.y === food.y;
  const collisionBody = willEat ? snake : snake.slice(0, -1);
  const hitSelf = collisionBody.some(part => part.x === head.x && part.y === head.y);
  if (hitWall || hitSelf) return gameOver();

  snake.unshift(head);
  if (willEat) {
    score += 1;
    scoreEl.textContent = formatScore(score);
    speedLabel.textContent = `速度 ${Math.min(9, 1 + Math.floor(score / 4))}`;
    food = createFood();
  } else {
    snake.pop();
  }
  draw();
  scheduleTick();
}

function gameOver() {
  state = 'over';
  clearTimeout(timer);
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('orchard-snake-best', String(bestScore));
    bestScoreEl.textContent = formatScore(bestScore);
  }
  overlayTitle.textContent = '撞到了！';
  overlayCopy.textContent = `本局吃到 ${score} 枚果实，再试一次吧`;
  overlay.classList.remove('hidden');
  setButtonState();
}

function setDirection(name) {
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const candidate = directions[name];
  if (!candidate || state !== 'running') return;
  if (candidate.x + direction.x === 0 && candidate.y + direction.y === 0) return;
  nextDirection = candidate;
}

function drawRoundedCell(x, y, color, inset = 2, radius = 5) {
  const px = x * CELL + inset;
  const py = y * CELL + inset;
  const size = CELL - inset * 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(px, py, size, size, radius);
  ctx.fill();
}

function draw() {
  ctx.fillStyle = '#dfe6ce';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(54, 66, 48, 0.09)';
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i += 1) {
    const p = i * CELL;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(canvas.width, p); ctx.stroke();
  }

  snake.forEach((part, index) => drawRoundedCell(part.x, part.y, index === 0 ? '#203428' : '#3f5d43', 2, 6));
  if (snake.length) {
    const head = snake[0];
    ctx.fillStyle = '#dfe6ce';
    const eyeOffsetX = direction.x === -1 ? 6 : direction.x === 1 ? 16 : 7;
    const eyeOffsetY = direction.y === -1 ? 6 : direction.y === 1 ? 16 : 7;
    ctx.beginPath(); ctx.arc(head.x * CELL + eyeOffsetX, head.y * CELL + eyeOffsetY, 2, 0, Math.PI * 2); ctx.fill();
  }

  const cx = food.x * CELL + CELL / 2;
  const cy = food.y * CELL + CELL / 2 + 1;
  ctx.fillStyle = '#db5a36';
  ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#344c37';
  ctx.fillRect(cx - 1, cy - CELL * 0.47, 3, 6);
}

const keyMap = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
document.addEventListener('keydown', event => {
  if (keyMap[event.key]) {
    event.preventDefault();
    setDirection(keyMap[event.key]);
  } else if (event.code === 'Space') {
    event.preventDefault();
    if (state === 'running' || state === 'paused') togglePause();
  } else if (event.key === 'Enter' && (state === 'idle' || state === 'over')) {
    startGame();
  }
});

startButtons.forEach(button => button.addEventListener('click', startGame));
pauseButtons.forEach(button => button.addEventListener('click', togglePause));
document.querySelectorAll('[data-direction]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    setDirection(button.dataset.direction);
  });
});

let touchStart = null;
canvas.addEventListener('touchstart', event => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
canvas.addEventListener('touchend', event => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  touchStart = null;
}, { passive: true });

resetGame();
