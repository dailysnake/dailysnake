/**
 * Daily Snake - 2026-09-25: Sonic Waveform & Acoustic Spectrum Overdrive
 * (声波脉冲：频谱共振与声学重构)
 * Author: Daily Snake Studio
 */

(function () {
    'use strict';

    // Game Configuration
    const BASE_TICK_MS = 130;
    const HIGH_FREQ_SPEED_MS = 85;
    const MAX_EQ_POWER = 100;

    // Item Wave Types
    const NOTE_TYPES = {
        SINE: { id: 'SINE', name: '基准正弦波', color: '#00ff88', glow: 'rgba(0,255,136,0.6)', symbol: '∿', score: 100, eqAdd: 15 },
        SQUARE: { id: 'SQUARE', name: '方波高频重击', color: '#ffb700', glow: 'rgba(255,183,0,0.6)', symbol: '▅', score: 300, eqAdd: 25 },
        SAW: { id: 'SAW', name: '锯齿过载失真', color: '#d044ff', glow: 'rgba(208,68,255,0.6)', symbol: 'M', score: 200, eqAdd: 25 },
        SUB: { id: 'SUB', name: '超低音共振', color: '#ff3355', glow: 'rgba(255,51,85,0.6)', symbol: '●', score: 150, eqAdd: 20 }
    };

    // State Variables
    let canvas, ctx;
    let gridCols = 24, gridRows = 18;
    let tileSize = 30;

    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };

    let noteItems = [];
    let noiseObstacles = [];
    let particles = [];
    let sonicShockwaves = [];
    let spectrumBars = [];

    let score = 0;
    let highScore = localStorage.getItem('daily_snake_sonic_highscore') || 0;
    let sweepsUsed = 0;
    let noiseDestroyed = 0;
    let eqPower = 0;

    let isPaused = false;
    let isGameOver = false;
    let isGameStarted = false;
    let gameLoopTimeout = null;
    let animFrameId = null;

    // Active Buff Modes
    let activeMode = 'SINE'; // 'SINE' | 'SQUARE' | 'SAW'
    let modeExpireTimer = 0;

    // Audio Context & Sound Synthesizer
    let audioCtx = null;
    let soundEnabled = true;

    // CRT Overlay state
    let crtEnabled = true;

    // DOM Elements
    const scoreValEl = document.getElementById('score-val');
    const highScoreValEl = document.getElementById('high-score-val');
    const waveStateTextEl = document.getElementById('wave-state-text');
    const waveIconEl = document.getElementById('wave-icon');
    const eqFillEl = document.getElementById('eq-fill');
    const eqStatusTextEl = document.getElementById('eq-status-text');
    const crtToggleBtn = document.getElementById('crt-toggle-btn');
    const crtLabelEl = document.getElementById('crt-label');
    const crtOverlayEl = document.querySelector('.crt-overlay');
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    const audioOnIcon = document.getElementById('audio-on-icon');
    const audioOffIcon = document.getElementById('audio-off-icon');
    const pauseBtn = document.getElementById('pause-btn');
    const helpBtn = document.getElementById('help-btn');
    const startOverlay = document.getElementById('start-overlay');
    const startGameBtn = document.getElementById('start-game-btn');
    const mobileSkillBtn = document.getElementById('mobile-skill-btn');

    const pauseModal = document.getElementById('pause-modal');
    const helpModal = document.getElementById('help-modal');
    const gameOverModal = document.getElementById('game-over-modal');

    const finalScoreEl = document.getElementById('final-score');
    const finalSweepsEl = document.getElementById('final-sweeps');
    const finalDestroyedEl = document.getElementById('final-destroyed');
    const newRecordBanner = document.getElementById('new-record-banner');
    const restartBtn = document.getElementById('restart-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const closeHelpBtn = document.getElementById('close-help-btn');

    // Initialize Application
    window.addEventListener('DOMContentLoaded', () => {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');

        highScoreValEl.textContent = highScore;
        initSpectrumBars();

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        setupEventListeners();
        setupTouchControls();

        // Start animation loop for visualizer background
        requestAnimationFrame(renderLoop);
    });

    function initSpectrumBars() {
        spectrumBars = [];
        const numBars = 32;
        for (let i = 0; i < numBars; i++) {
            spectrumBars.push({
                val: Math.random() * 0.4 + 0.1,
                target: Math.random() * 0.8 + 0.1,
                speed: 0.05 + Math.random() * 0.08
            });
        }
    }

    function resizeCanvas() {
        const stage = canvas.parentElement;
        canvas.width = stage.clientWidth;
        canvas.height = stage.clientHeight;

        gridCols = Math.floor(canvas.width / 32);
        gridRows = Math.floor(canvas.height / 32);
        gridCols = Math.max(16, Math.min(36, gridCols));
        gridRows = Math.max(12, Math.min(26, gridRows));

        tileSize = Math.min(canvas.width / gridCols, canvas.height / gridRows);
    }

    // Audio Synthesizer Functions
    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playNoteSound(freq, duration = 0.15, type = 'sine') {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) { }
    }

    function playEatSound(noteType) {
        if (!soundEnabled || !audioCtx) return;
        const baseScale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
        const pitch = baseScale[(score / 100) % baseScale.length];

        if (noteType === 'SQUARE') {
            playNoteSound(pitch * 1.5, 0.2, 'square');
        } else if (noteType === 'SAW') {
            playNoteSound(pitch * 0.8, 0.25, 'sawtooth');
        } else if (noteType === 'SUB') {
            playNoteSound(110, 0.3, 'triangle');
        } else {
            playNoteSound(pitch, 0.15, 'sine');
        }
    }

    function playSweepSound() {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';

            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.6);

            gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.6);
        } catch (e) { }
    }

    function playGameOverSound() {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';

            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(40, audioCtx.currentTime + 0.5);

            gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        } catch (e) { }
    }

    function playStepPulse() {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(90, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        } catch (e) { }
    }

    // Game Control Logic
    function setupEventListeners() {
        document.addEventListener('keydown', handleKeyDown);

        startGameBtn.addEventListener('click', () => {
            initAudio();
            startOverlay.classList.add('hidden');
            startGame();
        });

        crtToggleBtn.addEventListener('click', toggleCRT);
        audioToggleBtn.addEventListener('click', toggleAudio);
        pauseBtn.addEventListener('click', togglePause);
        helpBtn.addEventListener('click', openHelp);

        resumeBtn.addEventListener('click', togglePause);
        closeHelpBtn.addEventListener('click', closeHelp);
        restartBtn.addEventListener('click', () => {
            gameOverModal.classList.add('hidden');
            startGame();
        });

        mobileSkillBtn.addEventListener('click', triggerEQSweep);
    }

    function toggleCRT() {
        crtEnabled = !crtEnabled;
        if (crtEnabled) {
            crtOverlayEl.classList.remove('disabled');
            crtLabelEl.textContent = 'CRT 示波模式';
        } else {
            crtOverlayEl.classList.add('disabled');
            crtLabelEl.textContent = '高清纯净模式';
        }
    }

    function toggleAudio() {
        soundEnabled = !soundEnabled;
        if (soundEnabled) {
            audioOnIcon.classList.remove('hidden');
            audioOffIcon.classList.add('hidden');
        } else {
            audioOnIcon.classList.add('hidden');
            audioOffIcon.classList.remove('hidden');
        }
    }

    function togglePause() {
        if (!isGameStarted || isGameOver) return;
        isPaused = !isPaused;
        if (isPaused) {
            pauseModal.classList.remove('hidden');
        } else {
            pauseModal.classList.add('hidden');
            scheduleNextTick();
        }
    }

    function openHelp() {
        helpModal.classList.remove('hidden');
    }

    function closeHelp() {
        helpModal.classList.add('hidden');
    }

    function handleKeyDown(e) {
        if (!isGameStarted || isPaused || isGameOver) {
            if (e.key === 'p' || e.key === 'P') togglePause();
            return;
        }

        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W':
                if (dir.y !== 1) nextDir = { x: 0, y: -1 };
                break;
            case 'ArrowDown': case 's': case 'S':
                if (dir.y !== -1) nextDir = { x: 0, y: 1 };
                break;
            case 'ArrowLeft': case 'a': case 'A':
                if (dir.x !== 1) nextDir = { x: -1, y: 0 };
                break;
            case 'ArrowRight': case 'd': case 'D':
                if (dir.x !== -1) nextDir = { x: 1, y: 0 };
                break;
            case ' ':
                e.preventDefault();
                triggerEQSweep();
                break;
            case 'p': case 'P':
                togglePause();
                break;
            case 'm': case 'M':
                toggleAudio();
                break;
            case 'c': case 'C':
                toggleCRT();
                break;
        }
    }

    function setupTouchControls() {
        const btnUp = document.getElementById('btn-up');
        const btnDown = document.getElementById('btn-down');
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');

        if (btnUp) btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); if (dir.y !== 1) nextDir = { x: 0, y: -1 }; });
        if (btnDown) btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); if (dir.y !== -1) nextDir = { x: 0, y: 1 }; });
        if (btnLeft) btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); if (dir.x !== 1) nextDir = { x: -1, y: 0 }; });
        if (btnRight) btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); if (dir.x !== -1) nextDir = { x: 1, y: 0 }; });

        // Touch Swipe support on Canvas
        let touchStartX = 0, touchStartY = 0;
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        canvas.addEventListener('touchend', (e) => {
            if (!isGameStarted || isPaused || isGameOver) return;
            if (e.changedTouches.length > 0) {
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
                    if (Math.abs(dx) > Math.abs(dy)) {
                        if (dx > 0 && dir.x !== -1) nextDir = { x: 1, y: 0 };
                        else if (dx < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 };
                    } else {
                        if (dy > 0 && dir.y !== -1) nextDir = { x: 0, y: 1 };
                        else if (dy < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 };
                    }
                }
            }
        }, { passive: true });
    }

    // Core Game Mechanics
    function startGame() {
        const startX = Math.floor(gridCols / 2);
        const startY = Math.floor(gridRows / 2);

        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
            { x: startX - 3, y: startY }
        ];

        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };

        noteItems = [];
        noiseObstacles = [];
        particles = [];
        sonicShockwaves = [];

        score = 0;
        sweepsUsed = 0;
        noiseDestroyed = 0;
        eqPower = 0;

        activeMode = 'SINE';
        modeExpireTimer = 0;

        isPaused = false;
        isGameOver = false;
        isGameStarted = true;

        updateHUD();
        spawnNotes();
        spawnNoiseObstacles(2);

        if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
        scheduleNextTick();
    }

    function scheduleNextTick() {
        if (isPaused || isGameOver) return;
        let speed = (activeMode === 'SQUARE') ? HIGH_FREQ_SPEED_MS : BASE_TICK_MS;
        gameLoopTimeout = setTimeout(gameTick, speed);
    }

    function gameTick() {
        if (isPaused || isGameOver) return;

        dir = { ...nextDir };
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Wall collision check
        if (head.x < 0 || head.x >= gridCols || head.y < 0 || head.y >= gridRows) {
            handleGameOver('碰撞边界示波失真！');
            return;
        }

        // Self collision check
        for (let i = 0; i < snake.length - 1; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                handleGameOver('信号自我回环短路！');
                return;
            }
        }

        // Noise Obstacle collision
        const noiseIdx = noiseObstacles.findIndex(n => n.x === head.x && n.y === head.y);
        if (noiseIdx !== -1) {
            if (activeMode === 'SAW') {
                // Sawtooth mode smashes noise obstacle!
                createExplosionParticles(head.x, head.y, NOTE_TYPES.SAW.color, 12);
                noiseObstacles.splice(noiseIdx, 1);
                noiseDestroyed++;
                score += 150;
                playEatSound('SAW');
            } else {
                handleGameOver('误入杂波噪点短路！');
                return;
            }
        }

        snake.unshift(head);
        playStepPulse();

        // Check Note collection
        const eatenNoteIdx = noteItems.findIndex(n => n.x === head.x && n.y === head.y);
        if (eatenNoteIdx !== -1) {
            const note = noteItems[eatenNoteIdx];
            noteItems.splice(eatenNoteIdx, 1);

            score += note.type.score;
            addEQPower(note.type.eqAdd);
            playEatSound(note.type.id);
            createExplosionParticles(head.x, head.y, note.type.color, 16);

            // Apply Mode Buff
            if (note.type.id === 'SQUARE') {
                activeMode = 'SQUARE';
                modeExpireTimer = Date.now() + 5000;
            } else if (note.type.id === 'SAW') {
                activeMode = 'SAW';
                modeExpireTimer = Date.now() + 8000;
            } else if (note.type.id === 'SUB') {
                triggerSubBassPulse(head.x, head.y);
            }

            spawnNotes();

            // Chance to spawn extra noise obstacle as game progresses
            if (Math.random() < 0.35 && noiseObstacles.length < 8) {
                spawnNoiseObstacles(1);
            }
        } else {
            snake.pop(); // Remove tail
        }

        // Mode Expiration check
        if (modeExpireTimer > 0 && Date.now() > modeExpireTimer) {
            activeMode = 'SINE';
            modeExpireTimer = 0;
        }

        updateHUD();
        scheduleNextTick();
    }

    function addEQPower(val) {
        eqPower = Math.min(MAX_EQ_POWER, eqPower + val);
        updateHUD();
    }

    function triggerEQSweep() {
        if (eqPower < MAX_EQ_POWER || isPaused || isGameOver) return;

        eqPower = 0;
        sweepsUsed++;
        playSweepSound();

        const head = snake[0];
        const headPxX = (head.x + 0.5) * tileSize;
        const headPxY = (head.y + 0.5) * tileSize;

        // Add expanding shockwave
        sonicShockwaves.push({
            x: headPxX,
            y: headPxY,
            radius: 10,
            maxRadius: Math.max(canvas.width, canvas.height) * 1.2,
            color: NOTE_TYPES.SQUARE.color
        });

        // Destroy all active noise obstacles on screen
        const destroyedCount = noiseObstacles.length;
        noiseObstacles.forEach(n => {
            createExplosionParticles(n.x, n.y, '#ffffff', 14);
            score += 100;
        });
        noiseDestroyed += destroyedCount;
        noiseObstacles = [];

        updateHUD();
    }

    function triggerSubBassPulse(gx, gy) {
        const px = (gx + 0.5) * tileSize;
        const py = (gy + 0.5) * tileSize;

        sonicShockwaves.push({
            x: px,
            y: py,
            radius: 5,
            maxRadius: tileSize * 5,
            color: NOTE_TYPES.SUB.color
        });

        // Remove nearby noise blocks within radius 3
        noiseObstacles = noiseObstacles.filter(n => {
            const dist = Math.hypot(n.x - gx, n.y - gy);
            if (dist <= 3.5) {
                createExplosionParticles(n.x, n.y, NOTE_TYPES.SUB.color, 10);
                noiseDestroyed++;
                score += 100;
                return false;
            }
            return true;
        });
    }

    function spawnNotes() {
        while (noteItems.length < 2) {
            const pos = getRandomFreePos();
            if (!pos) break;

            const rand = Math.random();
            let type = NOTE_TYPES.SINE;
            if (rand < 0.25) type = NOTE_TYPES.SQUARE;
            else if (rand < 0.45) type = NOTE_TYPES.SAW;
            else if (rand < 0.60) type = NOTE_TYPES.SUB;

            noteItems.push({
                x: pos.x,
                y: pos.y,
                type: type,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
    }

    function spawnNoiseObstacles(count = 1) {
        for (let i = 0; i < count; i++) {
            const pos = getRandomFreePos();
            if (!pos) break;
            noiseObstacles.push({
                x: pos.x,
                y: pos.y,
                glitchChar: Math.floor(Math.random() * 99)
            });
        }
    }

    function getRandomFreePos() {
        let attempts = 0;
        while (attempts < 200) {
            const rx = Math.floor(Math.random() * gridCols);
            const ry = Math.floor(Math.random() * gridRows);

            const onSnake = snake.some(s => s.x === rx && s.y === ry);
            const onNote = noteItems.some(n => n.x === rx && n.y === ry);
            const onNoise = noiseObstacles.some(n => n.x === rx && n.y === ry);

            if (!onSnake && !onNote && !onNoise) {
                return { x: rx, y: ry };
            }
            attempts++;
        }
        return null;
    }

    function createExplosionParticles(gx, gy, color, count = 12) {
        const px = (gx + 0.5) * tileSize;
        const py = (gy + 0.5) * tileSize;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4;
            particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4,
                color: color,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    }

    function handleGameOver(reason) {
        isGameOver = true;
        playGameOverSound();

        finalScoreEl.textContent = score;
        finalSweepsEl.textContent = sweepsUsed;
        finalDestroyedEl.textContent = noiseDestroyed;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('daily_snake_sonic_highscore', highScore);
            highScoreValEl.textContent = highScore;
            newRecordBanner.classList.remove('hidden');
        } else {
            newRecordBanner.classList.add('hidden');
        }

        gameOverModal.classList.remove('hidden');
    }

    function updateHUD() {
        scoreValEl.textContent = score;

        // Wave state label
        if (activeMode === 'SQUARE') {
            waveStateTextEl.textContent = '方波高频疾风 (速升)';
            waveStateTextEl.className = 'hud-value neon-amber';
            waveIconEl.textContent = '▅';
        } else if (activeMode === 'SAW') {
            waveStateTextEl.textContent = '锯齿失真过载 (撞碎杂波)';
            waveStateTextEl.className = 'hud-value neon-purple';
            waveIconEl.textContent = 'M';
        } else {
            waveStateTextEl.textContent = '基准正弦波';
            waveStateTextEl.className = 'hud-value neon-emerald';
            waveIconEl.textContent = '∿';
        }

        // EQ Fill
        eqFillEl.style.width = `${eqPower}%`;
        if (eqPower >= MAX_EQ_POWER) {
            eqFillEl.classList.add('ready');
            eqStatusTextEl.textContent = 'READY! [按 SPACE 暴扫]';
            eqStatusTextEl.style.color = 'var(--neon-amber)';
            mobileSkillBtn.classList.remove('disabled');
            mobileSkillBtn.disabled = false;
        } else {
            eqFillEl.classList.remove('ready');
            eqStatusTextEl.textContent = `蓄能中 [${Math.floor(eqPower)}%]`;
            eqStatusTextEl.style.color = 'var(--text-muted)';
            mobileSkillBtn.classList.add('disabled');
            mobileSkillBtn.disabled = true;
        }
    }

    // Render & Animation Engine
    function renderLoop() {
        renderCanvas();
        requestAnimationFrame(renderLoop);
    }

    function renderCanvas() {
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;

        // Clear Stage Background
        ctx.fillStyle = '#050810';
        ctx.fillRect(0, 0, w, h);

        // Render Background Spectrum Analyzer Bars
        renderSpectrumBars(w, h);

        // Render Oscilloscope Grid Lines
        renderOscilloscopeGrid(w, h);

        if (!isGameStarted) return;

        // Render Shockwaves
        renderShockwaves();

        // Render Noise Obstacles
        renderNoiseObstacles();

        // Render Notes
        renderNotes();

        // Render Snake Body & Head
        renderSnake();

        // Render Particles
        renderParticles();
    }

    function renderSpectrumBars(w, h) {
        ctx.save();
        const barWidth = w / spectrumBars.length;

        spectrumBars.forEach((bar, i) => {
            // Update physics
            bar.val += (bar.target - bar.val) * bar.speed;
            if (Math.abs(bar.val - bar.target) < 0.05) {
                bar.target = Math.random() * 0.7 + 0.1;
            }

            const barHeight = bar.val * (h * 0.4);
            const x = i * barWidth;
            const y = h - barHeight;

            const grad = ctx.createLinearGradient(0, h, 0, h - (h * 0.4));
            grad.addColorStop(0, 'rgba(0, 240, 255, 0.02)');
            grad.addColorStop(0.5, 'rgba(0, 255, 136, 0.08)');
            grad.addColorStop(1, 'rgba(255, 183, 0, 0.15)');

            ctx.fillStyle = grad;
            ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
        });
        ctx.restore();
    }

    function renderOscilloscopeGrid(w, h) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 1;

        // Vertical Grid Lines
        for (let x = 0; x < w; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        // Horizontal Grid Lines
        for (let y = 0; y < h; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Center Axis Lines with subtle highlight
        const centerX = Math.floor(gridCols / 2) * tileSize;
        const centerY = Math.floor(gridRows / 2) * tileSize;

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(centerX, 0); ctx.lineTo(centerX, h);
        ctx.moveTo(0, centerY); ctx.lineTo(w, centerY);
        ctx.stroke();

        ctx.restore();
    }

    function renderSnake() {
        if (snake.length === 0) return;

        ctx.save();
        const time = Date.now() * 0.005;

        let strokeColor = NOTE_TYPES.SINE.color;
        let shadowColor = NOTE_TYPES.SINE.glow;

        if (activeMode === 'SQUARE') {
            strokeColor = NOTE_TYPES.SQUARE.color;
            shadowColor = NOTE_TYPES.SQUARE.glow;
        } else if (activeMode === 'SAW') {
            strokeColor = NOTE_TYPES.SAW.color;
            shadowColor = NOTE_TYPES.SAW.glow;
        }

        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 12;

        // Render Snake Connecting Sine Wave Line
        ctx.beginPath();
        snake.forEach((seg, i) => {
            const px = (seg.x + 0.5) * tileSize;
            const py = (seg.y + 0.5) * tileSize;

            // Oscillating wiggle offset perpendicular to body direction
            const waveOffset = Math.sin(time + i * 0.6) * (tileSize * 0.15);

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px + waveOffset, py + waveOffset);
            }
        });

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(3, tileSize * 0.4);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Render Snake Segment Nodes
        snake.forEach((seg, i) => {
            const px = (seg.x + 0.5) * tileSize;
            const py = (seg.y + 0.5) * tileSize;

            if (i === 0) {
                // Snake Head
                ctx.fillStyle = strokeColor;
                ctx.beginPath();
                ctx.arc(px, py, tileSize * 0.42, 0, Math.PI * 2);
                ctx.fill();

                // Eyes / Direction Indicator
                ctx.fillStyle = '#000';
                const eyeOffset = tileSize * 0.18;
                ctx.beginPath();
                ctx.arc(px + dir.x * eyeOffset + dir.y * eyeOffset, py + dir.y * eyeOffset - dir.x * eyeOffset, 3, 0, Math.PI * 2);
                ctx.arc(px + dir.x * eyeOffset - dir.y * eyeOffset, py + dir.y * eyeOffset + dir.x * eyeOffset, 3, 0, Math.PI * 2);
                ctx.fill();

                // Sawtooth aura spinning if in SAW mode
                if (activeMode === 'SAW') {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    const auraRad = tileSize * 0.55;
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                        const ax = px + Math.cos(a + time * 3) * auraRad;
                        const ay = py + Math.sin(a + time * 3) * auraRad;
                        if (a === 0) ctx.moveTo(ax, ay);
                        else ctx.lineTo(ax, ay);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }
            } else {
                // Body Nodes
                const nodeRad = (1 - (i / snake.length) * 0.4) * (tileSize * 0.28);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(px, py, Math.max(2, nodeRad), 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.restore();
    }

    function renderNotes() {
        ctx.save();
        const time = Date.now() * 0.004;

        noteItems.forEach(note => {
            const px = (note.x + 0.5) * tileSize;
            const py = (note.y + 0.5) * tileSize;
            const pulse = Math.sin(time + note.pulsePhase) * 3;

            ctx.shadowColor = note.type.glow;
            ctx.shadowBlur = 15;

            // Outer Note Ring
            ctx.strokeStyle = note.type.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, tileSize * 0.35 + pulse, 0, Math.PI * 2);
            ctx.stroke();

            // Note Symbol Content
            ctx.fillStyle = note.type.color;
            ctx.font = `bold ${Math.floor(tileSize * 0.5)}px 'Orbitron', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(note.type.symbol, px, py);
        });

        ctx.restore();
    }

    function renderNoiseObstacles() {
        ctx.save();
        const time = Date.now() * 0.01;

        noiseObstacles.forEach(noise => {
            const px = noise.x * tileSize;
            const py = noise.y * tileSize;

            // Glitch Box
            ctx.fillStyle = 'rgba(255, 51, 85, 0.25)';
            ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);

            ctx.strokeStyle = NOTE_TYPES.SUB.color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 2, py + 2, tileSize - 4, tileSize - 4);

            // Flickering noise digits
            ctx.fillStyle = '#ff3355';
            ctx.font = `bold 11px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const rndNum = (noise.glitchChar + Math.floor(time * 10)) % 99;
            ctx.fillText(`NOISE:${rndNum}`, px + tileSize / 2, py + tileSize / 2);
        });

        ctx.restore();
    }

    function renderShockwaves() {
        ctx.save();
        for (let i = sonicShockwaves.length - 1; i >= 0; i--) {
            const wave = sonicShockwaves[i];
            wave.radius += 18;

            const alpha = 1 - (wave.radius / wave.maxRadius);
            if (alpha <= 0) {
                sonicShockwaves.splice(i, 1);
                continue;
            }

            ctx.strokeStyle = wave.color;
            ctx.lineWidth = 4 * alpha;
            ctx.shadowColor = wave.color;
            ctx.shadowBlur = 20;

            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    function renderParticles() {
        ctx.save();
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

})();
