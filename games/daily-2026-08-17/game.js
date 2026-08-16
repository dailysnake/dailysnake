/* ==========================================================================
   DAILY SNAKE (2026-08-17) - 奇幻荧菌：菌丝网络与孢子狂潮
   Bioluminescent Fantasy & Mycelium Network Game Engine
   ========================================================================== */

(function () {
    'use strict';

    // --- Configuration & Constants ---
    const GRID_COLS = 30;
    const GRID_ROWS = 20;
    const CANVAS_WIDTH = 900;
    const CANVAS_HEIGHT = 600;

    const DIRECTION = {
        UP: { x: 0, y: -1 },
        DOWN: { x: 0, y: 1 },
        LEFT: { x: -1, y: 0 },
        RIGHT: { x: 1, y: 0 }
    };

    const SPORE_TYPES = {
        CYAN: { name: '碧蓝星孢', score: 10, energy: 5, color: '#00f5d4', glow: 'rgba(0, 245, 212, 0.8)' },
        AMETHYST: { name: '紫晶孢子簇', score: 30, energy: 10, color: '#9d4edd', glow: 'rgba(157, 78, 221, 0.8)' },
        GOLDEN: { name: '金辉太阳孢', score: 60, energy: 20, color: '#ffb703', glow: 'rgba(255, 183, 3, 0.9)' },
        TOXIC: { name: '紫黑毒菌', score: 0, energy: 0, color: '#ff2a6d', glow: 'rgba(255, 42, 109, 0.9)' }
    };

    // --- Web Audio Synthesizer Class ---
    class WebAudioSynth {
        constructor() {
            this.ctx = null;
            this.muted = false;
            this.loadMuteState();
        }

        init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        loadMuteState() {
            const saved = localStorage.getItem('dailysnake_audio_muted');
            this.muted = saved === 'true';
            this.updateIcons();
        }

        toggleMute() {
            this.muted = !this.muted;
            localStorage.setItem('dailysnake_audio_muted', this.muted);
            this.updateIcons();
            if (!this.muted) this.playTone(600, 'sine', 0.05, 0.1);
        }

        updateIcons() {
            const onIcon = document.getElementById('audio-on-icon');
            const offIcon = document.getElementById('audio-off-icon');
            if (onIcon && offIcon) {
                if (this.muted) {
                    onIcon.classList.add('hidden');
                    offIcon.classList.remove('hidden');
                } else {
                    onIcon.classList.remove('hidden');
                    offIcon.classList.add('hidden');
                }
            }
        }

        playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.1) {
            if (this.muted || !this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {
                // Audio context error fallback
            }
        }

        playEatCyan() {
            if (this.muted || !this.ctx) return;
            this.playTone(523.25, 'triangle', 0.08, 0.12); // C5
            setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.1), 50); // E5
        }

        playEatAmethyst() {
            if (this.muted || !this.ctx) return;
            const now = this.ctx.currentTime;
            this.playTone(587.33, 'sine', 0.1, 0.15); // D5
            setTimeout(() => this.playTone(739.99, 'triangle', 0.1, 0.12), 40); // F#5
            setTimeout(() => this.playTone(880.00, 'sine', 0.12, 0.15), 80); // A5
        }

        playEatGolden() {
            if (this.muted || !this.ctx) return;
            const freqs = [523.25, 659.25, 783.99, 1046.50];
            freqs.forEach((f, idx) => {
                setTimeout(() => this.playTone(f, 'triangle', 0.12, 0.15), idx * 40);
            });
        }

        playLoopPurify() {
            if (this.muted || !this.ctx) return;
            const notes = [440, 554.37, 659.25, 830.61, 1108.73];
            notes.forEach((n, idx) => {
                setTimeout(() => this.playTone(n, 'sine', 0.2, 0.15), idx * 50);
            });
        }

        playSkillActive() {
            if (this.muted || !this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(now + 0.5);
            } catch (e) {}
        }

        playGameOver() {
            if (this.muted || !this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.4);

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.4);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(now + 0.4);
            } catch (e) {}
        }
    }

    // --- Main Game Engine Class ---
    class SporeSnakeGame {
        constructor() {
            this.canvas = document.getElementById('game-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.synth = new WebAudioSynth();

            // Sizing & DPI
            this.cellWidth = CANVAS_WIDTH / GRID_COLS;
            this.cellHeight = CANVAS_HEIGHT / GRID_ROWS;

            // UI Elements
            this.scoreDisplay = document.getElementById('score-display');
            this.comboDisplay = document.getElementById('combo-display');
            this.highscoreDisplay = document.getElementById('highscore-display');
            this.energyBarFill = document.getElementById('energy-bar-fill');
            this.skillStatusText = document.getElementById('skill-status-text');
            this.overlayEffect = document.getElementById('canvas-overlay-effect');
            this.touchSkillBtn = document.getElementById('btn-touch-skill');

            // Overlays
            this.startOverlay = document.getElementById('start-overlay');
            this.pauseOverlay = document.getElementById('pause-overlay');
            this.gameoverOverlay = document.getElementById('gameover-overlay');
            this.newRecordBanner = document.getElementById('new-record-banner');

            // Final Stat Displays
            this.finalScoreDisplay = document.getElementById('final-score');
            this.finalComboDisplay = document.getElementById('final-combo');
            this.finalPurifiedDisplay = document.getElementById('final-purified');

            // Game State
            this.state = 'START'; // START, PLAYING, PAUSED, GAMEOVER
            this.score = 0;
            this.combo = 1;
            this.comboTimer = null;
            this.highscore = parseInt(localStorage.getItem('dailysnake_spore_highscore') || '0', 10);
            this.energy = 0; // 0 to 100
            this.purifiedCount = 0;

            // Snake State
            this.snake = [];
            this.direction = DIRECTION.RIGHT;
            this.nextDirection = DIRECTION.RIGHT;
            this.isInvincible = false;
            this.skillActive = false;
            this.skillTimer = 0;

            // Items & Effects
            this.spores = [];
            this.toxicToadstools = [];
            this.particles = [];
            this.ambientParticles = [];
            this.purificationRings = [];

            // Loop / Timing Variables
            this.lastStepTime = 0;
            this.stepInterval = 100; // Base ms per grid move

            // Bind Event Listeners
            this.initEventListeners();
            this.initAmbientBackground();
            this.updateHighscoreUI();

            // Start animation loop for ambient rendering
            requestAnimationFrame((t) => this.gameLoop(t));
        }

        initEventListeners() {
            // Keyboard Controls
            window.addEventListener('keydown', (e) => {
                this.synth.init();

                if (e.key === 'p' || e.key === 'P') {
                    this.togglePause();
                    return;
                }
                if (e.key === 'm' || e.key === 'M') {
                    this.synth.toggleMute();
                    return;
                }

                if (this.state !== 'PLAYING') return;

                switch (e.key) {
                    case 'ArrowUp': case 'w': case 'W':
                        if (this.direction !== DIRECTION.DOWN) this.nextDirection = DIRECTION.UP;
                        break;
                    case 'ArrowDown': case 's': case 'S':
                        if (this.direction !== DIRECTION.UP) this.nextDirection = DIRECTION.DOWN;
                        break;
                    case 'ArrowLeft': case 'a': case 'A':
                        if (this.direction !== DIRECTION.RIGHT) this.nextDirection = DIRECTION.LEFT;
                        break;
                    case 'ArrowRight': case 'd': case 'D':
                        if (this.direction !== DIRECTION.LEFT) this.nextDirection = DIRECTION.RIGHT;
                        break;
                    case ' ':
                        this.activateSkill();
                        e.preventDefault();
                        break;
                }
            });

            // UI Buttons
            document.getElementById('start-game-btn').addEventListener('click', () => {
                this.synth.init();
                this.startGame();
            });

            document.getElementById('audio-toggle-btn').addEventListener('click', () => {
                this.synth.init();
                this.synth.toggleMute();
            });

            document.getElementById('pause-btn').addEventListener('click', () => {
                this.togglePause();
            });

            document.getElementById('resume-btn').addEventListener('click', () => {
                this.togglePause();
            });

            document.getElementById('restart-pause-btn').addEventListener('click', () => {
                this.startGame();
            });

            document.getElementById('restart-gameover-btn').addEventListener('click', () => {
                this.startGame();
            });

            // Touch Controls
            const bindBtn = (id, dir) => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        this.synth.init();
                        if (this.state === 'PLAYING' && this.direction.x !== -dir.x && this.direction.y !== -dir.y) {
                            this.nextDirection = dir;
                        }
                    });
                    btn.addEventListener('click', () => {
                        this.synth.init();
                        if (this.state === 'PLAYING' && this.direction.x !== -dir.x && this.direction.y !== -dir.y) {
                            this.nextDirection = dir;
                        }
                    });
                }
            };

            bindBtn('btn-up', DIRECTION.UP);
            bindBtn('btn-down', DIRECTION.DOWN);
            bindBtn('btn-left', DIRECTION.LEFT);
            bindBtn('btn-right', DIRECTION.RIGHT);

            if (this.touchSkillBtn) {
                this.touchSkillBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.synth.init();
                    this.activateSkill();
                });
                this.touchSkillBtn.addEventListener('click', () => {
                    this.synth.init();
                    this.activateSkill();
                });
            }

            // Canvas Touch Swipe Support
            let touchStartX = 0;
            let touchStartY = 0;
            this.canvas.addEventListener('touchstart', (e) => {
                this.synth.init();
                if (e.touches.length > 0) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }
            }, { passive: true });

            this.canvas.addEventListener('touchmove', (e) => {
                if (this.state === 'PLAYING') e.preventDefault();
            }, { passive: false });

            this.canvas.addEventListener('touchend', (e) => {
                if (this.state !== 'PLAYING' || !e.changedTouches.length) return;
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;

                if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
                    if (Math.abs(dx) > Math.abs(dy)) {
                        if (dx > 0 && this.direction !== DIRECTION.LEFT) this.nextDirection = DIRECTION.RIGHT;
                        else if (dx < 0 && this.direction !== DIRECTION.RIGHT) this.nextDirection = DIRECTION.LEFT;
                    } else {
                        if (dy > 0 && this.direction !== DIRECTION.UP) this.nextDirection = DIRECTION.DOWN;
                        else if (dy < 0 && this.direction !== DIRECTION.DOWN) this.nextDirection = DIRECTION.UP;
                    }
                }
            });
        }

        initAmbientBackground() {
            this.ambientParticles = [];
            for (let i = 0; i < 40; i++) {
                this.ambientParticles.push({
                    x: Math.random() * CANVAS_WIDTH,
                    y: Math.random() * CANVAS_HEIGHT,
                    radius: Math.random() * 2.5 + 1,
                    color: Math.random() > 0.5 ? 'rgba(0, 245, 212, ' : 'rgba(157, 78, 221, ',
                    alpha: Math.random() * 0.5 + 0.2,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4
                });
            }
        }

        startGame() {
            this.state = 'PLAYING';
            this.score = 0;
            this.combo = 1;
            this.energy = 0;
            this.purifiedCount = 0;
            this.skillActive = false;
            this.isInvincible = false;

            // Reset Snake
            this.direction = DIRECTION.RIGHT;
            this.nextDirection = DIRECTION.RIGHT;
            this.snake = [
                { x: 8, y: 10 },
                { x: 7, y: 10 },
                { x: 6, y: 10 },
                { x: 5, y: 10 }
            ];

            // Reset Items & Effects
            this.spores = [];
            this.toxicToadstools = [];
            this.particles = [];
            this.purificationRings = [];

            // Spawn Initial Spores & Hazards
            for (let i = 0; i < 5; i++) {
                this.spawnSpore();
            }
            this.spawnToxicToadstool();

            // Hide Modals
            this.startOverlay.classList.add('hidden');
            this.pauseOverlay.classList.add('hidden');
            this.gameoverOverlay.classList.add('hidden');

            this.updateUI();
        }

        togglePause() {
            if (this.state === 'PLAYING') {
                this.state = 'PAUSED';
                this.pauseOverlay.classList.remove('hidden');
            } else if (this.state === 'PAUSED') {
                this.state = 'PLAYING';
                this.pauseOverlay.classList.add('hidden');
            }
        }

        gameOver() {
            this.state = 'GAMEOVER';
            this.synth.playGameOver();

            // Check High Score
            const isNewRecord = this.score > this.highscore;
            if (isNewRecord) {
                this.highscore = this.score;
                localStorage.setItem('dailysnake_spore_highscore', this.highscore.toString());
                this.newRecordBanner.classList.remove('hidden');
            } else {
                this.newRecordBanner.classList.add('hidden');
            }

            this.updateHighscoreUI();

            // Update Final Stats Overlay
            this.finalScoreDisplay.textContent = this.score;
            this.finalComboDisplay.textContent = `x${this.combo}`;
            this.finalPurifiedDisplay.textContent = this.purifiedCount;

            this.gameoverOverlay.classList.remove('hidden');
        }

        // --- Spore & Item Spawning ---
        spawnSpore() {
            const emptyCell = this.getRandomEmptyCell();
            if (!emptyCell) return;

            const rand = Math.random();
            let sporeType = SPORE_TYPES.CYAN;
            if (rand > 0.85) sporeType = SPORE_TYPES.GOLDEN;
            else if (rand > 0.6) sporeType = SPORE_TYPES.AMETHYST;

            this.spores.push({
                x: emptyCell.x,
                y: emptyCell.y,
                type: sporeType,
                pulse: Math.random() * Math.PI * 2
            });
        }

        spawnToxicToadstool() {
            if (this.toxicToadstools.length >= 6) return;
            const emptyCell = this.getRandomEmptyCell();
            if (!emptyCell) return;

            this.toxicToadstools.push({
                x: emptyCell.x,
                y: emptyCell.y,
                pulse: 0
            });
        }

        getRandomEmptyCell() {
            const occupied = new Set();
            this.snake.forEach(s => occupied.add(`${s.x},${s.y}`));
            this.spores.forEach(sp => occupied.add(`${sp.x},${sp.y}`));
            this.toxicToadstools.forEach(t => occupied.add(`${t.x},${t.y}`));

            const emptyList = [];
            for (let x = 1; x < GRID_COLS - 1; x++) {
                for (let y = 1; y < GRID_ROWS - 1; y++) {
                    if (!occupied.has(`${x},${y}`)) {
                        emptyList.push({ x, y });
                    }
                }
            }

            if (emptyList.length === 0) return null;
            return emptyList[Math.floor(Math.random() * emptyList.length)];
        }

        // --- Skill Activation ---
        activateSkill() {
            if (this.energy < 100 || this.skillActive || this.state !== 'PLAYING') return;

            this.energy = 0;
            this.skillActive = true;
            this.isInvincible = true;
            this.skillTimer = 300; // ~5 seconds (at 60fps)

            this.synth.playSkillActive();
            this.overlayEffect.classList.add('skill-active');

            // Spawn radial shockwave from snake head
            const head = this.snake[0];
            this.purificationRings.push({
                x: (head.x + 0.5) * this.cellWidth,
                y: (head.y + 0.5) * this.cellHeight,
                radius: 10,
                maxRadius: Math.max(CANVAS_WIDTH, CANVAS_HEIGHT),
                alpha: 1
            });

            // Shatter all toxic toadstools into golden spores
            this.toxicToadstools.forEach(t => {
                this.spores.push({
                    x: t.x,
                    y: t.y,
                    type: SPORE_TYPES.GOLDEN,
                    pulse: 0
                });
                this.purifiedCount++;
                this.spawnParticles((t.x + 0.5) * this.cellWidth, (t.y + 0.5) * this.cellHeight, SPORE_TYPES.GOLDEN.color, 12);
            });
            this.toxicToadstools = [];

            this.updateUI();
        }

        // --- Loop Enclosure & Purification Check ---
        checkLoopEnclosure() {
            const head = this.snake[0];
            // Check if head collides with any segment in body
            let loopIndex = -1;
            for (let i = 4; i < this.snake.length; i++) {
                if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                    loopIndex = i;
                    break;
                }
            }

            if (loopIndex !== -1) {
                // Polygon vertices formed by snake body from 0 to loopIndex
                const polygon = this.snake.slice(0, loopIndex + 1);

                let purifiedAny = false;
                // Check each toxic toadstool
                for (let i = this.toxicToadstools.length - 1; i >= 0; i--) {
                    const t = this.toxicToadstools[i];
                    if (this.isPointInPolygon(t, polygon)) {
                        purifiedAny = true;
                        this.purifiedCount++;
                        // Convert to Golden Sun Spore
                        this.spores.push({
                            x: t.x,
                            y: t.y,
                            type: SPORE_TYPES.GOLDEN,
                            pulse: 0
                        });
                        this.spawnParticles((t.x + 0.5) * this.cellWidth, (t.y + 0.5) * this.cellHeight, SPORE_TYPES.GOLDEN.color, 15);
                        this.toxicToadstools.splice(i, 1);
                    }
                }

                if (purifiedAny) {
                    this.score += 200 * this.combo;
                    this.energy = Math.min(100, this.energy + 25);
                    this.synth.playLoopPurify();
                    this.purificationRings.push({
                        x: (head.x + 0.5) * this.cellWidth,
                        y: (head.y + 0.5) * this.cellHeight,
                        radius: 5,
                        maxRadius: 200,
                        alpha: 1
                    });
                    this.updateUI();
                }
            }
        }

        isPointInPolygon(point, vs) {
            const x = point.x, y = point.y;
            let inside = false;
            for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
                const xi = vs[i].x, yi = vs[i].y;
                const xj = vs[j].x, yj = vs[j].y;
                const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }

        // --- Game Step Logic ---
        updateStep() {
            this.direction = this.nextDirection;
            const head = this.snake[0];
            const newHead = {
                x: head.x + this.direction.x,
                y: head.y + this.direction.y
            };

            // Wall Collision (Wrap around or Die)
            if (newHead.x < 0 || newHead.x >= GRID_COLS || newHead.y < 0 || newHead.y >= GRID_ROWS) {
                if (this.isInvincible) {
                    newHead.x = (newHead.x + GRID_COLS) % GRID_COLS;
                    newHead.y = (newHead.y + GRID_ROWS) % GRID_ROWS;
                } else {
                    this.gameOver();
                    return;
                }
            }

            // Self Collision
            if (!this.isInvincible) {
                for (let i = 0; i < this.snake.length - 1; i++) {
                    if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
                        this.gameOver();
                        return;
                    }
                }
            }

            // Toxic Toadstool Collision
            for (let i = 0; i < this.toxicToadstools.length; i++) {
                const t = this.toxicToadstools[i];
                if (t.x === newHead.x && t.y === newHead.y) {
                    if (this.isInvincible) {
                        // Destroy toadstool
                        this.purifiedCount++;
                        this.spawnParticles((t.x + 0.5) * this.cellWidth, (t.y + 0.5) * this.cellHeight, SPORE_TYPES.GOLDEN.color, 10);
                        this.toxicToadstools.splice(i, 1);
                        break;
                    } else {
                        this.gameOver();
                        return;
                    }
                }
            }

            // Move Snake
            this.snake.unshift(newHead);

            // Check Spore Eating
            let ate = false;
            for (let i = this.spores.length - 1; i >= 0; i--) {
                const sp = this.spores[i];
                if (sp.x === newHead.x && sp.y === newHead.y) {
                    ate = true;
                    this.handleEatSpore(sp.type, sp.x, sp.y);
                    this.spores.splice(i, 1);
                    break;
                }
            }

            if (!ate) {
                this.snake.pop();
            }

            // Check Mycelium Loop Enclosure
            this.checkLoopEnclosure();

            // Maintain Spore & Toxic Count
            if (this.spores.length < 5) this.spawnSpore();
            if (Math.random() < 0.08 && this.toxicToadstools.length < 5) this.spawnToxicToadstool();
        }

        handleEatSpore(type, gx, gy) {
            // Sound
            if (type === SPORE_TYPES.CYAN) this.synth.playEatCyan();
            else if (type === SPORE_TYPES.AMETHYST) this.synth.playEatAmethyst();
            else if (type === SPORE_TYPES.GOLDEN) this.synth.playEatGolden();

            // Score & Combo
            this.score += type.score * this.combo;
            this.energy = Math.min(100, this.energy + type.energy);

            if (type === SPORE_TYPES.AMETHYST || type === SPORE_TYPES.GOLDEN) {
                this.combo = Math.min(8, this.combo + 1);
                this.resetComboTimer();
            }

            // Spore Vacuum Pulse if Golden
            if (type === SPORE_TYPES.GOLDEN) {
                this.spores.forEach(sp => {
                    this.spawnParticles((sp.x + 0.5) * this.cellWidth, (sp.y + 0.5) * this.cellHeight, type.color, 4);
                });
            }

            // Particles
            this.spawnParticles((gx + 0.5) * this.cellWidth, (gy + 0.5) * this.cellHeight, type.color, 12);

            this.updateUI();
        }

        resetComboTimer() {
            if (this.comboTimer) clearTimeout(this.comboTimer);
            this.comboTimer = setTimeout(() => {
                this.combo = 1;
                this.updateUI();
            }, 5000);
        }

        spawnParticles(cx, cy, color, count) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 3 + 1;
                this.particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: Math.random() * 3 + 1.5,
                    color: color,
                    alpha: 1,
                    decay: Math.random() * 0.03 + 0.02
                });
            }
        }

        // --- Main Game & Animation Loop ---
        gameLoop(timestamp) {
            // Handle Skill Timer & Magnetic Attraction
            if (this.state === 'PLAYING') {
                if (this.skillActive) {
                    this.skillTimer--;
                    const head = this.snake[0];
                    const hx = (head.x + 0.5) * this.cellWidth;
                    const hy = (head.y + 0.5) * this.cellHeight;

                    // Magnetically pull spores toward snake head
                    this.spores.forEach(sp => {
                        const sx = (sp.x + 0.5) * this.cellWidth;
                        const sy = (sp.y + 0.5) * this.cellHeight;
                        const dx = hx - sx;
                        const dy = hy - sy;
                        const dist = Math.hypot(dx, dy);
                        if (dist < 250 && dist > 10) {
                            sp.x += (dx / dist) * 0.2;
                            sp.y += (dy / dist) * 0.2;
                            // Round to grid if very close
                            if (dist < 20) {
                                sp.x = head.x;
                                sp.y = head.y;
                            }
                        }
                    });

                    if (this.skillTimer <= 0) {
                        this.skillActive = false;
                        this.isInvincible = false;
                        this.overlayEffect.classList.remove('skill-active');
                    }
                }

                // Grid Movement Step Timing
                const currentStepInterval = this.skillActive ? 65 : Math.max(70, 110 - Math.floor(this.score / 200) * 3);
                if (timestamp - this.lastStepTime > currentStepInterval) {
                    this.updateStep();
                    this.lastStepTime = timestamp;
                }
            }

            // Render Frame
            this.render();

            requestAnimationFrame((t) => this.gameLoop(t));
        }

        // --- Canvas Rendering ---
        render() {
            // Clear Canvas
            this.ctx.fillStyle = '#040a09';
            this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw Background Ambient Grid & Particles
            this.drawBackground();

            // Draw Purification Shockwave Rings
            this.drawPurificationRings();

            // Draw Items (Spores & Toxic Toadstools)
            this.drawItems();

            // Draw Snake
            this.drawSnake();

            // Draw Particles
            this.drawParticles();
        }

        drawBackground() {
            // Subtle Grid Lines
            this.ctx.strokeStyle = 'rgba(0, 245, 212, 0.03)';
            this.ctx.lineWidth = 1;
            for (let c = 0; c <= GRID_COLS; c++) {
                this.ctx.beginPath();
                this.ctx.moveTo(c * this.cellWidth, 0);
                this.ctx.lineTo(c * this.cellWidth, CANVAS_HEIGHT);
                this.ctx.stroke();
            }
            for (let r = 0; r <= GRID_ROWS; r++) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, r * this.cellHeight);
                this.ctx.lineTo(CANVAS_WIDTH, r * this.cellHeight);
                this.ctx.stroke();
            }

            // Ambient Particles
            this.ambientParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = CANVAS_WIDTH;
                if (p.x > CANVAS_WIDTH) p.x = 0;
                if (p.y < 0) p.y = CANVAS_HEIGHT;
                if (p.y > CANVAS_HEIGHT) p.y = 0;

                this.ctx.fillStyle = `${p.color}${p.alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }

        drawPurificationRings() {
            for (let i = this.purificationRings.length - 1; i >= 0; i--) {
                const ring = this.purificationRings[i];
                ring.radius += 8;
                ring.alpha -= 0.02;

                if (ring.alpha <= 0 || ring.radius >= ring.maxRadius) {
                    this.purificationRings.splice(i, 1);
                    continue;
                }

                this.ctx.strokeStyle = `rgba(255, 183, 3, ${ring.alpha})`;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }

        drawItems() {
            const time = Date.now() * 0.003;

            // Spores
            this.spores.forEach(sp => {
                const cx = (sp.x + 0.5) * this.cellWidth;
                const cy = (sp.y + 0.5) * this.cellHeight;
                const pulseScale = Math.sin(time + sp.pulse) * 2;
                const radius = Math.min(this.cellWidth, this.cellHeight) * 0.32 + pulseScale;

                this.ctx.save();
                this.ctx.shadowColor = sp.type.color;
                this.ctx.shadowBlur = 12;

                this.ctx.fillStyle = sp.type.color;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, Math.max(3, radius), 0, Math.PI * 2);
                this.ctx.fill();

                // Inner Bright Core
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, Math.max(1, radius * 0.4), 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.restore();
            });

            // Toxic Toadstools
            this.toxicToadstools.forEach(t => {
                const cx = (t.x + 0.5) * this.cellWidth;
                const cy = (t.y + 0.5) * this.cellHeight;
                const pulseScale = Math.sin(time * 2) * 1.5;

                this.ctx.save();
                this.ctx.shadowColor = SPORE_TYPES.TOXIC.color;
                this.ctx.shadowBlur = 10;

                // Draw Mushroom Cap
                this.ctx.fillStyle = SPORE_TYPES.TOXIC.color;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy - 2, 11 + pulseScale, Math.PI, Math.PI * 2);
                this.ctx.fill();

                // Mushroom Stem
                this.ctx.fillStyle = '#9d4edd';
                this.ctx.fillRect(cx - 3, cy - 2, 6, 10);

                // Toxic Spots
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(cx - 4, cy - 7, 2, 0, Math.PI * 2);
                this.ctx.arc(cx + 4, cy - 7, 2, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.restore();
            });
        }

        drawSnake() {
            if (this.snake.length === 0) return;

            const isInv = this.isInvincible;
            const primaryColor = isInv ? SPORE_TYPES.GOLDEN.color : SPORE_TYPES.CYAN.color;
            const glowColor = isInv ? SPORE_TYPES.GOLDEN.glow : SPORE_TYPES.CYAN.glow;

            // Draw Connecting Mycelium Vine Line
            this.ctx.save();
            this.ctx.shadowColor = primaryColor;
            this.ctx.shadowBlur = 15;
            this.ctx.strokeStyle = primaryColor;
            this.ctx.lineWidth = Math.min(this.cellWidth, this.cellHeight) * 0.65;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            this.ctx.beginPath();
            this.snake.forEach((seg, i) => {
                const cx = (seg.x + 0.5) * this.cellWidth;
                const cy = (seg.y + 0.5) * this.cellHeight;
                if (i === 0) this.ctx.moveTo(cx, cy);
                else this.ctx.lineTo(cx, cy);
            });
            this.ctx.stroke();

            // Draw Individual Segment Nuclei & Eyes
            this.snake.forEach((seg, i) => {
                const cx = (seg.x + 0.5) * this.cellWidth;
                const cy = (seg.y + 0.5) * this.cellHeight;
                const ratio = (this.snake.length - i) / this.snake.length;
                const radius = (Math.min(this.cellWidth, this.cellHeight) * 0.35) * (0.6 + ratio * 0.4);

                this.ctx.beginPath();
                this.ctx.fillStyle = i === 0 ? '#ffffff' : (isInv ? '#ffb703' : '#9d4edd');
                this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                this.ctx.fill();

                // Snake Head Eyes
                if (i === 0) {
                    this.ctx.fillStyle = '#041210';
                    const eyeOffset = radius * 0.4;
                    let ex1 = cx, ey1 = cy, ex2 = cx, ey2 = cy;

                    if (this.direction === DIRECTION.RIGHT || this.direction === DIRECTION.LEFT) {
                        ey1 = cy - eyeOffset;
                        ey2 = cy + eyeOffset;
                    } else {
                        ex1 = cx - eyeOffset;
                        ex2 = cx + eyeOffset;
                    }

                    this.ctx.beginPath();
                    this.ctx.arc(ex1, ey1, 2.5, 0, Math.PI * 2);
                    this.ctx.arc(ex2, ey2, 2.5, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });

            this.ctx.restore();
        }

        drawParticles() {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= p.decay;

                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }

                this.ctx.save();
                this.ctx.globalAlpha = Math.max(0, p.alpha);
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        }

        // --- UI Updates ---
        updateUI() {
            this.scoreDisplay.textContent = this.score;
            this.comboDisplay.textContent = `x${this.combo}`;

            // Energy Bar
            this.energyBarFill.style.width = `${this.energy}%`;
            const energyCard = document.querySelector('.energy-hud-card');

            if (this.energy >= 100) {
                this.skillStatusText.textContent = '就绪 [Space]';
                if (energyCard) energyCard.classList.add('ready');
                if (this.touchSkillBtn) this.touchSkillBtn.classList.add('ready');
            } else {
                this.skillStatusText.textContent = `${Math.floor(this.energy)}%`;
                if (energyCard) energyCard.classList.remove('ready');
                if (this.touchSkillBtn) this.touchSkillBtn.classList.remove('ready');
            }
        }

        updateHighscoreUI() {
            this.highscoreDisplay.textContent = this.highscore;
        }
    }

    // --- Instantiate Game on Window Load ---
    window.addEventListener('DOMContentLoaded', () => {
        new SporeSnakeGame();
    });
})();
