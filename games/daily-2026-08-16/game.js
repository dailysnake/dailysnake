/**
 * 古埃及法老：拉神太阳船与金符神怒 (2026-08-16)
 * Daily Snake 每日贪吃蛇
 */

(function() {
    'use strict';

    // Game Configuration
    const GRID_SIZE = 22;
    const BASE_SPEED = 110; // ms per tick
    const SKILL_DURATION = 6000; // 6 seconds for Ra Solar Flare
    const MAGNET_DURATION = 8000; // 8 seconds for Horus Magnet

    // Audio Synthesizer Engine (Web Audio API)
    class SoundEngine {
        constructor() {
            this.ctx = null;
            this.enabled = true;
            this.bgOsc = null;
            this.bgGain = null;
        }

        init() {
            if (this.ctx) return;
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }

        ensureContext() {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggleAudio() {
            this.enabled = !this.enabled;
            if (!this.enabled && this.bgGain) {
                this.bgGain.gain.setValueAtTime(0, this.ctx ? this.ctx.currentTime : 0);
            }
            return this.enabled;
        }

        // Egyptian Scale Frequencies (F# Phrygian Dominant)
        getScaleFreq(index) {
            const freqs = [185.00, 196.00, 233.08, 246.94, 277.18, 293.66, 329.63, 369.99, 392.00, 466.16];
            return freqs[index % freqs.length];
        }

        playTone(freq, type = 'sine', duration = 0.15, startVol = 0.3) {
            if (!this.enabled) return;
            this.ensureContext();
            if (!this.ctx) return;

            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

                gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {}
        }

        playScarab(comboCount = 1) {
            if (!this.enabled) return;
            const baseFreq = this.getScaleFreq(comboCount);
            this.playTone(baseFreq * 2, 'triangle', 0.12, 0.25);
            setTimeout(() => {
                this.playTone(baseFreq * 2.5, 'sine', 0.15, 0.2);
            }, 60);
        }

        playAnkh() {
            if (!this.enabled) return;
            this.ensureContext();
            if (!this.ctx) return;
            [369.99, 466.16, 554.37, 739.99].forEach((freq, idx) => {
                setTimeout(() => {
                    this.playTone(freq, 'sine', 0.3, 0.3);
                }, idx * 70);
            });
        }

        playHorus() {
            if (!this.enabled) return;
            this.ensureContext();
            if (!this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.3);
            } catch (e) {}
        }

        playSolarSkill() {
            if (!this.enabled) return;
            this.ensureContext();
            if (!this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                const osc1 = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc1.type = 'triangle';
                osc2.type = 'sawtooth';

                osc1.frequency.setValueAtTime(150, now);
                osc1.frequency.exponentialRampToValueAtTime(900, now + 0.6);
                osc2.frequency.setValueAtTime(300, now);
                osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.6);

                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(this.ctx.destination);

                osc1.start();
                osc2.start();
                osc1.stop(now + 0.8);
                osc2.stop(now + 0.8);
            } catch (e) {}
        }

        playSmash() {
            if (!this.enabled) return;
            this.playTone(120, 'square', 0.2, 0.4);
            setTimeout(() => this.playTone(350, 'triangle', 0.15, 0.3), 50);
        }

        playGameOver() {
            if (!this.enabled) return;
            [300, 240, 180, 120].forEach((freq, idx) => {
                setTimeout(() => {
                    this.playTone(freq, 'sawtooth', 0.3, 0.3);
                }, idx * 100);
            });
        }
    }

    const sound = new SoundEngine();

    // DOM Elements
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('canvas-container');

    const scoreDisplay = document.getElementById('score-display');
    const comboDisplay = document.getElementById('combo-display');
    const highscoreDisplay = document.getElementById('highscore-display');
    const energyFill = document.getElementById('energy-bar-fill');
    const skillStatusText = document.getElementById('skill-status-text');

    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    const audioOnIcon = document.getElementById('audio-on-icon');
    const audioOffIcon = document.getElementById('audio-off-icon');

    const pauseBtn = document.getElementById('pause-btn');
    const pauseModal = document.getElementById('pause-modal');
    const resumeBtn = document.getElementById('resume-btn');
    const restartPauseBtn = document.getElementById('restart-pause-btn');

    const gameoverModal = document.getElementById('gameover-modal');
    const restartBtn = document.getElementById('restart-btn');
    const finalScore = document.getElementById('final-score');
    const finalHighscore = document.getElementById('final-highscore');
    const finalCombo = document.getElementById('final-combo');
    const finalSkills = document.getElementById('final-skills');

    const mobileSkillBtn = document.getElementById('mobile-skill-btn');
    const canvasBanner = document.getElementById('canvas-banner');
    const bannerText = document.getElementById('banner-text');

    // Game Variables
    let cellSize = 20;
    let gridCols = GRID_SIZE;
    let gridRows = GRID_SIZE;

    let score = 0;
    let highscore = parseInt(localStorage.getItem('daily_snake_2026_08_16_highscore') || '0', 10);
    let combo = 1;
    let maxCombo = 1;
    let comboTimer = null;
    let energy = 0; // 0 to 100
    let skillsTriggered = 0;

    let isPaused = false;
    let isGameOver = false;
    let isSolarFlareActive = false;
    let solarFlareEndTime = 0;

    let isMagnetActive = false;
    let magnetEndTime = 0;

    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let hasShield = false;

    let foods = []; // Array of food objects: {x, y, type: 'SCARAB'|'ANKH'|'HORUS'|'SOLAR', pulse: 0}
    let obelisks = []; // Array of obstacle objects: {x, y}
    let particles = []; // Floating visual particles

    let gameLoopTimeout = null;
    let lastRenderTime = 0;

    // Highscore display init
    highscoreDisplay.textContent = highscore;

    // Resize Canvas Responsively
    function resizeCanvas() {
        const rect = container.getBoundingClientRect();
        const minDim = Math.min(rect.width, rect.height) - 10;
        
        cellSize = Math.floor(minDim / GRID_SIZE);
        canvas.width = cellSize * GRID_SIZE;
        canvas.height = cellSize * GRID_SIZE;

        gridCols = GRID_SIZE;
        gridRows = GRID_SIZE;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Reset Game State
    function resetGame() {
        snake = [
            { x: 5, y: 10 },
            { x: 4, y: 10 },
            { x: 3, y: 10 }
        ];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };

        score = 0;
        combo = 1;
        maxCombo = 1;
        energy = 0;
        skillsTriggered = 0;
        hasShield = false;
        isSolarFlareActive = false;
        isMagnetActive = false;

        isPaused = false;
        isGameOver = false;

        particles = [];
        obelisks = [];
        foods = [];

        generateObelisks();
        spawnFood('SCARAB');
        spawnFood('SCARAB');
        spawnFood('SOLAR');

        updateHUD();
        hideBanner();

        gameoverModal.classList.add('hidden');
        pauseModal.classList.add('hidden');

        if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
        gameLoop();
    }

    function generateObelisks() {
        obelisks = [];
        const count = 4;
        for (let i = 0; i < count; i++) {
            let ox = Math.floor(Math.random() * (gridCols - 4)) + 2;
            let oy = Math.floor(Math.random() * (gridRows - 4)) + 2;
            // Prevent spawning directly near initial snake
            if (Math.abs(ox - 5) > 3 && Math.abs(oy - 10) > 3) {
                obelisks.push({ x: ox, y: oy });
            }
        }
    }

    function spawnFood(forcedType = null) {
        let attempts = 0;
        while (attempts < 100) {
            let fx = Math.floor(Math.random() * gridCols);
            let fy = Math.floor(Math.random() * gridRows);

            const isOccupiedBySnake = snake.some(seg => seg.x === fx && seg.y === fy);
            const isOccupiedByObelisk = obelisks.some(o => o.x === fx && o.y === fy);
            const isOccupiedByFood = foods.some(f => f.x === fx && f.y === fy);

            if (!isOccupiedBySnake && !isOccupiedByObelisk && !isOccupiedByFood) {
                let type = forcedType;
                if (!type) {
                    const rand = Math.random();
                    if (rand < 0.65) type = 'SCARAB';
                    else if (rand < 0.82) type = 'SOLAR';
                    else if (rand < 0.93) type = 'ANKH';
                    else type = 'HORUS';
                }
                foods.push({ x: fx, y: fy, type: type, pulse: 0 });
                break;
            }
            attempts++;
        }
    }

    // Main Game Loop
    function gameLoop() {
        if (isGameOver) return;

        if (!isPaused) {
            update();
            render();
        }

        let currentSpeed = BASE_SPEED;
        if (isSolarFlareActive) currentSpeed = Math.floor(BASE_SPEED * 0.7);

        gameLoopTimeout = setTimeout(gameLoop, currentSpeed);
    }

    // Update Logic
    function update() {
        const now = Date.now();

        // Skill Timer Check
        if (isSolarFlareActive && now > solarFlareEndTime) {
            isSolarFlareActive = false;
            hideBanner();
        }

        // Magnet Timer Check
        if (isMagnetActive && now > magnetEndTime) {
            isMagnetActive = false;
        }

        // Update direction from queued nextDir
        if ((nextDir.x !== -dir.x || snake.length === 1) && (nextDir.y !== -dir.y || snake.length === 1)) {
            dir = nextDir;
        }

        // Head position
        let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Magnet Pull Effect: Move foods closer to snake head if magnet active
        if (isMagnetActive || isSolarFlareActive) {
            foods.forEach(f => {
                if (Math.random() < 0.5) {
                    if (f.x < head.x) f.x++;
                    else if (f.x > head.x) f.x--;
                    if (f.y < head.y) f.y++;
                    else if (f.y > head.y) f.y--;
                }
            });
        }

        // Wall Collision
        if (head.x < 0 || head.x >= gridCols || head.y < 0 || head.y >= gridRows) {
            if (isSolarFlareActive) {
                // Wrap around during Ra Solar Flare
                if (head.x < 0) head.x = gridCols - 1;
                if (head.x >= gridCols) head.x = 0;
                if (head.y < 0) head.y = gridRows - 1;
                if (head.y >= gridRows) head.y = 0;
            } else {
                handleCollision();
                return;
            }
        }

        // Self Collision
        if (!isSolarFlareActive) {
            for (let i = 1; i < snake.length; i++) {
                if (snake[i].x === head.x && snake[i].y === head.y) {
                    handleCollision();
                    return;
                }
            }
        }

        // Obelisk Collision
        for (let i = obelisks.length - 1; i >= 0; i--) {
            let o = obelisks[i];
            if (o.x === head.x && o.y === head.y) {
                if (isSolarFlareActive) {
                    // Destroy Obelisk during Ra Solar Flare
                    createExplosion(o.x * cellSize + cellSize / 2, o.y * cellSize + cellSize / 2, '#FFD700', 20);
                    obelisks.splice(i, 1);
                    score += 500 * combo;
                    sound.playSmash();
                } else {
                    handleCollision();
                    return;
                }
            }
        }

        // Move Snake
        snake.unshift(head);

        // Food Collision Check
        let ate = false;
        for (let i = foods.length - 1; i >= 0; i--) {
            let f = foods[i];
            if (f.x === head.x && f.y === head.y) {
                ate = true;
                handleEat(f);
                foods.splice(i, 1);
                break;
            }
        }

        if (!ate) {
            snake.pop();
        } else {
            if (foods.length < 2) {
                spawnFood();
            }
        }

        // Particles Update
        updateParticles();
    }

    function handleEat(food) {
        // Combo increment
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        resetComboTimer();

        let addedScore = 100 * combo;

        switch (food.type) {
            case 'SCARAB':
                addedScore = 100 * combo;
                energy = Math.min(100, energy + 10);
                sound.playScarab(combo);
                createExplosion(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, '#FFD700', 10);
                break;
            case 'SOLAR':
                addedScore = 200 * combo;
                energy = Math.min(100, energy + 25);
                sound.playScarab(combo + 2);
                createExplosion(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, '#00E5FF', 14);
                break;
            case 'ANKH':
                addedScore = 300 * combo;
                hasShield = true;
                energy = Math.min(100, energy + 15);
                sound.playAnkh();
                showBanner('【安卡金符】圣辉护盾已开启！');
                setTimeout(hideBanner, 2000);
                createExplosion(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, '#FFD700', 18);
                break;
            case 'HORUS':
                addedScore = 400 * combo;
                isMagnetActive = true;
                magnetEndTime = Date.now() + MAGNET_DURATION;
                sound.playHorus();
                showBanner('【荷鲁斯之眼】金辉引力磁吸开启！');
                setTimeout(hideBanner, 2000);
                createExplosion(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, '#00A2FF', 18);
                break;
        }

        score += addedScore;
        updateHUD();
    }

    function resetComboTimer() {
        if (comboTimer) clearTimeout(comboTimer);
        comboTimer = setTimeout(() => {
            combo = 1;
            updateHUD();
        }, 3500);
    }

    function handleCollision() {
        if (hasShield) {
            hasShield = false;
            sound.playAnkh();
            showBanner('【圣辉护盾】抵挡了1次死亡撞击！');
            setTimeout(hideBanner, 2000);
            updateHUD();
            return;
        }

        isGameOver = true;
        sound.playGameOver();

        if (score > highscore) {
            highscore = score;
            localStorage.setItem('daily_snake_2026_08_16_highscore', highscore.toString());
        }

        finalScore.textContent = score;
        finalHighscore.textContent = highscore;
        finalCombo.textContent = `x${maxCombo}`;
        finalSkills.textContent = `${skillsTriggered} 次`;

        gameoverModal.classList.remove('hidden');
    }

    // Skill Trigger
    function triggerSkill() {
        if (energy < 100 || isSolarFlareActive || isGameOver || isPaused) return;

        sound.ensureContext();
        energy = 0;
        isSolarFlareActive = true;
        solarFlareEndTime = Date.now() + SKILL_DURATION;
        skillsTriggered++;

        sound.playSolarSkill();
        showBanner('☀️ 【拉神神怒·全屏日弧扫荡】爆发！');

        // Burst particles across canvas
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: Math.random() > 0.5 ? '#FFD700' : '#00E5FF',
                size: Math.random() * 5 + 3,
                life: 1.0
            });
        }

        updateHUD();
    }

    function showBanner(text) {
        bannerText.textContent = text;
        canvasBanner.classList.remove('hidden');
    }

    function hideBanner() {
        if (!isSolarFlareActive) {
            canvasBanner.classList.add('hidden');
        }
    }

    // HUD Update
    function updateHUD() {
        scoreDisplay.textContent = score;
        comboDisplay.textContent = `x${combo}`;
        highscoreDisplay.textContent = highscore;

        energyFill.style.width = `${energy}%`;

        if (energy >= 100) {
            skillStatusText.textContent = '【拉神神怒】就绪! [Space]';
            skillStatusText.style.color = '#FFD700';
            mobileSkillBtn.classList.remove('disabled');
        } else {
            skillStatusText.textContent = `充能中 ${energy}%`;
            skillStatusText.style.color = '#00E5FF';
            mobileSkillBtn.classList.add('disabled');
        }
    }

    // Particle FX System
    function createExplosion(cx, cy, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1;
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: Math.random() * 4 + 2,
                life: 1.0
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    // Render Canvas Aesthetics
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Obsidian Sun Dial Grid Background
        ctx.fillStyle = '#0B1124';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.07)';
        ctx.lineWidth = 1;
        for (let c = 0; c <= gridCols; c++) {
            ctx.beginPath();
            ctx.moveTo(c * cellSize, 0);
            ctx.lineTo(c * cellSize, canvas.height);
            ctx.stroke();
        }
        for (let r = 0; r <= gridRows; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * cellSize);
            ctx.lineTo(canvas.width, r * cellSize);
            ctx.stroke();
        }

        // Draw Center Sun Dial Emblem
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        ctx.strokeStyle = isSolarFlareActive ? 'rgba(255, 215, 0, 0.4)' : 'rgba(0, 162, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, cellSize * 4, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Draw Obelisks
        obelisks.forEach(o => {
            const px = o.x * cellSize;
            const py = o.y * cellSize;

            ctx.fillStyle = '#1A233A';
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.rect(px + 3, py + 3, cellSize - 6, cellSize - 6);
            ctx.fill();
            ctx.stroke();

            // Inner Hieroglyphic Ankh mark
            ctx.fillStyle = '#FFD700';
            ctx.font = `${Math.floor(cellSize * 0.5)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('𓉴', px + cellSize / 2, py + cellSize / 2);
        });

        // 3. Draw Foods
        foods.forEach(f => {
            const fx = f.x * cellSize + cellSize / 2;
            const fy = f.y * cellSize + cellSize / 2;
            f.pulse += 0.08;

            const scale = 1 + Math.sin(f.pulse) * 0.1;

            ctx.save();
            ctx.translate(fx, fy);
            ctx.scale(scale, scale);

            if (f.type === 'SCARAB') {
                ctx.fillStyle = '#FFD700';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 10;
                ctx.font = `${Math.floor(cellSize * 0.75)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('𓆣', 0, 0);
            } else if (f.type === 'SOLAR') {
                ctx.fillStyle = '#00E5FF';
                ctx.shadowColor = '#00E5FF';
                ctx.shadowBlur = 12;
                ctx.font = `${Math.floor(cellSize * 0.75)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('☀️', 0, 0);
            } else if (f.type === 'ANKH') {
                ctx.fillStyle = '#FFD700';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 15;
                ctx.font = `${Math.floor(cellSize * 0.8)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('☥', 0, 0);
            } else if (f.type === 'HORUS') {
                ctx.fillStyle = '#00A2FF';
                ctx.shadowColor = '#00A2FF';
                ctx.shadowBlur = 15;
                ctx.font = `${Math.floor(cellSize * 0.8)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('𓂀', 0, 0);
            }

            ctx.restore();
        });

        // 4. Draw Snake
        snake.forEach((seg, idx) => {
            const sx = seg.x * cellSize;
            const sy = seg.y * cellSize;

            ctx.save();

            if (idx === 0) {
                // Head
                ctx.fillStyle = isSolarFlareActive ? '#FFF' : '#FFD700';
                ctx.shadowColor = isSolarFlareActive ? '#FFD700' : '#00E5FF';
                ctx.shadowBlur = isSolarFlareActive ? 25 : 12;

                ctx.beginPath();
                ctx.roundRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2, 6);
                ctx.fill();

                // Cobra Eyes
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(sx + cellSize * 0.3, sy + cellSize * 0.35, 2, 0, Math.PI * 2);
                ctx.arc(sx + cellSize * 0.7, sy + cellSize * 0.35, 2, 0, Math.PI * 2);
                ctx.fill();

                // Shield Crown Aura
                if (hasShield) {
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(sx + cellSize / 2, sy + cellSize / 2, cellSize * 0.8, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else {
                // Body Segments
                const alpha = 1 - (idx / snake.length) * 0.6;
                ctx.fillStyle = isSolarFlareActive ? `rgba(255, 215, 0, ${alpha})` : `rgba(0, 162, 255, ${alpha})`;
                ctx.shadowColor = '#00E5FF';
                ctx.shadowBlur = 4;

                ctx.beginPath();
                ctx.roundRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4, 4);
                ctx.fill();

                // Lapis Lazuli scale accent
                if (idx % 2 === 0) {
                    ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
                    ctx.beginPath();
                    ctx.arc(sx + cellSize / 2, sy + cellSize / 2, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        });

        // 5. Draw Particles
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

    // Keyboard Input Listeners
    window.addEventListener('keydown', e => {
        sound.ensureContext();

        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
                if (dir.y !== 1) nextDir = { x: 0, y: -1 };
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 'KeyS':
                if (dir.y !== -1) nextDir = { x: 0, y: 1 };
                e.preventDefault();
                break;
            case 'ArrowLeft':
            case 'KeyA':
                if (dir.x !== 1) nextDir = { x: -1, y: 0 };
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'KeyD':
                if (dir.x !== -1) nextDir = { x: 1, y: 0 };
                e.preventDefault();
                break;
            case 'Space':
                triggerSkill();
                e.preventDefault();
                break;
            case 'KeyP':
                togglePause();
                e.preventDefault();
                break;
            case 'KeyR':
                resetGame();
                e.preventDefault();
                break;
            case 'KeyM':
                toggleAudioUI();
                e.preventDefault();
                break;
        }
    });

    // Touch D-Pad Input Listeners
    document.querySelectorAll('.dpad-btn').forEach(btn => {
        btn.addEventListener('touchstart', e => {
            sound.ensureContext();
            const d = btn.getAttribute('data-dir');
            handleDirInput(d);
            e.preventDefault();
        });
        btn.addEventListener('click', e => {
            sound.ensureContext();
            const d = btn.getAttribute('data-dir');
            handleDirInput(d);
        });
    });

    function handleDirInput(d) {
        if (d === 'UP' && dir.y !== 1) nextDir = { x: 0, y: -1 };
        if (d === 'DOWN' && dir.y !== -1) nextDir = { x: 0, y: 1 };
        if (d === 'LEFT' && dir.x !== 1) nextDir = { x: -1, y: 0 };
        if (d === 'RIGHT' && dir.x !== -1) nextDir = { x: 1, y: 0 };
    }

    // Touch Swipe Gestures on Canvas
    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener('touchstart', e => {
        sound.ensureContext();
        if (e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
        if (e.changedTouches.length > 0) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;

            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
                if (dx > 0 && dir.x !== -1) nextDir = { x: 1, y: 0 };
                else if (dx < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 };
            } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30) {
                if (dy > 0 && dir.y !== -1) nextDir = { x: 0, y: 1 };
                else if (dy < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 };
            }
        }
    }, { passive: true });

    // UI Buttons Action Handlers
    mobileSkillBtn.addEventListener('click', triggerSkill);

    function togglePause() {
        if (isGameOver) return;
        isPaused = !isPaused;
        if (isPaused) {
            pauseModal.classList.remove('hidden');
        } else {
            pauseModal.classList.add('hidden');
        }
    }

    pauseBtn.addEventListener('click', togglePause);
    resumeBtn.addEventListener('click', togglePause);
    restartPauseBtn.addEventListener('click', resetGame);
    restartBtn.addEventListener('click', resetGame);

    function toggleAudioUI() {
        const isEnabled = sound.toggleAudio();
        if (isEnabled) {
            audioOnIcon.classList.remove('hidden');
            audioOffIcon.classList.add('hidden');
        } else {
            audioOnIcon.classList.add('hidden');
            audioOffIcon.classList.remove('hidden');
        }
    }

    audioToggleBtn.addEventListener('click', toggleAudioUI);

    // Initialize Game
    resetGame();

})();
