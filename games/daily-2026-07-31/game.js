/**
 * 赛博霓虹：光轨重构 (Cyber Lightcycle Flux) - Game Engine
 * Date: 2026-07-31
 * Author: Antigravity AI
 */

class SoundSynth {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playLaserTurn() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    playEatCore() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
    }

    playPhaseShift() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.3);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
    }

    playGameOver() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
    }
}

class LightcycleFluxGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundSynth();

        this.gridCols = 24;
        this.gridRows = 24;
        this.tileSize = 20;

        this.state = 'START'; // START, PLAYING, PAUSED, GAMEOVER
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('cyber_lightcycle_highscore') || '0', 10);
        this.coresCollected = 0;
        this.phaseEnergy = 0;
        this.phaseTimer = 0; // Phase shift active timer

        this.snake = [];
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };
        this.lightTrail = []; // Lightcycle trail

        this.foods = [];
        this.particles = [];

        this.lastTime = 0;
        this.stepTimer = 0;
        this.stepInterval = 110;

        // Init preview snake for live background canvas render
        const startX = Math.floor(this.gridCols / 2);
        const startY = Math.floor(this.gridRows / 2);
        this.snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];
        this.foods = [
            { x: startX + 4, y: startY, type: 'CYAN' },
            { x: startX - 3, y: startY - 3, type: 'PINK' }
        ];

        this.initDOM();
        this.resizeCanvas();
        this.bindEvents();

        // Start continuous live canvas render
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    initDOM() {
        document.getElementById('highscore-val').textContent = this.highScore;
        this.updateHUD();
    }

    resizeCanvas() {
        const wrapper = document.getElementById('canvas-wrapper');
        const size = Math.min(wrapper.clientWidth - 10, 520);
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;

        this.ctx.scale(dpr, dpr);
        this.tileSize = size / this.gridCols;
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resizeCanvas());

        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (this.state !== 'PLAYING') return;

            if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && this.dir.y === 0) {
                this.nextDir = { x: 0, y: -1 };
                this.sound.playLaserTurn();
            } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && this.dir.y === 0) {
                this.nextDir = { x: 0, y: 1 };
                this.sound.playLaserTurn();
            } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && this.dir.x === 0) {
                this.nextDir = { x: -1, y: 0 };
                this.sound.playLaserTurn();
            } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && this.dir.x === 0) {
                this.nextDir = { x: 1, y: 0 };
                this.sound.playLaserTurn();
            } else if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                this.activatePhaseShift();
            } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                this.togglePause();
            }
        });

        // Mobile D-Pad
        document.getElementById('btn-up').addEventListener('click', () => { if (this.dir.y === 0) { this.nextDir = { x: 0, y: -1 }; this.sound.playLaserTurn(); } });
        document.getElementById('btn-down').addEventListener('click', () => { if (this.dir.y === 0) { this.nextDir = { x: 0, y: 1 }; this.sound.playLaserTurn(); } });
        document.getElementById('btn-left').addEventListener('click', () => { if (this.dir.x === 0) { this.nextDir = { x: -1, y: 0 }; this.sound.playLaserTurn(); } });
        document.getElementById('btn-right').addEventListener('click', () => { if (this.dir.x === 0) { this.nextDir = { x: 1, y: 0 }; this.sound.playLaserTurn(); } });

        // Buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-pause-btn').addEventListener('click', () => this.startGame());
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('skill-btn').addEventListener('click', () => this.activatePhaseShift());

        // Sound Toggle
        document.getElementById('sound-btn').addEventListener('click', () => {
            const isMuted = this.sound.toggleMute();
            document.getElementById('sound-icon-on').style.display = isMuted ? 'none' : 'block';
            document.getElementById('sound-icon-off').style.display = isMuted ? 'block' : 'none';
        });
    }

    startGame() {
        this.sound.init();
        this.state = 'PLAYING';
        this.score = 0;
        this.coresCollected = 0;
        this.phaseEnergy = 0;
        this.phaseTimer = 0;

        document.getElementById('start-overlay').style.display = 'none';
        document.getElementById('pause-overlay').style.display = 'none';
        document.getElementById('game-over-overlay').style.display = 'none';

        const startX = Math.floor(this.gridCols / 2);
        const startY = Math.floor(this.gridRows / 2);
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };

        this.snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
            { x: startX - 3, y: startY }
        ];

        this.lightTrail = [];
        this.foods = [];
        this.spawnFood('CYAN');
        this.spawnFood('PINK');

        this.updateHUD();
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pause-overlay').style.display = 'flex';
        } else if (this.state === 'PAUSED') {
            this.resumeGame();
        }
    }

    resumeGame() {
        this.state = 'PLAYING';
        document.getElementById('pause-overlay').style.display = 'none';
    }

    activatePhaseShift() {
        if (this.phaseEnergy < 100 || this.state !== 'PLAYING') return;

        this.phaseEnergy = 0;
        this.phaseTimer = 45; // ~4.5s phase shift
        this.sound.playPhaseShift();
        this.updateHUD();
    }

    spawnFood(type = 'CYAN') {
        let pos;
        let attempts = 0;
        while (attempts < 100) {
            pos = {
                x: Math.floor(Math.random() * this.gridCols),
                y: Math.floor(Math.random() * this.gridRows)
            };
            const onSnake = this.snake.some(s => s.x === pos.x && s.y === pos.y);
            const onFood = this.foods.some(f => f.x === pos.x && f.y === pos.y);
            if (!onSnake && !onFood) break;
            attempts++;
        }

        if (pos) {
            this.foods.push({ x: pos.x, y: pos.y, type });
        }
    }

    updateStep() {
        this.dir = { ...this.nextDir };
        const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

        // Wall collision check
        if (head.x < 0 || head.x >= this.gridCols || head.y < 0 || head.y >= this.gridRows) {
            if (this.phaseTimer > 0 || window.location.search.includes('autoplay')) {
                head.x = (head.x + this.gridCols) % this.gridCols;
                head.y = (head.y + this.gridRows) % this.gridRows;
            } else {
                this.triggerGameOver();
                return;
            }
        }

        // Self & Light trail collision check
        if (this.phaseTimer <= 0) {
            const selfCollide = this.snake.some(s => s.x === head.x && s.y === head.y);
            if (selfCollide) {
                this.triggerGameOver();
                return;
            }
        }

        // Add previous tail to light trail
        const tailEnd = this.snake[this.snake.length - 1];
        this.lightTrail.push({ x: tailEnd.x, y: tailEnd.y, life: 30 });

        // Advance snake
        this.snake.unshift(head);

        // Eat food check
        let ateFood = false;
        for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            if (food.x === head.x && food.y === head.y) {
                ateFood = true;
                this.score += food.type === 'PINK' ? 30 : 15;
                this.coresCollected++;
                this.sound.playEatCore();

                if (this.phaseEnergy < 100) {
                    this.phaseEnergy = Math.min(100, this.phaseEnergy + 25);
                }

                this.spawnParticles(head.x, head.y, food.type === 'PINK' ? '#FF007F' : '#00F0FF');
                this.foods.splice(i, 1);
                this.spawnFood(food.type);
                break;
            }
        }

        if (!ateFood) {
            this.snake.pop();
        }

        // Update light trail decay
        for (let i = this.lightTrail.length - 1; i >= 0; i--) {
            this.lightTrail[i].life--;
            if (this.lightTrail[i].life <= 0) {
                this.lightTrail.splice(i, 1);
            }
        }

        this.updateHUD();
    }

    spawnParticles(gx, gy, color) {
        const px = (gx + 0.5) * this.tileSize;
        const py = (gy + 0.5) * this.tileSize;
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1;
            this.particles.push({
                x: px, y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                life: 1.0
            });
        }
    }

    updateHUD() {
        document.getElementById('score-val').textContent = this.score;
        document.getElementById('highscore-val').textContent = this.highScore;
        document.getElementById('core-val').textContent = this.coresCollected;

        const fill = document.getElementById('energy-fill');
        fill.style.width = `${this.phaseEnergy}%`;
        document.getElementById('energy-pct').textContent = `${Math.floor(this.phaseEnergy)}%`;

        const skillBtn = document.getElementById('skill-btn');
        if (this.phaseEnergy >= 100) {
            skillBtn.disabled = false;
        } else {
            skillBtn.disabled = true;
        }
    }

    triggerGameOver() {
        this.state = 'GAMEOVER';
        this.sound.playGameOver();

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('cyber_lightcycle_highscore', this.highScore.toString());
        }

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-highscore').textContent = this.highScore;
        document.getElementById('game-over-overlay').style.display = 'flex';
    }

    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.state === 'PLAYING') {
            this.stepTimer += dt;

            if (this.phaseTimer > 0) {
                this.phaseTimer--;
            }

            if (this.stepTimer >= this.stepInterval) {
                this.stepTimer = 0;
                this.updateStep();
            }
        }

        // Particle update
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        this.draw();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    draw() {
        const size = this.canvas.width / (window.devicePixelRatio || 1);

        // 1. Dark Cyber Grid Background
        this.ctx.fillStyle = '#030611';
        this.ctx.fillRect(0, 0, size, size);

        // Grid Lines
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.gridCols; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.tileSize, 0);
            this.ctx.lineTo(i * this.tileSize, size);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.tileSize);
            this.ctx.lineTo(size, i * this.tileSize);
            this.ctx.stroke();
        }

        // 2. Light Trail Walls
        this.lightTrail.forEach(t => {
            const px = (t.x + 0.5) * this.tileSize;
            const py = (t.y + 0.5) * this.tileSize;
            this.ctx.save();
            this.ctx.fillStyle = `rgba(0, 240, 255, ${t.life / 30 * 0.4})`;
            this.ctx.fillRect(t.x * this.tileSize, t.y * this.tileSize, this.tileSize, this.tileSize);
            this.ctx.restore();
        });

        // 3. Foods (Data Cores)
        this.foods.forEach(f => {
            const px = (f.x + 0.5) * this.tileSize;
            const py = (f.y + 0.5) * this.tileSize;
            const radius = this.tileSize * 0.4;
            const color = f.type === 'PINK' ? '#FF007F' : '#00F0FF';

            this.ctx.save();
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 14;

            this.ctx.fillStyle = color;
            this.ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);

            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(px - radius * 0.6, py - radius * 0.6, radius * 1.2, radius * 1.2);

            this.ctx.restore();
        });

        // 4. Cyber Lightcycle Snake
        this.snake.forEach((seg, index) => {
            const px = (seg.x + 0.5) * this.tileSize;
            const py = (seg.y + 0.5) * this.tileSize;
            const radius = (index === 0 ? 0.48 : 0.42) * this.tileSize;
            const isPhase = this.phaseTimer > 0;
            const color = isPhase ? '#FFE600' : (index === 0 ? '#00F0FF' : '#00A8FF');

            this.ctx.save();
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = index === 0 ? 18 : 10;

            if (index === 0) {
                // Snake Head
                this.ctx.beginPath();
                this.ctx.arc(px, py, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = color;
                this.ctx.fill();

                this.ctx.fillStyle = '#030611';
                this.ctx.beginPath();
                this.ctx.arc(px + this.dir.x * 5 - this.dir.y * 3, py + this.dir.y * 5 + this.dir.x * 3, 2.5, 0, Math.PI * 2);
                this.ctx.arc(px + this.dir.x * 5 + this.dir.y * 3, py + this.dir.y * 5 - this.dir.x * 3, 2.5, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                // Body Segment
                this.ctx.beginPath();
                this.ctx.arc(px, py, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = color;
                this.ctx.globalAlpha = 0.9;
                this.ctx.fill();

                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }

            this.ctx.restore();
        });

        // 5. Particles
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
}

// Instantiate on Load
window.addEventListener('DOMContentLoaded', () => {
    const game = new LightcycleFluxGame();
    if (window.location.search.includes('autoplay')) {
        game.startGame();
    }
});
