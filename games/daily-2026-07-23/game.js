/**
 * GLASSTEAVER (圣堂琉璃) - GAME LOGIC
 * Date: 2026-07-23
 */

// --- Audio Manager via Web Audio API ---
class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.ambientOsc1 = null;
        this.ambientOsc2 = null;
        this.ambientGain = null;
        this.enabled = true;
    }
    
    init() {
        if (this.ctx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
            this.startAmbient();
        } catch (e) {
            console.error("Web Audio API not supported or blocked: ", e);
        }
    }
    
    startAmbient() {
        if (!this.ctx || this.ambientOsc1) return;
        try {
            this.ambientGain = this.ctx.createGain();
            this.ambientGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
            this.ambientGain.connect(this.masterGain);
            
            // Cathedral low hum C2 (65.41 Hz)
            this.ambientOsc1 = this.ctx.createOscillator();
            this.ambientOsc1.type = 'sine';
            this.ambientOsc1.frequency.setValueAtTime(65.41, this.ctx.currentTime);
            
            // C3 (130.81 Hz)
            this.ambientOsc2 = this.ctx.createOscillator();
            this.ambientOsc2.type = 'triangle';
            this.ambientOsc2.frequency.setValueAtTime(130.81, this.ctx.currentTime);
            
            // Resonant filter for cathedral acoustic sweep
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.setValueAtTime(6, this.ctx.currentTime);
            
            const lfo = this.ctx.createOscillator();
            lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime); // very slow 0.1Hz LFO
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);
            
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            
            this.ambientOsc1.connect(filter);
            this.ambientOsc2.connect(filter);
            filter.connect(this.ambientGain);
            
            lfo.start();
            this.ambientOsc1.start();
            this.ambientOsc2.start();
        } catch (e) {
            console.warn("Failed to start ambient hum: ", e);
        }
    }
    
    stopAmbient() {
        if (this.ambientOsc1) {
            try { this.ambientOsc1.stop(); } catch(e){}
            this.ambientOsc1 = null;
        }
        if (this.ambientOsc2) {
            try { this.ambientOsc2.stop(); } catch(e){}
            this.ambientOsc2 = null;
        }
    }
    
    setEnabled(val) {
        this.enabled = val;
        if (this.ctx) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.setTargetAtTime(val ? 0.2 : 0, now, 0.1);
        }
    }
    
    playEat(color) {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            // Frequencies based on liturgical / color mood (Pentatonic/Minor triad)
            let freq = 523.25; // C5 (Red - Fire)
            if (color === 'green') freq = 587.33; // D5 (Green - Earth)
            if (color === 'blue') freq = 698.46; // F5 (Blue - Ocean)
            if (color === 'yellow') freq = 783.99; // G5 (Yellow - Dawn)
            if (color === 'prism') freq = 1046.50; // C6 (Prism - Light)
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            
            // FM modulation for crystal chime bell timbre
            const modulator = this.ctx.createOscillator();
            const modGain = this.ctx.createGain();
            modulator.frequency.setValueAtTime(freq * 3, now);
            modGain.gain.setValueAtTime(freq * 0.8, now);
            
            modulator.connect(modGain);
            modGain.connect(osc.frequency);
            
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            modulator.start();
            osc.start();
            modulator.stop(now + 0.35);
            osc.stop(now + 0.35);

            setTimeout(() => {
                try {
                    modulator.disconnect();
                    modGain.disconnect();
                    osc.disconnect();
                    gain.disconnect();
                } catch(e){}
            }, 500);
        } catch (e) {
            console.warn("Eat sound synthesis failed: ", e);
        }
    }
    
    playPurify() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        try {
            const now = this.ctx.currentTime;
            
            // Play a majestic golden C-major arpeggio/chord (C4, E4, G4, C5)
            const chords = [261.63, 329.63, 392.00, 523.25];
            chords.forEach((f, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, now + i * 0.05); // staggered arpeggio
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.08, now + i * 0.05 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start();
                osc.stop(now + 1.5);

                setTimeout(() => {
                    try {
                        osc.disconnect();
                        gain.disconnect();
                    } catch(e){}
                }, 1800);
            });
            
            // Pure white noise generator sweep for glass shattering
            const bufferSize = this.ctx.sampleRate * 0.6;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = buffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2500, now);
            filter.frequency.exponentialRampToValueAtTime(300, now + 0.6);
            
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.08, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            
            noiseNode.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.masterGain);
            
            noiseNode.start();
            noiseNode.stop(now + 0.6);

            setTimeout(() => {
                try {
                    noiseNode.disconnect();
                    filter.disconnect();
                    noiseGain.disconnect();
                } catch(e){}
            }, 800);
        } catch (e) {
            console.warn("Purify sound synthesis failed: ", e);
        }
    }
    
    playDeath() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        try {
            const now = this.ctx.currentTime;
            this.stopAmbient();
            
            // Shattering explosion noise
            const bufferSize = this.ctx.sampleRate * 1.5;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = buffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.frequency.exponentialRampToValueAtTime(60, now + 1.2);
            
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.22, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            
            noiseNode.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.masterGain);
            noiseNode.start();
            noiseNode.stop(now + 1.5);
            
            // Heavy organ bass crash
            const bass = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bass.type = 'sawtooth';
            bass.frequency.setValueAtTime(110, now);
            bass.frequency.exponentialRampToValueAtTime(30, now + 1.2);
            
            bassGain.gain.setValueAtTime(0.18, now);
            bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            
            bass.connect(bassGain);
            bassGain.connect(this.masterGain);
            bass.start();
            bass.stop(now + 1.2);

            setTimeout(() => {
                try {
                    noiseNode.disconnect();
                    filter.disconnect();
                    noiseGain.disconnect();
                    bass.disconnect();
                    bassGain.disconnect();
                } catch(e){}
            }, 1800);
        } catch (e) {
            console.warn("Death sound synthesis failed: ", e);
        }
    }
}

// --- Game Logic Classes ---

const CONFIG = {
    gridWidth: 20,
    gridHeight: 20,
    baseTickMs: 160,       // normal speed
    minTickMs: 90,         // max speed limit
    slowTickMs: 640,       // slow-motion focus speed (75% slower)
    bulletEnergyMax: 100,
    bulletEnergyCost: 0.8, // per frame in focus mode
    bulletEnergyRegen: 0.3 // per frame when not in focus
};

const audio = new AudioManager();

// Global Variables
let canvas, ctx;
let gameState = 'start'; // start, playing, paused, gameover
let score = 0;
let highScore = parseInt(localStorage.getItem('glassweaver_highscore')) || 0;

let snake = {
    body: [], // elements: {x, y, color}
    direction: {x: 0, y: -1},
    nextDirection: {x: 0, y: -1},
    prismTimer: 0 // remaining frames in prism mode
};

let foodList = []; // elements: {x, y, color, isPrism}
let altars = [];   // elements: {x, y, color, charge}
let lightBeams = []; // computed each frame: {color, points: [{x,y}], active}
let particles = [];
let bulletEnergy = CONFIG.bulletEnergyMax;
let isFocusMode = false;
let lastTickTime = 0;
let lastPrismModeState = false; // to trigger sound changes

// DOM Elements
let startScreen, gameoverScreen, pauseScreen;
let startBtn, restartBtn, resumeBtn;
let currentScoreEl, highScoreEl;
let finalScoreEl, finalHighEl;
let deathReasonEl;
let soundToggle;
let controlSelect;
let altarElements = {
    red: { pct: null, bar: null },
    blue: { pct: null, bar: null },
    green: { pct: null, bar: null },
    yellow: { pct: null, bar: null }
};
let bulletBarFill;
let mobileControlsArea;
let mobileFocusBtn;

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Screens
    startScreen = document.getElementById('start-screen');
    gameoverScreen = document.getElementById('gameover-screen');
    pauseScreen = document.getElementById('pause-screen');
    
    // Buttons
    startBtn = document.getElementById('start-btn');
    restartBtn = document.getElementById('restart-btn');
    resumeBtn = document.getElementById('resume-btn');
    
    // UI displays
    currentScoreEl = document.getElementById('current-score');
    highScoreEl = document.getElementById('high-score');
    finalScoreEl = document.getElementById('final-score');
    finalHighEl = document.getElementById('final-high');
    deathReasonEl = document.getElementById('death-reason');
    soundToggle = document.getElementById('sound-toggle');
    controlSelect = document.getElementById('control-select');
    bulletBarFill = document.getElementById('bullet-energy-fill');
    mobileControlsArea = document.getElementById('mobile-controls-area');
    mobileFocusBtn = document.getElementById('mobile-focus-btn');
    
    // Altar indicators
    ['red', 'blue', 'green', 'yellow'].forEach(color => {
        altarElements[color].pct = document.getElementById(`altar-${color}-pct`);
        altarElements[color].bar = document.getElementById(`altar-${color}-fill`);
    });
    
    // Setup high score initially
    highScoreEl.innerText = highScore;

    // Listeners
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    
    soundToggle.addEventListener('change', (e) => {
        audio.setEnabled(e.target.checked);
    });

    controlSelect.addEventListener('change', handleControlModeChange);

    // Key events
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Virtual keypad events (using pointerdown to minimize mobile latency)
    const bindButton = (id, dx, dy) => {
        const btn = document.getElementById(id);
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            changeDirection(dx, dy);
        });
    };
    bindButton('key-up', 0, -1);
    bindButton('key-down', 0, 1);
    bindButton('key-left', -1, 0);
    bindButton('key-right', 1, 0);
    
    // Mobile focus button (hold or toggle)
    mobileFocusBtn.addEventListener('touchstart', (e) => { e.preventDefault(); isFocusMode = true; mobileFocusBtn.classList.add('active'); });
    mobileFocusBtn.addEventListener('touchend', (e) => { e.preventDefault(); isFocusMode = false; mobileFocusBtn.classList.remove('active'); });
    mobileFocusBtn.addEventListener('mousedown', () => { isFocusMode = true; mobileFocusBtn.classList.add('active'); });
    mobileFocusBtn.addEventListener('mouseup', () => { isFocusMode = false; mobileFocusBtn.classList.remove('active'); });
    mobileFocusBtn.addEventListener('mouseleave', () => { isFocusMode = false; mobileFocusBtn.classList.remove('active'); });
    
    // Detect mobile touch devices to set appropriate initial UI/control options
    const isMobileDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isMobileDevice) {
        controlSelect.value = 'keypad';
    }
    handleControlModeChange({ target: controlSelect });

    // Mobile Touch Gesture Swipe
    setupSwipeDetect();
    
    // Resize Handler
    window.addEventListener('resize', handleResize);
    handleResize();

    // Start rendering loop immediately (renders start screen/background animations)
    requestAnimationFrame(renderLoop);
});

// Start a new game session
function startGame() {
    audio.init();
    audio.setEnabled(soundToggle.checked);
    
    score = 0;
    currentScoreEl.innerText = '0';
    bulletEnergy = CONFIG.bulletEnergyMax;
    isFocusMode = false;
    
    // Reset Snake: initial 3 blue segments heading UP
    snake.body = [
        {x: 10, y: 10, color: 'blue'},
        {x: 10, y: 11, color: 'blue'},
        {x: 10, y: 12, color: 'blue'}
    ];
    snake.direction = {x: 0, y: -1};
    snake.nextDirection = {x: 0, y: -1};
    snake.prismTimer = 0;
    
    // Reset Altars
    altars = [
        {x: 4, y: 4, color: 'red', charge: 0},
        {x: 4, y: 15, color: 'blue', charge: 0},
        {x: 15, y: 4, color: 'green', charge: 0},
        {x: 15, y: 15, color: 'yellow', charge: 0}
    ];
    
    // Clear lists
    particles = [];
    foodList = [];
    
    // Initial spawn: 2 shards
    spawnFood('red');
    spawnFood('green');
    
    // Screens toggle
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    
    gameState = 'playing';
    lastTickTime = performance.now();
}

function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    pauseScreen.classList.remove('hidden');
}

function resumeGame() {
    if (gameState !== 'paused') return;
    gameState = 'playing';
    pauseScreen.classList.add('hidden');
    lastTickTime = performance.now();
}

function gameOver(reason) {
    gameState = 'gameover';
    audio.playDeath();
    
    deathReasonEl.innerText = reason;
    finalScoreEl.innerText = score;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('glassweaver_highscore', highScore);
        highScoreEl.innerText = highScore;
    }
    finalHighEl.innerText = highScore;
    
    gameoverScreen.classList.remove('hidden');
}

// Spawning food in open slots
function spawnFood(preferredColor = null) {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const chosenColor = preferredColor || colors[Math.floor(Math.random() * colors.length)];
    
    // Find empty spots
    let attempts = 0;
    while (attempts < 200) {
        const rx = Math.floor(Math.random() * CONFIG.gridWidth);
        const ry = Math.floor(Math.random() * CONFIG.gridHeight);
        
        // check snake overlap
        let overlap = snake.body.some(seg => seg.x === rx && seg.y === ry);
        // check altar overlap
        overlap = overlap || altars.some(altar => altar.x === rx && altar.y === ry);
        // check other foods
        overlap = overlap || foodList.some(f => f.x === rx && f.y === ry);
        
        if (!overlap) {
            foodList.push({
                x: rx,
                y: ry,
                color: chosenColor,
                isPrism: false
            });
            return;
        }
        attempts++;
    }
}

// Spawn the White Rainbow Prism shard
function spawnPrismShard() {
    let attempts = 0;
    while (attempts < 200) {
        const rx = Math.floor(Math.random() * CONFIG.gridWidth);
        const ry = Math.floor(Math.random() * CONFIG.gridHeight);
        
        let overlap = snake.body.some(seg => seg.x === rx && seg.y === ry);
        overlap = overlap || altars.some(alt => alt.x === rx && alt.y === ry);
        overlap = overlap || foodList.some(f => f.x === rx && f.y === ry);
        
        if (!overlap) {
            foodList.push({
                x: rx,
                y: ry,
                color: 'prism',
                isPrism: true
            });
            return;
        }
        attempts++;
    }
}

// Spawns float debris
function spawnShatterParticles(x, y, color, count = 16) {
    const colors = {
        red: '#ff3344',
        blue: '#3388ff',
        green: '#22cc66',
        yellow: '#ffaa00',
        prism: '#e8d0ff'
    };
    
    // Pixel conversion
    const cellSize = canvas.width / CONFIG.gridWidth;
    const px = x * cellSize + cellSize / 2;
    const py = y * cellSize + cellSize / 2;
    
    for (let i = 0; i < count; i++) {
        particles.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 1.5,
            size: Math.random() * 5 + 3,
            color: colors[color] || '#ffffff',
            alpha: 1.0,
            decay: Math.random() * 0.02 + 0.015,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.2
        });
    }
}

// Input Controllers
function changeDirection(dx, dy) {
    if (gameState !== 'playing') return;
    
    // Disallow 180-degree immediate turns
    const currentDir = snake.direction;
    if (dx === -currentDir.x && dy === -currentDir.y) return;
    
    snake.nextDirection = {x: dx, y: dy};
}

function handleKeyDown(e) {
    if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault();
        changeDirection(0, -1);
    } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        e.preventDefault();
        changeDirection(0, 1);
    } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        changeDirection(-1, 0);
    } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        changeDirection(1, 0);
    } else if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (gameState === 'playing') pauseGame();
        else if (gameState === 'paused') resumeGame();
    } else if (e.key === ' ') {
        e.preventDefault();
        if (gameState === 'playing') {
            isFocusMode = true;
        }
    }
}

function handleKeyUp(e) {
    if (e.key === ' ') {
        e.preventDefault();
        isFocusMode = false;
    }
}

function handleControlModeChange(e) {
    const val = e.target.value;
    if (val === 'keypad') {
        document.getElementById('vk-wrapper').style.display = 'flex';
    } else {
        document.getElementById('vk-wrapper').style.display = 'none';
    }
}

function handleResize() {
    // If layout shrinks, canvas matches the wrapper width
    const container = canvas.parentElement;
    const width = container.clientWidth;
    canvas.width = width;
    canvas.height = width;
}

// Mobile swipe detection
function setupSwipeDetect() {
    let startX = 0, startY = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        if (controlSelect.value !== 'swipe') return;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
    }, {passive: true});
    
    canvas.addEventListener('touchmove', (e) => {
        if (controlSelect.value !== 'swipe') return;
        if (e.cancelable) e.preventDefault(); // prevent scrolling
    }, {passive: false});
    
    canvas.addEventListener('touchend', (e) => {
        if (controlSelect.value !== 'swipe') return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        
        const minSwipeDist = 30;
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal
            if (Math.abs(dx) > minSwipeDist) {
                if (dx > 0) changeDirection(1, 0);
                else changeDirection(-1, 0);
            }
        } else {
            // Vertical
            if (Math.abs(dy) > minSwipeDist) {
                if (dy > 0) changeDirection(0, 1);
                else changeDirection(0, -1);
            }
        }
    }, {passive: true});
}

// --- GAME TICK UPDATE ---
function gameTick() {
    if (gameState !== 'playing') return;
    
    // Update direction safely
    snake.direction = snake.nextDirection;
    
    // Compute next head position
    const head = snake.body[0];
    const newHead = {
        x: head.x + snake.direction.x,
        y: head.y + snake.direction.y,
        color: head.color // initialized from old head, will be updated if food is eaten
    };
    
    // 1. Collision with wall
    if (newHead.x < 0 || newHead.x >= CONFIG.gridWidth || newHead.y < 0 || newHead.y >= CONFIG.gridHeight) {
        gameOver("蛇头撞击了大教堂神圣的石墙而粉碎。");
        return;
    }
    
    // 2. Collision with self (except the tail segment if it moves out)
    const selfCollision = snake.body.slice(0, -1).some(seg => seg.x === newHead.x && seg.y === newHead.y);
    if (selfCollision) {
        gameOver("蛇身偏折错位，头骨撞向了自己的琉璃尾段。");
        return;
    }
    
    // 3. Collision with static Altars (blocking obstacle for head)
    const altarCollision = altars.some(altar => altar.x === newHead.x && altar.y === newHead.y);
    if (altarCollision) {
        gameOver("蛇头撞上了坚固沉重的黄金琉璃祭坛。");
        return;
    }
    
    // 4. Food consumption check
    let eatenIndex = foodList.findIndex(f => f.x === newHead.x && f.y === newHead.y);
    let eatenFood = null;
    
    if (eatenIndex !== -1) {
        eatenFood = foodList.splice(eatenIndex, 1)[0];
    }
    
    if (eatenFood) {
        // Grow snake body!
        // We push a new segment to the FRONT (the new head) and we do NOT pop the tail.
        // We need to set the color of the new head based on the food eaten.
        // To simulate: eating color C adds a segment of color C to the tail.
        // In implementation: we insert the newHead, and we change the tail segment's color to the eaten food's color OR we append to the tail.
        // Let's do it clean: we add a new head segment, and let its color be the color of the old head.
        // But the tail receives the new color segment!
        // So, we don't pop the tail, and we set the new tail segment color to eaten color.
        
        // Add new head segment
        const oldHeadColor = snake.body[0].color;
        newHead.color = oldHeadColor; // the head keeps color continuity
        snake.body.unshift(newHead);
        
        // The last segment (newly expanded tail) gets the eaten food color
        if (eatenFood.isPrism) {
            // Prism Shard triggers prism mode!
            snake.prismTimer = 60; // 60 ticks (~10 seconds in normal speed)
            audio.playEat('prism');
            spawnShatterParticles(eatenFood.x, eatenFood.y, 'prism', 24);
            score += 50;
        } else {
            // Normal shard
            snake.body[snake.body.length - 1].color = eatenFood.color;
            audio.playEat(eatenFood.color);
            spawnShatterParticles(eatenFood.x, eatenFood.y, eatenFood.color, 12);
            score += 10;
        }
        
        currentScoreEl.innerText = score;
        
        // Respawn replacement food
        if (!eatenFood.isPrism) {
            spawnFood();
            
            // 6% chance of spawning a Rainbow Prism core when eating normal shard
            if (Math.random() < 0.06 && !foodList.some(f => f.isPrism)) {
                spawnPrismShard();
            }
        }
    } else {
        // Normal move: unshift new head, pop tail
        // Head keeps old head color
        newHead.color = snake.body[0].color;
        
        // Move segments: shift colors down so it looks like colors crawl along the body!
        // Wait, if color crawling is wanted, we just shift positions and keep colors attached to segments.
        // Yes, unshifting new head with color of old head, and pop tail does exactly that! The colors stay on the segments, and they move dynamically!
        snake.body.unshift(newHead);
        snake.body.pop();
    }
    
    // Decrement prism timer
    if (snake.prismTimer > 0) {
        snake.prismTimer--;
    }
}

// --- LIGHT BEAM VECTOR TRACING ---
// Computes all light paths
function updateLightBeams() {
    lightBeams = [];
    
    // Reset altar illuminated states for this frame
    altars.forEach(a => a.isIlluminated = false);
    
    // Define 4 initial emitters on boundary coordinates
    const emitters = [
        {x: 4, y: -1, dx: 0, dy: 1, color: 'red'},     // Top Red
        {x: -1, y: 5, dx: 1, dy: 0, color: 'blue'},    // Left Blue
        {x: 15, y: 20, dx: 0, dy: -1, color: 'green'},  // Bottom Green
        {x: 20, y: 14, dx: -1, dy: 0, color: 'yellow'}  // Right Yellow
    ];
    
    // Trace each emitter
    emitters.forEach(emitter => {
        traceLightBeam(
            emitter.x, 
            emitter.y, 
            emitter.dx, 
            emitter.dy, 
            emitter.color, 
            true // can split (true for primary beam)
        );
    });
}

function traceLightBeam(startX, startY, dx, dy, color, canSplit) {
    let x = startX + dx;
    let y = startY + dy;
    let beamDir = {x: dx, y: dy};
    
    const beamPath = [{x: startX, y: startY}];
    let stepCount = 0;
    
    while (stepCount < 40) { // Safety limit
        // Out of bounds check
        if (x < 0 || x >= CONFIG.gridWidth || y < 0 || y >= CONFIG.gridHeight) {
            // Draw slightly out of grid to finish nicely
            beamPath.push({x: x, y: y});
            break;
        }
        
        // Add current cell center to path
        beamPath.push({x: x, y: y});
        
        // 1. Altar collision check
        let hitAltar = altars.find(a => a.x === x && a.y === y);
        if (hitAltar) {
            if (hitAltar.color === color) {
                hitAltar.isIlluminated = true;
            }
            break; // Altar absorbs/terminates light beam
        }
        
        // 2. Snake segment check
        let segIndex = snake.body.findIndex(seg => seg.x === x && seg.y === y);
        if (segIndex !== -1) {
            let seg = snake.body[segIndex];
            
            // Check Prism Head split
            if (segIndex === 0 && snake.prismTimer > 0 && canSplit) {
                // Split light beam into 4 orthogonal directions!
                const directions = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
                directions.forEach(dir => {
                    traceLightBeam(x, y, dir.x, dir.y, color, false); // sub-beams cannot split again
                });
                break; // main beam terminates at split point
            }
            
            // Standard color filters / corner mirror rules
            if (seg.color === color) {
                // Determine if segment is corner
                let isCorner = false;
                let d1 = null, d2 = null;
                
                if (segIndex > 0 && segIndex < snake.body.length - 1) {
                    const prev = snake.body[segIndex - 1];
                    const next = snake.body[segIndex + 1];
                    d1 = {x: prev.x - x, y: prev.y - y};
                    d2 = {x: next.x - x, y: next.y - y};
                    
                    // Dot product = 0 check for perpendicular connections
                    if (d1.x * d2.x + d1.y * d2.y === 0) {
                        isCorner = true;
                    }
                }
                
                if (isCorner) {
                    // Corner Mirror reflection:
                    // Check if light is coming from d1 (entering from d1 means incoming vector = -d1)
                    if (beamDir.x === -d1.x && beamDir.y === -d1.y) {
                        beamDir = {x: d2.x, y: d2.y};
                    } else if (beamDir.x === -d2.x && beamDir.y === -d2.y) {
                        beamDir = {x: d1.x, y: d1.y};
                    } else {
                        // Light hit the side of the mirror -> absorbed/blocked
                        break;
                    }
                } else {
                    // Straight segment:
                    // Check if light direction is parallel to the segment orientation
                    // If segment index is 0 (head) or tail, we align parallel to body[1] or body[length-2] respectively.
                    let refDir = null;
                    if (segIndex === 0) {
                        // Head
                        refDir = {x: x - snake.body[1].x, y: y - snake.body[1].y};
                    } else if (segIndex === snake.body.length - 1) {
                        // Tail
                        refDir = {x: snake.body[segIndex - 1].x - x, y: snake.body[segIndex - 1].y - y};
                    } else {
                        // Middle straight segment
                        refDir = {x: snake.body[segIndex - 1].x - x, y: snake.body[segIndex - 1].y - y};
                    }
                    
                    const isParallel = (beamDir.x === refDir.x && beamDir.y === refDir.y) || 
                                       (beamDir.x === -refDir.x && beamDir.y === -refDir.y);
                                       
                    if (!isParallel) {
                        // Perpendicular hit on filter -> absorbed
                        break;
                    }
                    // Else: keeps same beamDir, passes straight through!
                }
            } else {
                // Wrong segment color -> blocked
                break;
            }
        }
        
        // Progress next step
        x += beamDir.x;
        y += beamDir.y;
        dx = beamDir.x;
        dy = beamDir.y;
        stepCount++;
    }
    
    lightBeams.push({
        color: color,
        points: beamPath
    });
}

// --- GAME LOOP & RENDERING ---
function renderLoop(time) {
    // 1. Update clocks and physics
    if (gameState === 'playing') {
        // Manage bullet time energy
        if (isFocusMode && bulletEnergy > 0) {
            bulletEnergy -= CONFIG.bulletEnergyCost;
            if (bulletEnergy <= 0) {
                bulletEnergy = 0;
                isFocusMode = false;
            }
        } else if (!isFocusMode && bulletEnergy < CONFIG.bulletEnergyMax) {
            bulletEnergy += CONFIG.bulletEnergyRegen;
        }
        
        // Update Energy GUI bar
        bulletBarFill.style.width = `${bulletEnergy}%`;
        if (isFocusMode) {
            bulletBarFill.classList.add('pulse-glow');
        } else {
            bulletBarFill.classList.remove('pulse-glow');
        }

        // Determine current speed tick rate
        let scoreSpeedBoost = Math.floor(score / 500) * 8; // speed up slightly as score rises
        let currentNormalTick = Math.max(CONFIG.baseTickMs - scoreSpeedBoost, CONFIG.minTickMs);
        let tickInterval = isFocusMode ? CONFIG.slowTickMs : currentNormalTick;
        
        const elapsed = time - lastTickTime;
        if (elapsed >= tickInterval) {
            gameTick();
            lastTickTime = time - (elapsed % tickInterval);
        }
        
        // Compute light beams based on latest positions
        updateLightBeams();
        
        // Altar charging dynamics
        updateAltarsAndPurify();
    }
    
    // 2. Draw Screen Frame
    drawCanvas();
    
    // 3. Update active floating particles
    updateParticles();
    
    // Loop
    requestAnimationFrame(renderLoop);
}

// Manage altar charge charging/decaying and shrink triggers
function updateAltarsAndPurify() {
    altars.forEach(altar => {
        if (altar.isIlluminated) {
            // Charging speed: about 1.5 seconds to fill at 60fps
            altar.charge += 0.012; 
            if (altar.charge >= 1.0) {
                // Altar Purified!
                altar.charge = 0;
                purifyAltar(altar);
            }
        } else {
            // Slow decay so minor flicker doesn't wipe progress
            altar.charge = Math.max(0, altar.charge - 0.003);
        }
        
        // Update GUI progress display
        const pctText = Math.floor(altar.charge * 100);
        altarElements[altar.color].pct.innerText = `${pctText}%`;
        altarElements[altar.color].bar.style.width = `${pctText}%`;
    });
}

// Shrink snake and give score when altar purifies
function purifyAltar(altar) {
    audio.playPurify();
    
    // Count how many segments of this color are in the body
    let targetSegments = snake.body.filter(seg => seg.color === altar.color).length;
    
    // Shatter tail segments. Can shrink body down to minimum length 3.
    let shrinkCount = Math.min(targetSegments, snake.body.length - 3);
    
    if (shrinkCount > 0) {
        for (let i = 0; i < shrinkCount; i++) {
            const popped = snake.body.pop();
            // spawn shatter effect with the popped segment's actual color
            spawnShatterParticles(popped.x, popped.y, popped.color, 12);
        }
    }
    
    // Trigger splash particles at the Altar center
    spawnShatterParticles(altar.x, altar.y, altar.color, 24);
    
    // High score addition
    const reward = 1000 + (shrinkCount * 100);
    score += reward;
    currentScoreEl.innerText = score;
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity drop
        p.rotation += p.vRot;
        p.alpha -= p.decay;
        
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

// --- CANVAS RENDERING DETAILS ---
function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cellSize = canvas.width / CONFIG.gridWidth;
    
    // Draw 1: Vault watermark & gothic elements in background
    drawBackground(cellSize);
    
    // Draw 2: Grid boundary walls (Cathedral frame)
    drawGridBoundaries();
    
    // Draw 3: Altars
    drawAltars(cellSize);
    
    // Draw 4: Food items
    drawFood(cellSize);
    
    // Draw 5: Snake segments
    drawSnake(cellSize);
    
    // Draw 6: Light beams (vector layers)
    drawBeams(cellSize);
    
    // Draw 7: Shatter particles
    drawParticles();
    
    // Focus Bullet Time Overlay vignette effect
    if (isFocusMode && gameState === 'playing') {
        drawFocusVignette();
    }
}

function drawBackground(cellSize) {
    // Solid background
    ctx.fillStyle = '#06050b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Sub-radial glow
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 20, canvas.width/2, canvas.height/2, canvas.width * 0.7);
    grad.addColorStop(0, '#130d22');
    grad.addColorStop(1, '#050409');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Thin golden grid mesh lines
    ctx.strokeStyle = 'rgba(209, 184, 128, 0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CONFIG.gridWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.gridHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(canvas.width, y * cellSize);
        ctx.stroke();
    }
    
    // Central Rose window shadow
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.strokeStyle = 'rgba(209, 184, 128, 0.025)';
    ctx.lineWidth = 1.5;
    // Circular bounds
    ctx.beginPath();
    ctx.arc(0, 0, canvas.width * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, canvas.width * 0.20, 0, Math.PI * 2);
    ctx.stroke();
    // Vault spokes
    for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, canvas.width * 0.35);
        ctx.stroke();
    }
    ctx.restore();
}

function drawGridBoundaries() {
    ctx.strokeStyle = 'rgba(209, 184, 128, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

function drawAltars(cellSize) {
    const AltarColors = {
        red: { glow: 'rgba(255, 51, 68, 0.4)', fill: 'rgba(255, 51, 68, 0.15)', core: '#ff3344' },
        blue: { glow: 'rgba(51, 136, 255, 0.4)', fill: 'rgba(51, 136, 255, 0.15)', core: '#3388ff' },
        green: { glow: 'rgba(34, 204, 102, 0.4)', fill: 'rgba(34, 204, 102, 0.15)', core: '#22cc66' },
        yellow: { glow: 'rgba(255, 170, 0, 0.4)', fill: 'rgba(255, 170, 0, 0.15)', core: '#ffaa00' }
    };
    
    altars.forEach(altar => {
        const cx = altar.x * cellSize + cellSize / 2;
        const cy = altar.y * cellSize + cellSize / 2;
        const rad = cellSize * 0.72;
        
        const palette = AltarColors[altar.color];
        
        // If hit, draw heavy screen glow
        if (altar.isIlluminated || altar.charge > 0) {
            ctx.save();
            ctx.shadowBlur = 10 + 20 * altar.charge;
            ctx.shadowColor = palette.core;
            ctx.fillStyle = palette.glow;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Altar Base Frame (gold plate)
        ctx.strokeStyle = 'rgba(209, 184, 128, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.fillStyle = 'rgba(15, 12, 25, 0.85)';
        ctx.beginPath();
        ctx.arc(cx, cy, rad * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner stained glass core
        ctx.fillStyle = palette.fill;
        ctx.strokeStyle = palette.core;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, rad * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Center cross emblem
        ctx.strokeStyle = '#d1b880';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // vertical
        ctx.moveTo(cx, cy - rad * 0.4);
        ctx.lineTo(cx, cy + rad * 0.4);
        // horizontal
        ctx.moveTo(cx - rad * 0.4, cy);
        ctx.lineTo(cx + rad * 0.4, cy);
        ctx.stroke();
        
        // Draw gold circular charge ring
        if (altar.charge > 0) {
            ctx.strokeStyle = '#d1b880';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, rad * 0.8, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * altar.charge));
            ctx.stroke();
        }
    });
}

function drawFood(cellSize) {
    const FoodColors = {
        red: '#ff3344',
        blue: '#3388ff',
        green: '#22cc66',
        yellow: '#ffaa00',
        prism: '#e8d0ff'
    };
    
    const time = performance.now() * 0.0035;
    
    foodList.forEach(food => {
        const cx = food.x * cellSize + cellSize / 2;
        const cy = food.y * cellSize + cellSize / 2;
        const size = cellSize * 0.35 + Math.sin(time + food.x) * 2; // subtle pulse
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time + food.x * 0.5);
        
        if (food.isPrism) {
            // White diamond shape with rainbow shadow blur
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#d180ff';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#e8d0ff';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(0, -size * 1.2);
            ctx.lineTo(size * 0.8, 0);
            ctx.lineTo(0, size * 1.2);
            ctx.lineTo(-size * 0.8, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            // Glowing triangle glass shards
            const colorHex = FoodColors[food.color];
            ctx.shadowBlur = 8;
            ctx.shadowColor = colorHex;
            ctx.fillStyle = colorHex;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.86, size * 0.5);
            ctx.lineTo(-size * 0.86, size * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Internal lead crack lines inside food shard
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(0, size * 0.5);
            ctx.moveTo(0, 0);
            ctx.lineTo(size * 0.86, size * 0.5);
            ctx.stroke();
        }
        ctx.restore();
    });
}

function drawSnake(cellSize) {
    const SegmentColors = {
        red: { core: 'rgba(255, 51, 68, 0.8)', border: '#ff3344', gloss: 'rgba(255, 100, 110, 0.4)' },
        blue: { core: 'rgba(51, 136, 255, 0.8)', border: '#3388ff', gloss: 'rgba(100, 180, 255, 0.4)' },
        green: { core: 'rgba(34, 204, 102, 0.8)', border: '#22cc66', gloss: 'rgba(100, 255, 150, 0.4)' },
        yellow: { core: 'rgba(255, 170, 0, 0.8)', border: '#ffaa00', gloss: 'rgba(255, 220, 100, 0.4)' }
    };
    
    snake.body.forEach((seg, i) => {
        const cx = seg.x * cellSize + cellSize / 2;
        const cy = seg.y * cellSize + cellSize / 2;
        const size = cellSize * 0.88;
        
        ctx.save();
        
        // 1. Draw head specially
        if (i === 0) {
            drawSnakeHead(cx, cy, cellSize);
            ctx.restore();
            return;
        }
        
        const palette = SegmentColors[seg.color] || SegmentColors.blue;
        
        // Black iron lead framing outline
        ctx.fillStyle = 'rgba(8, 6, 12, 0.95)';
        ctx.strokeStyle = 'rgba(209, 184, 128, 0.4)';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        drawRoundRect(ctx, cx - size/2, cy - size/2, size, size, 5);
        ctx.fill();
        ctx.stroke();
        
        // Glass Core insert
        ctx.fillStyle = palette.core;
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 1.5;
        
        const coreSize = size - 6;
        ctx.beginPath();
        drawRoundRect(ctx, cx - coreSize/2, cy - coreSize/2, coreSize, coreSize, 3);
        ctx.fill();
        ctx.stroke();
        
        // Add Glass reflection sheen highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - coreSize/2 + 2, cy - coreSize/2 + 2);
        ctx.lineTo(cx + coreSize/2 - 2, cy + coreSize/2 - 2);
        ctx.stroke();
        
        // Corner Mirror reflection lines:
        // Draw mirror line if it is a perpendicular bend corner
        let isCorner = false;
        let d1 = null, d2 = null;
        if (i < snake.body.length - 1) {
            const prev = snake.body[i - 1];
            const next = snake.body[i + 1];
            d1 = {x: prev.x - seg.x, y: prev.y - seg.y};
            d2 = {x: next.x - seg.x, y: next.y - seg.y};
            if (d1.x * d2.x + d1.y * d2.y === 0) {
                isCorner = true;
            }
        }
        
        if (isCorner) {
            // Draw diagonal gold mirror block line representing the 45-degree prism edge
            ctx.strokeStyle = 'rgba(209, 184, 128, 0.85)';
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#d1b880';
            
            ctx.beginPath();
            // Determine corner direction to align diagonal correctly
            // Connections: Up/Down & Left/Right.
            // Diagonal depends on the quadrant
            if ((d1.x === -1 && d2.y === -1) || (d1.y === -1 && d2.x === -1)) {
                // Connections are Left and Up. Mirror diagonal from Bottom-Left to Top-Right.
                ctx.moveTo(cx - coreSize/2, cy + coreSize/2);
                ctx.lineTo(cx + coreSize/2, cy - coreSize/2);
            } else if ((d1.x === 1 && d2.y === 1) || (d1.y === 1 && d2.x === 1)) {
                // Connections are Right and Down. Mirror diagonal from Bottom-Left to Top-Right.
                ctx.moveTo(cx - coreSize/2, cy + coreSize/2);
                ctx.lineTo(cx + coreSize/2, cy - coreSize/2);
            } else {
                // Connections are Left-Down or Right-Up. Mirror diagonal from Top-Left to Bottom-Right.
                ctx.moveTo(cx - coreSize/2, cy - coreSize/2);
                ctx.lineTo(cx + coreSize/2, cy + coreSize/2);
            }
            ctx.stroke();
        }
        
        ctx.restore();
    });
}

function drawSnakeHead(cx, cy, cellSize) {
    const size = cellSize * 0.95;
    
    // Check if prism mode active (flashing white/rainbow)
    const isPrism = snake.prismTimer > 0;
    const pulse = Math.sin(performance.now() * 0.01) * 0.1 + 1.0;
    
    if (isPrism) {
        // Multi-faceted geometric crystal
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#e8d0ff';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cda0ff';
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        // Hexagonal crystal head shape
        ctx.moveTo(cx, cy - size/2 * pulse);
        ctx.lineTo(cx + size/2 * pulse, cy - size/4 * pulse);
        ctx.lineTo(cx + size/2 * pulse, cy + size/4 * pulse);
        ctx.lineTo(cx, cy + size/2 * pulse);
        ctx.lineTo(cx - size/2 * pulse, cy + size/4 * pulse);
        ctx.lineTo(cx - size/2 * pulse, cy - size/4 * pulse);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Crystal facets lines
        ctx.strokeStyle = 'rgba(138, 43, 226, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy - size/2 * pulse);
        ctx.lineTo(cx, cy + size/2 * pulse);
        ctx.moveTo(cx - size/2 * pulse, cy - size/4 * pulse);
        ctx.lineTo(cx + size/2 * pulse, cy + size/4 * pulse);
        ctx.moveTo(cx - size/2 * pulse, cy + size/4 * pulse);
        ctx.lineTo(cx + size/2 * pulse, cy - size/4 * pulse);
        ctx.stroke();
    } else {
        // Standard Head: Gold-framed cathedral shield/arch shape
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(209, 184, 128, 0.5)';
        ctx.fillStyle = '#0f0c16';
        ctx.strokeStyle = '#d1b880';
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        // Arch profile depending on moving direction
        const rot = Math.atan2(snake.direction.y, snake.direction.x) + Math.PI/2;
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        
        ctx.moveTo(0, -size/2);
        ctx.lineTo(size/2, -size/6);
        ctx.lineTo(size/3, size/2);
        ctx.lineTo(-size/3, size/2);
        ctx.lineTo(-size/2, -size/6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw golden cross on head
        ctx.strokeStyle = '#d1b880';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -size/4);
        ctx.lineTo(0, size/4);
        ctx.moveTo(-size/6, -size/8);
        ctx.lineTo(size/6, -size/8);
        ctx.stroke();
        
        // Small green/blue glowing cathedral eyes
        ctx.fillStyle = '#3388ff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#3388ff';
        ctx.beginPath();
        ctx.arc(-size/4, -size/8, 3, 0, Math.PI * 2);
        ctx.arc(size/4, -size/8, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw thick glowing vector light beams
function drawBeams(cellSize) {
    const BeamColors = {
        red: '#ff3344',
        blue: '#3388ff',
        green: '#22cc66',
        yellow: '#ffaa00'
    };
    
    lightBeams.forEach(beam => {
        if (beam.points.length < 2) return;
        
        const colorHex = BeamColors[beam.color];
        
        // 1. Draw outer blurred screen glow
        ctx.save();
        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 7;
        ctx.shadowBlur = 12;
        ctx.shadowColor = colorHex;
        ctx.globalCompositeOperation = 'screen';
        
        ctx.beginPath();
        const startX = beam.points[0].x * cellSize + cellSize / 2;
        const startY = beam.points[0].y * cellSize + cellSize / 2;
        ctx.moveTo(startX, startY);
        
        for (let i = 1; i < beam.points.length; i++) {
            const px = beam.points[i].x * cellSize + cellSize / 2;
            const py = beam.points[i].y * cellSize + cellSize / 2;
            ctx.lineTo(px, py);
        }
        ctx.stroke();
        
        // 2. Draw thin white inner light core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.stroke();
        
        ctx.restore();
        
        // 3. Draw flowing light particles along the path
        drawBeamFlowParticles(beam, cellSize, colorHex);
    });
}

function drawBeamFlowParticles(beam, cellSize, colorHex) {
    const time = performance.now() * 0.005;
    
    // Draw dots along the lines segment-by-segment
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = colorHex;
    
    for (let i = 0; i < beam.points.length - 1; i++) {
        const p1 = beam.points[i];
        const p2 = beam.points[i+1];
        
        const x1 = p1.x * cellSize + cellSize/2;
        const y1 = p1.y * cellSize + cellSize/2;
        const x2 = p2.x * cellSize + cellSize/2;
        const y2 = p2.y * cellSize + cellSize/2;
        
        // Flow position offset
        const stepOffset = (time + i * 0.4) % 1.0;
        const px = x1 + (x2 - x1) * stepOffset;
        const py = y1 + (y2 - y1) * stepOffset;
        
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawParticles() {
    ctx.save();
    particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        
        // Draw triangular shard particle
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.8, p.size * 0.5);
        ctx.lineTo(-p.size * 0.8, p.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    });
    ctx.restore();
}

function drawFocusVignette() {
    // Glowing purple vignette around boundaries indicating bullet time
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width * 0.4, canvas.width/2, canvas.height/2, canvas.width * 0.72);
    grad.addColorStop(0, 'rgba(138, 43, 226, 0)');
    grad.addColorStop(1, 'rgba(138, 43, 226, 0.25)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Tiny golden Focus target crosshair around head
    const head = snake.body[0];
    const cellSize = canvas.width / CONFIG.gridWidth;
    const hx = head.x * cellSize + cellSize / 2;
    const hy = head.y * cellSize + cellSize / 2;
    
    ctx.strokeStyle = 'rgba(209, 184, 128, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hx, hy, cellSize * 1.5, 0, Math.PI*2);
    ctx.stroke();
}

// Helper functions
function drawRoundRect(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
}
