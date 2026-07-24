/**
 * 时光乐章 (Chrono Symphony) - 维多利亚星空音乐盒贪吃蛇
 * Date: 2026-07-24
 * Author: Antigravity Assistant
 */

// --- Web Audio API Synth Sound Engine ---
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.notes = [
            261.63, // C4 (Do)
            293.66, // D4 (Re)
            329.63, // E4 (Mi)
            349.23, // F4 (Fa)
            392.00, // G4 (Sol)
            440.00, // A4 (La)
            493.88, // B4 (Ti)
            523.25  // C5 (Do5)
        ];
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playNote(noteIndex, comboMultiplier = 1) {
        if (this.muted) return;
        this.init();

        const freq = this.notes[noteIndex % this.notes.length] * (1 + (comboMultiplier - 1) * 0.05);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Music Box Bell / Celesta tone synthesis
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Add slight overtone
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, this.ctx.currentTime);
        gain2.gain.setValueAtTime(0.15, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

        osc.connect(gain);
        osc2.connect(gain2);
        gain2.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc2.start();
        osc.stop(this.ctx.currentTime + 0.6);
        osc2.stop(this.ctx.currentTime + 0.6);
    }

    playChronoRewindSound() {
        if (this.muted) return;
        this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';

        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.5);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 0.5);
    }

    playClockTickSound() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 0.03);
    }

    playOverdriveFanfare() {
        if (this.muted) return;
        this.init();

        const chords = [261.63, 329.63, 392.00, 523.25];
        chords.forEach((freq, i) => {
            setTimeout(() => {
                if (this.muted) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.8);
            }, i * 100);
        });
    }

    playGameOverSound() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.8);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 0.8);
    }
}

// --- Main Game Engine ---
class ChronoSnakeGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundEngine();

        // Grid Settings
        this.gridCount = 24;
        this.cellSize = this.canvas.width / this.gridCount;

        // Game State Variables
        this.isRunning = false;
        this.isPaused = false;
        this.isRewinding = false;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('chrono_snake_highscore') || '0', 10);
        this.combo = 1;
        this.expectedNoteIndex = 0;
        this.energy = 0; // 0 to 100
        this.invulnerableTimer = 0; // frames
        this.overdriveTimer = 0; // frames

        // Note Labels & Colors
        this.noteSymbols = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'];
        this.noteColors = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#818cf8', '#c084fc'];

        // Snake & Movement
        this.snake = [];
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };
        this.food = null;

        // Chrono Ring Buffer (Snapshot History)
        this.history = [];
        this.maxHistoryLength = 180; // ~3 seconds at 60 FPS

        // Minute Hand Hazard
        this.clockAngle = 0; // radians
        this.clockSpeed = (Math.PI * 2) / 900; // Complete turn every ~15 seconds at 60 FPS

        // Particle System
        this.particles = [];

        // DOM Element Cache
        this.scoreEl = document.getElementById('score-display');
        this.comboEl = document.getElementById('combo-display');
        this.highScoreEl = document.getElementById('highscore-display');
        this.energyFillEl = document.getElementById('energy-fill');
        this.energyPctEl = document.getElementById('energy-percentage');
        this.chronoBtn = document.getElementById('chrono-btn');
        this.mobileChronoBtn = document.getElementById('mobile-chrono-btn');
        this.startOverlay = document.getElementById('start-overlay');
        this.gameoverOverlay = document.getElementById('gameover-overlay');
        this.finalScoreEl = document.getElementById('final-score');
        this.finalComboEl = document.getElementById('final-combo');

        this.initUI();
        this.bindEvents();
        this.updateHighScoreDisplay();
    }

    initUI() {
        this.highScoreEl.textContent = this.highScore;
    }

    bindEvents() {
        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning || this.isRewinding) return;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.dir.y === 0) this.nextDir = { x: 0, y: -1 };
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.dir.y === 0) this.nextDir = { x: 0, y: 1 };
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.dir.x === 0) this.nextDir = { x: 1, y: 0 };
                    break;
                case ' ':
                    this.triggerChronoRewind();
                    break;
            }
        });

        // Start & Restart Buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());

        // Chrono Shift Buttons
        this.chronoBtn.addEventListener('click', () => this.triggerChronoRewind());
        this.mobileChronoBtn.addEventListener('click', () => this.triggerChronoRewind());

        // Sound Toggle Button
        document.getElementById('sound-btn').addEventListener('click', () => {
            this.sound.muted = !this.sound.muted;
            document.getElementById('sound-icon-on').style.display = this.sound.muted ? 'none' : 'block';
            document.getElementById('sound-icon-off').style.display = this.sound.muted ? 'block' : 'none';
        });

        // Mobile D-Pad Controls
        const bindDpad = (id, dx, dy) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const handler = (e) => {
                e.preventDefault();
                if (!this.isRunning || this.isRewinding) return;
                if (dx !== 0 && this.dir.x === 0) this.nextDir = { x: dx, y: 0 };
                if (dy !== 0 && this.dir.y === 0) this.nextDir = { x: 0, y: dy };
            };
            btn.addEventListener('touchstart', handler, { passive: false });
            btn.addEventListener('click', handler);
        };

        bindDpad('btn-up', 0, -1);
        bindDpad('btn-down', 0, 1);
        bindDpad('btn-left', -1, 0);
        bindDpad('btn-right', 1, 0);

        // Touch Swipe Gestures on Canvas
        let touchStartX = 0;
        let touchStartY = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (!this.isRunning || this.isRewinding || e.changedTouches.length === 0) return;
            const diffX = e.changedTouches[0].clientX - touchStartX;
            const diffY = e.changedTouches[0].clientY - touchStartY;
            const threshold = 25;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (Math.abs(diffX) > threshold) {
                    if (diffX > 0 && this.dir.x === 0) this.nextDir = { x: 1, y: 0 };
                    else if (diffX < 0 && this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
                }
            } else {
                if (Math.abs(diffY) > threshold) {
                    if (diffY > 0 && this.dir.y === 0) this.nextDir = { x: 0, y: 1 };
                    else if (diffY < 0 && this.dir.y === 0) this.nextDir = { x: 0, y: -1 };
                }
            }
        }, { passive: true });
    }

    startGame() {
        this.sound.init();
        this.isRunning = true;
        this.isRewinding = false;
        this.score = 0;
        this.combo = 1;
        this.expectedNoteIndex = 0;
        this.energy = 0;
        this.invulnerableTimer = 0;
        this.overdriveTimer = 0;
        this.history = [];
        this.particles = [];
        this.clockAngle = 0;

        // Init Snake in center
        const startX = Math.floor(this.gridCount / 2);
        const startY = Math.floor(this.gridCount / 2);
        this.snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };

        this.spawnFood();
        this.updateScoreDisplay();
        this.updateEnergyDisplay();

        this.startOverlay.style.display = 'none';
        this.gameoverOverlay.style.display = 'none';

        this.lastFrameTime = performance.now();
        this.tickAccumulator = 0;
        this.tickInterval = 120; // ms per step

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    spawnFood() {
        let valid = false;
        let foodX, foodY;
        while (!valid) {
            foodX = Math.floor(Math.random() * (this.gridCount - 4)) + 2;
            foodY = Math.floor(Math.random() * (this.gridCount - 4)) + 2;
            valid = !this.snake.some(segment => segment.x === foodX && segment.y === foodY);
        }

        const noteIdx = this.expectedNoteIndex % this.noteSymbols.length;
        this.food = {
            x: foodX,
            y: foodY,
            symbol: this.noteSymbols[noteIdx],
            color: this.noteColors[noteIdx],
            noteIdx: noteIdx
        };
    }

    triggerChronoRewind() {
        if (this.energy < 100 || !this.isRunning || this.isRewinding || this.history.length === 0) return;

        this.isRewinding = true;
        this.energy = 0;
        this.updateEnergyDisplay();
        this.sound.playChronoRewindSound();

        // Target rewind frames (~90 frames = 1.5 - 3s)
        const rewindSteps = Math.min(90, this.history.length);
        let currentStep = 0;

        const rewindInterval = setInterval(() => {
            if (this.history.length > 0 && currentStep < rewindSteps) {
                const snapshot = this.history.pop();
                this.snake = snapshot.snake;
                this.dir = snapshot.dir;
                this.nextDir = snapshot.dir;

                // Add reverse time particle effect
                if (this.snake.length > 0) {
                    this.addParticles(
                        (this.snake[0].x + 0.5) * this.cellSize,
                        (this.snake[0].y + 0.5) * this.cellSize,
                        '#4cc9f0',
                        4
                    );
                }
                currentStep++;
            } else {
                clearInterval(rewindInterval);
                this.isRewinding = false;
                this.invulnerableTimer = 120; // 2 seconds invulnerability after rewind
            }
        }, 12);
    }

    update(deltaTime) {
        if (!this.isRunning) return;

        // Update Overdrive & Invulnerability Timers
        if (this.overdriveTimer > 0) {
            this.overdriveTimer--;
        }
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer--;
        }

        // Update Minute-Hand Hazard Angle (pauses during overdrive)
        if (this.overdriveTimer === 0) {
            this.clockAngle += this.clockSpeed;
            if (Math.floor(this.clockAngle * 50) % 300 === 0) {
                this.sound.playClockTickSound();
            }
        }

        // Update Particles
        this.updateParticles();

        if (this.isRewinding) return;

        // Fixed Timestep Grid Movement
        this.tickAccumulator += deltaTime;
        if (this.tickAccumulator >= this.tickInterval) {
            this.tickAccumulator = 0;
            this.stepSnake();
        }
    }

    stepSnake() {
        this.dir = { ...this.nextDir };
        const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

        // Save Snapshot to History Buffer
        this.history.push({
            snake: this.snake.map(s => ({ ...s })),
            dir: { ...this.dir }
        });
        if (this.history.length > this.maxHistoryLength) {
            this.history.shift();
        }

        // Wall Collision Check (Wrap Around for smooth space experience)
        if (head.x < 0) head.x = this.gridCount - 1;
        if (head.x >= this.gridCount) head.x = 0;
        if (head.y < 0) head.y = this.gridCount - 1;
        if (head.y >= this.gridCount) head.y = 0;

        // Self-Collision Check
        if (this.invulnerableTimer === 0 && this.overdriveTimer === 0) {
            for (let i = 0; i < this.snake.length; i++) {
                if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                    this.gameOver();
                    return;
                }
            }
        }

        // Move Snake
        this.snake.unshift(head);

        // Check Food Collision
        if (this.food && head.x === this.food.x && head.y === this.food.y) {
            this.eatFood();
        } else {
            this.snake.pop();
        }

        // Check Minute-Hand Hazard Collision
        if (this.invulnerableTimer === 0 && this.overdriveTimer === 0) {
            if (this.checkHandCollision(head)) {
                this.gameOver();
                return;
            }
        }

        // Staff Tail Particles
        const tail = this.snake[this.snake.length - 1];
        this.addParticles(
            (tail.x + 0.5) * this.cellSize,
            (tail.y + 0.5) * this.cellSize,
            '#d4af37',
            1
        );
    }

    eatFood() {
        // Play Sound
        this.sound.playNote(this.food.noteIdx, this.combo);

        // Score Calculation
        const pointBase = 100;
        const multiplier = (this.overdriveTimer > 0) ? 3 : this.combo;
        this.score += pointBase * multiplier;

        // Combo Logic
        if (this.food.noteIdx === (this.expectedNoteIndex % this.noteSymbols.length)) {
            this.combo = Math.min(5, this.combo + 1);
            if (this.combo === 5 && this.overdriveTimer === 0) {
                this.overdriveTimer = 360; // 6 seconds overdrive
                this.sound.playOverdriveFanfare();
            }
        } else {
            this.combo = 1;
        }

        this.expectedNoteIndex++;

        // Charge Chrono Energy (+34% per note -> full in 3 notes)
        this.energy = Math.min(100, this.energy + 34);
        this.updateEnergyDisplay();
        this.updateScoreDisplay();

        // Particles
        const foodPx = (this.food.x + 0.5) * this.cellSize;
        const foodPy = (this.food.y + 0.5) * this.cellSize;
        this.addParticles(foodPx, foodPy, this.food.color, 12);

        // Spawn Next Food
        this.spawnFood();
    }

    checkHandCollision(head) {
        const center = (this.gridCount / 2) * this.cellSize;
        const handLength = (this.gridCount / 2 - 1) * this.cellSize;
        const handX = center + Math.cos(this.clockAngle) * handLength;
        const handY = center + Math.sin(this.clockAngle) * handLength;

        const headPx = (head.x + 0.5) * this.cellSize;
        const headPy = (head.y + 0.5) * this.cellSize;

        // Distance from point to line segment
        const dist = this.distToSegment({ x: headPx, y: headPy }, { x: center, y: center }, { x: handX, y: handY });
        return dist < this.cellSize * 0.45;
    }

    distToSegment(p, v, w) {
        const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    gameOver() {
        this.isRunning = false;
        this.sound.playGameOverSound();

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('chrono_snake_highscore', this.highScore.toString());
            this.updateHighScoreDisplay();
        }

        this.finalScoreEl.textContent = this.score;
        this.finalComboEl.textContent = `${this.combo}x`;
        this.gameoverOverlay.style.display = 'flex';
    }

    updateScoreDisplay() {
        this.scoreEl.textContent = this.score;
        this.comboEl.textContent = `${this.combo}x`;
    }

    updateHighScoreDisplay() {
        this.highScoreEl.textContent = this.highScore;
    }

    updateEnergyDisplay() {
        const rounded = Math.round(this.energy);
        this.energyFillEl.style.width = `${rounded}%`;
        this.energyPctEl.textContent = `${rounded}%`;

        const isFull = this.energy >= 100;
        this.chronoBtn.disabled = !isFull;
        this.mobileChronoBtn.disabled = !isFull;

        if (isFull) {
            this.chronoBtn.classList.add('ready');
            this.mobileChronoBtn.classList.add('ready');
        } else {
            this.chronoBtn.classList.remove('ready');
            this.mobileChronoBtn.classList.remove('ready');
        }
    }

    addParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 1;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: Math.random() * 0.03 + 0.02,
                color,
                size: Math.random() * 3 + 2
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        this.update(deltaTime);
        this.draw();

        if (this.isRunning || this.particles.length > 0) {
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    // --- Rendering ---
    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear Canvas with Dark Starry Theme
        ctx.fillStyle = this.overdriveTimer > 0 ? '#1e1b10' : '#090d1a';
        ctx.fillRect(0, 0, w, h);

        // Draw Clock Central Dial & Minute-Hand Hazard
        this.drawClockDial(ctx, w, h);

        // Draw Food (Musical Note)
        if (this.food) {
            this.drawFood(ctx);
        }

        // Draw Snake
        this.drawSnake(ctx);

        // Draw Particles
        this.drawParticles(ctx);

        // Draw Overdrive / Invulnerability Filter Overlay
        if (this.overdriveTimer > 0) {
            ctx.fillStyle = `rgba(212, 175, 55, ${0.08 + Math.sin(Date.now() * 0.01) * 0.04})`;
            ctx.fillRect(0, 0, w, h);
        } else if (this.invulnerableTimer > 0) {
            ctx.fillStyle = `rgba(76, 201, 240, ${0.1 + Math.sin(Date.now() * 0.02) * 0.05})`;
            ctx.fillRect(0, 0, w, h);
        }
    }

    drawClockDial(ctx, w, h) {
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = w * 0.42;

        ctx.save();

        // Dial Outer Brass Ring
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner Rotating Gear Motif
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-this.clockAngle * 0.5);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const teeth = 12;
        for (let i = 0; i < teeth; i++) {
            const a = (i / teeth) * Math.PI * 2;
            const rOuter = radius * 0.7;
            const rInner = radius * 0.6;
            ctx.lineTo(Math.cos(a) * rOuter, Math.sin(a) * rOuter);
            ctx.lineTo(Math.cos(a + 0.1) * rInner, Math.sin(a + 0.1) * rInner);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Sweeping Golden Minute-Hand
        const handX = centerX + Math.cos(this.clockAngle) * radius;
        const handY = centerY + Math.sin(this.clockAngle) * radius;

        ctx.strokeStyle = this.overdriveTimer > 0 ? '#f9e076' : 'rgba(212, 175, 55, 0.85)';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#d4af37';
        ctx.shadowBlur = 15;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(handX, handY);
        ctx.stroke();

        // Center Clock Ornament Node
        ctx.fillStyle = '#f9e076';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawFood(ctx) {
        const px = (this.food.x + 0.5) * this.cellSize;
        const py = (this.food.y + 0.5) * this.cellSize;
        const r = this.cellSize * 0.4;

        ctx.save();

        // Pulse Animation
        const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.1;

        ctx.shadowColor = this.food.color;
        ctx.shadowBlur = 20;

        // Glowing Crystal Note Background
        ctx.fillStyle = this.food.color;
        ctx.beginPath();
        ctx.arc(px, py, r * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Note Symbol Text
        ctx.fillStyle = '#070b19';
        ctx.font = `bold ${Math.floor(this.cellSize * 0.45)}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.food.symbol, px, py);

        ctx.restore();
    }

    drawSnake(ctx) {
        if (this.snake.length === 0) return;

        ctx.save();

        // Five-Line Staff Trail Behind Head
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
        ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            for (let j = 0; j < this.snake.length; j++) {
                const seg = this.snake[j];
                const px = (seg.x + 0.5) * this.cellSize + i * 2;
                const py = (seg.y + 0.5) * this.cellSize + i * 2;
                if (j === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // Draw Body Segments (Clockwork Gear Beads)
        for (let i = this.snake.length - 1; i >= 0; i--) {
            const seg = this.snake[i];
            const px = (seg.x + 0.5) * this.cellSize;
            const py = (seg.y + 0.5) * this.cellSize;
            const r = (this.cellSize / 2) * (i === 0 ? 0.95 : 0.85);

            if (i === 0) {
                // Head (Pocket Watch Emblem with Gem Eye)
                ctx.fillStyle = this.invulnerableTimer > 0 ? '#4cc9f0' : '#f9e076';
                ctx.shadowColor = '#d4af37';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#070b19';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Head Inner Gem
                ctx.fillStyle = '#070b19';
                ctx.beginPath();
                ctx.arc(px, py, r * 0.4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Body Segment (Alternating Brass & Rose Gold Gear Bead)
                const isEven = i % 2 === 0;
                ctx.fillStyle = isEven ? '#d4af37' : '#e8a598';
                ctx.shadowColor = isEven ? '#d4af37' : '#e8a598';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();

                // Inner Gem Dot
                ctx.fillStyle = '#070b19';
                ctx.beginPath();
                ctx.arc(px, py, r * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    drawParticles(ctx) {
        ctx.save();
        for (const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// Instantiate Game on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new ChronoSnakeGame();
});
