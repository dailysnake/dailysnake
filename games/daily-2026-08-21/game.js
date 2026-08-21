/**
 * 折纸神裁：和纸灵蛇与维度折叠 (2026-08-21)
 * Washi Origami & Spatial Folding Snake Game Engine
 */

(function () {
    'use strict';

    // Canvas & Setup
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const GRID_COLS = 30;
    const GRID_ROWS = 20;
    const CELL_SIZE = 30; // 900x600 canvas

    // Game States
    const STATE_IDLE = 'IDLE';
    const STATE_PLAYING = 'PLAYING';
    const STATE_PAUSED = 'PAUSED';
    const STATE_GAMEOVER = 'GAMEOVER';

    let gameState = STATE_IDLE;
    let score = 0;
    let combo = 1;
    let comboTimer = 0;
    let highScore = parseInt(localStorage.getItem('origami_snake_highscore') || '0', 10);
    let energy = 0; // 0 to 100
    const MAX_ENERGY = 100;

    // Origami Forms
    const FORM_WASHI = '和纸蛇';
    const FORM_CRANE = '鹤灵形态';
    const FORM_FROG = '跳跳蛙形态';
    const FORM_SAMURAI = '折纸武士';

    let currentForm = FORM_WASHI;
    let formDuration = 0; // Frames left for special form

    // Direction Vectors
    const DIR_UP = { x: 0, y: -1 };
    const DIR_DOWN = { x: 0, y: 1 };
    const DIR_LEFT = { x: -1, y: 0 };
    const DIR_RIGHT = { x: 1, y: 0 };

    let snake = [];
    let dir = DIR_RIGHT;
    let nextDir = DIR_RIGHT;
    let moveCounter = 0;
    let moveInterval = 7; // frames per grid step

    // Collectibles & Obstacles
    let cranes = []; // {x, y, color, pulse}
    let inkDrops = []; // {x, y, color}
    let scissors = []; // {x, y, vx, vy, rot, size}
    let foldLines = []; // {type: 'H'|'V', pos: lineIndex, pairPos: lineIndex, active}

    // Floating FX Particles
    let particles = [];
    let floatingTexts = [];

    // Audio Synthesizer
    let audioMuted = false;
    let audioCtx = null;

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
        if (audioMuted || !audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            if (type === 'eat') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(640, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'combo') {
                osc.type = 'sine';
                const freq = 440 + combo * 110;
                osc.frequency.setValueAtTime(freq, now);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'teleport') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'form') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(900, now + 0.3);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } else if (type === 'slash') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'hop') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'die') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.4);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
            }
        } catch (e) {
            console.error(e);
        }
    }

    // DOM Elements
    const scoreDisplay = document.getElementById('score-display');
    const comboDisplay = document.getElementById('combo-display');
    const highscoreDisplay = document.getElementById('highscore-display');
    const skillStatusText = document.getElementById('skill-status-text');
    const energyBarFill = document.getElementById('energy-bar-fill');
    const formDisplay = document.getElementById('form-display');

    const startOverlay = document.getElementById('start-overlay');
    const pauseOverlay = document.getElementById('pause-overlay');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const finalScore = document.getElementById('final-score');
    const finalHighscore = document.getElementById('final-highscore');
    const finalCombo = document.getElementById('final-combo');

    const startBtn = document.getElementById('start-game-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const restartBtn = document.getElementById('restart-game-btn');
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    const audioOnIcon = document.getElementById('audio-on-icon');
    const audioOffIcon = document.getElementById('audio-off-icon');

    // High Score init
    highscoreDisplay.textContent = highScore;

    // Reset & Start Game
    function resetGame() {
        snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 },
            { x: 7, y: 10 }
        ];
        dir = DIR_RIGHT;
        nextDir = DIR_RIGHT;
        score = 0;
        combo = 1;
        comboTimer = 0;
        energy = 0;
        currentForm = FORM_WASHI;
        formDuration = 0;

        cranes = [];
        inkDrops = [];
        scissors = [];
        particles = [];
        floatingTexts = [];

        generateFoldLines();
        spawnCrane();
        spawnInkDrop();
        spawnScissors();

        updateHUD();
    }

    function generateFoldLines() {
        foldLines = [
            { type: 'H', pos: 5, pairPos: 14, active: true },
            { type: 'V', pos: 8, pairPos: 21, active: true }
        ];
    }

    function spawnCrane() {
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * (GRID_COLS - 4)) + 2,
                y: Math.floor(Math.random() * (GRID_ROWS - 4)) + 2
            };
        } while (isOccupied(pos));
        cranes.push({ ...pos, color: '#ff6b8b', pulse: 0 });
    }

    function spawnInkDrop() {
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * (GRID_COLS - 4)) + 2,
                y: Math.floor(Math.random() * (GRID_ROWS - 4)) + 2
            };
        } while (isOccupied(pos));
        const colors = ['#ff6b8b', '#2ec4b6', '#ffb703', '#845ec2'];
        const chosenColor = colors[Math.floor(Math.random() * colors.length)];
        inkDrops.push({ ...pos, color: chosenColor });
    }

    function spawnScissors() {
        if (scissors.length >= 3) return;
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * (GRID_COLS - 6)) + 3,
                y: Math.floor(Math.random() * (GRID_ROWS - 6)) + 3
            };
        } while (isOccupied(pos));
        scissors.push({
            x: pos.x,
            y: pos.y,
            dirX: Math.random() < 0.5 ? 1 : -1,
            dirY: Math.random() < 0.5 ? 1 : -1,
            moveTimer: 0,
            rot: 0
        });
    }

    function isOccupied(pos) {
        if (snake.some(s => s.x === pos.x && s.y === pos.y)) return true;
        if (cranes.some(c => c.x === pos.x && c.y === pos.y)) return true;
        if (inkDrops.some(i => i.x === pos.x && i.y === pos.y)) return true;
        return false;
    }

    function startGame() {
        initAudio();
        resetGame();
        gameState = STATE_PLAYING;
        startOverlay.classList.add('hidden');
        pauseOverlay.classList.add('hidden');
        gameOverOverlay.classList.add('hidden');
    }

    function togglePause() {
        if (gameState === STATE_PLAYING) {
            gameState = STATE_PAUSED;
            pauseOverlay.classList.remove('hidden');
        } else if (gameState === STATE_PAUSED) {
            gameState = STATE_PLAYING;
            pauseOverlay.classList.add('hidden');
        }
    }

    function gameOver() {
        gameState = STATE_GAMEOVER;
        playSound('die');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('origami_snake_highscore', highScore.toString());
        }
        finalScore.textContent = score;
        finalHighscore.textContent = highScore;
        finalCombo.textContent = 'x' + combo;
        gameOverOverlay.classList.remove('hidden');
    }

    // Input Handling
    function handleKeyDown(e) {
        if (e.key === 'p' || e.key === 'P') {
            togglePause();
            return;
        }
        if (e.key === 'm' || e.key === 'M') {
            audioMuted = !audioMuted;
            audioOnIcon.classList.toggle('hidden', audioMuted);
            audioOffIcon.classList.toggle('hidden', !audioMuted);
            return;
        }

        if (gameState !== STATE_PLAYING) return;

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (dir.y === 0) nextDir = DIR_UP;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (dir.y === 0) nextDir = DIR_DOWN;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (dir.x === 0) nextDir = DIR_LEFT;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (dir.x === 0) nextDir = DIR_RIGHT;
                break;
            case ' ':
                triggerSkillOrHop();
                break;
        }
    }

    function triggerSkillOrHop() {
        if (currentForm === FORM_FROG) {
            // Frog Hop: Leap forward 2 grid cells!
            playSound('hop');
            const head = snake[0];
            const leapPos = {
                x: (head.x + dir.x * 2 + GRID_COLS) % GRID_COLS,
                y: (head.y + dir.y * 2 + GRID_ROWS) % GRID_ROWS
            };
            snake.unshift(leapPos);
            snake.pop();
            addParticles(leapPos.x * CELL_SIZE + CELL_SIZE / 2, leapPos.y * CELL_SIZE + CELL_SIZE / 2, '#2ec4b6', 12);
            addFloatingText(leapPos.x * CELL_SIZE, leapPos.y * CELL_SIZE, '蛙跃弹跳!', '#2ec4b6');
        } else if (energy >= MAX_ENERGY) {
            // Activate Form
            energy = 0;
            const forms = [FORM_CRANE, FORM_FROG, FORM_SAMURAI];
            currentForm = forms[Math.floor(Math.random() * forms.length)];
            formDuration = 300; // ~5 sec
            playSound('form');
            const head = snake[0];
            addParticles(head.x * CELL_SIZE, head.y * CELL_SIZE, '#ffb703', 25);
            addFloatingText(head.x * CELL_SIZE, head.y * CELL_SIZE, '【' + currentForm + '】启!', '#ffb703');
        }
    }

    // Update Loop
    function update() {
        if (gameState !== STATE_PLAYING) return;

        // Combo Timer
        if (comboTimer > 0) {
            comboTimer--;
            if (comboTimer <= 0) {
                combo = 1;
            }
        }

        // Form Duration
        if (formDuration > 0) {
            formDuration--;
            if (formDuration <= 0) {
                currentForm = FORM_WASHI;
            }
        }

        // Move Snake
        moveCounter++;
        if (moveCounter >= moveInterval) {
            moveCounter = 0;
            stepSnake();
        }

        // Move Scissors
        updateScissors();

        // Update Particles
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.alpha = p.life / p.maxLife;
        });
        particles = particles.filter(p => p.life > 0);

        // Update Floating Texts
        floatingTexts.forEach(ft => {
            ft.y -= 0.8;
            ft.life--;
            ft.alpha = ft.life / ft.maxLife;
        });
        floatingTexts = floatingTexts.filter(ft => ft.life > 0);

        updateHUD();
    }

    function stepSnake() {
        dir = nextDir;
        const head = snake[0];
        let newHead = { x: head.x + dir.x, y: head.y + dir.y };

        // Grid Boundaries & Fold Warp
        let warped = false;

        // Check Fold Lines
        foldLines.forEach(fl => {
            if (fl.type === 'H' && newHead.y === fl.pos) {
                newHead.y = fl.pairPos;
                warped = true;
            } else if (fl.type === 'V' && newHead.x === fl.pos) {
                newHead.x = fl.pairPos;
                warped = true;
            }
        });

        // Screen wrap
        newHead.x = (newHead.x + GRID_COLS) % GRID_COLS;
        newHead.y = (newHead.y + GRID_ROWS) % GRID_ROWS;

        if (warped) {
            playSound('teleport');
            addParticles(newHead.x * CELL_SIZE + CELL_SIZE / 2, newHead.y * CELL_SIZE + CELL_SIZE / 2, '#e0a96d', 20);
            addFloatingText(newHead.x * CELL_SIZE, newHead.y * CELL_SIZE, '次元折叠跃迁!', '#e0a96d');
        }

        // Self Collision Check (Crane form ignores self collision)
        if (currentForm !== FORM_CRANE) {
            if (snake.some((s, idx) => idx > 0 && s.x === newHead.x && s.y === newHead.y)) {
                gameOver();
                return;
            }
        }

        // Scissors Collision Check
        for (let i = scissors.length - 1; i >= 0; i--) {
            const sc = scissors[i];
            if (sc.x === newHead.x && sc.y === newHead.y) {
                if (currentForm === FORM_SAMURAI) {
                    // Samurai cuts scissors!
                    playSound('slash');
                    scissors.splice(i, 1);
                    score += 300 * combo;
                    addParticles(sc.x * CELL_SIZE, sc.y * CELL_SIZE, '#e63946', 30);
                    addFloatingText(sc.x * CELL_SIZE, sc.y * CELL_SIZE, '一刀两断! +300', '#e63946');
                    setTimeout(spawnScissors, 5000);
                } else if (currentForm !== FORM_CRANE) {
                    gameOver();
                    return;
                }
            }
        }

        snake.unshift(newHead);

        // Check Crane Eating
        let ate = false;
        for (let i = cranes.length - 1; i >= 0; i--) {
            const cr = cranes[i];
            if (cr.x === newHead.x && cr.y === newHead.y) {
                cranes.splice(i, 1);
                score += 100 * combo;
                energy = Math.min(MAX_ENERGY, energy + 25);
                playSound('eat');
                addParticles(newHead.x * CELL_SIZE + CELL_SIZE / 2, newHead.y * CELL_SIZE + CELL_SIZE / 2, cr.color, 15);
                addFloatingText(newHead.x * CELL_SIZE, newHead.y * CELL_SIZE, '+' + (100 * combo), cr.color);
                spawnCrane();
                ate = true;
                break;
            }
        }

        // Check Ink Drop Eating
        for (let i = inkDrops.length - 1; i >= 0; i--) {
            const drop = inkDrops[i];
            if (drop.x === newHead.x && drop.y === newHead.y) {
                inkDrops.splice(i, 1);
                combo = Math.min(8, combo + 1);
                comboTimer = 180; // 3 sec combo window
                score += 50 * combo;
                energy = Math.min(MAX_ENERGY, energy + 15);
                playSound('combo');
                addParticles(newHead.x * CELL_SIZE + CELL_SIZE / 2, newHead.y * CELL_SIZE + CELL_SIZE / 2, drop.color, 15);
                addFloatingText(newHead.x * CELL_SIZE, newHead.y * CELL_SIZE, 'COMBO x' + combo + '!', drop.color);
                spawnInkDrop();
                ate = true;
                break;
            }
        }

        if (!ate) {
            snake.pop();
        }
    }

    function updateScissors() {
        scissors.forEach(sc => {
            sc.rot += 0.05;
            sc.moveTimer++;
            if (sc.moveTimer >= 20) {
                sc.moveTimer = 0;
                sc.x = (sc.x + sc.dirX + GRID_COLS) % GRID_COLS;
                sc.y = (sc.y + sc.dirY + GRID_ROWS) % GRID_ROWS;
            }
        });
    }

    function addParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                life: 30,
                maxLife: 30,
                size: Math.random() * 4 + 2
            });
        }
    }

    function addFloatingText(x, y, text, color) {
        floatingTexts.push({
            x: x + 10,
            y: y,
            text,
            color,
            life: 40,
            maxLife: 40
        });
    }

    function updateHUD() {
        scoreDisplay.textContent = score;
        comboDisplay.textContent = 'x' + combo;
        highscoreDisplay.textContent = highScore;
        formDisplay.textContent = currentForm;

        if (energy >= MAX_ENERGY) {
            skillStatusText.textContent = '【Space】释放奥义!';
            energyBarFill.style.width = '100%';
            energyBarFill.style.background = 'linear-gradient(90deg, #ffb703, #ff6b8b)';
        } else {
            skillStatusText.textContent = currentForm !== FORM_WASHI ? `[${currentForm}]` : '充能中...';
            energyBarFill.style.width = (energy / MAX_ENERGY * 100) + '%';
            energyBarFill.style.background = 'linear-gradient(90deg, #2ec4b6, #ffb703)';
        }
    }

    // Render Loop
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Washi Paper Background Grid
        ctx.fillStyle = '#1e1b18';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid Lines (Paper texture lines)
        ctx.strokeStyle = 'rgba(247, 243, 232, 0.04)';
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

        // Render Fold Lines (Dotted Origami Creases)
        foldLines.forEach(fl => {
            ctx.strokeStyle = '#e0a96d';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            if (fl.type === 'H') {
                ctx.moveTo(0, fl.pos * CELL_SIZE + CELL_SIZE / 2);
                ctx.lineTo(canvas.width, fl.pos * CELL_SIZE + CELL_SIZE / 2);
                ctx.moveTo(0, fl.pairPos * CELL_SIZE + CELL_SIZE / 2);
                ctx.lineTo(canvas.width, fl.pairPos * CELL_SIZE + CELL_SIZE / 2);
            } else {
                ctx.moveTo(fl.pos * CELL_SIZE + CELL_SIZE / 2, 0);
                ctx.lineTo(fl.pos * CELL_SIZE + CELL_SIZE / 2, canvas.height);
                ctx.moveTo(fl.pairPos * CELL_SIZE + CELL_SIZE / 2, 0);
                ctx.lineTo(fl.pairPos * CELL_SIZE + CELL_SIZE / 2, canvas.height);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        });

        // Render Cranes (Food)
        cranes.forEach(cr => {
            const cx = cr.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = cr.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.fillStyle = cr.color;
            ctx.shadowColor = cr.color;
            ctx.shadowBlur = 10;
            // Draw Crane Polygon
            ctx.beginPath();
            ctx.moveTo(cx, cy - 12);
            ctx.lineTo(cx + 10, cy + 8);
            ctx.lineTo(cx, cy + 4);
            ctx.lineTo(cx - 10, cy + 8);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Render Ink Drops
        inkDrops.forEach(drop => {
            const cx = drop.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = drop.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.fillStyle = drop.color;
            ctx.shadowColor = drop.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(cx, cy, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Render Scissors Traps
        scissors.forEach(sc => {
            const cx = sc.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = sc.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(sc.rot);
            ctx.strokeStyle = '#e63946';
            ctx.lineWidth = 3;
            // Scissors Blades
            ctx.beginPath();
            ctx.moveTo(-10, -10);
            ctx.lineTo(10, 10);
            ctx.moveTo(-10, 10);
            ctx.lineTo(10, -10);
            ctx.stroke();
            ctx.restore();
        });

        // Render Snake
        snake.forEach((seg, idx) => {
            const sx = seg.x * CELL_SIZE;
            const sy = seg.y * CELL_SIZE;

            if (idx === 0) {
                // Snake Head
                ctx.fillStyle = currentForm === FORM_SAMURAI ? '#ffb703' : currentForm === FORM_CRANE ? '#ff6b8b' : '#f7f3e8';
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 12;

                // Draw Head Box with Fold Pattern
                ctx.fillRect(sx + 2, sy + 2, CELL_SIZE - 4, CELL_SIZE - 4);

                // Eyes
                ctx.fillStyle = '#161513';
                ctx.fillRect(sx + 8, sy + 8, 4, 4);
                ctx.fillRect(sx + 18, sy + 8, 4, 4);
                ctx.shadowBlur = 0;
            } else {
                // Snake Body Segments
                const alpha = Math.max(0.3, 1 - (idx / snake.length) * 0.7);
                ctx.fillStyle = currentForm === FORM_CRANE ? `rgba(255, 107, 139, ${alpha})` : `rgba(46, 196, 182, ${alpha})`;
                ctx.fillRect(sx + 3, sy + 3, CELL_SIZE - 6, CELL_SIZE - 6);
            }
        });

        // Render Particles
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // Render Floating Texts
        floatingTexts.forEach(ft => {
            ctx.font = 'bold 16px "Noto Sans SC", sans-serif';
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = ft.alpha;
            ctx.fillText(ft.text, ft.x, ft.y);
        });
        ctx.globalAlpha = 1.0;

        requestAnimationFrame(gameLoop);
    }

    function gameLoop() {
        update();
        render();
    }

    // Attach Event Listeners
    window.addEventListener('keydown', handleKeyDown);

    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    resumeBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', startGame);

    audioToggleBtn.addEventListener('click', () => {
        audioMuted = !audioMuted;
        audioOnIcon.classList.toggle('hidden', audioMuted);
        audioOffIcon.classList.toggle('hidden', !audioMuted);
    });

    // Mobile D-Pad Controls
    document.getElementById('btn-up').addEventListener('click', () => { if (dir.y === 0) nextDir = DIR_UP; });
    document.getElementById('btn-down').addEventListener('click', () => { if (dir.y === 0) nextDir = DIR_DOWN; });
    document.getElementById('btn-left').addEventListener('click', () => { if (dir.x === 0) nextDir = DIR_LEFT; });
    document.getElementById('btn-right').addEventListener('click', () => { if (dir.x === 0) nextDir = DIR_RIGHT; });
    document.getElementById('btn-skill').addEventListener('click', triggerSkillOrHop);
    document.getElementById('btn-hop').addEventListener('click', triggerSkillOrHop);

    // Initial Loop Start
    render();
})();
