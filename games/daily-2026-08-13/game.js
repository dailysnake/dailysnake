/**
 * 玛雅羽蛇神：太阳历盘与星辉神怒 (Kukulkan: Mayan Feathered Serpent)
 * Daily Snake 2026-08-13
 */

(function() {
    'use strict';

    // Game Constants & Configuration
    const GRID_SIZE = 24;
    const GAME_SPEED_MS = 100; // Normal frame tick (10 FPS)
    const BOOST_SPEED_MS = 70;  // Solar Storm frame tick (14 FPS)

    // DOM Elements
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const scoreVal = document.getElementById('score-val');
    const highScoreVal = document.getElementById('high-score-val');
    const comboVal = document.getElementById('combo-val');
    const energyBarFill = document.getElementById('energy-bar-fill');
    const solarOverlay = document.getElementById('solar-overlay');

    const startScreen = document.getElementById('start-screen');
    const pauseScreen = document.getElementById('pause-screen');
    const gameoverScreen = document.getElementById('gameover-screen');

    const startBtn = document.getElementById('start-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const restartBtn = document.getElementById('restart-btn');
    const shareBtn = document.getElementById('share-btn');
    const soundBtn = document.getElementById('sound-btn');
    const soundIcon = document.getElementById('sound-icon');
    const helpBtn = document.getElementById('help-btn');
    const closeHelpBtn = document.getElementById('close-help-btn');
    const helpModal = document.getElementById('help-modal');

    const finalScore = document.getElementById('final-score');
    const finalHighScore = document.getElementById('final-high-score');
    const finalMaxCombo = document.getElementById('final-max-combo');
    const finalSolarBlasts = document.getElementById('final-solar-blasts');

    // Touch D-Pad Controls
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnSolar = document.getElementById('btn-solar');

    // Web Audio API Synthesizer
    let audioCtx = null;
    let isMuted = localStorage.getItem('kukulkan_muted') === 'true';

    function initAudio() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playSound(type) {
        if (isMuted || !audioCtx) return;
        initAudio();
        const now = audioCtx.currentTime;

        if (type === 'eatJade') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.12); // C6
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'eatGlyph') {
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + i * 0.04);
                gain.gain.setValueAtTime(0.2, now + i * 0.04);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.04 + 0.25);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + i * 0.04);
                osc.stop(now + i * 0.04 + 0.25);
            });
        } else if (type === 'eatJaguar') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'solarStart') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.45);
        } else if (type === 'shatter') {
            const bufferSize = audioCtx.sampleRate * 0.15;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1000;
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            noise.start(now);
        } else if (type === 'die') {
            [330, 293.66, 261.63, 196.00].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now + i * 0.08);
                gain.gain.setValueAtTime(0.3, now + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.18);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + i * 0.08);
                osc.stop(now + i * 0.08 + 0.18);
            });
        }
    }

    function updateSoundUI() {
        soundIcon.textContent = isMuted ? '🔇' : '🔊';
    }
    updateSoundUI();

    soundBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('kukulkan_muted', isMuted);
        updateSoundUI();
        if (!isMuted) initAudio();
    });

    // Game Variables
    let gameState = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let score = 0;
    let highScore = parseInt(localStorage.getItem('kukulkan_high_score') || '0', 10);
    let combo = 1;
    let comboTimer = null;
    let maxCombo = 1;
    let solarEnergy = 0; // 0 to 100
    let isSolarActive = false;
    let solarTimer = 0;
    let solarBlastsCount = 0;
    let magnetActive = false;
    let magnetTimer = 0;

    let items = []; // Food items: { x, y, type: 'jade'|'glyph'|'jaguar', pulse: 0 }
    let hazards = []; // Eclipse hazards: { x, y, rotation: 0, speed: 0.05 }
    let particles = [];
    let floatingTexts = [];

    let gameLoopTimeout = null;
    let animFrameReq = null;

    highScoreVal.textContent = highScore;

    // Resizing & Scale setup
    let cellSize = 25;
    function resizeCanvas() {
        const wrapper = document.getElementById('canvas-wrapper');
        const size = Math.min(wrapper.clientWidth, wrapper.clientHeight);
        canvas.width = size;
        canvas.height = size;
        cellSize = canvas.width / GRID_SIZE;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Reset / Init Game State
    function initGame() {
        snake = [
            { x: 12, y: 12 },
            { x: 11, y: 12 },
            { x: 10, y: 12 },
            { x: 9, y: 12 }
        ];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        score = 0;
        combo = 1;
        maxCombo = 1;
        solarEnergy = 0;
        isSolarActive = false;
        solarTimer = 0;
        solarBlastsCount = 0;
        magnetActive = false;
        magnetTimer = 0;
        items = [];
        hazards = [];
        particles = [];
        floatingTexts = [];

        scoreVal.textContent = '0';
        comboVal.textContent = 'x1';
        energyBarFill.style.width = '0%';
        solarOverlay.classList.remove('active');

        spawnItem('jade');
        spawnItem('jade');
        spawnHazard();
    }

    // Spawn Food Items
    function spawnItem(preferredType) {
        let x, y, valid = false;
        let attempts = 0;
        while (!valid && attempts < 100) {
            x = Math.floor(Math.random() * GRID_SIZE);
            y = Math.floor(Math.random() * GRID_SIZE);
            attempts++;

            let collision = snake.some(seg => seg.x === x && seg.y === y);
            collision = collision || items.some(it => it.x === x && it.y === y);
            collision = collision || hazards.some(h => Math.floor(h.x) === x && Math.floor(h.y) === y);
            if (!collision) valid = true;
        }

        if (valid) {
            let type = preferredType || 'jade';
            if (!preferredType) {
                const rand = Math.random();
                if (rand < 0.65) type = 'jade';
                else if (rand < 0.85) type = 'glyph';
                else type = 'jaguar';
            }
            items.push({ x, y, type, pulse: Math.random() * Math.PI * 2 });
        }
    }

    // Spawn Hazards (Blood Moon Traps)
    function spawnHazard() {
        if (hazards.length >= 4) return;
        let x, y, valid = false;
        let attempts = 0;
        while (!valid && attempts < 100) {
            x = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
            y = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
            attempts++;

            let distSnake = Math.hypot(snake[0].x - x, snake[0].y - y);
            let collision = distSnake < 4;
            collision = collision || hazards.some(h => Math.hypot(h.x - x, h.y - y) < 3);
            if (!collision) valid = true;
        }

        if (valid) {
            hazards.push({
                x, y,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.03 + Math.random() * 0.03)
            });
        }
    }

    // Trigger Solar Storm (羽蛇升天)
    function activateSolarStorm() {
        if (solarEnergy < 30 || isSolarActive || gameState !== 'PLAYING') return;

        isSolarActive = true;
        solarTimer = 220; // ~4 seconds
        solarEnergy = 0;
        energyBarFill.style.width = '0%';
        solarBlastsCount++;
        solarOverlay.classList.add('active');

        playSound('solarStart');
        createExplosion(snake[0].x * cellSize + cellSize/2, snake[0].y * cellSize + cellSize/2, '#ffd700', 40);
        addFloatingText(snake[0].x * cellSize, snake[0].y * cellSize, '☀️ 羽蛇升天！', '#ffd700');
    }

    // Particle FX
    function createExplosion(cx, cy, color, count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4,
                color: color,
                alpha: 1,
                life: 0,
                maxLife: 20 + Math.floor(Math.random() * 20)
            });
        }
    }

    function addFloatingText(x, y, text, color) {
        floatingTexts.push({ x, y, text, color, alpha: 1, vy: -1.2 });
    }

    // Core Game Update Loop (Tick)
    function gameTick() {
        if (gameState !== 'PLAYING') return;

        // Update direction
        dir = { ...nextDir };

        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Wall Collision Check
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            gameOver('神殿结界撕裂！碰触巨石壁障');
            return;
        }

        // Self Collision Check (invincible during Solar Storm)
        if (!isSolarActive) {
            for (let i = 0; i < snake.length - 1; i++) {
                if (snake[i].x === head.x && snake[i].y === head.y) {
                    gameOver('羽蛇盘踞绞杀！碰撞自身鳞躯');
                    return;
                }
            }
        }

        // Magnet attraction or Solar Storm magnet
        if (isSolarActive || magnetActive) {
            items.forEach(it => {
                const dist = Math.hypot(head.x - it.x, head.y - it.y);
                if (dist < (isSolarActive ? 12 : 5)) {
                    if (it.x < head.x) it.x += 0.5;
                    else if (it.x > head.x) it.x -= 0.5;
                    if (it.y < head.y) it.y += 0.5;
                    else if (it.y > head.y) it.y -= 0.5;
                }
            });
        }

        // Hazard Collision Check
        for (let i = hazards.length - 1; i >= 0; i--) {
            const h = hazards[i];
            const dist = Math.hypot(head.x - h.x, head.y - h.y);
            if (dist < 1.2) {
                if (isSolarActive) {
                    // Shatter hazard!
                    hazards.splice(i, 1);
                    score += 300;
                    scoreVal.textContent = score;
                    playSound('shatter');
                    createExplosion(h.x * cellSize + cellSize/2, h.y * cellSize + cellSize/2, '#ff3d00', 30);
                    addFloatingText(h.x * cellSize, h.y * cellSize, '+300 破除血月', '#ff6d00');
                    setTimeout(spawnHazard, 4000);
                } else {
                    gameOver('误入极暗陷阱！触碰血月食影');
                    return;
                }
            }
        }

        // Advance Snake
        snake.unshift(head);

        // Check Food Eaten
        let ate = false;
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            const dist = Math.hypot(head.x - it.x, head.y - it.y);
            if (dist < 1.0) {
                ate = true;
                let pts = 100;
                let energyGain = 12;

                if (it.type === 'glyph') {
                    pts = 300;
                    energyGain = 35;
                    playSound('eatGlyph');
                    addFloatingText(head.x * cellSize, head.y * cellSize, `+${pts * combo} 太阳符刻`, '#ffd700');
                    createExplosion(head.x * cellSize + cellSize/2, head.y * cellSize + cellSize/2, '#ffd700', 20);
                } else if (it.type === 'jaguar') {
                    pts = 200;
                    energyGain = 20;
                    magnetActive = true;
                    magnetTimer = 150;
                    playSound('eatJaguar');
                    addFloatingText(head.x * cellSize, head.y * cellSize, `+${pts * combo} 豹神磁场`, '#e040fb');
                    createExplosion(head.x * cellSize + cellSize/2, head.y * cellSize + cellSize/2, '#e040fb', 20);
                } else { // jade
                    pts = 100;
                    energyGain = 12;
                    playSound('eatJade');
                    addFloatingText(head.x * cellSize, head.y * cellSize, `+${pts * combo}`, '#00e676');
                    createExplosion(head.x * cellSize + cellSize/2, head.y * cellSize + cellSize/2, '#00e676', 15);
                }

                // Combo System
                combo++;
                if (combo > maxCombo) maxCombo = combo;
                comboVal.textContent = `x${combo}`;
                clearTimeout(comboTimer);
                comboTimer = setTimeout(() => {
                    combo = 1;
                    comboVal.textContent = 'x1';
                }, 3500);

                score += pts * combo;
                scoreVal.textContent = score;

                // Solar Energy
                if (!isSolarActive) {
                    solarEnergy = Math.min(100, solarEnergy + energyGain);
                    energyBarFill.style.width = `${solarEnergy}%`;
                }

                items.splice(i, 1);
                spawnItem();
                if (Math.random() < 0.25) spawnItem();
                break;
            }
        }

        if (!ate) {
            snake.pop();
        }

        // Timers
        if (isSolarActive) {
            solarTimer--;
            if (solarTimer <= 0) {
                isSolarActive = false;
                solarOverlay.classList.remove('active');
            }
        }

        if (magnetActive) {
            magnetTimer--;
            if (magnetTimer <= 0) magnetActive = false;
        }

        // Schedule next tick
        const speed = isSolarActive ? BOOST_SPEED_MS : GAME_SPEED_MS;
        gameLoopTimeout = setTimeout(gameTick, speed);
    }

    // Continuous Canvas Render Loop (60 FPS)
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Obsidian Solar Calendar Floor Grid
        drawBackground();

        // 2. Draw Blood Moon Eclipse Hazards
        drawHazards();

        // 3. Draw Food Items
        drawItems();

        // 4. Draw Snake Body & Feather Wings
        drawSnake();

        // 5. Draw Particle FX & Floating Texts
        drawParticles();
        drawFloatingTexts();

        animFrameReq = requestAnimationFrame(render);
    }

    // Render Background
    function drawBackground() {
        ctx.fillStyle = '#080d14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines with gold etching
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.05)';
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

        // Center Sun Disk Graphic
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        ctx.save();
        ctx.strokeStyle = isSolarActive ? 'rgba(255, 215, 0, 0.25)' : 'rgba(0, 230, 118, 0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, canvas.width * 0.35, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, canvas.width * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Render Hazards
    function drawHazards() {
        hazards.forEach(h => {
            h.rotation += h.rotSpeed;
            const cx = h.x * cellSize + cellSize / 2;
            const cy = h.y * cellSize + cellSize / 2;
            const r = cellSize * 0.9;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(h.rotation);

            // Crimson obsidian wheel
            ctx.fillStyle = '#1a0505';
            ctx.strokeStyle = isSolarActive ? '#ff6d00' : '#d50000';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#d50000';
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Sawtooth blades
            ctx.fillStyle = '#ff1744';
            for (let a = 0; a < 6; a++) {
                ctx.rotate(Math.PI / 3);
                ctx.beginPath();
                ctx.moveTo(r, -4);
                ctx.lineTo(r + 6, 0);
                ctx.lineTo(r, 4);
                ctx.fill();
            }

            ctx.restore();
        });
    }

    // Render Items
    function drawItems() {
        const time = Date.now() * 0.005;
        items.forEach(it => {
            const cx = it.x * cellSize + cellSize / 2;
            const cy = it.y * cellSize + cellSize / 2;
            const pulse = Math.sin(time + it.pulse) * 2;

            ctx.save();
            ctx.translate(cx, cy);

            if (it.type === 'glyph') { // Golden Sun Glyph
                ctx.fillStyle = '#ffd700';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 14;

                ctx.beginPath();
                ctx.arc(0, 0, cellSize * 0.38 + pulse * 0.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#ff6d00';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Sun Rays
                ctx.strokeStyle = '#ffd700';
                for (let a = 0; a < 8; a++) {
                    ctx.rotate(Math.PI / 4);
                    ctx.beginPath();
                    ctx.moveTo(cellSize * 0.42, 0);
                    ctx.lineTo(cellSize * 0.55, 0);
                    ctx.stroke();
                }
            } else if (it.type === 'jaguar') { // Mystic Jaguar Flame
                ctx.fillStyle = '#e040fb';
                ctx.shadowColor = '#e040fb';
                ctx.shadowBlur = 12;

                ctx.beginPath();
                ctx.arc(0, 0, cellSize * 0.35 + pulse, 0, Math.PI * 2);
                ctx.fill();
            } else { // Imperial Jade Orb
                ctx.fillStyle = '#00e676';
                ctx.shadowColor = '#00e676';
                ctx.shadowBlur = 12;

                ctx.beginPath();
                ctx.arc(0, 0, cellSize * 0.35 + pulse * 0.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            ctx.restore();
        });
    }

    // Render Feathered Serpent (Snake)
    function drawSnake() {
        if (snake.length === 0) return;

        // Draw Body Segments from Tail to Head
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const cx = seg.x * cellSize + cellSize / 2;
            const cy = seg.y * cellSize + cellSize / 2;
            const ratio = i / snake.length;

            ctx.save();
            ctx.translate(cx, cy);

            if (i === 0) { // Head
                const angle = Math.atan2(dir.y, dir.x);
                ctx.rotate(angle);

                // Solar Storm Glow Aura
                if (isSolarActive) {
                    ctx.shadowColor = '#ffd700';
                    ctx.shadowBlur = 25;

                    // Radiant Wing Feathers
                    ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
                    ctx.beginPath();
                    ctx.moveTo(-10, -8);
                    ctx.quadraticCurveTo(-2, -30, 15, -20);
                    ctx.lineTo(0, -5);
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(-10, 8);
                    ctx.quadraticCurveTo(-2, 30, 15, 20);
                    ctx.lineTo(0, 5);
                    ctx.fill();
                } else {
                    ctx.shadowColor = '#00e676';
                    ctx.shadowBlur = 15;
                }

                // Head Base
                ctx.fillStyle = isSolarActive ? '#ffd700' : '#00e676';
                ctx.beginPath();
                ctx.arc(0, 0, cellSize * 0.55, 0, Math.PI * 2);
                ctx.fill();

                // Fangs & Eyes
                ctx.fillStyle = '#050a0f';
                ctx.beginPath();
                ctx.arc(4, -5, 3, 0, Math.PI * 2);
                ctx.arc(4, 5, 3, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(5, -5, 1.5, 0, Math.PI * 2);
                ctx.arc(5, 5, 1.5, 0, Math.PI * 2);
                ctx.fill();

                // Serpent Tongue
                ctx.strokeStyle = '#ff1744';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cellSize * 0.5, 0);
                ctx.lineTo(cellSize * 0.8, 0);
                ctx.lineTo(cellSize * 0.95, -3);
                ctx.moveTo(cellSize * 0.8, 0);
                ctx.lineTo(cellSize * 0.95, 3);
                ctx.stroke();

            } else { // Body & Tail
                const radius = (cellSize * 0.45) * (1 - ratio * 0.35);

                ctx.shadowColor = isSolarActive ? '#ffd700' : '#00e676';
                ctx.shadowBlur = isSolarActive ? 12 : 6;

                ctx.fillStyle = isSolarActive ? '#ffab00' : '#00c853';
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.fill();

                // Gold Glyph Pattern on Segment
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    // Render Particles
    function drawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life++;
            p.alpha = 1 - (p.life / p.maxLife);

            if (p.life >= p.maxLife) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Render Floating Score Texts
    function drawFloatingTexts() {
        ctx.save();
        ctx.font = 'bold 16px Orbitron, sans-serif';
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.02;

            if (ft.alpha <= 0) {
                floatingTexts.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = ft.alpha;
            ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.restore();
    }

    // Game Over Handler
    function gameOver(reason) {
        gameState = 'GAMEOVER';
        clearTimeout(gameLoopTimeout);
        playSound('die');

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('kukulkan_high_score', highScore);
            highScoreVal.textContent = highScore;
        }

        finalScore.textContent = score;
        finalHighScore.textContent = highScore;
        finalMaxCombo.textContent = `x${maxCombo}`;
        finalSolarBlasts.textContent = solarBlastsCount;

        gameoverScreen.classList.add('active');
    }

    // Input Handling
    function handleDirectionInput(newDir) {
        if (gameState !== 'PLAYING') return;
        // Prevent 180-degree reverse turn
        if (newDir.x + dir.x !== 0 || newDir.y + dir.y !== 0) {
            nextDir = newDir;
        }
    }

    window.addEventListener('keydown', (e) => {
        initAudio();
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') handleDirectionInput({ x: 0, y: -1 });
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') handleDirectionInput({ x: 0, y: 1 });
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') handleDirectionInput({ x: -1, y: 0 });
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') handleDirectionInput({ x: 1, y: 0 });
        else if (e.code === 'Space') {
            e.preventDefault();
            activateSolarStorm();
        } else if (e.key === 'p' || e.key === 'P') {
            togglePause();
        }
    });

    // Touch D-Pad Events
    btnUp.addEventListener('click', () => handleDirectionInput({ x: 0, y: -1 }));
    btnDown.addEventListener('click', () => handleDirectionInput({ x: 0, y: 1 }));
    btnLeft.addEventListener('click', () => handleDirectionInput({ x: -1, y: 0 }));
    btnRight.addEventListener('click', () => handleDirectionInput({ x: 1, y: 0 }));
    btnSolar.addEventListener('click', () => activateSolarStorm());

    // Swipe Gesture Controls on Canvas
    let touchStartX = 0;
    let touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
        initAudio();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
            if (Math.abs(dx) > Math.abs(dy)) {
                handleDirectionInput(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
            } else {
                handleDirectionInput(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
            }
        }
    }, { passive: true });

    // UI Buttons Handler
    startBtn.addEventListener('click', () => {
        initAudio();
        startScreen.classList.remove('active');
        gameState = 'PLAYING';
        initGame();
        gameTick();
    });

    restartBtn.addEventListener('click', () => {
        initAudio();
        gameoverScreen.classList.remove('active');
        gameState = 'PLAYING';
        initGame();
        gameTick();
    });

    function togglePause() {
        if (gameState === 'PLAYING') {
            gameState = 'PAUSED';
            clearTimeout(gameLoopTimeout);
            pauseScreen.classList.add('active');
        } else if (gameState === 'PAUSED') {
            gameState = 'PLAYING';
            pauseScreen.classList.remove('active');
            gameTick();
        }
    }

    resumeBtn.addEventListener('click', () => togglePause());

    helpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    closeHelpBtn.addEventListener('click', () => helpModal.classList.remove('active'));

    shareBtn.addEventListener('click', () => {
        const text = `我在《玛雅羽蛇神：太阳历盘与星辉神怒》中取得了 ${score} 分！挑战连击 ${maxCombo} 倍，成功触发 ${solarBlastsCount} 次羽蛇升天！来 Daily Snake 挑战我吧！https://dailysnake.org/games/daily-2026-08-13/`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert('战报已复制到剪贴板，快去分享给好友吧！');
            });
        } else {
            alert(text);
        }
    });

    // Start 60 FPS Canvas Renderer
    render();
})();
