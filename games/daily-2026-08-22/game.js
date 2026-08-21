/**
 * 琉璃圣殿：彩绘光蛇与光斑折射 (2026-08-22)
 * Gothic Stained Glass & Prism Refraction Snake Game Engine
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
    let highScore = parseInt(localStorage.getItem('stained_glass_snake_highscore') || '0', 10);
    let energy = 0; // 0 to 100
    const MAX_ENERGY = 100;

    let isOverload = false;
    let overloadTimer = 0; // Frames left for Prism Overload state

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

    // Collectibles & Elements
    let shards = []; // {x, y, type: 'RUBY'|'EMERALD'|'SAPPHIRE', color, pulse}
    let leadTraps = []; // {x, y, rot}
    let sunBeams = []; // {colStart, rowStart, len, dir: 'DIAG'}
    let laserBeams = []; // temporary active laser effects {x1, y1, x2, y2, color, life}
    let lastEatenColor = null;

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

    function playSound(type, param) {
        if (audioMuted || !audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            if (type === 'eat') {
                const baseFreq = param === 'RUBY' ? 523 : param === 'EMERALD' ? 659 : 784; // C5, E5, G5 crystal chime
                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.12);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'combo') {
                osc.type = 'triangle';
                const freq = 440 + combo * 120;
                osc.frequency.setValueAtTime(freq, now);
                osc.frequency.linearRampToValueAtTime(freq * 1.8, now + 0.2);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            } else if (type === 'laser') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.25);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'overload') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.linearRampToValueAtTime(880, now + 0.35);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'die') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(60, now + 0.5);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
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
    const prismDisplay = document.getElementById('prism-display');

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

    // High Score Init
    highscoreDisplay.textContent = highScore;

    // Reset Game
    function resetGame() {
        snake = [
            { x: 12, y: 10 },
            { x: 11, y: 10 },
            { x: 10, y: 10 },
            { x: 9, y: 10 }
        ];
        dir = DIR_RIGHT;
        nextDir = DIR_RIGHT;
        score = 0;
        combo = 1;
        comboTimer = 0;
        energy = 0;
        isOverload = false;
        overloadTimer = 0;
        lastEatenColor = null;

        shards = [];
        leadTraps = [];
        particles = [];
        floatingTexts = [];
        laserBeams = [];

        generateSunBeams();
        for (let i = 0; i < 3; i++) spawnShard();
        for (let i = 0; i < 4; i++) spawnLeadTrap();

        updateHUD();
    }

    function generateSunBeams() {
        sunBeams = [
            { x: 5, y: 0, dx: 1, dy: 1, length: 18 },
            { x: 15, y: 0, dx: 1, dy: 1, length: 18 },
            { x: 25, y: 0, dx: -1, dy: 1, length: 18 }
        ];
    }

    function isSunbeamCell(x, y) {
        return sunBeams.some(b => {
            for (let i = 0; i < b.length; i++) {
                if (b.x + b.dx * i === x && b.y + b.dy * i === y) return true;
            }
            return false;
        });
    }

    function spawnShard() {
        if (shards.length >= 5) return;
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * (GRID_COLS - 4)) + 2,
                y: Math.floor(Math.random() * (GRID_ROWS - 4)) + 2
            };
        } while (isOccupied(pos));

        const types = [
            { type: 'RUBY', color: '#ff2a5f', name: '红宝琉璃' },
            { type: 'EMERALD', color: '#00e676', name: '翡翠琉璃' },
            { type: 'SAPPHIRE', color: '#00b0ff', name: '蓝宝琉璃' }
        ];
        const chosen = types[Math.floor(Math.random() * types.length)];
        shards.push({ ...pos, ...chosen, pulse: 0 });
    }

    function spawnLeadTrap() {
        if (leadTraps.length >= 6) return;
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * (GRID_COLS - 6)) + 3,
                y: Math.floor(Math.random() * (GRID_ROWS - 6)) + 3
            };
        } while (isOccupied(pos));
        leadTraps.push({ ...pos, rot: 0 });
    }

    function isOccupied(pos) {
        if (snake.some(s => s.x === pos.x && s.y === pos.y)) return true;
        if (shards.some(sh => sh.x === pos.x && sh.y === pos.y)) return true;
        if (leadTraps.some(lt => lt.x === pos.x && lt.y === pos.y)) return true;
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
            localStorage.setItem('stained_glass_snake_highscore', highScore.toString());
        }
        finalScore.textContent = score;
        finalHighscore.textContent = highScore;
        finalCombo.textContent = 'x' + combo;
        gameOverOverlay.classList.remove('hidden');
    }

    // Input Handlers
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
                triggerOverloadAbility();
                break;
        }
    }

    function triggerOverloadAbility() {
        if (energy >= MAX_ENERGY && !isOverload) {
            energy = 0;
            isOverload = true;
            overloadTimer = 360; // ~6 seconds
            playSound('overload');
            const head = snake[0];
            addParticles(head.x * CELL_SIZE + CELL_SIZE / 2, head.y * CELL_SIZE + CELL_SIZE / 2, '#dfac40', 35);
            addFloatingText(head.x * CELL_SIZE, head.y * CELL_SIZE, '【全彩幻光扫荡】!', '#dfac40');
        }
    }

    // Update Loop
    function update() {
        if (gameState !== STATE_PLAYING) return;

        // Combo Decay
        if (comboTimer > 0) {
            comboTimer--;
            if (comboTimer <= 0) combo = 1;
        }

        // Overload Timer
        if (isOverload) {
            overloadTimer--;
            if (overloadTimer <= 0) isOverload = false;

            // Magnetize Shards toward Head during Overload
            const head = snake[0];
            shards.forEach(sh => {
                if (sh.x < head.x) sh.x += 0.05;
                if (sh.x > head.x) sh.x -= 0.05;
                if (sh.y < head.y) sh.y += 0.05;
                if (sh.y > head.y) sh.y -= 0.05;
            });
        }

        // Move Snake Step
        moveCounter++;
        if (moveCounter >= moveInterval) {
            moveCounter = 0;
            stepSnake();
        }

        // Update Laser Visual FX
        laserBeams.forEach(lb => lb.life--);
        laserBeams = laserBeams.filter(lb => lb.life > 0);

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
        let newHead = {
            x: (head.x + dir.x + GRID_COLS) % GRID_COLS,
            y: (head.y + dir.y + GRID_ROWS) % GRID_ROWS
        };

        // Self-collision Check (Overload state ignores self collision)
        if (!isOverload) {
            if (snake.some((s, idx) => idx > 0 && s.x === newHead.x && s.y === newHead.y)) {
                gameOver();
                return;
            }
        }

        // Lead Trap Collision
        for (let i = leadTraps.length - 1; i >= 0; i--) {
            const lt = leadTraps[i];
            if (Math.round(lt.x) === newHead.x && Math.round(lt.y) === newHead.y) {
                if (isOverload) {
                    // Destroy Trap in Overload!
                    leadTraps.splice(i, 1);
                    score += 250 * combo;
                    addParticles(newHead.x * CELL_SIZE, newHead.y * CELL_SIZE, '#dfac40', 25);
                    addFloatingText(newHead.x * CELL_SIZE, newHead.y * CELL_SIZE, '消融荆棘! +250', '#dfac40');
                    setTimeout(spawnLeadTrap, 4000);
                } else {
                    gameOver();
                    return;
                }
            }
        }

        // Check Prism Refraction Light Beam Action!
        if (isSunbeamCell(newHead.x, newHead.y)) {
            firePrismLaser(newHead.x, newHead.y, dir);
        }

        snake.unshift(newHead);

        // Check Shard Eating
        let ate = false;
        for (let i = shards.length - 1; i >= 0; i--) {
            const sh = shards[i];
            if (Math.abs(sh.x - newHead.x) < 0.8 && Math.abs(sh.y - newHead.y) < 0.8) {
                shards.splice(i, 1);
                ate = true;

                // Color Combo Logic
                if (lastEatenColor && lastEatenColor !== sh.type) {
                    combo = Math.min(8, combo + 1);
                    comboTimer = 180;
                    playSound('combo');
                } else {
                    comboTimer = 120;
                }
                lastEatenColor = sh.type;

                score += 120 * combo;
                energy = Math.min(MAX_ENERGY, energy + 20);
                playSound('eat', sh.type);

                addParticles(newHead.x * CELL_SIZE + CELL_SIZE / 2, newHead.y * CELL_SIZE + CELL_SIZE / 2, sh.color, 18);
                addFloatingText(newHead.x * CELL_SIZE, newHead.y * CELL_SIZE, '+' + (120 * combo) + ' (' + sh.name + ')', sh.color);

                spawnShard();
                break;
            }
        }

        if (!ate) {
            snake.pop();
        }
    }

    function firePrismLaser(hx, hy, currentDir) {
        playSound('laser');

        // Laser fires crosswise perpendicular to movement direction!
        let lx1 = 0, ly1 = hy * CELL_SIZE + CELL_SIZE / 2;
        let lx2 = canvas.width, ly2 = hy * CELL_SIZE + CELL_SIZE / 2;

        if (currentDir.x !== 0) {
            // Vertical Laser line
            lx1 = hx * CELL_SIZE + CELL_SIZE / 2; ly1 = 0;
            lx2 = hx * CELL_SIZE + CELL_SIZE / 2; ly2 = canvas.height;

            // Melt Traps in this column!
            for (let i = leadTraps.length - 1; i >= 0; i--) {
                if (Math.round(leadTraps[i].x) === hx) {
                    const lt = leadTraps[i];
                    addParticles(lt.x * CELL_SIZE, lt.y * CELL_SIZE, '#00b0ff', 20);
                    addFloatingText(lt.x * CELL_SIZE, lt.y * CELL_SIZE, '光束融解! +200', '#00b0ff');
                    leadTraps.splice(i, 1);
                    score += 200 * combo;
                    setTimeout(spawnLeadTrap, 4000);
                }
            }
        } else {
            // Horizontal Laser line
            // Melt Traps in this row!
            for (let i = leadTraps.length - 1; i >= 0; i--) {
                if (Math.round(leadTraps[i].y) === hy) {
                    const lt = leadTraps[i];
                    addParticles(lt.x * CELL_SIZE, lt.y * CELL_SIZE, '#00b0ff', 20);
                    addFloatingText(lt.x * CELL_SIZE, lt.y * CELL_SIZE, '光束融解! +200', '#00b0ff');
                    leadTraps.splice(i, 1);
                    score += 200 * combo;
                    setTimeout(spawnLeadTrap, 4000);
                }
            }
        }

        laserBeams.push({
            x1: lx1, y1: ly1, x2: lx2, y2: ly2,
            color: isOverload ? '#dfac40' : '#00b0ff',
            life: 15
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

        if (lastEatenColor === 'RUBY') prismDisplay.textContent = '红宝琉璃';
        else if (lastEatenColor === 'EMERALD') prismDisplay.textContent = '翡翠琉璃';
        else if (lastEatenColor === 'SAPPHIRE') prismDisplay.textContent = '蓝宝琉璃';
        else prismDisplay.textContent = '圣光透镜';

        if (energy >= MAX_ENERGY && !isOverload) {
            skillStatusText.textContent = '【Space】释放全彩幻光!';
            energyBarFill.style.width = '100%';
            energyBarFill.style.background = 'linear-gradient(90deg, #dfac40, #ff2a5f)';
        } else if (isOverload) {
            skillStatusText.textContent = `[全彩扫荡中: ${Math.ceil(overloadTimer / 60)}s]`;
            energyBarFill.style.width = (overloadTimer / 360 * 100) + '%';
            energyBarFill.style.background = 'linear-gradient(90deg, #ff2a5f, #00e676, #00b0ff)';
        } else {
            skillStatusText.textContent = '充能中...';
            energyBarFill.style.width = (energy / MAX_ENERGY * 100) + '%';
            energyBarFill.style.background = 'linear-gradient(90deg, #00b0ff, #dfac40)';
        }
    }

    // Render Loop
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Dark Gothic Vault Background
        ctx.fillStyle = '#0a090e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Lead Wire Grid Frame
        ctx.strokeStyle = 'rgba(223, 172, 64, 0.06)';
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

        // 3. Render Diagonal Sunlight Beams
        sunBeams.forEach(b => {
            ctx.fillStyle = 'rgba(255, 240, 200, 0.08)';
            ctx.beginPath();
            const x1 = b.x * CELL_SIZE;
            const y1 = b.y * CELL_SIZE;
            const x2 = (b.x + b.dx * b.length) * CELL_SIZE;
            const y2 = (b.y + b.dy * b.length) * CELL_SIZE;

            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + CELL_SIZE * 2, y1);
            ctx.lineTo(x2 + CELL_SIZE * 2, y2);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.fill();
        });

        // 4. Render Laser Beams
        laserBeams.forEach(lb => {
            ctx.strokeStyle = lb.color;
            ctx.shadowColor = lb.color;
            ctx.shadowBlur = 20;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(lb.x1, lb.y1);
            ctx.lineTo(lb.x2, lb.y2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        });

        // 5. Render Lead Traps (Spiked Wire)
        leadTraps.forEach(lt => {
            const cx = lt.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = lt.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.strokeStyle = '#dfac40';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
            ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
            ctx.stroke();
        });

        // 6. Render Shards (Diamond Glass Tiles)
        shards.forEach(sh => {
            const cx = sh.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = sh.y * CELL_SIZE + CELL_SIZE / 2;
            ctx.fillStyle = sh.color;
            ctx.shadowColor = sh.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 12);
            ctx.lineTo(cx + 12, cy);
            ctx.lineTo(cx, cy + 12);
            ctx.lineTo(cx - 12, cy);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.shadowBlur = 0;
        });

        // 7. Render Stained Glass Snake
        snake.forEach((seg, idx) => {
            const sx = seg.x * CELL_SIZE;
            const sy = seg.y * CELL_SIZE;

            if (idx === 0) {
                // Head (Prism Lens)
                ctx.fillStyle = isOverload ? '#dfac40' : '#ffffff';
                ctx.shadowColor = isOverload ? '#dfac40' : '#00b0ff';
                ctx.shadowBlur = 16;
                ctx.fillRect(sx + 2, sy + 2, CELL_SIZE - 4, CELL_SIZE - 4);

                // Lead Border
                ctx.strokeStyle = '#dfac40';
                ctx.lineWidth = 2;
                ctx.strokeRect(sx + 2, sy + 2, CELL_SIZE - 4, CELL_SIZE - 4);

                // Prism Eyes
                ctx.fillStyle = '#0a090e';
                ctx.fillRect(sx + 7, sy + 7, 5, 5);
                ctx.fillRect(sx + 18, sy + 7, 5, 5);
                ctx.shadowBlur = 0;
            } else {
                // Glass Body Tiles (Cyclic RGB palette or Overload Rainbow)
                const colors = isOverload ? ['#ff2a5f', '#00e676', '#00b0ff', '#dfac40'] : ['#ff2a5f', '#00e676', '#00b0ff'];
                const segColor = colors[idx % colors.length];

                ctx.fillStyle = segColor;
                ctx.shadowColor = segColor;
                ctx.shadowBlur = isOverload ? 10 : 4;
                ctx.fillRect(sx + 3, sy + 3, CELL_SIZE - 6, CELL_SIZE - 6);

                ctx.strokeStyle = 'rgba(223, 172, 64, 0.5)';
                ctx.lineWidth = 1;
                ctx.strokeRect(sx + 3, sy + 3, CELL_SIZE - 6, CELL_SIZE - 6);
                ctx.shadowBlur = 0;
            }
        });

        // 8. Render Particles
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // 9. Render Floating Text
        floatingTexts.forEach(ft => {
            ctx.font = 'bold 15px "Outfit", "Noto Sans SC", sans-serif';
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

    // Event Listeners
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

    // Mobile D-Pad
    document.getElementById('btn-up').addEventListener('click', () => { if (dir.y === 0) nextDir = DIR_UP; });
    document.getElementById('btn-down').addEventListener('click', () => { if (dir.y === 0) nextDir = DIR_DOWN; });
    document.getElementById('btn-left').addEventListener('click', () => { if (dir.x === 0) nextDir = DIR_LEFT; });
    document.getElementById('btn-right').addEventListener('click', () => { if (dir.x === 0) nextDir = DIR_RIGHT; });
    document.getElementById('btn-skill').addEventListener('click', triggerOverloadAbility);

    // Initial Loop Start
    render();
})();
