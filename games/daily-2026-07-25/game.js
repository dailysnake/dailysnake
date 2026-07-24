/**
 * 瓷韵金缮 (Kintsugi Porcelain Odyssey) - Game Engine
 * Date: 2026-07-25
 * Author: Antigravity AI
 */

// --- Web Audio API Synth Engine ---
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        // Pentatonic Scale (宫商角徵羽): C4, D4, E4, G4, A4, C5, D5, E5
        this.pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
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

    playChime(index = 0) {
        if (this.muted) return;
        this.init();

        const freq = this.pentatonic[index % this.pentatonic.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // High harmonic for porcelain ceramic resonance
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 3, this.ctx.currentTime);
        gain2.gain.setValueAtTime(0.08, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

        osc.connect(gain);
        osc2.connect(gain2);
        gain2.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc2.start();
        osc.stop(this.ctx.currentTime + 0.45);
        osc2.stop(this.ctx.currentTime + 0.45);
    }

    playRepairGold() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        const arpeggio = [523.25, 659.25, 783.99, 1046.50];

        arpeggio.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.06);

            gain.gain.setValueAtTime(0.2, now + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.55);
        });
    }

    playCrack() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    playResonance() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        const freqs = [261.63, 329.63, 392.00, 523.25];
        freqs.forEach(f => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 1.25);
        });
    }

    playGameOver() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.6);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.65);
    }
}

// --- Main Game Class ---
class KintsugiGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundEngine();

        this.gridSize = 20; // 20x20 grid
        this.tileSize = 25;

        // Game State
        this.state = 'START'; // START, PLAYING, GAMEOVER
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('kintsugi_highscore') || '0', 10);
        this.strain = 0; // 0 to 100
        this.seamsCount = 0; // 0 to 3
        this.isResonant = false; // Ultimate state
        this.resonantTime = 0;

        // Glaze Evolution Types
        this.glazes = [
            { name: '青花莲韵', color: '#002B49', accent: '#3182CE', mult: 1 },
            { name: '曜变天目', color: '#1A1A24', accent: '#9F7AEA', mult: 1.5 },
            { name: '琅彩粉瓷', color: '#701A75', accent: '#F472B6', mult: 2.0 }
        ];
        this.currentGlazeIndex = 0;

        // Snake & Items
        this.snake = [];
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };
        this.foods = []; // regular, gold, fire
        this.particles = [];

        // Timing
        this.lastTime = 0;
        this.stepTimer = 0;
        this.stepInterval = 130; // ms per step

        this.initDOM();
        this.resizeCanvas();
        this.bindEvents();
    }

    initDOM() {
        document.getElementById('highscore-val').textContent = this.highScore;
        this.updateDashboard();
    }

    resizeCanvas() {
        const wrapper = document.getElementById('canvas-wrapper');
        const size = Math.min(wrapper.clientWidth - 20, 500);
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';

        this.ctx.scale(dpr, dpr);
        this.tileSize = size / this.gridSize;
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resizeCanvas());

        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (this.state !== 'PLAYING') return;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.dir.y === 0) this.setDirection(0, -1);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.dir.y === 0) this.setDirection(0, 1);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.dir.x === 0) this.setDirection(-1, 0);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.dir.x === 0) this.setDirection(1, 0);
                    break;
                case ' ':
                    this.activateResonance();
                    break;
            }
        });

        // Touch D-Pad
        document.querySelectorAll('.dpad-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const dir = btn.getAttribute('data-dir');
                this.handleTouchDir(dir);
            });
            btn.addEventListener('click', () => {
                const dir = btn.getAttribute('data-dir');
                this.handleTouchDir(dir);
            });
        });

        // UI Buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('ability-btn').addEventListener('click', () => this.activateResonance());

        // Sound Toggle
        document.getElementById('sound-btn').addEventListener('click', () => {
            this.sound.muted = !this.sound.muted;
            document.getElementById('sound-icon-on').style.display = this.sound.muted ? 'none' : 'block';
            document.getElementById('sound-icon-off').style.display = this.sound.muted ? 'block' : 'none';
        });
    }

    handleTouchDir(dir) {
        if (this.state !== 'PLAYING') return;
        if (dir === 'UP' && this.dir.y === 0) this.setDirection(0, -1);
        if (dir === 'DOWN' && this.dir.y === 0) this.setDirection(0, 1);
        if (dir === 'LEFT' && this.dir.x === 0) this.setDirection(-1, 0);
        if (dir === 'RIGHT' && this.dir.x === 0) this.setDirection(1, 0);
    }

    setDirection(x, y) {
        // Sharp turn adds strain
        if (this.dir.x !== x || this.dir.y !== y) {
            this.addStrain(12);
        }
        this.nextDir = { x, y };
    }

    startGame() {
        this.sound.init();
        this.state = 'PLAYING';
        this.score = 0;
        this.strain = 0;
        this.seamsCount = 0;
        this.isResonant = false;
        this.resonantTime = 0;
        this.currentGlazeIndex = 0;

        // Hide Overlays
        document.getElementById('start-overlay').classList.remove('active');
        document.getElementById('gameover-overlay').classList.remove('active');

        // Reset Snake
        const startX = Math.floor(this.gridSize / 2);
        const startY = Math.floor(this.gridSize / 2);
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };

        this.snake = [
            { x: startX, y: startY, fractured: false, golden: false },
            { x: startX - 1, y: startY, fractured: false, golden: false },
            { x: startX - 2, y: startY, fractured: false, golden: false }
        ];

        this.foods = [];
        this.spawnFood('REGULAR');
        this.spawnFood('GOLD');

        this.updateDashboard();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    spawnFood(type) {
        let pos;
        let attempts = 0;
        do {
            pos = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize)
            };
            attempts++;
        } while (this.isOccupied(pos.x, pos.y) && attempts < 100);

        this.foods.push({
            x: pos.x,
            y: pos.y,
            type: type, // REGULAR, GOLD, FIRE
            pulse: 0
        });
    }

    isOccupied(x, y) {
        return this.snake.some(s => s.x === x && s.y === y) ||
               this.foods.some(f => f.x === x && f.y === y);
    }

    addStrain(val) {
        this.strain = Math.min(100, this.strain + val);

        if (this.strain >= 100) {
            // Fracture a snake segment
            const intact = this.snake.find(s => !s.fractured && !s.golden);
            if (intact) {
                intact.fractured = true;
                this.sound.playCrack();
                this.createCrackParticles(intact.x, intact.y);
            }
            this.strain = 0;
        }
        this.updateDashboard();
    }

    activateResonance() {
        if (this.seamsCount >= 3 && !this.isResonant) {
            this.isResonant = true;
            this.resonantTime = 3000; // 3 seconds
            this.seamsCount = 0;
            this.sound.playResonance();
            this.createGoldBurst(this.snake[0].x, this.snake[0].y);
            this.updateDashboard();
        }
    }

    updateDashboard() {
        document.getElementById('score-val').textContent = this.score;
        document.getElementById('highscore-val').textContent = this.highScore;
        document.getElementById('strain-fill').style.width = this.strain + '%';
        document.getElementById('strain-pct').textContent = Math.round(this.strain) + '%';

        // Update Seams Dots
        const dots = document.querySelectorAll('#seams-counter .seam-dot');
        dots.forEach((dot, index) => {
            if (index < this.seamsCount) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Ability Button
        const abilityBtn = document.getElementById('ability-btn');
        if (this.seamsCount >= 3 && !this.isResonant) {
            abilityBtn.disabled = false;
            abilityBtn.classList.add('ready-pulse');
        } else {
            abilityBtn.disabled = true;
            abilityBtn.classList.remove('ready-pulse');
        }

        // Glaze Tag
        const glaze = this.glazes[this.currentGlazeIndex];
        const glazeTag = document.getElementById('glaze-tag');
        glazeTag.textContent = glaze.name;
        glazeTag.style.color = glaze.accent;
    }

    gameLoop(timestamp) {
        if (this.state !== 'PLAYING') return;

        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.stepTimer += dt;

        if (this.isResonant) {
            this.resonantTime -= dt;
            if (this.resonantTime <= 0) {
                this.isResonant = false;
                this.updateDashboard();
            }
        }

        if (this.stepTimer >= this.stepInterval) {
            this.stepTimer = 0;
            this.updateStep();
        }

        this.updateParticles(dt);
        this.draw();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    updateStep() {
        this.dir = { ...this.nextDir };
        const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

        // Wall Collision Logic
        if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
            if (this.isResonant) {
                // Wrap around when Resonant
                head.x = (head.x + this.gridSize) % this.gridSize;
                head.y = (head.y + this.gridSize) % this.gridSize;
            } else {
                this.triggerGameOver();
                return;
            }
        }

        // Self Collision Logic
        if (!this.isResonant) {
            for (let i = 0; i < this.snake.length - 1; i++) {
                if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                    this.triggerGameOver();
                    return;
                }
            }
        }

        // Move Head
        const newHead = { x: head.x, y: head.y, fractured: false, golden: this.isResonant };
        this.snake.unshift(newHead);

        // Magnetism during Resonance
        if (this.isResonant) {
            this.foods.forEach(food => {
                if (Math.abs(food.x - head.x) <= 3 && Math.abs(food.y - head.y) <= 3) {
                    food.x += Math.sign(head.x - food.x);
                    food.y += Math.sign(head.y - food.y);
                }
            });
        }

        // Food Eating Logic
        let ateFood = false;
        for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            if (food.x === head.x && food.y === head.y) {
                ateFood = true;
                const glazeMult = this.glazes[this.currentGlazeIndex].mult;

                if (food.type === 'REGULAR') {
                    this.score += Math.round(10 * glazeMult);
                    this.sound.playChime(this.snake.length);
                    this.spawnFood('REGULAR');
                    // Random chance to spawn Fire Ember
                    if (Math.random() < 0.25 && !this.foods.some(f => f.type === 'FIRE')) {
                        this.spawnFood('FIRE');
                    }
                } else if (food.type === 'GOLD') {
                    this.score += Math.round(30 * glazeMult);
                    this.sound.playRepairGold();
                    // Repair a fractured segment or make one golden seam
                    const frac = this.snake.find(s => s.fractured);
                    if (frac) {
                        frac.fractured = false;
                        frac.golden = true;
                    } else {
                        // Make next segment golden
                        if (this.snake[1]) this.snake[1].golden = true;
                    }
                    if (this.seamsCount < 3) {
                        this.seamsCount++;
                    }
                    this.createGoldBurst(head.x, head.y);
                    this.spawnFood('GOLD');
                } else if (food.type === 'FIRE') {
                    this.score += Math.round(50 * glazeMult);
                    this.currentGlazeIndex = (this.currentGlazeIndex + 1) % this.glazes.length;
                    this.sound.playResonance();
                    this.createGoldBurst(head.x, head.y);
                }

                this.foods.splice(i, 1);
                this.updateDashboard();
                break;
            }
        }

        if (!ateFood) {
            this.snake.pop();
        }

        // Passive strain gain
        this.addStrain(1.5);
    }

    triggerGameOver() {
        this.state = 'GAMEOVER';
        this.sound.playGameOver();

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('kintsugi_highscore', this.highScore.toString());
        }

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-highscore').textContent = this.highScore;
        document.getElementById('final-seams').textContent = this.snake.filter(s => s.golden).length;

        document.getElementById('gameover-overlay').classList.add('active');
    }

    createCrackParticles(x, y) {
        const px = (x + 0.5) * this.tileSize;
        const py = (y + 0.5) * this.tileSize;
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: px, y: py,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color: '#B8C4D0',
                size: Math.random() * 3 + 1
            });
        }
    }

    createGoldBurst(x, y) {
        const px = (x + 0.5) * this.tileSize;
        const py = (y + 0.5) * this.tileSize;
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({
                x: px, y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: '#FFD700',
                size: Math.random() * 4 + 2
            });
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt / 600;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        // Clear Background with Porcelain Off-White
        this.ctx.fillStyle = '#FAF8F5';
        this.ctx.fillRect(0, 0, width, height);

        // Draw Craquelure Grid Lines (瓷纹网格)
        this.ctx.strokeStyle = 'rgba(0, 43, 73, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.gridSize; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.tileSize, 0);
            this.ctx.lineTo(x * this.tileSize, height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.gridSize; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.tileSize);
            this.ctx.lineTo(width, y * this.tileSize);
            this.ctx.stroke();
        }

        // Draw Foods
        this.foods.forEach(food => {
            const px = (food.x + 0.5) * this.tileSize;
            const py = (food.y + 0.5) * this.tileSize;
            const radius = this.tileSize * 0.38;

            this.ctx.save();
            if (food.type === 'REGULAR') {
                // Cobalt Blue Bead
                this.ctx.beginPath();
                this.ctx.arc(px, py, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = '#002B49';
                this.ctx.fill();

                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = '#3182CE';
                this.ctx.stroke();

                // Specular sheen
                this.ctx.beginPath();
                this.ctx.arc(px - radius * 0.3, py - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.fill();
            } else if (food.type === 'GOLD') {
                // Gold Lacquer Shard
                this.ctx.beginPath();
                this.ctx.arc(px, py, radius * 1.1, 0, Math.PI * 2);
                this.ctx.fillStyle = '#FFD700';
                this.ctx.shadowColor = '#FFD700';
                this.ctx.shadowBlur = 12;
                this.ctx.fill();

                this.ctx.fillStyle = '#D4AF37';
                this.ctx.beginPath();
                this.ctx.arc(px, py, radius * 0.6, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (food.type === 'FIRE') {
                // Kiln Fire Ember
                this.ctx.beginPath();
                this.ctx.arc(px, py, radius * 1.1, 0, Math.PI * 2);
                this.ctx.fillStyle = '#E53E3E';
                this.ctx.shadowColor = '#E53E3E';
                this.ctx.shadowBlur = 14;
                this.ctx.fill();
            }
            this.ctx.restore();
        });

        // Draw Snake Body
        const glaze = this.glazes[this.currentGlazeIndex];
        this.snake.forEach((seg, index) => {
            const px = (seg.x + 0.5) * this.tileSize;
            const py = (seg.y + 0.5) * this.tileSize;
            const radius = (index === 0 ? 0.45 : 0.4) * this.tileSize;

            this.ctx.save();

            if (seg.golden || this.isResonant) {
                // Kintsugi Golden Seam Bead
                this.ctx.beginPath();
                this.ctx.arc(px, py, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = '#FFD700';
                this.ctx.shadowColor = '#FFD700';
                this.ctx.shadowBlur = seg.golden ? 10 : 16;
                this.ctx.fill();

                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.stroke();
            } else {
                // Porcelain Bead
                this.ctx.beginPath();
                this.ctx.arc(px, py, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = glaze.color;
                this.ctx.fill();

                this.ctx.lineWidth = 2.5;
                this.ctx.strokeStyle = seg.fractured ? '#E53E3E' : glaze.accent;
                this.ctx.stroke();

                // Draw Fractured Crack overlay if cracked
                if (seg.fractured) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(px - radius * 0.5, py - radius * 0.5);
                    this.ctx.lineTo(px + radius * 0.2, py);
                    this.ctx.lineTo(px - radius * 0.1, py + radius * 0.5);
                    this.ctx.strokeStyle = '#FFFFFF';
                    this.ctx.lineWidth = 1.5;
                    this.ctx.stroke();
                }

                // Head Eye Details
                if (index === 0) {
                    this.ctx.beginPath();
                    this.ctx.arc(px + this.dir.x * 4, py + this.dir.y * 4, 3, 0, Math.PI * 2);
                    this.ctx.fillStyle = '#FFD700';
                    this.ctx.fill();
                }
            }

            this.ctx.restore();
        });

        // Draw Particles
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // Resonance Visual Filter Wave
        if (this.isResonant) {
            this.ctx.save();
            this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(4, 4, width - 8, height - 8);
            this.ctx.restore();
        }
    }
}

// Instantiate on Load
window.addEventListener('DOMContentLoaded', () => {
    new KintsugiGame();
});
