/**
 * 1930s Silent Reel Rhapsody (默片狂想曲：橡皮蛇与胶片逆转)
 * Core Game Engine, Web Audio Synthesizer & Canvas Renderer
 * Date: 2026-08-07
 */

(function () {
    'use strict';

    // --- Configuration & Constants ---
    const GRID_SIZE = 22; // 22x22 Grid
    const INITIAL_SPEED = 140; // ms per tick
    const REWIND_STEPS = 24; // Rewind back 24 ticks (~3.5 seconds)

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
    const rewindOverlay = document.getElementById('rewind-overlay');
    const frenzyNotice = document.getElementById('frenzy-notice');

    const finalScoreEl = document.getElementById('final-score');
    const finalHighScoreEl = document.getElementById('final-high-score');
    const finalRewindCountEl = document.getElementById('final-rewind-count');

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
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(740, now + 0.12);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'frenzy') {
                // Ragtime chord arpeggio
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
                notes.forEach((freq, idx) => {
                    const subOsc = audioCtx.createOscillator();
                    const subGain = audioCtx.createGain();
                    subOsc.type = 'square';
                    subOsc.frequency.setValueAtTime(freq, now + idx * 0.05);
                    subGain.gain.setValueAtTime(0.2, now + idx * 0.05);
                    subGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.1);
                    subOsc.connect(subGain);
                    subGain.connect(audioCtx.destination);
                    subOsc.start(now + idx * 0.05);
                    subOsc.stop(now + idx * 0.05 + 0.1);
                });
            } else if (type === 'popcorn') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'rewind') {
                // Tape rewind wobble sound
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(900, now);
                osc.frequency.linearRampToValueAtTime(200, now + 0.35);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'gameover') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
            }
        } catch (e) {
            console.warn('Audio playback error:', e);
        }
    }

    // --- Game State Variables ---
    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let food = null; // { x, y, type: 'FILM_REEL' | 'GRAMOPHONE' | 'POPCORN' }
    let score = 0;
    let highScore = localStorage.getItem('daily_snake_0807_high') || 0;
    let energy = 0; // 0 to 100
    let rewindCount = 0;

    let isRunning = false;
    let isRewinding = false;
    let rewindTimer = null;
    let historyQueue = []; // History snapshots of snake position

    let frenzyTime = 0; // Frenzy mode remaining ticks
    let spotlightAngle = 0; // Spotlight movement theta

    let lastTime = 0;
    let accumulator = 0;
    let moveSpeed = INITIAL_SPEED;

    // Canvas dimensions & Cell Size
    let cellSize = 600 / GRID_SIZE;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        cellSize = canvas.width / GRID_SIZE;
    }

    // --- Game Initialization & Reset ---
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
        rewindCount = 0;
        frenzyTime = 0;
        moveSpeed = INITIAL_SPEED;
        historyQueue = [];
        isRewinding = false;

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
        let type = 'FILM_REEL';
        if (rand < 0.15) {
            type = 'GRAMOPHONE';
        } else if (rand < 0.30) {
            type = 'POPCORN';
        }

        food = { x: foodX, y: foodY, type: type, animTick: 0 };
    }

    // --- Update & Game Loop ---
    function gameLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const delta = timestamp - lastTime;
        lastTime = timestamp;

        if (isRunning && !isRewinding) {
            accumulator += delta;
            spotlightAngle += 0.02;

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

        // Save position snapshot to history queue
        historyQueue.push(JSON.parse(JSON.stringify(snake)));
        if (historyQueue.length > 100) {
            historyQueue.shift();
        }

        // Collision Check (Wall or Self)
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE || checkSelfCollision(head)) {
            // Auto Trigger Rewind if energy is 100%!
            if (energy >= 100) {
                triggerRewind();
                return;
            }
            gameOver();
            return;
        }

        snake.unshift(head);

        // Check Food Eating
        if (head.x === food.x && head.y === food.y) {
            handleFoodEat();
        } else {
            snake.pop();
        }

        // Update Frenzy Timer
        if (frenzyTime > 0) {
            frenzyTime--;
            if (frenzyTime === 0) {
                frenzyNotice.classList.add('hidden');
            }
        }

        updateUI();
    }

    function checkSelfCollision(head) {
        return snake.some((seg, idx) => idx !== 0 && seg.x === head.x && seg.y === head.y);
    }

    function handleFoodEat() {
        let basePts = 100;
        let energyGain = 15;

        if (food.type === 'GRAMOPHONE') {
            basePts = 250;
            energyGain = 30;
            frenzyTime = 40; // ~6 seconds frenzy
            frenzyNotice.classList.remove('hidden');
            playSound('frenzy');
        } else if (food.type === 'POPCORN') {
            basePts = 500;
            energyGain = 25;
            // Popcorn removes up to 2 tail segments
            if (snake.length > 4) snake.pop();
            if (snake.length > 4) snake.pop();
            playSound('popcorn');
        } else {
            playSound('eat');
        }

        // Spotlight Bonus Check
        const spotlightCell = getSpotlightCell();
        const inSpotlight = (Math.hypot(food.x - spotlightCell.x, food.y - spotlightCell.y) <= 3);
        const multiplier = (frenzyTime > 0 ? 2 : 1) * (inSpotlight ? 2 : 1);

        score += basePts * multiplier;
        energy = Math.min(100, energy + energyGain);

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('daily_snake_0807_high', highScore);
        }

        spawnFood();
    }

    // --- Active Ability: Film Rewind ---
    function triggerRewind() {
        if (energy < 100 || isRewinding || historyQueue.length === 0) return;

        isRewinding = true;
        energy = 0;
        rewindCount++;
        playSound('rewind');
        rewindOverlay.classList.remove('hidden');

        let stepsToRewind = Math.min(REWIND_STEPS, historyQueue.length);
        let count = 0;

        rewindTimer = setInterval(() => {
            if (historyQueue.length > 0 && count < stepsToRewind) {
                snake = historyQueue.pop();
                count++;
                render();
            } else {
                clearInterval(rewindTimer);
                isRewinding = false;
                rewindOverlay.classList.add('hidden');
                // Reset direction to tail direction or valid safety dir
                if (snake.length >= 2) {
                    const h = snake[0];
                    const neck = snake[1];
                    dir = { x: h.x - neck.x, y: h.y - neck.y };
                    nextDir = { ...dir };
                }
                updateUI();
            }
        }, 50);
    }

    function getSpotlightCell() {
        const cx = GRID_SIZE / 2 + Math.sin(spotlightAngle) * 6;
        const cy = GRID_SIZE / 2 + Math.cos(spotlightAngle * 0.7) * 6;
        return { x: cx, y: cy };
    }

    // --- Render Pipeline ---
    function render() {
        ctx.save();
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        const w = canvas.width / window.devicePixelRatio;
        const h = canvas.height / window.devicePixelRatio;
        const cSize = w / GRID_SIZE;

        // 1. Draw Vintage Sepia Grid Background
        ctx.fillStyle = '#ebdcb9';
        ctx.fillRect(0, 0, w, h);

        // Subtle Grid Lines
        ctx.strokeStyle = 'rgba(61, 49, 34, 0.08)';
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

        // 2. Render Moving Projector Spotlight Area
        const spotlight = getSpotlightCell();
        const spotPx = (spotlight.x + 0.5) * cSize;
        const spotPy = (spotlight.y + 0.5) * cSize;
        const radius = cSize * 3.5;

        const grad = ctx.createRadialGradient(spotPx, spotPy, radius * 0.2, spotPx, spotPy, radius);
        grad.addColorStop(0, 'rgba(255, 245, 205, 0.35)');
        grad.addColorStop(0.7, 'rgba(255, 240, 180, 0.15)');
        grad.addColorStop(1, 'rgba(255, 240, 180, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(spotPx, spotPy, radius, 0, Math.PI * 2);
        ctx.fill();

        // 3. Render Food
        if (food) {
            drawFood(ctx, food, cSize);
        }

        // 4. Render Snake (1930s Rubber Hose Style)
        drawRubberHoseSnake(ctx, snake, cSize);

        // 5. Render Film Frame Border / Vignette in Canvas
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, w - 4, h - 4);

        ctx.restore();
    }

    // --- Draw Rubber Hose Snake ---
    function drawRubberHoseSnake(ctx, snakeArray, cSize) {
        if (!snakeArray || snakeArray.length === 0) return;

        // Draw Body Segments (Tail to Head)
        for (let i = snakeArray.length - 1; i >= 1; i--) {
            const seg = snakeArray[i];
            const px = (seg.x + 0.5) * cSize;
            const py = (seg.y + 0.5) * cSize;

            const bodyRadius = (cSize * 0.42) * (1 - (i / snakeArray.length) * 0.2);

            ctx.fillStyle = '#1a1612'; // Black ink
            ctx.beginPath();
            ctx.arc(px, py, bodyRadius, 0, Math.PI * 2);
            ctx.fill();

            // Inner cream highlight
            ctx.fillStyle = 'rgba(245, 234, 206, 0.25)';
            ctx.beginPath();
            ctx.arc(px - bodyRadius * 0.25, py - bodyRadius * 0.25, bodyRadius * 0.35, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Head (Rubber Hose Style with Pie-Eyes & Hat)
        const head = snakeArray[0];
        const headPx = (head.x + 0.5) * cSize;
        const headPy = (head.y + 0.5) * cSize;
        const headR = cSize * 0.48;

        ctx.save();
        ctx.translate(headPx, headPy);

        // Calculate rotation based on direction
        let angle = 0;
        if (dir.x === 1) angle = 0;
        if (dir.x === -1) angle = Math.PI;
        if (dir.y === 1) angle = Math.PI / 2;
        if (dir.y === -1) angle = -Math.PI / 2;

        ctx.rotate(angle);

        // Head Base Oval
        ctx.fillStyle = '#1a1612';
        ctx.beginPath();
        ctx.ellipse(0, 0, headR, headR * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cream Face Patch
        ctx.fillStyle = '#f5eace';
        ctx.beginPath();
        ctx.ellipse(headR * 0.2, 0, headR * 0.6, headR * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // 1930s Pie-Eyes
        drawPieEye(ctx, headR * 0.25, -headR * 0.22, headR * 0.18);
        drawPieEye(ctx, headR * 0.25, headR * 0.22, headR * 0.18);

        // Cheerful Mouth
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(headR * 0.35, 0, headR * 0.25, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();

        // Tongue
        ctx.strokeStyle = '#a83232';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(headR * 0.55, 0);
        ctx.lineTo(headR * 0.85, 0);
        ctx.lineTo(headR * 0.95, -3);
        ctx.moveTo(headR * 0.85, 0);
        ctx.lineTo(headR * 0.95, 3);
        ctx.stroke();

        // Cute Mini Bowler Hat
        ctx.fillStyle = '#1a1612';
        ctx.fillRect(-headR * 0.3, -headR * 0.85, headR * 0.6, headR * 0.35);
        ctx.fillRect(-headR * 0.5, -headR * 0.5, headR * 1.0, headR * 0.12);

        ctx.restore();
    }

    function drawPieEye(ctx, x, y, r) {
        ctx.fillStyle = '#1a1612';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Triangular wedge cutout (Classic 1930s style)
        ctx.fillStyle = '#f5eace';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, r + 1, -Math.PI * 0.25, Math.PI * 0.25);
        ctx.closePath();
        ctx.fill();
    }

    // --- Draw Food Items ---
    function drawFood(ctx, foodObj, cSize) {
        const px = (foodObj.x + 0.5) * cSize;
        const py = (foodObj.y + 0.5) * cSize;
        const r = cSize * 0.4;

        ctx.save();
        ctx.translate(px, py);

        if (foodObj.type === 'FILM_REEL') {
            // Film Reel Disc
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            // Inner Brass Ring
            ctx.strokeStyle = '#d4a755';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
            ctx.stroke();

            // 3 Reel Holes
            ctx.fillStyle = '#ebdcb9';
            for (let a = 0; a < Math.PI * 2; a += (Math.PI * 2 / 3)) {
                const hx = Math.cos(a) * (r * 0.4);
                const hy = Math.sin(a) * (r * 0.4);
                ctx.beginPath();
                ctx.arc(hx, hy, r * 0.2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (foodObj.type === 'GRAMOPHONE') {
            // Gramophone Horn
            ctx.fillStyle = '#7b429e';
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#d4a755';
            ctx.beginPath();
            ctx.moveTo(-r * 0.4, r * 0.3);
            ctx.lineTo(r * 0.5, -r * 0.5);
            ctx.lineTo(r * 0.5, r * 0.5);
            ctx.closePath();
            ctx.fill();
        } else if (foodObj.type === 'POPCORN') {
            // Popcorn Bucket
            ctx.fillStyle = '#a83232';
            ctx.fillRect(-r * 0.5, -r * 0.2, r, r * 0.7);

            // Popcorn Kernels
            ctx.fillStyle = '#f5eace';
            ctx.beginPath();
            ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, Math.PI * 2);
            ctx.arc(0, -r * 0.45, r * 0.35, 0, Math.PI * 2);
            ctx.arc(r * 0.3, -r * 0.3, r * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // --- UI Update & Game Over ---
    function updateUI() {
        scoreValEl.textContent = score;
        highScoreValEl.textContent = highScore;
        lengthValEl.textContent = snake.length;
        energyFillEl.style.width = `${energy}%`;

        if (energy >= 100) {
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
        finalRewindCountEl.textContent = `${rewindCount} 次`;

        gameoverScreen.classList.remove('hidden');
    }

    function startGame() {
        initAudio();
        resetGame();
        startScreen.classList.add('hidden');
        gameoverScreen.classList.add('hidden');
        isRunning = true;
    }

    // --- Event Listeners & Controls ---
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
            triggerRewind();
            e.preventDefault();
        }
    }

    // Touch Swipe Controls for Mobile
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
        skillBtn.addEventListener('click', triggerRewind);

        // Mobile D-Pad Events
        btnUp.addEventListener('click', () => { initAudio(); if (dir.y !== 1) nextDir = { x: 0, y: -1 }; });
        btnDown.addEventListener('click', () => { initAudio(); if (dir.y !== -1) nextDir = { x: 0, y: 1 }; });
        btnLeft.addEventListener('click', () => { initAudio(); if (dir.x !== 1) nextDir = { x: -1, y: 0 }; });
        btnRight.addEventListener('click', () => { initAudio(); if (dir.x !== -1) nextDir = { x: 1, y: 0 }; });

        // Help Modal Events
        helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
        closeHelpBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
        confirmHelpBtn.addEventListener('click', () => helpModal.classList.add('hidden'));

        // Sound Toggle Event
        soundBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
        });
    }

    // Initialize Application
    window.addEventListener('DOMContentLoaded', () => {
        resizeCanvas();
        setupEventListeners();
        resetGame();
        requestAnimationFrame(gameLoop);
    });

})();
