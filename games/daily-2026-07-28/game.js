/**
 * 极光之痕：符文灵蛇 (Nordic Aurora: Rune Weaver)
 * Daily Snake Game - 2026-07-28
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

    playEatRune(type, combo = 1) {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        // Base frequency according to rune type
        let baseFreq = 440;
        if (type === 'sowilo') baseFreq = 587.33; // D5
        else if (type === 'isa') baseFreq = 659.25; // E5
        else if (type === 'kenaz') baseFreq = 523.25; // C5
        else if (type === 'ansuz') baseFreq = 880; // A5

        const pitchMult = Math.min(1 + (combo - 1) * 0.08, 2.0);
        const freq = baseFreq * pitchMult;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type === 'kenaz' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);

        // Sub sparkle tone
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, now);
        gain2.gain.setValueAtTime(0.1, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.18);
    }

    playSkillBurst() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.6);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.65);

        // Noise burst
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1000;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noise.start(now);
    }

    playGameOver() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.5);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
    }

    playTurn() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.shockwaves = [];
    }

    spawnEatParticles(x, y, color) {
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3.5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 3,
                color,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.02
            });
        }
    }

    spawnBurstShockwave(x, y) {
        this.shockwaves.push({
            x, y,
            radius: 5,
            maxRadius: 280,
            alpha: 1.0,
            color: '#00F0FF'
        });
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 6;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 3 + Math.random() * 4,
                color: `hsl(${Math.random() * 360}, 100%, 65%)`,
                alpha: 1.0,
                decay: 0.015
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const s = this.shockwaves[i];
            s.radius += 8;
            s.alpha -= 0.025;
            if (s.alpha <= 0 || s.radius >= s.maxRadius) {
                this.shockwaves.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        for (const s of this.shockwaves) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 240, 255, ${s.alpha})`;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = s.color;
            ctx.stroke();
        }

        for (const p of this.particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fill();
        }
        ctx.restore();
    }
}

class NordicAuroraGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundSynth();
        this.particles = new ParticleSystem();

        this.gridCols = 24;
        this.gridRows = 24;
        this.cellSize = 20;

        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('aurora_snake_highscore') || '0', 10);
        this.runesCollected = 0;
        this.bifrostEnergy = 0;
        this.combo = 1;
        this.comboTimer = 0;

        this.snake = [];
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };

        this.runes = [];
        this.hazards = [];

        // Active timers
        this.speedTimer = 0;
        this.magnetTimer = 0;
        this.freezeTimer = 0;
        this.flameTimer = 0;
        this.invincibleTimer = 0;

        this.activeRuneType = 'sowilo';

        this.state = 'INIT'; // INIT, PLAYING, PAUSED, GAMEOVER
        this.lastTime = 0;
        this.accumulatedTime = 0;

        this.auroraOffset = 0;

        this.setupDOM();
        this.setupEvents();
        this.resizeCanvas();
        this.updateHUD();
    }

    setupDOM() {
        this.scoreVal = document.getElementById('score-val');
        this.highscoreVal = document.getElementById('highscore-val');
        this.runeVal = document.getElementById('rune-val');
        this.energyFill = document.getElementById('energy-fill');
        this.energyPct = document.getElementById('energy-pct');
        this.skillBtn = document.getElementById('skill-btn');
        this.statusBanner = document.getElementById('status-banner');
        this.statusText = document.getElementById('status-text');

        this.startOverlay = document.getElementById('start-overlay');
        this.pauseOverlay = document.getElementById('pause-overlay');
        this.gameOverOverlay = document.getElementById('game-over-overlay');

        this.finalScore = document.getElementById('final-score');
        this.finalHighscore = document.getElementById('final-highscore');
        this.finalRunes = document.getElementById('final-runes');

        this.soundBtn = document.getElementById('sound-btn');
        this.soundIconOn = document.getElementById('sound-icon-on');
        this.soundIconOff = document.getElementById('sound-icon-off');
    }

    setupEvents() {
        window.addEventListener('resize', () => this.resizeCanvas());

        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restart-pause-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());

        this.soundBtn.addEventListener('click', () => {
            const isMuted = this.sound.toggleMute();
            this.soundIconOn.style.display = isMuted ? 'none' : 'block';
            this.soundIconOff.style.display = isMuted ? 'block' : 'none';
        });

        // Skill Burst
        this.skillBtn.addEventListener('click', () => this.triggerSkillBurst());

        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (this.state === 'PLAYING') {
                if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && this.dir.y === 0) {
                    this.nextDir = { x: 0, y: -1 };
                    this.sound.playTurn();
                } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && this.dir.y === 0) {
                    this.nextDir = { x: 0, y: 1 };
                    this.sound.playTurn();
                } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && this.dir.x === 0) {
                    this.nextDir = { x: -1, y: 0 };
                    this.sound.playTurn();
                } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && this.dir.x === 0) {
                    this.nextDir = { x: 1, y: 0 };
                    this.sound.playTurn();
                } else if (e.key === ' ' || e.code === 'Space') {
                    e.preventDefault();
                    this.triggerSkillBurst();
                } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                    this.togglePause();
                }
            }
        });

        // Mobile D-Pad
        document.getElementById('btn-up').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.dir.y === 0) this.nextDir = { x: 0, y: -1 }; });
        document.getElementById('btn-down').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.dir.y === 0) this.nextDir = { x: 0, y: 1 }; });
        document.getElementById('btn-left').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.dir.x === 0) this.nextDir = { x: -1, y: 0 }; });
        document.getElementById('btn-right').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.dir.x === 0) this.nextDir = { x: 1, y: 0 }; });

        document.getElementById('btn-up').addEventListener('click', () => { if (this.dir.y === 0) this.nextDir = { x: 0, y: -1 }; });
        document.getElementById('btn-down').addEventListener('click', () => { if (this.dir.y === 0) this.nextDir = { x: 0, y: 1 }; });
        document.getElementById('btn-left').addEventListener('click', () => { if (this.dir.x === 0) this.nextDir = { x: -1, y: 0 }; });
        document.getElementById('btn-right').addEventListener('click', () => { if (this.dir.x === 0) this.nextDir = { x: 1, y: 0 }; });

        // Touch Canvas Swipes
        let touchStartX = 0;
        let touchStartY = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.state !== 'PLAYING') return;
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;

            if (Math.abs(dx) > 25 || Math.abs(dy) > 25) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > 0 && this.dir.x === 0) this.nextDir = { x: 1, y: 0 };
                    else if (dx < 0 && this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
                } else {
                    if (dy > 0 && this.dir.y === 0) this.nextDir = { x: 0, y: 1 };
                    else if (dy < 0 && this.dir.y === 0) this.nextDir = { x: 0, y: -1 };
                }
                this.sound.playTurn();
            }
        }, { passive: true });
    }

    resizeCanvas() {
        const wrapper = this.canvas.parentElement;
        const rect = wrapper.getBoundingClientRect();

        const side = Math.min(rect.width - 20, rect.height - 20, 600);
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = side * dpr;
        this.canvas.height = side * dpr;
        this.canvas.style.width = `${side}px`;
        this.canvas.style.height = `${side}px`;

        this.cellSize = (side * dpr) / this.gridCols;
    }

    startGame() {
        this.sound.init();
        this.score = 0;
        this.runesCollected = 0;
        this.bifrostEnergy = 0;
        this.combo = 1;
        this.comboTimer = 0;

        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };

        // Center snake
        const startX = Math.floor(this.gridCols / 2);
        const startY = Math.floor(this.gridRows / 2);
        this.snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
            { x: startX - 3, y: startY }
        ];

        this.runes = [];
        this.hazards = [];

        this.speedTimer = 0;
        this.magnetTimer = 0;
        this.freezeTimer = 0;
        this.flameTimer = 0;
        this.invincibleTimer = 0;

        this.spawnRune('sowilo');
        this.spawnRune('isa');
        this.spawnRune('kenaz');

        this.startOverlay.style.display = 'none';
        this.pauseOverlay.style.display = 'none';
        this.gameOverOverlay.style.display = 'none';

        this.state = 'PLAYING';
        this.lastTime = performance.now();
        this.accumulatedTime = 0;

        this.updateHUD();
        requestAnimationFrame((t) => this.loop(t));
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.pauseOverlay.style.display = 'flex';
        } else if (this.state === 'PAUSED') {
            this.resumeGame();
        }
    }

    resumeGame() {
        this.state = 'PLAYING';
        this.pauseOverlay.style.display = 'none';
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.sound.playGameOver();

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('aurora_snake_highscore', this.highScore.toString());
        }

        this.finalScore.textContent = this.score;
        this.finalHighscore.textContent = this.highScore;
        this.finalRunes.textContent = this.runesCollected;

        this.gameOverOverlay.style.display = 'flex';
        this.updateHUD();
    }

    showBanner(text) {
        this.statusText.textContent = text;
        this.statusBanner.classList.add('active');
        setTimeout(() => {
            this.statusBanner.classList.remove('active');
        }, 2500);
    }

    spawnRune(specificType = null) {
        const types = ['sowilo', 'isa', 'kenaz', 'ansuz'];
        const weights = [0.35, 0.3, 0.25, 0.1];
        
        let type = specificType;
        if (!type) {
            const rand = Math.random();
            let sum = 0;
            for (let i = 0; i < types.length; i++) {
                sum += weights[i];
                if (rand <= sum) {
                    type = types[i];
                    break;
                }
            }
        }

        let pos;
        let attempts = 0;
        while (attempts < 100) {
            pos = {
                x: Math.floor(Math.random() * this.gridCols),
                y: Math.floor(Math.random() * this.gridRows)
            };
            const onSnake = this.snake.some(seg => seg.x === pos.x && seg.y === pos.y);
            const onRune = this.runes.some(r => r.x === pos.x && r.y === pos.y);
            if (!onSnake && !onRune) break;
            attempts++;
        }

        if (pos) {
            this.runes.push({
                x: pos.x,
                y: pos.y,
                type: type || 'sowilo',
                pulse: 0
            });
        }
    }

    spawnGlacialHazard() {
        if (this.hazards.length >= 6) return;
        let pos;
        let attempts = 0;
        while (attempts < 50) {
            pos = {
                x: Math.floor(Math.random() * this.gridCols),
                y: Math.floor(Math.random() * this.gridRows)
            };
            const onHead = this.snake[0].x === pos.x && this.snake[0].y === pos.y;
            const onRune = this.runes.some(r => r.x === pos.x && r.y === pos.y);
            if (!onHead && !onRune) break;
            attempts++;
        }
        if (pos) {
            this.hazards.push({
                x: pos.x,
                y: pos.y,
                timer: 20, // 20 ticks warning
                active: false
            });
        }
    }

    triggerSkillBurst() {
        if (this.bifrostEnergy < 100 || this.state !== 'PLAYING') return;

        this.bifrostEnergy = 0;
        this.invincibleTimer = 40; // ~4 seconds
        this.sound.playSkillBurst();

        const headPixel = this.gridToPixel(this.snake[0].x, this.snake[0].y);
        this.particles.spawnBurstShockwave(headPixel.x, headPixel.y);

        // Clear all hazards and grant score
        const hazardCount = this.hazards.length;
        this.hazards = [];
        this.score += hazardCount * 50 + 100;

        this.showBanner('🌈 彩虹极光爆裂！清空冰川灾厄，获得全屏无敌！');
        this.updateHUD();
    }

    updateLogic() {
        this.dir = { ...this.nextDir };
        const head = { ...this.snake[0] };
        head.x += this.dir.x;
        head.y += this.dir.y;

        // Wall collision check
        if (head.x < 0 || head.x >= this.gridCols || head.y < 0 || head.y >= this.gridRows) {
            if (this.invincibleTimer > 0) {
                // Wrap around when invincible
                head.x = (head.x + this.gridCols) % this.gridCols;
                head.y = (head.y + this.gridRows) % this.gridRows;
            } else {
                this.gameOver();
                return;
            }
        }

        // Self collision check
        const selfCollide = this.snake.slice(0, -1).some(seg => seg.x === head.x && seg.y === head.y);
        if (selfCollide && this.invincibleTimer <= 0 && this.flameTimer <= 0) {
            this.gameOver();
            return;
        }

        // Glacial Hazard collision check
        const hazardIndex = this.hazards.findIndex(h => h.active && h.x === head.x && h.y === head.y);
        if (hazardIndex !== -1) {
            if (this.flameTimer > 0 || this.invincibleTimer > 0) {
                // Destroy hazard
                const p = this.gridToPixel(head.x, head.y);
                this.particles.spawnEatParticles(p.x, p.y, '#FF5555');
                this.hazards.splice(hazardIndex, 1);
                this.score += 30;
            } else {
                this.gameOver();
                return;
            }
        }

        // Move snake
        this.snake.unshift(head);

        // Magnet Power logic
        if (this.magnetTimer > 0) {
            for (const r of this.runes) {
                const dist = Math.abs(r.x - head.x) + Math.abs(r.y - head.y);
                if (dist <= 4) {
                    if (r.x < head.x) r.x++;
                    else if (r.x > head.x) r.x--;
                    if (r.y < head.y) r.y++;
                    else if (r.y > head.y) r.y--;
                }
            }
        }

        // Eat Rune check
        const runeIndex = this.runes.findIndex(r => r.x === head.x && r.y === head.y);
        if (runeIndex !== -1) {
            const rune = this.runes[runeIndex];
            this.runes.splice(runeIndex, 1);
            this.runesCollected++;

            // Combo system
            this.combo++;
            this.comboTimer = 15;

            // Apply Rune powers
            let pts = 15;
            let color = '#00F0FF';
            this.activeRuneType = rune.type;

            if (rune.type === 'sowilo') {
                pts = 20 * this.combo;
                color = '#FBBF24';
                this.speedTimer = 25;
                this.magnetTimer = 25;
                this.showBanner('⚡ Sowilo 雷霆符文：磁力吸附与光速跃迁！');
            } else if (rune.type === 'isa') {
                pts = 25 * this.combo;
                color = '#38BDF8';
                this.freezeTimer = 30;
                this.showBanner('❄️ Isa 冰霜符文：冻结灾厄与时空流速');
            } else if (rune.type === 'kenaz') {
                pts = 30 * this.combo;
                color = '#FF5555';
                this.flameTimer = 30;
                this.showBanner('🔥 Kenaz 烈焰符文：粉碎冰山障碍');
            } else if (rune.type === 'ansuz') {
                pts = 50 * this.combo;
                color = '#F472B6';
                this.bifrostEnergy = Math.min(100, this.bifrostEnergy + 25);
                this.showBanner('🌟 Ansuz 神圣符文：充能彩虹桥！');
            }

            this.bifrostEnergy = Math.min(100, this.bifrostEnergy + 15);
            this.score += pts;

            this.sound.playEatRune(rune.type, this.combo);
            const pixel = this.gridToPixel(head.x, head.y);
            this.particles.spawnEatParticles(pixel.x, pixel.y, color);

            // Spawn replacement rune
            this.spawnRune();
            if (this.runes.length < 3) this.spawnRune();
        } else {
            this.snake.pop();
        }

        // Update Timers
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) this.combo = 1;
        }

        if (this.speedTimer > 0) this.speedTimer--;
        if (this.magnetTimer > 0) this.magnetTimer--;
        if (this.freezeTimer > 0) this.freezeTimer--;
        if (this.flameTimer > 0) this.flameTimer--;
        if (this.invincibleTimer > 0) this.invincibleTimer--;

        // Update Glacial Hazards
        if (this.freezeTimer <= 0) {
            for (let i = this.hazards.length - 1; i >= 0; i--) {
                const h = this.hazards[i];
                if (!h.active) {
                    h.timer--;
                    if (h.timer <= 0) {
                        h.active = true;
                    }
                }
            }

            if (Math.random() < 0.15 && this.hazards.length < 5) {
                this.spawnGlacialHazard();
            }
        }

        this.updateHUD();
    }

    updateHUD() {
        this.scoreVal.textContent = this.score;
        this.highscoreVal.textContent = this.highScore;

        const runeNames = {
            sowilo: '⚡ Sowilo 雷霆',
            isa: '❄️ Isa 冰霜',
            kenaz: '🔥 Kenaz 烈焰',
            ansuz: '🌟 Ansuz 神圣'
        };
        this.runeVal.textContent = runeNames[this.activeRuneType] || '⚡ Sowilo 雷霆';

        this.energyFill.style.width = `${this.bifrostEnergy}%`;
        this.energyPct.textContent = `${Math.floor(this.bifrostEnergy)}%`;

        if (this.bifrostEnergy >= 100) {
            this.skillBtn.disabled = false;
            this.energyFill.parentElement.classList.add('energy-ready');
        } else {
            this.skillBtn.disabled = true;
            this.energyFill.parentElement.classList.remove('energy-ready');
        }
    }

    gridToPixel(gx, gy) {
        return {
            x: (gx + 0.5) * this.cellSize,
            y: (gy + 0.5) * this.cellSize
        };
    }

    loop(currentTime) {
        if (this.state !== 'PLAYING') return;

        const delta = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.accumulatedTime += delta;

        // Base tick speed
        let tickSpeed = 100;
        if (this.speedTimer > 0) tickSpeed = 60;
        else if (this.freezeTimer > 0) tickSpeed = 140;

        while (this.accumulatedTime >= tickSpeed) {
            this.updateLogic();
            this.accumulatedTime -= tickSpeed;
        }

        this.particles.update();
        this.auroraOffset += 0.02;
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cs = this.cellSize;

        // Clear canvas
        this.ctx.fillStyle = '#070D18';
        this.ctx.fillRect(0, 0, w, h);

        // Draw animated background Aurora ribbons
        this.ctx.save();
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, h * 0.3 + i * 40);
            for (let x = 0; x <= w; x += 30) {
                const y = Math.sin(x * 0.005 + this.auroraOffset + i) * 35 + h * (0.2 + i * 0.15);
                this.ctx.lineTo(x, y);
            }
            this.ctx.lineTo(w, h);
            this.ctx.lineTo(0, h);
            this.ctx.closePath();

            const colors = ['rgba(0, 240, 255, 0.06)', 'rgba(0, 255, 179, 0.05)', 'rgba(192, 132, 252, 0.04)'];
            this.ctx.fillStyle = colors[i];
            this.ctx.fill();
        }
        this.ctx.restore();

        // Draw Grid Lines
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        this.ctx.lineWidth = 1;
        for (let c = 0; c <= this.gridCols; c++) {
            this.ctx.beginPath();
            this.ctx.moveTo(c * cs, 0);
            this.ctx.lineTo(c * cs, h);
            this.ctx.stroke();
        }
        for (let r = 0; r <= this.gridRows; r++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, r * cs);
            this.ctx.lineTo(w, r * cs);
            this.ctx.stroke();
        }
        this.ctx.restore();

        // Draw Glacial Hazards
        for (const hz of this.hazards) {
            const px = hz.x * cs;
            const py = hz.y * cs;
            this.ctx.save();
            if (!hz.active) {
                // Warning phase
                this.ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
                this.ctx.fillRect(px, py, cs, cs);
                this.ctx.strokeStyle = '#00F0FF';
                this.ctx.lineWidth = 1.5;
                this.ctx.strokeRect(px + 2, py + 2, cs - 4, cs - 4);
            } else {
                // Active Spikes
                this.ctx.fillStyle = 'rgba(255, 85, 85, 0.35)';
                this.ctx.fillRect(px, py, cs, cs);

                this.ctx.beginPath();
                this.ctx.moveTo(px + cs / 2, py + 2);
                this.ctx.lineTo(px + cs - 3, py + cs - 3);
                this.ctx.lineTo(px + 3, py + cs - 3);
                this.ctx.closePath();
                this.ctx.fillStyle = '#FF5555';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = '#FF5555';
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        // Draw Runes
        for (const rune of this.runes) {
            const p = this.gridToPixel(rune.x, rune.y);
            this.ctx.save();
            this.ctx.shadowBlur = 12;

            let mainColor = '#00F0FF';
            let symbol = 'ᛋ';

            if (rune.type === 'sowilo') { mainColor = '#FBBF24'; symbol = '⚡'; }
            else if (rune.type === 'isa') { mainColor = '#38BDF8'; symbol = '❄️'; }
            else if (rune.type === 'kenaz') { mainColor = '#FF5555'; symbol = '🔥'; }
            else if (rune.type === 'ansuz') { mainColor = '#F472B6'; symbol = '🌟'; }

            this.ctx.shadowColor = mainColor;

            // Halo Ring
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, cs * 0.4, 0, Math.PI * 2);
            this.ctx.fillStyle = mainColor + '33';
            this.ctx.fill();
            this.ctx.strokeStyle = mainColor;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Symbol
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = `${cs * 0.55}px Orbitron, sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(symbol, p.x, p.y);

            this.ctx.restore();
        }

        // Draw Snake
        this.ctx.save();
        for (let i = this.snake.length - 1; i >= 0; i--) {
            const seg = this.snake[i];
            const p = this.gridToPixel(seg.x, seg.y);
            const isHead = i === 0;

            this.ctx.beginPath();

            let color = '#00F0FF';
            if (this.invincibleTimer > 0) {
                const hue = (performance.now() * 0.5 + i * 20) % 360;
                color = `hsl(${hue}, 100%, 65%)`;
            } else if (this.flameTimer > 0) {
                color = '#FF5555';
            } else if (this.freezeTimer > 0) {
                color = '#38BDF8';
            } else if (this.speedTimer > 0) {
                color = '#FBBF24';
            }

            this.ctx.shadowBlur = isHead ? 20 : 10;
            this.ctx.shadowColor = color;

            if (isHead) {
                this.ctx.arc(p.x, p.y, cs * 0.45, 0, Math.PI * 2);
                this.ctx.fillStyle = color;
                this.ctx.fill();

                // Eyes
                this.ctx.fillStyle = '#070D18';
                this.ctx.beginPath();
                this.ctx.arc(p.x + this.dir.x * 4 - this.dir.y * 3, p.y + this.dir.y * 4 + this.dir.x * 3, 2.5, 0, Math.PI * 2);
                this.ctx.arc(p.x + this.dir.x * 4 + this.dir.y * 3, p.y + this.dir.y * 4 - this.dir.x * 3, 2.5, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                const radius = (cs * 0.4) * (1 - (i / (this.snake.length * 1.8)));
                this.ctx.arc(p.x, p.y, Math.max(radius, 3), 0, Math.PI * 2);
                this.ctx.fillStyle = color;
                this.ctx.globalAlpha = 0.85;
                this.ctx.fill();
            }
        }
        this.ctx.restore();

        // Draw Particles & Shockwaves
        this.particles.draw(this.ctx);
    }
}

// Instantiate and attach to window
window.addEventListener('DOMContentLoaded', () => {
    window.game = new NordicAuroraGame();
});
