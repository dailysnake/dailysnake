/**
 * Cyber Street Spray: Graffiti Art & Territory Loop (2026-08-10)
 * Daily Snake Workshop - Canvas & Web Audio API Game Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    // Canvas & Context Setup
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const GRID_SIZE = 20; // 20x20 Grid
    const CELL_SIZE = canvas.width / GRID_SIZE; // 30px

    // Color Palette & Spray Can Types
    const PALETTE = {
        bgDark: '#090b12',
        brickLine: 'rgba(0, 240, 255, 0.08)',
        cyan: '#00f0ff',
        magenta: '#ff007f',
        pink: '#ff007f',
        yellow: '#ffe600',
        purple: '#a855f7',
        gold: '#ffb700',
        brickHazard: '#1e293b',
        brickBorder: '#475569'
    };

    const SPRAY_TYPES = [
        { type: 'cyan', color: PALETTE.cyan, name: '青蓝喷漆', score: 10 },
        { type: 'magenta', color: PALETTE.magenta, name: '品红喷漆', score: 10 },
        { type: 'yellow', color: PALETTE.yellow, name: '荧光黄喷漆', score: 10 }
    ];

    // Canvas Background Painted Map (Grid 20x20)
    let paintedGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    // Game State Variables
    let snake = [];
    let direction = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let sprayCans = [];
    let goldCan = null;
    let brickHazards = [];
    let particles = [];
    let floatTexts = [];

    let score = 0;
    let highScore = parseInt(localStorage.getItem('daily_snake_spray_highscore') || '0', 10);
    let combo = 1;
    let lastColorType = null;
    let energy = 0; // 0 - 100
    let isHyperMode = false;
    let hyperTimer = 0;

    let isPlaying = false;
    let isGameOver = false;
    let lastMoveTime = 0;
    let moveInterval = 120; // ms per tick

    // Audio Context
    let audioCtx = null;
    let soundEnabled = true;

    // UI Element References
    const scoreVal = document.getElementById('score-val');
    const highScoreVal = document.getElementById('high-score-val');
    const comboVal = document.getElementById('combo-val');
    const energyBarFill = document.getElementById('energy-bar-fill');
    const skillBtn = document.getElementById('skill-btn');
    const hyperOverlay = document.getElementById('hyper-overlay');
    const startScreen = document.getElementById('start-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const soundBtn = document.getElementById('sound-btn');
    const soundIcon = document.getElementById('sound-icon');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');
    const confirmHelp = document.getElementById('confirm-help');
    const canvasStatus = document.getElementById('canvas-status');

    // Final Stats Elements
    const finalScore = document.getElementById('final-score');
    const finalHighScore = document.getElementById('final-high-score');
    const finalComboCount = document.getElementById('final-combo-count');

    // Mobile D-Pad Buttons
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnCenter = document.getElementById('btn-center');

    // Initialize High Score Display
    highScoreVal.textContent = highScore;

    // Web Audio Synthesizer Initialization
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

    // Sound Synthesizers
    function playSpraySound() {
        if (!soundEnabled || !audioCtx) return;
        try {
            const bufferSize = audioCtx.sampleRate * 0.08;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1800;
            filter.Q.value = 3;

            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            noise.start();
        } catch (e) {
            console.error(e);
        }
    }

    function playEatSound(type, currentCombo) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            let baseFreq = 440;
            if (type === 'cyan') baseFreq = 523.25; // C5
            else if (type === 'magenta') baseFreq = 659.25; // E5
            else if (type === 'yellow') baseFreq = 783.99; // G5
            else if (type === 'gold') baseFreq = 1046.50; // C6

            const pitchMultiplier = 1 + (currentCombo - 1) * 0.12;
            osc.frequency.setValueAtTime(baseFreq * pitchMultiplier, audioCtx.currentTime);
            osc.type = 'triangle';

            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.18);
        } catch (e) {
            console.error(e);
        }
    }

    function playHyperSound() {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.35);

            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        } catch (e) {
            console.error(e);
        }
    }

    function playGameOverSound() {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.5);

            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            console.error(e);
        }
    }

    // Trigger Haptic Feedback
    function triggerHaptic(pattern = [25]) {
        if (navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch(e){}
        }
    }

    // Game Reset & Start
    function resetGame() {
        snake = [
            { x: 10, y: 10, color: PALETTE.cyan },
            { x: 9, y: 10, color: PALETTE.cyan },
            { x: 8, y: 10, color: PALETTE.cyan }
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };

        paintedGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        // Initial spray on starting tiles
        snake.forEach(seg => {
            paintedGrid[seg.y][seg.x] = seg.color;
        });

        score = 0;
        combo = 1;
        lastColorType = null;
        energy = 0;
        isHyperMode = false;
        hyperTimer = 0;
        moveInterval = 120;

        sprayCans = [];
        goldCan = null;
        brickHazards = [];
        particles = [];
        floatTexts = [];

        updateUI();
        spawnSprayCans(3);
        spawnBricks(2);

        isGameOver = false;
        isPlaying = true;

        startScreen.classList.add('hidden');
        gameoverScreen.classList.add('hidden');
        hyperOverlay.classList.add('hidden');
        canvasStatus.textContent = 'STATUS: ART IN PROGRESS';

        lastMoveTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

    // Spawn Spray Cans
    function spawnSprayCans(count) {
        for (let i = 0; i < count; i++) {
            const pos = getRandomEmptyPos();
            if (pos) {
                const typeObj = SPRAY_TYPES[Math.floor(Math.random() * SPRAY_TYPES.length)];
                sprayCans.push({
                    x: pos.x,
                    y: pos.y,
                    ...typeObj,
                    scale: 1,
                    pulse: Math.random() * Math.PI * 2
                });
            }
        }
    }

    // Spawn Rare Gold Can
    function spawnGoldCan() {
        if (goldCan || Math.random() > 0.35) return;
        const pos = getRandomEmptyPos();
        if (pos) {
            goldCan = {
                x: pos.x,
                y: pos.y,
                type: 'gold',
                color: PALETTE.gold,
                name: '金箔喷罐',
                score: 50,
                pulse: 0,
                duration: 400 // frames before disappearing
            };
        }
    }

    // Spawn Brick Hazards
    function spawnBricks(count) {
        for (let i = 0; i < count; i++) {
            const pos = getRandomEmptyPos();
            if (pos) {
                brickHazards.push({ x: pos.x, y: pos.y });
            }
        }
    }

    // Find Empty Grid Location
    function getRandomEmptyPos() {
        const occupied = new Set();
        snake.forEach(seg => occupied.add(`${seg.x},${seg.y}`));
        sprayCans.forEach(can => occupied.add(`${can.x},${can.y}`));
        if (goldCan) occupied.add(`${goldCan.x},${goldCan.y}`);
        brickHazards.forEach(b => occupied.add(`${b.x},${b.y}`));

        const empty = [];
        for (let y = 1; y < GRID_SIZE - 1; y++) {
            for (let x = 1; x < GRID_SIZE - 1; x++) {
                if (!occupied.has(`${x},${y}`)) {
                    empty.push({ x, y });
                }
            }
        }
        if (empty.length === 0) return null;
        return empty[Math.floor(Math.random() * empty.length)];
    }

    // Main Game Loop
    function gameLoop(timestamp) {
        if (!isPlaying) return;

        const delta = timestamp - lastMoveTime;

        if (delta >= moveInterval) {
            updateGameLogic();
            lastMoveTime = timestamp;
        }

        renderCanvas();
        requestAnimationFrame(gameLoop);
    }

    // Update Game Physics & Logic
    function updateGameLogic() {
        if (isGameOver) return;

        // Apply Next Direction
        direction = { ...nextDirection };

        // Calculate Head Position
        const newHead = {
            x: snake[0].x + direction.x,
            y: snake[0].y + direction.y,
            color: snake[0].color
        };

        // Screen Boundary Check
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
            if (isHyperMode) {
                // Wrap around during hyper mode
                newHead.x = (newHead.x + GRID_SIZE) % GRID_SIZE;
                newHead.y = (newHead.y + GRID_SIZE) % GRID_SIZE;
            } else {
                handleGameOver('撞击街头外沿界壁！');
                return;
            }
        }

        // Brick Hazard Collision
        const brickIdx = brickHazards.findIndex(b => b.x === newHead.x && b.y === newHead.y);
        if (brickIdx !== -1) {
            if (isHyperMode) {
                // Destroy brick in Hyper Mode
                const b = brickHazards.splice(brickIdx, 1)[0];
                addParticles(b.x * CELL_SIZE + CELL_SIZE / 2, b.y * CELL_SIZE + CELL_SIZE / 2, PALETTE.brickBorder, 14);
                addFloatText(b.x * CELL_SIZE, b.y * CELL_SIZE, '+20 障碍粉碎', PALETTE.yellow);
                score += 20;
                playSpraySound();
                triggerHaptic([30, 20, 30]);
            } else {
                handleGameOver('撞击黑夜废墟砖墙！');
                return;
            }
        }

        // Self Body Collision Check (Skip tail as it moves)
        for (let i = 0; i < snake.length - 1; i++) {
            if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
                if (!isHyperMode) {
                    handleGameOver('缠绕自身喷涂轨迹！');
                    return;
                }
            }
        }

        // Hyper Mode Duration Timer
        if (isHyperMode) {
            hyperTimer--;
            if (hyperTimer <= 0) {
                isHyperMode = false;
                hyperOverlay.classList.add('hidden');
            }
        }

        // Hyper Spray Magnet Cone Effect
        if (isHyperMode) {
            sprayCans.forEach(can => {
                const dist = Math.hypot(can.x - newHead.x, can.y - newHead.y);
                if (dist <= 3.5 && dist > 0) {
                    // Pull towards head
                    if (can.x < newHead.x) can.x++;
                    else if (can.x > newHead.x) can.x--;
                    if (can.y < newHead.y) can.y++;
                    else if (can.y > newHead.y) can.y--;
                }
            });
        }

        // Move Snake Head
        snake.unshift(newHead);

        // Paint current cell on canvas
        paintedGrid[newHead.y][newHead.x] = newHead.color;
        addParticles(newHead.x * CELL_SIZE + CELL_SIZE / 2, newHead.y * CELL_SIZE + CELL_SIZE / 2, newHead.color, 3);

        // Check Spray Can Collection
        let ateCan = false;
        const canIdx = sprayCans.findIndex(c => c.x === newHead.x && c.y === newHead.y);
        if (canIdx !== -1) {
            const can = sprayCans.splice(canIdx, 1)[0];
            ateCan = true;
            processCanPickup(can);
        }

        // Check Gold Can Collection
        if (goldCan && goldCan.x === newHead.x && goldCan.y === newHead.y) {
            const can = goldCan;
            goldCan = null;
            ateCan = true;
            processCanPickup(can);
        }

        if (!ateCan) {
            // Remove tail if no spray can eaten
            snake.pop();
        }

        // Respawn spray cans & gold can
        if (sprayCans.length < 3) {
            spawnSprayCans(3 - sprayCans.length);
        }

        if (goldCan) {
            goldCan.duration--;
            if (goldCan.duration <= 0) goldCan = null;
        } else if (Math.random() < 0.05) {
            spawnGoldCan();
        }

        // Periodically spawn new brick hazard every 100 points
        if (score > 0 && score % 100 === 0 && brickHazards.length < 8 && Math.random() < 0.2) {
            spawnBricks(1);
        }

        // Speed adjustment with score
        moveInterval = Math.max(70, 120 - Math.floor(score / 80) * 5);

        updateUI();
    }

    // Process Spray Can Pickup
    function processCanPickup(can) {
        // Set snake head color to the picked spray color
        snake[0].color = can.color;
        paintedGrid[can.y][can.x] = can.color;

        // Combo Logic: Picking 3 different colors increases combo multiplier!
        if (can.type === 'gold') {
            combo = Math.min(5, combo + 1);
            energy = Math.min(100, energy + 30);
            addFloatText(can.x * CELL_SIZE, can.y * CELL_SIZE, `+${can.score * combo} 金箔爆发!`, PALETTE.gold);
        } else {
            if (lastColorType && lastColorType !== can.type) {
                combo = Math.min(5, combo + 1);
            } else if (lastColorType === can.type && combo > 1) {
                combo = Math.max(1, combo - 1);
            }
            lastColorType = can.type;
            energy = Math.min(100, energy + 12);
            addFloatText(can.x * CELL_SIZE, can.y * CELL_SIZE, `+${can.score * combo}`, can.color);
        }

        const gainedScore = can.score * combo;
        score += gainedScore;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('daily_snake_spray_highscore', highScore);
        }

        playEatSound(can.type, combo);
        playSpraySound();
        triggerHaptic([20, 10, 20]);

        addParticles(can.x * CELL_SIZE + CELL_SIZE / 2, can.y * CELL_SIZE + CELL_SIZE / 2, can.color, 16);
    }

    // Add Particle Burst Effects
    function addParticles(cx, cy, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 3,
                color: color,
                alpha: 1,
                life: 1
            });
        }
    }

    // Add Floating Score Text Effect
    function addFloatText(x, y, text, color) {
        floatTexts.push({
            x: x + CELL_SIZE / 2,
            y: y,
            text: text,
            color: color,
            alpha: 1,
            vy: -1.2
        });
    }

    // Activate Hyper Spray Mode [Space]
    function activateHyperMode() {
        if (energy < 100 || isHyperMode || !isPlaying) return;

        energy = 0;
        isHyperMode = true;
        hyperTimer = 50; // ~6 seconds ticks

        hyperOverlay.classList.remove('hidden');
        playHyperSound();
        triggerHaptic([40, 30, 60]);

        addFloatText(snake[0].x * CELL_SIZE, snake[0].y * CELL_SIZE, '🎨 HYPER SPRAY 极速爆发!', PALETTE.magenta);
        updateUI();
    }

    // Game Over Handler
    function handleGameOver(reason) {
        isPlaying = false;
        isGameOver = true;

        playGameOverSound();
        triggerHaptic([100, 50, 100]);

        finalScore.textContent = score;
        finalHighScore.textContent = highScore;
        finalComboCount.textContent = `x${combo}`;

        gameoverScreen.classList.remove('hidden');
        hyperOverlay.classList.add('hidden');
        canvasStatus.textContent = 'STATUS: JAM OVER';
    }

    // Render Canvas
    function renderCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Brick Background Wall Grid
        ctx.fillStyle = PALETTE.bgDark;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Subdued Grid & Brick Lines
        ctx.strokeStyle = PALETTE.brickLine;
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, canvas.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(canvas.width, i * CELL_SIZE);
            ctx.stroke();
        }

        // 2. Render Painted Tile Canvas Map
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const color = paintedGrid[r][c];
                if (color) {
                    ctx.save();
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.22;
                    ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);

                    // Add soft glow center
                    ctx.globalAlpha = 0.4;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(c * CELL_SIZE + 8, r * CELL_SIZE + 8, CELL_SIZE - 16, CELL_SIZE - 16);
                    ctx.restore();
                }
            }
        }

        // 3. Render Brick Hazard Obstacles
        brickHazards.forEach(b => {
            ctx.save();
            ctx.fillStyle = PALETTE.brickHazard;
            ctx.strokeStyle = isHyperMode ? PALETTE.pink : PALETTE.brickBorder;
            ctx.lineWidth = 2;

            ctx.fillRect(b.x * CELL_SIZE + 2, b.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            ctx.strokeRect(b.x * CELL_SIZE + 2, b.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);

            // Brick Texture Cross Hatching
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.moveTo(b.x * CELL_SIZE + 4, b.y * CELL_SIZE + CELL_SIZE / 2);
            ctx.lineTo(b.x * CELL_SIZE + CELL_SIZE - 4, b.y * CELL_SIZE + CELL_SIZE / 2);
            ctx.stroke();
            ctx.restore();
        });

        // 4. Render Spray Cans
        sprayCans.forEach(can => {
            can.pulse += 0.08;
            const scale = 1 + Math.sin(can.pulse) * 0.08;
            const cx = can.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = can.y * CELL_SIZE + CELL_SIZE / 2;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);

            // Outer Spray Can Glow
            ctx.shadowColor = can.color;
            ctx.shadowBlur = 12;

            // Can Body
            ctx.fillStyle = can.color;
            ctx.beginPath();
            ctx.roundRect(-CELL_SIZE * 0.35, -CELL_SIZE * 0.35, CELL_SIZE * 0.7, CELL_SIZE * 0.7, 6);
            ctx.fill();

            // Can Cap
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-CELL_SIZE * 0.15, -CELL_SIZE * 0.45, CELL_SIZE * 0.3, CELL_SIZE * 0.12);

            ctx.restore();
        });

        // 5. Render Rare Gold Can
        if (goldCan) {
            goldCan.pulse += 0.1;
            const scale = 1.1 + Math.sin(goldCan.pulse) * 0.12;
            const cx = goldCan.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = goldCan.y * CELL_SIZE + CELL_SIZE / 2;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);

            ctx.shadowColor = PALETTE.gold;
            ctx.shadowBlur = 20;

            ctx.fillStyle = PALETTE.gold;
            ctx.beginPath();
            ctx.arc(0, 0, CELL_SIZE * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🌟', 0, 0);

            ctx.restore();
        }

        // 6. Render Snake Body & Head
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const cx = seg.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = seg.y * CELL_SIZE + CELL_SIZE / 2;
            const radius = (CELL_SIZE / 2) * (i === 0 ? 0.95 : 0.85);

            ctx.save();
            ctx.shadowColor = isHyperMode ? PALETTE.pink : seg.color;
            ctx.shadowBlur = isHyperMode ? 20 : 10;

            ctx.fillStyle = isHyperMode ? (i % 2 === 0 ? PALETTE.cyan : PALETTE.pink) : seg.color;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();

            // Connect segments with smooth stroke
            if (i < snake.length - 1) {
                const nextSeg = snake[i + 1];
                const ncx = nextSeg.x * CELL_SIZE + CELL_SIZE / 2;
                const ncy = nextSeg.y * CELL_SIZE + CELL_SIZE / 2;

                ctx.strokeStyle = isHyperMode ? PALETTE.yellow : seg.color;
                ctx.lineWidth = radius * 1.6;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(ncx, ncy);
                ctx.stroke();
            }

            // Head Features
            if (i === 0) {
                // Eyes
                ctx.fillStyle = '#000000';
                const eyeOffset = 6;
                const eyeX1 = cx + (direction.y !== 0 ? eyeOffset : direction.x * 4);
                const eyeY1 = cy + (direction.x !== 0 ? eyeOffset : direction.y * 4);
                const eyeX2 = cx - (direction.y !== 0 ? eyeOffset : -direction.x * 4);
                const eyeY2 = cy - (direction.x !== 0 ? eyeOffset : -direction.y * 4);

                ctx.beginPath();
                ctx.arc(eyeX1, eyeY1, 3, 0, Math.PI * 2);
                ctx.arc(eyeX2, eyeY2, 3, 0, Math.PI * 2);
                ctx.fill();

                // Nozzle Spray Cone Particles if moving
                if (isPlaying) {
                    ctx.fillStyle = seg.color;
                    ctx.beginPath();
                    ctx.arc(cx + direction.x * 12, cy + direction.y * 12, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        }

        // 7. Render Particle Systems
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            p.alpha = Math.max(0, p.life);

            if (p.life <= 0) {
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

        // 8. Render Floating Texts
        for (let i = floatTexts.length - 1; i >= 0; i--) {
            const ft = floatTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.025;

            if (ft.alpha <= 0) {
                floatTexts.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.font = 'bold 14px Orbitron, sans-serif';
            ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    // Update UI Stats & Energy Bar
    function updateUI() {
        scoreVal.textContent = score;
        highScoreVal.textContent = highScore;
        comboVal.textContent = `x${combo}`;
        energyBarFill.style.width = `${energy}%`;

        if (energy >= 100) {
            skillBtn.disabled = false;
            skillBtn.classList.add('pulse-glow');
        } else {
            skillBtn.disabled = true;
            skillBtn.classList.remove('pulse-glow');
        }
    }

    // Key Event Handlers
    function handleKeyDown(e) {
        initAudio();
        if (!isPlaying) {
            if (e.key === ' ' || e.key === 'Enter') {
                resetGame();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (direction.y === 0) nextDirection = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (direction.y === 0) nextDirection = { x: 0, y: 1 };
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (direction.x === 0) nextDirection = { x: -1, y: 0 };
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (direction.x === 0) nextDirection = { x: 1, y: 0 };
                break;
            case ' ':
                activateHyperMode();
                break;
        }
    }

    // Touch Swipe Detection on Canvas
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
        if (e.changedTouches.length === 0 || !isPlaying) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;

        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (Math.max(absX, absY) > 25) {
            if (absX > absY) {
                if (deltaX > 0 && direction.x === 0) nextDirection = { x: 1, y: 0 };
                else if (deltaX < 0 && direction.x === 0) nextDirection = { x: -1, y: 0 };
            } else {
                if (deltaY > 0 && direction.y === 0) nextDirection = { x: 0, y: 1 };
                else if (deltaY < 0 && direction.y === 0) nextDirection = { x: 0, y: -1 };
            }
        }
    }, { passive: true });

    // D-Pad Button Listeners
    btnUp.addEventListener('click', () => { initAudio(); if (direction.y === 0) nextDirection = { x: 0, y: -1 }; });
    btnDown.addEventListener('click', () => { initAudio(); if (direction.y === 0) nextDirection = { x: 0, y: 1 }; });
    btnLeft.addEventListener('click', () => { initAudio(); if (direction.x === 0) nextDirection = { x: -1, y: 0 }; });
    btnRight.addEventListener('click', () => { initAudio(); if (direction.x === 0) nextDirection = { x: 1, y: 0 }; });
    btnCenter.addEventListener('click', () => { initAudio(); activateHyperMode(); });

    // UI Buttons
    startBtn.addEventListener('click', () => { initAudio(); resetGame(); });
    restartBtn.addEventListener('click', () => { initAudio(); resetGame(); });
    skillBtn.addEventListener('click', () => { initAudio(); activateHyperMode(); });

    soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    });

    helpBtn.addEventListener('click', () => { helpModal.classList.remove('hidden'); });
    closeHelp.addEventListener('click', () => { helpModal.classList.add('hidden'); });
    confirmHelp.addEventListener('click', () => { helpModal.classList.add('hidden'); });

    window.addEventListener('keydown', handleKeyDown);

    // Initial render on canvas
    renderCanvas();
});
