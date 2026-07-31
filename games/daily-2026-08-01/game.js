/**
 * 敦煌飞天：天衣神帛 (Dunhuang Silk: Flying Apsaras)
 * Daily Snake 2026-08-01
 * 
 * Features:
 * - Pentatonic Scale Web Audio Synthesizer (五声音阶 Web Audio API 合成器)
 * - Canvas Bezier Curve Dunhuang Silk Ribbon Snake Dynamics
 * - Enclosure Loop Detection (Flood Fill Seal Purification)
 * - Five-Color Divine Flight Mode (五彩飞天化仙 Mode)
 * - Touch & Keyboard Controls with Responsive Viewport Scaling
 */

(function() {
    'use strict';

    // Game Configuration & Grid Constants
    const COLS = 32;
    const ROWS = 22;
    const CELL_SIZE = 25; // 800x550 virtual resolution
    
    // Canvas Setup
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // UI Elements
    const scoreValEl = document.getElementById('score-val');
    const highscoreValEl = document.getElementById('highscore-val');
    const flightMeterEl = document.getElementById('flight-meter');
    const skillStatusEl = document.getElementById('skill-status-text');
    const overlayScreen = document.getElementById('overlay-screen');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const finalStatsEl = document.getElementById('final-stats');
    const resScoreEl = document.getElementById('res-score');
    const resLoopsEl = document.getElementById('res-loops');
    const startBtn = document.getElementById('start-btn');
    const btnTextEl = document.getElementById('btn-text');
    const soundBtn = document.getElementById('sound-btn');
    const soundIconOn = document.getElementById('sound-icon-on');
    const soundIconOff = document.getElementById('sound-icon-off');
    const pauseBtn = document.getElementById('pause-btn');
    const skillTouchBtn = document.getElementById('skill-touch-btn');

    // D-Pad Touch Buttons
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    // Web Audio Synthesizer State
    let audioCtx = null;
    let isMuted = false;
    
    // Pentatonic Frequencies (D Major Pentatonic: D4, E4, F#4, A4, B4, D5, E5, F#5, A5, B5)
    const PENTATONIC_SCALE = [293.66, 329.63, 369.99, 440.00, 493.88, 587.33, 659.25, 739.99, 880.00, 987.77];

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

    function playPentatonicTone(freqIndex, duration = 0.3, type = 'sine', gainVal = 0.25) {
        if (isMuted || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const freq = PENTATONIC_SCALE[freqIndex % PENTATONIC_SCALE.length];
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            
            gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            console.error('Audio synth error', e);
        }
    }

    function playGuzhengPluck() {
        if (isMuted || !audioCtx) return;
        const note = Math.floor(Math.random() * 5) + 3; // D5-A5 range
        playPentatonicTone(note, 0.4, 'triangle', 0.35);
        playPentatonicTone(note - 2, 0.5, 'sine', 0.15);
    }

    function playPigmentCollect() {
        if (isMuted || !audioCtx) return;
        playPentatonicTone(1, 0.25, 'sine', 0.2);
        setTimeout(() => playPentatonicTone(4, 0.35, 'triangle', 0.25), 60);
    }

    function playSealEnclosureSound() {
        if (isMuted || !audioCtx) return;
        // Chime Chord
        [0, 2, 4, 7].forEach((idx, delayMs) => {
            setTimeout(() => playPentatonicTone(idx, 0.8, 'sine', 0.3), delayMs * 50);
        });
    }

    function playDivineFlightSound() {
        if (isMuted || !audioCtx) return;
        for (let i = 0; i < 6; i++) {
            setTimeout(() => playPentatonicTone(i, 0.3, 'triangle', 0.25), i * 70);
        }
    }

    function playGameOverSound() {
        if (isMuted || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.8);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.8);
        } catch (e) {}
    }

    // Game Variables
    let gameState = 'START'; // START, PLAYING, PAUSED, GAMEOVER
    let score = 0;
    let highscore = parseInt(localStorage.getItem('dunhuang_snake_highscore') || '0', 10);
    let loopsTriggered = 0;
    let flightEnergy = 0; // 0 to 100
    let isFlightActive = false;
    let flightTimer = null;
    let flightDuration = 6.0; // 6 seconds

    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };

    let lotusPearls = [];
    let pigments = [];
    let windVortexes = [];
    let particles = [];
    let lotusSeals = []; // Floating visual effects for enclosures

    let lastTime = 0;
    let tickAccumulator = 0;
    let tickRate = 0.12; // Base seconds per step (dynamic with flight mode)

    // Palette Colors
    const COLORS = {
        sandDark: '#1a120c',
        goldBright: '#f4d35e',
        goldDeep: '#ee9b00',
        cinnabar: '#e63946',
        malachite: '#2a9d8f',
        lapis: '#1d3557',
        leadWhite: '#f7f4ea',
        ochre: '#d4a373'
    };

    // Initialize Canvas HiDPI Scaling
    function setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = COLS * CELL_SIZE * dpr;
        canvas.height = ROWS * CELL_SIZE * dpr;
        ctx.scale(dpr, dpr);
    }

    setupCanvas();
    window.addEventListener('resize', setupCanvas);

    highscoreValEl.textContent = highscore;

    // Reset Game State
    function resetGame() {
        score = 0;
        loopsTriggered = 0;
        flightEnergy = 0;
        isFlightActive = false;
        if (flightTimer) clearInterval(flightTimer);
        
        scoreValEl.textContent = '0';
        updateFlightMeter();

        const startX = Math.floor(COLS / 3);
        const startY = Math.floor(ROWS / 2);

        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
            { x: startX - 3, y: startY }
        ];

        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };

        lotusPearls = [];
        pigments = [];
        windVortexes = [];
        particles = [];
        lotusSeals = [];

        // Spawn initial items
        spawnLotusPearl();
        spawnLotusPearl();
        spawnPigment();
        spawnPigment();
        spawnWindVortex();
    }

    function spawnLotusPearl() {
        const pos = getRandomEmptyCell();
        if (pos) {
            lotusPearls.push({
                x: pos.x,
                y: pos.y,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }

    function spawnPigment() {
        const pos = getRandomEmptyCell();
        if (pos) {
            const types = ['cinnabar', 'malachite', 'lapis'];
            const type = types[Math.floor(Math.random() * types.length)];
            pigments.push({
                x: pos.x,
                y: pos.y,
                type: type,
                spin: 0
            });
        }
    }

    function spawnWindVortex() {
        if (windVortexes.length >= 2) return;
        const pos = getRandomEmptyCell();
        if (pos) {
            windVortexes.push({
                x: pos.x,
                y: pos.y,
                angle: 0
            });
        }
    }

    function getRandomEmptyCell() {
        const occupied = new Set();
        snake.forEach(p => occupied.add(`${p.x},${p.y}`));
        lotusPearls.forEach(p => occupied.add(`${p.x},${p.y}`));
        pigments.forEach(p => occupied.add(`${p.x},${p.y}`));
        windVortexes.forEach(p => occupied.add(`${p.x},${p.y}`));

        const empty = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (!occupied.has(`${c},${r}`)) {
                    empty.push({ x: c, y: r });
                }
            }
        }
        if (empty.length === 0) return null;
        return empty[Math.floor(Math.random() * empty.length)];
    }

    // Add Energy & Update Meter UI
    function addFlightEnergy(amount) {
        if (isFlightActive) return;
        flightEnergy = Math.min(100, flightEnergy + amount);
        updateFlightMeter();
    }

    function updateFlightMeter() {
        flightMeterEl.style.width = `${flightEnergy}%`;
        if (isFlightActive) {
            skillStatusEl.textContent = '飞天化仙中...';
            skillStatusEl.style.color = COLORS.cinnabar;
            skillTouchBtn.classList.add('active');
        } else if (flightEnergy >= 100) {
            skillStatusEl.textContent = '按[Space]激活';
            skillStatusEl.style.color = COLORS.goldBright;
            skillTouchBtn.classList.add('ready');
        } else {
            skillStatusEl.textContent = `${Math.floor(flightEnergy)}%`;
            skillStatusEl.style.color = COLORS.ochre;
            skillTouchBtn.classList.remove('ready', 'active');
        }
    }

    function activateFlightMode() {
        if (flightEnergy < 100 || isFlightActive || gameState !== 'PLAYING') return;
        initAudio();
        isFlightActive = true;
        flightEnergy = 100;
        updateFlightMeter();
        playDivineFlightSound();

        // Spawn visual burst
        createParticleBurst(snake[0].x * CELL_SIZE + CELL_SIZE / 2, snake[0].y * CELL_SIZE + CELL_SIZE / 2, COLORS.goldBright, 30);

        const startTime = Date.now();
        flightTimer = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const remaining = Math.max(0, 100 - (elapsed / flightDuration) * 100);
            flightEnergy = remaining;
            flightMeterEl.style.width = `${flightEnergy}%`;

            if (remaining <= 0) {
                clearInterval(flightTimer);
                isFlightActive = false;
                flightEnergy = 0;
                updateFlightMeter();
            }
        }, 50);
    }

    // Particle Emitter System
    function createParticleBurst(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                size: 2 + Math.random() * 4
            });
        }
    }

    // Check Enclosure Loop (Flood Fill Enclosure Detection)
    function checkEnclosureLoop() {
        if (snake.length < 6) return;

        // Create Grid Map (0: empty, 1: snake body)
        const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        snake.forEach(p => {
            if (p.x >= 0 && p.x < COLS && p.y >= 0 && p.y < ROWS) {
                grid[p.y][p.x] = 1;
            }
        });

        // Visited grid for flood fill from outer borders
        const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
        const queue = [];

        // Push all outer border cells to queue
        for (let c = 0; c < COLS; c++) {
            if (grid[0][c] === 0) { queue.push({ x: c, y: 0 }); visited[0][c] = true; }
            if (grid[ROWS - 1][c] === 0) { queue.push({ x: c, y: ROWS - 1 }); visited[ROWS - 1][c] = true; }
        }
        for (let r = 0; r < ROWS; r++) {
            if (grid[r][0] === 0) { queue.push({ x: 0, y: r }); visited[r][0] = true; }
            if (grid[r][COLS - 1] === 0) { queue.push({ x: COLS - 1, y: r }); visited[r][COLS - 1] = true; }
        }

        // BFS flood fill un-enclosed cells
        while (queue.length > 0) {
            const curr = queue.shift();
            const neighbors = [
                { x: curr.x + 1, y: curr.y },
                { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 },
                { x: curr.x, y: curr.y - 1 }
            ];
            for (const n of neighbors) {
                if (n.x >= 0 && n.x < COLS && n.y >= 0 && n.y < ROWS) {
                    if (!visited[n.y][n.x] && grid[n.y][n.x] === 0) {
                        visited[n.y][n.x] = true;
                        queue.push(n);
                    }
                }
            }
        }

        // Any cell that is NOT snake body (grid==0) and NOT visited is ENCLOSED!
        const enclosedCells = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c] === 0 && !visited[r][c]) {
                    enclosedCells.push({ x: c, y: r });
                }
            }
        }

        if (enclosedCells.length > 0) {
            let PurifiedCount = 0;

            // Check lotus pearls in enclosed area
            lotusPearls = lotusPearls.filter(p => {
                if (enclosedCells.some(cell => cell.x === p.x && cell.y === p.y)) {
                    PurifiedCount++;
                    score += 50;
                    createParticleBurst(p.x * CELL_SIZE + CELL_SIZE / 2, p.y * CELL_SIZE + CELL_SIZE / 2, COLORS.goldBright, 20);
                    return false;
                }
                return true;
            });

            // Check pigments in enclosed area
            pigments = pigments.filter(p => {
                if (enclosedCells.some(cell => cell.x === p.x && cell.y === p.y)) {
                    PurifiedCount++;
                    score += 30;
                    addFlightEnergy(30);
                    createParticleBurst(p.x * CELL_SIZE + CELL_SIZE / 2, p.y * CELL_SIZE + CELL_SIZE / 2, COLORS.cinnabar, 20);
                    return false;
                }
                return true;
            });

            if (PurifiedCount > 0) {
                loopsTriggered++;
                scoreValEl.textContent = score;
                playSealEnclosureSound();
                
                // Add floating lotus seal animation
                enclosedCells.forEach(cell => {
                    lotusSeals.push({
                        x: cell.x * CELL_SIZE + CELL_SIZE / 2,
                        y: cell.y * CELL_SIZE + CELL_SIZE / 2,
                        scale: 0.5,
                        opacity: 1.0
                    });
                });

                // Re-spawn purified items
                spawnLotusPearl();
                spawnPigment();
            }
        }
    }

    // Main Game Loop Update
    function update(dt) {
        if (gameState !== 'PLAYING') return;

        // Update Particles
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
        });
        particles = particles.filter(p => p.life > 0);

        // Update Lotus Seals
        lotusSeals.forEach(s => {
            s.scale += 0.03;
            s.opacity -= 0.03;
        });
        lotusSeals = lotusSeals.filter(s => s.opacity > 0);

        // Dynamic tick speed (faster when flight active)
        const currentTickRate = isFlightActive ? 0.08 : 0.12;
        tickAccumulator += dt;

        if (tickAccumulator >= currentTickRate) {
            tickAccumulator -= currentTickRate;
            stepGame();
        }
    }

    function stepGame() {
        dir = { ...nextDir };
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Wall Wrapping (Dunhuang Open Air Sky)
        if (head.x < 0) head.x = COLS - 1;
        if (head.x >= COLS) head.x = 0;
        if (head.y < 0) head.y = ROWS - 1;
        if (head.y >= ROWS) head.y = 0;

        // Check Self Collision (Disabled during Divine Flight Mode)
        if (!isFlightActive) {
            for (let i = 0; i < snake.length - 1; i++) {
                if (snake[i].x === head.x && snake[i].y === head.y) {
                    handleGameOver();
                    return;
                }
            }
        }

        snake.unshift(head);

        // Check Lotus Pearl Collection
        let ateFood = false;
        lotusPearls = lotusPearls.filter(p => {
            if (p.x === head.x && p.y === head.y) {
                ateFood = true;
                score += 10;
                addFlightEnergy(15);
                scoreValEl.textContent = score;
                playGuzhengPluck();
                createParticleBurst(head.x * CELL_SIZE + CELL_SIZE / 2, head.y * CELL_SIZE + CELL_SIZE / 2, COLORS.goldBright, 15);
                return false;
            }
            return true;
        });

        if (ateFood) {
            spawnLotusPearl();
        }

        // Check Pigment Collection
        pigments = pigments.filter(p => {
            if (p.x === head.x && p.y === head.y) {
                ateFood = true;
                score += 25;
                addFlightEnergy(25);
                scoreValEl.textContent = score;
                playPigmentCollect();
                const colorMap = { cinnabar: COLORS.cinnabar, malachite: COLORS.malachite, lapis: COLORS.lapis };
                createParticleBurst(head.x * CELL_SIZE + CELL_SIZE / 2, head.y * CELL_SIZE + CELL_SIZE / 2, colorMap[p.type] || COLORS.goldBright, 15);
                return false;
            }
            return true;
        });

        if (!ateFood) {
            snake.pop();
        } else {
            spawnPigment();
        }

        // Check Wind Vortex Slingshot
        windVortexes.forEach(v => {
            if (v.x === head.x && v.y === head.y) {
                addFlightEnergy(10);
                createParticleBurst(head.x * CELL_SIZE + CELL_SIZE / 2, head.y * CELL_SIZE + CELL_SIZE / 2, COLORS.ochre, 12);
            }
        });

        // Trigger Enclosure Loop Verification
        checkEnclosureLoop();
    }

    // Render Canvas
    function render() {
        ctx.clearRect(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE);

        // 1. Draw Grid Lines (Subtle Sandstone Mural Lines)
        ctx.strokeStyle = 'rgba(212, 163, 115, 0.08)';
        ctx.lineWidth = 1;
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * CELL_SIZE);
            ctx.lineTo(COLS * CELL_SIZE, r * CELL_SIZE);
            ctx.stroke();
        }
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * CELL_SIZE, 0);
            ctx.lineTo(c * CELL_SIZE, ROWS * CELL_SIZE);
            ctx.stroke();
        }

        // 2. Draw Wind Vortexes
        windVortexes.forEach(v => {
            v.angle += 0.05;
            const cx = v.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = v.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(v.angle);
            ctx.strokeStyle = 'rgba(244, 211, 94, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, CELL_SIZE * 0.4, 0, Math.PI * 1.5);
            ctx.stroke();
            ctx.restore();
        });

        // 3. Draw Lotus Pearls
        lotusPearls.forEach(p => {
            p.pulse += 0.06;
            const cx = p.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = p.y * CELL_SIZE + CELL_SIZE / 2;
            const radius = (CELL_SIZE / 2.5) + Math.sin(p.pulse) * 2;

            // Halo Glow
            const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius * 1.5);
            grad.addColorStop(0, 'rgba(244, 211, 94, 0.9)');
            grad.addColorStop(1, 'rgba(244, 211, 94, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Lotus Core
            ctx.fillStyle = COLORS.goldBright;
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        });

        // 4. Draw Mineral Pigments
        pigments.forEach(p => {
            p.spin += 0.04;
            const cx = p.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = p.y * CELL_SIZE + CELL_SIZE / 2;
            const colorMap = { cinnabar: COLORS.cinnabar, malachite: COLORS.malachite, lapis: COLORS.lapis };

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(p.spin);
            ctx.fillStyle = colorMap[p.type] || COLORS.cinnabar;
            ctx.strokeStyle = COLORS.goldBright;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const sz = CELL_SIZE * 0.35;
            ctx.rect(-sz / 2, -sz / 2, sz, sz);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        // 5. Draw Dunhuang Silk Ribbon Snake
        if (snake.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Glow effect for snake
            if (isFlightActive) {
                ctx.shadowColor = COLORS.goldBright;
                ctx.shadowBlur = 18;
            } else {
                ctx.shadowColor = COLORS.cinnabar;
                ctx.shadowBlur = 8;
            }

            // Draw Silk Body Bezier Path
            for (let i = snake.length - 1; i >= 0; i--) {
                const curr = snake[i];
                const cx = curr.x * CELL_SIZE + CELL_SIZE / 2;
                const cy = curr.y * CELL_SIZE + CELL_SIZE / 2;
                const progress = i / snake.length; // 0 at head, 1 at tail
                const radius = (CELL_SIZE / 2) * (1 - progress * 0.4);

                // Body Segment Gradient
                const segGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
                if (isFlightActive) {
                    segGrad.addColorStop(0, COLORS.goldBright);
                    segGrad.addColorStop(1, COLORS.cinnabar);
                } else {
                    if (i % 2 === 0) {
                        segGrad.addColorStop(0, COLORS.leadWhite);
                        segGrad.addColorStop(1, COLORS.cinnabar);
                    } else {
                        segGrad.addColorStop(0, COLORS.goldBright);
                        segGrad.addColorStop(1, COLORS.lapis);
                    }
                }

                ctx.fillStyle = segGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();

                // Gold Leaf Outline
                ctx.strokeStyle = COLORS.goldBright;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Draw Head Lotus Seal Eyes
            const head = snake[0];
            const hcx = head.x * CELL_SIZE + CELL_SIZE / 2;
            const hcy = head.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.fillStyle = COLORS.leadWhite;
            ctx.beginPath();
            ctx.arc(hcx, hcy, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // 6. Draw Enclosure Seals
        lotusSeals.forEach(s => {
            ctx.save();
            ctx.globalAlpha = s.opacity;
            ctx.strokeStyle = COLORS.goldBright;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, CELL_SIZE * s.scale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        // 7. Draw Particles
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    // Main Loop RAF
    function gameLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        update(dt);
        render();

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);

    // Handle Game Over
    function handleGameOver() {
        gameState = 'GAMEOVER';
        playGameOverSound();

        if (score > highscore) {
            highscore = score;
            localStorage.setItem('dunhuang_snake_highscore', highscore.toString());
            highscoreValEl.textContent = highscore;
        }

        modalTitle.textContent = '敦煌·神帛劫尽';
        modalDesc.textContent = '飞天彩绫触碰云霄边界或自身，神力化作漫天金莲。静心息怒，再创奇迹！';
        resScoreEl.textContent = score;
        resLoopsEl.textContent = loopsTriggered;
        finalStatsEl.style.display = 'flex';
        btnTextEl.textContent = '重新结印出发';
        overlayScreen.style.display = 'flex';
    }

    // Controls & Input Handlers
    function handleDirection(newDx, newDy) {
        if (gameState !== 'PLAYING') return;
        // Prevent 180 degree reverse turn
        if (newDx === -dir.x && newDy === -dir.y) return;
        nextDir = { x: newDx, y: newDy };
    }

    window.addEventListener('keydown', (e) => {
        initAudio();
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                e.preventDefault();
                handleDirection(0, -1);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                e.preventDefault();
                handleDirection(0, 1);
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                e.preventDefault();
                handleDirection(-1, 0);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                e.preventDefault();
                handleDirection(1, 0);
                break;
            case ' ':
                e.preventDefault();
                activateFlightMode();
                break;
            case 'p':
            case 'P':
                togglePause();
                break;
        }
    });

    // Mobile D-Pad Touch Listeners
    btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirection(0, -1); });
    btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirection(0, 1); });
    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirection(-1, 0); });
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirection(1, 0); });

    btnUp.addEventListener('click', () => handleDirection(0, -1));
    btnDown.addEventListener('click', () => handleDirection(0, 1));
    btnLeft.addEventListener('click', () => handleDirection(-1, 0));
    btnRight.addEventListener('click', () => handleDirection(1, 0));

    skillTouchBtn.addEventListener('click', activateFlightMode);

    // Swipe Gesture Recognition on Canvas
    let touchStartX = 0;
    let touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
        if (e.changedTouches.length > 0) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) > 25 || Math.abs(dy) > 25) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    handleDirection(dx > 0 ? 1 : -1, 0);
                } else {
                    handleDirection(0, dy > 0 ? 1 : -1);
                }
            }
        }
    }, { passive: true });

    // UI Buttons Handlers
    startBtn.addEventListener('click', () => {
        initAudio();
        overlayScreen.style.display = 'none';
        resetGame();
        gameState = 'PLAYING';
    });

    function togglePause() {
        if (gameState === 'PLAYING') {
            gameState = 'PAUSED';
            modalTitle.textContent = '敦煌·游戏暂停';
            modalDesc.textContent = '点击继续按钮恢复云霄游弋。';
            finalStatsEl.style.display = 'none';
            btnTextEl.textContent = '继续游戏';
            overlayScreen.style.display = 'flex';
        } else if (gameState === 'PAUSED') {
            overlayScreen.style.display = 'none';
            gameState = 'PLAYING';
        }
    }

    pauseBtn.addEventListener('click', togglePause);

    soundBtn.addEventListener('click', () => {
        initAudio();
        isMuted = !isMuted;
        soundIconOn.style.display = isMuted ? 'none' : 'block';
        soundIconOff.style.display = isMuted ? 'block' : 'none';
    });

})();
