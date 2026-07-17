/**
 * game.js - Abyssal Glow: Deep Sea Echolocation Snake
 * Author: Antigravity Team
 * Date: 2026-07-18
 */

// --- Game Engine State ---
const state = {
    // Canvas & Context
    canvas: null,
    ctx: null,
    
    // Game loop
    isRunning: false,
    isPaused: false,
    lastTime: 0,
    animationFrameId: null,
    
    // Core metrics
    score: 0,
    highScore: 0,
    glowIntensity: 1.0, // multiplier based on size / pearls
    
    // Controls configuration
    controlMode: 'pointer', // 'pointer' or 'keyboard'
    mousePos: { x: 300, y: 300 },
    keys: {},
    
    // Player Snake object
    snake: {
        x: 300,
        y: 300,
        angle: -Math.PI / 2, // Swim upwards initially
        targetAngle: -Math.PI / 2,
        speed: 2.6,
        baseSpeed: 2.6,
        size: 14,
        segmentSpacing: 11,
        segments: [] // Array of {x, y, angle, size}
    },
    
    // Game Entities
    food: [],
    obstacles: [],
    predators: [],
    sonarPulses: [],
    particles: [],
    marineSnow: [],
    
    // Spawning & timers
    pearlActive: false,
    pearlTimer: 0,
    sonarCooldown: 0, // In ms
    sonarMaxCooldown: 1500, // 1.5 seconds
    
    // Audio engine state
    audioEnabled: true,
    audioCtx: null,
    masterGain: null,
    ambientDrone: null,
    compressor: null,
    
    // Pre-rendered offscreen sprite cache
    sprites: {}
};

// --- Web Audio Synthesizer ---
class AudioSynth {
    constructor() {
        this.ctx = null;
        this.compressor = null;
        this.droneOsc1 = null;
        this.droneOsc2 = null;
        this.droneFilter = null;
        this.droneGain = null;
    }

    init() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            
            // Dynamics Compressor to protect ears and prevent clipping
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-20, this.ctx.currentTime);
            this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
            this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
            this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
            this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
            this.compressor.connect(this.ctx.destination);
            
            this.startAmbientDrone();
        } catch (e) {
            console.error("Failed to initialize Web Audio Context:", e);
        }
    }

    startAmbientDrone() {
        if (!this.ctx) return;
        
        // Deep sea watery drone: two low frequency triangle waves filtered by LFO
        this.droneOsc1 = this.ctx.createOscillator();
        this.droneOsc2 = this.ctx.createOscillator();
        this.droneFilter = this.ctx.createBiquadFilter();
        this.droneGain = this.ctx.createGain();
        
        this.droneOsc1.type = 'triangle';
        this.droneOsc1.frequency.setValueAtTime(65, this.ctx.currentTime); // Low B
        
        this.droneOsc2.type = 'triangle';
        this.droneOsc2.frequency.setValueAtTime(65.5, this.ctx.currentTime); // Chorus beat
        
        this.droneFilter.type = 'lowpass';
        this.droneFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
        this.droneFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);
        
        // LFO 1 modulating filter cutoff for "breathing" effect
        const lfo1 = this.ctx.createOscillator();
        const lfoGain1 = this.ctx.createGain();
        lfo1.frequency.setValueAtTime(0.05, this.ctx.currentTime); // 20s period
        lfoGain1.gain.setValueAtTime(50, this.ctx.currentTime); // modulate up/down by 50Hz
        
        lfo1.connect(lfoGain1);
        lfoGain1.connect(this.droneFilter.frequency);
        lfo1.start();
        
        // Volume gain (Checks if audio is enabled initially)
        const initialVol = state.audioEnabled ? 0.22 : 0.0;
        this.droneGain.gain.setValueAtTime(initialVol, this.ctx.currentTime);
        
        // Connections
        this.droneOsc1.connect(this.droneFilter);
        this.droneOsc2.connect(this.droneFilter);
        this.droneFilter.connect(this.droneGain);
        this.droneGain.connect(this.compressor);
        
        this.droneOsc1.start();
        this.droneOsc2.start();
    }

    setAmbientDroneVolume(volume) {
        if (this.droneGain && this.ctx) {
            this.droneGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.1);
        }
    }

    playSonarPing() {
        if (!this.ctx || !state.audioEnabled) return;
        const now = this.ctx.currentTime;
        
        // Sonar Ping Sound: Sine sweep with echo
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const delay = this.ctx.createDelay();
        const feedback = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 1.2);
        
        gainNode.gain.setValueAtTime(0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        
        // Delay settings
        delay.delayTime.setValueAtTime(0.3, now);
        feedback.gain.setValueAtTime(0.4, now); // 40% feedback echo
        
        // Connect osc to output and delay loop
        osc.connect(gainNode);
        gainNode.connect(this.compressor);
        
        // Feedback loop
        gainNode.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 1.3);
        
        // Schedule cleanup to prevent delay loop memory leaks
        setTimeout(() => {
            try {
                osc.disconnect();
                gainNode.disconnect();
                delay.disconnect();
                feedback.disconnect();
            } catch (e) {}
        }, 3000);
    }

    playBite() {
        if (!this.ctx || !state.audioEnabled) return;
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.08); // short pop/slide
        
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        
        osc.connect(gainNode);
        gainNode.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 0.09);
    }

    playPearlCollect() {
        if (!this.ctx || !state.audioEnabled) return;
        const now = this.ctx.currentTime;
        
        // A magical arpeggio of synthetic sine notes
        const freqs = [329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // E Minor/Major arpeggio
        
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            
            gainNode.gain.setValueAtTime(0.0, now + idx * 0.08);
            gainNode.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
            
            osc.connect(gainNode);
            gainNode.connect(this.compressor);
            
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.45);
        });
    }

    playDeath() {
        if (!this.ctx || !state.audioEnabled) return;
        const now = this.ctx.currentTime;
        
        // Heavy water impact: sliding down sine combined with noise rumble
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.8);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, now);
        filter.frequency.linearRampToValueAtTime(40, now + 0.8);
        
        oscGain.gain.setValueAtTime(0.6, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 0.9);
    }
}

const synth = new AudioSynth();

// --- Pre-render Sprites (Offscreen Canvas Caching) ---
function initPreRenderedSprites() {
    const size = 64; // Size of cache canvas for drawing
    
    // 1. Plankton Sprite (Glowing green)
    const pCanvas = document.createElement('canvas');
    pCanvas.width = size; pCanvas.height = size;
    const pCtx = pCanvas.getContext('2d');
    
    // Draw neon green glow circle
    let grad = pCtx.createRadialGradient(size/2, size/2, 2, size/2, size/2, size/2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, '#64ffda');
    grad.addColorStop(0.4, 'rgba(57, 255, 20, 0.8)');
    grad.addColorStop(0.8, 'rgba(57, 255, 20, 0.15)');
    grad.addColorStop(1, 'rgba(57, 255, 20, 0)');
    pCtx.fillStyle = grad;
    pCtx.beginPath();
    pCtx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    pCtx.fill();
    state.sprites.plankton = pCanvas;
    
    // 2. Jellyfish Sprite (Glowing magenta)
    const jCanvas = document.createElement('canvas');
    jCanvas.width = size; jCanvas.height = size;
    const jCtx = jCanvas.getContext('2d');
    
    grad = jCtx.createRadialGradient(size/2, size/2, 3, size/2, size/2, size/2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#ff79c6');
    grad.addColorStop(0.5, 'rgba(248, 87, 166, 0.7)');
    grad.addColorStop(0.8, 'rgba(248, 87, 166, 0.12)');
    grad.addColorStop(1, 'rgba(248, 87, 166, 0)');
    jCtx.fillStyle = grad;
    jCtx.beginPath();
    jCtx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    jCtx.fill();
    state.sprites.jellyfish = jCanvas;

    // 3. Pearl Sprite (Glowing gold)
    const prlCanvas = document.createElement('canvas');
    prlCanvas.width = size; prlCanvas.height = size;
    const prlCtx = prlCanvas.getContext('2d');
    
    grad = prlCtx.createRadialGradient(size/2, size/2, 4, size/2, size/2, size/2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#ffea00');
    grad.addColorStop(0.6, 'rgba(255, 215, 0, 0.6)');
    grad.addColorStop(0.8, 'rgba(255, 215, 0, 0.15)');
    grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    prlCtx.fillStyle = grad;
    prlCtx.beginPath();
    prlCtx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    prlCtx.fill();
    state.sprites.pearl = prlCanvas;

    // 4. Snake Head Sprite (Glowing cyan - medium)
    const hCanvas = document.createElement('canvas');
    hCanvas.width = size; hCanvas.height = size;
    const hCtx = hCanvas.getContext('2d');
    
    grad = hCtx.createRadialGradient(size/2, size/2, 4, size/2, size/2, size/2 - 4);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, '#d4f1f9');
    grad.addColorStop(0.45, 'rgba(0, 242, 254, 0.9)');
    grad.addColorStop(0.8, 'rgba(0, 242, 254, 0.2)');
    grad.addColorStop(1, 'rgba(0, 242, 254, 0)');
    hCtx.fillStyle = grad;
    hCtx.beginPath();
    hCtx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    hCtx.fill();
    state.sprites.snakeHead = hCanvas;

    // 5. Snake Body Sprite (Glowing cyan - smaller/fade)
    const bCanvas = document.createElement('canvas');
    bCanvas.width = size; bCanvas.height = size;
    const bCtx = bCanvas.getContext('2d');
    
    grad = bCtx.createRadialGradient(size/2, size/2, 2, size/2, size/2, size/2 - 6);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, 'rgba(0, 242, 254, 0.7)');
    grad.addColorStop(0.7, 'rgba(0, 242, 254, 0.15)');
    grad.addColorStop(1, 'rgba(0, 242, 254, 0)');
    bCtx.fillStyle = grad;
    bCtx.beginPath();
    bCtx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    bCtx.fill();
    state.sprites.snakeBody = bCanvas;

    // 6. Anglerfish Esca Lure Sprite (Flashing red)
    const escaCanvas = document.createElement('canvas');
    escaCanvas.width = size; escaCanvas.height = size;
    const escaCtx = escaCanvas.getContext('2d');
    
    grad = escaCtx.createRadialGradient(size/2, size/2, 3, size/2, size/2, size/2 - 2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#ff4d4d');
    grad.addColorStop(0.55, 'rgba(255, 7, 58, 0.85)');
    grad.addColorStop(0.85, 'rgba(255, 7, 58, 0.2)');
    grad.addColorStop(1, 'rgba(255, 7, 58, 0)');
    escaCtx.fillStyle = grad;
    escaCtx.beginPath();
    escaCtx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    escaCtx.fill();
    state.sprites.esca = escaCanvas;
}

// --- Initialization & Setup ---
document.addEventListener('DOMContentLoaded', () => {
    state.canvas = document.getElementById('game-canvas');
    state.ctx = state.canvas.getContext('2d');
    
    // Pre-render glowing spheres
    initPreRenderedSprites();
    
    // Setup high score
    const cachedHigh = localStorage.getItem('abyssal_snake_high');
    if (cachedHigh) {
        state.highScore = parseInt(cachedHigh, 10);
        document.getElementById('high-score').textContent = state.highScore;
    }
    
    setupEventListeners();
    setupMarineSnow();
    
    // Draw initial empty dark canvas
    drawInitialScene();
});

function setupEventListeners() {
    // 1. Controls Select Mode
    const controlSelect = document.getElementById('control-select');
    controlSelect.addEventListener('change', (e) => {
        state.controlMode = e.target.value;
    });

    // 2. Audio Toggle Switch
    const soundToggle = document.getElementById('sound-toggle');
    soundToggle.addEventListener('change', (e) => {
        state.audioEnabled = e.target.checked;
        if (synth.ctx) {
            if (state.audioEnabled) {
                if (synth.ctx.state === 'suspended') {
                    synth.ctx.resume();
                }
                synth.setAmbientDroneVolume(0.22);
            } else {
                synth.setAmbientDroneVolume(0);
            }
        }
    });

    // 3. UI Buttons
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('resume-btn').addEventListener('click', resumeGame);

    // 4. Keyboard Inputs
    window.addEventListener('keydown', (e) => {
        state.keys[e.key] = true;
        
        // Prevent default scrolling keys
        if (['Space', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
        
        // Trigger active Sonar with Space
        if (e.key === ' ' || e.code === 'Space') {
            triggerSonar();
        }
        
        // Pause trigger with 'p' or Escape
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
            if (state.isRunning) {
                togglePause();
            }
        }
    });
    
    window.addEventListener('keyup', (e) => {
        state.keys[e.key] = false;
    });

    // 5. Mouse/Pointer Tracking for PC
    state.canvas.addEventListener('mousemove', (e) => {
        if (state.controlMode !== 'pointer') return;
        const rect = state.canvas.getBoundingClientRect();
        
        // Scale appropriately based on CSS scale
        state.mousePos.x = ((e.clientX - rect.left) / rect.width) * state.canvas.width;
        state.mousePos.y = ((e.clientY - rect.top) / rect.height) * state.canvas.height;
    });

    // 6. Mobile Touch Events (Drag tracking on canvas)
    let touchActive = false;
    
    const handleTouchMove = (e) => {
        if (state.controlMode !== 'pointer' || e.touches.length === 0) return;
        const touch = e.touches[0];
        const rect = state.canvas.getBoundingClientRect();
        
        state.mousePos.x = ((touch.clientX - rect.left) / rect.width) * state.canvas.width;
        state.mousePos.y = ((touch.clientY - rect.top) / rect.height) * state.canvas.height;
    };

    state.canvas.addEventListener('touchstart', (e) => {
        touchActive = true;
        if (synth.ctx && synth.ctx.state === 'suspended') {
            synth.ctx.resume();
        }
        handleTouchMove(e);
    });

    state.canvas.addEventListener('touchmove', (e) => {
        if (!touchActive) return;
        handleTouchMove(e);
    });

    state.canvas.addEventListener('touchend', () => {
        touchActive = false;
    });

    // 7. Mobile Sonar Button
    document.getElementById('mobile-sonar-btn').addEventListener('click', (e) => {
        e.preventDefault();
        triggerSonar();
    });
}

function setupMarineSnow() {
    state.marineSnow = [];
    for (let i = 0; i < 40; i++) {
        state.marineSnow.push({
            x: Math.random() * 600,
            y: Math.random() * 600,
            speed: 0.15 + Math.random() * 0.25,
            size: 0.8 + Math.random() * 1.5,
            opacity: 0.1 + Math.random() * 0.4
        });
    }
}

// --- Initial Scene Drawing (Before playing) ---
function drawInitialScene() {
    state.ctx.fillStyle = '#000208';
    state.ctx.fillRect(0, 0, 600, 600);
    
    // Draw some faint grid lines
    state.ctx.strokeStyle = 'rgba(0, 242, 254, 0.03)';
    state.ctx.lineWidth = 1;
    for (let x = 0; x < 600; x += 40) {
        state.ctx.beginPath();
        state.ctx.moveTo(x, 0);
        state.ctx.lineTo(x, 600);
        state.ctx.stroke();
    }
    for (let y = 0; y < 600; y += 40) {
        state.ctx.beginPath();
        state.ctx.moveTo(0, y);
        state.ctx.lineTo(600, y);
        state.ctx.stroke();
    }
}

// --- Game Control Methods ---
function startGame() {
    // Hide UI
    document.getElementById('start-screen').classList.add('hidden');
    
    // Init Audio Context (must be on user interaction)
    if (!synth.ctx) {
        synth.init();
    } else if (synth.ctx.state === 'suspended') {
        synth.ctx.resume();
    }
    
    resetGameParams();
    state.isRunning = true;
    state.lastTime = performance.now();
    state.animationFrameId = requestAnimationFrame(gameLoop);
}

function restartGame() {
    document.getElementById('gameover-screen').classList.add('hidden');
    resetGameParams();
    state.isRunning = true;
    state.lastTime = performance.now();
    state.animationFrameId = requestAnimationFrame(gameLoop);
}

function resetGameParams() {
    state.score = 0;
    state.glowIntensity = 1.0;
    state.pearlActive = false;
    state.pearlTimer = 0;
    state.sonarCooldown = 0;
    state.isPaused = false;
    
    // Restore ambient drone volume to default gameplay level if audio is enabled
    if (state.audioEnabled && synth.ctx) {
        synth.setAmbientDroneVolume(0.22);
    }
    
    // Reset snake
    state.snake.x = 300;
    state.snake.y = 300;
    state.snake.angle = -Math.PI / 2;
    state.snake.targetAngle = -Math.PI / 2;
    state.snake.speed = state.snake.baseSpeed;
    state.snake.segments = [];
    
    // Pre-populate snake segments (length = 15 initially)
    for (let i = 0; i < 15; i++) {
        state.snake.segments.push({
            x: 300,
            y: 300 + (i + 1) * state.snake.segmentSpacing,
            angle: -Math.PI / 2,
            size: state.snake.size * (1 - i * 0.02) // Gradual narrowing
        });
    }
    
    state.food = [];
    state.obstacles = [];
    state.predators = [];
    state.sonarPulses = [];
    state.particles = [];
    
    // Generate initial elements
    generateObstacles();
    spawnFood('plankton');
    spawnFood('plankton');
    spawnFood('jellyfish');
    
    // Reset HUD
    updateHUD();
    document.getElementById('vignette').style.opacity = '1';
}

function togglePause() {
    if (!state.isRunning) return;
    
    if (state.isPaused) {
        resumeGame();
    } else {
        state.isPaused = true;
        document.getElementById('pause-screen').classList.remove('hidden');
        if (state.audioEnabled && synth.ctx) {
            synth.setAmbientDroneVolume(0.05); // Dampen ambient drone in pause
        }
    }
}

function resumeGame() {
    state.isPaused = false;
    document.getElementById('pause-screen').classList.add('hidden');
    state.lastTime = performance.now();
    state.animationFrameId = requestAnimationFrame(gameLoop);
    if (state.audioEnabled && synth.ctx) {
        synth.setAmbientDroneVolume(0.22);
    }
}

function gameOver(reason) {
    state.isRunning = false;
    cancelAnimationFrame(state.animationFrameId);
    
    synth.playDeath();
    if (state.audioEnabled && synth.ctx) {
        synth.setAmbientDroneVolume(0.03);
    }
    
    // Save High Score
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('abyssal_snake_high', state.highScore);
        
        // Update high score in HUD card
        const hsHUD = document.getElementById('high-score');
        if (hsHUD) hsHUD.textContent = state.highScore;
    }
    
    // Show Screen
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('final-score').textContent = state.score;
    document.getElementById('final-high').textContent = state.highScore;
    document.getElementById('death-reason').innerHTML = `探测器撞击了<strong>${reason}</strong>，在强大的深海压力下解体。`;
    
    updateHUD();
}

// --- Generator Helper Functions ---
function generateObstacles() {
    // Generate 12 trench rocks of random shapes
    const count = 12;
    for (let i = 0; i < count; i++) {
        let x, y, r;
        let valid = false;
        
        // Make sure obstacles do not spawn close to the start area (300, 300)
        while (!valid) {
            x = 40 + Math.random() * 520;
            y = 40 + Math.random() * 520;
            r = 15 + Math.random() * 25; // Rock collision radius
            
            const distToStart = Math.hypot(x - 300, y - 300);
            if (distToStart > 120) {
                valid = true;
            }
        }
        
        // Create irregular polygon points for visual drawing
        const numPoints = 5 + Math.floor(Math.random() * 4);
        const points = [];
        for (let p = 0; p < numPoints; p++) {
            const angle = (p / numPoints) * Math.PI * 2;
            const offsetRadius = r * (0.85 + Math.random() * 0.3); // irregular shape
            points.push({
                x: x + Math.cos(angle) * offsetRadius,
                y: y + Math.sin(angle) * offsetRadius
            });
        }
        
        state.obstacles.push({
            x, y, r, points,
            scannedIntensity: 0.0 // sonar glow intensity
        });
    }
}

function spawnFood(type) {
    let x, y;
    let valid = false;
    
    while (!valid) {
        x = 30 + Math.random() * 540;
        y = 30 + Math.random() * 540;
        valid = true;
        
        // Ensure not inside obstacles
        for (let obs of state.obstacles) {
            const d = Math.hypot(x - obs.x, y - obs.y);
            if (d < obs.r + 20) {
                valid = false;
                break;
            }
        }
    }
    
    state.food.push({
        x, y, type,
        bounceOffset: Math.random() * Math.PI * 2,
        pulseIntensity: 0.0
    });
}

function spawnPredator() {
    // Shadow Anglerfish swims slowly across the map
    const edge = Math.floor(Math.random() * 4);
    let x, y, angle;
    
    // Spawn from screen boundary
    if (edge === 0) { // Top
        x = Math.random() * 600; y = -40; angle = Math.PI/4 + Math.random() * Math.PI/2;
    } else if (edge === 1) { // Right
        x = 640; y = Math.random() * 600; angle = Math.PI * 0.75 + Math.random() * Math.PI/2;
    } else if (edge === 2) { // Bottom
        x = Math.random() * 600; y = 640; angle = -Math.PI/4 - Math.random() * Math.PI/2;
    } else { // Left
        x = -40; y = Math.random() * 600; angle = -Math.PI/4 + Math.random() * Math.PI/2;
    }
    
    state.predators.push({
        x, y, angle,
        speed: 0.8 + Math.random() * 0.4,
        escaBlinkTimer: 0,
        scannedIntensity: 0.0,
        r: 16 // Collision body size
    });
}

// --- Active Sonar Ping Trigger ---
function triggerSonar() {
    if (!state.isRunning || state.isPaused || state.sonarCooldown > 0) return;
    
    // Trigger audio
    synth.playSonarPing();
    
    // Trigger visual HUD pulse animation
    const radarHUD = document.getElementById('sonar-radar-hud');
    const wave = radarHUD.querySelector('.sonar-wave-hud');
    wave.classList.remove('pinging');
    void wave.offsetWidth; // Trigger reflow
    wave.classList.add('pinging');
    
    // Spawn core sonar expanding ring
    state.sonarPulses.push({
        x: state.snake.x,
        y: state.snake.y,
        r: 0,
        maxR: 650,
        speed: 6.5 // Travel speed per frame
    });
    
    // Trigger 1.5s cooldown
    state.sonarCooldown = state.sonarMaxCooldown;
    
    updateHUD();
}

// --- Particle Explosion ---
function createFoodExplosion(x, y, color) {
    const count = 10 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 2.5;
        state.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.03,
            size: 2 + Math.random() * 3
        });
    }
}

// --- Game Logic Loop ---
function gameLoop(timestamp) {
    if (!state.isRunning) return;
    if (state.isPaused) return;
    
    const deltaTime = timestamp - state.lastTime;
    state.lastTime = timestamp;
    
    update(deltaTime);
    render();
    
    state.animationFrameId = requestAnimationFrame(gameLoop);
}

function update(dt) {
    // 1. Cooldown timers
    if (state.sonarCooldown > 0) {
        state.sonarCooldown -= dt;
        if (state.sonarCooldown < 0) state.sonarCooldown = 0;
        updateHUD();
    }
    
    if (state.pearlActive) {
        state.pearlTimer -= dt;
        if (state.pearlTimer <= 0) {
            state.pearlActive = false;
            state.snake.speed = state.snake.baseSpeed;
            document.getElementById('vignette').style.opacity = '1';
        }
    }
    
    // Frame rate ratio compared to standard 60 FPS (16.67ms per frame)
    const targetFPS = 60;
    const dtRatio = Math.min(4, dt / (1000 / targetFPS));
    
    // Decay scanned intensities
    for (let obs of state.obstacles) {
        if (obs.scannedIntensity > 0) {
            obs.scannedIntensity = Math.max(0, obs.scannedIntensity - 0.007 * dtRatio);
        }
    }
    for (let pred of state.predators) {
        if (pred.scannedIntensity > 0) {
            pred.scannedIntensity = Math.max(0, pred.scannedIntensity - 0.01 * dtRatio);
        }
    }
    
    // 2. Update marine snow
    for (let snow of state.marineSnow) {
        snow.y += snow.speed * dtRatio;
        if (snow.y > 600) {
            snow.y = -10;
            snow.x = Math.random() * 600;
        }
    }
    
    // 3. Update Snake Movement & Direction
    updateSnakePosition(dtRatio);
    
    // 4. Update Sonar Pulses
    updateSonarPulses(dtRatio);
    
    // 5. Update Predators
    updatePredators(dtRatio);
    
    // 6. Check Collisions (Food & Death)
    checkCollisions();
    
    // 7. Update Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx * dtRatio;
        p.y += p.vy * dtRatio;
        p.life -= p.decay * dtRatio;
        if (p.life <= 0) {
            state.particles.splice(i, 1);
        }
    }
    
    // 8. Periodically spawn Anglerfish if score increases
    if (state.score >= 150 && state.predators.length < Math.min(3, 1 + Math.floor((state.score - 100) / 150))) {
        if (Math.random() < 0.002 * dtRatio) {
            spawnPredator();
        }
    }
}

function updateSnakePosition(dtRatio) {
    const s = state.snake;
    
    if (state.controlMode === 'pointer') {
        // Pointer tracking steering
        const dx = state.mousePos.x - s.x;
        const dy = state.mousePos.y - s.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 10) {
            // Target angle toward mouse pointer
            s.targetAngle = Math.atan2(dy, dx);
            
            // Interpolate/smooth the turn angle
            let diff = s.targetAngle - s.angle;
            
            // Normalize diff to [-PI, PI]
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            
            // Exponential decay turning for frame-rate independence
            const turnRate = 1 - Math.pow(1 - 0.075, dtRatio);
            s.angle += diff * turnRate;
        }
    } else {
        // Keyboard turning (Relative steer A/D)
        const turnSpeed = 0.05 * dtRatio;
        if (state.keys['a'] || state.keys['A'] || state.keys['ArrowLeft']) {
            s.angle -= turnSpeed;
        }
        if (state.keys['d'] || state.keys['D'] || state.keys['ArrowRight']) {
            s.angle += turnSpeed;
        }
    }
    
    // Move snake head forward
    const speed = state.pearlActive ? state.snake.speed : state.snake.baseSpeed;
    const stepSpeed = speed * dtRatio;
    s.x += Math.cos(s.angle) * stepSpeed;
    s.y += Math.sin(s.angle) * stepSpeed;
    
    // Follow physics for segments (Lag-follow mechanics)
    let prev = { x: s.x, y: s.y };
    for (let i = 0; i < s.segments.length; i++) {
        let seg = s.segments[i];
        let dx = prev.x - seg.x;
        let dy = prev.y - seg.y;
        let dist = Math.hypot(dx, dy);
        
        if (dist > s.segmentSpacing) {
            let ratio = (dist - s.segmentSpacing) / dist;
            seg.x += dx * ratio;
            seg.y += dy * ratio;
        }
        seg.angle = Math.atan2(dy, dx);
        prev = seg;
    }
}

function updateSonarPulses(dtRatio) {
    for (let i = state.sonarPulses.length - 1; i >= 0; i--) {
        const pulse = state.sonarPulses[i];
        pulse.r += pulse.speed * dtRatio;
        
        // Scan obstacles hit by this pulse
        for (let obs of state.obstacles) {
            const d = Math.hypot(obs.x - pulse.x, obs.y - pulse.y);
            // Scan triggers when pulse ring boundaries intersect the obstacle
            if (Math.abs(d - pulse.r) < 30 * Math.max(1, dtRatio)) {
                obs.scannedIntensity = 1.0;
            }
        }
        
        // Scan predators hit by this pulse
        for (let pred of state.predators) {
            const d = Math.hypot(pred.x - pulse.x, pred.y - pulse.y);
            if (Math.abs(d - pulse.r) < 30 * Math.max(1, dtRatio)) {
                pred.scannedIntensity = 1.0;
            }
        }
        
        // Delete expired pulses
        if (pulse.r >= pulse.maxR) {
            state.sonarPulses.splice(i, 1);
        }
    }
}

function updatePredators(dtRatio) {
    for (let i = state.predators.length - 1; i >= 0; i--) {
        const pred = state.predators[i];
        
        // Slowly move in its angle direction
        pred.x += Math.cos(pred.angle) * pred.speed * dtRatio;
        pred.y += Math.sin(pred.angle) * pred.speed * dtRatio;
        
        // Slowly blink Esca red lure
        pred.escaBlinkTimer += 0.05 * dtRatio;
        
        // Random directional drift to look natural
        if (Math.random() < 0.015 * dtRatio) {
            pred.angle += (Math.random() - 0.5) * 0.8;
        }
        
        // Remove if way out of bounds
        if (pred.x < -100 || pred.x > 700 || pred.y < -100 || pred.y > 700) {
            state.predators.splice(i, 1);
        }
    }
}

function checkCollisions() {
    const s = state.snake;
    
    // Boundary collision
    if (s.x < 0 || s.x > 600 || s.y < 0 || s.y > 600) {
        gameOver("边缘壁垒");
        return;
    }
    
    // Trench rock obstacles collision
    for (let obs of state.obstacles) {
        const dist = Math.hypot(s.x - obs.x, s.y - obs.y);
        if (dist < obs.r + 3) {
            gameOver("深海礁石");
            return;
        }
    }
    
    // Shadow Anglerfish predator collision
    for (let pred of state.predators) {
        const dist = Math.hypot(s.x - pred.x, s.y - pred.y);
        if (dist < pred.r + 5) {
            gameOver("暗影安康鱼");
            return;
        }
    }
    
    // Self-collision (skip first 18 segments to allow coil flexibility)
    for (let i = 20; i < s.segments.length; i++) {
        const seg = s.segments[i];
        const dist = Math.hypot(s.x - seg.x, s.y - seg.y);
        if (dist < 8) {
            gameOver("自身的能量回路");
            return;
        }
    }
    
    // Food collisions
    for (let i = state.food.length - 1; i >= 0; i--) {
        const f = state.food[i];
        const dist = Math.hypot(s.x - f.x, s.y - f.y);
        
        if (dist < s.size + 8) {
            // Eaten!
            handleFoodEaten(f, i);
        }
    }
}

function handleFoodEaten(foodItem, index) {
    state.food.splice(index, 1);
    
    if (foodItem.type === 'plankton') {
        synth.playBite();
        state.score += 10;
        createFoodExplosion(foodItem.x, foodItem.y, '#39ff14');
        growSnake(3); // Add segments
        spawnFood('plankton');
        
        // Spawn rare jellyfish periodically based on score
        if (Math.random() < 0.25 && state.food.filter(f => f.type === 'jellyfish').length < 2) {
            spawnFood('jellyfish');
        }
        // Spawn rare pearls
        if (Math.random() < 0.10 && state.food.filter(f => f.type === 'pearl').length === 0) {
            spawnFood('pearl');
        }
    } else if (foodItem.type === 'jellyfish') {
        synth.playBite();
        state.score += 30;
        createFoodExplosion(foodItem.x, foodItem.y, '#f857a6');
        growSnake(6);
        
        // Trigger automatic massive sonar ring!
        triggerJellyfishSonar(foodItem.x, foodItem.y);
        
        spawnFood('plankton');
    } else if (foodItem.type === 'pearl') {
        synth.playPearlCollect();
        state.score += 50;
        createFoodExplosion(foodItem.x, foodItem.y, '#ffd700');
        growSnake(8);
        
        // Trigger Abyssal Dawn mode
        state.pearlActive = true;
        state.pearlTimer = 5000; // 5 seconds duration
        state.snake.speed = state.snake.baseSpeed * 1.35;
        document.getElementById('vignette').style.opacity = '0'; // Dispel vignette darkness
    }
    
    updateHUD();
}

function growSnake(count) {
    const lastSeg = state.snake.segments[state.snake.segments.length - 1] || state.snake;
    for (let i = 0; i < count; i++) {
        // Append tail segments
        state.snake.segments.push({
            x: lastSeg.x,
            y: lastSeg.y,
            angle: lastSeg.angle,
            size: state.snake.size * 0.6 // size scale
        });
    }
    
    // Dynamically adjust size parameters based on length
    // Make sure tail widths narrow down progressively
    const totalLen = state.snake.segments.length;
    for (let idx = 0; idx < totalLen; idx++) {
        state.snake.segments[idx].size = state.snake.size * (1 - (idx / totalLen) * 0.65);
    }
}

function triggerJellyfishSonar(x, y) {
    // Massive immediate automatic sonar wave
    state.sonarPulses.push({
        x: x,
        y: y,
        r: 0,
        maxR: 800,
        speed: 9.0 // travels faster
    });
}

// --- HUD Updates ---
function updateHUD() {
    document.getElementById('current-score').textContent = state.score;
    
    // Cooldown bar & text
    const fillPercent = 100 - (state.sonarCooldown / state.sonarMaxCooldown) * 100;
    document.getElementById('sonar-fill-bar').style.width = `${fillPercent}%`;
    
    const sonarStatusText = document.getElementById('sonar-hud-status');
    const mobileSonarCd = document.getElementById('mobile-sonar-cooldown');
    
    if (state.sonarCooldown > 0) {
        sonarStatusText.textContent = "CHARGING";
        sonarStatusText.classList.add('cooldown');
        mobileSonarCd.style.transform = `scaleY(${state.sonarCooldown / state.sonarMaxCooldown})`;
    } else {
        sonarStatusText.textContent = "READY";
        sonarStatusText.classList.remove('cooldown');
        mobileSonarCd.style.transform = `scaleY(0)`;
    }
    
    // Glow level HUD (increases slightly with size)
    const baseGlow = 100;
    const extraGlow = Math.min(100, Math.floor(state.snake.segments.length * 1.5));
    const intensity = state.pearlActive ? 200 : (baseGlow + extraGlow);
    document.getElementById('glow-intensity-text').textContent = `${intensity}%`;
    document.getElementById('glow-intensity-bar').style.width = `${Math.min(100, intensity / 2)}%`;
}

// --- Graphics Rendering Loop ---
function render() {
    // Clear screen
    state.ctx.fillStyle = '#000105';
    state.ctx.fillRect(0, 0, 600, 600);
    
    // Draw background grid lines (very faint)
    state.ctx.strokeStyle = 'rgba(0, 242, 254, 0.02)';
    state.ctx.lineWidth = 1;
    for (let x = 0; x < 600; x += 40) {
        state.ctx.beginPath();
        state.ctx.moveTo(x, 0);
        state.ctx.lineTo(x, 600);
        state.ctx.stroke();
    }
    for (let y = 0; y < 600; y += 40) {
        state.ctx.beginPath();
        state.ctx.moveTo(0, y);
        state.ctx.lineTo(600, y);
        state.ctx.stroke();
    }
    
    // Render Marine Snow
    state.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let snow of state.marineSnow) {
        state.ctx.fillStyle = `rgba(255, 255, 255, ${snow.opacity})`;
        state.ctx.beginPath();
        state.ctx.arc(snow.x, snow.y, snow.size, 0, Math.PI * 2);
        state.ctx.fill();
    }
    
    // Determine lighting ranges for render elements
    const headGlowR = state.pearlActive ? 750 : (90 + state.snake.segments.length * 0.4);
    
    // Render Food
    renderFood(headGlowR);
    
    // Render Static Obstacles (Trench Rocks)
    renderObstacles(headGlowR);
    
    // Render Predators (Shadow Anglerfish)
    renderPredators(headGlowR);
    
    // Render Snake Body (Segment list)
    renderSnake();
    
    // Render Sonar Wave Rings
    renderSonarPulses();
    
    // Render Particles
    renderParticles();
}

function renderFood(headGlowR) {
    for (let f of state.food) {
        // Floating motion bounce displacement
        f.bounceOffset += 0.05;
        const dy = Math.sin(f.bounceOffset) * 2.5;
        
        // Check if food is in light glow range
        const distToHead = Math.hypot(f.x - state.snake.x, (f.y + dy) - state.snake.y);
        let visibility = 0.08; // Small ambient glowing outline in darkness
        
        if (state.pearlActive) {
            visibility = 1.0;
        } else if (distToHead < headGlowR) {
            visibility = 1.0 - (distToHead / headGlowR) * 0.8;
            visibility = Math.max(visibility, 0.08);
        }
        
        // Also check sonar pulse rings
        for (let pulse of state.sonarPulses) {
            const d = Math.hypot(f.x - pulse.x, f.y - pulse.y);
            const distToWave = Math.abs(d - pulse.r);
            if (distToWave < 60) {
                const pulseVisibility = 1.0 - (distToWave / 60);
                visibility = Math.max(visibility, pulseVisibility);
            }
        }
        
        state.ctx.save();
        state.ctx.globalAlpha = visibility;
        
        // Render pre-rendered cache sprite
        let sprite = state.sprites.plankton;
        if (f.type === 'jellyfish') sprite = state.sprites.jellyfish;
        if (f.type === 'pearl') sprite = state.sprites.pearl;
        
        const size = f.type === 'plankton' ? 24 : (f.type === 'jellyfish' ? 32 : 36);
        state.ctx.drawImage(sprite, f.x - size/2, f.y + dy - size/2, size, size);
        
        state.ctx.restore();
    }
}

function renderObstacles(headGlowR) {
    for (let obs of state.obstacles) {
        const distToHead = Math.hypot(obs.x - state.snake.x, obs.y - state.snake.y);
        let visibility = 0.0;
        
        if (state.pearlActive) {
            visibility = 1.0;
        } else if (distToHead < headGlowR) {
            // Fade opacity based on proximity
            visibility = 1.0 - (distToHead / headGlowR);
        }
        
        // Combine with sonar pulse scanned intensity
        visibility = Math.max(visibility, obs.scannedIntensity);
        
        if (visibility > 0.02) {
            state.ctx.save();
            state.ctx.globalAlpha = visibility;
            
            // Draw irregular rock shape filled with dark-blue rock texture gradient
            const grad = state.ctx.createRadialGradient(obs.x, obs.y, 2, obs.x, obs.y, obs.r);
            grad.addColorStop(0, '#091530');
            grad.addColorStop(1, '#020615');
            state.ctx.fillStyle = grad;
            
            // Draw path
            state.ctx.beginPath();
            state.ctx.moveTo(obs.points[0].x, obs.points[0].y);
            for (let k = 1; k < obs.points.length; k++) {
                state.ctx.lineTo(obs.points[k].x, obs.points[k].y);
            }
            state.ctx.closePath();
            state.ctx.fill();
            
            // Drawing stroke neon contour edge line
            state.ctx.strokeStyle = '#53647c';
            state.ctx.lineWidth = 1.5;
            state.ctx.stroke();
            
            // Add subtle grid highlights on scanned walls
            if (obs.scannedIntensity > 0.2) {
                state.ctx.strokeStyle = `rgba(0, 242, 254, ${obs.scannedIntensity * 0.4})`;
                state.ctx.lineWidth = 2.0;
                state.ctx.stroke();
            }
            
            state.ctx.restore();
        }
    }
}

function renderPredators(headGlowR) {
    for (let pred of state.predators) {
        const distToHead = Math.hypot(pred.x - state.snake.x, pred.y - state.snake.y);
        let visibility = 0.0;
        
        if (state.pearlActive) {
            visibility = 1.0;
        } else if (distToHead < headGlowR) {
            visibility = 1.0 - (distToHead / headGlowR);
        }
        
        visibility = Math.max(visibility, pred.scannedIntensity);
        
        // 1. Draw Anglerfish Body (Invisible or ghostly visible in darkness)
        state.ctx.save();
        state.ctx.globalAlpha = visibility;
        
        // Draw predatory fish body shape
        state.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        state.ctx.strokeStyle = '#ff073a';
        state.ctx.lineWidth = 1.2;
        
        // Oval body centered around predator coordinates
        state.ctx.beginPath();
        state.ctx.ellipse(pred.x, pred.y, pred.r * 1.4, pred.r, pred.angle, 0, Math.PI * 2);
        state.ctx.fill();
        state.ctx.stroke();
        
        // Draw a tail fin
        const tailX = pred.x - Math.cos(pred.angle) * pred.r * 1.5;
        const tailY = pred.y - Math.sin(pred.angle) * pred.r * 1.5;
        state.ctx.beginPath();
        state.ctx.moveTo(pred.x, pred.y);
        state.ctx.lineTo(tailX + Math.cos(pred.angle + Math.PI/2) * 12, tailY + Math.sin(pred.angle + Math.PI/2) * 12);
        state.ctx.lineTo(tailX - Math.cos(pred.angle + Math.PI/2) * 12, tailY - Math.sin(pred.angle + Math.PI/2) * 12);
        state.ctx.closePath();
        state.ctx.fill();
        state.ctx.stroke();
        
        state.ctx.restore();
        
        // 2. Draw Esca Red Lure (ALWAYS visible, blinking in darkness)
        state.ctx.save();
        
        // Lure position: projects forward and above the fish's head
        const escaDist = pred.r * 1.8;
        const escaAngle = pred.angle + 0.4; // offset arc hook
        const escaX = pred.x + Math.cos(escaAngle) * escaDist;
        const escaY = pred.y + Math.sin(escaAngle) * escaDist;
        
        // Draw rod line (hook) if body is visible
        if (visibility > 0.05) {
            state.ctx.globalAlpha = visibility;
            state.ctx.strokeStyle = '#334155';
            state.ctx.lineWidth = 1.5;
            state.ctx.beginPath();
            state.ctx.moveTo(pred.x + Math.cos(pred.angle) * pred.r * 0.8, pred.y + Math.sin(pred.angle) * pred.r * 0.8);
            state.ctx.quadraticCurveTo(
                pred.x + Math.cos(pred.angle + 0.5) * pred.r * 1.6,
                pred.y + Math.sin(pred.angle + 0.5) * pred.r * 1.6,
                escaX, escaY
            );
            state.ctx.stroke();
        }
        
        // Render flashing red light esca (Blinks, but never fully vanishes)
        const flashIntensity = 0.45 + Math.sin(pred.escaBlinkTimer * 6) * 0.45;
        state.ctx.globalAlpha = flashIntensity;
        
        state.ctx.drawImage(state.sprites.esca, escaX - 16, escaY - 16, 32, 32);
        state.ctx.restore();
    }
}

function renderSnake() {
    const s = state.snake;
    
    // Draw trail body segments (tail to head to overlap correctly)
    for (let i = s.segments.length - 1; i >= 0; i--) {
        const seg = s.segments[i];
        
        state.ctx.save();
        // Falloff opacity. Min opacity 25% to guarantee player visibility
        const segmentProgress = i / s.segments.length;
        const baseOpacity = 0.28 + (1 - segmentProgress) * 0.65;
        state.ctx.globalAlpha = baseOpacity;
        
        // Draw body segment image cache
        const dSize = seg.size * 2.8; // scaled for glow padding
        state.ctx.drawImage(state.sprites.snakeBody, seg.x - dSize/2, seg.y - dSize/2, dSize, dSize);
        
        state.ctx.restore();
    }
    
    // Draw head on top
    state.ctx.save();
    state.ctx.globalAlpha = 1.0;
    
    const hGlowSize = s.size * 3.2;
    state.ctx.drawImage(state.sprites.snakeHead, s.x - hGlowSize/2, s.y - hGlowSize/2, hGlowSize, hGlowSize);
    
    // Draw eyes or organism detail on head
    state.ctx.fillStyle = '#ffffff';
    const eyeOffsetX = Math.cos(s.angle + 0.55) * 6;
    const eyeOffsetY = Math.sin(s.angle + 0.55) * 6;
    const eye2OffsetX = Math.cos(s.angle - 0.55) * 6;
    const eye2OffsetY = Math.sin(s.angle - 0.55) * 6;
    
    state.ctx.beginPath();
    state.ctx.arc(s.x + eyeOffsetX, s.y + eyeOffsetY, 2.5, 0, Math.PI * 2);
    state.ctx.arc(s.x + eye2OffsetX, s.y + eye2OffsetY, 2.5, 0, Math.PI * 2);
    state.ctx.fill();
    
    // On-head circular sonar cooldown visualizer (radar circle around head)
    if (state.sonarCooldown > 0) {
        state.ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
        state.ctx.lineWidth = 1.5;
        
        // Sector progress circle based on cooldown remaining
        const progress = state.sonarCooldown / state.sonarMaxCooldown;
        state.ctx.beginPath();
        state.ctx.arc(s.x, s.y, s.size * 1.5, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * (1 - progress)));
        state.ctx.stroke();
    } else {
        // Readiness indicator: small pulsing cyan ring
        const readyPulse = 1.5 + Math.sin(performance.now() * 0.008) * 0.2;
        state.ctx.strokeStyle = 'rgba(0, 242, 254, 0.7)';
        state.ctx.lineWidth = 1.0;
        state.ctx.beginPath();
        state.ctx.arc(s.x, s.y, s.size * readyPulse, 0, Math.PI * 2);
        state.ctx.stroke();
    }
    
    state.ctx.restore();
}

function renderSonarPulses() {
    for (let pulse of state.sonarPulses) {
        state.ctx.save();
        
        const opacity = 1.0 - (pulse.r / pulse.maxR);
        state.ctx.strokeStyle = `rgba(0, 242, 254, ${opacity})`;
        state.ctx.lineWidth = 2.5 * (1 - pulse.r / pulse.maxR) + 0.5;
        
        // Draw expanding sonar ring
        state.ctx.beginPath();
        state.ctx.arc(pulse.x, pulse.y, pulse.r, 0, Math.PI * 2);
        state.ctx.stroke();
        
        // Secondary softer visual reverberation ring
        if (pulse.r > 60) {
            state.ctx.strokeStyle = `rgba(0, 242, 254, ${opacity * 0.45})`;
            state.ctx.lineWidth = 1.0;
            state.ctx.beginPath();
            state.ctx.arc(pulse.x, pulse.y, pulse.r - 40, 0, Math.PI * 2);
            state.ctx.stroke();
        }
        
        state.ctx.restore();
    }
}

function renderParticles() {
    for (let p of state.particles) {
        state.ctx.save();
        state.ctx.globalAlpha = p.life;
        state.ctx.fillStyle = p.color;
        
        // Glowing dot
        state.ctx.beginPath();
        state.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        state.ctx.fill();
        
        state.ctx.restore();
    }
}
