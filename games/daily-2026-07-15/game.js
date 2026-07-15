// game.js - Zen Ink Brush Snake (墨染禅蛇)

// --- Game Configurations & Constants ---
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const BASE_SPEED = 3.2;         // Normal speed (pixels per frame)
const TURN_SPEED = 0.08;        // Smoothing rate for turn rotation
const BASE_DECAY_RATE = 0.0055; // Base trail opacity decay per frame (approx. 3s lifetime)
const ENERGY_DRAIN_RATE = 0.08; // Base energy drain per frame (%)

// --- Audio Synthesis Setup (Web Audio API) ---
let audioCtx = null;
let bgNoise = null;
let bgNoiseFilter = null;
let soundEnabled = true;

const PENTATONIC_SCALE = [
    130.81, // C3
    146.83, // D3
    164.81, // E3
    196.00, // G3
    220.00, // A3
    261.63, // C4 (宫)
    293.66, // D4 (商)
    329.63, // E4 (角)
    392.00, // G4 (徵)
    440.00, // A4 (羽)
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.00  // A5
];

function initAudio() {
    if (audioCtx) return;
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        startAmbientSound();
    } catch (e) {
        console.error("Web Audio API is not supported in this browser", e);
    }
}

// Low-frequency stream noise background generator
function startAmbientSound() {
    if (!audioCtx || bgNoise) return;

    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Fill buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    bgNoise = audioCtx.createBufferSource();
    bgNoise.buffer = noiseBuffer;
    bgNoise.loop = true;

    // Filter to simulate soft stream/wind
    bgNoiseFilter = audioCtx.createBiquadFilter();
    bgNoiseFilter.type = 'bandpass';
    bgNoiseFilter.Q.value = 1.0;
    bgNoiseFilter.frequency.value = 400;

    const bgGain = audioCtx.createGain();
    bgGain.gain.value = 0.04; // Very quiet background

    bgNoise.connect(bgNoiseFilter);
    bgNoiseFilter.connect(bgGain);
    bgGain.connect(audioCtx.destination);

    // Modulate filter frequency slowly (LFO)
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.15; // 0.15Hz sweep
    
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 150; // Sweeps filter between 250Hz and 550Hz

    lfo.connect(lfoGain);
    lfoGain.connect(bgNoiseFilter.frequency);

    lfo.start();
    bgNoise.start();
}

function playGuzheng(freq) {
    if (!audioCtx || !soundEnabled) return;
    
    const time = audioCtx.currentTime;
    
    // Synthesize string pluck with vibrato & exponential decay
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 1.2);
    
    gainNode.gain.setValueAtTime(0.001, time);
    gainNode.gain.linearRampToValueAtTime(0.25, time + 0.01); // Instant pluck pluck
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
    
    // 6Hz Vibrato LFO
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 6; 
    lfoGain.gain.value = freq * 0.015; // 1.5% vibrato depth
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    lfo.start(time);
    osc.start(time);
    lfo.stop(time + 1.2);
    osc.stop(time + 1.2);
}

function playGuqinArpeggio() {
    if (!audioCtx || !soundEnabled) return;
    
    // Low, resonance-rich pentatonic arpeggio (FM synthesis)
    const baseFreqs = [196.00, 220.00, 293.66, 329.63]; // G3, A3, D4, E4
    const timeStart = audioCtx.currentTime;
    
    baseFreqs.forEach((freq, idx) => {
        const time = timeStart + idx * 0.12;
        
        const carrier = audioCtx.createOscillator();
        const modulator = audioCtx.createOscillator();
        const modGain = audioCtx.createGain();
        const gainNode = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        
        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(freq, time);
        
        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(freq * 2.0, time);
        modGain.gain.setValueAtTime(freq * 0.4, time); // Modulation index
        modGain.gain.exponentialRampToValueAtTime(1, time + 1.6);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, time);
        filter.frequency.exponentialRampToValueAtTime(80, time + 1.6);
        
        gainNode.gain.setValueAtTime(0.001, time);
        gainNode.gain.linearRampToValueAtTime(0.18, time + 0.08); // Gentler attack for Guqin
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1.8);
        
        // Connect FM
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        
        carrier.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        modulator.start(time);
        carrier.start(time);
        modulator.stop(time + 1.8);
        carrier.stop(time + 1.8);
    });
}

function playTempleGong() {
    if (!audioCtx || !soundEnabled) return;
    
    const time = audioCtx.currentTime;
    const baseFreq = 85; // Low pitch bronze gong
    const ratios = [1.0, 1.41, 1.98, 2.53, 3.15, 4.02]; // Non-harmonic metal overtones
    const volumes = [0.5, 0.3, 0.2, 0.12, 0.06, 0.03];
    const decays = [4.2, 2.8, 2.0, 1.4, 0.9, 0.5];
    
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.6, time);
    masterGain.gain.exponentialRampToValueAtTime(0.001, time + 4.5);
    
    ratios.forEach((ratio, idx) => {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq * ratio, time);
        
        oscGain.gain.setValueAtTime(volumes[idx], time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + decays[idx]);
        
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        
        osc.start(time);
        osc.stop(time + decays[idx]);
    });
    
    // Add sub-bass boost
    const subOsc = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(baseFreq * 0.5, time); // 42.5Hz
    subGain.gain.setValueAtTime(0.2, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + 3.0);
    
    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(time);
    subOsc.stop(time + 3.0);
    
    masterGain.connect(audioCtx.destination);
}

function playDissolveNoise() {
    if (!audioCtx || !soundEnabled) return;
    
    const time = audioCtx.currentTime;
    const sampleRate = audioCtx.sampleRate;
    const duration = 1.6;
    const bufferSize = sampleRate * duration;
    
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.5;
    
    // Upward sweep of frequency to mimic bleeding out / vanishing
    filter.frequency.setValueAtTime(500, time);
    filter.frequency.exponentialRampToValueAtTime(3200, time + duration);
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.3, time);
    gainNode.gain.linearRampToValueAtTime(0.001, time + duration);
    
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noiseSource.start(time);
    noiseSource.stop(time + duration);
}

// --- Game Logic Classes and Variables ---

// Canvas and Rendering Contexts
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game States
let isPlaying = false;
let isGameOver = false;
let score = 0;
let highScore = parseInt(localStorage.getItem('zen_snake_highscore') || '0');
let inkDropsEaten = 0;
let zenWordsEaten = 0;

// Ink System
let inkEnergy = 100.0;
let currentDecayScale = 1.0; // Modifies decay based on score (making trails stay longer)

// Difficulty Damping Modifiers
let speedMultiplier = 1.0;

// Snake properties
let head = { x: 300, y: 300 };
let currentAngle = -Math.PI / 2; // Moving up initially
let targetAngle = -Math.PI / 2;
let lastAngle = -Math.PI / 2;
let headRadius = 12;
let targetHeadRadius = 12;

// Trail system
let inkTrails = []; // Array of { x, y, opacity, radius, age }

// Static Obstacles (Lotus Leaves)
let obstacles = [
    { x: 150, y: 150, r: 40 },
    { x: 450, y: 180, r: 35 },
    { x: 220, y: 440, r: 45 },
    { x: 420, y: 420, r: 30 }
];

// Water Ripples Background Decor
let waterRipples = []; // Array of { x, y, r, opacity }

// Fall Leaf Background Decor
let fallingLeaves = []; // Array of { x, y, size, angle, speedX, speedY, rotSpeed }

// Food item
let food = null;       // { x, y, r, type: 'drop' | 'cinnabar' | 'zen', char: '静'|'流'|'空'|'润' }

// Zen Powerups Timers
let zenPowerTimers = {
    jing: 0, // Stillness (bullet time)
    liu: 0,  // Flow (dash, zero ink cost)
    kong: 0, // Void (rapid fade out trail - instant active effect, no duration)
    run: 0   // Moisture (golden ink drops, double score/energy)
};

// Input trackers
let keysPressed = {};
let pointerTarget = null; // { x, y }

// Joystick trackers
let joystickActive = false;
let joystickStartPos = null;
let joystickCurrentPos = null;

// --- Initialize UI values ---
document.getElementById('high-score').innerText = highScore;

// --- Event Listeners & Inputs ---

// Manual switched difficulty
document.getElementById('friction-select').addEventListener('change', (e) => {
    switch (e.target.value) {
        case 'slow': speedMultiplier = 0.75; break;
        case 'normal': speedMultiplier = 1.0; break;
        case 'fast': speedMultiplier = 1.35; break;
    }
});

// Sound Toggle
document.getElementById('music-toggle').addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    if (soundEnabled) {
        initAudio();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }
});

// Buttons
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-restart').addEventListener('click', startGame);

// Keyboard controls
window.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;
    updateAngleFromKeyboard();
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
    updateAngleFromKeyboard();
});

function updateAngleFromKeyboard() {
    let dx = 0;
    let dy = 0;
    
    if (keysPressed['w'] || keysPressed['arrowup']) dy -= 1;
    if (keysPressed['s'] || keysPressed['arrowdown']) dy += 1;
    if (keysPressed['a'] || keysPressed['arrowleft']) dx -= 1;
    if (keysPressed['d'] || keysPressed['arrowright']) dx += 1;
    
    if (dx !== 0 || dy !== 0) {
        targetAngle = Math.atan2(dy, dx);
        pointerTarget = null; // Clear pointer tracking if keyboard is used
    }
}

// Mouse and Pointer Tracking on Canvas
canvas.addEventListener('mousemove', (e) => {
    if (!isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    pointerTarget = { x, y };
});

canvas.addEventListener('mouseleave', () => {
    pointerTarget = null;
});

// Touch and Pointer controls directly on Canvas
canvas.addEventListener('touchstart', (e) => {
    initAudio();
    if (!isPlaying) return;
    e.preventDefault();
    updatePointerFromTouch(e);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!isPlaying) return;
    e.preventDefault();
    updatePointerFromTouch(e);
}, { passive: false });

canvas.addEventListener('touchend', () => {
    pointerTarget = null;
});

function updatePointerFromTouch(e) {
    if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches[0].clientX - rect.left) * (CANVAS_WIDTH / rect.width);
        const y = (e.touches[0].clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
        pointerTarget = { x, y };
    }
}

// Mobile Virtual Joystick Handlers
const joystickBoundary = document.getElementById('joystick-boundary');
const joystickHandle = document.getElementById('joystick-handle');

joystickBoundary.addEventListener('touchstart', (e) => {
    initAudio();
    if (!isPlaying) return;
    e.preventDefault();
    joystickActive = true;
    const rect = joystickBoundary.getBoundingClientRect();
    joystickStartPos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
    updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;
    updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

window.addEventListener('touchend', () => {
    if (!joystickActive) return;
    joystickActive = false;
    joystickHandle.style.transform = 'translate(0px, 0px)';
    pointerTarget = null;
});

function updateJoystick(clientX, clientY) {
    if (!joystickStartPos) return;
    
    let dx = clientX - joystickStartPos.x;
    let dy = clientY - joystickStartPos.y;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 50; // max travel distance of handle in px
    
    if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
    }
    
    joystickHandle.style.transform = `translate(${dx}px, ${dy}px)`;
    
    // Set target angle based on displacement
    if (dist > 5) {
        targetAngle = Math.atan2(dy, dx);
        pointerTarget = null; // joystick overrides coordinate pointer
    }
}


// --- Game State Modifiers ---

function startGame() {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Reset stats
    score = 0;
    inkDropsEaten = 0;
    zenWordsEaten = 0;
    inkEnergy = 100.0;
    currentDecayScale = 1.0;
    
    head = { x: 300, y: 350 };
    currentAngle = -Math.PI / 2;
    targetAngle = -Math.PI / 2;
    lastAngle = -Math.PI / 2;
    headRadius = 12;
    targetHeadRadius = 12;
    
    inkTrails = [];
    waterRipples = [];
    fallingLeaves = [];
    
    // Populate some initial leaves
    for (let i = 0; i < 8; i++) {
        fallingLeaves.push(createLeaf(true));
    }
    
    // Reset powerups
    zenPowerTimers.jing = 0;
    zenPowerTimers.liu = 0;
    zenPowerTimers.run = 0;
    zenPowerTimers.kong = 0;
    updateZenPowerupUI();
    
    spawnFood();
    
    isPlaying = true;
    isGameOver = false;
    
    document.getElementById('current-score').innerText = '0';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    
    // Trigger Start Bell
    playTempleGong();
}

function gameOver(reason) {
    isPlaying = false;
    isGameOver = true;
    
    // Play Game Over Bell & Dissolve Noise
    playTempleGong();
    playDissolveNoise();
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('zen_snake_highscore', highScore);
        document.getElementById('high-score').innerText = highScore;
    }
    
    document.getElementById('final-score').innerText = score;
    document.getElementById('final-drops').innerText = inkDropsEaten;
    document.getElementById('final-words').innerText = zenWordsEaten;
    
    let reasonText = "宣纸之上，笔意已尽。";
    if (reason === 'wall') {
        reasonText = "墨越纸缘，画意难续（撞到了宣纸边缘）。";
    } else if (reason === 'self') {
        reasonText = "重墨相叠，笔迹受阻（撞上了未干的湿墨）。";
    } else if (reason === 'obstacle') {
        reasonText = "行笔顽石，锋芒折损（撞上了湖中荷叶或顽石）。";
    } else if (reason === 'energy') {
        reasonText = "砚台墨尽，笔触涣散（墨水能量耗尽）。";
    }
    
    document.getElementById('death-reason').innerText = reasonText;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

// --- Dynamic Generators ---

function spawnFood() {
    let attempts = 0;
    let fx, fy, fr, type, char;
    
    while (attempts < 100) {
        fx = 50 + Math.random() * (CANVAS_WIDTH - 100);
        fy = 50 + Math.random() * (CANVAS_HEIGHT - 100);
        
        // Keep away from obstacles
        let collidesObstacle = false;
        for (const obs of obstacles) {
            if (Math.hypot(fx - obs.x, fy - obs.y) < (obs.r + 20)) {
                collidesObstacle = true;
                break;
            }
        }
        
        if (!collidesObstacle) break;
        attempts++;
    }
    
    // Randomize food type
    const roll = Math.random();
    
    // If "润" (Moisture) powerup is active, food becomes Golden Ink Drop (run)
    if (zenPowerTimers.run > 0) {
        type = 'run';
        fr = 8;
        char = null;
    } else if (roll < 0.15 && score > 30) {
        // 15% chance to spawn Zen Word if score is > 30
        type = 'zen';
        fr = 15;
        const words = ['静', '流', '空', '润'];
        char = words[Math.floor(Math.random() * words.length)];
    } else if (roll < 0.28) {
        // Cinnabar Red Drop
        type = 'cinnabar';
        fr = 7;
        char = null;
    } else {
        // Standard Ink Drop
        type = 'drop';
        fr = 6;
        char = null;
    }
    
    food = { x: fx, y: fy, r: fr, type, char };
}

function createRipple(x, y) {
    waterRipples.push({
        x, y,
        r: 5,
        opacity: 0.6
    });
}

function createLeaf(randomPos = false) {
    return {
        x: randomPos ? Math.random() * CANVAS_WIDTH : -20,
        y: randomPos ? Math.random() * CANVAS_HEIGHT : Math.random() * (CANVAS_HEIGHT - 100),
        size: 8 + Math.random() * 12,
        angle: Math.random() * Math.PI * 2,
        speedX: 0.3 + Math.random() * 0.6,
        speedY: 0.1 + Math.random() * 0.3,
        rotSpeed: 0.005 + Math.random() * 0.01
    };
}

// --- Main Engine Update Loop ---

function update(deltaTime) {
    if (!isPlaying) return;
    
    // 1. Process Zen powerup timers
    for (const key in zenPowerTimers) {
        if (zenPowerTimers[key] > 0) {
            zenPowerTimers[key] -= 16.67; // Assuming 60fps (~16.67ms per frame)
            if (zenPowerTimers[key] <= 0) {
                zenPowerTimers[key] = 0;
            }
        }
    }
    updateZenPowerupUI();
    
    // Determine dynamic speed and turn rate
    let speed = BASE_SPEED * speedMultiplier;
    let turnFactor = TURN_SPEED;
    
    if (zenPowerTimers.jing > 0) {
        // "静": Slow motion for the player but easier controls
        speed = BASE_SPEED * 0.5 * speedMultiplier;
        turnFactor = TURN_SPEED * 1.5;
    } else if (zenPowerTimers.liu > 0) {
        // "流": Sprint mode!
        speed = BASE_SPEED * 1.55 * speedMultiplier;
        turnFactor = TURN_SPEED * 0.8; // harder to turn at high speed
    }
    
    // 2. Adjust angle towards target angle
    if (pointerTarget) {
        const dx = pointerTarget.x - head.x;
        const dy = pointerTarget.y - head.y;
        if (Math.hypot(dx, dy) > 15) {
            targetAngle = Math.atan2(dy, dx);
        }
    }
    
    // Smooth angle interpolation (prevent snapping)
    let angleDiff = targetAngle - currentAngle;
    // Normalize angle difference to [-PI, PI]
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    
    const prevAngle = currentAngle;
    currentAngle += angleDiff * turnFactor;
    
    // Keep angle normalized
    while (currentAngle < -Math.PI) currentAngle += Math.PI * 2;
    while (currentAngle > Math.PI) currentAngle -= Math.PI * 2;
    
    // 3. Update Calligraphy Brush Tip Size (提按)
    const turnRate = Math.abs(currentAngle - prevAngle);
    if (zenPowerTimers.liu > 0) {
        // Flow: thin brush stroke
        targetHeadRadius = 7.5;
    } else if (zenPowerTimers.jing > 0) {
        // Stillness: thick ink bleed
        targetHeadRadius = 16.5;
    } else if (turnRate > 0.035) {
        // Fast turning: lift the brush (thin)
        targetHeadRadius = 7.0;
    } else {
        // Steady straight: press the brush (thick)
        targetHeadRadius = 12.0;
    }
    
    // Smoothly transition head radius
    headRadius += (targetHeadRadius - headRadius) * 0.15;
    
    // 4. Move Snake Head
    head.x += Math.cos(currentAngle) * speed;
    head.y += Math.sin(currentAngle) * speed;
    
    // 5. Border Wall Collision
    if (head.x < headRadius || head.x > CANVAS_WIDTH - headRadius ||
        head.y < headRadius || head.y > CANVAS_HEIGHT - headRadius) {
        gameOver('wall');
        return;
    }
    
    // 6. Obstacles Collision (Lotus leaves)
    for (const obs of obstacles) {
        const dist = Math.hypot(head.x - obs.x, head.y - obs.y);
        // Collision threshold (slightly inside visual boundary for better feel)
        if (dist < (obs.r + headRadius * 0.7)) {
            gameOver('obstacle');
            return;
        }
    }
    
    // 7. Self-collision with Wet Ink Trail (opacity > 30%)
    // Skip checking recently spawned trail segments (e.g. last 45 frames) to avoid self-biting immediately
    const safetyBuffer = 45;
    for (let i = 0; i < inkTrails.length - safetyBuffer; i++) {
        const trail = inkTrails[i];
        if (trail.opacity > 0.3) {
            const dist = Math.hypot(head.x - trail.x, head.y - trail.y);
            const collisionDistance = (headRadius + trail.radius) * 0.58; // tight collision boxes for flow
            if (dist < collisionDistance) {
                gameOver('self');
                return;
            }
        }
    }
    
    // 8. Deposit Ink Trail
    inkTrails.push({
        x: head.x,
        y: head.y,
        opacity: 1.0,
        radius: headRadius,
        age: 0
    });
    
    // 9. Update & Decay Ink Trails
    // Decay rate scales down as score increases (slower fading, longer body, harder gameplay)
    // Scale factor: starts at 1.0, drops towards 0.35 at score = 150
    currentDecayScale = Math.max(0.35, 1.0 - (score * 0.0045));
    const decayRate = BASE_DECAY_RATE * currentDecayScale;
    
    for (let i = inkTrails.length - 1; i >= 0; i--) {
        const trail = inkTrails[i];
        trail.age += 1;
        trail.opacity -= decayRate;
        if (trail.opacity <= 0) {
            inkTrails.splice(i, 1);
        }
    }
    
    // 10. Energy Drain (unless "流" is active)
    if (zenPowerTimers.liu <= 0) {
        // Normal drain, slightly slower during stillness "静"
        const drain = (zenPowerTimers.jing > 0) ? ENERGY_DRAIN_RATE * 0.1 : ENERGY_DRAIN_RATE;
        inkEnergy -= drain;
        if (inkEnergy <= 0) {
            inkEnergy = 0;
            gameOver('energy');
            return;
        }
    }
    document.getElementById('ink-fill').style.width = `${inkEnergy}%`;
    document.getElementById('ink-text').innerText = `${Math.ceil(inkEnergy)}%`;
    
    // Low energy warning visual feedback (red flashing bar)
    const inkMeterElement = document.querySelector('.ink-meter');
    if (inkEnergy < 25.0) {
        inkMeterElement.style.boxShadow = `0 0 10px rgba(184, 59, 48, ${0.3 + Math.sin(Date.now() / 150) * 0.3})`;
    } else {
        inkMeterElement.style.boxShadow = '';
    }
    
    // 11. Food Collision
    const distToFood = Math.hypot(head.x - food.x, head.y - food.y);
    if (distToFood < (headRadius + food.r)) {
        eatFood();
    }
    
    // 12. Update background decors
    // Update Water ripples
    for (let i = waterRipples.length - 1; i >= 0; i--) {
        const rip = waterRipples[i];
        rip.r += 0.8;
        rip.opacity -= 0.012;
        if (rip.opacity <= 0) {
            waterRipples.splice(i, 1);
        }
    }
    
    // Random chance of creating ambient ripples on canvas
    if (Math.random() < 0.007) {
        createRipple(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT);
    }
    
    // Update falling bamboo leaves
    for (let i = fallingLeaves.length - 1; i >= 0; i--) {
        const leaf = fallingLeaves[i];
        leaf.x += leaf.speedX;
        leaf.y += leaf.speedY;
        leaf.angle += leaf.rotSpeed;
        
        if (leaf.x > CANVAS_WIDTH + 20 || leaf.y > CANVAS_HEIGHT + 20) {
            fallingLeaves[i] = createLeaf(false);
        }
    }
}

function eatFood() {
    // Generate water ripple at food spot
    createRipple(food.x, food.y);
    
    if (food.type === 'zen') {
        zenWordsEaten += 1;
        
        // Trigger Guqin FM Arpeggio
        playGuqinArpeggio();
        
        // Activate powerups
        const powerup = food.char;
        if (powerup === '静') {
            zenPowerTimers.jing = 8000; // 8 seconds
        } else if (powerup === '流') {
            zenPowerTimers.liu = 6000;  // 6 seconds
        } else if (powerup === '空') {
            // "空" has immediate effect: wipe out 50% opacity of trails
            inkTrails.forEach(t => {
                t.opacity = t.opacity * 0.25;
            });
            // Show flash effect on canvas
            canvasFlashEffect(59, 122, 117);
        } else if (powerup === '润') {
            zenPowerTimers.run = 10000; // 10 seconds
        }
        
        score += 25;
        inkEnergy = Math.min(100.0, inkEnergy + 30.0);
    } else {
        // Regular ink drops (宫/商/角/徵/羽 Guzheng pluck synthesis)
        inkDropsEaten += 1;
        
        // Choose pentatonic frequency randomly
        const randIndex = 5 + Math.floor(Math.random() * 7); // select from middle/upper octave
        const freq = PENTATONIC_SCALE[randIndex];
        playGuzheng(freq);
        
        let scoreReward = 10;
        let energyRestore = 18.0;
        
        if (food.type === 'cinnabar') {
            scoreReward = 25;
            energyRestore = 35.0;
        } else if (food.type === 'run') {
            // Golden ink drops under run
            scoreReward = 20;
            energyRestore = 30.0;
        }
        
        score += scoreReward;
        inkEnergy = Math.min(100.0, inkEnergy + energyRestore);
    }
    
    document.getElementById('current-score').innerText = score;
    spawnFood();
}

function canvasFlashEffect(r, g, b) {
    const origBg = canvas.style.backgroundColor;
    canvas.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
    setTimeout(() => {
        canvas.style.backgroundColor = '';
    }, 180);
}

function updateZenPowerupUI() {
    const jingItem = document.getElementById('zen-jing');
    const liuItem = document.getElementById('zen-liu');
    const runItem = document.getElementById('zen-run');
    
    if (zenPowerTimers.jing > 0) jingItem.classList.add('active');
    else jingItem.classList.remove('active');
    
    if (zenPowerTimers.liu > 0) liuItem.classList.add('active');
    else liuItem.classList.remove('active');
    
    if (zenPowerTimers.run > 0) runItem.classList.add('active');
    else runItem.classList.remove('active');
}

// --- Render Engine Draw Loop ---

function draw() {
    // 1. Clear Canvas (with slight alpha for faint background blending)
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Render soft gridlines (traditional calligraphic coordinate lines)
    drawCoordinateLines();
    
    // 2. Draw Ambient Water Ripples
    waterRipples.forEach(rip => {
        ctx.strokeStyle = `rgba(140, 130, 110, ${rip.opacity})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
        ctx.stroke();
    });
    
    // 3. Draw Falling Leaves (Background layer)
    fallingLeaves.forEach(leaf => {
        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.angle);
        ctx.fillStyle = 'rgba(59, 122, 117, 0.08)'; // Very faint jade green leaf
        ctx.beginPath();
        // Leaf shape using bezier curves
        ctx.moveTo(0, -leaf.size / 2);
        ctx.quadraticCurveTo(leaf.size * 0.4, 0, 0, leaf.size / 2);
        ctx.quadraticCurveTo(-leaf.size * 0.4, 0, 0, -leaf.size / 2);
        ctx.fill();
        ctx.restore();
    });
    
    // 4. Draw Lotus Leaf Obstacles
    obstacles.forEach(obs => {
        drawLotusLeaf(obs.x, obs.y, obs.r);
    });
    
    // 5. Draw Fading Ink Trails
    // FIRST PASS: Draw soft background water stains for all trails (dry & wet)
    ctx.fillStyle = 'rgba(140, 130, 110, 0.05)';
    inkTrails.forEach(trail => {
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, trail.radius * 1.3, 0, Math.PI * 2);
        ctx.fill();
    });

    // SECOND PASS: Draw the ink bleed body stroke
    inkTrails.forEach(trail => {
        // Wet ink vs Dry ink rendering
        if (trail.opacity > 0.3) {
            // Collidable, wet ink
            ctx.fillStyle = `rgba(26, 26, 26, ${trail.opacity})`;
        } else {
            // Safe, dry ink water stain
            ctx.fillStyle = `rgba(120, 120, 120, ${trail.opacity * 0.8})`;
        }
        
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // THIRD PASS: Draw a core line in wet trails to clearly visualize collision dangers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let pathStarted = false;
    for (let i = 0; i < inkTrails.length; i++) {
        const trail = inkTrails[i];
        if (trail.opacity > 0.3) {
            if (!pathStarted) {
                ctx.moveTo(trail.x, trail.y);
                pathStarted = true;
            } else {
                ctx.lineTo(trail.x, trail.y);
            }
        }
    }
    if (pathStarted) {
        ctx.stroke();
    }
    
    // 6. Draw Food Items
    if (food) {
        drawFoodItem(food);
    }
    
    // 7. Draw Snake Head (Calligraphy Brush Tip)
    drawSnakeHead();
}

function drawCoordinateLines() {
    ctx.strokeStyle = 'rgba(184, 59, 48, 0.035)'; // Very faint cinnabar red grid lines
    ctx.lineWidth = 1.0;
    
    // Divide into 9 cells (Nine-Square Grid / 九宫格)
    const cw = CANVAS_WIDTH / 3;
    const ch = CANVAS_HEIGHT / 3;
    
    ctx.beginPath();
    for (let i = 1; i < 3; i++) {
        ctx.moveTo(i * cw, 10);
        ctx.lineTo(i * cw, CANVAS_HEIGHT - 10);
        ctx.moveTo(10, i * ch);
        ctx.lineTo(CANVAS_WIDTH - 10, i * ch);
    }
    ctx.stroke();
    
    // Draw boundary border indicator in faint red ink
    ctx.strokeStyle = 'rgba(184, 59, 48, 0.15)';
    ctx.strokeRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);
}

function drawLotusLeaf(x, y, r) {
    ctx.save();
    
    // Draw soft drop shadow for lotus leaf
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.beginPath();
    ctx.arc(x + 3, y + 4, r, 0, Math.PI * 2);
    ctx.fill();
    
    // Base green wash
    ctx.fillStyle = 'rgba(59, 122, 117, 0.18)'; // Soft jade green
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    
    // Outline sketch
    ctx.strokeStyle = 'rgba(59, 122, 117, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    
    // Leaf vein structures (water color style)
    ctx.strokeStyle = 'rgba(59, 122, 117, 0.22)';
    ctx.lineWidth = 1.0;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        // Draw veins outwards from center
        ctx.beginPath();
        ctx.moveTo(x, y);
        const targetX = x + Math.cos(angle) * r * 0.95;
        const targetY = y + Math.sin(angle) * r * 0.95;
        // Curving veins
        ctx.quadraticCurveTo(
            x + Math.cos(angle + 0.2) * r * 0.5,
            y + Math.sin(angle + 0.2) * r * 0.5,
            targetX, targetY
        );
        ctx.stroke();
    }
    
    // Floating center leaf notch
    ctx.fillStyle = '#faf7f2'; // match background paper color
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r * 0.18, -Math.PI/6, Math.PI/6);
    ctx.fill();
    
    ctx.restore();
}

function drawFoodItem(fd) {
    ctx.save();
    
    if (fd.type === 'zen') {
        // Special Zen Character crystal
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 10;
        
        // Draw soft glowing orb
        let orbColor = 'rgba(59, 122, 117, 0.1)'; // default
        let fontColor = 'var(--ink-black)';
        if (fd.char === '静') { orbColor = 'rgba(59, 136, 184, 0.12)'; fontColor = '#2b78a8'; }
        else if (fd.char === '流') { orbColor = 'rgba(184, 59, 48, 0.12)'; fontColor = 'var(--cinnabar-red)'; }
        else if (fd.char === '空') { orbColor = 'rgba(59, 122, 117, 0.12)'; fontColor = 'var(--jade-green)'; }
        else if (fd.char === '润') { orbColor = 'rgba(184, 156, 48, 0.12)'; fontColor = 'var(--gold-ink)'; }
        
        ctx.fillStyle = orbColor;
        ctx.beginPath();
        ctx.arc(fd.x, fd.y, fd.r * 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Outline ring
        ctx.strokeStyle = fontColor;
        ctx.lineWidth = 1.0;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(fd.x, fd.y, fd.r, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw character
        ctx.shadowBlur = 0;
        ctx.fillStyle = fontColor;
        ctx.font = "bold 16px 'ZCOOL XiaoWei', serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fd.char, fd.x, fd.y + 1);
    } else {
        // Droplet shape
        ctx.beginPath();
        
        if (fd.type === 'cinnabar') {
            ctx.fillStyle = 'var(--cinnabar-red)';
            ctx.shadowColor = 'rgba(184, 59, 48, 0.3)';
            ctx.shadowBlur = 6;
        } else if (fd.type === 'run') {
            ctx.fillStyle = 'var(--gold-ink)';
            ctx.shadowColor = 'rgba(184, 156, 48, 0.3)';
            ctx.shadowBlur = 6;
        } else {
            ctx.fillStyle = 'var(--ink-black)';
        }
        
        // Draw calligraphic water droplet
        const w = fd.r * 2.0;
        const h = fd.r * 2.6;
        
        ctx.save();
        ctx.translate(fd.x, fd.y + fd.r * 0.3);
        ctx.beginPath();
        ctx.moveTo(0, -h/2); // Tip
        ctx.bezierCurveTo(w/2, -h/6, w/2, h/2, 0, h/2); // Right side
        ctx.bezierCurveTo(-w/2, h/2, -w/2, -h/6, 0, -h/2); // Left side
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    ctx.restore();
}

function drawSnakeHead() {
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(currentAngle);
    
    // 1. Draw head wash shape
    ctx.fillStyle = 'var(--ink-black)';
    ctx.beginPath();
    // Tear shape head pointing forward
    ctx.arc(0, 0, headRadius, -Math.PI / 1.5, Math.PI / 1.5);
    ctx.lineTo(headRadius * 1.5, 0); // brush point nose
    ctx.closePath();
    ctx.fill();
    
    // 2. Draw fish fins (flowing wash lines)
    ctx.strokeStyle = 'var(--ink-black)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-headRadius * 0.5, -headRadius);
    ctx.quadraticCurveTo(-headRadius * 1.5, -headRadius * 1.8, -headRadius * 1.8, -headRadius * 0.8);
    ctx.moveTo(-headRadius * 0.5, headRadius);
    ctx.quadraticCurveTo(-headRadius * 1.5, headRadius * 1.8, -headRadius * 1.8, headRadius * 0.8);
    ctx.stroke();
    
    // 3. Draw Eyes (small red dots for ink fish style)
    ctx.fillStyle = 'var(--cinnabar-red)';
    ctx.beginPath();
    ctx.arc(headRadius * 0.5, -headRadius * 0.5, 2.5, 0, Math.PI * 2);
    ctx.arc(headRadius * 0.5, headRadius * 0.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}


// --- Main Animation Frame Loop ---

let lastTime = 0;

function loop(time) {
    // Standard delta time calculation
    if (!lastTime) lastTime = time;
    const dt = time - lastTime;
    lastTime = time;
    
    // Only update and draw if playing
    if (isPlaying) {
        update(dt);
        draw();
    }
    
    requestAnimationFrame(loop);
}

// Start frame request
requestAnimationFrame(loop);
