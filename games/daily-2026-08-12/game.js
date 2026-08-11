/**
 * Steampunk Clockwork Automaton Snake (Daily Snake 2026-08-12)
 * Pure JavaScript game engine with Canvas 2D rendering & Web Audio Synthesizer
 */

(() => {
    // Canvas & Context
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Grid Constants
    const GRID_COUNT = 20; // 20x20 grid
    const CELL_SIZE = canvas.width / GRID_COUNT; // 30px per cell
    
    // Game State Variables
    let gameLoopId = null;
    let lastRenderTime = 0;
    let moveInterval = 120; // ms per step (speeds up slightly as score grows)
    let isRunning = false;
    let isPaused = false;
    let isGameOver = false;

    // Snake State
    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let inputQueue = [];

    // Food & Items
    let items = []; // { x, y, type: 'cog'|'ruby'|'spring', angle: 0 }
    let hazards = []; // { x, y, angle: 0, speed: 0.05 }

    // Score & Steam Mechanics
    let score = 0;
    let highScore = parseInt(localStorage.getItem('steampunk_snake_highscore') || '0', 10);
    let combo = 1;
    let maxCombo = 1;
    let lastCollectTime = 0;
    let steamPressure = 0; // 0 to 100
    let isSteamActive = false;
    let steamTimeLeft = 0;
    let totalSteamBlasts = 0;

    // Visual & Particle Effects
    let particles = [];
    let floatingTexts = [];
    let screenShakeTime = 0;
    let gearRotationGlobal = 0;

    // Web Audio Synthesizer
    let audioCtx = null;
    let isSoundMuted = false;

    // UI Elements
    const scoreVal = document.getElementById('score-val');
    const highScoreVal = document.getElementById('high-score-val');
    const comboVal = document.getElementById('combo-val');
    const energyBarFill = document.getElementById('energy-bar-fill');
    const steamOverlay = document.getElementById('steam-overlay');

    const startScreen = document.getElementById('start-screen');
    const pauseScreen = document.getElementById('pause-screen');
    const gameOverScreen = document.getElementById('gameover-screen');
    const helpModal = document.getElementById('help-modal');

    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const soundBtn = document.getElementById('sound-btn');
    const soundIcon = document.getElementById('sound-icon');
    const helpBtn = document.getElementById('help-btn');
    const closeHelpBtn = document.getElementById('close-help-btn');
    const shareBtn = document.getElementById('share-btn');

    // Final Stats
    const finalScore = document.getElementById('final-score');
    const finalHighScore = document.getElementById('final-high-score');
    const finalMaxCombo = document.getElementById('final-max-combo');
    const finalSteamBlasts = document.getElementById('final-steam-blasts');

    // Init UI
    highScoreVal.textContent = highScore;

    // ----------------------------------------------------
    // Audio Synthesizer (Web Audio API)
    // ----------------------------------------------------
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
        if (isSoundMuted || !audioCtx) return;

        try {
            const now = audioCtx.currentTime;

            if (type === 'cog') {
                // Brass Cog: Dual metallic chime
                const osc1 = audioCtx.createOscillator();
                const osc2 = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc1.type = 'triangle';
                osc2.type = 'sine';

                osc1.frequency.setValueAtTime(587.33, now); // D5
                osc2.frequency.setValueAtTime(1174.66, now); // D6

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(audioCtx.destination);

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 0.15);
                osc2.stop(now + 0.15);

            } else if (type === 'ruby') {
                // Ruby Valve: Ascending major triad chime
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.04);
                    gain.gain.setValueAtTime(0.25, now + idx * 0.04);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.2);

                    osc.connect(gain);
                    gain.connect(audioCtx.destination);

                    osc.start(now + idx * 0.04);
                    osc.stop(now + idx * 0.04 + 0.2);
                });

            } else if (type === 'steam') {
                // Steam Blast: Bandpass noise sweep
                const bufferSize = audioCtx.sampleRate * 0.4;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }

                const noise = audioCtx.createBufferSource();
                noise.buffer = buffer;

                const filter = audioCtx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(800, now);
                filter.frequency.exponentialRampToValueAtTime(3500, now + 0.2);
                filter.Q.value = 3.0;

                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(audioCtx.destination);

                noise.start(now);
                noise.stop(now + 0.4);

            } else if (type === 'destroy') {
                // Destroy hazard crunch
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(160, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start(now);
                osc.stop(now + 0.25);

            } else if (type === 'gameover') {
                // Brass tube dissonant drop
                const osc1 = audioCtx.createOscillator();
                const osc2 = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc1.type = 'sawtooth';
                osc2.type = 'square';

                osc1.frequency.setValueAtTime(220, now);
                osc1.frequency.exponentialRampToValueAtTime(60, now + 0.6);

                osc2.frequency.setValueAtTime(233.08, now); // Minor second dissonance
                osc2.frequency.exponentialRampToValueAtTime(63, now + 0.6);

                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(audioCtx.destination);

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 0.6);
                osc2.stop(now + 0.6);
            }
        } catch (e) {
            console.error('Audio synth error', e);
        }
    }

    // ----------------------------------------------------
    // Game Initialization & Reset
    // ----------------------------------------------------
    function initGame() {
        snake = [
            { x: 5, y: 10 },
            { x: 4, y: 10 },
            { x: 3, y: 10 }
        ];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        inputQueue = [];

        score = 0;
        combo = 1;
        maxCombo = 1;
        lastCollectTime = 0;
        steamPressure = 20; // start with a little steam
        isSteamActive = false;
        steamTimeLeft = 0;
        totalSteamBlasts = 0;
        moveInterval = 125;

        particles = [];
        floatingTexts = [];
        items = [];
        hazards = [];

        // Spawn initial food and hazards
        spawnItem('cog');
        spawnItem('cog');
        spawnItem('ruby');
        spawnHazard();
        spawnHazard();

        updateUI();
        isGameOver = false;
        isPaused = false;
        isRunning = true;

        startScreen.classList.remove('active');
        pauseScreen.classList.remove('active');
        gameOverScreen.classList.remove('active');
        steamOverlay.classList.remove('active');

        lastRenderTime = performance.now();
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    // ----------------------------------------------------
    // Spawning Functions
    // ----------------------------------------------------
    function getRandomEmptyCell() {
        let attempts = 0;
        while (attempts < 200) {
            const x = Math.floor(Math.random() * GRID_COUNT);
            const y = Math.floor(Math.random() * GRID_COUNT);

            const inSnake = snake.some(seg => seg.x === x && seg.y === y);
            const inItem = items.some(it => it.x === x && it.y === y);
            const inHazard = hazards.some(hz => hz.x === x && hz.y === y);

            if (!inSnake && !inItem && !inHazard) {
                return { x, y };
            }
            attempts++;
        }
        return { x: 10, y: 10 };
    }

    function spawnItem(forcedType = null) {
        const cell = getRandomEmptyCell();
        let type = forcedType;
        if (!type) {
            const rand = Math.random();
            if (rand < 0.65) type = 'cog';
            else if (rand < 0.85) type = 'ruby';
            else type = 'spring';
        }
        items.push({
            x: cell.x,
            y: cell.y,
            type: type,
            angle: Math.random() * Math.PI * 2
        });
    }

    function spawnHazard() {
        if (hazards.length >= 4) return;
        const cell = getRandomEmptyCell();
        hazards.push({
            x: cell.x,
            y: cell.y,
            angle: 0,
            speed: (Math.random() * 0.03) + 0.02
        });
    }

    // ----------------------------------------------------
    // Game Controls & Inputs
    // ----------------------------------------------------
    function handleDirectionInput(newDir) {
        initAudio();
        if (!isRunning || isPaused || isGameOver) return;

        const lastDir = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : dir;
        if (newDir.x !== -lastDir.x || newDir.y !== -lastDir.y) {
            inputQueue.push(newDir);
        }
    }

    function triggerSteamBlast() {
        initAudio();
        if (!isRunning || isPaused || isGameOver) return;
        if (steamPressure >= 30 && !isSteamActive) {
            isSteamActive = true;
            steamTimeLeft = (steamPressure / 100) * 5.0; // max 5 seconds
            steamPressure = 0;
            totalSteamBlasts++;
            screenShakeTime = 0.4;
            playSound('steam');
            steamOverlay.classList.add('active');
            spawnSteamBurst(snake[0].x, snake[0].y, 30);
            updateUI();
        }
    }

    window.addEventListener('keydown', e => {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                handleDirectionInput({ x: 0, y: -1 });
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                handleDirectionInput({ x: 0, y: 1 });
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                handleDirectionInput({ x: -1, y: 0 });
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                handleDirectionInput({ x: 1, y: 0 });
                break;
            case ' ':
                e.preventDefault();
                triggerSteamBlast();
                break;
            case 'p':
            case 'P':
                togglePause();
                break;
        }
    });

    // Touch D-Pad Events
    document.getElementById('btn-up')?.addEventListener('click', () => handleDirectionInput({ x: 0, y: -1 }));
    document.getElementById('btn-down')?.addEventListener('click', () => handleDirectionInput({ x: 0, y: 1 }));
    document.getElementById('btn-left')?.addEventListener('click', () => handleDirectionInput({ x: -1, y: 0 }));
    document.getElementById('btn-right')?.addEventListener('click', () => handleDirectionInput({ x: 1, y: 0 }));
    document.getElementById('btn-steam')?.addEventListener('click', triggerSteamBlast);

    // Canvas Touch Gestures (Swipe)
    let touchStartX = 0;
    let touchStartY = 0;
    canvas.addEventListener('touchstart', e => {
        if (e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
        if (e.changedTouches.length > 0) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (Math.max(absDx, absDy) > 25) { // minimum threshold
                if (absDx > absDy) {
                    handleDirectionInput(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
                } else {
                    handleDirectionInput(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
                }
            }
        }
    }, { passive: true });

    // UI Buttons
    startBtn.addEventListener('click', () => {
        initAudio();
        initGame();
    });

    restartBtn.addEventListener('click', () => {
        initAudio();
        initGame();
    });

    resumeBtn.addEventListener('click', () => {
        togglePause();
    });

    function togglePause() {
        if (!isRunning || isGameOver) return;
        isPaused = !isPaused;
        if (isPaused) {
            pauseScreen.classList.add('active');
        } else {
            pauseScreen.classList.remove('active');
            lastRenderTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
    }

    soundBtn.addEventListener('click', () => {
        isSoundMuted = !isSoundMuted;
        soundIcon.textContent = isSoundMuted ? '🔇' : '🔊';
    });

    helpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    closeHelpBtn.addEventListener('click', () => helpModal.classList.remove('active'));
    helpModal.addEventListener('click', e => {
        if (e.target === helpModal) helpModal.classList.remove('active');
    });

    shareBtn.addEventListener('click', () => {
        const text = `我在《蒸汽发条蛇》获得 ${score} 分！挑战维多利亚蒸汽工坊，快来体验齿轮咬合与超压喷射的快感！https://dailysnake.org/games/daily-2026-08-12/`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert('战报已复制到剪贴板，快分享给朋友吧！');
            });
        } else {
            alert(text);
        }
    });

    // ----------------------------------------------------
    // Main Game Loop & Update Logic
    // ----------------------------------------------------
    let accumulatedTime = 0;

    function gameLoop(timestamp) {
        if (!isRunning || isPaused) return;

        const deltaTime = (timestamp - lastRenderTime) / 1000;
        lastRenderTime = timestamp;
        accumulatedTime += deltaTime * 1000;

        // Update Steam Overdrive timer
        if (isSteamActive) {
            steamTimeLeft -= deltaTime;
            if (steamTimeLeft <= 0) {
                isSteamActive = false;
                steamTimeLeft = 0;
                steamOverlay.classList.remove('active');
            }
            updateUI();
        }

        // Magnet attraction during Steam Overdrive
        if (isSteamActive) {
            const head = snake[0];
            items.forEach(it => {
                const dist = Math.hypot(head.x - it.x, head.y - it.y);
                if (dist < 6.0 && dist > 0.1) {
                    it.x += (head.x - it.x) * 0.15;
                    it.y += (head.y - it.y) * 0.15;
                }
            });
        }

        // Rotate hazards
        hazards.forEach(hz => {
            hz.angle += hz.speed;
        });

        // Snake step execution
        const effectiveInterval = isSteamActive ? moveInterval * 0.75 : moveInterval;
        if (accumulatedTime >= effectiveInterval) {
            updateSnakeStep();
            accumulatedTime %= effectiveInterval;
        }

        // Update particles & floating text
        updateParticles(deltaTime);

        // Render Canvas
        render(deltaTime);

        if (!isGameOver) {
            gameLoopId = requestAnimationFrame(gameLoop);
        }
    }

    function updateSnakeStep() {
        if (inputQueue.length > 0) {
            dir = inputQueue.shift();
        }

        const head = snake[0];
        const newHead = {
            x: (head.x + dir.x + GRID_COUNT) % GRID_COUNT,
            y: (head.y + dir.y + GRID_COUNT) % GRID_COUNT
        };

        // Self-collision check
        for (let i = 0; i < snake.length - 1; i++) {
            if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
                triggerGameOver();
                return;
            }
        }

        // Hazard collision check
        for (let i = hazards.length - 1; i >= 0; i--) {
            const hz = hazards[i];
            const dist = Math.hypot(newHead.x - hz.x, newHead.y - hz.y);
            if (dist < 0.8) {
                if (isSteamActive) {
                    // Destroy hazard!
                    spawnExplosion(hz.x, hz.y, '#ff4400');
                    playSound('destroy');
                    addScore(250, '破除锈蚀!');
                    hazards.splice(i, 1);
                    setTimeout(spawnHazard, 4000);
                } else {
                    triggerGameOver();
                    return;
                }
            }
        }

        snake.unshift(newHead);

        // Item collision check
        let ateItem = false;
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            const dist = Math.hypot(newHead.x - it.x, newHead.y - it.y);
            if (dist < 0.9) {
                ateItem = true;
                handleCollectItem(it);
                items.splice(i, 1);
                spawnItem();
                break;
            }
        }

        if (!ateItem) {
            snake.pop();
        }

        // Spawn particles behind tail during steam mode
        if (isSteamActive) {
            const tail = snake[snake.length - 1];
            spawnSteamBurst(tail.x, tail.y, 4);
        }
    }

    function handleCollectItem(item) {
        const now = performance.now();

        // Combo system (within 2.5s)
        if (now - lastCollectTime < 2500) {
            combo = Math.min(combo + 1, 5);
        } else {
            combo = 1;
        }
        lastCollectTime = now;
        if (combo > maxCombo) maxCombo = combo;

        let basePoints = 100;
        let pressureGain = 12;

        if (item.type === 'cog') {
            basePoints = 100;
            pressureGain = 12;
            playSound('cog');
            spawnExplosion(item.x, item.y, '#d4af37');
        } else if (item.type === 'ruby') {
            basePoints = 300;
            pressureGain = 35;
            playSound('ruby');
            spawnExplosion(item.x, item.y, '#e63946');
        } else if (item.type === 'spring') {
            basePoints = 200;
            pressureGain = 20;
            playSound('cog');
            spawnExplosion(item.x, item.y, '#00e5ff');
        }

        const multiplier = (isSteamActive ? 2 : 1) * combo;
        const totalPoints = basePoints * multiplier;

        score += totalPoints;
        steamPressure = Math.min(steamPressure + pressureGain, 100);

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('steampunk_snake_highscore', highScore.toString());
        }

        // Increase speed slightly
        moveInterval = Math.max(75, 125 - Math.floor(score / 500) * 3);

        addFloatingText(`+${totalPoints}`, item.x, item.y, item.type === 'ruby' ? '#ff4444' : '#ffd700');
        updateUI();
    }

    function addScore(pts, label) {
        score += pts;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('steampunk_snake_highscore', highScore.toString());
        }
        const head = snake[0];
        addFloatingText(`${label} +${pts}`, head.x, head.y, '#ff8c00');
        updateUI();
    }

    function updateUI() {
        scoreVal.textContent = score;
        highScoreVal.textContent = highScore;
        comboVal.textContent = `x${combo}`;

        if (isSteamActive) {
            const fillPct = (steamTimeLeft / 5.0) * 100;
            energyBarFill.style.width = `${fillPct}%`;
            energyBarFill.style.background = 'linear-gradient(90deg, #ff4400, #ff8c00, #00e5ff)';
        } else {
            energyBarFill.style.width = `${steamPressure}%`;
            energyBarFill.style.background = steamPressure >= 30 
                ? 'linear-gradient(90deg, #d4af37, #ff8c00)' 
                : '#8a6d27';
        }
    }

    function triggerGameOver() {
        isGameOver = true;
        isRunning = false;
        playSound('gameover');
        screenShakeTime = 0.6;

        finalScore.textContent = score;
        finalHighScore.textContent = highScore;
        finalMaxCombo.textContent = `x${maxCombo}`;
        finalSteamBlasts.textContent = totalSteamBlasts;

        setTimeout(() => {
            gameOverScreen.classList.add('active');
        }, 500);
    }

    // ----------------------------------------------------
    // Particles & Visual Animations
    // ----------------------------------------------------
    function spawnExplosion(gx, gy, color) {
        const px = (gx + 0.5) * CELL_SIZE;
        const py = (gy + 0.5) * CELL_SIZE;
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 80 + 20;
            particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 4 + 2,
                color: color,
                alpha: 1.0,
                life: 1.0
            });
        }
    }

    function spawnSteamBurst(gx, gy, count = 10) {
        const px = (gx + 0.5) * CELL_SIZE;
        const py = (gy + 0.5) * CELL_SIZE;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 60 + 10;
            particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 20,
                radius: Math.random() * 6 + 3,
                color: Math.random() < 0.5 ? '#ffaa00' : '#ffffff',
                alpha: 0.8,
                life: 0.8
            });
        }
    }

    function addFloatingText(text, gx, gy, color) {
        floatingTexts.push({
            text: text,
            x: (gx + 0.5) * CELL_SIZE,
            y: (gy + 0.5) * CELL_SIZE,
            vy: -40,
            alpha: 1.0,
            color: color
        });
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.alpha -= dt / p.life;
            if (p.alpha <= 0) particles.splice(i, 1);
        }

        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.alpha -= dt * 1.5;
            if (ft.alpha <= 0) floatingTexts.splice(i, 1);
        }

        if (screenShakeTime > 0) {
            screenShakeTime -= dt;
        }

        gearRotationGlobal += dt * 2.0;
    }

    // ----------------------------------------------------
    // Rendering Engine (Canvas 2D)
    // ----------------------------------------------------
    function render(dt) {
        ctx.save();

        // Screen Shake
        if (screenShakeTime > 0) {
            const shake = (Math.random() - 0.5) * 12 * (screenShakeTime / 0.6);
            ctx.translate(shake, shake);
        }

        // Clear Canvas Background (Dark Mechanical Blueprint Plate)
        ctx.fillStyle = '#0f0b08';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Blueprint Grid Lines
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_COUNT; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, canvas.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(canvas.width, i * CELL_SIZE);
            ctx.stroke();
        }

        // Draw Hazards (Spinning Rust Gears)
        hazards.forEach(hz => {
            drawGear(
                (hz.x + 0.5) * CELL_SIZE,
                (hz.y + 0.5) * CELL_SIZE,
                CELL_SIZE * 0.45,
                8,
                hz.angle,
                '#4a3e3d',
                '#8b0000'
            );
        });

        // Draw Items
        items.forEach(it => {
            const cx = (it.x + 0.5) * CELL_SIZE;
            const cy = (it.y + 0.5) * CELL_SIZE;
            if (it.type === 'cog') {
                drawGear(cx, cy, CELL_SIZE * 0.38, 6, gearRotationGlobal * 2, '#d4af37', '#fff0aa');
            } else if (it.type === 'ruby') {
                drawRubyValve(cx, cy);
            } else if (it.type === 'spring') {
                drawSpring(cx, cy);
            }
        });

        // Draw Snake Body & Head
        drawSnake();

        // Draw Particles
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Draw Floating Score Texts
        floatingTexts.forEach(ft => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 16px Orbitron';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });

        ctx.restore();
    }

    function drawSnake() {
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const cx = (seg.x + 0.5) * CELL_SIZE;
            const cy = (seg.y + 0.5) * CELL_SIZE;
            const radius = CELL_SIZE * 0.42;

            if (i === 0) {
                // Snake Head: Brass Automaton Head
                ctx.save();
                ctx.translate(cx, cy);

                // Rotate Head toward movement direction
                let headAngle = 0;
                if (dir.x === 1) headAngle = 0;
                else if (dir.x === -1) headAngle = Math.PI;
                else if (dir.y === 1) headAngle = Math.PI / 2;
                else if (dir.y === -1) headAngle = -Math.PI / 2;
                ctx.rotate(headAngle);

                // Steam Overdrive Glow
                if (isSteamActive) {
                    ctx.shadowColor = '#ff7700';
                    ctx.shadowBlur = 18;
                }

                // Head Base Oval
                const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
                grad.addColorStop(0, '#fff0aa');
                grad.addColorStop(0.5, '#d4af37');
                grad.addColorStop(1, '#b87333');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(0, 0, radius, radius * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#593e18';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Eyes (Glowing Cyan)
                ctx.fillStyle = isSteamActive ? '#ff0055' : '#00e5ff';
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(radius * 0.3, -radius * 0.35, 4, 0, Math.PI * 2);
                ctx.arc(radius * 0.3, radius * 0.35, 4, 0, Math.PI * 2);
                ctx.fill();

                // Rotating Brass Core Gear on Head
                drawGear(0, 0, radius * 0.45, 6, gearRotationGlobal * 3, '#c87533', '#ffd700');

                ctx.restore();
            } else {
                // Body Segment: Brass Riveted Gear Segment
                ctx.save();
                ctx.translate(cx, cy);

                if (isSteamActive) {
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur = 10;
                }

                const segColor = i % 2 === 0 ? '#d4af37' : '#c87533';
                drawGear(0, 0, radius, 8, (gearRotationGlobal + i * 0.5), segColor, '#593e18');

                ctx.restore();
            }
        }
    }

    function drawGear(cx, cy, outerRadius, numTeeth, angle, fillColor, strokeColor) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        const innerRadius = outerRadius * 0.7;
        const toothDepth = outerRadius * 0.25;

        ctx.beginPath();
        for (let i = 0; i < numTeeth; i++) {
            const a1 = (i / numTeeth) * Math.PI * 2;
            const a2 = a1 + (Math.PI / numTeeth) * 0.5;
            const a3 = a1 + (Math.PI / numTeeth);

            ctx.lineTo(Math.cos(a1) * (outerRadius + toothDepth), Math.sin(a1) * (outerRadius + toothDepth));
            ctx.lineTo(Math.cos(a2) * (outerRadius + toothDepth), Math.sin(a2) * (outerRadius + toothDepth));
            ctx.lineTo(Math.cos(a3) * innerRadius, Math.sin(a3) * innerRadius);
        }
        ctx.closePath();

        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Center Rivet Hole
        ctx.fillStyle = '#120e0b';
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawRubyValve(cx, cy) {
        ctx.save();
        ctx.translate(cx, cy);

        // Brass Rim
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, CELL_SIZE * 0.38, 0, Math.PI * 2);
        ctx.stroke();

        // Pulsing Ruby Gemstone
        ctx.fillStyle = '#e63946';
        ctx.shadowColor = '#e63946';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(0, -CELL_SIZE * 0.3);
        ctx.lineTo(CELL_SIZE * 0.25, 0);
        ctx.lineTo(0, CELL_SIZE * 0.3);
        ctx.lineTo(-CELL_SIZE * 0.25, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    function drawSpring(cx, cy) {
        ctx.save();
        ctx.translate(cx, cy);

        ctx.strokeStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        const r = CELL_SIZE * 0.25;
        for (let a = 0; a < Math.PI * 6; a += 0.2) {
            const x = Math.cos(a) * (r * 0.7);
            const y = (a / (Math.PI * 6) - 0.5) * CELL_SIZE * 0.6;
            if (a === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.restore();
    }

})();
