/**
 * 晶圆微轨：电路脉冲与逻辑超频 (Silicon Microchip & Logic Overclock Snake)
 * Daily Snake - 2026-09-23
 */

(function () {
    'use strict';

    // Game Configuration & Constants
    const GRID_COLS = 28;
    const GRID_ROWS = 20;
    const BASE_SPEED_MS = 140; // Initial speed tick interval
    const MIN_SPEED_MS = 60;   // Maximum speed cap

    // Color Palette
    const COLORS = {
        bg: '#070d14',
        pcbTrace: 'rgba(27, 47, 72, 0.4)',
        cyan: '#00f3ff',
        green: '#39ff14',
        gold: '#ffbd2e',
        pink: '#ff2a6d',
        purple: '#9d4edd',
        white: '#ffffff',
        glitch: '#ff0055'
    };

    // Web Audio Synthesizer Instance
    class WebAudioSynth {
        constructor() {
            this.ctx = null;
            this.muted = false;
        }

        init() {
            if (!this.ctx) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) {
                    this.ctx = new AudioContextClass();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            return this.muted;
        }

        playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15, rampEndFreq = null) {
            if (this.muted) return;
            this.init();
            if (!this.ctx) return;

            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                if (rampEndFreq) {
                    osc.frequency.exponentialRampToValueAtTime(Math.max(10, rampEndFreq), this.ctx.currentTime + duration);
                }

                gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {
                // Audio safety fallback
            }
        }

        playEatBitSound() {
            // High-pitched synth chirp
            this.playTone(587.33, 'square', 0.08, 0.12, 1174.66);
        }

        playEatPwrSound() {
            // Dual arpeggio flourish
            this.playTone(440, 'triangle', 0.12, 0.15, 880);
            setTimeout(() => this.playTone(659.25, 'triangle', 0.15, 0.15, 1318.5), 60);
        }

        playGatePassSound() {
            // Sweep phaser sound
            this.playTone(300, 'sawtooth', 0.25, 0.1, 1200);
        }

        playLoopResonanceSound() {
            // Shimmering chime
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                setTimeout(() => this.playTone(freq, 'sine', 0.2, 0.08), i * 50);
            });
        }

        playEmpSound() {
            if (this.muted) return;
            this.init();
            if (!this.ctx) return;

            try {
                // Deep bass explosion + noise sweep
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);

                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.6);
            } catch (e) {}
        }

        playCrashSound() {
            this.playTone(220, 'sawtooth', 0.4, 0.25, 40);
        }
    }

    const synth = new WebAudioSynth();

    // Main Game State Variables
    let canvas, ctx;
    let cellSize = 24;
    let score = 0;
    let highScore = parseInt(localStorage.getItem('daily_snake_chip_highscore') || '0', 10);
    let empCharge = 0; // 0 to 100
    let empCount = 0;
    let loopCount = 0;
    let isGameOver = false;
    let isPaused = false;
    let isEmpActive = false;
    let empTimer = 0;
    let empRadius = 0;

    // Snake State
    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };

    // Active Buff State
    let activeBuff = null; // { type: 'AND'|'OR'|'XOR', expireTime: timestamp }

    // Board Entities
    let items = [];         // Data packets { x, y, val: '1'|'0', color }
    let pwrCrystals = [];   // Overclock crystals { x, y }
    let logicGates = [];    // Logic gates { x, y, type: '&'|'|'|'^' }
    let glitchHazards = []; // Corrupted memory blocks { x, y }
    let particles = [];     // Particle effects

    // Touch Handling State
    let touchStartX = 0;
    let touchStartY = 0;

    // DOM Elements
    let scoreEl, freqEl, stateEl, highScoreEl, empFillEl, empStatusEl, empContainerEl;
    let gameViewportEl, mobileEmpBtn;
    let gameOverModal, pauseModal, helpModal;
    let audioToggleBtn, audioOnIcon, audioOffIcon;

    // Initialize Game Window
    function init() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');

        scoreEl = document.getElementById('score-val');
        freqEl = document.getElementById('freq-val');
        stateEl = document.getElementById('state-val');
        highScoreEl = document.getElementById('high-score-val');
        empFillEl = document.getElementById('emp-fill');
        empStatusEl = document.getElementById('emp-status-text');
        empContainerEl = document.querySelector('.emp-gauge-container');
        gameViewportEl = document.querySelector('.game-viewport');
        mobileEmpBtn = document.getElementById('mobile-emp-btn');

        gameOverModal = document.getElementById('game-over-modal');
        pauseModal = document.getElementById('pause-modal');
        helpModal = document.getElementById('help-modal');

        audioToggleBtn = document.getElementById('audio-toggle-btn');
        audioOnIcon = document.getElementById('audio-on-icon');
        audioOffIcon = document.getElementById('audio-off-icon');

        highScoreEl.textContent = highScore;

        setupEventListeners();
        resizeCanvas();
        resetGame();
        requestAnimationFrame(gameLoop);
    }

    function resizeCanvas() {
        if (!gameViewportEl || !canvas) return;
        const rect = gameViewportEl.getBoundingClientRect();
        const availableW = rect.width - 16;
        const availableH = rect.height - 16;

        cellSize = Math.max(14, Math.floor(Math.min(availableW / GRID_COLS, availableH / GRID_ROWS)));

        const width = cellSize * GRID_COLS;
        const height = cellSize * GRID_ROWS;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        ctx.scale(dpr, dpr);
    }

    function resetGame() {
        score = 0;
        empCharge = 0;
        empCount = 0;
        loopCount = 0;
        isGameOver = false;
        isPaused = false;
        isEmpActive = false;
        empTimer = 0;
        empRadius = 0;
        activeBuff = null;

        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };

        // Initial Snake in middle
        const startX = Math.floor(GRID_COLS / 3);
        const startY = Math.floor(GRID_ROWS / 2);
        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
            { x: startX - 3, y: startY }
        ];

        items = [];
        pwrCrystals = [];
        logicGates = [];
        glitchHazards = [];
        particles = [];

        // Spawn initial items
        spawnItems(4);
        spawnPwrCrystal();
        spawnLogicGate();
        spawnGlitchHazards(2);

        updateHUD();
        gameOverModal.classList.add('hidden');
        pauseModal.classList.add('hidden');
    }

    // Entity Spawners
    function isCellOccupied(x, y) {
        if (snake.some(seg => seg.x === x && seg.y === y)) return true;
        if (items.some(it => it.x === x && it.y === y)) return true;
        if (pwrCrystals.some(c => c.x === x && c.y === y)) return true;
        if (logicGates.some(g => g.x === x && g.y === y)) return true;
        if (glitchHazards.some(h => h.x === x && h.y === y)) return true;
        return false;
    }

    function getRandomEmptyCell() {
        let attempts = 0;
        while (attempts < 200) {
            const x = Math.floor(Math.random() * GRID_COLS);
            const y = Math.floor(Math.random() * GRID_ROWS);
            if (!isCellOccupied(x, y)) {
                return { x, y };
            }
            attempts++;
        }
        return { x: 1, y: 1 };
    }

    function spawnItems(count = 1) {
        for (let i = 0; i < count; i++) {
            const pos = getRandomEmptyCell();
            items.push({
                x: pos.x,
                y: pos.y,
                val: Math.random() > 0.5 ? '1' : '0',
                color: Math.random() > 0.5 ? COLORS.cyan : COLORS.green
            });
        }
    }

    function spawnPwrCrystal() {
        if (pwrCrystals.length < 2) {
            const pos = getRandomEmptyCell();
            pwrCrystals.push({ x: pos.x, y: pos.y });
        }
    }

    function spawnLogicGate() {
        if (logicGates.length < 2) {
            const pos = getRandomEmptyCell();
            const types = ['&', '|', '^'];
            const type = types[Math.floor(Math.random() * types.length)];
            logicGates.push({ x: pos.x, y: pos.y, type });
        }
    }

    function spawnGlitchHazards(count = 1) {
        if (glitchHazards.length < 5) {
            for (let i = 0; i < count; i++) {
                const pos = getRandomEmptyCell();
                glitchHazards.push({ x: pos.x, y: pos.y });
            }
        }
    }

    // Input Handling
    function setupEventListeners() {
        window.addEventListener('resize', resizeCanvas);

        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            synth.init();
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (dir.y !== 1) nextDir = { x: 0, y: -1 };
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (dir.y !== -1) nextDir = { x: 0, y: 1 };
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (dir.x !== 1) nextDir = { x: -1, y: 0 };
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (dir.x !== -1) nextDir = { x: 1, y: 0 };
                    e.preventDefault();
                    break;
                case ' ':
                case 'e':
                case 'E':
                    triggerEMP();
                    e.preventDefault();
                    break;
                case 'p':
                case 'P':
                    togglePause();
                    e.preventDefault();
                    break;
                case 'r':
                case 'R':
                    if (isGameOver) resetGame();
                    e.preventDefault();
                    break;
                case 'm':
                case 'M':
                    toggleAudio();
                    e.preventDefault();
                    break;
            }
        });

        // Touch Swipe Controls
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => {
                synth.init();
                if (e.touches.length > 0) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }
            }, { passive: true });

            canvas.addEventListener('touchend', (e) => {
                if (e.changedTouches.length > 0) {
                    const diffX = e.changedTouches[0].clientX - touchStartX;
                    const diffY = e.changedTouches[0].clientY - touchStartY;
                    if (Math.abs(diffX) > 20 || Math.abs(diffY) > 20) {
                        if (Math.abs(diffX) > Math.abs(diffY)) {
                            if (diffX > 0 && dir.x !== -1) nextDir = { x: 1, y: 0 };
                            else if (diffX < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 };
                        } else {
                            if (diffY > 0 && dir.y !== -1) nextDir = { x: 0, y: 1 };
                            else if (diffY < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 };
                        }
                    }
                }
            }, { passive: true });
        }

        // D-Pad Button Clicks
        document.querySelectorAll('.dpad-btn').forEach(btn => {
            btn.addEventListener('pointerdown', (e) => {
                synth.init();
                const d = btn.getAttribute('data-dir');
                if (d === 'up' && dir.y !== 1) nextDir = { x: 0, y: -1 };
                if (d === 'down' && dir.y !== -1) nextDir = { x: 0, y: 1 };
                if (d === 'left' && dir.x !== 1) nextDir = { x: -1, y: 0 };
                if (d === 'right' && dir.x !== -1) nextDir = { x: 1, y: 0 };
            });
        });

        // Mobile EMP Button
        if (mobileEmpBtn) {
            mobileEmpBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                synth.init();
                triggerEMP();
            });
        }

        // Top Actions & Modals
        if (audioToggleBtn) {
            audioToggleBtn.addEventListener('click', toggleAudio);
        }

        document.getElementById('pause-btn')?.addEventListener('click', togglePause);
        document.getElementById('help-btn')?.addEventListener('click', () => {
            helpModal.classList.remove('hidden');
            isPaused = true;
        });

        document.getElementById('restart-btn')?.addEventListener('click', resetGame);
        document.getElementById('resume-btn')?.addEventListener('click', togglePause);
        document.getElementById('close-help-btn')?.addEventListener('click', () => {
            helpModal.classList.add('hidden');
            isPaused = false;
        });
    }

    function toggleAudio() {
        const isMuted = synth.toggleMute();
        if (isMuted) {
            audioOnIcon.classList.add('hidden');
            audioOffIcon.classList.remove('hidden');
        } else {
            audioOnIcon.classList.remove('hidden');
            audioOffIcon.classList.add('hidden');
        }
    }

    function togglePause() {
        if (isGameOver) return;
        isPaused = !isPaused;
        if (isPaused) {
            pauseModal.classList.remove('hidden');
        } else {
            pauseModal.classList.add('hidden');
        }
    }

    function triggerEMP() {
        if (empCharge >= 100 && !isEmpActive && !isGameOver && !isPaused) {
            empCharge = 0;
            isEmpActive = true;
            empTimer = Date.now() + 4000; // 4s EMP mode
            empRadius = 0;
            empCount++;

            synth.playEmpSound();
            createEmpParticles(snake[0].x, snake[0].y);
            updateHUD();
        }
    }

    // Main Update Loop
    let lastTickTime = 0;

    function gameLoop(timestamp) {
        if (!lastTickTime) lastTickTime = timestamp;

        const currentSpeedMs = Math.max(MIN_SPEED_MS, BASE_SPEED_MS - Math.floor(score / 50) * 5);

        if (!isPaused && !isGameOver) {
            if (timestamp - lastTickTime >= (isEmpActive ? currentSpeedMs * 0.7 : currentSpeedMs)) {
                updateGameLogic();
                lastTickTime = timestamp;
            }
        }

        updateParticles();
        render();

        requestAnimationFrame(gameLoop);
    }

    function updateGameLogic() {
        dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Check Buff Expiration
        if (activeBuff && Date.now() > activeBuff.expireTime) {
            activeBuff = null;
        }

        // Check EMP Expiration
        if (isEmpActive && Date.now() > empTimer) {
            isEmpActive = false;
        }

        // Magnet Effect during EMP or OR Buff
        if (isEmpActive || (activeBuff && activeBuff.type === 'OR')) {
            items.forEach(it => {
                if (Math.abs(it.x - head.x) <= 3 && Math.abs(it.y - head.y) <= 3) {
                    if (it.x < head.x) it.x++;
                    else if (it.x > head.x) it.x--;
                    if (it.y < head.y) it.y++;
                    else if (it.y > head.y) it.y--;
                }
            });
        }

        // Wall Collision
        const isXOR = activeBuff && activeBuff.type === 'XOR';
        if (head.x < 0 || head.x >= GRID_COLS || head.y < 0 || head.y >= GRID_ROWS) {
            if (isEmpActive || isXOR) {
                // Wrap around grid
                head.x = (head.x + GRID_COLS) % GRID_COLS;
                head.y = (head.y + GRID_ROWS) % GRID_ROWS;
            } else {
                gameOver();
                return;
            }
        }

        // Body Collision
        if (snake.some((seg, idx) => idx > 0 && seg.x === head.x && seg.y === head.y)) {
            if (!isEmpActive && !isXOR) {
                gameOver();
                return;
            }
        }

        // Glitch Hazard Collision
        const glitchIdx = glitchHazards.findIndex(h => h.x === head.x && h.y === head.y);
        if (glitchIdx !== -1) {
            if (isEmpActive) {
                // Shatter glitch into bonus points
                glitchHazards.splice(glitchIdx, 1);
                score += 50;
                addParticles(head.x, head.y, COLORS.pink, 12);
                synth.playEatPwrSound();
            } else {
                gameOver();
                return;
            }
        }

        // Move Snake
        snake.unshift(head);
        let ateFood = false;

        // Check Eating Items
        const itemIdx = items.findIndex(it => it.x === head.x && it.y === head.y);
        if (itemIdx !== -1) {
            const item = items[itemIdx];
            items.splice(itemIdx, 1);
            ateFood = true;

            const multiplier = (activeBuff && activeBuff.type === 'AND') ? 2 : 1;
            score += 10 * multiplier;
            empCharge = Math.min(100, empCharge + 8);

            synth.playEatBitSound();
            addParticles(head.x, head.y, item.color, 8);
            spawnItems(1);
        }

        // Check Eating PWR Crystal
        const pwrIdx = pwrCrystals.findIndex(c => c.x === head.x && c.y === head.y);
        if (pwrIdx !== -1) {
            pwrCrystals.splice(pwrIdx, 1);
            ateFood = true;

            score += 30;
            empCharge = Math.min(100, empCharge + 35);

            synth.playEatPwrSound();
            addParticles(head.x, head.y, COLORS.gold, 14);
            setTimeout(spawnPwrCrystal, 5000);
        }

        // Check Logic Gate Pass
        const gateIdx = logicGates.findIndex(g => g.x === head.x && g.y === head.y);
        if (gateIdx !== -1) {
            const gate = logicGates[gateIdx];
            logicGates.splice(gateIdx, 1);

            let buffName = 'AND';
            if (gate.type === '&') buffName = 'AND';
            else if (gate.type === '|') buffName = 'OR';
            else if (gate.type === '^') buffName = 'XOR';

            activeBuff = { type: buffName, expireTime: Date.now() + 8000 };
            score += 25;

            synth.playGatePassSound();
            addParticles(head.x, head.y, COLORS.purple, 16);
            setTimeout(spawnLogicGate, 7000);
        }

        // If not ate food, remove tail
        if (!ateFood) {
            snake.pop();
        }

        // Check Closed Loop Detection (回路闭环检测)
        checkClosedLoop();

        // Random Spawns
        if (Math.random() < 0.04) spawnGlitchHazards(1);

        updateHUD();
    }

    // Polygon Enclosure Algorithm to harvest trapped items
    function checkClosedLoop() {
        if (snake.length < 6) return;

        const head = snake[0];
        // Check if head touches a body segment further down
        const touchIndex = snake.findIndex((seg, idx) => idx >= 4 && seg.x === head.x && seg.y === head.y);

        if (touchIndex !== -1) {
            const polygon = snake.slice(0, touchIndex + 1);

            let harvestedCount = 0;
            items.forEach((it, idx) => {
                if (isPointInPolygon(it, polygon)) {
                    harvestedCount++;
                    score += 40;
                    addParticles(it.x, it.y, COLORS.gold, 10);
                }
            });

            if (harvestedCount > 0) {
                loopCount++;
                empCharge = Math.min(100, empCharge + 25);
                synth.playLoopResonanceSound();
                items = items.filter(it => !isPointInPolygon(it, polygon));
                spawnItems(harvestedCount);
            }
        }
    }

    function isPointInPolygon(point, vs) {
        let x = point.x, y = point.y;
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            let xi = vs[i].x, yi = vs[i].y;
            let xj = vs[j].x, yj = vs[j].y;
            let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function updateHUD() {
        scoreEl.textContent = score;

        const freq = 100 + Math.floor(score / 10) * 5;
        freqEl.textContent = freq + ' MHz';

        if (activeBuff) {
            stateEl.textContent = activeBuff.type;
            stateEl.className = 'hud-value ' + (activeBuff.type === 'AND' ? 'neon-green' : activeBuff.type === 'OR' ? 'neon-cyan' : 'neon-pink');
        } else if (isEmpActive) {
            stateEl.textContent = 'OVERCLOCK';
            stateEl.className = 'hud-value neon-gold';
        } else {
            stateEl.textContent = 'NOR';
            stateEl.className = 'hud-value neon-cyan';
        }

        if (score > highScore) {
            highScore = score;
            highScoreEl.textContent = highScore;
            localStorage.setItem('daily_snake_chip_highscore', highScore.toString());
        }

        empFillEl.style.width = empCharge + '%';
        if (empCharge >= 100) {
            empStatusEl.textContent = 'READY! [SPACE]';
            empContainerEl.classList.add('ready');
            if (mobileEmpBtn) mobileEmpBtn.classList.add('active');
        } else if (isEmpActive) {
            empStatusEl.textContent = 'EMP ACTIVE!';
            empContainerEl.classList.remove('ready');
            if (mobileEmpBtn) mobileEmpBtn.classList.remove('active');
        } else {
            empStatusEl.textContent = `CHARGING ${Math.floor(empCharge)}%`;
            empContainerEl.classList.remove('ready');
            if (mobileEmpBtn) mobileEmpBtn.classList.remove('active');
        }
    }

    function gameOver() {
        isGameOver = true;
        synth.playCrashSound();

        document.getElementById('final-score').textContent = score;
        document.getElementById('final-loops').textContent = loopCount;
        document.getElementById('final-emps').textContent = empCount;

        gameOverModal.classList.remove('hidden');
    }

    // Particle Effects
    function addParticles(gx, gy, color, count = 8) {
        const px = (gx + 0.5) * cellSize;
        const py = (gy + 0.5) * cellSize;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: Math.random() * 0.05 + 0.03,
                color: color,
                size: Math.random() * 3 + 2
            });
        }
    }

    function createEmpParticles(gx, gy) {
        const px = (gx + 0.5) * cellSize;
        const py = (gy + 0.5) * cellSize;
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.02,
                color: COLORS.gold,
                size: Math.random() * 4 + 3
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    // Rendering Engine
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render PCB Substrate & Grid Lines
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Copper PCB Circuit Traces Background
        ctx.strokeStyle = COLORS.pcbTrace;
        ctx.lineWidth = 1;
        for (let c = 0; c <= GRID_COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * cellSize, 0);
            ctx.lineTo(c * cellSize, GRID_ROWS * cellSize);
            ctx.stroke();
        }
        for (let r = 0; r <= GRID_ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * cellSize);
            ctx.lineTo(GRID_COLS * cellSize, r * cellSize);
            ctx.stroke();
        }

        // Draw Logic Gates
        logicGates.forEach(g => {
            const px = g.x * cellSize;
            const py = g.y * cellSize;

            ctx.fillStyle = 'rgba(157, 78, 221, 0.25)';
            ctx.strokeStyle = COLORS.purple;
            ctx.lineWidth = 1.5;
            ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
            ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

            ctx.fillStyle = COLORS.white;
            ctx.font = `bold ${Math.floor(cellSize * 0.55)}px Fira Code`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(g.type, px + cellSize / 2, py + cellSize / 2);
        });

        // Draw Power Crystals
        pwrCrystals.forEach(c => {
            const cx = (c.x + 0.5) * cellSize;
            const cy = (c.y + 0.5) * cellSize;
            const r = cellSize * 0.35;

            ctx.fillStyle = COLORS.gold;
            ctx.shadowColor = COLORS.gold;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r, cy);
            ctx.lineTo(cx, cy + r);
            ctx.lineTo(cx - r, cy);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#040a12';
            ctx.font = `bold ${Math.floor(cellSize * 0.35)}px Orbitron`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('P', cx, cy);
        });

        // Draw Data Packet Bits
        items.forEach(it => {
            const px = it.x * cellSize;
            const py = it.y * cellSize;

            ctx.fillStyle = it.color;
            ctx.shadowColor = it.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(px + cellSize / 2, py + cellSize / 2, cellSize * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#040a12';
            ctx.font = `bold ${Math.floor(cellSize * 0.45)}px Fira Code`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(it.val, px + cellSize / 2, py + cellSize / 2);
        });

        // Draw Glitch Hazards
        glitchHazards.forEach(h => {
            const px = h.x * cellSize;
            const py = h.y * cellSize;

            ctx.fillStyle = 'rgba(255, 0, 85, 0.4)';
            ctx.strokeStyle = COLORS.glitch;
            ctx.lineWidth = 1.5;
            ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
            ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

            ctx.fillStyle = COLORS.white;
            ctx.font = `bold ${Math.floor(cellSize * 0.4)}px Fira Code`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('ERR', px + cellSize / 2, py + cellSize / 2);
        });

        // Draw Snake Body
        snake.forEach((seg, idx) => {
            const px = seg.x * cellSize;
            const py = seg.y * cellSize;

            let segColor = isEmpActive ? COLORS.gold : (activeBuff ? (activeBuff.type === 'AND' ? COLORS.green : activeBuff.type === 'OR' ? COLORS.cyan : COLORS.pink) : COLORS.cyan);

            if (idx === 0) {
                // Microchip Snake Head
                ctx.fillStyle = segColor;
                ctx.shadowColor = segColor;
                ctx.shadowBlur = 12;
                ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
                ctx.shadowBlur = 0;

                // Eye Sensors
                ctx.fillStyle = '#040a12';
                ctx.fillRect(px + 4, py + 4, cellSize - 8, cellSize - 8);
                ctx.fillStyle = COLORS.white;
                ctx.fillRect(px + 6, py + 6, cellSize - 12, cellSize - 12);
            } else {
                // Segmented Circuit Nodes
                ctx.fillStyle = segColor;
                ctx.fillRect(px + 3, py + 3, cellSize - 6, cellSize - 6);

                // Connecting circuit lines
                const prev = snake[idx - 1];
                ctx.strokeStyle = segColor;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo((seg.x + 0.5) * cellSize, (seg.y + 0.5) * cellSize);
                ctx.lineTo((prev.x + 0.5) * cellSize, (prev.y + 0.5) * cellSize);
                ctx.stroke();
            }
        });

        // Draw EMP Expanding Wave Ring
        if (isEmpActive) {
            empRadius += 6;
            if (empRadius > Math.max(canvas.width, canvas.height)) empRadius = 0;

            const hx = (snake[0].x + 0.5) * cellSize;
            const hy = (snake[0].y + 0.5) * cellSize;

            ctx.strokeStyle = COLORS.gold;
            ctx.lineWidth = 3;
            ctx.shadowColor = COLORS.gold;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(hx, hy, empRadius % (canvas.width * 0.8), 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Draw Particles
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }

    // Start on DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
