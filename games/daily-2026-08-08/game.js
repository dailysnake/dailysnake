/**
 * Venetian Masquerade Snake Game (威尼斯假面：狂欢夜与镜像幻影)
 * Core Game Engine, Web Audio Synthesizer & Canvas Renderer
 * Date: 2026-08-08
 */

(function () {
    'use strict';

    // --- Configuration & Constants ---
    const GRID_SIZE = 22;
    const INITIAL_SPEED = 130; // ms per tick
    const MIRAGE_DURATION_TICKS = 45; // ~7 seconds

    // --- Canvas & DOM Elements ---
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const scoreValEl = document.getElementById('score-val');
    const highScoreValEl = document.getElementById('high-score-val');
    const lengthValEl = document.getElementById('length-val');
    const energyFillEl = document.getElementById('energy-bar-fill');

    const startScreen = document.getElementById('start-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const skillBtn = document.getElementById('skill-btn');
    const mirageOverlay = document.getElementById('mirage-overlay');

    const finalScoreEl = document.getElementById('final-score');
    const finalHighScoreEl = document.getElementById('final-high-score');
    const finalMirageCountEl = document.getElementById('final-mirage-count');

    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelpBtn = document.getElementById('close-help');
    const confirmHelpBtn = document.getElementById('confirm-help');
    const soundBtn = document.getElementById('sound-btn');
    const soundIcon = document.getElementById('sound-icon');

    // D-Pad buttons
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    // --- Web Audio Synthesizer ---
    let audioCtx = null;
    let soundEnabled = true;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playSound(type) {
        if (!soundEnabled || !audioCtx) return;

        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            if (type === 'eat') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'gem') {
                // Crystal shimmer chord
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                    const subOsc = audioCtx.createOscillator();
                    const subGain = audioCtx.createGain();
                    subOsc.type = 'sine';
                    subOsc.frequency.setValueAtTime(freq, now + idx * 0.04);
                    subGain.gain.setValueAtTime(0.2, now + idx * 0.04);
                    subGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.04 + 0.15);
                    subOsc.connect(subGain);
                    subGain.connect(audioCtx.destination);
                    subOsc.start(now + idx * 0.04);
                    subOsc.stop(now + idx * 0.04 + 0.15);
                });
            } else if (type === 'lantern') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'mirage') {
                // Bell chime sequence
                [587.33, 739.99, 880.00, 1174.66].forEach((freq, idx) => {
                    const subOsc = audioCtx.createOscillator();
                    const subGain = audioCtx.createGain();
                    subOsc.type = 'triangle';
                    subOsc.frequency.setValueAtTime(freq, now + idx * 0.06);
                    subGain.gain.setValueAtTime(0.25, now + idx * 0.06);
                    subGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.3);
                    subOsc.connect(subGain);
                    subGain.connect(audioCtx.destination);
                    subOsc.start(now + idx * 0.06);
                    subOsc.stop(now + idx * 0.06 + 0.3);
                });
            } else if (type === 'gameover') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(350, now);
                osc.frequency.exponentialRampToValueAtTime(90, now + 0.4);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
            }
        } catch (e) {
            console.warn('Audio playback error:', e);
        }
    }

    // --- Game State ---
    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let food = null; // { x, y, type: 'GOLD_MASK' | 'PURPLE_GEM' | 'LANTERN' }
    let score = 0;
    let highScore = localStorage.getItem('daily_snake_0808_high') || 0;
    let energy = 0; // 0 to 100
    let mirageCount = 0;

    let isRunning = false;
    let isMirageActive = false;
    let mirageTicks = 0;

    let lastTime = 0;
    let accumulator = 0;
    let moveSpeed = INITIAL_SPEED;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
    }

    function resetGame() {
        const startX = Math.floor(GRID_SIZE / 3);
        const startY = Math.floor(GRID_SIZE / 2);

        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
            { x: startX - 3, y: startY },
            { x: startX - 4, y: startY }
        ];

        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        score = 0;
        energy = 0;
        mirageCount = 0;
        isMirageActive = false;
        mirageTicks = 0;
        moveSpeed = INITIAL_SPEED;

        mirageOverlay.classList.add('hidden');
        spawnFood();
        updateUI();
    }

    function spawnFood() {
        let valid = false;
        let foodX, foodY;

        while (!valid) {
            foodX = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
            foodY = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
            valid = !snake.some(segment => segment.x === foodX && segment.y === foodY);
        }

        const rand = Math.random();
        let type = 'GOLD_MASK';
        if (rand < 0.20) {
            type = 'PURPLE_GEM';
        } else if (rand < 0.35) {
            type = 'LANTERN';
        }

        food = { x: foodX, y: foodY, type: type };
    }

    // --- Game Loop ---
    function gameLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const delta = timestamp - lastTime;
        lastTime = timestamp;

        if (isRunning) {
            accumulator += delta;
            if (accumulator >= moveSpeed) {
                accumulator -= moveSpeed;
                tick();
            }
        }

        render();
        requestAnimationFrame(gameLoop);
    }

    function tick() {
        dir = { ...nextDir };
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Wall & Self Collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE || checkSelfCollision(head)) {
            gameOver();
            return;
        }

        snake.unshift(head);

        // Check Main Snake Food Eat
        let ateFood = false;
        if (head.x === food.x && head.y === food.y) {
            handleFoodEat();
            ateFood = true;
        }

        // Check Mirage Phantom Snake Food Eat
        if (isMirageActive) {
            const mirrorHead = getMirrorSegment(head);
            if (!ateFood && mirrorHead.x === food.x && mirrorHead.y === food.y) {
                handleFoodEat();
                ateFood = true;
            }

            mirageTicks--;
            if (mirageTicks <= 0) {
                isMirageActive = false;
                mirageOverlay.classList.add('hidden');
            }
        }

        if (!ateFood) {
            snake.pop();
        }

        updateUI();
    }

    function checkSelfCollision(head) {
        return snake.some((seg, idx) => idx !== 0 && seg.x === head.x && seg.y === head.y);
    }

    function getMirrorSegment(seg) {
        return {
            x: GRID_SIZE - 1 - seg.x,
            y: GRID_SIZE - 1 - seg.y
        };
    }

    function handleFoodEat() {
        let basePts = 100;
        let energyGain = 15;

        if (food.type === 'PURPLE_GEM') {
            basePts = 300;
            energyGain = 35;
            playSound('gem');
        } else if (food.type === 'LANTERN') {
            basePts = 500;
            energyGain = 25;
            if (snake.length > 4) snake.pop();
            if (snake.length > 4) snake.pop();
            playSound('lantern');
        } else {
            playSound('eat');
        }

        const multiplier = isMirageActive ? 3 : 1;
        score += basePts * multiplier;
        energy = Math.min(100, energy + energyGain);

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('daily_snake_0808_high', highScore);
        }

        spawnFood();
    }

    // --- Active Ability: Mirage ---
    function triggerMirage() {
        if (energy < 100 || isMirageActive) return;

        isMirageActive = true;
        mirageTicks = MIRAGE_DURATION_TICKS;
        energy = 0;
        mirageCount++;
        playSound('mirage');

        mirageOverlay.classList.remove('hidden');
        updateUI();
    }

    // --- Render Pipeline ---
    function render() {
        ctx.save();
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        const w = canvas.width / window.devicePixelRatio;
        const h = canvas.height / window.devicePixelRatio;
        const cSize = w / GRID_SIZE;

        // 1. Dark Venetian Water Canal Background
        ctx.fillStyle = '#090514';
        ctx.fillRect(0, 0, w, h);

        // Water Wave Ripples
        ctx.strokeStyle = 'rgba(122, 31, 130, 0.12)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cSize, 0);
            ctx.lineTo(i * cSize, h);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * cSize);
            ctx.lineTo(w, i * cSize);
            ctx.stroke();
        }

        // 2. Render Food
        if (food) {
            drawFood(ctx, food, cSize);
        }

        // 3. Render Mirror Phantom Snake (if active)
        if (isMirageActive) {
            const mirrorSnake = snake.map(getMirrorSegment);
            drawVenetianSnake(ctx, mirrorSnake, cSize, true);
        }

        // 4. Render Main Golden Venetian Snake
        drawVenetianSnake(ctx, snake, cSize, false);

        // 5. Border
        ctx.strokeStyle = '#e5c158';
        ctx.lineWidth = 3;
        ctx.strokeRect(1, 1, w - 2, h - 2);

        ctx.restore();
    }

    function drawVenetianSnake(ctx, snakeArray, cSize, isPhantom) {
        if (!snakeArray || snakeArray.length === 0) return;

        // Draw Body
        for (let i = snakeArray.length - 1; i >= 1; i--) {
            const seg = snakeArray[i];
            const px = (seg.x + 0.5) * cSize;
            const py = (seg.y + 0.5) * cSize;
            const r = (cSize * 0.42) * (1 - (i / snakeArray.length) * 0.2);

            ctx.fillStyle = isPhantom ? 'rgba(122, 31, 130, 0.75)' : '#e5c158';
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();

            // Filigree scales
            ctx.fillStyle = isPhantom ? 'rgba(247, 228, 158, 0.4)' : '#9e7a27';
            ctx.beginPath();
            ctx.arc(px, py, r * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Head with Venetian Mask
        const head = snakeArray[0];
        const headPx = (head.x + 0.5) * cSize;
        const headPy = (head.y + 0.5) * cSize;
        const headR = cSize * 0.48;

        ctx.save();
        ctx.translate(headPx, headPy);

        ctx.fillStyle = isPhantom ? '#7a1f82' : '#e5c158';
        ctx.beginPath();
        ctx.arc(0, 0, headR, 0, Math.PI * 2);
        ctx.fill();

        // Venetian Mask Overlay
        ctx.fillStyle = isPhantom ? '#e5c158' : '#961634';
        ctx.beginPath();
        ctx.ellipse(0, 0, headR * 0.75, headR * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mask Eyes
        ctx.fillStyle = '#f8f2e2';
        ctx.beginPath();
        ctx.arc(-headR * 0.3, 0, headR * 0.18, 0, Math.PI * 2);
        ctx.arc(headR * 0.3, 0, headR * 0.18, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawFood(ctx, foodObj, cSize) {
        const px = (foodObj.x + 0.5) * cSize;
        const py = (foodObj.y + 0.5) * cSize;
        const r = cSize * 0.42;

        ctx.save();
        ctx.translate(px, py);

        if (foodObj.type === 'GOLD_MASK') {
            ctx.fillStyle = '#e5c158';
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#140d28';
            ctx.beginPath();
            ctx.arc(-r * 0.35, 0, r * 0.2, 0, Math.PI * 2);
            ctx.arc(r * 0.35, 0, r * 0.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (foodObj.type === 'PURPLE_GEM') {
            ctx.fillStyle = '#7a1f82';
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#f8f2e2';
            ctx.beginPath();
            ctx.arc(-r * 0.2, -r * 0.2, r * 0.3, 0, Math.PI * 2);
            ctx.fill();
        } else if (foodObj.type === 'LANTERN') {
            ctx.fillStyle = '#961634';
            ctx.fillRect(-r * 0.4, -r * 0.5, r * 0.8, r * 1.0);

            ctx.fillStyle = '#e5c158';
            ctx.fillRect(-r * 0.2, -r * 0.3, r * 0.4, r * 0.6);
        }

        ctx.restore();
    }

    // --- UI Update & Game Over ---
    function updateUI() {
        scoreValEl.textContent = score;
        highScoreValEl.textContent = highScore;
        lengthValEl.textContent = snake.length;
        energyFillEl.style.width = `${energy}%`;

        if (energy >= 100 && !isMirageActive) {
            skillBtn.disabled = false;
            skillBtn.classList.add('pulse-glow');
        } else {
            skillBtn.disabled = true;
            skillBtn.classList.remove('pulse-glow');
        }
    }

    function gameOver() {
        isRunning = false;
        playSound('gameover');

        finalScoreEl.textContent = score;
        finalHighScoreEl.textContent = highScore;
        finalMirageCountEl.textContent = `${mirageCount} 次`;

        gameoverScreen.classList.remove('hidden');
    }

    function startGame() {
        initAudio();
        resetGame();
        startScreen.classList.add('hidden');
        gameoverScreen.classList.add('hidden');
        isRunning = true;
    }

    // --- Controls & Touch ---
    function handleKeyDown(e) {
        initAudio();
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
            if (dir.y !== 1) nextDir = { x: 0, y: -1 };
            e.preventDefault();
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            if (dir.y !== -1) nextDir = { x: 0, y: 1 };
            e.preventDefault();
        } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            if (dir.x !== 1) nextDir = { x: -1, y: 0 };
            e.preventDefault();
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            if (dir.x !== -1) nextDir = { x: 1, y: 0 };
            e.preventDefault();
        } else if (e.code === 'Space') {
            triggerMirage();
            e.preventDefault();
        }
    }

    let touchStartX = 0;
    let touchStartY = 0;

    function handleTouchStart(e) {
        initAudio();
        if (e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }

    function handleTouchEnd(e) {
        if (e.changedTouches.length === 0) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;

        if (Math.hypot(dx, dy) > 30) {
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && dir.x !== -1) nextDir = { x: 1, y: 0 };
                else if (dx < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 };
            } else {
                if (dy > 0 && dir.y !== -1) nextDir = { x: 0, y: 1 };
                else if (dy < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 };
            }
        }
    }

    function setupEventListeners() {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', resizeCanvas);

        canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

        startBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', startGame);
        skillBtn.addEventListener('click', triggerMirage);

        btnUp.addEventListener('click', () => { initAudio(); if (dir.y !== 1) nextDir = { x: 0, y: -1 }; });
        btnDown.addEventListener('click', () => { initAudio(); if (dir.y !== -1) nextDir = { x: 0, y: 1 }; });
        btnLeft.addEventListener('click', () => { initAudio(); if (dir.x !== 1) nextDir = { x: -1, y: 0 }; });
        btnRight.addEventListener('click', () => { initAudio(); if (dir.x !== -1) nextDir = { x: 1, y: 0 }; });

        helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
        closeHelpBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
        confirmHelpBtn.addEventListener('click', () => helpModal.classList.add('hidden'));

        soundBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
        });
    }

    window.addEventListener('DOMContentLoaded', () => {
        resizeCanvas();
        setupEventListeners();
        resetGame();
        requestAnimationFrame(gameLoop);
    });

})();
