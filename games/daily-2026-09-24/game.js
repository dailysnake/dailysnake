/**
 * Daily Snake - 2026-09-24: Claymation Plasticine Odyssey (定格黏土：奇趣彩泥与塑形重构)
 * Author: Daily Snake Studio
 */

(function () {
    'use strict';

    // Game Configuration
    const GRID_SIZE = 20;
    const INITIAL_SNAKE_LEN = 4;
    const INITIAL_SPEED_MS = 140;

    // Primary Clay Types
    const CLAY_TYPES = {
        RED: { id: 'RED', color: '#ff4757', highlight: '#ff7985', shadow: '#c0392b', name: '赤红彩泥' },
        BLUE: { id: 'BLUE', color: '#2e86de', highlight: '#54a0ff', shadow: '#2980b9', name: '湛蓝彩泥' },
        YELLOW: { id: 'YELLOW', color: '#ffdd59', highlight: '#fffa65', shadow: '#f39c12', name: '亮黄彩泥' }
    };

    // Game State Variables
    let canvas, ctx;
    let gridCols = 24, gridRows = 18;
    let tileSize = 30;

    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let clayItems = [];
    let hardenedBlocks = [];
    let particleEffects = [];

    let score = 0;
    let highScore = localStorage.getItem('daily_snake_claymation_highscore') || 0;
    let fusionsCount = 0;
    let pinsUsedCount = 0;

    let isPaused = false;
    let isGameOver = false;
    let gameLoopId = null;

    let is12FpsMode = true; // Toggle for 12 FPS Stop-motion vs 60 FPS
    let lastRenderTime = 0;
    let accumulatedTime = 0;

    // Color Combo State
    let comboHistory = []; // max 2 primary colors
    let activeBuff = null; // { type: 'ORANGE_BLAST' | 'EMERALD_SHIELD' | 'PURPLE_MAGNET' | 'RAINBOW_HYPER', expire: timestamp, charges: number }

    // Rolling Pin Skill Meter
    let skillCharge = 0; // 0 to 100
    let rollingPinActive = false;
    let rollingPinProgress = 0; // 0 to 1 across screen

    // Gulping Pulse Animation for Snake Body
    let gulpPulses = []; // [{ segmentIdx: 0, progress: 0 }]

    // Audio Context & Sound Synthesizer
    let audioCtx = null;
    let soundEnabled = true;
    let bgmOsc = null;

    // DOM Elements
    const scoreValEl = document.getElementById('score-val');
    const highScoreValEl = document.getElementById('high-score-val');
    const buffValEl = document.getElementById('buff-val');
    const comboDot1El = document.getElementById('combo-dot-1');
    const comboDot2El = document.getElementById('combo-dot-2');
    const comboResultEl = document.getElementById('combo-result');
    const gaugeFillEl = document.getElementById('gauge-fill');
    const gaugeStatusTextEl = document.getElementById('gauge-status-text');
    const fpsLabelEl = document.getElementById('fps-label');
    const fpsToggleBtn = document.getElementById('fps-toggle-btn');
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    const audioOnIcon = document.getElementById('audio-on-icon');
    const audioOffIcon = document.getElementById('audio-off-icon');
    const pauseBtn = document.getElementById('pause-btn');
    const helpBtn = document.getElementById('help-btn');
    const mobileSkillBtn = document.getElementById('mobile-skill-btn');

    const gameOverModal = document.getElementById('game-over-modal');
    const pauseModal = document.getElementById('pause-modal');
    const helpModal = document.getElementById('help-modal');

    const finalScoreEl = document.getElementById('final-score');
    const finalFusionsEl = document.getElementById('final-fusions');
    const finalPinsEl = document.getElementById('final-pins');
    const restartBtn = document.getElementById('restart-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const closeHelpBtn = document.getElementById('close-help-btn');

    // Initialize Application
    window.addEventListener('DOMContentLoaded', () => {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');

        highScoreValEl.textContent = highScore;

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        bindInputEvents();
        initGame();
    });

    function resizeCanvas() {
        const viewport = document.querySelector('.game-viewport');
        if (!viewport) return;

        const w = viewport.clientWidth;
        const h = viewport.clientHeight;

        canvas.width = w;
        canvas.height = h;

        tileSize = Math.max(18, Math.min(Math.floor(w / gridCols), Math.floor(h / gridRows)));
        gridCols = Math.floor(w / tileSize);
        gridRows = Math.floor(h / tileSize);
    }

    function initGame() {
        const startX = Math.floor(gridCols / 3);
        const startY = Math.floor(gridRows / 2);

        snake = [];
        for (let i = 0; i < INITIAL_SNAKE_LEN; i++) {
            snake.push({
                x: startX - i,
                y: startY,
                color: '#2ed573',
                highlight: '#7bed9f',
                shadow: '#1e8449'
            });
        }

        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        clayItems = [];
        hardenedBlocks = [];
        particleEffects = [];
        gulpPulses = [];
        comboHistory = [];

        score = 0;
        fusionsCount = 0;
        pinsUsedCount = 0;
        skillCharge = 0;
        activeBuff = null;
        rollingPinActive = false;
        rollingPinProgress = 0;

        isPaused = false;
        isGameOver = false;

        updateHUD();
        spawnInitialClay();
        spawnHardenedBlocks(3);

        gameOverModal.classList.add('hidden');
        pauseModal.classList.add('hidden');

        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        lastRenderTime = performance.now();
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    // Spawn Clay Items
    function spawnInitialClay() {
        clayItems = [];
        const types = [CLAY_TYPES.RED, CLAY_TYPES.BLUE, CLAY_TYPES.YELLOW];
        types.forEach(t => spawnClayBall(t));
    }

    function spawnClayBall(type = null) {
        if (!type) {
            const keys = Object.keys(CLAY_TYPES);
            type = CLAY_TYPES[keys[Math.floor(Math.random() * keys.length)]];
        }

        let pt;
        let attempts = 0;
        do {
            pt = {
                x: Math.floor(Math.random() * gridCols),
                y: Math.floor(Math.random() * gridRows)
            };
            attempts++;
        } while (isOccupied(pt) && attempts < 100);

        if (attempts < 100) {
            clayItems.push({
                x: pt.x,
                y: pt.y,
                type: type,
                pulse: 0
            });
        }
    }

    function spawnHardenedBlocks(count) {
        for (let i = 0; i < count; i++) {
            let pt;
            let attempts = 0;
            do {
                pt = {
                    x: Math.floor(Math.random() * gridCols),
                    y: Math.floor(Math.random() * gridRows)
                };
                attempts++;
            } while (isOccupied(pt) && attempts < 100);

            if (attempts < 100) {
                hardenedBlocks.push({
                    x: pt.x,
                    y: pt.y,
                    hp: 1
                });
            }
        }
    }

    function isOccupied(pt) {
        if (snake.some(s => s.x === pt.x && s.y === pt.y)) return true;
        if (clayItems.some(c => c.x === pt.x && c.y === pt.y)) return true;
        if (hardenedBlocks.some(b => b.x === pt.x && b.y === pt.y)) return true;
        return false;
    }

    // Input Binding
    function bindInputEvents() {
        window.addEventListener('keydown', (e) => {
            if (isGameOver) {
                if (e.key === 'r' || e.key === 'R') initGame();
                return;
            }

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
                    triggerRollingPin();
                    break;
                case 'p':
                case 'P':
                    togglePause();
                    break;
                case 'f':
                case 'F':
                    toggleFpsMode();
                    break;
                case 'm':
                case 'M':
                    toggleAudio();
                    break;
            }
        });

        // Touch Swipe Gesture
        let touchStartX = 0, touchStartY = 0;
        canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            initAudioContext();
        }, { passive: true });

        canvas.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;

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

        // Mobile D-Pad Buttons
        document.querySelectorAll('.dpad-btn[data-dir]').forEach(btn => {
            btn.addEventListener('click', () => {
                initAudioContext();
                const d = btn.getAttribute('data-dir');
                if (d === 'up' && dir.y === 0) nextDir = { x: 0, y: -1 };
                if (d === 'down' && dir.y === 0) nextDir = { x: 0, y: 1 };
                if (d === 'left' && dir.x === 0) nextDir = { x: -1, y: 0 };
                if (d === 'right' && dir.x === 0) nextDir = { x: 1, y: 0 };
            });
        });

        mobileSkillBtn.addEventListener('click', () => {
            initAudioContext();
            triggerRollingPin();
        });

        fpsToggleBtn.addEventListener('click', toggleFpsMode);
        audioToggleBtn.addEventListener('click', toggleAudio);
        pauseBtn.addEventListener('click', togglePause);
        helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));

        restartBtn.addEventListener('click', initGame);
        resumeBtn.addEventListener('click', togglePause);
        closeHelpBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
    }

    function toggleFpsMode() {
        is12FpsMode = !is12FpsMode;
        fpsLabelEl.textContent = is12FpsMode ? '12 FPS 定格' : '60 FPS 流畅';
    }

    function togglePause() {
        if (isGameOver) return;
        isPaused = !isPaused;
        pauseModal.classList.toggle('hidden', !isPaused);
    }

    function toggleAudio() {
        soundEnabled = !soundEnabled;
        audioOnIcon.classList.toggle('hidden', !soundEnabled);
        audioOffIcon.classList.toggle('hidden', soundEnabled);
    }

    function initAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // Main Game Loop with Custom Frame Rate Management
    let lastStepTime = 0;
    function gameLoop(now) {
        gameLoopId = requestAnimationFrame(gameLoop);

        if (isPaused || isGameOver) return;

        const delta = now - lastRenderTime;
        lastRenderTime = now;

        // Snake Step Interval
        let speedMs = INITIAL_SNAKE_LEN * 2 > 60 ? Math.max(80, INITIAL_SPEED_MS - Math.floor(score / 50) * 5) : INITIAL_SPEED_MS;
        if (activeBuff && activeBuff.type === 'RAINBOW_HYPER') speedMs = Math.max(60, speedMs - 30);

        if (now - lastStepTime >= speedMs) {
            updateStep();
            lastStepTime = now;
        }

        // Rolling Pin Animation Progress
        if (rollingPinActive) {
            rollingPinProgress += 0.025;
            if (rollingPinProgress >= 1) {
                rollingPinActive = false;
                rollingPinProgress = 0;
            }
        }

        // Particle & Gulp Animation Update
        updateEffects();

        // Canvas Render
        if (is12FpsMode) {
            // Render at 12fps (every 83ms) for authentic stop-motion wiggle!
            accumulatedTime += delta;
            if (accumulatedTime >= 83) {
                render();
                accumulatedTime = 0;
            }
        } else {
            render();
        }
    }

    // Step Update Logic
    function updateStep() {
        dir = { ...nextDir };
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Check Wall Collision
        let collidedWall = false;
        if (head.x < 0 || head.x >= gridCols || head.y < 0 || head.y >= gridRows) {
            collidedWall = true;
        }

        // Check Self Collision
        let collidedSelf = false;
        if (snake.some((s, idx) => idx > 0 && s.x === head.x && s.y === head.y)) {
            collidedSelf = true;
        }

        // Check Hardened Block Collision
        let hitBlockIdx = hardenedBlocks.findIndex(b => b.x === head.x && b.y === head.y);

        // Handle Emerald Bounce Shield
        if ((collidedWall || collidedSelf || hitBlockIdx !== -1) && activeBuff && activeBuff.type === 'EMERALD_SHIELD' && activeBuff.charges > 0) {
            activeBuff.charges--;
            playBounceSound();
            createClayExplosion(head.x * tileSize + tileSize / 2, head.y * tileSize + tileSize / 2, '#10ac84', 12);
            if (activeBuff.charges <= 0) activeBuff = null;

            // Bounce back direction
            nextDir = { x: -dir.x, y: -dir.y };
            dir = { ...nextDir };
            head.x = snake[0].x + dir.x;
            head.y = snake[0].y + dir.y;
            collidedWall = false;
            collidedSelf = false;
            hitBlockIdx = -1;
            updateHUD();
        }

        // Handle Rainbow Hyper Mode (Invincible to blocks and boundaries)
        if (activeBuff && activeBuff.type === 'RAINBOW_HYPER') {
            if (collidedWall) {
                head.x = (head.x + gridCols) % gridCols;
                head.y = (head.y + gridRows) % gridRows;
                collidedWall = false;
            }
            if (hitBlockIdx !== -1) {
                const blk = hardenedBlocks[hitBlockIdx];
                createClayExplosion(blk.x * tileSize + tileSize / 2, blk.y * tileSize + tileSize / 2, '#ffdd59', 15);
                hardenedBlocks.splice(hitBlockIdx, 1);
                score += 50;
                hitBlockIdx = -1;
            }
        }

        // Game Over Trigger
        if (collidedWall || collidedSelf || hitBlockIdx !== -1) {
            triggerGameOver();
            return;
        }

        // Purple Magnet Attraction
        if (activeBuff && activeBuff.type === 'PURPLE_MAGNET') {
            clayItems.forEach(item => {
                const dist = Math.hypot(item.x - head.x, item.y - head.y);
                if (dist > 0.5 && dist < 6) {
                    item.x += Math.sign(head.x - item.x) * 0.5;
                    item.y += Math.sign(head.y - item.y) * 0.5;
                }
            });
        }

        // Move Snake Head
        snake.unshift({
            x: head.x,
            y: head.y,
            color: activeBuff && activeBuff.type === 'RAINBOW_HYPER' ? getRandomRainbowColor() : getSegmentColor(),
            highlight: '#ffffff',
            shadow: '#000000'
        });

        // Check Clay Ball Eating
        let eatenIdx = clayItems.findIndex(c => Math.round(c.x) === head.x && Math.round(c.y) === head.y);
        if (eatenIdx !== -1) {
            const eaten = clayItems[eatenIdx];
            clayItems.splice(eatenIdx, 1);

            // Add Gulping animation pulse
            gulpPulses.push({ segmentIdx: 0, progress: 0 });

            // Score & Charge
            score += 10;
            skillCharge = Math.min(100, skillCharge + 10);

            // Audio pop
            playEatSound(eaten.type.id);

            // Process Color Combo
            processColorCombo(eaten.type);

            // Spawn new clay ball
            spawnClayBall();

            // Spawn replacement hardened block occasionally
            if (Math.random() < 0.25 && hardenedBlocks.length < 6) {
                spawnHardenedBlocks(1);
            }
        } else {
            snake.pop(); // Normal movement without growth
        }

        // Update Buff Timers
        if (activeBuff && activeBuff.expire) {
            if (Date.now() > activeBuff.expire) {
                activeBuff = null;
            }
        }

        updateHUD();
    }

    // Color Combo Fusion System
    function processColorCombo(clayType) {
        comboHistory.push(clayType.id);

        if (comboHistory.length === 2) {
            const combo = comboHistory.join('+');
            if (combo === 'RED+YELLOW' || combo === 'YELLOW+RED') {
                // Orange Clay Blast
                activeBuff = { type: 'ORANGE_BLAST', expire: Date.now() + 2000 };
                triggerOrangeBlast();
                fusionsCount++;
                playFusionSound('ORANGE');
            } else if (combo === 'BLUE+YELLOW' || combo === 'YELLOW+BLUE') {
                // Emerald Shield
                activeBuff = { type: 'EMERALD_SHIELD', charges: 2 };
                fusionsCount++;
                playFusionSound('EMERALD');
            } else if (combo === 'RED+BLUE' || combo === 'BLUE+RED') {
                // Purple Magnet Void
                activeBuff = { type: 'PURPLE_MAGNET', expire: Date.now() + 8000 };
                fusionsCount++;
                playFusionSound('PURPLE');
            }
        } else if (comboHistory.length === 3) {
            // Triple Combo -> Rainbow Hyper Mode!
            activeBuff = { type: 'RAINBOW_HYPER', expire: Date.now() + 6000 };
            comboHistory = [];
            fusionsCount++;
            skillCharge = 100;
            playFusionSound('RAINBOW');
        }

        if (comboHistory.length > 3) {
            comboHistory.shift();
        }
    }

    function triggerOrangeBlast() {
        const head = snake[0];
        createClayExplosion(head.x * tileSize + tileSize / 2, head.y * tileSize + tileSize / 2, '#ff7f50', 25);

        // Smash hardened blocks in radius 3
        hardenedBlocks = hardenedBlocks.filter(blk => {
            const dist = Math.hypot(blk.x - head.x, blk.y - head.y);
            if (dist <= 3.5) {
                createClayExplosion(blk.x * tileSize + tileSize / 2, blk.y * tileSize + tileSize / 2, '#71583b', 10);
                score += 30;
                return false;
            }
            return true;
        });
    }

    // Trigger Rolling Pin Active Skill
    function triggerRollingPin() {
        if (skillCharge < 100 || rollingPinActive) return;

        skillCharge = 0;
        rollingPinActive = true;
        rollingPinProgress = 0;
        pinsUsedCount++;

        playRollingPinSound();

        // Clear all hardened blocks
        hardenedBlocks.forEach(blk => {
            createClayExplosion(blk.x * tileSize + tileSize / 2, blk.y * tileSize + tileSize / 2, '#ffdd59', 15);
            score += 50;
        });
        hardenedBlocks = [];

        // Magnetize all clay items to snake
        clayItems.forEach(item => {
            item.x = snake[0].x;
            item.y = snake[0].y;
        });

        updateHUD();
    }

    // Dynamic Segment Colors
    function getSegmentColor() {
        if (!activeBuff) return '#2ed573';
        switch (activeBuff.type) {
            case 'ORANGE_BLAST': return '#ff7f50';
            case 'EMERALD_SHIELD': return '#10ac84';
            case 'PURPLE_MAGNET': return '#9c88ff';
            case 'RAINBOW_HYPER': return getRandomRainbowColor();
            default: return '#2ed573';
        }
    }

    function getRandomRainbowColor() {
        const colors = ['#ff4757', '#ff7f50', '#ffdd59', '#2ed573', '#1e90ff', '#9c88ff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Particle & Gulp Effects Update
    function updateEffects() {
        // Gulp pulses
        gulpPulses.forEach(g => {
            g.progress += 0.15;
        });
        gulpPulses = gulpPulses.filter(g => g.progress < snake.length);

        // Particle dynamics
        particleEffects.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.02;
            p.size *= 0.95;
        });
        particleEffects = particleEffects.filter(p => p.alpha > 0);
    }

    function createClayExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            particleEffects.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 8,
                color: color,
                alpha: 1
            });
        }
    }

    // Render Canvas Frame
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Handicraft Cardboard Workbench Background
        drawWorkbenchBackground();

        // 2. Draw Hardened Clay Blocks
        drawHardenedBlocks();

        // 3. Draw Clay Balls (Red, Blue, Yellow)
        drawClayItems();

        // 4. Draw Clay Snake Body & Head
        drawSnake();

        // 5. Draw Particle Explosions
        drawParticles();

        // 6. Draw Rolling Pin Animation (if active)
        if (rollingPinActive) {
            drawRollingPin();
        }
    }

    function drawWorkbenchBackground() {
        // Wooden Felt Texture Background
        ctx.fillStyle = '#3a271d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Cardboard Grid Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    function drawHardenedBlocks() {
        hardenedBlocks.forEach(blk => {
            const px = blk.x * tileSize;
            const py = blk.y * tileSize;

            ctx.save();
            ctx.translate(px + tileSize / 2, py + tileSize / 2);

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.roundRect(-tileSize / 2 + 2, -tileSize / 2 + 4, tileSize - 4, tileSize - 4, 6);
            ctx.fill();

            // Block Body
            ctx.fillStyle = '#4a3c31';
            ctx.strokeStyle = '#2d221a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-tileSize / 2, -tileSize / 2, tileSize - 2, tileSize - 2, 6);
            ctx.fill();
            ctx.stroke();

            // Cracks texture
            ctx.strokeStyle = '#7c6553';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-tileSize / 4, -tileSize / 4);
            ctx.lineTo(0, 0);
            ctx.lineTo(tileSize / 4, -tileSize / 6);
            ctx.stroke();

            ctx.restore();
        });
    }

    function drawClayItems() {
        const time = Date.now() * 0.005;

        clayItems.forEach(item => {
            const px = item.x * tileSize + tileSize / 2;
            const py = item.y * tileSize + tileSize / 2;
            const radius = (tileSize / 2.4) + Math.sin(time) * 1.5;

            ctx.save();
            ctx.translate(px, py);

            // Drop Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.arc(2, 4, radius, 0, Math.PI * 2);
            ctx.fill();

            // 3D Spherical Radial Gradient
            const grad = ctx.createRadialGradient(-radius / 3, -radius / 3, radius / 5, 0, 0, radius);
            grad.addColorStop(0, item.type.highlight);
            grad.addColorStop(0.6, item.type.color);
            grad.addColorStop(1, item.type.shadow);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();

            // Fingerprint Bump Effect
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.6, 0, Math.PI);
            ctx.stroke();

            ctx.restore();
        });
    }

    function drawSnake() {
        if (snake.length === 0) return;

        // Draw body from tail to head
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const px = seg.x * tileSize + tileSize / 2;
            const py = seg.y * tileSize + tileSize / 2;

            // Check gulp pulse expansion
            let rPulse = 0;
            gulpPulses.forEach(g => {
                if (Math.floor(g.progress) === i) {
                    rPulse = Math.sin((g.progress % 1) * Math.PI) * 5;
                }
            });

            const baseRadius = (tileSize / 2.2) + rPulse;
            const isHead = (i === 0);

            ctx.save();
            ctx.translate(px, py);

            // Segment Drop Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.arc(3, 4, baseRadius, 0, Math.PI * 2);
            ctx.fill();

            // 3D Spherical Shading
            const color = seg.color || '#2ed573';
            const grad = ctx.createRadialGradient(-baseRadius / 3, -baseRadius / 3, baseRadius / 6, 0, 0, baseRadius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, color);
            grad.addColorStop(1, adjustColor(color, -40));

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw Head Details (Eyes & Tongue)
            if (isHead) {
                // Eyes orientation
                let eyeDx = dir.x * 6;
                let eyeDy = dir.y * 6;
                let eyeOffset = dir.x !== 0 ? 5 : 5;

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(eyeDx - dir.y * eyeOffset, eyeDy + dir.x * eyeOffset, 4, 0, Math.PI * 2);
                ctx.arc(eyeDx + dir.y * eyeOffset, eyeDy - dir.x * eyeOffset, 4, 0, Math.PI * 2);
                ctx.fill();

                // Pupil
                ctx.fillStyle = '#1e130d';
                ctx.beginPath();
                ctx.arc(eyeDx - dir.y * eyeOffset + dir.x, eyeDy + dir.x * eyeOffset + dir.y, 2, 0, Math.PI * 2);
                ctx.arc(eyeDx + dir.y * eyeOffset + dir.x, eyeDy - dir.x * eyeOffset + dir.y, 2, 0, Math.PI * 2);
                ctx.fill();

                // Cute Squishy Red Clay Tongue
                ctx.fillStyle = '#ff4757';
                ctx.beginPath();
                ctx.arc(dir.x * 12, dir.y * 12, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    function drawParticles() {
        particleEffects.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    function drawRollingPin() {
        const pinY = rollingPinProgress * canvas.height;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 8;

        // Wooden Rolling Pin Bar
        const grad = ctx.createLinearGradient(0, pinY - 20, 0, pinY + 20);
        grad.addColorStop(0, '#a67c52');
        grad.addColorStop(0.3, '#d4a373');
        grad.addColorStop(0.7, '#8a623c');
        grad.addColorStop(1, '#5c3f25');

        ctx.fillStyle = grad;
        ctx.fillRect(0, pinY - 20, canvas.width, 40);

        // Handles
        ctx.fillStyle = '#4a2e18';
        ctx.fillRect(0, pinY - 10, 25, 20);
        ctx.fillRect(canvas.width - 25, pinY - 10, 25, 20);

        ctx.restore();
    }

    // HUD Display Update
    function updateHUD() {
        scoreValEl.textContent = score;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('daily_snake_claymation_highscore', highScore);
            highScoreValEl.textContent = highScore;
        }

        // Color Combo Indicators
        comboDot1El.className = 'combo-dot ' + (comboHistory[0] ? comboHistory[0].toLowerCase() : 'empty');
        comboDot2El.className = 'combo-dot ' + (comboHistory[1] ? comboHistory[1].toLowerCase() : 'empty');

        if (comboHistory.length === 0) comboResultEl.textContent = '未融合';
        else if (comboHistory.length === 1) comboResultEl.textContent = '蓄力中...';
        else if (activeBuff) {
            switch (activeBuff.type) {
                case 'ORANGE_BLAST': comboResultEl.textContent = '🍊 橘彩爆破'; break;
                case 'EMERALD_SHIELD': comboResultEl.textContent = '🟢 翡翠弹力'; break;
                case 'PURPLE_MAGNET': comboResultEl.textContent = '🟣 紫晶磁体'; break;
                case 'RAINBOW_HYPER': comboResultEl.textContent = '🌈 七彩虹泥'; break;
            }
        }

        // Active Buff Badge
        if (activeBuff) {
            switch (activeBuff.type) {
                case 'ORANGE_BLAST': buffValEl.textContent = '橘彩震荡波'; buffValEl.className = 'hud-value clay-orange'; break;
                case 'EMERALD_SHIELD': buffValEl.textContent = `弹力护盾 (x${activeBuff.charges})`; buffValEl.className = 'hud-value clay-green'; break;
                case 'PURPLE_MAGNET': buffValEl.textContent = '紫晶全屏磁吸'; buffValEl.className = 'hud-value clay-purple'; break;
                case 'RAINBOW_HYPER': buffValEl.textContent = '七彩虹泥无敌冲刺!'; buffValEl.className = 'hud-value clay-yellow'; break;
            }
        } else {
            buffValEl.textContent = '标准黏土';
            buffValEl.className = 'hud-value clay-green';
        }

        // Rolling Pin Gauge
        gaugeFillEl.style.width = skillCharge + '%';
        if (skillCharge >= 100) {
            gaugeFillEl.classList.add('ready');
            gaugeStatusTextEl.textContent = '就绪！按 [SPACE] 或 按钮激活';
            mobileSkillBtn.classList.add('ready');
        } else {
            gaugeFillEl.classList.remove('ready');
            gaugeStatusTextEl.textContent = `揉捏蓄力中 ${skillCharge}%`;
            mobileSkillBtn.classList.remove('ready');
        }
    }

    function triggerGameOver() {
        isGameOver = true;
        playDeathSound();

        // Clay Splat particle explosion
        const head = snake[0];
        createClayExplosion(head.x * tileSize + tileSize / 2, head.y * tileSize + tileSize / 2, '#ff4757', 35);

        finalScoreEl.textContent = score;
        finalFusionsEl.textContent = fusionsCount + ' 次';
        finalPinsEl.textContent = pinsUsedCount + ' 次';

        gameOverModal.classList.remove('hidden');
    }

    // Audio Synthesizer via Web Audio API
    function playEatSound(clayType) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            const freqs = { RED: 440, BLUE: 554.37, YELLOW: 659.25 };
            const baseFreq = freqs[clayType] || 440;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioCtx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } catch (e) {}
    }

    function playFusionSound(type) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const freqs = [523.25, 659.25, 783.99, 1046.50];
            freqs.forEach((f, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, audioCtx.currentTime + i * 0.05);

                gain.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.05 + 0.3);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start(audioCtx.currentTime + i * 0.05);
                osc.stop(audioCtx.currentTime + i * 0.05 + 0.3);
            });
        } catch (e) {}
    }

    function playBounceSound() {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.15);

            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } catch (e) {}
    }

    function playRollingPinSound() {
        if (!soundEnabled || !audioCtx) return;
        try {
            const bufferSize = audioCtx.sampleRate * 0.5;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
            }

            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 250;

            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            noise.start();
        } catch (e) {}
    }

    function playDeathSound() {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.4);

            gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        } catch (e) {}
    }

    // Helper Utility Function
    function adjustColor(hex, amount) {
        let usePound = false;
        if (hex[0] == "#") {
            hex = hex.slice(1);
            usePound = true;
        }
        let num = parseInt(hex, 16);
        let r = (num >> 16) + amount;
        if (r > 255) r = 255; else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amount;
        if (b > 255) b = 255; else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amount;
        if (g > 255) g = 255; else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
    }
})();
