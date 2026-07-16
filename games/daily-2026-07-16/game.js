// game.js - Steampunk Gear & Pressure

// Game Config
const CANVAS_SIZE = 600;
const BORDER_WIDTH = 15;
const SEGMENT_SPACING = 12; // Distance between segments

// Game Variables
let canvas, ctx;
let gameState = 'start'; // 'start', 'playing', 'gameover'
let score = 0;
let highScore = 0;
let coalBurned = 0;
let waterConsumed = 0;

// Snake Object
let head = { x: 300, y: 300, angle: -Math.PI / 2 };
let segments = []; // Array of {x, y, angle, rot}
let pathHistory = []; // Array of {x, y, angle}
let keySteer = 0; // -1: left, 1: right, 0: none
let targetAngle = -Math.PI / 2;
let controlType = 'keyboard'; // 'keyboard', 'pointer', 'joystick'

// Game Parameters
let baseSpeed = 2.5; // pixels per frame
let pressure = 30; // Steam pressure % (0 - 100)
let maxPressure = 100;
let warningTimer = 0; // for whisting BGM alarm

// Skills & Buffs
let ventActive = false;
let ventTimer = 0;
let ventCooldown = 0; // frames
let overloadTimer = 0; // visual pulses in overload state

// Food items
let coal = { x: 0, y: 0, size: 10, angle: 0 };
let water = { x: 0, y: 0, size: 8, angle: 0 };

// Dynamic Obstacles (Gears)
let obstacles = [
    { x: 150, y: 150, radius: 45, maxRadius: 45, teeth: 12, speed: 0.005, angle: 0, type: 'static', isMeltable: false },
    { x: 450, y: 150, radius: 50, maxRadius: 50, teeth: 14, speed: -0.004, angle: 0, type: 'static', isMeltable: false },
    { x: 150, y: 450, radius: 45, maxRadius: 45, teeth: 12, speed: 0.006, angle: 0, type: 'static', isMeltable: false },
    { x: 450, y: 450, radius: 50, maxRadius: 50, teeth: 14, speed: -0.005, angle: 0, type: 'static', isMeltable: false },
    // Horizontal patrolling gear in the middle
    { x: 300, y: 300, radius: 35, maxRadius: 35, teeth: 10, speed: 0.012, angle: 0, type: 'patrol-h', minX: 180, maxX: 420, dir: 1, speedX: 1.5, isMeltable: true },
    // Small meltable static gears
    { x: 300, y: 130, radius: 22, maxRadius: 22, teeth: 8, speed: 0.008, angle: 0, type: 'static', isMeltable: true },
    { x: 300, y: 470, radius: 22, maxRadius: 22, teeth: 8, speed: -0.008, angle: 0, type: 'static', isMeltable: true }
];

// Particle System
let particles = []; // Array of {x, y, vx, vy, size, alpha, life, maxLife, color}

// Web Audio API Synthesizer
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.pistonTimer = null;
        this.bpm = 80;
        this.noiseBuffer = null;
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
        
        // Pre-generate a 2-second white noise buffer to prevent performance stutters
        const bufferSize = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        let data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        this.startPistonLoop();
    }
    
    startPistonLoop() {
        if (this.pistonTimer) clearInterval(this.pistonTimer);
        const playTick = () => {
            if (!this.enabled || !this.ctx || this.ctx.state === 'suspended' || gameState !== 'playing') return;
            
            try {
                // 1. Low piston thud (compressor)
                let osc = this.ctx.createOscillator();
                let gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.frequency.setValueAtTime(55, this.ctx.currentTime); // A1
                osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
                
                gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
                
                osc.start();
                osc.stop(this.ctx.currentTime + 0.13);
                
                // 2. Exhaust Hiss (noise puff)
                setTimeout(() => {
                    if (!this.enabled || !this.ctx || gameState !== 'playing') return;
                    
                    let bufferSize = this.ctx.sampleRate * 0.07;
                    let buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                    let data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }
                    
                    let noise = this.ctx.createBufferSource();
                    noise.buffer = buffer;
                    
                    let filter = this.ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
                    
                    let gainN = this.ctx.createGain();
                    gainN.gain.setValueAtTime(0.03, this.ctx.currentTime);
                    gainN.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);
                    
                    noise.connect(filter);
                    filter.connect(gainN);
                    gainN.connect(this.ctx.destination);
                    
                    noise.start();
                    noise.stop(this.ctx.currentTime + 0.08);
                }, 180);
            } catch (e) {
                console.error("Audio error", e);
            }
        };
        
        let interval = (60 / this.bpm) * 1000;
        this.pistonTimer = setInterval(playTick, interval);
    }
    
    setBpm(bpm) {
        if (this.bpm === bpm) return;
        this.bpm = bpm;
        if (this.ctx) {
            this.startPistonLoop();
        }
    }
    
    playEatCoal() {
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        try {
            // Metallic ring bell
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(1174.66, this.ctx.currentTime + 0.12);
            
            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.36);
            
            // Fire roar puff
            let noise = this.createNoiseSource(0.2);
            if (noise) {
                let filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(600, this.ctx.currentTime);
                filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.2);
                
                let gainN = this.ctx.createGain();
                gainN.gain.setValueAtTime(0.08, this.ctx.currentTime);
                gainN.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
                
                noise.connect(filter);
                filter.connect(gainN);
                gainN.connect(this.ctx.destination);
                noise.start();
                noise.stop(this.ctx.currentTime + 0.21);
            }
        } catch(e) {}
    }
    
    playEatWater() {
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        try {
            // High steam cooling hiss
            let noise = this.createNoiseSource(0.35);
            if (noise) {
                let filter = this.ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(5000, this.ctx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.35);
                
                let gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start();
                noise.stop(this.ctx.currentTime + 0.36);
            }
            
            // Wet water drip bubble
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
            osc.frequency.exponentialRampToValueAtTime(329.63, this.ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.21);
        } catch(e) {}
    }
    
    playVent() {
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        try {
            // Steam release: white noise blast
            let noise = this.createNoiseSource(0.7);
            if (noise) {
                let filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(3000, this.ctx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.7);
                
                let gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.7);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start();
                noise.stop(this.ctx.currentTime + 0.71);
            }
        } catch(e) {}
    }
    
    playWarning() {
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        try {
            // Alarm whistle: piercing dual frequencies
            let osc1 = this.ctx.createOscillator();
            let osc2 = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(1350, this.ctx.currentTime);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1353, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc1.start();
            osc2.start();
            osc1.stop(this.ctx.currentTime + 0.31);
            osc2.stop(this.ctx.currentTime + 0.31);
        } catch(e) {}
    }
    
    playExplosion() {
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        try {
            if (this.pistonTimer) clearInterval(this.pistonTimer);
            
            // Low boom rumble
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(100, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(5, this.ctx.currentTime + 1.2);
            gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 1.4);
            
            // Massive boiler crack (noise)
            let noise = this.createNoiseSource(1.4);
            if (noise) {
                let filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(700, this.ctx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 1.2);
                
                let gainN = this.ctx.createGain();
                gainN.gain.setValueAtTime(0.35, this.ctx.currentTime);
                gainN.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.4);
                
                noise.connect(filter);
                filter.connect(gainN);
                gainN.connect(this.ctx.destination);
                noise.start();
                noise.stop(this.ctx.currentTime + 1.41);
            }
        } catch(e) {}
    }
    
    createNoiseSource(duration) {
        if (!this.ctx || !this.noiseBuffer) return null;
        let source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;
        return source;
    }
}

const sound = new SoundSynth();

// Initialize Game elements
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Load highscore
    const storedHighScore = localStorage.getItem('steampunk_snake_highscore');
    if (storedHighScore) {
        highScore = parseInt(storedHighScore, 10);
        updateScoreDisplays();
    }
    
    initControls();
    
    // Render start scene once
    drawGameScene();
});

// Steer configuration & inputs
function initControls() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
        if (gameState !== 'playing') return;
        if (e.code === 'Space') {
            triggerSteamVent();
            e.preventDefault();
        }
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            keySteer = -1;
            controlType = 'keyboard';
        }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            keySteer = 1;
            controlType = 'keyboard';
        }
    });

    window.addEventListener('keyup', (e) => {
        if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && keySteer === -1) {
            keySteer = 0;
        }
        if ((e.code === 'ArrowRight' || e.code === 'KeyD') && keySteer === 1) {
            keySteer = 0;
        }
    });
    
    // Canvas pointer controls
    canvas.addEventListener('mousemove', (e) => {
        if (gameState !== 'playing') return;
        steerToPointer(e.clientX, e.clientY);
    });
    
    canvas.addEventListener('touchmove', (e) => {
        if (gameState !== 'playing') return;
        if (e.targetTouches.length > 0) {
            const touch = e.targetTouches[0];
            steerToPointer(touch.clientX, touch.clientY);
        }
    }, { passive: true });
    
    // UI Button bindings
    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-restart').addEventListener('click', startGame);
    
    // Mobile controls setup
    const ventBtnMobile = document.getElementById('btn-vent-mobile');
    ventBtnMobile.addEventListener('touchstart', (e) => {
        triggerSteamVent();
        e.preventDefault();
    });
    
    const joystickBoundary = document.getElementById('joystick-boundary');
    const joystickHandle = document.getElementById('joystick-handle');
    let joystickActive = false;
    let joystickStart = { x: 0, y: 0 };
    
    joystickBoundary.addEventListener('touchstart', (e) => {
        joystickActive = true;
        const touch = e.targetTouches[0];
        const rect = joystickBoundary.getBoundingClientRect();
        joystickStart.x = rect.left + rect.width / 2;
        joystickStart.y = rect.top + rect.height / 2;
        e.preventDefault();
    });
    
    joystickBoundary.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;
        const touch = e.targetTouches[0];
        let dx = touch.clientX - joystickStart.x;
        let dy = touch.clientY - joystickStart.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        let maxDist = 35; // Maximum handle offset
        
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
            dist = maxDist;
        }
        
        joystickHandle.style.transform = `translate(${dx}px, ${dy}px)`;
        
        if (dist > 5) {
            targetAngle = Math.atan2(dy, dx);
            controlType = 'joystick';
        }
        e.preventDefault();
    });
    
    joystickBoundary.addEventListener('touchend', () => {
        joystickActive = false;
        joystickHandle.style.transform = 'translate(0px, 0px)';
    });
    
    // Speed Selector & Audio Lever
    const speedSelect = document.getElementById('speed-select');
    speedSelect.addEventListener('change', () => {
        const val = speedSelect.value;
        if (val === 'slow') baseSpeed = 1.8;
        else if (val === 'normal') baseSpeed = 2.5;
        else if (val === 'fast') baseSpeed = 3.5;
    });
    
    const soundToggle = document.getElementById('sound-toggle');
    soundToggle.addEventListener('change', () => {
        sound.enabled = soundToggle.checked;
    });
}

function steerToPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (CANVAS_SIZE / rect.width);
    const y = (clientY - rect.top) * (CANVAS_SIZE / rect.height);
    
    let dx = x - head.x;
    let dy = y - head.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    
    // Only steer if pointer is not right on top of head to prevent shaking
    if (dist > 20) {
        targetAngle = Math.atan2(dy, dx);
        controlType = 'pointer';
    }
}

// Start Game Core
function startGame() {
    // Audio Context activation on click
    sound.init();
    
    gameState = 'playing';
    score = 0;
    coalBurned = 0;
    waterConsumed = 0;
    pressure = 30;
    ventActive = false;
    ventTimer = 0;
    ventCooldown = 0;
    warningTimer = 0;
    overloadTimer = 0;
    
    // Reset Obstacles state
    for (let obs of obstacles) {
        obs.isMelted = false;
        obs.meltCooldown = 0;
        obs.radius = obs.maxRadius || obs.radius;
    }
    
    // Initialize Snake Positions
    head = { x: 300, y: 350, angle: -Math.PI / 2 };
    targetAngle = -Math.PI / 2;
    keySteer = 0;
    controlType = 'keyboard';
    
    segments = [];
    for (let i = 0; i < 15; i++) {
        segments.push({ x: 300, y: 350 + i * SEGMENT_SPACING, angle: -Math.PI / 2, rot: 0 });
    }
    
    // Pre-populate history backwards
    pathHistory = [];
    for (let i = 0; i < 600; i++) {
        pathHistory.push({ x: 300, y: 350 + i * 2, angle: -Math.PI / 2 });
    }
    
    particles = [];
    
    // Speed selection reset
    const speedSelect = document.getElementById('speed-select');
    const val = speedSelect.value;
    if (val === 'slow') baseSpeed = 1.8;
    else if (val === 'normal') baseSpeed = 2.5;
    else if (val === 'fast') baseSpeed = 3.5;
    
    sound.setBpm(baseSpeed === 1.8 ? 65 : (baseSpeed === 3.5 ? 115 : 85));
    
    // Spawn food
    spawnFood('coal');
    spawnFood('water');
    
    // Hide overlay screens
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    
    updateScoreDisplays();
    
    // Launch Game Loop
    requestAnimationFrame(gameLoop);
}

// Spawning mechanisms
function spawnFood(type) {
    let valid = false;
    let fx = 0, fy = 0;
    
    while (!valid) {
        fx = BORDER_WIDTH + Math.random() * (CANVAS_SIZE - 2 * BORDER_WIDTH - 30) + 15;
        fy = BORDER_WIDTH + Math.random() * (CANVAS_SIZE - 2 * BORDER_WIDTH - 30) + 15;
        
        valid = true;
        
        // Ensure distance from gears
        for (let obs of obstacles) {
            let dx = fx - obs.x;
            let dy = fy - obs.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < obs.radius + 30) {
                valid = false;
                break;
            }
        }
        
        // Ensure distance from snake head
        let dx = fx - head.x;
        let dy = fy - head.y;
        if (Math.sqrt(dx*dx + dy*dy) < 50) {
            valid = false;
        }
    }
    
    if (type === 'coal') {
        coal.x = fx;
        coal.y = fy;
    } else {
        water.x = fx;
        water.y = fy;
    }
}

// Active Skill
function triggerSteamVent() {
    if (pressure >= 30 && ventCooldown <= 0) {
        pressure = Math.max(0, pressure - 30);
        ventActive = true;
        ventTimer = 50; // duration in frames (~0.8s)
        ventCooldown = 90; // cooldown in frames (~1.5s)
        
        sound.playVent();
        
        // Blast particles behind head
        let oppositeAngle = head.angle + Math.PI;
        for (let i = 0; i < 25; i++) {
            let sa = oppositeAngle + (Math.random() - 0.5) * 1.2;
            let speed = 3 + Math.random() * 6;
            particles.push({
                x: head.x - Math.cos(head.angle) * 10,
                y: head.y - Math.sin(head.angle) * 10,
                vx: Math.cos(sa) * speed,
                vy: Math.sin(sa) * speed,
                size: 8 + Math.random() * 12,
                alpha: 0.8,
                life: 0,
                maxLife: 20 + Math.random() * 20,
                color: 'rgba(230, 230, 240, 0.75)'
            });
        }
        
        // Small front steam blast to "clear path"
        for (let i = 0; i < 15; i++) {
            let sa = head.angle + (Math.random() - 0.5) * 0.8;
            let speed = 4 + Math.random() * 5;
            particles.push({
                x: head.x + Math.cos(head.angle) * 12,
                y: head.y + Math.sin(head.angle) * 12,
                vx: Math.cos(sa) * speed,
                vy: Math.sin(sa) * speed,
                size: 6 + Math.random() * 10,
                alpha: 0.9,
                life: 0,
                maxLife: 15 + Math.random() * 15,
                color: 'rgba(240, 240, 255, 0.8)'
            });
        }
    }
}

// Main Game loop
function gameLoop() {
    if (gameState !== 'playing') return;
    
    update();
    drawGameScene();
    
    requestAnimationFrame(gameLoop);
}

// State update logic
function update() {
    // 1. Cooldowns
    if (ventCooldown > 0) ventCooldown--;
    if (ventActive) {
        ventTimer--;
        if (ventTimer <= 0) ventActive = false;
    }
    
    // 2. Slow pressure inflation
    pressure = Math.min(100, pressure + 0.02);
    if (pressure >= 100) {
        gameOver("压力表归红！锅炉内壁熔毁，发生特大爆缩自爆！");
        return;
    }
    
    // Overload Zone Alarm whistling trigger
    if (pressure >= 80 && pressure <= 95) {
        warningTimer++;
        if (warningTimer % 35 === 0) {
            sound.playWarning();
        }
    }
    
    // 3. Move snake head
    let currentSpeed = baseSpeed;
    if (ventActive) {
        currentSpeed *= 1.8;
        sound.setBpm(130);
    } else {
        sound.setBpm(baseSpeed === 1.8 ? 65 : (baseSpeed === 3.5 ? 115 : 85));
    }
    
    // Apply Steering
    if (controlType === 'keyboard') {
        if (keySteer !== 0) {
            head.angle += keySteer * 0.052;
            targetAngle = head.angle;
        }
    } else {
        let diff = targetAngle - head.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        head.angle += diff * 0.12; // Interpolation speed
    }
    
    head.x += Math.cos(head.angle) * currentSpeed;
    head.y += Math.sin(head.angle) * currentSpeed;
    
    // Outer border limits collision check
    if (head.x < BORDER_WIDTH + 8 || head.x > CANVAS_SIZE - BORDER_WIDTH - 8 || 
        head.y < BORDER_WIDTH + 8 || head.y > CANVAS_SIZE - BORDER_WIDTH - 8) {
        gameOver("锅炉重重撞击在外壳蒸汽管道墙上，船体解体自毁！");
        return;
    }
    
    // Pushing history
    pathHistory.unshift({ x: head.x, y: head.y, angle: head.angle });
    let maxHistoryLen = Math.max(1000, segments.length * 20);
    if (pathHistory.length > maxHistoryLen) {
        pathHistory.pop();
    }
    
    // Position body segments along path history (distance trailing algorithm)
    let currentHistoryIdx = 0;
    for (let i = 0; i < segments.length; i++) {
        let prevX = (i === 0) ? head.x : segments[i-1].x;
        let prevY = (i === 0) ? head.y : segments[i-1].y;
        
        let found = false;
        while (currentHistoryIdx < pathHistory.length) {
            let pt = pathHistory[currentHistoryIdx];
            let dx = pt.x - prevX;
            let dy = pt.y - prevY;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist >= SEGMENT_SPACING) {
                segments[i].x = pt.x;
                segments[i].y = pt.y;
                segments[i].angle = pt.angle;
                // Spin segments based on speed
                segments[i].rot += 0.03 * currentSpeed * (i % 2 === 0 ? 1 : -1);
                found = true;
                break;
            }
            currentHistoryIdx++;
        }
        
        if (!found) {
            let lastPt = pathHistory[pathHistory.length - 1] || head;
            segments[i].x = lastPt.x;
            segments[i].y = lastPt.y;
            segments[i].angle = lastPt.angle;
        }
    }
    
    // 4. Update dynamic obstacles (Gears)
    for (let obs of obstacles) {
        obs.angle += obs.speed;
        
        // Handle patrol gears
        if (obs.type === 'patrol-h') {
            obs.x += obs.speedX * obs.dir;
            if (obs.x >= obs.maxX) {
                obs.x = obs.maxX;
                obs.dir = -1;
            } else if (obs.x <= obs.minX) {
                obs.x = obs.minX;
                obs.dir = 1;
            }
        }
        
        // Handle melting and respawning
        if (obs.isMelted) {
            if (obs.radius > 0) {
                obs.radius = Math.max(0, obs.radius - 1.5);
            }
            if (obs.meltCooldown > 0) {
                obs.meltCooldown--;
                if (obs.meltCooldown <= 0) {
                    obs.isMelted = false;
                }
            }
        } else {
            if (obs.radius < (obs.maxRadius || obs.radius)) {
                obs.radius = Math.min(obs.maxRadius, obs.radius + 0.8);
            }
        }
    }
    
    // Obstacle collision check
    for (let obs of obstacles) {
        if (obs.isMelted || obs.radius <= 5) continue;
        
        let dx = head.x - obs.x;
        let dy = head.y - obs.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < obs.radius + 11) { // 11 is actual head radius
            if (ventActive) {
                // If venting steam and obstacle is meltable, melt it!
                if (obs.isMeltable && !obs.isMelted) {
                    obs.isMelted = true;
                    obs.meltCooldown = 240; // 4 seconds
                    // Spawn melt particles
                    for (let i = 0; i < 20; i++) {
                        let sa = Math.random() * Math.PI * 2;
                        let speed = 2 + Math.random() * 4;
                        particles.push({
                            x: obs.x,
                            y: obs.y,
                            vx: Math.cos(sa) * speed,
                            vy: Math.sin(sa) * speed,
                            size: 3 + Math.random() * 5,
                            alpha: 1.0,
                            life: 0,
                            maxLife: 20 + Math.random() * 20,
                            color: '#ffaa00'
                        });
                    }
                    if (sound.enabled && sound.ctx) {
                        sound.playEatWater();
                    }
                }
            } else {
                gameOver("锅炉卡进运转的工业齿轮中，齿片崩碎，当场爆炸解体！");
                return;
            }
        }
    }
    
    // Self-collision checking (immune during active steam vent)
    if (!ventActive) {
        for (let i = 12; i < segments.length; i++) {
            let dx = head.x - segments[i].x;
            let dy = head.y - segments[i].y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 10) {
                gameOver("机械铰链缠绕打结，内部齿轮卡锁自毁！");
                return;
            }
        }
    }
    
    // 5. Collisions with Resources (Food)
    // Coal
    let coalDx = head.x - coal.x;
    let coalDy = head.y - coal.y;
    if (Math.sqrt(coalDx*coalDx + coalDy*coalDy) < 18) {
        eatCoal();
    }
    
    // Water
    let waterDx = head.x - water.x;
    let waterDy = head.y - water.y;
    if (Math.sqrt(waterDx*waterDx + waterDy*waterDy) < 18) {
        eatWater();
    }
    
    // 6. Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96; // drag
        p.vy *= 0.96;
        p.life++;
        p.alpha = 1 - (p.life / p.maxLife);
        if (p.life >= p.maxLife) {
            particles.splice(i, 1);
        }
    }
    
    // Idle steam leakage
    if (Math.random() < 0.12 + (pressure / 300)) {
        let randSeg = segments[Math.floor(Math.random() * segments.length)];
        particles.push({
            x: randSeg.x,
            y: randSeg.y,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            size: 3 + Math.random() * 4,
            alpha: 0.5,
            life: 0,
            maxLife: 20 + Math.random() * 20,
            color: 'rgba(220, 220, 225, 0.4)'
        });
    }
    
    // If Overload bonus active, spawn glowing sparks
    if (pressure >= 80 && pressure <= 95) {
        overloadTimer++;
        if (Math.random() < 0.3) {
            let offsetAngle = head.angle + Math.PI + (Math.random() - 0.5) * 2;
            particles.push({
                x: head.x - Math.cos(head.angle) * 8,
                y: head.y - Math.sin(head.angle) * 8,
                vx: Math.cos(offsetAngle) * (1 + Math.random() * 2),
                vy: Math.sin(offsetAngle) * (1 + Math.random() * 2),
                size: 2 + Math.random() * 3,
                alpha: 1.0,
                life: 0,
                maxLife: 15 + Math.random() * 15,
                color: Math.random() < 0.5 ? '#ff4f00' : '#ff9900'
            });
        }
    }
    
    updateUI();
}

// Intake operations
function eatCoal() {
    coalBurned++;
    let scoreAdd = 100;
    
    // Overload Multiplier
    let overloadBonus = (pressure >= 80 && pressure <= 95);
    if (overloadBonus) {
        scoreAdd = Math.floor(scoreAdd * 1.5);
    }
    
    score += scoreAdd;
    pressure = Math.min(100, pressure + 15);
    
    sound.playEatCoal();
    
    // Grow snake
    let lastSeg = segments[segments.length - 1] || head;
    for (let i = 0; i < 3; i++) {
        segments.push({
            x: lastSeg.x,
            y: lastSeg.y,
            angle: lastSeg.angle,
            rot: 0
        });
    }
    
    // Coal embers burst
    for (let i = 0; i < 15; i++) {
        let sa = Math.random() * Math.PI * 2;
        let speed = 1.5 + Math.random() * 3;
        particles.push({
            x: coal.x,
            y: coal.y,
            vx: Math.cos(sa) * speed,
            vy: Math.sin(sa) * speed,
            size: 3 + Math.random() * 4,
            alpha: 1.0,
            life: 0,
            maxLife: 20 + Math.random() * 20,
            color: Math.random() < 0.6 ? '#ff4b00' : '#ffa500'
        });
    }
    
    spawnFood('coal');
}

function eatWater() {
    waterConsumed++;
    let scoreAdd = 40;
    if (pressure >= 80 && pressure <= 95) {
        scoreAdd = Math.floor(scoreAdd * 1.5);
    }
    score += scoreAdd;
    
    // Cooling decreases pressure
    pressure = Math.max(0, pressure - 20);
    
    sound.playEatWater();
    
    // Water splash particles
    for (let i = 0; i < 15; i++) {
        let sa = Math.random() * Math.PI * 2;
        let speed = 1 + Math.random() * 2.5;
        particles.push({
            x: water.x,
            y: water.y,
            vx: Math.cos(sa) * speed,
            vy: Math.sin(sa) * speed,
            size: 2.5 + Math.random() * 4,
            alpha: 0.9,
            life: 0,
            maxLife: 15 + Math.random() * 20,
            color: '#40c4ff'
        });
    }
    
    spawnFood('water');
}

// UI dashboard updates
function updateUI() {
    // 1. Dial Gauge update
    const needle = document.getElementById('gauge-needle');
    // Map pressure (0 - 100) to degrees (-120 to +120)
    let degrees = -120 + (pressure / 100) * 240;
    needle.style.transform = `rotate(${degrees}deg)`;
    
    const pressureText = document.getElementById('pressure-text');
    pressureText.textContent = `${Math.floor(pressure)}%`;
    
    // Alarm pulse color on dial
    const dial = document.getElementById('pressure-gauge-dial');
    if (pressure >= 90) {
        dial.style.boxShadow = `0 4px 15px rgba(255, 0, 0, 0.7), inset 0 4px 12px rgba(0,0,0,0.5)`;
    } else {
        dial.style.boxShadow = `0 4px 10px rgba(0,0,0,0.6), inset 0 4px 12px rgba(0,0,0,0.5)`;
    }
    
    // 2. Thermometer Heat Fill
    const tempFill = document.getElementById('temp-fill');
    tempFill.style.width = `${pressure}%`;
    if (pressure >= 80) {
        tempFill.style.background = 'linear-gradient(90deg, #d32f2f, #ff1744)';
        tempFill.style.boxShadow = '0 0 12px #ff1744';
    } else if (pressure <= 20) {
        tempFill.style.background = 'linear-gradient(90deg, #1976d2, #29b6f6)';
        tempFill.style.boxShadow = '0 0 8px #29b6f6';
    } else {
        tempFill.style.background = 'linear-gradient(90deg, #ff6f00, #ffab00)';
        tempFill.style.boxShadow = '0 0 10px #ffab00';
    }
    
    // 3. Mode Light & text
    const modeTitle = document.getElementById('status-mode-title');
    const modeDesc = document.getElementById('status-mode-desc');
    const statusLight = document.getElementById('status-light');
    
    statusLight.className = 'status-indicator-light';
    
    if (pressure >= 80 && pressure <= 95) {
        statusLight.classList.add('overload');
        modeTitle.textContent = "超频狂暴 (1.5x得分)";
        modeTitle.style.color = '#ff3d00';
        modeDesc.textContent = "锅炉极度高温高压，推进活塞获得超频积分点数红利！";
    } else if (pressure > 95) {
        statusLight.classList.add('overload');
        modeTitle.textContent = "过热极限 (警告!)";
        modeTitle.style.color = '#d50000';
        modeDesc.textContent = "临界阈值即将爆破！立即泄压释放蒸汽或吃冷水源降压！";
    } else if (pressure < 20) {
        statusLight.classList.add('offload');
        modeTitle.textContent = "低压怠速";
        modeTitle.style.color = '#29b6f6';
        modeDesc.textContent = "气压较低，机甲蛇行动迟缓，无法释放高压蒸汽冲刺。";
    } else {
        modeTitle.textContent = "常规增压";
        modeTitle.style.color = '#fff';
        modeDesc.textContent = "效率100%。机械核心运行良好，维持压力平衡。";
    }
    
    // 4. Vent charge meter
    const chargeFill = document.getElementById('charge-fill');
    if (ventCooldown > 0) {
        let pct = (1 - (ventCooldown / 90)) * 100;
        chargeFill.style.width = `${pct}%`;
        chargeFill.style.backgroundColor = '#70551e';
    } else {
        if (pressure >= 30) {
            chargeFill.style.width = '100%';
            chargeFill.style.backgroundColor = '#e5b84c';
        } else {
            chargeFill.style.width = `${(pressure / 30) * 100}%`;
            chargeFill.style.backgroundColor = '#c62828';
        }
    }
    
    updateScoreDisplays();
}

function updateScoreDisplays() {
    document.getElementById('current-score').textContent = padNum(score, 5);
    document.getElementById('high-score').textContent = padNum(highScore, 5);
    document.getElementById('coal-count').textContent = coalBurned;
    document.getElementById('water-count').textContent = waterConsumed;
}

function padNum(num, digits) {
    let s = num.toString();
    while (s.length < digits) s = '0' + s;
    return s;
}

// Game Over Execution
function gameOver(reason) {
    gameState = 'gameover';
    
    sound.playExplosion();
    
    // Screen shaking visual trigger
    canvas.style.animation = 'shake 0.8s ease';
    setTimeout(() => {
        canvas.style.animation = '';
    }, 800);
    
    // Check high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('steampunk_snake_highscore', highScore.toString());
    }
    
    // Populate report
    document.getElementById('death-reason').textContent = reason;
    document.getElementById('final-score').textContent = padNum(score, 5);
    document.getElementById('final-coal').textContent = coalBurned;
    document.getElementById('final-water').textContent = waterConsumed;
    
    // Show Screen overlay
    document.getElementById('game-over-screen').classList.remove('hidden');
}

// Draw Canvas Methods
function drawGameScene() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // 1. Draw Boiler Plate Flooring Background
    drawFloor();
    
    // 2. Draw outer border copper pipes
    drawBorders();
    
    // 3. Draw Gear Obstacles
    drawObstacles();
    
    // 4. Draw Foods
    drawFoodItems();
    
    // 5. Draw Particles
    drawParticles();
    
    // 6. Draw Snake Body & Head
    if (gameState === 'playing' || gameState === 'gameover') {
        drawSnake();
    }
    
    // Overload pulsing border vignette effect
    if (gameState === 'playing' && pressure >= 80) {
        let pulse = 0.2 + Math.abs(Math.sin(overloadTimer * 0.08)) * 0.3;
        if (pressure > 95) pulse = 0.5 + Math.abs(Math.sin(overloadTimer * 0.2)) * 0.4;
        
        ctx.save();
        ctx.strokeStyle = pressure > 95 ? `rgba(230, 0, 0, ${pulse})` : `rgba(255, 80, 0, ${pulse})`;
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, CANVAS_SIZE - 10, CANVAS_SIZE - 10);
        ctx.restore();
    }
}

function drawFloor() {
    // Metal color plates grid
    ctx.fillStyle = '#1d120a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    ctx.strokeStyle = '#2d1b0f';
    ctx.lineWidth = 1;
    let size = 60;
    
    // Grid Lines
    for (let x = 0; x < CANVAS_SIZE; x += size) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_SIZE);
        ctx.stroke();
    }
    for (let y = 0; y < CANVAS_SIZE; y += size) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_SIZE, y);
        ctx.stroke();
    }
    
    // Rivet dots on grid intersections
    ctx.fillStyle = '#22140a';
    for (let x = size; x < CANVAS_SIZE; x += size) {
        for (let y = size; y < CANVAS_SIZE; y += size) {
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawBorders() {
    // Copper pipes border
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(0, 0, CANVAS_SIZE, BORDER_WIDTH); // top
    ctx.fillRect(0, CANVAS_SIZE - BORDER_WIDTH, CANVAS_SIZE, BORDER_WIDTH); // bottom
    ctx.fillRect(0, 0, BORDER_WIDTH, CANVAS_SIZE); // left
    ctx.fillRect(CANVAS_SIZE - BORDER_WIDTH, 0, BORDER_WIDTH, CANVAS_SIZE); // right
    
    // Outer shiny brass pipeline reflection lines
    ctx.strokeStyle = '#c59b3f';
    ctx.lineWidth = 2;
    ctx.strokeRect(BORDER_WIDTH, BORDER_WIDTH, CANVAS_SIZE - 2*BORDER_WIDTH, CANVAS_SIZE - 2*BORDER_WIDTH);
    
    ctx.strokeStyle = '#603517';
    ctx.lineWidth = 1;
    ctx.strokeRect(BORDER_WIDTH - 5, BORDER_WIDTH - 5, CANVAS_SIZE - 2*BORDER_WIDTH + 10, CANVAS_SIZE - 2*BORDER_WIDTH + 10);
    
    // Drawing corner copper bracket fittings
    ctx.fillStyle = '#5c3a1e';
    ctx.strokeStyle = '#c59b3f';
    ctx.lineWidth = 1.5;
    
    const sizes = [
        [0, 0],
        [CANVAS_SIZE - 24, 0],
        [0, CANVAS_SIZE - 24],
        [CANVAS_SIZE - 24, CANVAS_SIZE - 24]
    ];
    for (let s of sizes) {
        ctx.fillRect(s[0], s[1], 24, 24);
        ctx.strokeRect(s[0] + 2, s[1] + 2, 20, 20);
        
        ctx.fillStyle = '#2a1508';
        ctx.beginPath();
        ctx.arc(s[0] + 12, s[1] + 12, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#5c3a1e';
    }
}

function drawObstacles() {
    for (let obs of obstacles) {
        if (obs.radius <= 1) continue;
        
        let scale = obs.radius / (obs.maxRadius || obs.radius);
        
        drawGear(obs.x, obs.y, obs.radius, obs.teeth, obs.angle, {
            dark: '#3d2b15',
            light: '#9e782f',
            spokes: '#6b501d'
        });
        
        // Steel center bolts
        ctx.fillStyle = '#585e63';
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, 10 * scale, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#2b2d30';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
        
        ctx.fillStyle = '#3c2414';
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, 4 * scale, 0, Math.PI*2);
        ctx.fill();
    }
}

function drawGear(x, y, radius, teeth, angle, color) {
    if (radius <= 1) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Gear teeth path
    ctx.beginPath();
    let numTeeth = teeth;
    for (let i = 0; i < numTeeth * 2; i++) {
        let alpha = (Math.PI * i) / numTeeth;
        let r = (i % 2 === 0) ? radius : Math.max(0, radius - 7);
        ctx.lineTo(Math.cos(alpha) * r, Math.sin(alpha) * r);
    }
    ctx.closePath();
    ctx.fillStyle = color.dark;
    ctx.fill();
    ctx.strokeStyle = color.light;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Hollow ring cutout
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.55, 0, Math.PI*2);
    ctx.fillStyle = '#1d120a'; // floor dark background
    ctx.fill();
    ctx.stroke();
    
    // Spokes
    ctx.strokeStyle = color.spokes;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
        let alpha = (Math.PI * i) / 2;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(alpha) * radius * 0.55, Math.sin(alpha) * radius * 0.55);
    }
    ctx.stroke();
    
    ctx.restore();
}

function drawFoodItems() {
    // 1. Draw Coal
    ctx.save();
    ctx.translate(coal.x, coal.y);
    coal.angle += 0.015;
    ctx.rotate(coal.angle);
    
    // Float wiggle
    let floatY = Math.sin(Date.now() * 0.005) * 2;
    
    // Glowing backing
    let gradGlow = ctx.createRadialGradient(0, floatY, 2, 0, floatY, 15);
    gradGlow.addColorStop(0, 'rgba(255, 75, 0, 0.45)');
    gradGlow.addColorStop(1, 'rgba(255, 75, 0, 0)');
    ctx.fillStyle = gradGlow;
    ctx.beginPath();
    ctx.arc(0, floatY, 15, 0, Math.PI*2);
    ctx.fill();
    
    // Coal rock jagged path
    ctx.beginPath();
    ctx.moveTo(0, -9 + floatY);
    ctx.lineTo(8, -6 + floatY);
    ctx.lineTo(10, 2 + floatY);
    ctx.lineTo(4, 9 + floatY);
    ctx.lineTo(-7, 7 + floatY);
    ctx.lineTo(-9, -2 + floatY);
    ctx.closePath();
    
    ctx.fillStyle = '#1f1a17'; // Coal charcoal black
    ctx.fill();
    ctx.strokeStyle = '#c59b3f'; // Brass edges
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Glowing lava cracks inside coal
    ctx.strokeStyle = '#ff5500';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -2 + floatY);
    ctx.lineTo(2, 3 + floatY);
    ctx.moveTo(3, -3 + floatY);
    ctx.lineTo(-2, 4 + floatY);
    ctx.stroke();
    ctx.restore();
    
    // 2. Draw Water teardrop
    ctx.save();
    ctx.translate(water.x, water.y);
    water.angle += 0.02;
    
    let floatW = Math.cos(Date.now() * 0.004) * 2.5;
    
    // Water bubble blue backing glow
    let gradGlowW = ctx.createRadialGradient(0, floatW, 1, 0, floatW, 14);
    gradGlowW.addColorStop(0, 'rgba(64, 196, 255, 0.4)');
    gradGlowW.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradGlowW;
    ctx.beginPath();
    ctx.arc(0, floatW, 14, 0, Math.PI*2);
    ctx.fill();
    
    // Teardrop shape path
    ctx.beginPath();
    ctx.moveTo(0, -9 + floatW);
    ctx.bezierCurveTo(6, -3 + floatW, 7, 5 + floatW, 0, 9 + floatW);
    ctx.bezierCurveTo(-7, 5 + floatW, -6, -3 + floatW, 0, -9 + floatW);
    ctx.closePath();
    
    let waterGrad = ctx.createLinearGradient(0, -9+floatW, 0, 9+floatW);
    waterGrad.addColorStop(0, '#e0f7fa');
    waterGrad.addColorStop(0.5, '#40c4ff');
    waterGrad.addColorStop(1, '#0288d1');
    ctx.fillStyle = waterGrad;
    ctx.fill();
    
    // Specular highlight white dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2.5, -2 + floatW, 2.5, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
}

function drawSnake() {
    // A. Draw Body Segments (Gears) backwards so head draws on top
    for (let i = segments.length - 1; i >= 0; i--) {
        let seg = segments[i];
        
        // Draw bronze linkage rods connecting segments
        let nextPt = (i === 0) ? head : segments[i-1];
        ctx.strokeStyle = '#4e331f';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(seg.x, seg.y);
        ctx.lineTo(nextPt.x, nextPt.y);
        ctx.stroke();
        
        ctx.strokeStyle = '#c59b3f';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Draw segments gears
        // As segments get closer to the tail, make gears slightly smaller
        let scale = Math.max(0.6, 1 - (i / segments.length) * 0.35);
        let rad = 9 * scale;
        let numTeeth = 8;
        
        // Body color overrides: if overload active, add orange overlay
        let darkCol = '#3d2516';
        let lightCol = '#a2762f';
        if (pressure >= 80 && pressure <= 95) {
            let flicker = Math.random() < 0.15 ? '#ff5500' : '#8e3518';
            darkCol = flicker;
            lightCol = '#ffd200';
        }
        
        drawGear(seg.x, seg.y, rad, numTeeth, seg.rot, {
            dark: darkCol,
            light: lightCol,
            spokes: '#2e180a'
        });
        
        // Iron rivet rivet cap in segment center
        ctx.fillStyle = '#585e63';
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, 3 * scale, 0, Math.PI*2);
        ctx.fill();
    }
    
    // B. Draw Head
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(head.angle);
    
    // Glowing furnace eye aura
    let pressureGlowPct = Math.max(0, (pressure - 20) / 80); // 0 at 20% pressure, 1 at 100%
    if (pressureGlowPct > 0) {
        let glowRad = 15 + pressureGlowPct * 12;
        let radGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, glowRad);
        if (pressure >= 95) {
            // Hyper-red flashing
            let col = Math.floor(Date.now() / 100) % 2 === 0 ? 'rgba(255, 0, 0, 0.6)' : 'rgba(255, 100, 0, 0.4)';
            radGrad.addColorStop(0, col);
            radGrad.addColorStop(1, 'rgba(255,0,0,0)');
        } else {
            radGrad.addColorStop(0, `rgba(255, ${120 - pressureGlowPct * 80}, 0, ${0.35 + pressureGlowPct * 0.3})`);
            radGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
        }
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(0, 0, glowRad, 0, Math.PI*2);
        ctx.fill();
    }
    
    // Head shape: Brass capsule structure
    ctx.fillStyle = '#3a200f'; // Dark inner metal
    ctx.strokeStyle = '#c59b3f'; // Brass piping
    ctx.lineWidth = 2.5;
    
    ctx.beginPath();
    // Capsule pointing forward (positive X is forward after rotation)
    ctx.arc(0, 0, 11, -Math.PI/2, Math.PI/2);
    ctx.lineTo(-6, 11);
    ctx.lineTo(-6, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Shiny steel plates on head
    ctx.fillStyle = '#7a5a22';
    ctx.beginPath();
    ctx.arc(-2, 0, 7, 0, Math.PI*2);
    ctx.fill();
    
    // Furnace Core Window lens (eye) pointing forward (X axis)
    ctx.fillStyle = '#1d120a';
    ctx.beginPath();
    ctx.arc(6, 0, 4.5, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    
    // Inner fiery core glow
    let fireColor = '#ff6200';
    if (pressure >= 80) fireColor = '#ff0000';
    else if (pressure < 20) fireColor = '#00aeff';
    
    ctx.fillStyle = fireColor;
    ctx.beginPath();
    ctx.arc(6, 0, 2.5, 0, Math.PI*2);
    ctx.fill();
    
    // Steam valves pipes details on head left/right
    ctx.fillStyle = '#61381c';
    ctx.fillRect(-6, -13, 4, 3);
    ctx.fillRect(-6, 10, 4, 3);
    ctx.strokeStyle = '#c59b3f';
    ctx.strokeRect(-6, -13, 4, 3);
    ctx.strokeRect(-6, 10, 4, 3);
    
    ctx.restore();
}

function drawParticles() {
    for (let p of particles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
        
        // Steam details (soft blur effect simulated with overlay outlines)
        if (p.color.indexOf('rgba(230') === 0 || p.color.indexOf('rgba(240') === 0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        ctx.restore();
    }
}
