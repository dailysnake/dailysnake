/**
 * DAILY SNAKE (2026-08-15) - 天球星轨：星宿织梦与重力透镜
 * Celestial Astrolabe & Constellation Canvas Engine
 */

(function () {
    'use strict';

    // --- Configuration & Constants ---
    const GRID_COLS = 40;
    const GRID_ROWS = 30;
    const CELL_SIZE = 20; // 800x600 canvas
    const GAME_SPEED = 90; // ms per tick

    // Constellations Definitions (Real Astronomical Patterns)
    const CONSTELLATIONS = [
        { name: '天鹅座 (Cygnus)', latin: 'Cygnus', count: 5, color: '#00f0ff' },
        { name: '猎户座 (Orion)', latin: 'Orion', count: 6, color: '#f0cc6b' },
        { name: '仙后座 (Cassiopeia)', latin: 'Cassiopeia', count: 5, color: '#e2f1ff' },
        { name: '北斗七星 (Ursa Major)', latin: 'Ursa Major', count: 7, color: '#a259ff' },
        { name: '飞马座 (Pegasus)', latin: 'Pegasus', count: 4, color: '#ff5252' },
        { name: '狮子座 (Leo)', latin: 'Leo', count: 6, color: '#5de6fe' }
    ];

    // --- Game State Variables ---
    let canvas, ctx;
    let gameState = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
    let gameLoopId = null;

    let score = 0;
    let highscore = 0;
    let comboMultiplier = 1.0;
    let comboTimer = 0;

    // Snake State
    let snake = [];
    let direction = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let growPending = 0;

    // Constellation System State
    let currentConstIndex = 0;
    let constProgress = 0; // Number of stars collected in current constellation
    let activeConstNode = null; // Position of the next target constellation node
    let collectedConstNodes = []; // List of collected positions for drawing lines
    let completedConstellationsCount = 0;

    // Star Foods
    let regularStars = [];

    // Gravitational Lens Ability State
    let gravEnergy = 100; // 0 to 100
    let isGravActive = false;
    let gravUsesCount = 0;

    // Space Obstacles & Dynamic Events
    let asteroids = [];
    let meteors = [];
    let particles = [];
    let shockwaves = [];
    let floatingTexts = [];

    let eventTimer = 0;
    let isMeteorShower = false;
    let meteorShowerTimer = 0;

    // Web Audio Synthesizer
    let audioCtx = null;
    let soundEnabled = true;

    // --- Web Audio Synth Functions ---
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

    function playTone(freq, duration, type = 'sine', gainVal = 0.15) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {}
    }

    function playEatSound() {
        initAudio();
        playTone(523.25, 0.1, 'sine', 0.12); // C5
        setTimeout(() => playTone(659.25, 0.12, 'sine', 0.12), 40); // E5
    }

    function playConstNodeSound(step) {
        initAudio();
        const freqs = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
        const f = freqs[step % freqs.length];
        playTone(f, 0.2, 'triangle', 0.2);
    }

    function playNovaSound() {
        initAudio();
        if (!soundEnabled || !audioCtx) return;
        const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        freqs.forEach((f, i) => {
            setTimeout(() => playTone(f, 0.35, 'sine', 0.25), i * 60);
        });
    }

    function playGravBoostSound() {
        initAudio();
        playTone(150, 0.15, 'sawtooth', 0.08);
    }

    function playGameOverSound() {
        initAudio();
        if (!soundEnabled || !audioCtx) return;
        const freqs = [440, 415.3, 392, 349.23];
        freqs.forEach((f, i) => {
            setTimeout(() => playTone(f, 0.3, 'sawtooth', 0.15), i * 100);
        });
    }

    // --- DOM Elements ---
    let scoreValEl, highscoreValEl, constNameEl, constDotsEl, energyBarInnerEl, comboValEl;
    let startOverlay, pauseOverlay, gameoverOverlay, helpModal;
    let finalScoreEl, finalConstsEl, finalGravUsesEl, finalHighscoreEl;

    // --- Initialization ---
    window.addEventListener('DOMContentLoaded', () => {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');

        // Highscore Load
        highscore = parseInt(localStorage.getItem('daily_snake_2026_08_15_highscore') || '0', 10);

        // Bind DOM
        scoreValEl = document.getElementById('score-val');
        highscoreValEl = document.getElementById('highscore-val');
        constNameEl = document.getElementById('constellation-name');
        constDotsEl = document.getElementById('const-dots');
        energyBarInnerEl = document.getElementById('energy-bar-inner');
        comboValEl = document.getElementById('combo-val');

        startOverlay = document.getElementById('start-overlay');
        pauseOverlay = document.getElementById('pause-overlay');
        gameoverOverlay = document.getElementById('gameover-overlay');
        helpModal = document.getElementById('help-modal');

        finalScoreEl = document.getElementById('final-score');
        finalConstsEl = document.getElementById('final-constellations');
        finalGravUsesEl = document.getElementById('final-grav-uses');
        finalHighscoreEl = document.getElementById('final-highscore');

        highscoreValEl.textContent = highscore;

        // Button Event Listeners
        document.getElementById('btn-start').addEventListener('click', startGame);
        document.getElementById('btn-restart').addEventListener('click', startGame);
        document.getElementById('btn-resume').addEventListener('click', togglePause);
        document.getElementById('btn-pause').addEventListener('click', togglePause);
        document.getElementById('btn-sound').addEventListener('click', toggleSound);

        document.getElementById('btn-help').addEventListener('click', () => helpModal.classList.remove('hidden'));
        document.getElementById('btn-close-help').addEventListener('click', () => helpModal.classList.add('hidden'));

        document.getElementById('btn-share').addEventListener('click', shareScore);

        // Controls Setup
        setupInputHandlers();

        // Initial Canvas Background Draw
        resetGameVars();
        drawCanvas();
    });

    function toggleSound() {
        soundEnabled = !soundEnabled;
        document.getElementById('sound-icon-on').classList.toggle('hidden', !soundEnabled);
        document.getElementById('sound-icon-off').classList.toggle('hidden', soundEnabled);
    }

    function shareScore() {
        const text = `我在 Daily Snake 每日贪吃蛇《天球星轨》(2026-08-15) 中获得 ${score} 分，完成了 ${completedConstellationsCount} 座星座织梦！快来挑战：https://dailysnake.org/games/daily-2026-08-15/`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert('成绩成果已复制到剪贴板！');
            }).catch(() => {
                alert(text);
            });
        } else {
            alert(text);
        }
    }

    // --- Input Handling ---
    function setupInputHandlers() {
        // PC Keyboard
        window.addEventListener('keydown', (e) => {
            initAudio();
            if (['ArrowUp', 'KeyW'].includes(e.code)) {
                if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
            } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
                if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
            } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
                if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
            } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
                if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
            } else if (e.code === 'Space') {
                e.preventDefault();
                activateGravLens(true);
            } else if (e.code === 'KeyP') {
                togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                activateGravLens(false);
            }
        });

        // Mobile D-Pad
        document.getElementById('dpad-up').addEventListener('touchstart', (e) => { e.preventDefault(); if (direction.y !== 1) nextDirection = { x: 0, y: -1 }; });
        document.getElementById('dpad-down').addEventListener('touchstart', (e) => { e.preventDefault(); if (direction.y !== -1) nextDirection = { x: 0, y: 1 }; });
        document.getElementById('dpad-left').addEventListener('touchstart', (e) => { e.preventDefault(); if (direction.x !== 1) nextDirection = { x: -1, y: 0 }; });
        document.getElementById('dpad-right').addEventListener('touchstart', (e) => { e.preventDefault(); if (direction.x !== -1) nextDirection = { x: 1, y: 0 }; });

        document.getElementById('dpad-up').addEventListener('click', () => { if (direction.y !== 1) nextDirection = { x: 0, y: -1 }; });
        document.getElementById('dpad-down').addEventListener('click', () => { if (direction.y !== -1) nextDirection = { x: 0, y: 1 }; });
        document.getElementById('dpad-left').addEventListener('click', () => { if (direction.x !== 1) nextDirection = { x: -1, y: 0 }; });
        document.getElementById('dpad-right').addEventListener('click', () => { if (direction.x !== -1) nextDirection = { x: 1, y: 0 }; });

        // Grav Skill Button Mobile
        const skillBtn = document.getElementById('btn-grav-skill');
        skillBtn.addEventListener('touchstart', (e) => { e.preventDefault(); activateGravLens(true); });
        skillBtn.addEventListener('touchend', (e) => { e.preventDefault(); activateGravLens(false); });
        skillBtn.addEventListener('mousedown', () => activateGravLens(true));
        skillBtn.addEventListener('mouseup', () => activateGravLens(false));

        // Touch Canvas Swipe Fallback
        let touchStartX = 0;
        let touchStartY = 0;
        canvas.addEventListener('touchstart', (e) => {
            initAudio();
            if (e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        canvas.addEventListener('touchend', (e) => {
            if (e.changedTouches.length > 0) {
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 25) {
                    if (dx > 0 && direction.x !== -1) nextDirection = { x: 1, y: 0 };
                    else if (dx < 0 && direction.x !== 1) nextDirection = { x: -1, y: 0 };
                } else if (Math.abs(dy) > 25) {
                    if (dy > 0 && direction.y !== -1) nextDirection = { x: 0, y: 1 };
                    else if (dy < 0 && direction.y !== 1) nextDirection = { x: 0, y: -1 };
                }
            }
        }, { passive: true });
    }

    function activateGravLens(active) {
        if (gameState !== 'PLAYING') return;
        if (active && gravEnergy > 5) {
            if (!isGravActive) gravUsesCount++;
            isGravActive = true;
            playGravBoostSound();
        } else {
            isGravActive = false;
        }
    }

    // --- Game Cycle & Flow ---
    function resetGameVars() {
        score = 0;
        comboMultiplier = 1.0;
        comboTimer = 0;
        gravEnergy = 100;
        isGravActive = false;
        gravUsesCount = 0;
        completedConstellationsCount = 0;
        growPending = 0;

        // Reset Snake
        const startX = Math.floor(GRID_COLS / 2);
        const startY = Math.floor(GRID_ROWS / 2);
        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };

        // Reset Constellation
        currentConstIndex = 0;
        constProgress = 0;
        collectedConstNodes = [];
        spawnConstellationTargetNode();

        // Reset Regular Stars
        regularStars = [];
        for (let i = 0; i < 4; i++) {
            spawnRegularStar();
        }

        // Reset Obstacles & Arrays
        asteroids = [];
        for (let i = 0; i < 3; i++) {
            spawnAsteroid();
        }

        meteors = [];
        particles = [];
        shockwaves = [];
        floatingTexts = [];
        eventTimer = 0;
        isMeteorShower = false;

        updateHUD();
    }

    function startGame() {
        initAudio();
        resetGameVars();
        gameState = 'PLAYING';

        startOverlay.classList.add('hidden');
        pauseOverlay.classList.add('hidden');
        gameoverOverlay.classList.add('hidden');

        if (gameLoopId) clearInterval(gameLoopId);
        gameLoopId = setInterval(gameStep, GAME_SPEED);
    }

    function togglePause() {
        if (gameState === 'PLAYING') {
            gameState = 'PAUSED';
            pauseOverlay.classList.remove('hidden');
            if (gameLoopId) clearInterval(gameLoopId);
        } else if (gameState === 'PAUSED') {
            gameState = 'PLAYING';
            pauseOverlay.classList.add('hidden');
            gameLoopId = setInterval(gameStep, GAME_SPEED);
        }
    }

    function gameOver() {
        gameState = 'GAMEOVER';
        if (gameLoopId) clearInterval(gameLoopId);
        playGameOverSound();

        if (score > highscore) {
            highscore = score;
            localStorage.setItem('daily_snake_2026_08_15_highscore', highscore.toString());
            highscoreValEl.textContent = highscore;
        }

        finalScoreEl.textContent = score;
        finalConstsEl.textContent = `${completedConstellationsCount} 座`;
        finalGravUsesEl.textContent = `${gravUsesCount} 次`;
        finalHighscoreEl.textContent = highscore;

        gameoverOverlay.classList.remove('hidden');
    }

    // --- Spawning Logic ---
    function getRandomEmptyPos() {
        let attempts = 0;
        while (attempts < 200) {
            const x = Math.floor(Math.random() * GRID_COLS);
            const y = Math.floor(Math.random() * GRID_ROWS);

            // Avoid Snake
            const onSnake = snake.some(seg => seg.x === x && seg.y === y);
            if (onSnake) { attempts++; continue; }

            // Avoid Constellation Node
            if (activeConstNode && activeConstNode.x === x && activeConstNode.y === y) { attempts++; continue; }

            return { x, y };
        }
        return { x: 5, y: 5 };
    }

    function spawnConstellationTargetNode() {
        const pos = getRandomEmptyPos();
        activeConstNode = {
            x: pos.x,
            y: pos.y,
            index: constProgress + 1,
            pulse: 0
        };
    }

    function spawnRegularStar() {
        const pos = getRandomEmptyPos();
        const types = ['alpha', 'beta', 'pulsar'];
        const rand = Math.random();
        let type = 'alpha';
        let val = 10;
        let color = '#f0cc6b';

        if (rand > 0.85) {
            type = 'pulsar'; val = 50; color = '#a259ff';
        } else if (rand > 0.6) {
            type = 'beta'; val = 20; color = '#00f0ff';
        }

        regularStars.push({
            x: pos.x * CELL_SIZE + CELL_SIZE / 2,
            y: pos.y * CELL_SIZE + CELL_SIZE / 2,
            gridX: pos.x,
            gridY: pos.y,
            type,
            val,
            color,
            radius: type === 'pulsar' ? 6 : 5,
            pulse: Math.random() * Math.PI * 2
        });
    }

    function spawnAsteroid() {
        const pos = getRandomEmptyPos();
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.0;
        asteroids.push({
            x: pos.x * CELL_SIZE + CELL_SIZE / 2,
            y: pos.y * CELL_SIZE + CELL_SIZE / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 10 + Math.random() * 6,
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.05
        });
    }

    function triggerMeteorShower() {
        isMeteorShower = true;
        meteorShowerTimer = 80;
        createFloatingText('☄️ 流星雨降临！(METEOR SHOWER)', canvas.width / 2, 80, '#ffd700', 30);
    }

    function spawnMeteor() {
        const startX = Math.random() * canvas.width;
        meteors.push({
            x: startX,
            y: -20,
            vx: 4 + Math.random() * 3,
            vy: 6 + Math.random() * 4,
            length: 25 + Math.random() * 20,
            val: 50
        });
    }

    // --- Main Game Step ---
    function gameStep() {
        if (gameState !== 'PLAYING') return;

        // Apply Next Direction
        direction = { ...nextDirection };

        // Gravitational Lens Energy Consumption & Attraction Logic
        const headPixel = {
            x: snake[0].x * CELL_SIZE + CELL_SIZE / 2,
            y: snake[0].y * CELL_SIZE + CELL_SIZE / 2
        };

        if (isGravActive) {
            gravEnergy -= 2.5;
            if (gravEnergy <= 0) {
                gravEnergy = 0;
                isGravActive = false;
            }
            createParticles(headPixel.x, headPixel.y, 2, '#00f0ff');

            // Gravitational Pull on Regular Stars
            regularStars.forEach(star => {
                const dx = headPixel.x - star.x;
                const dy = headPixel.y - star.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 180 && dist > 5) {
                    star.x += (dx / dist) * 3.5;
                    star.y += (dy / dist) * 3.5;
                    star.gridX = Math.floor(star.x / CELL_SIZE);
                    star.gridY = Math.floor(star.y / CELL_SIZE);
                }
            });
        } else {
            gravEnergy = Math.min(100, gravEnergy + 0.3);
        }

        // Calculate New Head Grid Position
        const newHead = {
            x: snake[0].x + direction.x,
            y: snake[0].y + direction.y
        };

        // Wall Collision (Wrap around or Wall bounce - let's do wrapping with golden portal boundaries)
        if (newHead.x < 0) newHead.x = GRID_COLS - 1;
        if (newHead.x >= GRID_COLS) newHead.x = 0;
        if (newHead.y < 0) newHead.y = GRID_ROWS - 1;
        if (newHead.y >= GRID_ROWS) newHead.y = 0;

        // Self Collision (Unless Grav Shield active)
        if (!isGravActive) {
            for (let i = 0; i < snake.length - 1; i++) {
                if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
                    gameOver();
                    return;
                }
            }
        }

        // Move Snake
        snake.unshift(newHead);

        if (growPending > 0) {
            growPending--;
        } else {
            snake.pop();
        }

        // Check Collision with Regular Stars
        const newHeadPixel = {
            x: newHead.x * CELL_SIZE + CELL_SIZE / 2,
            y: newHead.y * CELL_SIZE + CELL_SIZE / 2
        };

        for (let i = regularStars.length - 1; i >= 0; i--) {
            const star = regularStars[i];
            const dist = Math.hypot(newHeadPixel.x - star.x, newHeadPixel.y - star.y);
            if (dist < CELL_SIZE * 0.9) {
                // Eat Regular Star
                const pts = Math.round(star.val * comboMultiplier);
                score += pts;
                growPending += 1;
                gravEnergy = Math.min(100, gravEnergy + 8);
                playEatSound();

                createParticles(star.x, star.y, 10, star.color);
                createFloatingText(`+${pts}`, star.x, star.y, star.color);

                regularStars.splice(i, 1);
                spawnRegularStar();

                comboTimer = 40;
                comboMultiplier = Math.min(5.0, comboMultiplier + 0.2);
            }
        }

        // Check Collision with Active Constellation Target Node
        if (activeConstNode) {
            if (newHead.x === activeConstNode.x && newHead.y === activeConstNode.y) {
                // Eat Constellation Node
                const currentConst = CONSTELLATIONS[currentConstIndex];
                constProgress++;
                collectedConstNodes.push({ x: activeConstNode.x, y: activeConstNode.y });

                playConstNodeSound(constProgress);
                createParticles(newHeadPixel.x, newHeadPixel.y, 16, currentConst.color);
                createFloatingText(`★ 星节 ${constProgress}/${currentConst.count}`, newHeadPixel.x, newHeadPixel.y, '#ffd700');

                if (constProgress >= currentConst.count) {
                    // Completed Constellation!
                    triggerConstellationNova(currentConst);
                } else {
                    spawnConstellationTargetNode();
                }
            }
        }

        // Asteroids Physics & Collision
        asteroids.forEach(ast => {
            ast.x += ast.vx;
            ast.y += ast.vy;
            ast.angle += ast.rotSpeed;

            // Bounce off boundaries
            if (ast.x < 15 || ast.x > canvas.width - 15) ast.vx *= -1;
            if (ast.y < 15 || ast.y > canvas.height - 15) ast.vy *= -1;

            // Collision with Snake Head
            const distAst = Math.hypot(newHeadPixel.x - ast.x, newHeadPixel.y - ast.y);
            if (distAst < ast.radius + 8) {
                if (isGravActive) {
                    // Destroy asteroid when in grav boost
                    createParticles(ast.x, ast.y, 15, '#ff5252');
                    ast.x = -100;
                    ast.y = -100;
                } else {
                    gameOver();
                    return;
                }
            }
        });

        // Event Timers (Meteor Showers)
        eventTimer++;
        if (eventTimer > 350 && Math.random() < 0.05) {
            triggerMeteorShower();
            eventTimer = 0;
        }

        if (isMeteorShower) {
            meteorShowerTimer--;
            if (Math.random() < 0.3) spawnMeteor();
            if (meteorShowerTimer <= 0) isMeteorShower = false;
        }

        // Meteors physics & collision
        for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            m.x += m.vx;
            m.y += m.vy;

            // Check head collision
            const distM = Math.hypot(newHeadPixel.x - m.x, newHeadPixel.y - m.y);
            if (distM < 20) {
                score += m.val * 2;
                createParticles(m.x, m.y, 20, '#ffd700');
                createFloatingText(`☄️ +${m.val * 2}`, m.x, m.y, '#ffd700');
                playEatSound();
                meteors.splice(i, 1);
                continue;
            }

            if (m.x > canvas.width + 50 || m.y > canvas.height + 50) {
                meteors.splice(i, 1);
            }
        }

        // Combo decay
        if (comboTimer > 0) {
            comboTimer--;
            if (comboTimer <= 0) {
                comboMultiplier = 1.0;
            }
        }

        updateHUD();
        drawCanvas();
    }

    function triggerConstellationNova(constDef) {
        completedConstellationsCount++;
        score += 300;
        gravEnergy = 100;

        playNovaSound();
        shockwaves.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: 10,
            maxRadius: 400,
            color: constDef.color
        });

        createFloatingText(`★ 【${constDef.name}】 织梦完成！全屏星爆！`, canvas.width / 2, canvas.height / 2 - 40, '#ffd700', 28);

        // Clear Asteroids and respawn
        asteroids.forEach(ast => {
            createParticles(ast.x, ast.y, 12, '#a259ff');
        });
        asteroids = [];
        for (let i = 0; i < 3; i++) {
            spawnAsteroid();
        }

        // Advance Constellation
        currentConstIndex = (currentConstIndex + 1) % CONSTELLATIONS.length;
        constProgress = 0;
        collectedConstNodes = [];
        spawnConstellationTargetNode();
    }

    // --- Particle & Visual Effects ---
    function createParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                radius: 2 + Math.random() * 3,
                alpha: 1,
                decay: 0.03 + Math.random() * 0.03
            });
        }
    }

    function createFloatingText(text, x, y, color = '#fff', size = 16) {
        floatingTexts.push({
            text, x, y, color, size,
            alpha: 1,
            vy: -1.2
        });
    }

    // --- Canvas Rendering Engine ---
    function drawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Astrolabe Vintage Grid & Stars Background
        drawAstrolabeBackground();

        // 2. Draw Constellation Progress Lines
        drawConstellationLines();

        // 3. Draw Regular Star Foods
        regularStars.forEach(star => {
            star.pulse += 0.08;
            const glowR = star.radius + Math.sin(star.pulse) * 1.5;

            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = star.color;
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(star.x, star.y, glowR, 0, Math.PI * 2);
            ctx.fill();

            // Star Sparkle Cross
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(star.x - glowR * 1.6, star.y);
            ctx.lineTo(star.x + glowR * 1.6, star.y);
            ctx.moveTo(star.x, star.y - glowR * 1.6);
            ctx.lineTo(star.x, star.y + glowR * 1.6);
            ctx.stroke();
            ctx.restore();
        });

        // 4. Draw Active Constellation Target Node
        if (activeConstNode) {
            activeConstNode.pulse += 0.1;
            const px = activeConstNode.x * CELL_SIZE + CELL_SIZE / 2;
            const py = activeConstNode.y * CELL_SIZE + CELL_SIZE / 2;
            const curConst = CONSTELLATIONS[currentConstIndex];

            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = curConst.color;

            // Outer Pulsing Ring
            const ringR = CELL_SIZE * 0.7 + Math.sin(activeConstNode.pulse) * 4;
            ctx.strokeStyle = curConst.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, ringR, 0, Math.PI * 2);
            ctx.stroke();

            // Core Node
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();

            // Index Tag
            ctx.fillStyle = curConst.color;
            ctx.font = 'bold 12px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`★${activeConstNode.index}`, px, py - 14);
            ctx.restore();
        }

        // 5. Draw Asteroids
        asteroids.forEach(ast => {
            ctx.save();
            ctx.translate(ast.x, ast.y);
            ctx.rotate(ast.angle);
            ctx.fillStyle = '#2d3748';
            ctx.strokeStyle = '#a259ff';
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.arc(0, 0, ast.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        // 6. Draw Meteors
        meteors.forEach(m => {
            ctx.save();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m.x - m.vx * 3, m.y - m.vy * 3);
            ctx.stroke();
            ctx.restore();
        });

        // 7. Draw Snake (Starlight Ribbon Body)
        ctx.save();
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const px = seg.x * CELL_SIZE + CELL_SIZE / 2;
            const py = seg.y * CELL_SIZE + CELL_SIZE / 2;

            if (i === 0) {
                // Head (Astrolabe Star Compass)
                ctx.shadowBlur = isGravActive ? 25 : 15;
                ctx.shadowColor = isGravActive ? '#00f0ff' : '#f0cc6b';
                ctx.fillStyle = isGravActive ? '#00f0ff' : '#f0cc6b';

                ctx.beginPath();
                ctx.arc(px, py, CELL_SIZE * 0.55, 0, Math.PI * 2);
                ctx.fill();

                // Direction Eye/Needle
                ctx.fillStyle = '#080c1a';
                ctx.beginPath();
                ctx.arc(px + direction.x * 4, py + direction.y * 4, 3, 0, Math.PI * 2);
                ctx.fill();

                // Gravitational Field Circle if Active
                if (isGravActive) {
                    ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(px, py, 120, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else {
                // Body Segment Gradient
                const ratio = i / snake.length;
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
                ctx.fillStyle = `hsl(${200 + ratio * 60}, 90%, ${70 - ratio * 30}%)`;

                const r = (CELL_SIZE * 0.45) * (1 - ratio * 0.4);
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();

        // 8. Draw Particles & Shockwaves
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.radius += 12;
            const alpha = 1 - sw.radius / sw.maxRadius;

            if (sw.radius >= sw.maxRadius) {
                shockwaves.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = sw.color;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 9. Draw Floating Texts
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.02;

            if (ft.alpha <= 0) {
                floatingTexts.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.font = `bold ${ft.size}px Noto Sans SC, Outfit, sans-serif`;
            ctx.fillStyle = ft.color;
            ctx.textAlign = 'center';
            ctx.shadowBlur = 10;
            ctx.shadowColor = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    function drawAstrolabeBackground() {
        // Celestial Grid Lines
        ctx.strokeStyle = 'rgba(240, 204, 107, 0.05)';
        ctx.lineWidth = 1;

        for (let c = 0; c <= GRID_COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * CELL_SIZE, 0);
            ctx.lineTo(c * CELL_SIZE, canvas.height);
            ctx.stroke();
        }
        for (let r = 0; r <= GRID_ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * CELL_SIZE);
            ctx.lineTo(canvas.width, r * CELL_SIZE);
            ctx.stroke();
        }

        // Astrolabe Brass Concentric Rings
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        ctx.strokeStyle = 'rgba(240, 204, 107, 0.08)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 270, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawConstellationLines() {
        if (collectedConstNodes.length < 1) return;
        const curConst = CONSTELLATIONS[currentConstIndex];

        ctx.save();
        ctx.strokeStyle = curConst.color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = curConst.color;

        ctx.beginPath();
        collectedConstNodes.forEach((pt, index) => {
            const px = pt.x * CELL_SIZE + CELL_SIZE / 2;
            const py = pt.y * CELL_SIZE + CELL_SIZE / 2;
            if (index === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Draw node points
        collectedConstNodes.forEach((pt) => {
            const px = pt.x * CELL_SIZE + CELL_SIZE / 2;
            const py = pt.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    // --- HUD Updating ---
    function updateHUD() {
        if (scoreValEl) scoreValEl.textContent = score;
        if (comboValEl) comboValEl.textContent = `x${comboMultiplier.toFixed(1)}`;

        if (constNameEl) {
            const curConst = CONSTELLATIONS[currentConstIndex];
            constNameEl.textContent = `${curConst.name} (${constProgress}/${curConst.count})`;
            constNameEl.style.color = curConst.color;
        }

        if (constDotsEl) {
            const curConst = CONSTELLATIONS[currentConstIndex];
            let dotsHtml = '';
            for (let i = 0; i < curConst.count; i++) {
                const active = i < constProgress ? 'active' : '';
                dotsHtml += `<div class="const-dot ${active}"></div>`;
            }
            constDotsEl.innerHTML = dotsHtml;
        }

        if (energyBarInnerEl) {
            energyBarInnerEl.style.width = `${Math.max(0, Math.min(100, gravEnergy))}%`;
        }
    }

})();
