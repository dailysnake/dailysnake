/**
 * Chrono Echo: Temporal Loop & Stasis (2026-08-11)
 * Daily Snake Workshop - Canvas & Web Audio API Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    // Canvas & Context Initialization
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const GRID_SIZE = 20; // 20x20 Grid
    let cellSize = canvas.width / GRID_SIZE; // Dynamic cell size

    // Palette & Visual Tokens
    const PALETTE = {
        bgDark: '#070a14',
        gridLine: 'rgba(0, 240, 255, 0.07)',
        gridDot: 'rgba(0, 240, 255, 0.2)',
        cyan: '#00f0ff',
        amber: '#ffb700',
        violet: '#e024ff',
        emerald: '#10b981',
        redAlert: '#ff3366',
        echoBody: 'rgba(224, 36, 255, 0.45)',
        echoGlow: 'rgba(224, 36, 255, 0.25)',
        headGlow: 'rgba(0, 240, 255, 0.6)'
    };

    // Food Types
    const SHARD_TYPES = {
        AMBER: { id: 'AMBER', color: PALETTE.amber, score: 100, energy: 12, name: '过去之砂' },
        CYAN: { id: 'CYAN', color: PALETTE.cyan, score: 250, energy: 20, name: '未来结晶' },
        VIOLET: { id: 'VIOLET', color: PALETTE.violet, score: 400, energy: 50, name: '悖论质核' }
    };

    // Game State Variables
    let snake = [];
    let direction = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let historyPath = []; // Stores all historical head positions
    const ECHO_DELAY = 16; // Echo phantom trails 16 steps behind

    let shards = [];
    let timeCracks = [];
    let particles = [];
    let floatTexts = [];

    let score = 0;
    let highScore = parseInt(localStorage.getItem('daily_snake_chrono_highscore') || '0', 10);
    let combo = 1;
    let comboTimer = 0;
    let energy = 0; // 0 to 100

    let isStasis = false;
    let stasisTimer = 0; // Duration in seconds
    let speedBoostTimer = 0;

    let isPlaying = false;
    let isPaused = false;
    let isGameOver = false;

    let lastTickTime = 0;
    let baseMoveInterval = 130; // Base milliseconds per step
    let backgroundAngle = 0; // For rotating gear clock background

    // Audio Synthesizer Context
    let audioCtx = null;
    let soundEnabled = true;

    // UI Elements
    const scoreVal = document.getElementById('score-val');
    const highScoreVal = document.getElementById('high-score-val');
    const comboVal = document.getElementById('combo-val');
    const energyBarFill = document.getElementById('energy-bar-fill');
    const skillBtn = document.getElementById('skill-btn');
    const stasisOverlay = document.getElementById('stasis-overlay');
    const timeWarpOverlay = document.getElementById('time-warp-overlay');

    const startScreen = document.getElementById('start-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    const gameoverReason = document.getElementById('gameover-reason');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    
    const soundBtn = document.getElementById('sound-btn');
    const soundIcon = document.getElementById('sound-icon');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');
    const confirmHelp = document.getElementById('confirm-help');
    const canvasStatus = document.getElementById('canvas-status');

    const finalScore = document.getElementById('final-score');
    const finalHighScore = document.getElementById('final-high-score');
    const finalComboCount = document.getElementById('final-combo-count');

    // Mobile D-Pad
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnCenter = document.getElementById('btn-center');

    // High score init
    highScoreVal.textContent = highScore;

    // Canvas Resize Handling
    function resizeCanvas() {
        const wrapper = document.getElementById('canvas-wrapper');
        if (wrapper) {
            const size = Math.min(wrapper.clientWidth, wrapper.clientHeight);
            canvas.width = size;
            canvas.height = size;
            cellSize = canvas.width / GRID_SIZE;
        }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ==========================================
    // Web Audio Synthesizer Engine
    // ==========================================
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

    function playSynthNote(freq, type = 'sine', duration = 0.15, vol = 0.2, endFreq = null) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            if (endFreq) {
                osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + duration);
            }
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            // Audio context fallback
        }
    }

    function playShardSound(shardType) {
        initAudio();
        if (shardType === SHARD_TYPES.AMBER) {
            playSynthNote(440, 'sine', 0.12, 0.25, 660);
        } else if (shardType === SHARD_TYPES.CYAN) {
            playSynthNote(587.33, 'triangle', 0.15, 0.3, 880);
            setTimeout(() => playSynthNote(1174.66, 'sine', 0.15, 0.25), 60);
        } else if (shardType === SHARD_TYPES.VIOLET) {
            playSynthNote(523.25, 'sawtooth', 0.2, 0.25, 1046.5);
            setTimeout(() => playSynthNote(783.99, 'square', 0.2, 0.2), 80);
        }
    }

    function playComboSound(comboLevel) {
        initAudio();
        const baseFreq = 523.25; // C5
        const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2]; // Major Chord
        notes.forEach((f, idx) => {
            setTimeout(() => playSynthNote(f, 'sine', 0.12, 0.2), idx * 50);
        });
    }

    function playStasisSound() {
        initAudio();
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        } catch (e) {}
    }

    function playCrackHitSound() {
        playSynthNote(150, 'sawtooth', 0.25, 0.3, 50);
    }

    function playGameOverSound() {
        initAudio();
        const notes = [400, 350, 300, 200];
        notes.forEach((f, idx) => {
            setTimeout(() => playSynthNote(f, 'sawtooth', 0.2, 0.3), idx * 100);
        });
    }

    function playStartSound() {
        initAudio();
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((f, idx) => {
            setTimeout(() => playSynthNote(f, 'sine', 0.15, 0.2), idx * 60);
        });
    }

    // ==========================================
    // Game Initialization & Reset
    // ==========================================
    function initGame() {
        snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 },
            { x: 7, y: 10 }
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        historyPath = [];

        // Seed initial history path
        for (let i = 0; i < ECHO_DELAY + 20; i++) {
            historyPath.push({ x: 7 - i, y: 10 });
        }
        for (let seg of snake) {
            historyPath.push({ x: seg.x, y: seg.y });
        }

        shards = [];
        timeCracks = [];
        particles = [];
        floatTexts = [];

        score = 0;
        combo = 1;
        comboTimer = 0;
        energy = 0;

        isStasis = false;
        stasisTimer = 0;
        speedBoostTimer = 0;
        isGameOver = false;

        updateUI();
        spawnShards(3);

        startScreen.classList.remove('active');
        gameoverScreen.classList.remove('active');
        stasisOverlay.classList.remove('active');
        timeWarpOverlay.classList.remove('active');

        isPlaying = true;
        isPaused = false;
        canvasStatus.textContent = "时空运行中 - 按方向键转向 / Space 释放停滞";
    }

    // ==========================================
    // Spawning Logic (Shards & Hazards)
    // ==========================================
    function getFreeGridPos() {
        let attempts = 0;
        while (attempts < 200) {
            const x = Math.floor(Math.random() * GRID_SIZE);
            const y = Math.floor(Math.random() * GRID_SIZE);

            const onSnake = snake.some(s => s.x === x && s.y === y);
            const onShard = shards.some(s => s.x === x && s.y === y);
            const onCrack = timeCracks.some(c => c.x === x && c.y === y);

            if (!onSnake && !onShard && !onCrack) {
                return { x, y };
            }
            attempts++;
        }
        return { x: 0, y: 0 };
    }

    function spawnShards(count = 1) {
        for (let i = 0; i < count; i++) {
            if (shards.length >= 4) break;
            const pos = getFreeGridPos();
            const rand = Math.random();
            let type = SHARD_TYPES.AMBER;
            if (rand > 0.7) type = SHARD_TYPES.CYAN;
            if (rand > 0.92) type = SHARD_TYPES.VIOLET;

            shards.push({
                x: pos.x,
                y: pos.y,
                type: type,
                pulseOffset: Math.random() * Math.PI * 2
            });
        }
    }

    function updateTimeCracks() {
        // Spawn cracks as score increases
        const maxCracks = score >= 1200 ? 3 : (score >= 500 ? 2 : (score >= 300 ? 1 : 0));
        while (timeCracks.length < maxCracks) {
            const pos = getFreeGridPos();
            timeCracks.push({
                x: pos.x,
                y: pos.y,
                duration: 15 // Lasts 15 seconds
            });
        }
    }

    // ==========================================
    // Echo Phantom Retrieval
    // ==========================================
    function getEchoSnake() {
        if (historyPath.length < ECHO_DELAY + snake.length) return [];
        const echoHeadIdx = historyPath.length - 1 - ECHO_DELAY;
        const echoSegments = [];
        for (let i = 0; i < snake.length; i++) {
            const idx = echoHeadIdx - i;
            if (idx >= 0 && idx < historyPath.length) {
                echoSegments.push(historyPath[idx]);
            }
        }
        return echoSegments;
    }

    // ==========================================
    // Main Game Loop & Step Tick
    // ==========================================
    function gameStep() {
        if (!isPlaying || isPaused || isGameOver) return;

        direction = { ...nextDirection };
        const head = { ...snake[0] };
        const newHead = { x: head.x + direction.x, y: head.y + direction.y };

        // 1. Boundary Wall Collision Check
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
            triggerGameOver("你的时空罗盘撞上了秘境边界！");
            return;
        }

        // 2. Self Body Collision Check
        for (let i = 0; i < snake.length - 1; i++) {
            if (newHead.x === snake[i].x && newHead.y === snake[i].y) {
                triggerGameOver("你的蛇头啃噬了自己的躯干！");
                return;
            }
        }

        // 3. Echo Phantom Collision Check (Unless in Stasis)
        const echoSnake = getEchoSnake();
        if (!isStasis && echoSnake.length > 0) {
            for (let seg of echoSnake) {
                if (newHead.x === seg.x && newHead.y === seg.y) {
                    triggerGameOver("因果悖论！你触碰了16步前的历史残影！");
                    return;
                }
            }
        }

        // Move Snake
        snake.unshift(newHead);
        historyPath.push({ ...newHead });

        // 4. Stasis Magnetic Attraction & Shard Collection Check
        let ateShard = false;
        for (let i = shards.length - 1; i >= 0; i--) {
            const s = shards[i];

            // Stasis magnetic pull
            if (isStasis) {
                if (Math.abs(s.x - newHead.x) <= 3 && Math.abs(s.y - newHead.y) <= 3) {
                    if (s.x < newHead.x) s.x++;
                    else if (s.x > newHead.x) s.x--;
                    if (s.y < newHead.y) s.y++;
                    else if (s.y > newHead.y) s.y--;
                }
            }

            if (newHead.x === s.x && newHead.y === s.y) {
                // EAT SHARD!
                ateShard = true;
                handleEatShard(s);
                shards.splice(i, 1);
                createEatParticles(newHead.x, newHead.y, s.type.color);
                break;
            }
        }

        if (!ateShard) {
            snake.pop(); // Remove tail if no food eaten
        } else {
            spawnShards(1);
        }

        // 5. Time Crack Collision Check
        for (let i = timeCracks.length - 1; i >= 0; i--) {
            const crack = timeCracks[i];
            if (newHead.x === crack.x && newHead.y === crack.y) {
                if (!isStasis) {
                    playCrackHitSound();
                    createEatParticles(crack.x, crack.y, PALETTE.redAlert);
                    addFloatText(crack.x, crack.y, "CRACK!", PALETTE.redAlert);
                    if (snake.length > 2) {
                        snake.pop(); // Lose tail length
                    } else {
                        triggerGameOver("时空裂缝撕裂了你的能量流！");
                        return;
                    }
                } else {
                    // Destroy crack in Stasis
                    timeCracks.splice(i, 1);
                    addFloatText(crack.x, crack.y, "CRACK CLEARED!", PALETTE.emerald);
                }
            }
        }

        updateTimeCracks();
        updateUI();
    }

    function handleEatShard(shard) {
        let earnedScore = shard.type.score * combo;

        // Check Echo Resonance Bonus (if food was near Echo Phantom)
        const echoSnake = getEchoSnake();
        const isEchoResonance = echoSnake.some(e => Math.abs(e.x - shard.x) <= 1 && Math.abs(e.y - shard.y) <= 1);
        if (isEchoResonance) {
            earnedScore += 150;
            addFloatText(shard.x, shard.y, `RESONANCE! +${earnedScore}`, PALETTE.violet);
        } else {
            addFloatText(shard.x, shard.y, `+${earnedScore}`, shard.type.color);
        }

        score += earnedScore;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('daily_snake_chrono_highscore', highScore.toString());
        }

        // Update Combo & Energy
        comboTimer = 5; // Reset combo timer
        if (shard.type === SHARD_TYPES.CYAN) {
            combo = Math.min(combo + 1, 5);
            speedBoostTimer = 3;
            playComboSound(combo);
        } else {
            playShardSound(shard.type);
        }

        energy = Math.min(100, energy + shard.type.energy);

        if (shard.type === SHARD_TYPES.VIOLET) {
            timeCracks = []; // Disintegrate all time cracks
            addFloatText(shard.x, shard.y, "PARADOX CLEARED!", PALETTE.violet);
        }
    }

    function triggerStasis() {
        if (energy < 100 || isStasis || !isPlaying || isGameOver) return;
        energy = 0;
        isStasis = true;
        stasisTimer = 3.5; // 3.5 seconds of Stasis
        stasisOverlay.classList.add('active');
        timeWarpOverlay.classList.add('active');
        playStasisSound();
        addFloatText(snake[0].x, snake[0].y, "STASIS MODE!", PALETTE.violet);
        updateUI();
    }

    function triggerGameOver(reason) {
        isPlaying = false;
        isGameOver = true;
        playGameOverSound();

        gameoverReason.textContent = reason;
        finalScore.textContent = score;
        finalHighScore.textContent = highScore;
        finalComboCount.textContent = `x${combo}`;

        gameoverScreen.classList.add('active');
        stasisOverlay.classList.remove('active');
        timeWarpOverlay.classList.remove('active');
        canvasStatus.textContent = "因果崩溃 - 请点击按钮重构时空";
    }

    // ==========================================
    // UI Update Helper
    // ==========================================
    function updateUI() {
        scoreVal.textContent = score;
        highScoreVal.textContent = highScore;
        comboVal.textContent = `x${combo}`;

        energyBarFill.style.width = `${energy}%`;
        if (energy >= 100) {
            energyBarFill.classList.add('full');
            skillBtn.disabled = false;
        } else {
            energyBarFill.classList.remove('full');
            skillBtn.disabled = true;
        }
    }

    // ==========================================
    // Floating Text & Particles
    // ==========================================
    function addFloatText(gx, gy, text, color) {
        floatTexts.push({
            x: (gx + 0.5) * cellSize,
            y: (gy + 0.5) * cellSize,
            text: text,
            color: color,
            alpha: 1,
            scale: 1.2
        });
    }

    function createEatParticles(gx, gy, color) {
        const px = (gx + 0.5) * cellSize;
        const py = (gy + 0.5) * cellSize;
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 3,
                color: color,
                alpha: 1,
                life: 0.5 + Math.random() * 0.5
            });
        }
    }

    // ==========================================
    // Canvas Render Engine
    // ==========================================
    function render(timestamp) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Grid & Rotating Background Gears
        drawBackgroundGears();
        drawGrid();

        // 2. Draw Time Cracks
        drawTimeCracks();

        // 3. Draw Shards
        drawShards(timestamp);

        // 4. Draw Echo Phantom (Ghost Snake)
        drawEchoPhantom();

        // 5. Draw Active Snake
        drawSnake();

        // 6. Draw Particles & Floating Texts
        drawParticles();
        drawFloatTexts();

        // Timers & Speed Adjustments
        const deltaTime = (timestamp - (lastTickTime || timestamp)) / 1000;

        if (isPlaying && !isPaused) {
            if (stasisTimer > 0) {
                stasisTimer -= deltaTime;
                if (stasisTimer <= 0) {
                    isStasis = false;
                    stasisOverlay.classList.remove('active');
                    timeWarpOverlay.classList.remove('active');
                }
            }

            if (speedBoostTimer > 0) {
                speedBoostTimer -= deltaTime;
            }

            // Move interval calculation
            let currentInterval = baseMoveInterval;
            if (isStasis) currentInterval *= 1.4; // Slow down control in stasis
            else if (speedBoostTimer > 0) currentInterval *= 0.65; // Speed boost

            if (timestamp - lastTickTime > currentInterval) {
                gameStep();
                lastTickTime = timestamp;
            }
        }

        requestAnimationFrame(render);
    }

    function drawBackgroundGears() {
        ctx.save();
        backgroundAngle += 0.003;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(backgroundAngle);

        ctx.strokeStyle = PALETTE.gridLine;
        ctx.lineWidth = 1.5;

        // Outer Gear Circle
        ctx.beginPath();
        ctx.arc(0, 0, canvas.width * 0.42, 0, Math.PI * 2);
        ctx.stroke();

        // Inner Clock Dials
        for (let i = 0; i < 12; i++) {
            const rad = (i * Math.PI) / 6;
            const x1 = Math.cos(rad) * canvas.width * 0.38;
            const y1 = Math.sin(rad) * canvas.width * 0.38;
            const x2 = Math.cos(rad) * canvas.width * 0.42;
            const y2 = Math.sin(rad) * canvas.width * 0.42;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawGrid() {
        ctx.strokeStyle = PALETTE.gridLine;
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, canvas.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(canvas.width, i * cellSize);
            ctx.stroke();
        }

        // Draw glowing grid dots at intersections
        ctx.fillStyle = PALETTE.gridDot;
        for (let x = 1; x < GRID_SIZE; x += 3) {
            for (let y = 1; y < GRID_SIZE; y += 3) {
                ctx.beginPath();
                ctx.arc(x * cellSize, y * cellSize, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawTimeCracks() {
        timeCracks.forEach(crack => {
            const px = (crack.x + 0.5) * cellSize;
            const py = (crack.y + 0.5) * cellSize;
            const size = cellSize * 0.4;

            ctx.save();
            ctx.strokeStyle = PALETTE.redAlert;
            ctx.lineWidth = 2;
            ctx.shadowColor = PALETTE.redAlert;
            ctx.shadowBlur = 12;

            ctx.beginPath();
            ctx.moveTo(px - size, py);
            ctx.lineTo(px, py - size * 1.2);
            ctx.lineTo(px + size * 0.6, py + size * 0.4);
            ctx.lineTo(px + size, py - size * 0.5);
            ctx.stroke();

            ctx.restore();
        });
    }

    function drawShards(timestamp) {
        shards.forEach(s => {
            const px = (s.x + 0.5) * cellSize;
            const py = (s.y + 0.5) * cellSize;
            const pulse = Math.sin(timestamp * 0.005 + s.pulseOffset) * 2;
            const size = (cellSize * 0.32) + pulse;

            ctx.save();
            ctx.fillStyle = s.type.color;
            ctx.shadowColor = s.type.color;
            ctx.shadowBlur = 14;

            ctx.beginPath();
            // Draw Diamond Crystal Shape
            ctx.moveTo(px, py - size);
            ctx.lineTo(px + size * 0.8, py);
            ctx.lineTo(px, py + size);
            ctx.lineTo(px - size * 0.8, py);
            ctx.closePath();
            ctx.fill();

            // Inner Core Highlight
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(px, py, size * 0.25, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    }

    function drawEchoPhantom() {
        const echoSnake = getEchoSnake();
        if (echoSnake.length === 0) return;

        ctx.save();
        ctx.shadowColor = PALETTE.violet;
        ctx.shadowBlur = 10;

        // Draw Echo Connecting Line
        ctx.strokeStyle = 'rgba(224, 36, 255, 0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        echoSnake.forEach((seg, idx) => {
            const px = (seg.x + 0.5) * cellSize;
            const py = (seg.y + 0.5) * cellSize;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Draw Echo Nodes
        echoSnake.forEach((seg, idx) => {
            const px = (seg.x + 0.5) * cellSize;
            const py = (seg.y + 0.5) * cellSize;
            const radius = (cellSize * 0.38) * (1 - idx * 0.02);

            ctx.fillStyle = PALETTE.echoBody;
            ctx.beginPath();
            ctx.arc(px, py, Math.max(radius, 4), 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = PALETTE.violet;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });

        ctx.restore();
    }

    function drawSnake() {
        if (snake.length === 0) return;

        ctx.save();

        // Draw Snake Body
        for (let i = snake.length - 1; i >= 1; i--) {
            const seg = snake[i];
            const px = (seg.x + 0.5) * cellSize;
            const py = (seg.y + 0.5) * cellSize;
            const radius = (cellSize * 0.42) * (1 - (i / snake.length) * 0.3);

            ctx.fillStyle = isStasis ? PALETTE.violet : PALETTE.cyan;
            ctx.shadowColor = isStasis ? PALETTE.violet : PALETTE.cyan;
            ctx.shadowBlur = 12;

            ctx.beginPath();
            ctx.arc(px, py, Math.max(radius, 4), 0, Math.PI * 2);
            ctx.fill();

            // Inner Brass Gear Accent
            ctx.fillStyle = PALETTE.amber;
            ctx.beginPath();
            ctx.arc(px, py, radius * 0.35, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Snake Head (Chrono Core)
        const head = snake[0];
        const hx = (head.x + 0.5) * cellSize;
        const hy = (head.y + 0.5) * cellSize;
        const headRadius = cellSize * 0.45;

        ctx.fillStyle = isStasis ? PALETTE.violet : PALETTE.cyan;
        ctx.shadowColor = isStasis ? PALETTE.violet : PALETTE.cyan;
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.arc(hx, hy, headRadius, 0, Math.PI * 2);
        ctx.fill();

        // Outer Head Ring
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Direction Hand Arrow
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + direction.x * headRadius * 0.8, hy + direction.y * headRadius * 0.8);
        ctx.stroke();

        ctx.restore();
    }

    function drawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.02;

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
    }

    function drawFloatTexts() {
        for (let i = floatTexts.length - 1; i >= 0; i--) {
            const ft = floatTexts[i];
            ft.y -= 0.8;
            ft.alpha -= 0.025;

            if (ft.alpha <= 0) {
                floatTexts.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.font = `bold 16px var(--font-heading)`;
            ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 10;
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    // ==========================================
    // Event Listeners (Keyboard & Touch Controls)
    // ==========================================
    function handleDirectionInput(dx, dy) {
        initAudio();
        // Prevent 180-degree instant reversal
        if (dx !== 0 && direction.x === -dx) return;
        if (dy !== 0 && direction.y === -dy) return;
        nextDirection = { x: dx, y: dy };
    }

    window.addEventListener('keydown', (e) => {
        if (!isPlaying || isGameOver) return;
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W':
                handleDirectionInput(0, -1);
                break;
            case 'ArrowDown': case 's': case 'S':
                handleDirectionInput(0, 1);
                break;
            case 'ArrowLeft': case 'a': case 'A':
                handleDirectionInput(-1, 0);
                break;
            case 'ArrowRight': case 'd': case 'D':
                handleDirectionInput(1, 0);
                break;
            case ' ':
                triggerStasis();
                break;
            case 'p': case 'P':
                isPaused = !isPaused;
                canvasStatus.textContent = isPaused ? "游戏暂停 - 按 P 键继续" : "时空运行中";
                break;
        }
    });

    // Mobile D-Pad Buttons
    btnUp.addEventListener('click', () => handleDirectionInput(0, -1));
    btnDown.addEventListener('click', () => handleDirectionInput(0, 1));
    btnLeft.addEventListener('click', () => handleDirectionInput(-1, 0));
    btnRight.addEventListener('click', () => handleDirectionInput(1, 0));
    btnCenter.addEventListener('click', triggerStasis);
    skillBtn.addEventListener('click', triggerStasis);

    // Touch Swipe Controls on Canvas
    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
        if (!isPlaying) return;
        const diffX = e.changedTouches[0].clientX - touchStartX;
        const diffY = e.changedTouches[0].clientY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > 20) {
                handleDirectionInput(diffX > 0 ? 1 : -1, 0);
            }
        } else {
            if (Math.abs(diffY) > 20) {
                handleDirectionInput(0, diffY > 0 ? 1 : -1);
            }
        }
    }, { passive: true });

    // Buttons Setup
    startBtn.addEventListener('click', () => {
        playStartSound();
        initGame();
    });

    restartBtn.addEventListener('click', () => {
        playStartSound();
        initGame();
    });

    soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    });

    helpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    closeHelp.addEventListener('click', () => helpModal.classList.remove('active'));
    confirmHelp.addEventListener('click', () => helpModal.classList.remove('active'));

    // Start Animation Loop
    requestAnimationFrame(render);
});
