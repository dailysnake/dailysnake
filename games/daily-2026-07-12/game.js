/**
 * Chrono-Portal Snake (时空传送与回溯贪吃蛇)
 * Core Game Engine
 */

// --- Audio Synthesizer Class (Web Audio API) ---
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playEatNormal() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    playEatCrystal() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Bell/Glass-like harmonic pluck
        const frequencies = [600, 900, 1200];
        frequencies.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + index * 0.03;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, start + 0.15);

            gain.gain.setValueAtTime(0.08, start);
            gain.gain.exponentialRampToValueAtTime(0.002, start + 0.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(start);
            osc.stop(start + 0.2);
        });
    }

    playEatSingularity() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        // Cyber whoosh
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.4);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.45);
    }

    playPortalCross() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const oscLow = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Dual sweep portal sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

        oscLow.type = 'triangle';
        oscLow.frequency.setValueAtTime(150, now);
        oscLow.frequency.linearRampToValueAtTime(50, now + 0.25);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        oscLow.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
        oscLow.start(now);
        oscLow.stop(now + 0.25);
    }

    playRewindTick(isLast = false) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(isLast ? 600 : 250, now);
        osc.frequency.linearRampToValueAtTime(isLast ? 900 : 100, now + 0.05);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    playGameOver() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const noise = this.ctx.createOscillator(); // we'll simulate white noise with complex freq
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.8);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.9);
    }
}

// --- Particle Engine ---
class Particle {
    constructor(x, y, color, size, speedX, speedY, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.speedX = speedX;
        this.speedY = speedY;
        this.maxLife = life;
        this.life = life;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedX *= 0.95;
        this.speedY *= 0.95;
        this.life--;
    }

    draw(ctx) {
        const opacity = this.life / this.maxLife;
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = opacity;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    spawn(x, y, color, count = 10, speed = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = (Math.random() * 0.7 + 0.3) * speed;
            const size = Math.random() * 3 + 2;
            const life = Math.floor(Math.random() * 20 + 20);
            this.particles.push(new Particle(
                x, y, 
                color, 
                size, 
                Math.cos(angle) * velocity, 
                Math.sin(angle) * velocity, 
                life
            ));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }

    clear() {
        this.particles = [];
    }
}

// --- Main Game Class ---
class ChronoPortalSnake {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Audio & Particles
        this.synth = new SoundSynth();
        this.particles = new ParticleSystem();

        // Grid configuration (24x24 grid on a 600x600 canvas)
        this.gridSize = 24;
        this.cellSize = this.canvas.width / this.gridSize;

        // Portals (Fixed Positions)
        this.portalOrange = { x: 4, y: 12 };
        this.portalBlue = { x: 19, y: 12 };

        // Game State Variables
        this.snake = [];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('chrono_high_score')) || 0;
        
        // Chrono Energy (Core Rewind Mechanic)
        this.chronoEnergy = 0; // percentage: 0 to 100
        this.maxEnergy = 100;
        this.rewindThreshold = 30;

        // Stats tracking for current run
        this.statCrystals = 0;
        this.statRewinds = 0;

        // Foods
        this.food = null;

        // Flow settings & control
        this.isRunning = false;
        this.isGameOver = false;
        this.isRewinding = false;
        this.bulletTimeRemaining = 0; // in milliseconds
        this.difficulty = 'normal'; // easy, normal, hard
        
        // History Stack for Time Travel (saves states frame-by-frame)
        this.history = [];
        this.maxHistorySteps = 250; // max length to roll back (about 5-8 seconds of game time)

        // Portal animation rotators
        this.portalAngle = 0;

        // Timers
        this.lastUpdateTime = 0;
        this.lastFrameTime = 0;

        // Initialization
        this.initUI();
        this.bindEvents();
        this.drawEmptyGrid();
    }

    initUI() {
        // High score display
        document.getElementById('high-score').textContent = this.formatNumber(this.highScore);
        
        // Sync Audio Checkbox
        const soundToggle = document.getElementById('sound-toggle');
        this.synth.enabled = soundToggle.checked;
        soundToggle.addEventListener('change', (e) => {
            this.synth.enabled = e.target.checked;
        });

        // Difficulty Selector
        const diffSelect = document.getElementById('difficulty-select');
        this.difficulty = diffSelect.value;
        diffSelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            // Focus canvas to prevent spacebar from triggering select actions
            this.canvas.focus();
        });
    }

    bindEvents() {
        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning || this.isRewinding) return;

            // Prevent scroll on space & arrow keys
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
                e.preventDefault();
            }

            switch(e.key) {
                // Direction keys
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.direction !== 'down') this.nextDirection = 'up';
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.direction !== 'up') this.nextDirection = 'down';
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.direction !== 'right') this.nextDirection = 'left';
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.direction !== 'left') this.nextDirection = 'right';
                    break;

                // Chronoshift / Rewind Key
                case ' ':
                case 'Spacebar':
                    this.triggerManualRewind();
                    break;
            }
        });

        // Screen Buttons
        document.getElementById('btn-start').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            this.startGame();
        });

        // Mobile Controls D-Pad
        document.getElementById('dpad-up').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.direction !== 'down') this.nextDirection = 'up'; });
        document.getElementById('dpad-down').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.direction !== 'up') this.nextDirection = 'down'; });
        document.getElementById('dpad-left').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.direction !== 'right') this.nextDirection = 'left'; });
        document.getElementById('dpad-right').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.direction !== 'left') this.nextDirection = 'right'; });
        
        // Also support click for testing on responsive desktop simulator
        document.getElementById('dpad-up').addEventListener('click', () => { if (this.direction !== 'down') this.nextDirection = 'up'; });
        document.getElementById('dpad-down').addEventListener('click', () => { if (this.direction !== 'up') this.nextDirection = 'down'; });
        document.getElementById('dpad-left').addEventListener('click', () => { if (this.direction !== 'right') this.nextDirection = 'left'; });
        document.getElementById('dpad-right').addEventListener('click', () => { if (this.direction !== 'left') this.nextDirection = 'right'; });

        // Mobile Rewind Button
        const mobileRewind = document.getElementById('btn-mobile-rewind');
        mobileRewind.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.triggerManualRewind();
        });
        mobileRewind.addEventListener('click', () => {
            this.triggerManualRewind();
        });

        // Touch Swipe detection on Canvas
        let touchStartX = 0;
        let touchStartY = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (!this.isRunning || this.isRewinding) return;
            const diffX = e.changedTouches[0].clientX - touchStartX;
            const diffY = e.changedTouches[0].clientY - touchStartY;
            const threshold = 30; // pixels

            if (Math.abs(diffX) > Math.abs(diffY)) {
                // Horizontal swipe
                if (Math.abs(diffX) > threshold) {
                    if (diffX > 0 && this.direction !== 'left') this.nextDirection = 'right';
                    else if (diffX < 0 && this.direction !== 'right') this.nextDirection = 'left';
                }
            } else {
                // Vertical swipe
                if (Math.abs(diffY) > threshold) {
                    if (diffY > 0 && this.direction !== 'up') this.nextDirection = 'down';
                    else if (diffY < 0 && this.direction !== 'down') this.nextDirection = 'up';
                }
            }
        }, { passive: true });
    }

    startGame() {
        this.synth.init();
        
        // Hide overlays
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        
        // Reset state variables
        this.snake = [
            { x: 12, y: 12 },
            { x: 11, y: 12 },
            { x: 10, y: 12 }
        ];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.chronoEnergy = 30; // Start with enough for 1 rewind to help beginner
        this.statCrystals = 0;
        this.statRewinds = 0;
        this.bulletTimeRemaining = 0;
        this.history = [];
        this.particles.clear();
        
        this.spawnFood();

        this.isGameOver = false;
        this.isRunning = true;
        this.isRewinding = false;

        // UI resets
        this.updateUI();
        
        // Play click / start sound
        this.synth.playEatNormal();

        // Start animation loop
        this.lastUpdateTime = performance.now();
        this.lastFrameTime = performance.now();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        // Portal angle rotation animator
        this.portalAngle += (this.isBulletTime() ? 0.02 : 0.05);

        // Core physics / grid step timer
        const currentStepInterval = this.getStepInterval();
        const timeSinceLastUpdate = timestamp - this.lastUpdateTime;

        if (this.isRewinding) {
            // Rewind simulation runs at a accelerated, constant tick rate
            if (timeSinceLastUpdate > 45) { // 45ms per step backwards
                this.performRewindStep();
                this.lastUpdateTime = timestamp;
            }
        } else {
            // Normal update interval
            if (timeSinceLastUpdate > currentStepInterval) {
                this.performGameStep();
                this.lastUpdateTime = timestamp;
            }
        }

        // Bullet time countdown timer
        if (this.bulletTimeRemaining > 0 && !this.isRewinding) {
            this.bulletTimeRemaining -= deltaTime;
            if (this.bulletTimeRemaining <= 0) {
                this.bulletTimeRemaining = 0;
                this.synth.playEatNormal(); // signal end
            }
        }

        // Update particle system & render
        this.particles.update();
        this.render();

        // Keep looping
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    getStepInterval() {
        let baseInterval = 120; // classic
        if (this.difficulty === 'easy') baseInterval = 170;
        if (this.difficulty === 'hard') baseInterval = 85;

        // Double speed if time is dilating (bullet time scales speed down)
        if (this.isBulletTime()) {
            return baseInterval * 2.5; // Make game 2.5 times slower
        }

        return baseInterval;
    }

    isBulletTime() {
        return this.bulletTimeRemaining > 0;
    }

    performGameStep() {
        // Apply directional change
        this.direction = this.nextDirection;

        // Record history before making the move
        this.recordHistory();

        // Calculate next head position
        const head = this.snake[0];
        let nextHead = { x: head.x, y: head.y };

        switch(this.direction) {
            case 'up': nextHead.y--; break;
            case 'down': nextHead.y++; break;
            case 'left': nextHead.x--; break;
            case 'right': nextHead.x++; break;
        }

        // --- Portal Crossing Mechanics ---
        let crossedPortal = false;
        if (nextHead.x === this.portalOrange.x && nextHead.y === this.portalOrange.y) {
            nextHead = { x: this.portalBlue.x, y: this.portalBlue.y };
            crossedPortal = true;
        } else if (nextHead.x === this.portalBlue.x && nextHead.y === this.portalBlue.y) {
            nextHead = { x: this.portalOrange.x, y: this.portalOrange.y };
            crossedPortal = true;
        }

        if (crossedPortal) {
            // Trigger audio and particles
            this.synth.playPortalCross();
            const px = (nextHead.x + 0.5) * this.cellSize;
            const py = (nextHead.y + 0.5) * this.cellSize;
            this.particles.spawn(px, py, 'cyan', 15, 6);
            
            // Push head slightly forward to avoid looping on the portal
            switch(this.direction) {
                case 'up': nextHead.y--; break;
                case 'down': nextHead.y++; break;
                case 'left': nextHead.x--; break;
                case 'right': nextHead.x++; break;
            }
        }

        // --- Collision Check (Walls & Body) ---
        let hasCollided = false;

        // Wall check (if didn't cross portal)
        if (nextHead.x < 0 || nextHead.x >= this.gridSize || nextHead.y < 0 || nextHead.y >= this.gridSize) {
            hasCollided = true;
        }

        // Body self-collision check
        if (!hasCollided) {
            for (let i = 0; i < this.snake.length; i++) {
                if (this.snake[i].x === nextHead.x && this.snake[i].y === nextHead.y) {
                    hasCollided = true;
                    break;
                }
            }
        }

        if (hasCollided) {
            // Instead of immediate Game Over, check if we can trigger Auto Chronoshift
            if (this.chronoEnergy >= this.rewindThreshold) {
                this.triggerAutoRewind();
            } else {
                this.triggerGameOver();
            }
            return;
        }

        // Place new head
        this.snake.unshift(nextHead);

        // --- Food Consumption ---
        const ateFood = (nextHead.x === this.food.x && nextHead.y === this.food.y);
        if (ateFood) {
            this.consumeFood();
            this.spawnFood();
        } else {
            // Normal move: remove tail
            this.snake.pop();
        }
    }

    consumeFood() {
        const foodType = this.food.type;
        const fx = (this.food.x + 0.5) * this.cellSize;
        const fy = (this.food.y + 0.5) * this.cellSize;

        if (foodType === 'normal') {
            this.score += 10;
            this.synth.playEatNormal();
            this.particles.spawn(fx, fy, '#39ff14', 8, 3);
            this.gainEnergy(3); // Small boost
        } else if (foodType === 'crystal') {
            this.score += 20;
            this.statCrystals++;
            this.synth.playEatCrystal();
            this.particles.spawn(fx, fy, '#00d2ff', 15, 5);
            this.gainEnergy(15); // Big Chrono boost
        } else if (foodType === 'singularity') {
            this.score += 50;
            this.synth.playEatSingularity();
            this.particles.spawn(fx, fy, '#8b5cf6', 20, 6);
            this.bulletTimeRemaining = 5000; // 5 seconds of Bullet Time
            this.gainEnergy(10);
        }

        // High score sync
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('chrono_high_score', this.highScore);
        }

        this.updateUI();
    }

    spawnFood() {
        let valid = false;
        let x = 0;
        let y = 0;

        while (!valid) {
            x = Math.floor(Math.random() * this.gridSize);
            y = Math.floor(Math.random() * this.gridSize);

            // Avoid portals
            if ((x === this.portalOrange.x && y === this.portalOrange.y) ||
                (x === this.portalBlue.x && y === this.portalBlue.y)) {
                continue;
            }

            // Avoid snake body
            let hitBody = false;
            for (let cell of this.snake) {
                if (cell.x === x && cell.y === y) {
                    hitBody = true;
                    break;
                }
            }
            if (hitBody) continue;

            valid = true;
        }

        // Randomize food type
        const rand = Math.random();
        let type = 'normal';
        if (rand > 0.85) {
            type = 'singularity'; // 15% chance
        } else if (rand > 0.6) {
            type = 'crystal'; // 25% chance
        }

        this.food = { x, y, type };
    }

    gainEnergy(amount) {
        this.chronoEnergy = Math.min(this.maxEnergy, this.chronoEnergy + amount);
        this.updateUI();
    }

    triggerAutoRewind() {
        this.chronoEnergy -= this.rewindThreshold;
        this.startRewinding();
    }

    triggerManualRewind() {
        if (!this.isRunning || this.isRewinding) return;

        if (this.chronoEnergy >= this.rewindThreshold) {
            this.chronoEnergy -= this.rewindThreshold;
            this.startRewinding();
        } else {
            // Visual feedback of insufficient energy
            const bar = document.querySelector('.energy-bar-container');
            bar.classList.add('shake-error');
            setTimeout(() => bar.classList.remove('shake-error'), 500);
        }
    }

    startRewinding() {
        if (this.history.length === 0) return;
        this.isRewinding = true;
        this.statRewinds++;
        this.bulletTimeRemaining = 0; // Cancel bullet time
        
        // Show rewind UI effect
        document.getElementById('rewind-overlay').classList.add('active');
        const badge = document.getElementById('time-state-badge');
        badge.textContent = '时空回溯中';
        badge.className = 'status-indicator state-rewind';

        // Calculate steps to revert: rollback about 3 seconds of game play
        // Steps = 3000ms / step interval
        const stepsToRevert = Math.min(this.history.length, Math.floor(3000 / this.getStepInterval()));
        this.rewindStepCount = stepsToRevert;
        this.updateUI();
    }

    performRewindStep() {
        if (this.history.length > 0 && this.rewindStepCount > 0) {
            const prevState = this.history.pop();
            
            // Restore game variables
            this.snake = prevState.snake;
            this.direction = prevState.direction;
            this.nextDirection = prevState.direction;
            this.score = prevState.score;
            this.food = prevState.food;
            this.bulletTimeRemaining = prevState.bulletTimeRemaining;

            // Spawn local rewinding particles
            const head = this.snake[0];
            const hx = (head.x + 0.5) * this.cellSize;
            const hy = (head.y + 0.5) * this.cellSize;
            this.particles.spawn(hx, hy, '#ff007f', 3, 2);

            this.synth.playRewindTick(this.rewindStepCount === 1);
            this.rewindStepCount--;
            this.updateUI();
        } else {
            this.stopRewinding();
        }
    }

    stopRewinding() {
        this.isRewinding = false;
        
        // Clear history immediately to prevent consecutive free rewinds from stacking bugs
        this.history = [];
        
        // Hide rewind UI effect
        document.getElementById('rewind-overlay').classList.remove('active');
        this.updateUI();
    }

    triggerGameOver() {
        this.isRunning = false;
        this.isGameOver = true;
        this.synth.playGameOver();

        // Head explosion particles
        if (this.snake.length > 0) {
            const head = this.snake[0];
            this.particles.spawn(
                (head.x + 0.5) * this.cellSize, 
                (head.y + 0.5) * this.cellSize, 
                '#ff3131', 
                35, 
                8
            );
        }

        // Show Game Over overlay
        document.getElementById('final-score').textContent = this.formatNumber(this.score);
        document.getElementById('stat-crystals').textContent = this.statCrystals;
        document.getElementById('stat-rewinds').textContent = this.statRewinds;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    recordHistory() {
        const stateCopy = {
            snake: JSON.parse(JSON.stringify(this.snake)),
            direction: this.direction,
            score: this.score,
            food: { ...this.food },
            bulletTimeRemaining: this.bulletTimeRemaining
        };

        this.history.push(stateCopy);

        if (this.history.length > this.maxHistorySteps) {
            this.history.shift();
        }
    }

    updateUI() {
        // Scores
        document.getElementById('current-score').textContent = this.formatNumber(this.score);
        document.getElementById('high-score').textContent = this.formatNumber(this.highScore);

        // Energy percentage
        document.getElementById('energy-percentage').textContent = `${Math.floor(this.chronoEnergy)}%`;
        
        // Energy Bar Fill
        const barFill = document.getElementById('energy-bar-fill');
        barFill.style.width = `${this.chronoEnergy}%`;

        // Update threshold look
        if (this.chronoEnergy >= this.rewindThreshold) {
            barFill.style.background = 'linear-gradient(90deg, #ff007f, #ff6c00)';
            barFill.style.boxShadow = '0 0 12px var(--neon-pink-glow)';
        } else {
            barFill.style.background = 'linear-gradient(90deg, var(--neon-blue), var(--neon-orange))';
            barFill.style.boxShadow = '0 0 8px rgba(0, 210, 255, 0.4)';
        }

        // Badge State Text
        const badge = document.getElementById('time-state-badge');
        if (this.isRewinding) {
            badge.textContent = '时空回溯中';
            badge.className = 'status-indicator state-rewind';
        } else if (this.isBulletTime()) {
            badge.textContent = '子弹时间 (减速)';
            badge.className = 'status-indicator state-slow';
        } else {
            badge.textContent = '时空常态';
            badge.className = 'status-indicator';
        }
    }

    formatNumber(num) {
        return String(num).padStart(4, '0');
    }

    drawEmptyGrid() {
        this.ctx.fillStyle = '#020308';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw portals empty indicator
        this.drawPortals(true);
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = this.isRewinding ? '#05030e' : '#020308';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw Grid lines
        this.ctx.strokeStyle = this.isRewinding ? 'rgba(255, 0, 127, 0.05)' : 'rgba(0, 210, 255, 0.03)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.gridSize; i++) {
            // Vertical line
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, this.canvas.height);
            this.ctx.stroke();

            // Horizontal line
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(this.canvas.width, i * this.cellSize);
            this.ctx.stroke();
        }

        // 2. Draw Portals
        this.drawPortals();

        // 3. Draw Food (if running)
        if (this.isRunning && this.food) {
            this.drawFood();
        }

        // 4. Draw Snake
        if (this.isRunning && this.snake.length > 0) {
            this.drawSnake();
        }

        // 5. Draw Particle systems
        this.particles.draw(this.ctx);

        // 6. Draw Retro CRT overlay scanlines if in Rewind
        if (this.isRewinding) {
            this.drawRewindScanlines();
        }
    }

    drawPortals(preGame = false) {
        const radius = this.cellSize * 0.9;
        const ox = (this.portalOrange.x + 0.5) * this.cellSize;
        const oy = (this.portalOrange.y + 0.5) * this.cellSize;
        const bx = (this.portalBlue.x + 0.5) * this.cellSize;
        const by = (this.portalBlue.y + 0.5) * this.cellSize;

        this.ctx.save();
        
        // Orange Portal
        this.ctx.strokeStyle = preGame ? 'rgba(255,108,0,0.2)' : 'var(--neon-orange)';
        this.ctx.lineWidth = 3;
        if (!preGame) {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = 'var(--neon-orange)';
        }
        
        // Circle border
        this.ctx.beginPath();
        this.ctx.arc(ox, oy, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Inner glowing core
        if (!preGame) {
            this.ctx.fillStyle = 'rgba(255,108,0,0.15)';
            this.ctx.beginPath();
            this.ctx.arc(ox, oy, radius * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Portal rotating rings
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeStyle = 'rgba(255,108,0,0.5)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(ox, oy, radius * 0.75, this.portalAngle, this.portalAngle + Math.PI * 2);
        this.ctx.stroke();

        // Blue Portal
        this.ctx.strokeStyle = preGame ? 'rgba(0,210,255,0.2)' : 'var(--neon-blue)';
        this.ctx.lineWidth = 3;
        if (!preGame) {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = 'var(--neon-blue)';
        }
        
        // Circle border
        this.ctx.beginPath();
        this.ctx.arc(bx, by, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Inner glowing core
        if (!preGame) {
            this.ctx.fillStyle = 'rgba(0,210,255,0.15)';
            this.ctx.beginPath();
            this.ctx.arc(bx, by, radius * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Portal rotating rings
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeStyle = 'rgba(0,210,255,0.5)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(bx, by, radius * 0.75, -this.portalAngle, -this.portalAngle + Math.PI * 2);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawFood() {
        const x = (this.food.x + 0.5) * this.cellSize;
        const y = (this.food.y + 0.5) * this.cellSize;
        const size = this.cellSize * 0.4;

        this.ctx.save();
        this.ctx.shadowBlur = 15;

        if (this.food.type === 'normal') {
            // Normal green core
            this.ctx.fillStyle = 'var(--neon-green)';
            this.ctx.shadowColor = 'var(--neon-green)';
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (this.food.type === 'crystal') {
            // Diamond blue time crystal
            this.ctx.fillStyle = 'var(--neon-blue)';
            this.ctx.shadowColor = 'var(--neon-blue)';
            
            // Draw diamond
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - size * 1.2);
            this.ctx.lineTo(x + size, y);
            this.ctx.lineTo(x, y + size * 1.2);
            this.ctx.lineTo(x - size, y);
            this.ctx.closePath();
            this.ctx.fill();

            // Core glow
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (this.food.type === 'singularity') {
            // Star violet time singularity
            this.ctx.fillStyle = '#8b5cf6';
            this.ctx.shadowColor = '#8b5cf6';

            // Draw a beautiful star shape (4-point star)
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - size * 1.3);
            this.ctx.quadraticCurveTo(x, y, x + size * 1.3, y);
            this.ctx.quadraticCurveTo(x, y, x, y + size * 1.3);
            this.ctx.quadraticCurveTo(x, y, x - size * 1.3, y);
            this.ctx.quadraticCurveTo(x, y, x, y - size * 1.3);
            this.ctx.closePath();
            this.ctx.fill();

            // Swirl ring
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 0.9, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawSnake() {
        this.ctx.save();
        
        const halfCell = this.cellSize / 2;

        // Draw body nodes
        for (let i = 0; i < this.snake.length; i++) {
            const current = this.snake[i];
            const cx = current.x * this.cellSize + halfCell;
            const cy = current.y * this.cellSize + halfCell;
            const r = this.cellSize * 0.42;

            // Check if portal leap between this and previous cell (so we don't draw overlapping connections)
            let isHead = (i === 0);
            
            // Neon gradient body color calculation
            let ratio = i / this.snake.length;
            let color = '';
            let shadowColor = '';

            if (isHead) {
                color = 'rgba(255, 255, 255, 0.95)';
                shadowColor = 'var(--neon-blue)';
            } else {
                // Fade from Neon Blue to Neon Cyan or Purple
                const rVal = Math.floor(0 + ratio * 200);
                const gVal = Math.floor(210 - ratio * 150);
                const bVal = 255;
                color = `rgb(${rVal}, ${gVal}, ${bVal})`;
                shadowColor = `rgba(${rVal}, ${gVal}, ${bVal}, 0.6)`;
            }

            this.ctx.fillStyle = color;
            this.ctx.shadowBlur = isHead ? 15 : 6;
            this.ctx.shadowColor = shadowColor;

            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r * (isHead ? 1.05 : 1 - ratio * 0.35), 0, Math.PI * 2);
            this.ctx.fill();

            // Head details (Eyes)
            if (isHead) {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = 'var(--neon-pink)';
                this.ctx.fillStyle = 'var(--neon-pink)';
                
                const eyeOffset = r * 0.4;
                const eyeRadius = r * 0.18;
                
                let eye1 = {x: 0, y: 0};
                let eye2 = {x: 0, y: 0};

                switch (this.direction) {
                    case 'right':
                        eye1 = { x: cx + eyeOffset, y: cy - eyeOffset };
                        eye2 = { x: cx + eyeOffset, y: cy + eyeOffset };
                        break;
                    case 'left':
                        eye1 = { x: cx - eyeOffset, y: cy - eyeOffset };
                        eye2 = { x: cx - eyeOffset, y: cy + eyeOffset };
                        break;
                    case 'up':
                        eye1 = { x: cx - eyeOffset, y: cy - eyeOffset };
                        eye2 = { x: cx + eyeOffset, y: cy - eyeOffset };
                        break;
                    case 'down':
                        eye1 = { x: cx - eyeOffset, y: cy + eyeOffset };
                        eye2 = { x: cx + eyeOffset, y: cy + eyeOffset };
                        break;
                }

                this.ctx.beginPath();
                this.ctx.arc(eye1.x, eye1.y, eyeRadius, 0, Math.PI * 2);
                this.ctx.arc(eye2.x, eye2.y, eyeRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Draw body connection lines (exclude pairs that cross portals)
        this.ctx.lineWidth = this.cellSize * 0.5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.shadowBlur = 0; // Disable shadows for vector lines to speed up and keep crisp

        for (let i = 0; i < this.snake.length - 1; i++) {
            const p1 = this.snake[i];
            const p2 = this.snake[i+1];

            // If coordinates jump by more than 1 unit, they crossed the portal
            const dx = Math.abs(p1.x - p2.x);
            const dy = Math.abs(p1.y - p2.y);
            const portalCrossing = (dx > 1 || dy > 1);

            if (!portalCrossing) {
                const ratio = i / this.snake.length;
                const rVal = Math.floor(0 + ratio * 200);
                const gVal = Math.floor(210 - ratio * 150);
                const bVal = 255;
                this.ctx.strokeStyle = `rgba(${rVal}, ${gVal}, ${bVal}, 0.5)`;
                
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x * this.cellSize + halfCell, p1.y * this.cellSize + halfCell);
                this.ctx.lineTo(p2.x * this.cellSize + halfCell, p2.y * this.cellSize + halfCell);
                this.ctx.stroke();
            }
        }

        this.ctx.restore();
    }

    drawRewindScanlines() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 0, 127, 0.03)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw HUD message on canvas
        this.ctx.fillStyle = 'var(--neon-pink)';
        this.ctx.font = '900 16px "Orbitron", "Inter", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = 'var(--neon-pink)';
        this.ctx.fillText(`⏳ RETROGRADE STATE  -${(this.rewindStepCount * 0.1).toFixed(1)}s`, this.canvas.width / 2, 40);

        // Horizontal scanlines
        this.ctx.strokeStyle = 'rgba(0, 210, 255, 0.07)';
        this.ctx.lineWidth = 1.5;
        for (let y = Math.floor(Math.random() * 15); y < this.canvas.height; y += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }
}

// Start core class on load
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new ChronoPortalSnake();
});
