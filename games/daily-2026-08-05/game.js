/**
 * 浮世浪潮：神奈川巨浪与墨龙跃升 (Ukiyo-e Wave: Cresting Dragon)
 * Daily Snake - 2026-08-05
 */

(function () {
    'use strict';

    // Game Configuration
    const COLS = 32;
    const ROWS = 24;
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    const CELL_SIZE = CANVAS_WIDTH / COLS; // 25px

    // Canvas Elements
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const bgCanvas = document.getElementById('ukiyo-bg-canvas');
    const bgCtx = bgCanvas.getContext('2d');

    // UI DOM Elements
    const scoreValEl = document.getElementById('score-val');
    const tideValEl = document.getElementById('tide-val');
    const lengthValEl = document.getElementById('length-val');
    const comboValEl = document.getElementById('combo-val');
    const highScoreValEl = document.getElementById('high-score-val');
    const surgeProgressEl = document.getElementById('surge-progress');
    const surgeStatusTextEl = document.getElementById('surge-status-text');

    const overlayScreen = document.getElementById('overlay-screen');
    const overlayTitle = document.getElementById('overlay-title');
    const overlaySub = document.getElementById('overlay-sub');
    const overlayStats = document.getElementById('overlay-stats');
    const finalScoreEl = document.getElementById('final-score');
    const finalLengthEl = document.getElementById('final-length');
    const finalSurgesEl = document.getElementById('final-surges');
    const startBtn = document.getElementById('start-btn');

    const soundBtn = document.getElementById('sound-btn');
    const soundIconOn = document.getElementById('sound-icon-on');
    const soundIconOff = document.getElementById('sound-icon-off');
    const pauseBtn = document.getElementById('pause-btn');
    const pauseIcon = document.getElementById('pause-icon');
    const playIcon = document.getElementById('play-icon');
    const mobileSkillBtn = document.getElementById('mobile-skill-btn');

    // Web Audio System
    let audioCtx = null;
    let isSoundMuted = localStorage.getItem('daily_snake_muted') === 'true';

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playSynthNote(freq, duration, type = 'sine', gainVal = 0.15) {
        if (isSoundMuted || !audioCtx) return;
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
        } catch (e) { }
    }

    function playEatSound(itemType) {
        if (isSoundMuted || !audioCtx) return;
        initAudio();

        if (itemType === 'koi') {
            // Pentatonic Koto pluck (D4, F4, A4)
            playSynthNote(293.66, 0.15, 'triangle', 0.2);
            setTimeout(() => playSynthNote(349.23, 0.12, 'triangle', 0.2), 40);
        } else if (itemType === 'pearl') {
            // Sacred Pearl synth chime
            playSynthNote(440.00, 0.2, 'sine', 0.25);
            setTimeout(() => playSynthNote(659.25, 0.25, 'sine', 0.2), 60);
        } else if (itemType === 'coin') {
            // Metallic Gold Coin Bell
            playSynthNote(880.00, 0.3, 'sine', 0.3);
            setTimeout(() => playSynthNote(1318.51, 0.3, 'sine', 0.25), 50);
        } else if (itemType === 'horn') {
            // Jade Horn Arpeggio
            playSynthNote(523.25, 0.15, 'square', 0.15);
            setTimeout(() => playSynthNote(659.25, 0.15, 'square', 0.15), 50);
            setTimeout(() => playSynthNote(783.99, 0.25, 'triangle', 0.2), 100);
        }
    }

    function playSurgeSound() {
        if (isSoundMuted || !audioCtx) return;
        initAudio();
        // Deep Taiko Bass Drum Impact
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(160, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.4);

            gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        } catch (e) { }
    }

    function playGameOverSound() {
        if (isSoundMuted || !audioCtx) return;
        initAudio();
        playSynthNote(220, 0.3, 'sawtooth', 0.3);
        setTimeout(() => playSynthNote(164.81, 0.4, 'sawtooth', 0.3), 150);
        setTimeout(() => playSynthNote(110, 0.6, 'sine', 0.3), 300);
    }

    function updateSoundBtnUI() {
        if (isSoundMuted) {
            soundIconOn.classList.add('hidden');
            soundIconOff.classList.remove('hidden');
        } else {
            soundIconOn.classList.remove('hidden');
            soundIconOff.classList.add('hidden');
        }
    }

    soundBtn.addEventListener('click', () => {
        isSoundMuted = !isSoundMuted;
        localStorage.setItem('daily_snake_muted', isSoundMuted);
        updateSoundBtnUI();
        if (!isSoundMuted) initAudio();
    });
    updateSoundBtnUI();

    // Game State Variables
    let isRunning = false;
    let isPaused = false;
    let isGameOver = false;

    let score = 0;
    let highScore = parseInt(localStorage.getItem('daily_snake_ukiyo_wave_highscore') || '0', 10);
    let combo = 1;
    let comboTimer = null;
    let surgesUsed = 0;

    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDirQueue = [];

    let foods = [];
    let whirlpools = [];
    let particles = [];

    let skillGauge = 0; // 0 to 100
    let isSurgeActive = false;
    let surgeTimer = 0; // ms remaining

    let tideSpeed = 1.0;
    let tideAngle = 0;
    let tickInterval = 110; // ms
    let lastTickTime = 0;
    let animFrameId = null;

    highScoreValEl.textContent = String(highScore).padStart(6, '0');

    // Background Woodblock Waves Animation
    let bgAnimTime = 0;
    function resizeBgCanvas() {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeBgCanvas);
    resizeBgCanvas();

    function renderBgWaves() {
        bgAnimTime += 0.015;
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

        // Dark Indigo Base
        bgCtx.fillStyle = '#0c1b33';
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

        // Render Hokusai Sine Wave Layers
        const waveColors = ['rgba(25, 56, 96, 0.4)', 'rgba(43, 86, 136, 0.3)', 'rgba(56, 136, 158, 0.25)'];
        for (let i = 0; i < waveColors.length; i++) {
            bgCtx.fillStyle = waveColors[i];
            bgCtx.beginPath();
            const waveY = bgCanvas.height * (0.4 + i * 0.2);
            bgCtx.moveTo(0, bgCanvas.height);
            bgCtx.lineTo(0, waveY);

            for (let x = 0; x <= bgCanvas.width; x += 20) {
                const y = waveY + Math.sin(x * 0.005 + bgAnimTime * (1 + i * 0.5) + i) * 35 * (i + 1);
                bgCtx.lineTo(x, y);
            }
            bgCtx.lineTo(bgCanvas.width, bgCanvas.height);
            bgCtx.closePath();
            bgCtx.fill();
        }

        // Floating Gold Leaf Dust
        bgCtx.fillStyle = 'rgba(252, 232, 149, 0.3)';
        for (let j = 0; j < 25; j++) {
            const px = (Math.sin(j * 99 + bgAnimTime * 0.5) * 0.5 + 0.5) * bgCanvas.width;
            const py = (Math.cos(j * 47 + bgAnimTime * 0.3) * 0.5 + 0.5) * bgCanvas.height;
            const size = (j % 3) + 1.5;
            bgCtx.fillRect(px, py, size, size);
        }

        requestAnimationFrame(renderBgWaves);
    }
    renderBgWaves();

    // Spawn Functions
    function spawnFood(typeOverride = null) {
        let x, y, overlap;
        do {
            overlap = false;
            x = Math.floor(Math.random() * COLS);
            y = Math.floor(Math.random() * ROWS);

            for (const seg of snake) {
                if (seg.x === x && seg.y === y) {
                    overlap = true;
                    break;
                }
            }
            for (const f of foods) {
                if (f.x === x && f.y === y) {
                    overlap = true;
                    break;
                }
            }
        } while (overlap);

        let type = typeOverride;
        if (!type) {
            const rand = Math.random();
            if (rand < 0.60) type = 'koi';
            else if (rand < 0.85) type = 'pearl';
            else if (rand < 0.95) type = 'coin';
            else type = 'horn';
        }

        foods.push({
            x, y, type,
            animTimer: Math.random() * Math.PI * 2,
            life: type === 'coin' ? 12.0 : 999.0 // Coin disappears in 12s
        });
    }

    function initWhirlpools() {
        whirlpools = [
            { x: Math.floor(COLS * 0.3), y: Math.floor(ROWS * 0.4), radius: 2.2, angle: 0 },
            { x: Math.floor(COLS * 0.7), y: Math.floor(ROWS * 0.65), radius: 2.2, angle: Math.PI }
        ];
    }

    function createParticles(x, y, color, count = 12, speed = 3) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = (Math.random() * 0.8 + 0.2) * speed;
            particles.push({
                x: x * CELL_SIZE + CELL_SIZE / 2,
                y: y * CELL_SIZE + CELL_SIZE / 2,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                color,
                radius: Math.random() * 3.5 + 1.5,
                life: 1.0
            });
        }
    }

    // Game Core Logic
    function resetGame() {
        score = 0;
        combo = 1;
        surgesUsed = 0;
        skillGauge = 0;
        isSurgeActive = false;
        surgeTimer = 0;
        tideSpeed = 1.0;

        scoreValEl.textContent = '000,000';
        tideValEl.textContent = '1.0x';
        lengthValEl.textContent = '5 节';
        comboValEl.textContent = 'x1';
        updateSurgeUI();

        const startX = Math.floor(COLS / 2);
        const startY = Math.floor(ROWS / 2);
        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
            { x: startX - 3, y: startY },
            { x: startX - 4, y: startY }
        ];
        dir = { x: 1, y: 0 };
        nextDirQueue = [];

        foods = [];
        spawnFood('koi');
        spawnFood('koi');
        spawnFood('pearl');

        initWhirlpools();
        particles = [];

        isGameOver = false;
        isPaused = false;
        isRunning = true;

        overlayScreen.classList.add('hidden');
        lastTickTime = performance.now();
    }

    function updateSurgeUI() {
        const pct = Math.min(100, Math.floor(skillGauge));
        surgeProgressEl.style.width = pct + '%';
        if (isSurgeActive) {
            surgeStatusTextEl.textContent = `神龙跃浪中 ${(surgeTimer / 1000).toFixed(1)}s`;
            surgeStatusTextEl.style.color = '#fce895';
        } else if (pct >= 100) {
            surgeStatusTextEl.textContent = '狂涛准备就绪 [SPACE]';
            surgeStatusTextEl.style.color = '#fce895';
        } else {
            surgeStatusTextEl.textContent = `怒气蓄力 ${pct}%`;
            surgeStatusTextEl.style.color = 'var(--gold-bright)';
        }
    }

    function triggerSurgeSkill() {
        if (!isRunning || isPaused || isGameOver) return;
        if (skillGauge >= 100 && !isSurgeActive) {
            isSurgeActive = true;
            surgeTimer = 5000;
            skillGauge = 0;
            surgesUsed++;
            playSurgeSound();
            createParticles(snake[0].x, snake[0].y, '#fce895', 35, 6);
            updateSurgeUI();
        }
    }

    function gameTick() {
        if (!isRunning || isPaused || isGameOver) return;

        // Process Direction Queue
        if (nextDirQueue.length > 0) {
            const next = nextDirQueue.shift();
            if (next.x !== -dir.x || next.y !== -dir.y) {
                dir = next;
            }
        }

        let newHead = {
            x: snake[0].x + dir.x,
            y: snake[0].y + dir.y
        };

        // Surge Invincibility Edge Wrap vs Normal Boundary Check
        if (isSurgeActive) {
            if (newHead.x < 0) newHead.x = COLS - 1;
            if (newHead.x >= COLS) newHead.x = 0;
            if (newHead.y < 0) newHead.y = ROWS - 1;
            if (newHead.y >= ROWS) newHead.y = 0;
        } else {
            if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
                triggerGameOver('撞击巨浪悬崖！');
                return;
            }
        }

        // Body Collision (Ignored during Surge)
        if (!isSurgeActive) {
            for (let i = 0; i < snake.length - 1; i++) {
                if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
                    triggerGameOver('龙身自我盘结缠绕！');
                    return;
                }
            }
        }

        snake.unshift(newHead);

        // Check Food Collision & Magnetic Attraction in Surge
        let ateFood = false;

        for (let i = foods.length - 1; i >= 0; i--) {
            const f = foods[i];
            const dist = Math.hypot(f.x - newHead.x, f.y - newHead.y);

            // In Surge Mode, auto-attract items within 5 grid cells!
            if (isSurgeActive && dist < 5 && dist > 0) {
                f.x += (newHead.x - f.x) * 0.4;
                f.y += (newHead.y - f.y) * 0.4;
                f.x = Math.round(f.x);
                f.y = Math.round(f.y);
            }

            if (f.x === newHead.x && f.y === newHead.y) {
                ateFood = true;

                // Whirlpool bonus check
                let wpBonus = 1;
                for (const wp of whirlpools) {
                    if (Math.hypot(wp.x - f.x, wp.y - f.y) < wp.radius) {
                        wpBonus = 1.5;
                        break;
                    }
                }

                let basePts = 10;
                let gaugeGain = 10;
                let particleColor = '#cc3322';

                if (f.type === 'koi') {
                    basePts = 10;
                    gaugeGain = 10;
                    particleColor = '#cc3322';
                } else if (f.type === 'pearl') {
                    basePts = 30;
                    gaugeGain = 20;
                    tideSpeed = Math.min(2.0, tideSpeed + 0.05);
                    tideValEl.textContent = tideSpeed.toFixed(1) + 'x';
                    particleColor = '#38889e';
                } else if (f.type === 'coin') {
                    basePts = 80;
                    gaugeGain = 25;
                    particleColor = '#fce895';
                } else if (f.type === 'horn') {
                    basePts = 150;
                    gaugeGain = 35;
                    particleColor = '#2b7a62';
                }

                playEatSound(f.type);
                createParticles(f.x, f.y, particleColor, 16, 4);

                // Score Calculation
                const surgeMult = isSurgeActive ? 3 : 1;
                const earned = Math.round(basePts * combo * wpBonus * surgeMult);
                score += earned;
                scoreValEl.textContent = String(score).padStart(6, '0');

                // Combo System
                combo++;
                comboValEl.textContent = `x${combo}`;
                if (comboTimer) clearTimeout(comboTimer);
                comboTimer = setTimeout(() => {
                    combo = 1;
                    comboValEl.textContent = 'x1';
                }, 4000);

                // Skill Gauge Update
                if (!isSurgeActive) {
                    skillGauge = Math.min(100, skillGauge + gaugeGain);
                    updateSurgeUI();
                }

                foods.splice(i, 1);
                spawnFood();

                // Spawn bonus coin occasionally
                if (Math.random() < 0.25 && foods.length < 5) {
                    spawnFood('coin');
                }
            }
        }

        if (!ateFood) {
            snake.pop();
        } else {
            lengthValEl.textContent = `${snake.length} 节`;
        }

        // High Score
        if (score > highScore) {
            highScore = score;
            highScoreValEl.textContent = String(highScore).padStart(6, '0');
            localStorage.setItem('daily_snake_ukiyo_wave_highscore', highScore);
        }
    }

    function triggerGameOver(reason) {
        isGameOver = true;
        isRunning = false;
        playGameOverSound();

        finalScoreEl.textContent = score;
        finalLengthEl.textContent = `${snake.length} 节`;
        finalSurgesEl.textContent = `${surgesUsed} 次`;

        overlayTitle.textContent = '浪潮沉陷 · 龙息归海';
        overlaySub.innerHTML = `原因：<b>${reason}</b><br>在神奈川怒涛中战至 <b>${score}</b> 分！`;
        overlayStats.classList.remove('hidden');
        startBtn.querySelector('span').textContent = '重新驾龙出海 (R)';
        overlayScreen.classList.remove('hidden');
    }

    // Render Canvas Frame
    function draw() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 1. Canvas Background Texture
        ctx.fillStyle = '#0f233d';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Grid Woodblock Lines
        ctx.strokeStyle = 'rgba(56, 136, 158, 0.12)';
        ctx.lineWidth = 1;
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * CELL_SIZE, 0);
            ctx.lineTo(c * CELL_SIZE, CANVAS_HEIGHT);
            ctx.stroke();
        }
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * CELL_SIZE);
            ctx.lineTo(CANVAS_WIDTH, r * CELL_SIZE);
            ctx.stroke();
        }

        // 2. Whirlpools Render
        tideAngle += 0.03;
        for (const wp of whirlpools) {
            const cx = wp.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = wp.y * CELL_SIZE + CELL_SIZE / 2;
            const rad = wp.radius * CELL_SIZE;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(tideAngle + wp.angle);

            for (let ring = 3; ring >= 1; ring--) {
                ctx.strokeStyle = ring % 2 === 0 ? 'rgba(56, 136, 158, 0.35)' : 'rgba(248, 246, 240, 0.25)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, rad * (ring / 3), 0, Math.PI * 1.4);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 3. Foods Render
        const now = performance.now();
        for (const f of foods) {
            const fx = f.x * CELL_SIZE + CELL_SIZE / 2;
            const fy = f.y * CELL_SIZE + CELL_SIZE / 2;
            const bounce = Math.sin(now * 0.005 + f.animTimer) * 3;

            ctx.save();
            ctx.translate(fx, fy + bounce);

            if (f.type === 'koi') {
                // Cinnabar Koi Fish Body
                ctx.fillStyle = '#cc3322';
                ctx.beginPath();
                ctx.ellipse(0, 0, CELL_SIZE * 0.38, CELL_SIZE * 0.22, 0, 0, Math.PI * 2);
                ctx.fill();
                // Tail
                ctx.fillStyle = '#f8f6f0';
                ctx.beginPath();
                ctx.moveTo(-CELL_SIZE * 0.3, 0);
                ctx.lineTo(-CELL_SIZE * 0.5, -CELL_SIZE * 0.2);
                ctx.lineTo(-CELL_SIZE * 0.5, CELL_SIZE * 0.2);
                ctx.closePath();
                ctx.fill();
            } else if (f.type === 'pearl') {
                // Indigo Sacred Pearl
                const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, CELL_SIZE * 0.4);
                grad.addColorStop(0, '#f8f6f0');
                grad.addColorStop(0.5, '#38889e');
                grad.addColorStop(1, '#0c1b33');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, CELL_SIZE * 0.38, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fce895';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else if (f.type === 'coin') {
                // Octagonal Gold Leaf Coin
                ctx.fillStyle = '#d49b28';
                ctx.strokeStyle = '#fce895';
                ctx.lineWidth = 2;
                const r = CELL_SIZE * 0.38;
                ctx.beginPath();
                for (let a = 0; a < 8; a++) {
                    const ang = (a * Math.PI) / 4;
                    const px = Math.cos(ang) * r;
                    const py = Math.sin(ang) * r;
                    if (a === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else if (f.type === 'horn') {
                // Emerald Jade Dragon Horn
                ctx.fillStyle = '#2b7a62';
                ctx.beginPath();
                ctx.moveTo(-CELL_SIZE * 0.2, CELL_SIZE * 0.3);
                ctx.quadraticCurveTo(0, 0, CELL_SIZE * 0.3, -CELL_SIZE * 0.3);
                ctx.quadraticCurveTo(-CELL_SIZE * 0.1, -CELL_SIZE * 0.1, -CELL_SIZE * 0.2, CELL_SIZE * 0.3);
                ctx.fill();
                ctx.strokeStyle = '#fce895';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            ctx.restore();
        }

        // 4. Particles Render
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // 5. Snake (Ukiyo Sea Dragon) Render
        if (snake.length > 0) {
            // Draw Body & Scales
            for (let i = snake.length - 1; i >= 0; i--) {
                const seg = snake[i];
                const sx = seg.x * CELL_SIZE + CELL_SIZE / 2;
                const sy = seg.y * CELL_SIZE + CELL_SIZE / 2;

                ctx.save();
                ctx.translate(sx, sy);

                if (i === 0) {
                    // Dragon Head
                    const headAngle = Math.atan2(dir.y, dir.x);
                    ctx.rotate(headAngle);

                    // Head Contour
                    ctx.fillStyle = isSurgeActive ? '#fce895' : '#193860';
                    ctx.strokeStyle = isSurgeActive ? '#ffffff' : '#f8f6f0';
                    ctx.lineWidth = 2;

                    ctx.beginPath();
                    ctx.moveTo(CELL_SIZE * 0.6, 0);
                    ctx.lineTo(-CELL_SIZE * 0.4, -CELL_SIZE * 0.45);
                    ctx.lineTo(-CELL_SIZE * 0.5, CELL_SIZE * 0.45);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Glowing Dragon Eyes
                    ctx.fillStyle = '#cc3322';
                    ctx.beginPath();
                    ctx.arc(CELL_SIZE * 0.2, -CELL_SIZE * 0.2, 3.5, 0, Math.PI * 2);
                    ctx.arc(CELL_SIZE * 0.2, CELL_SIZE * 0.2, 3.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Dragon Whiskers (须)
                    ctx.strokeStyle = '#fce895';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(CELL_SIZE * 0.5, -CELL_SIZE * 0.1);
                    ctx.quadraticCurveTo(CELL_SIZE * 0.9, -CELL_SIZE * 0.4, CELL_SIZE * 0.7, -CELL_SIZE * 0.6);
                    ctx.moveTo(CELL_SIZE * 0.5, CELL_SIZE * 0.1);
                    ctx.quadraticCurveTo(CELL_SIZE * 0.9, CELL_SIZE * 0.4, CELL_SIZE * 0.7, CELL_SIZE * 0.6);
                    ctx.stroke();

                } else {
                    // Body Scale Segment
                    const ratio = i / snake.length;
                    const bodyRadius = CELL_SIZE * (0.45 - ratio * 0.15);

                    if (isSurgeActive) {
                        ctx.fillStyle = i % 2 === 0 ? '#fce895' : '#d49b28';
                    } else {
                        ctx.fillStyle = i % 2 === 0 ? '#193860' : '#2b5688';
                    }

                    ctx.beginPath();
                    ctx.arc(0, 0, bodyRadius, 0, Math.PI * 2);
                    ctx.fill();

                    // Ukiyo Gold/Foam Crest Accent
                    ctx.strokeStyle = 'rgba(248, 246, 240, 0.4)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }

                ctx.restore();
            }
        }

        // 6. Surge Active Full-Screen Overlay FX
        if (isSurgeActive) {
            ctx.fillStyle = 'rgba(212, 155, 40, 0.08)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.strokeStyle = '#fce895';
            ctx.lineWidth = 4;
            ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
    }

    // Main Game Loop
    function mainLoop(now) {
        animFrameId = requestAnimationFrame(mainLoop);

        // Update Surge Timer
        if (isSurgeActive) {
            const dt = now - (lastTickTime || now);
            surgeTimer -= 16;
            if (surgeTimer <= 0) {
                isSurgeActive = false;
                surgeTimer = 0;
            }
            updateSurgeUI();
        }

        // Game Tick Timer
        const currentSpeed = tickInterval / tideSpeed;
        if (now - lastTickTime >= currentSpeed) {
            lastTickTime = now;
            gameTick();
        }

        draw();
    }

    // Input Handling
    function handleDirectionInput(newDir) {
        if (!isRunning || isPaused || isGameOver) return;
        const lastQueued = nextDirQueue.length > 0 ? nextDirQueue[nextDirQueue.length - 1] : dir;
        if (newDir.x !== -lastQueued.x || newDir.y !== -lastQueued.y) {
            if (nextDirQueue.length < 3) {
                nextDirQueue.push(newDir);
            }
        }
    }

    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault(); // Prevent page scroll
        }

        initAudio();

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
                triggerSurgeSkill();
                break;
            case 'p':
            case 'P':
                togglePause();
                break;
            case 'r':
            case 'R':
                resetGame();
                break;
        }
    });

    // Mobile D-Pad Buttons
    document.getElementById('btn-up').addEventListener('click', () => handleDirectionInput({ x: 0, y: -1 }));
    document.getElementById('btn-down').addEventListener('click', () => handleDirectionInput({ x: 0, y: 1 }));
    document.getElementById('btn-left').addEventListener('click', () => handleDirectionInput({ x: -1, y: 0 }));
    document.getElementById('btn-right').addEventListener('click', () => handleDirectionInput({ x: 1, y: 0 }));
    document.getElementById('btn-center').addEventListener('click', () => {
        tideSpeed = tideSpeed === 1.0 ? 1.5 : 1.0;
        tideValEl.textContent = tideSpeed.toFixed(1) + 'x';
    });
    mobileSkillBtn.addEventListener('click', () => triggerSurgeSkill());

    // Touch Swipe Gestures on Canvas
    let touchStartX = 0;
    let touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
        if (!touchStartX || !touchStartY) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;

        if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
            if (Math.abs(dx) > Math.abs(dy)) {
                handleDirectionInput({ x: dx > 0 ? 1 : -1, y: 0 });
            } else {
                handleDirectionInput({ x: 0, y: dy > 0 ? 1 : -1 });
            }
        }
        touchStartX = 0;
        touchStartY = 0;
    }, { passive: true });

    // Pause Control
    function togglePause() {
        if (!isRunning || isGameOver) return;
        isPaused = !isPaused;
        if (isPaused) {
            pauseIcon.classList.add('hidden');
            playIcon.classList.remove('hidden');
            overlayTitle.textContent = '🌊 游戏已暂停 🌊';
            overlaySub.textContent = '按 [P] 或右上角按钮继续行舟游龙';
            overlayStats.classList.add('hidden');
            startBtn.querySelector('span').textContent = '继续探险';
            overlayScreen.classList.remove('hidden');
        } else {
            pauseIcon.classList.remove('hidden');
            playIcon.classList.add('hidden');
            overlayScreen.classList.add('hidden');
            lastTickTime = performance.now();
        }
    }

    pauseBtn.addEventListener('click', togglePause);
    startBtn.addEventListener('click', () => {
        initAudio();
        if (isPaused) {
            togglePause();
        } else {
            resetGame();
        }
    });

    // Start Animation Loop
    animFrameId = requestAnimationFrame(mainLoop);
})();
