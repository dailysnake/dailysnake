/**
 * QUANTUM WAVE WEAVER (量子波弦)
 * Daily Snake Game - 2026-07-27
 * Theme: Micro Quantum Realm & Wave-Particle Duality
 */

(function () {
    'use strict';

    // --- Web Audio Synthesizer ---
    class QuantumAudio {
        constructor() {
            this.ctx = null;
            this.muted = false;
            this.masterGain = null;
        }

        init() {
            if (this.ctx) return;
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.3, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
        }

        ensureContext() {
            if (!this.ctx) this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            if (this.masterGain && this.ctx) {
                this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.3, this.ctx.currentTime);
            }
            return this.muted;
        }

        // Sound 1: Eat Quark (FM synth bell)
        playEatQuark() {
            if (this.muted || !this.ctx) return;
            this.ensureContext();
            const now = this.ctx.currentTime;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.12); // C6
            
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now);
            osc.stop(now + 0.15);
        }

        // Sound 2: Eat Wave Packet (Soft chord shimmer)
        playEatPacket() {
            if (this.muted || !this.ctx) return;
            this.ensureContext();
            const now = this.ctx.currentTime;
            const freqs = [440, 554.37, 659.25, 880]; // A major 7th chord
            
            freqs.forEach((f, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now + idx * 0.02);
                
                gain.gain.setValueAtTime(0.15, now + idx * 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                
                osc.start(now + idx * 0.02);
                osc.stop(now + 0.25);
            });
        }

        // Sound 3: Toggle Wave State (Pitch slide & phaser)
        playToggleWave(isWave) {
            if (this.muted || !this.ctx) return;
            this.ensureContext();
            const now = this.ctx.currentTime;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            
            osc.type = 'triangle';
            filter.type = 'bandpass';
            filter.Q.value = 5.0;
            
            if (isWave) {
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
                filter.frequency.setValueAtTime(300, now);
                filter.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
            } else {
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
                filter.frequency.setValueAtTime(2000, now);
                filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);
            }
            
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now);
            osc.stop(now + 0.22);
        }

        // Sound 4: Quantum Entanglement Warp
        playEntanglement() {
            if (this.muted || !this.ctx) return;
            this.ensureContext();
            const now = this.ctx.currentTime;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
            
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            
            if (panner) {
                panner.pan.setValueAtTime(-1, now);
                panner.pan.linearRampToValueAtTime(1, now + 0.3);
                osc.connect(panner);
                panner.connect(gain);
            } else {
                osc.connect(gain);
            }
            
            gain.connect(this.masterGain);
            
            osc.start(now);
            osc.stop(now + 0.35);
        }

        // Sound 5: Quantum Collapse Surge
        playCollapse() {
            if (this.muted || !this.ctx) return;
            this.ensureContext();
            const now = this.ctx.currentTime;
            
            // Bass Sub Boom
            const subOsc = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(120, now);
            subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
            subGain.gain.setValueAtTime(0.6, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            subOsc.connect(subGain);
            subGain.connect(this.masterGain);
            subOsc.start(now);
            subOsc.stop(now + 0.5);
        }

        // Sound 6: Game Over Decoherence
        playGameOver() {
            if (this.muted || !this.ctx) return;
            this.ensureContext();
            const now = this.ctx.currentTime;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
            
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now);
            osc.stop(now + 0.6);
        }
    }

    // --- Main Game Logic ---
    const GRID_COLS = 26;
    const GRID_ROWS = 20;

    class QuantumWeaverGame {
        constructor() {
            this.canvas = document.getElementById('game-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.audio = new QuantumAudio();

            // DOM Elements
            this.scoreValEl = document.getElementById('score-val');
            this.highScoreValEl = document.getElementById('highscore-val');
            this.stateBadgeEl = document.getElementById('state-badge');
            this.stateValEl = document.getElementById('state-val');
            this.energyPctEl = document.getElementById('energy-pct');
            this.energyFillEl = document.getElementById('energy-fill');
            this.statusBannerEl = document.getElementById('status-banner');
            this.statusTextEl = document.getElementById('status-text');

            // Overlays
            this.startOverlay = document.getElementById('start-overlay');
            this.pauseOverlay = document.getElementById('pause-overlay');
            this.gameoverOverlay = document.getElementById('gameover-overlay');
            
            this.finalScoreEl = document.getElementById('final-score');
            this.finalHighScoreEl = document.getElementById('final-highscore');
            this.finalPhaseCountEl = document.getElementById('final-phase-count');

            // State variables
            this.score = 0;
            this.highScore = parseInt(localStorage.getItem('quantum_weaver_highscore') || '0', 10);
            this.highScoreValEl.textContent = this.highScore;

            this.isRunning = false;
            this.isPaused = false;
            this.isGameOver = false;

            this.isWaveState = false; // False = Particle, True = Wave
            this.waveEnergy = 100; // 0-100%
            this.collapseEnergy = 0; // 0-100%
            this.phaseCount = 0; // Number of wave phase traversals

            // Grid & Snake Data
            this.cellWidth = 0;
            this.cellHeight = 0;
            this.snake = [];
            this.dir = { x: 1, y: 0 };
            this.nextDir = { x: 1, y: 0 };

            // Game Entities
            this.quarks = []; // Array of physical quarks {x, y, type, color, pts}
            this.wavePackets = []; // Array of wave energy rings {x, y}
            this.entanglementPair = null; // { a: {x,y}, b: {x,y} }
            this.particles = []; // Visual canvas particles

            // Game Tick Timing
            this.lastTickTime = 0;
            this.tickInterval = 110; // ms per step
            this.animTime = 0;

            // Touch Handling
            this.touchStartX = 0;
            this.touchStartY = 0;

            this.initCanvasSize();
            this.bindEvents();
            this.startRenderLoop();
        }

        initCanvasSize() {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.scale(dpr, dpr);

            this.width = rect.width;
            this.height = rect.height;

            this.cellWidth = this.width / GRID_COLS;
            this.cellHeight = this.height / GRID_ROWS;
        }

        bindEvents() {
            window.addEventListener('resize', () => this.initCanvasSize());

            // Keyboard listeners
            window.addEventListener('keydown', (e) => {
                if (e.repeat) return;
                
                if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                    if (this.dir.y === 0) this.nextDir = { x: 0, y: -1 };
                } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                    if (this.dir.y === 0) this.nextDir = { x: 0, y: 1 };
                } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    if (this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
                } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    if (this.dir.x === 0) this.nextDir = { x: 1, y: 0 };
                } else if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                    e.preventDefault();
                    this.toggleWaveState();
                } else if (e.code === 'KeyE') {
                    this.triggerCollapseBurst();
                } else if (e.code === 'KeyP') {
                    this.togglePause();
                }
            });

            // Touch Swipe listeners on canvas
            this.canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length > 0) {
                    this.touchStartX = e.touches[0].clientX;
                    this.touchStartY = e.touches[0].clientY;
                }
            }, { passive: true });

            this.canvas.addEventListener('touchend', (e) => {
                if (!e.changedTouches.length) return;
                const dx = e.changedTouches[0].clientX - this.touchStartX;
                const dy = e.changedTouches[0].clientY - this.touchStartY;

                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 25) {
                    if (dx > 0 && this.dir.x === 0) this.nextDir = { x: 1, y: 0 };
                    else if (dx < 0 && this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
                } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 25) {
                    if (dy > 0 && this.dir.y === 0) this.nextDir = { x: 0, y: 1 };
                    else if (dy < 0 && this.dir.y === 0) this.nextDir = { x: 0, y: -1 };
                }
            }, { passive: true });

            // Button listeners
            document.getElementById('start-btn').addEventListener('click', () => this.resetAndStart());
            document.getElementById('restart-btn').addEventListener('click', () => this.resetAndStart());
            document.getElementById('restart-pause-btn').addEventListener('click', () => this.resetAndStart());
            document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
            document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());

            // Sound button
            document.getElementById('sound-btn').addEventListener('click', () => {
                const muted = this.audio.toggleMute();
                document.getElementById('sound-icon-on').style.display = muted ? 'none' : 'block';
                document.getElementById('sound-icon-off').style.display = muted ? 'block' : 'none';
            });

            // Mobile Skill Buttons
            document.getElementById('btn-wave-skill').addEventListener('click', () => this.toggleWaveState());
            document.getElementById('btn-collapse-skill').addEventListener('click', () => this.triggerCollapseBurst());

            // Mobile Dpad Buttons
            document.getElementById('btn-up').addEventListener('click', () => { if (this.dir.y === 0) this.nextDir = { x: 0, y: -1 }; });
            document.getElementById('btn-down').addEventListener('click', () => { if (this.dir.y === 0) this.nextDir = { x: 0, y: 1 }; });
            document.getElementById('btn-left').addEventListener('click', () => { if (this.dir.x === 0) this.nextDir = { x: -1, y: 0 }; });
            document.getElementById('btn-right').addEventListener('click', () => { if (this.dir.x === 0) this.nextDir = { x: 1, y: 0 }; });
        }

        resetAndStart() {
            this.audio.ensureContext();
            this.score = 0;
            this.waveEnergy = 100;
            this.collapseEnergy = 0;
            this.phaseCount = 0;
            this.isWaveState = false;
            this.isRunning = true;
            this.isPaused = false;
            this.isGameOver = false;

            this.dir = { x: 1, y: 0 };
            this.nextDir = { x: 1, y: 0 };

            // Initialize Snake at center
            const startX = Math.floor(GRID_COLS / 2);
            const startY = Math.floor(GRID_ROWS / 2);
            this.snake = [
                { x: startX, y: startY },
                { x: startX - 1, y: startY },
                { x: startX - 2, y: startY },
                { x: startX - 3, y: startY }
            ];

            this.particles = [];
            this.spawnQuarks();
            this.spawnWavePackets();
            this.spawnEntanglementPair();

            this.updateUI();
            this.updateStateBadge();

            this.startOverlay.classList.add('hidden');
            this.pauseOverlay.classList.add('hidden');
            this.gameoverOverlay.classList.add('hidden');

            this.showStatusBanner("量子探针初始化！粒子态就绪");
        }

        togglePause() {
            if (!this.isRunning || this.isGameOver) return;
            this.isPaused = !this.isPaused;
            if (this.isPaused) {
                this.pauseOverlay.classList.remove('hidden');
            } else {
                this.pauseOverlay.classList.add('hidden');
            }
        }

        toggleWaveState() {
            if (!this.isRunning || this.isPaused || this.isGameOver) return;

            if (!this.isWaveState && this.waveEnergy < 15) {
                this.showStatusBanner("⚠️ 波动能量缺乏，无法进入波动态！");
                return;
            }

            this.isWaveState = !this.isWaveState;
            this.audio.playToggleWave(this.isWaveState);
            this.updateStateBadge();

            if (this.isWaveState) {
                this.phaseCount++;
                this.showStatusBanner("✨ 相位穿透波动态已激活！可穿透尾部与墙体");
                this.createWavePulseEffect();
            } else {
                this.showStatusBanner("🔮 已塌陷回实体粒子态");
            }
        }

        triggerCollapseBurst() {
            if (!this.isRunning || this.isPaused || this.isGameOver) return;

            if (this.collapseEnergy < 100) {
                this.showStatusBanner("⚡ 坍缩充能未满 100%！");
                return;
            }

            this.collapseEnergy = 0;
            this.score += 100;
            this.audio.playCollapse();
            this.showStatusBanner("💥 波函数坍缩爆发！产生高能量子场！");

            // Convert all screen center area to Higgs bosons & spawn shockwave
            this.createCollapseShockwave();
            this.updateUI();
        }

        updateStateBadge() {
            if (this.isWaveState) {
                this.stateBadgeEl.className = 'state-badge wave-mode';
                this.stateValEl.textContent = 'WAVE 波动态';
            } else {
                this.stateBadgeEl.className = 'state-badge particle-mode';
                this.stateValEl.textContent = 'PARTICLE 粒子态';
            }
        }

        showStatusBanner(msg) {
            this.statusTextEl.textContent = msg;
            this.statusBannerEl.classList.add('active');
            clearTimeout(this._statusTimer);
            this._statusTimer = setTimeout(() => {
                this.statusBannerEl.classList.remove('active');
            }, 2500);
        }

        // Entity Spawning
        spawnQuarks() {
            this.quarks = [];
            const types = [
                { name: 'Up', color: '#00f3ff', pts: 10 },
                { name: 'Down', color: '#ffd700', pts: 20 },
                { name: 'Strange', color: '#ff007f', pts: 30 },
                { name: 'Higgs', color: '#b537ff', pts: 50 }
            ];

            for (let i = 0; i < 3; i++) {
                const pos = this.getRandomEmptyGridPos();
                const typeObj = types[Math.floor(Math.random() * (i === 2 ? 4 : 3))];
                this.quarks.push({ ...pos, ...typeObj });
            }
        }

        spawnWavePackets() {
            this.wavePackets = [];
            for (let i = 0; i < 2; i++) {
                const pos = this.getRandomEmptyGridPos();
                this.wavePackets.push(pos);
            }
        }

        spawnEntanglementPair() {
            const pA = this.getRandomEmptyGridPos();
            const pB = this.getRandomEmptyGridPos();
            this.entanglementPair = { a: pA, b: pB };
        }

        getRandomEmptyGridPos() {
            let pos;
            let attempts = 0;
            do {
                pos = {
                    x: Math.floor(Math.random() * GRID_COLS),
                    y: Math.floor(Math.random() * GRID_ROWS)
                };
                attempts++;
            } while (this.isOccupiedBySnake(pos) && attempts < 200);
            return pos;
        }

        isOccupiedBySnake(pos) {
            return this.snake.some(seg => seg.x === pos.x && seg.y === pos.y);
        }

        // Game Update Tick
        updateGameTick() {
            if (!this.isRunning || this.isPaused || this.isGameOver) return;

            this.dir = { ...this.nextDir };
            let head = {
                x: this.snake[0].x + this.dir.x,
                y: this.snake[0].y + this.dir.y
            };

            // Handle Wave Energy consumption
            if (this.isWaveState) {
                this.waveEnergy = Math.max(0, this.waveEnergy - 2.5);
                if (this.waveEnergy <= 0) {
                    this.isWaveState = false;
                    this.updateStateBadge();
                    this.showStatusBanner("⚠️ 波动能量耗尽，强制降阶回粒子态！");
                }
            }

            // Screen Edge / Quantum Tunneling Handling
            if (head.x < 0 || head.x >= GRID_COLS || head.y < 0 || head.y >= GRID_ROWS) {
                if (this.isWaveState) {
                    // Quantum Tunneling through border
                    head.x = (head.x + GRID_COLS) % GRID_COLS;
                    head.y = (head.y + GRID_ROWS) % GRID_ROWS;
                    this.createSparkleEffect(head.x, head.y, '#b537ff');
                } else {
                    // Particle state collision with border
                    this.handleGameOver();
                    return;
                }
            }

            // Self Collision Check
            if (!this.isWaveState) {
                for (let i = 0; i < this.snake.length; i++) {
                    if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                        this.handleGameOver();
                        return;
                    }
                }
            }

            // Quantum Entanglement Portal Check
            if (this.entanglementPair) {
                if (head.x === this.entanglementPair.a.x && head.y === this.entanglementPair.a.y) {
                    head = { x: this.entanglementPair.b.x, y: this.entanglementPair.b.y };
                    this.audio.playEntanglement();
                    this.showStatusBanner("🌀 触发量子纠缠跃迁！已穿梭至远端节");
                    this.createSparkleEffect(head.x, head.y, '#00f3ff');
                    this.score += 25;
                    this.spawnEntanglementPair();
                } else if (head.x === this.entanglementPair.b.x && head.y === this.entanglementPair.b.y) {
                    head = { x: this.entanglementPair.a.x, y: this.entanglementPair.a.y };
                    this.audio.playEntanglement();
                    this.showStatusBanner("🌀 触发量子纠缠跃迁！已穿梭至远端节点");
                    this.createSparkleEffect(head.x, head.y, '#ff007f');
                    this.score += 25;
                    this.spawnEntanglementPair();
                }
            }

            // Eat Quarks (Only when in Particle state or during Collapse)
            let ate = false;
            for (let i = this.quarks.length - 1; i >= 0; i--) {
                const q = this.quarks[i];
                if (head.x === q.x && head.y === q.y) {
                    this.score += q.pts;
                    this.collapseEnergy = Math.min(100, this.collapseEnergy + (q.pts * 0.8));
                    this.waveEnergy = Math.min(100, this.waveEnergy + 10);
                    this.audio.playEatQuark();
                    this.createSparkleEffect(q.x, q.y, q.color);
                    this.quarks.splice(i, 1);
                    ate = true;
                    break;
                }
            }

            // Eat Wave Packets (Only in Wave state)
            if (this.isWaveState) {
                for (let i = this.wavePackets.length - 1; i >= 0; i--) {
                    const wp = this.wavePackets[i];
                    if (head.x === wp.x && head.y === wp.y) {
                        this.score += 15;
                        this.waveEnergy = Math.min(100, this.waveEnergy + 40);
                        this.audio.playEatPacket();
                        this.createSparkleEffect(wp.x, wp.y, '#f3c2ff');
                        this.wavePackets.splice(i, 1);
                        break;
                    }
                }
            }

            // Move Snake
            this.snake.unshift(head);
            if (!ate) {
                this.snake.pop();
            }

            // Replenish Items
            if (this.quarks.length < 3) this.spawnQuarks();
            if (this.wavePackets.length < 2) this.spawnWavePackets();

            // Check high score & update UI
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('quantum_weaver_highscore', this.highScore);
            }

            this.updateUI();
        }

        handleGameOver() {
            this.isRunning = false;
            this.isGameOver = true;
            this.audio.playGameOver();

            this.finalScoreEl.textContent = this.score;
            this.finalHighScoreEl.textContent = this.highScore;
            this.finalPhaseCountEl.textContent = this.phaseCount;

            this.gameoverOverlay.classList.remove('hidden');
        }

        updateUI() {
            this.scoreValEl.textContent = this.score;
            this.highScoreValEl.textContent = this.highScore;
            
            const pct = Math.floor(this.collapseEnergy);
            this.energyPctEl.textContent = `${pct}%`;
            this.energyFillEl.style.width = `${pct}%`;

            if (pct >= 100) {
                this.energyFillEl.classList.add('ready');
            } else {
                this.energyFillEl.classList.remove('ready');
            }
        }

        // Particle FX
        createSparkleEffect(gx, gy, color) {
            const cx = (gx + 0.5) * this.cellWidth;
            const cy = (gy + 0.5) * this.cellHeight;
            for (let i = 0; i < 16; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 4;
                this.particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: 2 + Math.random() * 3,
                    color: color,
                    life: 1.0,
                    decay: 0.03 + Math.random() * 0.03
                });
            }
        }

        createWavePulseEffect() {
            const head = this.snake[0];
            if (!head) return;
            this.createSparkleEffect(head.x, head.y, '#b537ff');
        }

        createCollapseShockwave() {
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 6;
                this.particles.push({
                    x: this.width / 2,
                    y: this.height / 2,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: 3 + Math.random() * 4,
                    color: i % 2 === 0 ? '#ffd700' : '#ff007f',
                    life: 1.0,
                    decay: 0.02
                });
            }
        }

        // Canvas Rendering Loop
        startRenderLoop() {
            const loop = (timestamp) => {
                this.animTime = timestamp * 0.003;

                if (this.isRunning && !this.isPaused) {
                    if (timestamp - this.lastTickTime > this.tickInterval) {
                        this.updateGameTick();
                        this.lastTickTime = timestamp;
                    }
                }

                this.render();
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }

        render() {
            this.ctx.clearRect(0, 0, this.width, this.height);

            this.drawGridAndProbabilityClouds();
            this.drawEntanglementPortals();
            this.drawQuarks();
            this.drawWavePackets();
            this.drawSnake();
            this.drawParticles();
        }

        drawGridAndProbabilityClouds() {
            // Draw Probability Cloud BG
            const grad = this.ctx.createRadialGradient(
                this.width / 2, this.height / 2, 50,
                this.width / 2, this.height / 2, this.width / 1.2
            );
            grad.addColorStop(0, 'rgba(18, 22, 59, 0.4)');
            grad.addColorStop(0.5, 'rgba(8, 10, 28, 0.6)');
            grad.addColorStop(1, 'rgba(5, 6, 16, 0.9)');
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, this.width, this.height);

            // Draw Micro Grid Lines
            this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.06)';
            this.ctx.lineWidth = 1;

            for (let c = 0; c <= GRID_COLS; c++) {
                const x = c * this.cellWidth;
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.height);
                this.ctx.stroke();
            }

            for (let r = 0; r <= GRID_ROWS; r++) {
                const y = r * this.cellHeight;
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.width, y);
                this.ctx.stroke();
            }
        }

        drawEntanglementPortals() {
            if (!this.entanglementPair) return;
            const { a, b } = this.entanglementPair;

            // Draw Portal A (Cyan)
            this.drawSinglePortal(a.x, a.y, '#00f3ff', 'A');
            // Draw Portal B (Violet)
            this.drawSinglePortal(b.x, b.y, '#b537ff', 'B');

            // Draw Entanglement Link Beam
            const ax = (a.x + 0.5) * this.cellWidth;
            const ay = (a.y + 0.5) * this.cellHeight;
            const bx = (b.x + 0.5) * this.cellWidth;
            const by = (b.y + 0.5) * this.cellHeight;

            this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([4, 4]);
            this.ctx.beginPath();
            this.ctx.moveTo(ax, ay);
            this.ctx.lineTo(bx, by);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        drawSinglePortal(gx, gy, color, label) {
            const cx = (gx + 0.5) * this.cellWidth;
            const cy = (gy + 0.5) * this.cellHeight;
            const radius = Math.min(this.cellWidth, this.cellHeight) * 0.4;

            this.ctx.save();
            this.ctx.translate(cx, cy);
            this.ctx.rotate(this.animTime * (label === 'A' ? 1 : -1));

            // Outer Orbit
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 1.5);
            this.ctx.stroke();

            // Inner Core
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }

        drawQuarks() {
            this.quarks.forEach(q => {
                const cx = (q.x + 0.5) * this.cellWidth;
                const cy = (q.y + 0.5) * this.cellHeight;
                const radius = Math.min(this.cellWidth, this.cellHeight) * 0.35;

                this.ctx.save();
                this.ctx.shadowColor = q.color;
                this.ctx.shadowBlur = 12;

                // Pulsing sphere
                const pulse = 1 + Math.sin(this.animTime * 3 + q.x) * 0.15;
                this.ctx.fillStyle = q.color;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, radius * pulse, 0, Math.PI * 2);
                this.ctx.fill();

                // Orbiting electron
                const orbitR = radius * 1.3;
                const ex = cx + Math.cos(this.animTime * 4) * orbitR;
                const ey = cy + Math.sin(this.animTime * 4) * orbitR;

                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.restore();
            });
        }

        drawWavePackets() {
            this.wavePackets.forEach(wp => {
                const cx = (wp.x + 0.5) * this.cellWidth;
                const cy = (wp.y + 0.5) * this.cellHeight;
                const radius = Math.min(this.cellWidth, this.cellHeight) * 0.38;

                this.ctx.save();
                this.ctx.strokeStyle = '#f3c2ff';
                this.ctx.shadowColor = '#b537ff';
                this.ctx.shadowBlur = 15;
                this.ctx.lineWidth = 2;

                // Concentric expanding wave rings
                for (let i = 1; i <= 2; i++) {
                    const r = (radius * (i * 0.5 + (this.animTime * 2) % 0.5));
                    this.ctx.beginPath();
                    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    this.ctx.stroke();
                }

                this.ctx.restore();
            });
        }

        drawSnake() {
            if (!this.snake.length) return;

            if (this.isWaveState) {
                this.drawSnakeWaveState();
            } else {
                this.drawSnakeParticleState();
            }
        }

        // Render Particle State (Solid glowing quantum nodes)
        drawSnakeParticleState() {
            for (let i = this.snake.length - 1; i >= 0; i--) {
                const seg = this.snake[i];
                const cx = (seg.x + 0.5) * this.cellWidth;
                const cy = (seg.y + 0.5) * this.cellHeight;
                const isHead = (i === 0);
                const radius = Math.min(this.cellWidth, this.cellHeight) * (isHead ? 0.45 : 0.38);

                this.ctx.save();
                if (isHead) {
                    this.ctx.shadowColor = '#00f3ff';
                    this.ctx.shadowBlur = 18;
                    this.ctx.fillStyle = '#00f3ff';
                    this.ctx.beginPath();
                    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    this.ctx.fill();

                    // Eyes
                    this.ctx.fillStyle = '#050714';
                    const eyeOffset = radius * 0.35;
                    this.ctx.beginPath();
                    this.ctx.arc(cx + this.dir.x * eyeOffset - this.dir.y * 3, cy + this.dir.y * eyeOffset - this.dir.x * 3, 2.5, 0, Math.PI * 2);
                    this.ctx.arc(cx + this.dir.x * eyeOffset + this.dir.y * 3, cy + this.dir.y * eyeOffset + this.dir.x * 3, 2.5, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    const ratio = i / this.snake.length;
                    this.ctx.shadowColor = ratio < 0.5 ? '#00f3ff' : '#b537ff';
                    this.ctx.shadowBlur = 10;
                    this.ctx.fillStyle = ratio < 0.5 ? '#00c8ff' : '#9900ff';
                    
                    this.ctx.beginPath();
                    this.ctx.arc(cx, cy, radius * (1 - ratio * 0.3), 0, Math.PI * 2);
                    this.ctx.fill();
                }
                this.ctx.restore();
            }
        }

        // Render Wave State (Oscillating Sine Wave String)
        drawSnakeWaveState() {
            this.ctx.save();
            this.ctx.shadowColor = '#b537ff';
            this.ctx.shadowBlur = 20;
            this.ctx.strokeStyle = '#f3c2ff';
            this.ctx.lineWidth = 4;

            this.ctx.beginPath();
            for (let i = 0; i < this.snake.length; i++) {
                const seg = this.snake[i];
                const cx = (seg.x + 0.5) * this.cellWidth;
                const cy = (seg.y + 0.5) * this.cellHeight;

                // Add sine wave oscillation offset
                const waveOffset = Math.sin(this.animTime * 5 + i * 0.6) * (this.cellWidth * 0.25);
                const ox = cx + (-this.dir.y * waveOffset);
                const oy = cy + (this.dir.x * waveOffset);

                if (i === 0) {
                    this.ctx.moveTo(ox, oy);
                } else {
                    this.ctx.lineTo(ox, oy);
                }
            }
            this.ctx.stroke();

            // Draw glowing head node
            const head = this.snake[0];
            const hcx = (head.x + 0.5) * this.cellWidth;
            const hcy = (head.y + 0.5) * this.cellHeight;

            this.ctx.fillStyle = '#ff007f';
            this.ctx.shadowColor = '#ff007f';
            this.ctx.shadowBlur = 25;
            this.ctx.beginPath();
            this.ctx.arc(hcx, hcy, this.cellWidth * 0.4, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }

        drawParticles() {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;

                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }

                this.ctx.save();
                this.ctx.globalAlpha = p.life;
                this.ctx.fillStyle = p.color;
                this.ctx.shadowColor = p.color;
                this.ctx.shadowBlur = 8;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        }
    }

    // Initialize Game on DOM ready
    window.addEventListener('DOMContentLoaded', () => {
        window.quantumGame = new QuantumWeaverGame();
    });
})();
