/**
 * PRISMATIC OPTICS - GAME ENGINE
 * Theme: Prismatic Refraction & Obsidian Crystal Grid
 * Date: 2026-07-26
 */

(function () {
    'use strict';

    // --- Sound Synthesizer Engine (Web Audio API) ---
    class SoundEngine {
        constructor() {
            this.ctx = null;
            this.enabled = true;
            this.ambientNode = null;
            this.ambientGain = null;
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

        playChime(combo = 1) {
            if (!this.enabled || !this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Pentatonic scale frequencies base
            const scale = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98];
            const noteIndex = Math.min(combo - 1, scale.length - 1);
            const freq = scale[noteIndex];

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.35);
        }

        playRefraction() {
            if (!this.enabled || !this.ctx) return;
            const now = this.ctx.currentTime;
            
            // Dual oscillator sweep for glass prism shimmer effect
            [0, 15].forEach(detune => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.detune.value = detune;
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(1400, now + 0.4);

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.45);
            });
        }

        playNova() {
            if (!this.enabled || !this.ctx) return;
            const now = this.ctx.currentTime;
            
            // Impact low end + high energy blast
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);

            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.6);
        }

        playGameOver() {
            if (!this.enabled || !this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(55, now + 0.7);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.75);
        }
    }

    const sound = new SoundEngine();

    // --- Game Configuration & Constants ---
    const GRID_COLS = 22;
    const GRID_ROWS = 18;
    const TICK_INTERVAL = 110; // ms per move tick

    const PHOTON_TYPES = [
        { type: 'red', color: '#ff3366', glow: 'rgba(255, 51, 102, 0.8)', label: 'Red' },
        { type: 'green', color: '#00ff88', glow: 'rgba(0, 255, 136, 0.8)', label: 'Green' },
        { type: 'blue', color: '#00f3ff', glow: 'rgba(0, 243, 255, 0.8)', label: 'Blue' }
    ];

    // --- State Variables ---
    let canvas, ctx;
    let tileSize = 30;
    let devicePixelRatio = window.devicePixelRatio || 1;

    let gameState = 'START'; // 'START', 'RUNNING', 'PAUSED', 'GAMEOVER'
    let score = 0;
    let highScore = localStorage.getItem('prismatic_snake_highscore') || 0;
    let comboCount = 1;
    let lastColor = null;
    let energy = 0; // 0 to 100
    let refractionCount = 0;

    let phaseMode = false; // Phase quantum mode (can pass walls & self)
    let phaseTimer = 0;
    let doubleScoreTimer = 0;

    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };

    let photons = [];
    let prisms = [];
    let voidSingularities = [];
    let particles = [];
    let lightWaves = [];

    let gameLoopTimer = null;
    let animFrameReq = null;

    // --- UI Elements ---
    const scoreValEl = document.getElementById('score-val');
    const highscoreValEl = document.getElementById('highscore-val');
    const comboBadgeEl = document.getElementById('combo-badge');
    const comboValEl = document.getElementById('combo-val');
    const energyPctEl = document.getElementById('energy-pct');
    const energyFillEl = document.getElementById('energy-fill');
    const statusBannerEl = document.getElementById('status-banner');
    const statusTextEl = document.getElementById('status-text');

    const startOverlay = document.getElementById('start-overlay');
    const gameoverOverlay = document.getElementById('gameover-overlay');
    const finalScoreEl = document.getElementById('final-score');
    const finalComboEl = document.getElementById('final-combo');
    const finalRefractionsEl = document.getElementById('final-refractions');
    const newHighBadgeEl = document.getElementById('new-high-badge');

    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const soundBtn = document.getElementById('sound-btn');
    const pauseBtn = document.getElementById('pause-btn');

    // Mobile controls
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const mobileSkillBtn = document.getElementById('mobile-skill-btn');

    // --- Initialization ---
    function init() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');

        highscoreValEl.textContent = highScore;
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        bindEvents();
        resetGame();
        render();
    }

    function resizeCanvas() {
        const wrapper = canvas.parentElement;
        const width = wrapper.clientWidth - 16;
        const height = wrapper.clientHeight - 16;

        tileSize = Math.floor(Math.min(width / GRID_COLS, height / GRID_ROWS));
        const cssWidth = tileSize * GRID_COLS;
        const cssHeight = tileSize * GRID_ROWS;

        devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = cssWidth * devicePixelRatio;
        canvas.height = cssHeight * devicePixelRatio;
        canvas.style.width = cssWidth + 'px';
        canvas.style.height = cssHeight + 'px';
        
        ctx.resetTransform();
        ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    function resetGame() {
        score = 0;
        comboCount = 1;
        lastColor = null;
        energy = 0;
        refractionCount = 0;
        phaseMode = false;
        phaseTimer = 0;
        doubleScoreTimer = 0;

        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };

        // Initialize snake at center
        const startX = Math.floor(GRID_COLS / 3);
        const startY = Math.floor(GRID_ROWS / 2);
        snake = [
            { x: startX, y: startY, color: '#00f3ff' },
            { x: startX - 1, y: startY, color: '#00f3ff' },
            { x: startX - 2, y: startY, color: '#ff00a0' }
        ];

        photons = [];
        prisms = [];
        voidSingularities = [];
        particles = [];
        lightWaves = [];

        spawnPhoton();
        spawnPhoton();
        spawnPrism();
        spawnVoidSingularity();

        updateUI();
    }

    // --- Spawning Logic ---
    function spawnPhoton() {
        const pos = getRandomEmptyGrid();
        if (!pos) return;
        const typeObj = PHOTON_TYPES[Math.floor(Math.random() * PHOTON_TYPES.length)];
        photons.push({
            x: pos.x,
            y: pos.y,
            ...typeObj,
            pulse: 0
        });
    }

    function spawnPrism() {
        if (prisms.length >= 2) return;
        const pos = getRandomEmptyGrid();
        if (!pos) return;
        prisms.push({
            x: pos.x,
            y: pos.y,
            rot: 0
        });
    }

    function spawnVoidSingularity() {
        if (voidSingularities.length >= 3) return;
        const pos = getRandomEmptyGrid();
        if (!pos) return;
        voidSingularities.push({
            x: pos.x,
            y: pos.y,
            pulse: 0
        });
    }

    function getRandomEmptyGrid() {
        let attempts = 0;
        while (attempts < 100) {
            const x = Math.floor(Math.random() * GRID_COLS);
            const y = Math.floor(Math.random() * GRID_ROWS);

            const inSnake = snake.some(seg => seg.x === x && seg.y === y);
            const inPhoton = photons.some(p => p.x === x && p.y === y);
            const inPrism = prisms.some(p => p.x === x && p.y === y);
            const inVoid = voidSingularities.some(v => v.x === x && v.y === y);

            if (!inSnake && !inPhoton && !inPrism && !inVoid) {
                return { x, y };
            }
            attempts++;
        }
        return null;
    }

    // --- Game Logic Updates ---
    function startGame() {
        sound.init();
        resetGame();
        gameState = 'RUNNING';
        startOverlay.style.display = 'none';
        gameoverOverlay.style.display = 'none';

        if (gameLoopTimer) clearInterval(gameLoopTimer);
        gameLoopTimer = setInterval(tick, TICK_INTERVAL);

        if (!animFrameReq) {
            animFrameReq = requestAnimationFrame(renderLoop);
        }
    }

    function pauseGame() {
        if (gameState === 'RUNNING') {
            gameState = 'PAUSED';
            clearInterval(gameLoopTimer);
            showStatusBanner('游戏已暂停');
        } else if (gameState === 'PAUSED') {
            gameState = 'RUNNING';
            gameLoopTimer = setInterval(tick, TICK_INTERVAL);
            hideStatusBanner();
        }
    }

    function gameOver() {
        gameState = 'GAMEOVER';
        clearInterval(gameLoopTimer);
        sound.playGameOver();

        const isNewHigh = score > highScore;
        if (isNewHigh) {
            highScore = score;
            localStorage.setItem('prismatic_snake_highscore', highScore);
            highscoreValEl.textContent = highScore;
            newHighBadgeEl.style.display = 'block';
        } else {
            newHighBadgeEl.style.display = 'none';
        }

        finalScoreEl.textContent = score;
        finalComboEl.textContent = `x${comboCount}`;
        finalRefractionsEl.textContent = refractionCount;

        setTimeout(() => {
            gameoverOverlay.style.display = 'flex';
        }, 500);
    }

    function triggerSkill() {
        if (energy < 100 || gameState !== 'RUNNING') return;
        
        energy = 0;
        sound.playNova();
        doubleScoreTimer = 50; // 50 ticks = ~5.5s

        // Create massive light wave blast
        lightWaves.push({
            x: (snake[0].x + 0.5) * tileSize,
            y: (snake[0].y + 0.5) * tileSize,
            radius: 10,
            maxRadius: Math.max(canvas.width, canvas.height),
            color: '#ffd700'
        });

        // Destroy all void singularities
        voidSingularities.forEach(v => {
            createParticleBurst((v.x + 0.5) * tileSize, (v.y + 0.5) * tileSize, '#9d4edd', 16);
        });
        voidSingularities = [];
        setTimeout(spawnVoidSingularity, 3000);

        showStatusBanner('✨ 超光速色脉冲发动！全屏暗晶清空 + 双倍积分！');
        updateUI();
    }

    function tick() {
        if (gameState !== 'RUNNING') return;

        // Apply next direction
        dir = { ...nextDir };
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Handle Timers
        if (phaseTimer > 0) {
            phaseTimer--;
            if (phaseTimer === 0) {
                phaseMode = false;
                hideStatusBanner();
            }
        }

        if (doubleScoreTimer > 0) {
            doubleScoreTimer--;
        }

        // Wall Collision Handling
        if (head.x < 0 || head.x >= GRID_COLS || head.y < 0 || head.y >= GRID_ROWS) {
            if (phaseMode) {
                // Quantum Wrap Around
                if (head.x < 0) head.x = GRID_COLS - 1;
                else if (head.x >= GRID_COLS) head.x = 0;
                if (head.y < 0) head.y = GRID_ROWS - 1;
                else if (head.y >= GRID_ROWS) head.y = 0;
            } else {
                gameOver();
                return;
            }
        }

        // Self Collision Handling
        if (!phaseMode) {
            for (let i = 0; i < snake.length - 1; i++) {
                if (snake[i].x === head.x && snake[i].y === head.y) {
                    gameOver();
                    return;
                }
            }
        }

        // Void Singularity Collision
        const voidIdx = voidSingularities.findIndex(v => v.x === head.x && v.y === head.y);
        if (voidIdx !== -1) {
            if (phaseMode) {
                // Destroy void singularity in phase mode
                createParticleBurst((head.x + 0.5) * tileSize, (head.y + 0.5) * tileSize, '#9d4edd', 12);
                voidSingularities.splice(voidIdx, 1);
                setTimeout(spawnVoidSingularity, 2000);
            } else {
                gameOver();
                return;
            }
        }

        // Check Photon Collision
        let atePhoton = false;
        const photonIdx = photons.findIndex(p => p.x === head.x && p.y === head.y);

        if (photonIdx !== -1) {
            const p = photons[photonIdx];
            atePhoton = true;
            photons.splice(photonIdx, 1);

            // Combo logic
            if (lastColor === p.type) {
                comboCount = Math.min(comboCount + 1, 5);
                triggerComboEffect();
            } else {
                comboCount = 1;
                lastColor = p.type;
            }

            const basePts = 10;
            const multiplier = (doubleScoreTimer > 0 ? 2 : 1) * comboCount;
            score += basePts * multiplier;

            // Energy Bar Fill
            energy = Math.min(100, energy + 15);

            sound.playChime(comboCount);
            createParticleBurst((head.x + 0.5) * tileSize, (head.y + 0.5) * tileSize, p.color, 12);
            spawnPhoton();

            head.color = p.color;
        } else {
            head.color = snake[0].color;
        }

        // Check Prism Collision (Refraction)
        const prismIdx = prisms.findIndex(pr => pr.x === head.x && pr.y === head.y);
        if (prismIdx !== -1) {
            const pr = prisms[prismIdx];
            prisms.splice(prismIdx, 1);
            refractionCount++;

            // Trigger Phase Quantum Mode
            phaseMode = true;
            phaseTimer = 30; // 30 ticks = ~3.3s

            sound.playRefraction();
            createParticleBurst((head.x + 0.5) * tileSize, (head.y + 0.5) * tileSize, '#00f3ff', 20);
            
            // Light Wave Wavefront
            lightWaves.push({
                x: (head.x + 0.5) * tileSize,
                y: (head.y + 0.5) * tileSize,
                radius: 5,
                maxRadius: 180,
                color: '#00f3ff'
            });

            showStatusBanner('🌀 折射晶核穿透！虚幻跃迁已激活（穿墙+穿尾）');
            setTimeout(spawnPrism, 4000);
        }

        // Move Snake
        snake.unshift(head);
        if (!atePhoton) {
            snake.pop();
        }

        updateUI();
    }

    function triggerComboEffect() {
        comboBadgeEl.classList.add('pop');
        setTimeout(() => comboBadgeEl.classList.remove('pop'), 200);
    }

    function showStatusBanner(text) {
        statusTextEl.textContent = text;
        statusBannerEl.classList.add('show');
    }

    function hideStatusBanner() {
        statusBannerEl.classList.remove('show');
    }

    function updateUI() {
        scoreValEl.textContent = score;
        comboValEl.textContent = `x${comboCount}`;
        energyPctEl.textContent = `${energy}%`;
        energyFillEl.style.width = `${energy}%`;

        if (energy >= 100) {
            energyFillEl.classList.add('full');
        } else {
            energyFillEl.classList.remove('full');
        }
    }

    // --- Particle & FX Engine ---
    function createParticleBurst(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: Math.random() * 4 + 2,
                life: 1.0,
                decay: Math.random() * 0.04 + 0.02
            });
        }
    }

    // --- Rendering ---
    function renderLoop() {
        render();
        animFrameReq = requestAnimationFrame(renderLoop);
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);

        drawGrid();
        drawPrisms();
        drawVoidSingularities();
        drawPhotons();
        drawSnake();
        drawParticles();
        drawLightWaves();
    }

    function drawGrid() {
        const w = GRID_COLS * tileSize;
        const h = GRID_ROWS * tileSize;

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
        ctx.lineWidth = 1;

        for (let c = 0; c <= GRID_COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * tileSize, 0);
            ctx.lineTo(c * tileSize, h);
            ctx.stroke();
        }
        for (let r = 0; r <= GRID_ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * tileSize);
            ctx.lineTo(w, r * tileSize);
            ctx.stroke();
        }
    }

    function drawPhotons() {
        const time = Date.now() * 0.003;
        photons.forEach(p => {
            const cx = (p.x + 0.5) * tileSize;
            const cy = (p.y + 0.5) * tileSize;
            const radius = tileSize * 0.35 + Math.sin(time + p.x) * 2;

            ctx.save();
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;

            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner Core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    }

    function drawPrisms() {
        const time = Date.now() * 0.002;
        prisms.forEach(pr => {
            const cx = (pr.x + 0.5) * tileSize;
            const cy = (pr.y + 0.5) * tileSize;
            const size = tileSize * 0.7;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(time);

            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 15;

            // Prism Triangle Glass
            ctx.beginPath();
            ctx.moveTo(0, -size / 2);
            ctx.lineTo(size / 2, size / 2);
            ctx.lineTo(-size / 2, size / 2);
            ctx.closePath();

            const gradient = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
            gradient.addColorStop(0, 'rgba(0, 243, 255, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 0, 160, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0.8)');

            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.restore();
        });
    }

    function drawVoidSingularities() {
        const time = Date.now() * 0.004;
        voidSingularities.forEach(v => {
            const cx = (v.x + 0.5) * tileSize;
            const cy = (v.y + 0.5) * tileSize;
            const r = tileSize * 0.38;

            ctx.save();
            ctx.shadowColor = '#9d4edd';
            ctx.shadowBlur = 12;

            ctx.fillStyle = '#110726';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // Swirling outer ring
            ctx.strokeStyle = '#9d4edd';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(cx, cy, r + Math.sin(time) * 2, time, time + Math.PI * 1.5);
            ctx.stroke();

            ctx.restore();
        });
    }

    function drawSnake() {
        if (snake.length === 0) return;

        ctx.save();

        // Draw body segments with chromatic rainbow gradient if phase mode
        snake.forEach((seg, index) => {
            const cx = (seg.x + 0.5) * tileSize;
            const cy = (seg.y + 0.5) * tileSize;
            const radius = (tileSize * 0.4) * (1 - (index / snake.length) * 0.3);

            ctx.shadowBlur = phaseMode ? 20 : 10;
            ctx.shadowColor = phaseMode ? '#00f3ff' : (seg.color || '#00f3ff');

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);

            if (phaseMode) {
                const hue = (Date.now() * 0.2 + index * 15) % 360;
                ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
            } else {
                ctx.fillStyle = seg.color || '#00f3ff';
            }
            ctx.fill();

            // Head distinct features
            if (index === 0) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.restore();
    }

    function drawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawLightWaves() {
        for (let i = lightWaves.length - 1; i >= 0; i--) {
            const wave = lightWaves[i];
            wave.radius += 8;

            if (wave.radius >= wave.maxRadius) {
                lightWaves.splice(i, 1);
                continue;
            }

            const alpha = 1 - (wave.radius / wave.maxRadius);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = wave.color;
            ctx.lineWidth = 3;
            ctx.shadowColor = wave.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // --- Input Handling ---
    function bindEvents() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }

            if (gameState === 'RUNNING') {
                switch (e.key) {
                    case 'ArrowUp':
                    case 'w':
                    case 'W':
                        if (dir.y === 0) nextDir = { x: 0, y: -1 };
                        break;
                    case 'ArrowDown':
                    case 's':
                    case 'S':
                        if (dir.y === 0) nextDir = { x: 0, y: 1 };
                        break;
                    case 'ArrowLeft':
                    case 'a':
                    case 'A':
                        if (dir.x === 0) nextDir = { x: -1, y: 0 };
                        break;
                    case 'ArrowRight':
                    case 'd':
                    case 'D':
                        if (dir.x === 0) nextDir = { x: 1, y: 0 };
                        break;
                    case ' ':
                        triggerSkill();
                        break;
                    case 'p':
                    case 'P':
                        pauseGame();
                        break;
                }
            }
        });

        // Mobile D-Pad Buttons
        btnUp.addEventListener('click', () => { if (dir.y === 0) nextDir = { x: 0, y: -1 }; });
        btnDown.addEventListener('click', () => { if (dir.y === 0) nextDir = { x: 0, y: 1 }; });
        btnLeft.addEventListener('click', () => { if (dir.x === 0) nextDir = { x: -1, y: 0 }; });
        btnRight.addEventListener('click', () => { if (dir.x === 0) nextDir = { x: 1, y: 0 }; });
        mobileSkillBtn.addEventListener('click', triggerSkill);

        // Touch Swipe Handling on Canvas
        let touchStartX = 0;
        let touchStartY = 0;

        canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }, { passive: true });

        canvas.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;

            if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > 0 && dir.x === 0) nextDir = { x: 1, y: 0 };
                    else if (dx < 0 && dir.x === 0) nextDir = { x: -1, y: 0 };
                } else {
                    if (dy > 0 && dir.y === 0) nextDir = { x: 0, y: 1 };
                    else if (dy < 0 && dir.y === 0) nextDir = { x: 0, y: -1 };
                }
            }
        }, { passive: true });

        // UI Buttons
        startBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', startGame);
        pauseBtn.addEventListener('click', pauseGame);

        soundBtn.addEventListener('click', () => {
            sound.enabled = !sound.enabled;
            document.getElementById('sound-icon-on').style.display = sound.enabled ? 'block' : 'none';
            document.getElementById('sound-icon-off').style.display = sound.enabled ? 'none' : 'block';
        });
    }

    // Start App when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
