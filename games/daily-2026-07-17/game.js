// game.js - Alchemist's Crucible (炼金秘仪)

// Config
const GRID_SIZE = 20; // 20x20 cells
const CELL_SIZE = 30; // 30x30 pixels each (600x600 canvas)

// Recipes
const RECIPES = {
    shrinking: {
        name: '缩身魔药',
        ingredients: ['salt', 'mercury'],
        effect: 'shrink',
        desc: '蛇身减半',
        color: '#00f2fe',
        score: 100
    },
    elixir: {
        name: '长生灵药',
        ingredients: ['salt', 'salt', 'sulfur'],
        effect: 'shield',
        desc: '金色护盾',
        color: '#d4af37',
        score: 150
    },
    dragon: {
        name: '龙之息',
        ingredients: ['sulfur', 'sulfur', 'mercury'],
        effect: 'fire',
        desc: '喷火磁铁',
        color: '#ff3b30',
        score: 150
    },
    philosopher: {
        name: '贤者之石',
        ingredients: ['sulfur', 'mercury', 'salt'],
        effect: 'stone',
        desc: '全屏清障',
        color: '#8e44ad',
        score: 300
    }
};

// Ingredients definition
const INGREDIENTS_TYPES = {
    sulfur: { name: '硫磺', symbol: '🜍', color: '#ff7675', glow: '#ff3b30' },
    mercury: { name: '水银', symbol: '☿', color: '#4facfe', glow: '#00f2fe' },
    salt: { name: '精盐', symbol: '🜔', color: '#ffffff', glow: '#f1f2f6' },
    lead: { name: '铅矿渣', symbol: '🜄', color: '#95afc0', glow: '#535c68' }
};

// Game Variables
let canvas, ctx;
let gameState = 'start'; // 'start', 'playing', 'gameover'
let score = 0;
let highScore = 0;
let potionCount = 0;

// Snake
let snake = []; // Array of {x, y, type, symbol, color}
let direction = { x: 0, y: -1 }; // Move UP initially
let nextDirection = { x: 0, y: -1 };
let snakeSpeed = 150; // Milliseconds per tick
let gameTimer = null;

// Alchemy State
let crucibleQueue = []; // Max length 3
let targetRecipeKey = 'shrinking'; // Key of RECIPES

// Buffs & Timers
let shieldActive = false;
let fireTimer = 0; // Ticks of Dragon's Breath active
let panicTimer = 0; // Ticks of failure run active

// Game Objects
let ingredientsList = []; // List of {x, y, type, isGold}
let obstaclesList = []; // List of {x, y}
let particles = []; // Visual particle effects

// Screen Shake & Smoke Filter
let isShaking = false;
let renderLoopActive = false;

// Audio Synthesizer
class AlchemySynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.bubbleInterval = null;
    }

    init() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            return;
        }
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
        this.startCauldronSound();
    }

    startCauldronSound() {
        if (this.bubbleInterval) clearInterval(this.bubbleInterval);
        this.bubbleInterval = setInterval(() => {
            if (!this.enabled || !this.ctx || this.ctx.state === 'suspended' || gameState !== 'playing') return;
            this.playBubble();
        }, 400 + Math.random() * 600);
    }

    playBubble() {
        try {
            // A quick filtered bubbly gurgle
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            // Start low, sweep up slightly to simulate bubble expanding
            const startFreq = 80 + Math.random() * 80;
            osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(startFreq * 2.2, this.ctx.currentTime + 0.15);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, this.ctx.currentTime);
            filter.Q.setValueAtTime(10, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.2);
        } catch (e) {}
    }

    playEat(type) {
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        try {
            const time = this.ctx.currentTime;
            if (type === 'sulfur') {
                // Sulfur spark crackle (short high bandpass noise)
                const bufferSize = this.ctx.sampleRate * 0.08;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(2000, time);
                filter.Q.setValueAtTime(8, time);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.06, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start();
            } else if (type === 'mercury') {
                // Mercury liquid slide
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, time);
                osc.frequency.exponentialRampToValueAtTime(1100, time + 0.15);

                gain.gain.setValueAtTime(0.1, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(time + 0.18);
            } else if (type === 'salt') {
                // Salt bell strike
                const osc1 = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(1200, time);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(2400, time);

                gain.gain.setValueAtTime(0.08, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(this.ctx.destination);

                osc1.start();
                osc2.start();
                osc1.stop(time + 0.26);
                osc2.stop(time + 0.26);
            } else if (type === 'lead') {
                // Lead ore heavy hit
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, time);
                osc.frequency.exponentialRampToValueAtTime(30, time + 0.15);

                gain.gain.setValueAtTime(0.18, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(time + 0.2);
            }
        } catch (e) {}
    }

    playSuccess() {
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        try {
            const time = this.ctx.currentTime;
            const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (Major Arpeggio)
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, time + idx * 0.08);

                gain.gain.setValueAtTime(0.12, time + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.08 + 0.25);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(time + idx * 0.08);
                osc.stop(time + idx * 0.08 + 0.26);
            });
        } catch (e) {}
    }

    playFailure() {
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        try {
            const time = this.ctx.currentTime;
            // Downward sweep
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, time);
            osc.frequency.linearRampToValueAtTime(60, time + 0.45);

            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

            // Add high noise hiss
            const bufferSize = this.ctx.sampleRate * 0.4;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(800, time);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.08, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);

            osc.start();
            noise.start();

            osc.stop(time + 0.5);
        } catch (e) {}
    }

    playShieldBreak() {
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        try {
            const time = this.ctx.currentTime;
            // Short high freq noise bursts
            const bufferSize = this.ctx.sampleRate * 0.25;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (i % 2 === 0 ? 1 : 0.5);
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(3000, time);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.25, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start();
        } catch (e) {}
    }

    playDeath() {
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        try {
            const time = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, time);
            osc.frequency.exponentialRampToValueAtTime(10, time + 1.2);

            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(time + 1.3);
        } catch (e) {}
    }
}

const synth = new AlchemySynth();

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Load Highscore
    const saved = localStorage.getItem('alchemy_snake_highscore');
    if (saved) {
        highScore = parseInt(saved, 10);
        document.getElementById('high-score').textContent = formatScore(highScore);
    }

    initInput();
    refreshTargetRecipe();
    drawStaticBoard();
});

function formatScore(val) {
    return String(val).padStart(4, '0');
}

// Input Controllers
function initInput() {
    window.addEventListener('keydown', (e) => {
        if (gameState !== 'playing') return;

        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
                if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 'KeyS':
                if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
                e.preventDefault();
                break;
            case 'ArrowLeft':
            case 'KeyA':
                if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'KeyD':
                if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
                e.preventDefault();
                break;
        }
    });

    // Mobile Virtual Compasses (D-Pad) with Click & Touch Support
    const setupDpadBtn = (id, action) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('touchstart', action);
            btn.addEventListener('click', action);
        }
    };
    setupDpadBtn('btn-up', (e) => { if (direction.y !== 1) nextDirection = { x: 0, y: -1 }; e.preventDefault(); });
    setupDpadBtn('btn-down', (e) => { if (direction.y !== -1) nextDirection = { x: 0, y: 1 }; e.preventDefault(); });
    setupDpadBtn('btn-left', (e) => { if (direction.x !== 1) nextDirection = { x: -1, y: 0 }; e.preventDefault(); });
    setupDpadBtn('btn-right', (e) => { if (direction.x !== -1) nextDirection = { x: 1, y: 0 }; e.preventDefault(); });

    // Canvas swipe gestures
    let touchStartX = 0;
    let touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
        if (e.changedTouches && e.changedTouches.length > 0) {
            touchStartX = e.changedTouches[0].clientX;
            touchStartY = e.changedTouches[0].clientY;
        }
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
        if (gameState !== 'playing') return;
        if (e.changedTouches && e.changedTouches.length > 0) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);

            if (Math.max(absX, absY) > 30) { // Threshold
                if (absX > absY) {
                    // horizontal
                    if (dx > 0 && direction.x !== -1) nextDirection = { x: 1, y: 0 };
                    else if (dx < 0 && direction.x !== 1) nextDirection = { x: -1, y: 0 };
                } else {
                    // vertical
                    if (dy > 0 && direction.y !== -1) nextDirection = { x: 0, y: 1 };
                    else if (dy < 0 && direction.y !== 1) nextDirection = { x: 0, y: -1 };
                }
            }
        }
    }, { passive: true });

    // Start/Restart Buttons
    document.getElementById('btn-start').addEventListener('click', () => {
        synth.init();
        startGame();
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
        synth.init();
        startGame();
    });

    // Audio Switch Toggle in badge
    const audioBtn = document.getElementById('btn-audio');
    audioBtn.addEventListener('click', () => {
        synth.enabled = !synth.enabled;
        audioBtn.textContent = synth.enabled ? '🔊' : '🔇';
        if (synth.enabled) {
            synth.init();
        }
    });
}

function startGame() {
    // Reset snake
    snake = [
        { x: 10, y: 10, type: 'head', symbol: '👁', color: '#ffd700' },
        { x: 10, y: 11, type: 'salt', symbol: '🜔', color: '#ffffff' },
        { x: 10, y: 12, type: 'salt', symbol: '🜔', color: '#ffffff' }
    ];
    direction = { x: 0, y: -1 };
    nextDirection = { x: 0, y: -1 };
    score = 0;
    potionCount = 0;
    crucibleQueue = [];
    shieldActive = false;
    fireTimer = 0;
    panicTimer = 0;
    ingredientsList = [];
    obstaclesList = [];
    particles = [];
    isShaking = false;

    document.getElementById('current-score').textContent = formatScore(score);
    document.getElementById('potion-count').textContent = '0';
    updateCrucibleUI();

    // Hide overlays
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';

    gameState = 'playing';

    // UI Indicators reset
    const statusLight = document.getElementById('status-light');
    statusLight.className = 'status-orb active';
    document.getElementById('status-title').textContent = '秘仪法阵运转中';
    document.getElementById('status-desc').textContent = '收集红黄蓝原料，合成强力魔法！';

    // Populate initial items
    spawnInitialElements();

    if (gameTimer) clearTimeout(gameTimer);
    scheduleNextTick();

    // Start rendering frame loop safely without leakage
    if (!renderLoopActive) {
        renderLoopActive = true;
        requestAnimationFrame(renderLoop);
    }
}

function scheduleNextTick() {
    if (gameState !== 'playing') return;

    // Calc current delay based on state
    let delay = snakeSpeed;
    if (panicTimer > 0) {
        delay = Math.floor(snakeSpeed * 0.75); // 25% speed increase
    }

    gameTimer = setTimeout(() => {
        gameTick();
        scheduleNextTick();
    }, delay);
}

function refreshTargetRecipe() {
    const keys = Object.keys(RECIPES);
    targetRecipeKey = keys[Math.floor(Math.random() * keys.length)];
    const recipe = RECIPES[targetRecipeKey];

    document.getElementById('target-recipe-name').textContent = recipe.name;
    document.getElementById('target-recipe-name').style.color = recipe.color;

    const seqContainer = document.getElementById('target-recipe-seq');
    seqContainer.innerHTML = '';
    recipe.ingredients.forEach(ing => {
        const span = document.createElement('span');
        span.className = `symbol-badge badge-${ing}`;
        span.textContent = INGREDIENTS_TYPES[ing].symbol;
        span.title = INGREDIENTS_TYPES[ing].name;
        seqContainer.appendChild(span);
    });
}

function updateCrucibleUI() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`slot-${i}`);
        slot.className = 'crucible-slot';
        slot.innerHTML = '';
        if (i < crucibleQueue.length) {
            const ingType = crucibleQueue[i];
            const data = INGREDIENTS_TYPES[ingType];
            slot.classList.add('filled', `${ingType}-filled`);
            slot.textContent = data.symbol;
        }
    }
}

// Spawns
function spawnInitialElements() {
    ingredientsList = [];
    // Spawn one of each basic element initially
    spawnElement('sulfur');
    spawnElement('mercury');
    spawnElement('salt');
    spawnElement('lead');

    // Add 2 more random ones
    spawnElement();
    spawnElement();
}

function spawnElement(forcedType = null) {
    // Collect occupied coordinates
    const occupied = new Set();
    snake.forEach(seg => occupied.add(`${seg.x},${seg.y}`));
    ingredientsList.forEach(item => occupied.add(`${item.x},${item.y}`));
    obstaclesList.forEach(item => occupied.add(`${item.x},${item.y}`));

    const freeCells = [];
    for (let x = 1; x < GRID_SIZE - 1; x++) {
        for (let y = 1; y < GRID_SIZE - 1; y++) {
            if (!occupied.has(`${x},${y}`)) {
                freeCells.push({ x, y });
            }
        }
    }

    if (freeCells.length === 0) return;
    const cell = freeCells[Math.floor(Math.random() * freeCells.length)];

    let type = forcedType;
    if (!type) {
        // Random weight: sulfur 30%, mercury 30%, salt 30%, lead 10%
        const r = Math.random();
        if (r < 0.3) type = 'sulfur';
        else if (r < 0.6) type = 'mercury';
        else if (r < 0.9) type = 'salt';
        else type = 'lead';
    }

    ingredientsList.push({
        x: cell.x,
        y: cell.y,
        type: type,
        isGold: false
    });
}

function spawnObstacle() {
    const occupied = new Set();
    snake.forEach(seg => occupied.add(`${seg.x},${seg.y}`));
    ingredientsList.forEach(item => occupied.add(`${item.x},${item.y}`));
    obstaclesList.forEach(item => occupied.add(`${item.x},${item.y}`));

    // Keep some distance from snake head
    const head = snake[0];
    const freeCells = [];
    for (let x = 1; x < GRID_SIZE - 1; x++) {
        for (let y = 1; y < GRID_SIZE - 1; y++) {
            const dist = Math.abs(x - head.x) + Math.abs(y - head.y);
            if (!occupied.has(`${x},${y}`) && dist > 3) {
                freeCells.push({ x, y });
            }
        }
    }

    if (freeCells.length > 0) {
        const cell = freeCells[Math.floor(Math.random() * freeCells.length)];
        obstaclesList.push({ x: cell.x, y: cell.y });

        // Spawn stone particles
        createSparks(cell.x * CELL_SIZE + CELL_SIZE/2, cell.y * CELL_SIZE + CELL_SIZE/2, '#8c8c8c', 8);
    }
}

// Recipes Verification Prefix & Logic
function isValidRecipePrefix(queue) {
    if (queue.length === 0) return true;
    for (const key in RECIPES) {
        const target = RECIPES[key].ingredients;
        if (queue.length <= target.length) {
            let matches = true;
            for (let i = 0; i < queue.length; i++) {
                if (queue[i] !== target[i]) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }
    }
    return false;
}

function checkRecipeComplete(queue) {
    for (const key in RECIPES) {
        const target = RECIPES[key].ingredients;
        if (queue.length === target.length) {
            let matches = true;
            for (let i = 0; i < queue.length; i++) {
                if (queue[i] !== target[i]) {
                    matches = false;
                    break;
                }
            }
            if (matches) return key;
        }
    }
    return null;
}

// Spawn Guard
function applySpawnGuard() {
    // Check if the next required ingredient for the target recipe is present on the board
    const recipe = RECIPES[targetRecipeKey];
    // Find next ingredient needed
    // Look at queue if it starts to match target recipe
    let isMatchingTarget = true;
    for (let i = 0; i < crucibleQueue.length; i++) {
        if (crucibleQueue[i] !== recipe.ingredients[i]) {
            isMatchingTarget = false;
            break;
        }
    }

    let nextNeeded = recipe.ingredients[0];
    if (isMatchingTarget && crucibleQueue.length < recipe.ingredients.length) {
        nextNeeded = recipe.ingredients[crucibleQueue.length];
    }

    // Check if nextNeeded is on board
    const hasNeeded = ingredientsList.some(item => item.type === nextNeeded && !item.isGold);
    if (!hasNeeded && ingredientsList.length > 0) {
        // Change one element (not lead) to nextNeeded
        const replaceable = ingredientsList.filter(item => item.type !== 'lead' && !item.isGold);
        if (replaceable.length > 0) {
            const idx = Math.floor(Math.random() * replaceable.length);
            replaceable[idx].type = nextNeeded;
        }
    }
}

// Game Core Logic tick
function gameTick() {
    if (gameState !== 'playing') return;

    direction = nextDirection;

    // Decrement timers
    if (fireTimer > 0) {
        fireTimer--;
        if (fireTimer === 0) {
            document.getElementById('status-light').className = 'status-orb active';
            document.getElementById('status-title').textContent = '秘仪法阵运转中';
            document.getElementById('status-desc').textContent = '收集原料以进行秘仪合成。';
        }
    }
    if (panicTimer > 0) {
        panicTimer--;
        if (panicTimer === 0) {
            document.getElementById('status-light').className = 'status-orb active';
            document.getElementById('status-title').textContent = '秘仪法阵运转中';
            document.getElementById('status-desc').textContent = '收集原料以进行秘仪合成。';
        }
    }

    // Next position
    const head = snake[0];
    const newHeadPos = {
        x: head.x + direction.x,
        y: head.y + direction.y
    };

    // Edge boundaries check
    if (newHeadPos.x < 0 || newHeadPos.x >= GRID_SIZE || newHeadPos.y < 0 || newHeadPos.y >= GRID_SIZE) {
        if (shieldActive) {
            shieldActive = false;
            synth.playShieldBreak();
            newHeadPos.x = (newHeadPos.x + GRID_SIZE) % GRID_SIZE;
            newHeadPos.y = (newHeadPos.y + GRID_SIZE) % GRID_SIZE;
            createSparks(newHeadPos.x * CELL_SIZE + CELL_SIZE/2, newHeadPos.y * CELL_SIZE + CELL_SIZE/2, '#ffd700', 15);
        } else {
            handleFatalCollision('触碰到外界壁垒，秘仪断裂解体！');
            return;
        }
    }

    // Obstacle check
    const hitObstacle = obstaclesList.some(obs => obs.x === newHeadPos.x && obs.y === newHeadPos.y);
    if (hitObstacle) {
        if (shieldActive) {
            shieldActive = false;
            synth.playShieldBreak();
            // Remove the obstacle
            obstaclesList = obstaclesList.filter(obs => !(obs.x === newHeadPos.x && obs.y === newHeadPos.y));
            createSparks(newHeadPos.x * CELL_SIZE + CELL_SIZE/2, newHeadPos.y * CELL_SIZE + CELL_SIZE/2, '#ffd700', 15);
        } else {
            handleFatalCollision('撞击废弃坩埚与铅墙，秘仪反噬炸毁！');
            return;
        }
    }

    // Self check
    // If shield active, it protects from hitting own tail as well!
    const hitSelf = snake.some((seg, idx) => idx > 0 && seg.x === newHeadPos.x && seg.y === newHeadPos.y);
    if (hitSelf) {
        if (shieldActive) {
            shieldActive = false;
            synth.playShieldBreak();
            // Chop tail off where we hit? Or just simple ignore collision and shatter shield
            createSparks(newHeadPos.x * CELL_SIZE + CELL_SIZE/2, newHeadPos.y * CELL_SIZE + CELL_SIZE/2, '#ffd700', 15);
        } else {
            handleFatalCollision('吞食自身阵环，秘仪循环崩解！');
            return;
        }
    }

    // Create new head segment object
    const newHead = {
        x: newHeadPos.x,
        y: newHeadPos.y,
        type: 'head',
        symbol: '👁',
        color: shieldActive ? '#ffd700' : (fireTimer > 0 ? '#ff3b30' : '#d4af37')
    };

    // Update former head color/symbol to reflect body structure
    if (snake.length > 0) {
        snake[0].type = 'body';
        snake[0].symbol = '🜔'; // default salt
        snake[0].color = '#c5a77b';
    }

    // Insert new head
    snake.unshift(newHead);

    // Eaten elements check
    let ateIndex = -1;
    for (let i = 0; i < ingredientsList.length; i++) {
        const item = ingredientsList[i];
        if (item.x === newHeadPos.x && item.y === newHeadPos.y) {
            ateIndex = i;
            break;
        }
    }

    if (ateIndex !== -1) {
        const eaten = ingredientsList[ateIndex];
        ingredientsList.splice(ateIndex, 1);
        handleEatItem(eaten);
    } else {
        // Move tail forward (remove last segment)
        snake.pop();
    }

    // Dragon's Breath Magnetism Pull
    if (fireTimer > 0) {
        applyMagnetismEffect();
    }

    // Handle Spawn Guard and element count
    if (ingredientsList.length < 6) {
        spawnElement();
    }
    applySpawnGuard();
}

function handleEatItem(item) {
    const type = item.type;
    const data = INGREDIENTS_TYPES[type];

    // Gold double score element check
    if (item.isGold) {
        score += 80;
        document.getElementById('current-score').textContent = formatScore(score);
        synth.playEat('salt');
        createSparks(item.x * CELL_SIZE + CELL_SIZE/2, item.y * CELL_SIZE + CELL_SIZE/2, '#ffd700', 12);
        return;
    }

    synth.playEat(type);
    createSparks(item.x * CELL_SIZE + CELL_SIZE/2, item.y * CELL_SIZE + CELL_SIZE/2, data.color, 12);

    // Check toxic Lead Slag first
    if (type === 'lead') {
        triggerCrucibleExplosion('吞入铅矿渣毒性杂质，坩埚炸膛！');
        return;
    }

    // Push into Crucible Queue
    crucibleQueue.push(type);
    updateCrucibleUI();

    // Verify queue matches or prefixes
    const completedKey = checkRecipeComplete(crucibleQueue);
    if (completedKey) {
        // Success Synthesize!
        triggerRecipeSuccess(completedKey);
    } else {
        // Check prefix validity
        const valid = isValidRecipePrefix(crucibleQueue);
        if (!valid) {
            triggerCrucibleExplosion('元素相克反应冲突，坩埚炸膛！');
        }
    }
}

// Magnetism mechanism for Dragon's Breath
function applyMagnetismEffect() {
    const head = snake[0];
    ingredientsList.forEach(item => {
        // Skip Lead and Gold items
        if (item.type === 'lead') return;

        const dx = head.x - item.x;
        const dy = head.y - item.y;
        const dist = Math.abs(dx) + Math.abs(dy); // Manhattan distance

        // Pull range = 3 cells
        if (dist > 0 && dist <= 3) {
            // Move item 1 step closer to head
            const stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
            const stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);

            // Check if grid is free of obstacles & snake body before magnet moving it
            const targetX = item.x + stepX;
            const targetY = item.y + stepY;
            const blocked = snake.some(s => s.x === targetX && s.y === targetY) || obstaclesList.some(o => o.x === targetX && o.y === targetY);
            if (!blocked) {
                item.x = targetX;
                item.y = targetY;

                // Add tiny magical sparkles trail
                createSparkle(item.x * CELL_SIZE + CELL_SIZE/2, item.y * CELL_SIZE + CELL_SIZE/2, INGREDIENTS_TYPES[item.type].color);
            }
        }
    });
}

// Recipe Success Synthesis
function triggerRecipeSuccess(recipeKey) {
    const recipe = RECIPES[recipeKey];
    potionCount++;
    document.getElementById('potion-count').textContent = potionCount;

    // Calc points
    let points = recipe.score;
    // If completed target recipe, double points
    const isTarget = (recipeKey === targetRecipeKey);
    if (isTarget) {
        points += 150;
        createSuccessFlashText(`完成目标：${recipe.name}! +${points}分`);
        refreshTargetRecipe();
    } else {
        createSuccessFlashText(`炼制：${recipe.name}! +${points}分`);
    }

    // Multiply score if Dragon Breath is active
    if (fireTimer > 0) {
        points *= 2;
    }

    score += points;
    document.getElementById('current-score').textContent = formatScore(score);

    // Apply specific effect
    applyPotionEffect(recipe.effect);

    // Visual sparks at head
    const head = snake[0];
    createSparks(head.x * CELL_SIZE + CELL_SIZE/2, head.y * CELL_SIZE + CELL_SIZE/2, recipe.color, 30);

    // Success audio
    synth.playSuccess();

    // Clear crucible
    crucibleQueue = [];
    updateCrucibleUI();

    // Score based dynamic obstacle spawning
    if (score > 100 && obstaclesList.length < Math.floor(score / 150)) {
        spawnObstacle();
    }
}

function applyPotionEffect(effect) {
    const statusLight = document.getElementById('status-light');
    const titleEl = document.getElementById('status-title');
    const descEl = document.getElementById('status-desc');

    if (effect === 'shrink') {
        // Halve snake length (minimum length of 3)
        const targetLen = Math.max(3, Math.floor(snake.length / 2));
        while (snake.length > targetLen) {
            const popped = snake.pop();
            createSparks(popped.x * CELL_SIZE + CELL_SIZE/2, popped.y * CELL_SIZE + CELL_SIZE/2, '#00f2fe', 5);
        }
    } else if (effect === 'shield') {
        shieldActive = true;
        statusLight.className = 'status-orb active';
        titleEl.textContent = '长生结界护体';
        descEl.textContent = '金色护盾生效中，可抵御一次致命伤害！';
    } else if (effect === 'fire') {
        fireTimer = 55; // Approx 8 seconds at current speed ticks
        statusLight.className = 'status-orb panic';
        titleEl.textContent = '真龙烈焰沸腾';
        descEl.textContent = '吸附周围原料中，积分获取速度加倍！';
    } else if (effect === 'stone') {
        // Screen flash, screen shake, convert obstacles to gold coins
        isShaking = true;
        const container = document.querySelector('.canvas-container');
        container.classList.add('shake');
        setTimeout(() => {
            container.classList.remove('shake');
            isShaking = false;
        }, 500);

        // Turn all obstacles into temporary golden elements
        obstaclesList.forEach(obs => {
            ingredientsList.push({
                x: obs.x,
                y: obs.y,
                type: 'salt',
                isGold: true // gold multiplier element
            });
            createSparks(obs.x * CELL_SIZE + CELL_SIZE/2, obs.y * CELL_SIZE + CELL_SIZE/2, '#ffd700', 10);
        });
        obstaclesList = [];
    }
}

// Crucible Explosion Failure
function triggerCrucibleExplosion(reason) {
    // Crucible exploded / failure
    crucibleQueue = [];
    updateCrucibleUI();

    // 1. Panic speedup
    panicTimer = 20; // 20 game ticks (~3 seconds)
    const statusLight = document.getElementById('status-light');
    statusLight.className = 'status-orb panic';
    document.getElementById('status-title').textContent = '坩埚反应炸膛！';
    document.getElementById('status-desc').textContent = '药水失控！蛇身强行暴走加速并积累化学废渣！';

    // 2. Growth segment addition
    const tail = snake[snake.length - 1];
    // Add two slag segments to body
    for (let i = 0; i < 2; i++) {
        snake.push({
            x: tail.x,
            y: tail.y,
            type: 'body',
            symbol: '🜄', // lead symbol representation for slag body
            color: '#535c68'
        });
    }

    // 3. Smoke filter
    const overlay = document.getElementById('smoke-overlay');
    overlay.style.opacity = '0.85';
    setTimeout(() => {
        overlay.style.opacity = '0';
    }, 2000);

    // 4. Visual shake
    const container = document.querySelector('.canvas-container');
    container.classList.add('shake');
    setTimeout(() => {
        container.classList.remove('shake');
    }, 500);

    // Explode sparks
    const head = snake[0];
    createSparks(head.x * CELL_SIZE + CELL_SIZE/2, head.y * CELL_SIZE + CELL_SIZE/2, '#555555', 25);
    createSuccessFlashText('炸膛！' + reason);

    // Audio fizzle
    synth.playFailure();
}

function handleFatalCollision(reason) {
    gameState = 'gameover';
    if (gameTimer) clearTimeout(gameTimer);

    synth.playDeath();

    // Update records
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('alchemy_snake_highscore', highScore);
        document.getElementById('high-score').textContent = formatScore(highScore);
    }

    // Show game over screens
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-potions').textContent = potionCount;
    document.getElementById('death-reason').textContent = reason;
    document.getElementById('game-over-screen').style.display = 'flex';

    const statusLight = document.getElementById('status-light');
    statusLight.className = 'status-orb';
    document.getElementById('status-title').textContent = '法阵已熄灭';
    document.getElementById('status-desc').textContent = reason;
}

// Success pop-up notification text in canvas
let flashText = '';
let flashTextTimer = 0;
function createSuccessFlashText(text) {
    flashText = text;
    flashTextTimer = 80;
}

// Particle Engine
function createSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 5,
            color: color,
            alpha: 1,
            decay: 0.02 + Math.random() * 0.03
        });
    }
}

function createSparkle(x, y, color) {
    particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 1 + Math.random() * 2,
        color: color,
        alpha: 0.8,
        decay: 0.05
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Rendering Engine
function drawStaticBoard() {
    ctx.fillStyle = '#0f0c09';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function renderLoop() {
    if (gameState !== 'playing' && gameState !== 'gameover') {
        renderLoopActive = false;
        return;
    }

    drawScene();
    updateParticles();

    requestAnimationFrame(renderLoop);
}

function drawScene() {
    // 1. Slate stone background tiles
    ctx.fillStyle = '#0d0c0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative grid slab lines
    ctx.strokeStyle = '#1d1914';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }

    // 2. Slow breathing giant background alchemical ring
    const breathe = Math.sin(Date.now() / 800) * 0.15 + 0.35;
    ctx.strokeStyle = `rgba(212, 175, 55, ${breathe})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 180, 0, Math.PI * 2);
    ctx.stroke();

    // inner alchemy star lines
    ctx.strokeStyle = `rgba(212, 175, 55, ${breathe * 0.6})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // hexagram/pentagram drawing
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
        const x = cx + Math.cos(angle) * 180;
        const y = cy + Math.sin(angle) * 180;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // 3. Draw obstacles
    obstaclesList.forEach(obs => {
        ctx.fillStyle = '#3a352c';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1.5;

        const pad = 2;
        const rx = obs.x * CELL_SIZE + pad;
        const ry = obs.y * CELL_SIZE + pad;
        const size = CELL_SIZE - pad * 2;

        ctx.fillRect(rx, ry, size, size);
        ctx.strokeRect(rx, ry, size, size);

        // draw a lead rune 🜄 inside obstacle
        ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🜄', rx + size/2, ry + size/2);
    });

    // 4. Draw ingredients
    ingredientsList.forEach(item => {
        const data = INGREDIENTS_TYPES[item.type];
        const cx = item.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = item.y * CELL_SIZE + CELL_SIZE / 2;

        ctx.shadowColor = item.isGold ? '#ffd700' : data.glow;
        ctx.shadowBlur = 10;

        if (item.isGold) {
            ctx.fillStyle = '#ffd700';
            ctx.font = '22px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🜚', cx, cy); // philosopher gold symbol
        } else {
            ctx.fillStyle = data.color;
            ctx.font = '20px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(data.symbol, cx, cy);
        }

        ctx.shadowBlur = 0; // reset
    });

    // 5. Draw particles
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // 6. Draw snake (glowing body and text symbol runes)
    snake.forEach((seg, index) => {
        const cx = seg.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = seg.y * CELL_SIZE + CELL_SIZE / 2;

        ctx.save();

        if (index === 0) {
            // Head
            ctx.shadowColor = shieldActive ? '#ffd700' : (fireTimer > 0 ? '#ff3b30' : '#ffd700');
            ctx.shadowBlur = 15;

            // Draw a beautiful golden/shielded circular frame
            ctx.fillStyle = shieldActive ? '#ffd700' : '#1c1814';
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Head eye symbol
            ctx.fillStyle = shieldActive ? '#120b06' : '#ffd700';
            ctx.font = '16px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👁', cx, cy);
        } else {
            // Body segment
            // Glowing color depending on its state (fire, shield, normal)
            let segColor = seg.color;
            if (shieldActive) segColor = '#ffd700';
            else if (fireTimer > 0) segColor = '#ff7675';

            ctx.shadowColor = segColor;
            ctx.shadowBlur = 8;

            ctx.fillStyle = segColor;
            ctx.font = '18px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(seg.symbol, cx, cy);
        }

        ctx.restore();
    });

    // 7. Flash texts
    if (flashTextTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(212, 175, 55, ' + Math.min(1, flashTextTimer / 20) + ')';
        ctx.font = '18px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText(flashText, canvas.width / 2, 70);
        ctx.restore();
        flashTextTimer--;
    }
}
