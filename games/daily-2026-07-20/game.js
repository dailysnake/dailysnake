/* ==========================================================================
   织星者 (Constellation Weaver) - Core Game Script
   ========================================================================== */

// 1. Web Audio Synthesizer Engine
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.bgOsc = null;
        this.bgLfo = null;
        this.bgGain = null;
        this.enabled = true;
        this.lastWarningTime = 0;
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.enabled) {
                this.startBgMusic();
            }
        } catch (e) {
            console.warn("Web Audio API not supported or blocked: ", e);
        }
    }

    startBgMusic() {
        if (!this.enabled || !this.ctx) return;
        try {
            this.stopBgMusic();

            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            // Low frequency carrier wave (Synth Pad) for deep space feel
            this.bgOsc = this.ctx.createOscillator();
            this.bgOsc.type = 'triangle';
            this.bgOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note

            let filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(120, this.ctx.currentTime);

            this.bgGain = this.ctx.createGain();
            this.bgGain.gain.setValueAtTime(0.1, this.ctx.currentTime);

            // LFO to modulate frequency slightly for a drifting sweep
            this.bgLfo = this.ctx.createOscillator();
            this.bgLfo.type = 'sine';
            this.bgLfo.frequency.setValueAtTime(0.08, this.ctx.currentTime); // very slow modulation

            let lfoGain = this.ctx.createGain();
            lfoGain.gain.setValueAtTime(6, this.ctx.currentTime); // +/- 6Hz sway

            this.bgLfo.connect(lfoGain);
            lfoGain.connect(this.bgOsc.frequency);

            this.bgOsc.connect(filter);
            filter.connect(this.bgGain);
            this.bgGain.connect(this.ctx.destination);

            this.bgOsc.start();
            this.bgLfo.start();
        } catch (e) {
            console.error("Failed to start BG synth: ", e);
        }
    }

    stopBgMusic() {
        try {
            if (this.bgOsc) {
                this.bgOsc.stop();
                this.bgOsc.disconnect();
                this.bgOsc = null;
            }
            if (this.bgLfo) {
                this.bgLfo.stop();
                this.bgLfo.disconnect();
                this.bgLfo = null;
            }
        } catch (e) {}
    }

    playStarEat() {
        if (!this.enabled || !this.ctx) return;
        try {
            let t = this.ctx.currentTime;
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();

            osc.type = 'sine';
            // FM Frequency sweep
            osc.frequency.setValueAtTime(783.99, t); // G5 note
            osc.frequency.exponentialRampToValueAtTime(1567.98, t + 0.12); // G6 note

            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.16);
        } catch (e) {}
    }

    playSupernova() {
        if (!this.enabled || !this.ctx) return;
        try {
            let t = this.ctx.currentTime;
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.exponentialRampToValueAtTime(880, t + 0.3);

            let filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, t);
            filter.frequency.exponentialRampToValueAtTime(300, t + 0.3);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.36);
        } catch (e) {}
    }

    playCollapse(intensity) {
        if (!this.enabled || !this.ctx) return;
        try {
            let t = this.ctx.currentTime;

            // 1. White Noise Sweep for space explosion implosion
            let bufferSize = this.ctx.sampleRate * 0.45;
            let buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            let data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            let noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            let filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(900, t);
            filter.frequency.exponentialRampToValueAtTime(120, t + 0.4);

            let noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.25, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(t);

            // 2. Multi-tone cosmic arpeggio chime (chords scale up with intensity)
            let baseNotes = [523.25, 659.25, 783.99, 1046.50]; // C Major
            if (intensity > 2) {
                baseNotes = [587.33, 739.99, 880.00, 1174.66]; // D Major
            }
            let duration = 0.5;

            baseNotes.forEach((freq, idx) => {
                let noteOsc = this.ctx.createOscillator();
                let noteGain = this.ctx.createGain();

                noteOsc.type = 'sine';
                noteOsc.frequency.setValueAtTime(freq, t + idx * 0.06);

                noteGain.gain.setValueAtTime(0.0, t);
                noteGain.gain.linearRampToValueAtTime(0.12, t + idx * 0.06 + 0.01);
                noteGain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + duration);

                noteOsc.connect(noteGain);
                noteGain.connect(this.ctx.destination);

                noteOsc.start(t + idx * 0.06);
                noteOsc.stop(t + idx * 0.06 + duration + 0.05);
            });
        } catch (e) {}
    }

    playWarning(distance) {
        if (!this.enabled || !this.ctx) return;
        let now = Date.now();
        // Limit warning sound trigger rate to avoid overlap screeching
        if (now - this.lastWarningTime < 350) return;
        this.lastWarningTime = now;

        try {
            let t = this.ctx.currentTime;
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(70, t);

            let filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(180, t);

            let volume = 0.15 * (1.0 - distance / 150.0);
            volume = Math.max(0.02, Math.min(0.15, volume));

            gain.gain.setValueAtTime(volume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.2);
        } catch (e) {}
    }

    playGameOver() {
        if (!this.enabled || !this.ctx) return;
        this.stopBgMusic();
        try {
            let t = this.ctx.currentTime;
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(280, t);
            osc.frequency.linearRampToValueAtTime(40, t + 1.2);

            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 1.3);
        } catch (e) {}
    }
}

// 2. Initialize Game Environment Variables
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const synth = new SoundSynth();

// Screen State constants
const STATE_START = 'start';
const STATE_PLAYING = 'playing';
const STATE_PAUSED = 'paused';
const STATE_GAMEOVER = 'gameover';
let gameState = STATE_START;

// Game Config
const BOARD_WIDTH = 600;
const BOARD_HEIGHT = 600;

// Physics properties
const NODE_DISTANCE = 8; // distance D between segments
let baseSpeed = 2.4;
let boostSpeed = 4.2;
const collisionRadius = 10; // R_col
const minSegmentsToCheck = 18; // skip neck

// Game Entities
let snake = []; // Array of {x, y}
let angle = -Math.PI / 2; // moving upwards initially
let targetAngle = -Math.PI / 2;
let controlMode = 'pointer'; // 'pointer' or 'keyboard'

let starNucleus = { x: 0, y: 0 };
let nebulaDusts = [];
let supernova = null; // { x, y, duration } or null
let blackHoles = []; // Array of { x, y, radius, eventHorizon }

// Game State Values
let score = 0;
let highScore = parseInt(localStorage.getItem('constellation_highscore') || '0');
let comboMultiplier = 1.0;
let supernovaTimer = 0; // overload mode active if > 0
let particles = [];
let collapses = []; // Array of active collapse visual shapes

// Keyboard steering variables
let keys = {};

// Mobile steering support
let pointerX = 0;
let pointerY = 0;
let isPointerDown = false;
let joystickActive = false;
let joystickStart = { x: 0, y: 0 };
let joystickCurrent = { x: 0, y: 0 };
let isBoosting = false;

// DOM Elements
const currentScoreEl = document.getElementById('current-score');
const highScoreEl = document.getElementById('high-score');
const snakeLengthTextEl = document.getElementById('snake-length-text');
const snakeLengthBarEl = document.getElementById('snake-length-bar');
const comboMultiplierEl = document.getElementById('combo-multiplier');
const soundToggleEl = document.getElementById('sound-toggle');
const controlSelectEl = document.getElementById('control-select');

const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const pauseScreen = document.getElementById('pause-screen');
const deathReasonEl = document.getElementById('death-reason');
const finalScoreEl = document.getElementById('final-score');
const finalHighEl = document.getElementById('final-high');

const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const resumeBtn = document.getElementById('resume-btn');
const mobileBoostBtn = document.getElementById('mobile-boost-btn');
const joystickPad = document.getElementById('joystick-pad');
const joystickKnob = document.getElementById('joystick-knob');

// 3. Mathematical Helpers
function getDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Shoelace Formula for polygon area
function calculatePolygonArea(polygon) {
    let area = 0;
    let n = polygon.length;
    for (let i = 0; i < n; i++) {
        let j = (i + 1) % n;
        area += polygon[i].x * polygon[j].y;
        area -= polygon[j].x * polygon[i].y;
    }
    return Math.abs(area) / 2;
}

// Ray-Casting point-in-polygon logic
function isPointInPolygon(px, py, polygon) {
    let inside = false;
    let n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        let xi = polygon[i].x, yi = polygon[i].y;
        let xj = polygon[j].x, yj = polygon[j].y;
        let intersect = ((yi > py) !== (yj > py))
            && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Create stars background particles in canvas
let backgroundStars = [];
for (let i = 0; i < 40; i++) {
    backgroundStars.push({
        x: Math.random() * BOARD_WIDTH,
        y: Math.random() * BOARD_HEIGHT,
        size: Math.random() * 1.5 + 0.5,
        twinkleSpeed: 0.02 + Math.random() * 0.03,
        alpha: Math.random()
    });
}

// 4. Game Entity Spawners
function spawnStarNucleus() {
    let found = false;
    while (!found) {
        let x = 40 + Math.random() * (BOARD_WIDTH - 80);
        let y = 40 + Math.random() * (BOARD_HEIGHT - 80);
        
        // Ensure not inside black hole event horizons
        let valid = true;
        for (let bh of blackHoles) {
            if (getDistance(x, y, bh.x, bh.y) < bh.radius + 20) {
                valid = false;
                break;
            }
        }
        if (valid) {
            starNucleus.x = x;
            starNucleus.y = y;
            found = true;
        }
    }
}

function spawnNebulaDust() {
    let x = 30 + Math.random() * (BOARD_WIDTH - 60);
    let y = 30 + Math.random() * (BOARD_HEIGHT - 60);
    
    // Slight drift speed
    let angle = Math.random() * Math.PI * 2;
    let speed = 0.2 + Math.random() * 0.4;
    
    return {
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1,
        color: `hsl(${45 + Math.random() * 15}, 100%, 65%)` // gold/warm
    };
}

function spawnSupernova() {
    let x = 50 + Math.random() * (BOARD_WIDTH - 100);
    let y = 50 + Math.random() * (BOARD_HEIGHT - 100);
    supernova = { x: x, y: y, life: 600 }; // stays for 10 seconds
}

function generateBlackHoles() {
    blackHoles = [];
    // Spawn 2 black holes in balanced sectors
    blackHoles.push({
        x: 180 + Math.random() * 80,
        y: 180 + Math.random() * 80,
        radius: 65, // gravitational warning field
        eventHorizon: 15 // death core
    });
    
    blackHoles.push({
        x: 360 + Math.random() * 80,
        y: 360 + Math.random() * 80,
        radius: 65,
        eventHorizon: 15
    });
}

// 5. Game Loop Controls & State Handlers
function initGame() {
    // Reinitialize states
    score = 0;
    comboMultiplier = 1.0;
    supernovaTimer = 0;
    angle = -Math.PI / 2;
    targetAngle = -Math.PI / 2;
    supernova = null;
    particles = [];
    collapses = [];
    isBoosting = false;
    
    updateHUD();
    
    // Spawn snake (start length 30 at center moving up)
    snake = [];
    let startX = BOARD_WIDTH / 2;
    let startY = BOARD_HEIGHT / 2 + 100;
    for (let i = 0; i < 30; i++) {
        snake.push({ x: startX, y: startY + i * NODE_DISTANCE });
    }
    
    generateBlackHoles();
    spawnStarNucleus();
    
    // Populate nebula dust
    nebulaDusts = [];
    for (let i = 0; i < 10; i++) {
        nebulaDusts.push(spawnNebulaDust());
    }
    
    // Start Audio
    synth.init();
    synth.startBgMusic();
}

function updateHUD() {
    currentScoreEl.textContent = score;
    highScoreEl.textContent = highScore;
    
    let len = snake.length;
    snakeLengthTextEl.textContent = len + " 节";
    
    // Update length progress bar (cap visual scale at 100 segments)
    let percent = Math.min(100, (len / 100) * 100);
    snakeLengthBarEl.style.width = percent + "%";
    
    comboMultiplierEl.textContent = "x" + comboMultiplier.toFixed(1);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('constellation_highscore', highScore);
    }
}

function triggerDeath(reason) {
    gameState = STATE_GAMEOVER;
    synth.playGameOver();
    
    deathReasonEl.textContent = reason;
    finalScoreEl.textContent = score;
    finalHighEl.textContent = highScore;
    
    gameoverScreen.classList.remove('hidden');
    
    // Trigger visual scatter explosion of all snake pieces
    createScatterExplosion();
}

function createScatterExplosion() {
    snake.forEach((node, idx) => {
        let count = 3;
        for (let i = 0; i < count; i++) {
            let speed = 1.5 + Math.random() * 3;
            let ang = Math.random() * Math.PI * 2;
            particles.push({
                x: node.x,
                y: node.y,
                vx: Math.cos(ang) * speed,
                vy: Math.sin(ang) * speed,
                size: Math.random() * 3 + 1,
                color: idx % 2 === 0 ? '#00f0ff' : '#ff007f',
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.02
            });
        }
    });
}

function createWeaveParticles(collisionX, collisionY, polygon) {
    // Burst at collision point
    for (let i = 0; i < 20; i++) {
        let speed = 2 + Math.random() * 4;
        let ang = Math.random() * Math.PI * 2;
        particles.push({
            x: collisionX,
            y: collisionY,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            size: Math.random() * 4 + 2,
            color: '#ffd700', // gold sparks
            alpha: 1.0,
            decay: 0.03
        });
    }

    // Sparkles inside the polygon
    polygon.forEach((pt) => {
        if (Math.random() < 0.3) {
            let speed = 0.5 + Math.random() * 1;
            let ang = Math.random() * Math.PI * 2;
            particles.push({
                x: pt.x,
                y: pt.y,
                vx: Math.cos(ang) * speed,
                vy: Math.sin(ang) * speed,
                size: Math.random() * 3 + 1,
                color: '#ffffff',
                alpha: 0.8,
                decay: 0.04
            });
        }
    });
}

// 6. Game Core Update Tick
function update(timeRatio = 1.0) {
    if (gameState !== STATE_PLAYING) return;
    
    let head = snake[0];
    
    // A. Steering Calculation
    if (controlMode === 'keyboard') {
        let turnSpeed = 0.062 * timeRatio;
        if (keys['ArrowLeft'] || keys['KeyA'] || keys['a'] || keys['A']) {
            targetAngle -= turnSpeed;
        }
        if (keys['ArrowRight'] || keys['KeyD'] || keys['d'] || keys['D']) {
            targetAngle += turnSpeed;
        }
        angle = targetAngle;
    } else {
        // Pointer gravity steering: ease angle towards pointer
        if (isPointerDown) {
            let dx = pointerX - head.x;
            let dy = pointerY - head.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 8) { // buffer circle to prevent shivering
                targetAngle = Math.atan2(dy, dx);
            }
        }
        
        let diff = targetAngle - angle;
        // Normalize angle difference to [-PI, PI]
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        angle += diff * 0.12 * timeRatio; // smoothing turning factor
    }

    // B. Black Hole Gravity Pull Formula
    blackHoles.forEach((bh) => {
        let d = getDistance(head.x, head.y, bh.x, bh.y);
        if (d < bh.radius && d > bh.eventHorizon) {
            // Strong pull vector towards black hole center
            let bhAngle = Math.atan2(bh.y - head.y, bh.x - head.x);
            let diffBh = bhAngle - angle;
            diffBh = Math.atan2(Math.sin(diffBh), Math.cos(diffBh));
            
            // Influence scales exponentially near event horizon
            let force = (1.0 - (d / bh.radius)) ** 1.8;
            angle += diffBh * force * 0.18 * timeRatio;
            
            // Audio warning
            synth.playWarning(d);
            
            // Visual distortion warning ring
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff3300';
        }
    });

    // C. Speed State determination
    let currentSpeed = baseSpeed * timeRatio;
    if (keys['Space'] || keys[' '] || isBoosting) {
        // Starburst cost: if snake has extra length, consuming length sustains boost speed
        currentSpeed = boostSpeed * timeRatio;
        if (Math.random() < 0.04 * timeRatio && snake.length > 8) {
            snake.pop(); // consume segment
            updateHUD();
        }
    }
    if (supernovaTimer > 0) {
        currentSpeed = (boostSpeed * 1.15) * timeRatio;
        supernovaTimer -= timeRatio;
    }

    // D. Move head
    let nextX = head.x + currentSpeed * Math.cos(angle);
    let nextY = head.y + currentSpeed * Math.sin(angle);

    // E. Outer boundaries collision check
    if (nextX < 0 || nextX > BOARD_WIDTH || nextY < 0 || nextY > BOARD_HEIGHT) {
        triggerDeath("能量逸散：星轨越出了星图暗物质壁垒。");
        return;
    }

    // F. Black hole collision check
    for (let bh of blackHoles) {
        let d = getDistance(nextX, nextY, bh.x, bh.y);
        if (d <= bh.eventHorizon) {
            triggerDeath("引力塌缩：星轨被黑洞的引力奇点彻底吞噬。");
            return;
        }
    }

    // G. Follow Segment propagation (Inverse Kinematics)
    let prevPosition = { x: head.x, y: head.y };
    head.x = nextX;
    head.y = nextY;

    for (let i = 1; i < snake.length; i++) {
        let seg = snake[i];
        let dx = snake[i - 1].x - seg.x;
        let dy = snake[i - 1].y - seg.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        
        if (d > NODE_DISTANCE) {
            let ratio = NODE_DISTANCE / d;
            seg.x = snake[i - 1].x - dx * ratio;
            seg.y = snake[i - 1].y - dy * ratio;
        }
    }

    // H. Self-collision (Constellation Weaving) Check
    let weaveCollisionIdx = -1;
    for (let i = minSegmentsToCheck; i < snake.length; i++) {
        let d = getDistance(head.x, head.y, snake[i].x, snake[i].y);
        if (d < collisionRadius) {
            weaveCollisionIdx = i;
            break;
        }
    }

    if (weaveCollisionIdx !== -1) {
        // Extract closed loop polygon
        let polygon = snake.slice(0, weaveCollisionIdx + 1);
        
        // 1. Calculate Area using Shoelace
        let area = calculatePolygonArea(polygon);
        
        // 2. Count captured Nebula Dust using Ray-Casting
        let capturedCount = 0;
        nebulaDusts.forEach((dust) => {
            if (isPointInPolygon(dust.x, dust.y, polygon)) {
                capturedCount++;
                // Respawn particle outside
                let newDust = spawnNebulaDust();
                dust.x = newDust.x;
                dust.y = newDust.y;
                dust.vx = newDust.vx;
                dust.vy = newDust.vy;
            }
        });

        // 3. Compute Score and Combo
        let basePoints = Math.round(area * 0.08);
        if (capturedCount > 0) {
            comboMultiplier += capturedCount * 0.4;
        } else {
            // Decay combo slowly if no dust is trapped
            comboMultiplier = Math.max(1.0, comboMultiplier - 0.2 * timeRatio);
        }

        let gain = Math.round(basePoints * comboMultiplier);
        score += gain;

        // 4. Update Snake (Excise loop slice, keep Head + remaining tail)
        snake = [snake[0]].concat(snake.slice(weaveCollisionIdx + 1));
        
        // Enforce minimum surviving length
        if (snake.length < 5) {
            // Re-extend tail backwards to prevent instant gameover
            let backAngle = angle + Math.PI;
            while (snake.length < 5) {
                let last = snake[snake.length - 1];
                snake.push({
                    x: last.x + NODE_DISTANCE * Math.cos(backAngle),
                    y: last.y + NODE_DISTANCE * Math.sin(backAngle)
                });
            }
        }

        // 5. Play Sound and Animations
        synth.playCollapse(capturedCount);
        collapses.push({
            polygon: polygon,
            life: 35,
            maxLife: 35
        });
        createWeaveParticles(head.x, head.y, polygon);
        
        updateHUD();
    }

    // I. Food / Items eating check
    // Star Nucleus
    if (getDistance(head.x, head.y, starNucleus.x, starNucleus.y) < 18) {
        score += 100;
        synth.playStarEat();
        
        // Grow snake by 3 nodes
        let tail = snake[snake.length - 1];
        let backAngle = angle + Math.PI;
        for (let j = 0; j < 3; j++) {
            snake.push({
                x: tail.x + NODE_DISTANCE * Math.cos(backAngle) * (j + 1),
                y: tail.y + NODE_DISTANCE * Math.sin(backAngle) * (j + 1)
            });
        }

        spawnStarNucleus();
        
        // Spawns Supernova powerup if score reached thresholds
        if (Math.random() < 0.28 && !supernova) {
            spawnSupernova();
        }
        
        updateHUD();
    }

    // Nebula Dust movement and overload magnets
    nebulaDusts.forEach((dust) => {
        // Move dust
        dust.x += dust.vx * timeRatio;
        dust.y += dust.vy * timeRatio;

        // Bounce on boundaries
        if (dust.x < 10 || dust.x > BOARD_WIDTH - 10) dust.vx *= -1;
        if (dust.y < 10 || dust.y > BOARD_HEIGHT - 10) dust.vy *= -1;

        // If Supernova overload active, drag dust towards head
        if (supernovaTimer > 0) {
            let dist = getDistance(head.x, head.y, dust.x, dust.y);
            if (dist < 180) {
                let angleToHead = Math.atan2(head.y - dust.y, head.x - dust.x);
                // Magnetic drift force
                dust.x += Math.cos(angleToHead) * 3.5 * timeRatio;
                dust.y += Math.sin(angleToHead) * 3.5 * timeRatio;
            }
        }
    });

    // Supernova powerup item check
    if (supernova) {
        supernova.life -= timeRatio;
        if (supernova.life <= 0) {
            supernova = null;
        } else {
            let d = getDistance(head.x, head.y, supernova.x, supernova.y);
            if (d < 20) {
                supernovaTimer = 360; // 6 seconds active
                synth.playSupernova();
                supernova = null;
                score += 250;
                updateHUD();
            }
        }
    }

    // J. Update particle drift
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx * timeRatio;
        p.y += p.vy * timeRatio;
        p.alpha -= p.decay * timeRatio;
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }

    // K. Update active polygon collapses
    for (let i = collapses.length - 1; i >= 0; i--) {
        let c = collapses[i];
        c.life -= timeRatio;
        if (c.life <= 0) {
            collapses.splice(i, 1);
        }
    }
}

// 7. Render/Draw Operations
function draw() {
    // Clear Board
    ctx.fillStyle = '#030206';
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    // Draw grid stars
    backgroundStars.forEach((star) => {
        // Slowly twinkle alpha
        star.alpha += star.twinkleSpeed;
        if (star.alpha > 1.0 || star.alpha < 0.2) {
            star.twinkleSpeed *= -1;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(1.0, star.alpha))})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // Draw rotating coordinate lines (faint coordinate vectors)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let i = 40; i < BOARD_WIDTH; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, BOARD_HEIGHT);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(BOARD_WIDTH, i);
        ctx.stroke();
    }

    // Draw active collapsing loops (with gold matrix glow)
    collapses.forEach((c) => {
        let ratio = c.life / c.maxLife;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(c.polygon[0].x, c.polygon[0].y);
        for (let i = 1; i < c.polygon.length; i++) {
            ctx.lineTo(c.polygon[i].x, c.polygon[i].y);
        }
        ctx.closePath();
        
        ctx.shadowBlur = 30 * ratio;
        ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
        
        ctx.fillStyle = `rgba(255, 215, 0, ${ratio * 0.16})`;
        ctx.fill();
        
        ctx.strokeStyle = `rgba(255, 215, 0, ${ratio * 0.8})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    });

    // Draw Black Holes
    blackHoles.forEach((bh) => {
        let t = Date.now() * 0.002;
        ctx.save();
        
        // 1. Draw gravitational threat sphere (dashed red)
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 50, 0, 0.2)';
        ctx.setLineDash([5, 8]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // 2. Swirling event horizon accretion disk
        let grad = ctx.createRadialGradient(bh.x, bh.y, 4, bh.x, bh.y, bh.eventHorizon * 2.2);
        grad.addColorStop(0, '#020104');
        grad.addColorStop(0.3, '#0e061a');
        grad.addColorStop(0.65, '#ff3300');
        grad.addColorStop(1, 'transparent');
        
        ctx.save();
        ctx.translate(bh.x, bh.y);
        ctx.rotate(t);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, bh.eventHorizon * 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Event horizon black core
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, bh.eventHorizon, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Draw Nebula Dust
    nebulaDusts.forEach((dust) => {
        ctx.save();
        ctx.fillStyle = dust.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = dust.color;
        ctx.beginPath();
        ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Draw Supernova Flare
    if (supernova) {
        let pulsate = Math.sin(Date.now() * 0.015) * 4 + 10;
        ctx.save();
        let grad = ctx.createRadialGradient(supernova.x, supernova.y, 1, supernova.x, supernova.y, pulsate);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#ff00ff');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(supernova.x, supernova.y, pulsate, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Draw Food (Star Nucleus)
    ctx.save();
    let glowRadius = 8 + Math.sin(Date.now() * 0.01) * 3;
    let gradNucleus = ctx.createRadialGradient(starNucleus.x, starNucleus.y, 2, starNucleus.x, starNucleus.y, glowRadius);
    gradNucleus.addColorStop(0, '#ffffff');
    gradNucleus.addColorStop(0.5, '#00f0ff');
    gradNucleus.addColorStop(1, 'transparent');
    ctx.fillStyle = gradNucleus;
    ctx.beginPath();
    ctx.arc(starNucleus.x, starNucleus.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Snake (Starlight Beam)
    ctx.save();
    
    // Draw body segments
    for (let i = snake.length - 1; i >= 1; i--) {
        let node = snake[i];
        
        // HSL cycle gradient throughout the snake body
        let hue = (190 + (i / snake.length) * 110) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
        ctx.shadowBlur = supernovaTimer > 0 ? 12 : 5;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        
        // Segment shape
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw connecting neon lines
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.45)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(snake[i - 1].x, snake[i - 1].y);
        ctx.stroke();
    }

    // Draw Head (Bright Supernova Node)
    let head = snake[0];
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = supernovaTimer > 0 ? 25 : 15;
    ctx.shadowColor = supernovaTimer > 0 ? '#ff00ff' : '#00f0ff';
    
    ctx.beginPath();
    ctx.arc(head.x, head.y, 6.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw directional pointer arrow
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    ctx.lineTo(head.x + 12 * Math.cos(angle), head.y + 12 * Math.sin(angle));
    ctx.stroke();

    ctx.restore();

    // Draw Particles
    particles.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// 8. Main Framework Engine Tick
let lastTime = 0;
function tick(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = timestamp - lastTime;
    if (dt > 100) dt = 16.66; // cap delta time on focus loss
    lastTime = timestamp;

    let timeRatio = dt / 16.67; // normalize relative to 60fps (16.67ms)
    
    update(timeRatio);
    draw();
    requestAnimationFrame(tick);
}

// 9. Desktop Events Listeners
window.addEventListener('keydown', (e) => {
    // Space or Arrow keys should not scroll browser page
    if (['Space', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
    
    keys[e.code] = true;
    keys[e.key] = true;
    
    // Quick pause toggle using ESC
    if (e.key === 'Escape') {
        if (gameState === STATE_PLAYING) {
            gameState = STATE_PAUSED;
            pauseScreen.classList.remove('hidden');
        } else if (gameState === STATE_PAUSED) {
            gameState = STATE_PLAYING;
            pauseScreen.classList.add('hidden');
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    keys[e.key] = false;
});

// Canvas pointer movement coordinates helper
function getPointerPos(e) {
    let rect = canvas.getBoundingClientRect();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Translate relative client offsets to internal 600x600 space
    return {
        x: ((clientX - rect.left) / rect.width) * BOARD_WIDTH,
        y: ((clientY - rect.top) / rect.height) * BOARD_HEIGHT
    };
}

canvas.addEventListener('mousedown', (e) => {
    if (gameState !== STATE_PLAYING) return;
    isPointerDown = true;
    let pos = getPointerPos(e);
    pointerX = pos.x;
    pointerY = pos.y;
});

window.addEventListener('mousemove', (e) => {
    if (!isPointerDown || gameState !== STATE_PLAYING) return;
    let pos = getPointerPos(e);
    pointerX = pos.x;
    pointerY = pos.y;
});

window.addEventListener('mouseup', () => {
    isPointerDown = false;
});

// Touch controls for pointer mapping on canvas
canvas.addEventListener('touchstart', (e) => {
    if (gameState !== STATE_PLAYING) return;
    e.preventDefault(); // Prevent page drag scroll
    isPointerDown = true;
    let pos = getPointerPos(e);
    pointerX = pos.x;
    pointerY = pos.y;
});

canvas.addEventListener('touchmove', (e) => {
    if (!isPointerDown || gameState !== STATE_PLAYING) return;
    e.preventDefault(); // Prevent page drag scroll
    let pos = getPointerPos(e);
    pointerX = pos.x;
    pointerY = pos.y;
});

canvas.addEventListener('touchend', () => {
    isPointerDown = false;
});

// 10. Virtual Joystick touch panel for mobile
function handleJoystick(clientX, clientY) {
    let rect = joystickPad.getBoundingClientRect();
    let centerX = rect.left + rect.width / 2;
    let centerY = rect.top + rect.height / 2;
    
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    
    let maxDist = rect.width / 2;
    let knobX = dx;
    let knobY = dy;
    
    if (dist > maxDist) {
        knobX = (dx / dist) * maxDist;
        knobY = (dy / dist) * maxDist;
    }
    
    // Move visual knob
    joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    
    // Set target vector direction
    if (dist > 5) {
        targetAngle = Math.atan2(dy, dx);
    }
}

joystickPad.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joystickActive = true;
    let touch = e.touches[0];
    handleJoystick(touch.clientX, touch.clientY);
});

joystickPad.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!joystickActive) return;
    let touch = e.touches[0];
    handleJoystick(touch.clientX, touch.clientY);
});

joystickPad.addEventListener('touchend', () => {
    joystickActive = false;
    joystickKnob.style.transform = 'translate(0px, 0px)';
});

// Mobile boost virtual button
mobileBoostBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isBoosting = true;
    mobileBoostBtn.classList.add('active');
});

mobileBoostBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    isBoosting = false;
    mobileBoostBtn.classList.remove('active');
});

// 11. Configuration toggles listeners
soundToggleEl.addEventListener('change', (e) => {
    synth.enabled = e.target.checked;
    if (synth.enabled) {
        synth.init();
        if (gameState === STATE_PLAYING) synth.startBgMusic();
    } else {
        synth.stopBgMusic();
    }
});

controlSelectEl.addEventListener('change', (e) => {
    controlMode = e.target.value;
});

// 12. Overlays Action Buttons Listeners
startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    gameState = STATE_PLAYING;
    initGame();
});

restartBtn.addEventListener('click', () => {
    gameoverScreen.classList.add('hidden');
    gameState = STATE_PLAYING;
    initGame();
});

resumeBtn.addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    gameState = STATE_PLAYING;
    if (synth.enabled) synth.startBgMusic();
});

// Initialize Framework loop
tick();
updateHUD();
