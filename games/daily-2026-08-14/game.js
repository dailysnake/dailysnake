/**
 * DAILY SNAKE - 2026-08-14: STARRY NIGHT IMPRESSIONIST SERPENT
 * Core Engine & Web Audio Synthesizer
 */

(function () {
    'use strict';

    // Game Configuration
    const GRID_SIZE = 24; // 24x24 Grid
    const CANVAS_SIZE = 600;
    const CELL_SIZE = CANVAS_SIZE / GRID_SIZE; // 25px

    // Canvas Elements
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const canvasWrapper = document.getElementById('canvas-wrapper');

    // UI Elements
    const scoreVal = document.getElementById('score-val');
    const highScoreVal = document.getElementById('high-score-val');
    const comboVal = document.getElementById('combo-val');
    const energyBarFill = document.getElementById('energy-bar-fill');
    const vortexOverlay = document.getElementById('starry-vortex-overlay');

    // Overlay Screens
    const startScreen = document.getElementById('start-screen');
    const pauseScreen = document.getElementById('pause-screen');
    const gameoverScreen = document.getElementById('gameover-screen');

    // Final Stats
    const finalScore = document.getElementById('final-score');
    const finalHighScore = document.getElementById('final-high-score');
    const finalMaxCombo = document.getElementById('final-max-combo');
    const finalVortexBlasts = document.getElementById('final-vortex-blasts');

    // Buttons
    const startBtn = document.getElementById('start-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const restartBtn = document.getElementById('restart-btn');
    const shareBtn = document.getElementById('share-btn');
    const soundBtn = document.getElementById('sound-btn');
    const soundIcon = document.getElementById('sound-icon');
    const helpBtn = document.getElementById('help-btn');
    const closeHelpBtn = document.getElementById('close-help-btn');
    const helpModal = document.getElementById('help-modal');

    // Touch Buttons
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnVortex = document.getElementById('btn-vortex');

    // Web Audio Synthesizer Context
    let audioCtx = null;
    let soundEnabled = true;

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

    function playTone(freq, type, duration, startVol, endVol) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            gain.gain.setValueAtTime(startVol !== undefined ? startVol : 0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(endVol !== undefined ? endVol : 0.001, audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            // Ignore audio context errors
        }
    }

    function playArpeggio(notes, delay, type) {
        if (!soundEnabled || !audioCtx) return;
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                playTone(freq, type || 'sine', 0.2, 0.15, 0.001);
            }, idx * delay);
        });
    }

    function playEatSound() {
        playArpeggio([523.25, 659.25, 783.99, 1046.50], 40, 'sine'); // C5 E5 G5 C6
    }

    function playFlowerSound() {
        playArpeggio([440, 554.37, 659.25, 880, 1108.73], 45, 'triangle');
    }

    function playTubeSound(colorType) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const startFreq = colorType === 'blue' ? 300 : colorType === 'yellow' ? 450 : 600;
            const endFreq = startFreq * 2;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + 0.3);

            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } catch (e) {}
    }

    function playVortexSound() {
        if (!soundEnabled || !audioCtx) return;
        playArpeggio([261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50], 35, 'triangle');
    }

    function playCloudDestroySound() {
        playTone(150, 'sawtooth', 0.3, 0.3, 0.01);
        setTimeout(() => playTone(880, 'sine', 0.2, 0.2, 0.001), 50);
    }

    function playGameOverSound() {
        playArpeggio([440, 392, 349.23, 293.66, 220], 80, 'sawtooth');
    }

    function playClickSound() {
        playTone(600, 'sine', 0.05, 0.1, 0.001);
    }

    // Game States
    let isRunning = false;
    let isPaused = false;
    let score = 0;
    let highScore = parseInt(localStorage.getItem('starry_snake_high_score') || '0', 10);
    let combo = 1;
    let comboTimer = null;
    let energy = 0; // 0 to 100
    let vortexActive = false;
    let vortexTimeLeft = 0; // seconds
    let vortexBlastsCount = 0;
    let maxComboCount = 1;

    // Buffs
    let activeBuff = null; // 'blue' (magnet), 'yellow' (2x score & speed), 'green' (shrink tail)
    let buffTimeLeft = 0;

    // Snake Object
    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let moveInterval = 120; // ms per tick
    let lastMoveTime = 0;

    // Items & Hazards
    let starOrb = null;
    let sunflower = null;
    let colorTube = null;
    let stormClouds = [];
    let particles = [];
    let floatingTexts = [];

    // Background Brushstroke Stars
    let backgroundStars = [];
    function initBackgroundStars() {
        backgroundStars = [];
        for (let i = 0; i < 40; i++) {
            backgroundStars.push({
                x: Math.random() * CANVAS_SIZE,
                y: Math.random() * CANVAS_SIZE,
                radius: Math.random() * 3 + 1,
                alpha: Math.random() * 0.7 + 0.3,
                speed: Math.random() * 0.02 + 0.005,
                angle: Math.random() * Math.PI * 2
            });
        }
    }

    // Initialize Game
    function resetGame() {
        snake = [
            { x: 10, y: 12 },
            { x: 9, y: 12 },
            { x: 8, y: 12 },
            { x: 7, y: 12 }
        ];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };

        score = 0;
        combo = 1;
        maxComboCount = 1;
        energy = 0;
        vortexActive = false;
        vortexTimeLeft = 0;
        vortexBlastsCount = 0;
        activeBuff = null;
        buffTimeLeft = 0;
        moveInterval = 110;

        particles = [];
        floatingTexts = [];
        stormClouds = [];

        updateScoreUI();
        updateEnergyUI();
        spawnStarOrb();
        spawnSunflower();
        spawnStormClouds(2);
        initBackgroundStars();
    }

    function spawnStarOrb() {
        let valid = false;
        let pos = {};
        while (!valid) {
            pos = {
                x: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
                y: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1
            };
            valid = !isOccupiedBySnake(pos) && !isOccupiedByClouds(pos);
        }
        starOrb = { x: pos.x, y: pos.y, pulse: 0 };
    }

    function spawnSunflower() {
        if (Math.random() < 0.6) {
            let valid = false;
            let pos = {};
            while (!valid) {
                pos = {
                    x: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
                    y: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1
                };
                valid = !isOccupiedBySnake(pos) && !isOccupiedByClouds(pos);
            }
            sunflower = { x: pos.x, y: pos.y, rotation: 0 };
        } else {
            sunflower = null;
        }
    }

    function spawnColorTube() {
        if (colorTube) return;
        const types = ['blue', 'yellow', 'green'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        let pos = {
            x: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
            y: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1
        };
        colorTube = { x: pos.x, y: pos.y, type: chosenType, duration: 8 }; // lasts 8s on field
    }

    function spawnStormClouds(count) {
        for (let i = 0; i < count; i++) {
            let valid = false;
            let pos = {};
            while (!valid) {
                pos = {
                    x: Math.floor(Math.random() * (GRID_SIZE - 4)) + 2,
                    y: Math.floor(Math.random() * (GRID_SIZE - 4)) + 2
                };
                valid = !isOccupiedBySnake(pos) && (Math.abs(pos.x - snake[0].x) > 4 || Math.abs(pos.y - snake[0].y) > 4);
            }
            stormClouds.push({
                x: pos.x,
                y: pos.y,
                dx: Math.random() < 0.5 ? 1 : -1,
                dy: Math.random() < 0.5 ? 1 : -1,
                moveTimer: 0
            });
        }
    }

    function isOccupiedBySnake(pos) {
        return snake.some(seg => seg.x === pos.x && seg.y === pos.y);
    }

    function isOccupiedByClouds(pos) {
        return stormClouds.some(c => c.x === pos.x && c.y === pos.y);
    }

    // Score & UI Updates
    function updateScoreUI() {
        scoreVal.textContent = score;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('starry_snake_high_score', highScore.toString());
        }
        highScoreVal.textContent = highScore;
        comboVal.textContent = `x${combo}`;
    }

    function updateEnergyUI() {
        energyBarFill.style.width = `${energy}%`;
    }

    function triggerCombo() {
        combo++;
        if (combo > maxComboCount) maxComboCount = combo;
        updateScoreUI();

        if (comboTimer) clearTimeout(comboTimer);
        comboTimer = setTimeout(() => {
            combo = 1;
            updateScoreUI();
        }, 4500);
    }

    function addFloatingText(text, x, y, color) {
        floatingTexts.push({
            text: text,
            x: x * CELL_SIZE + CELL_SIZE / 2,
            y: y * CELL_SIZE,
            alpha: 1.0,
            color: color || '#ffc857'
        });
    }

    function createPaintParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            particles.push({
                x: x * CELL_SIZE + CELL_SIZE / 2,
                y: y * CELL_SIZE + CELL_SIZE / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 4 + 2,
                color: color,
                alpha: 1.0,
                life: 1.0
            });
        }
    }

    // Activate Skill
    function activateVortexMode() {
        if (energy < 30 || vortexActive) return;
        vortexActive = true;
        vortexTimeLeft = 6; // 6 seconds duration
        vortexBlastsCount++;
        energy = 0;
        updateEnergyUI();
        vortexOverlay.classList.add('active');
        playVortexSound();

        addFloatingText('✨ 星漩暴风！', snake[0].x, snake[0].y, '#38bdf8');
        createPaintParticles(snake[0].x, snake[0].y, '#ffc857', 30);
    }

    // Main Logic Tick
    function tick() {
        if (!isRunning || isPaused) return;

        // Apply Next Direction
        dir = { ...nextDir };

        // Calculate Head Position
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Wall Collision Check (No Vortex immunity for wall crash unless wrapped)
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            gameOver('冲撞了星云画布边界！');
            return;
        }

        // Self Collision Check (Vortex mode prevents self crash)
        if (!vortexActive && isOccupiedBySnake(head)) {
            gameOver('星脉灵蛇盘结自碰撞！');
            return;
        }

        // Storm Cloud Collision Check
        for (let i = stormClouds.length - 1; i >= 0; i--) {
            const c = stormClouds[i];
            if (c.x === head.x && c.y === head.y) {
                if (vortexActive) {
                    // Smash Cloud in Vortex mode
                    stormClouds.splice(i, 1);
                    score += 300 * combo;
                    createPaintParticles(c.x, c.y, '#38bdf8', 25);
                    addFloatingText('+300 卷碎乌云!', c.x, c.y, '#ffea00');
                    playCloudDestroySound();
                    updateScoreUI();
                    // Respawn a new cloud after 5s
                    setTimeout(() => spawnStormClouds(1), 5000);
                } else {
                    gameOver('陷入了夜幕乌云迷雾！');
                    return;
                }
            }
        }

        // Magnet Effect in Vortex or Cobalt Blue Buff
        const hasMagnet = vortexActive || activeBuff === 'blue';
        if (hasMagnet) {
            if (starOrb && Math.abs(starOrb.x - head.x) <= 4 && Math.abs(starOrb.y - head.y) <= 4) {
                if (starOrb.x < head.x) starOrb.x++;
                else if (starOrb.x > head.x) starOrb.x--;
                if (starOrb.y < head.y) starOrb.y++;
                else if (starOrb.y > head.y) starOrb.y--;
            }
            if (sunflower && Math.abs(sunflower.x - head.x) <= 4 && Math.abs(sunflower.y - head.y) <= 4) {
                if (sunflower.x < head.x) sunflower.x++;
                else if (sunflower.x > head.x) sunflower.x--;
                if (sunflower.y < head.y) sunflower.y++;
                else if (sunflower.y > head.y) sunflower.y--;
            }
        }

        // Move Snake
        snake.unshift(head);

        let ateFood = false;
        const multiplier = activeBuff === 'yellow' ? 2 : 1;

        // Check Eating Star Orb
        if (starOrb && head.x === starOrb.x && head.y === starOrb.y) {
            ateFood = true;
            const pts = 100 * combo * multiplier;
            score += pts;
            energy = Math.min(100, energy + 10);
            updateEnergyUI();
            triggerCombo();
            playEatSound();
            createPaintParticles(head.x, head.y, '#ffc857', 12);
            addFloatingText(`+${pts}`, head.x, head.y, '#ffee88');
            spawnStarOrb();

            // Random chance to spawn color tube
            if (!colorTube && Math.random() < 0.25) {
                spawnColorTube();
            }
        }

        // Check Eating Sunflower
        if (sunflower && head.x === sunflower.x && head.y === sunflower.y) {
            ateFood = true;
            const pts = 300 * combo * multiplier;
            score += pts;
            energy = Math.min(100, energy + 30);
            updateEnergyUI();
            triggerCombo();
            playFlowerSound();
            createPaintParticles(head.x, head.y, '#ff9900', 20);
            addFloatingText(`+${pts} 向日葵!`, head.x, head.y, '#ffaa00');
            sunflower = null;
            setTimeout(() => spawnSunflower(), 6000);
        }

        // Check Eating Color Tube
        if (colorTube && head.x === colorTube.x && head.y === colorTube.y) {
            activeBuff = colorTube.type;
            buffTimeLeft = 6; // 6s duration
            playTubeSound(colorTube.type);

            if (colorTube.type === 'blue') {
                addFloatingText('🎨 钴蓝磁吸领域!', head.x, head.y, '#38bdf8');
            } else if (colorTube.type === 'yellow') {
                addFloatingText('⚡ 铬黄 2X 得分!', head.x, head.y, '#ffc857');
            } else if (colorTube.type === 'green') {
                addFloatingText('🌿 翡翠剪裁尾部!', head.x, head.y, '#10b981');
                if (snake.length > 3) snake.pop();
                if (snake.length > 3) snake.pop();
            }

            createPaintParticles(head.x, head.y, colorTube.type === 'blue' ? '#1d4ed8' : colorTube.type === 'yellow' ? '#ffc857' : '#10b981', 15);
            colorTube = null;
        }

        if (!ateFood) {
            snake.pop();
        }

        // Move Storm Clouds slowly
        if (Math.random() < 0.3) {
            stormClouds.forEach(c => {
                if (Math.random() < 0.4) {
                    const nx = c.x + c.dx;
                    const ny = c.y + c.dy;
                    if (nx > 1 && nx < GRID_SIZE - 2) c.x = nx; else c.dx *= -1;
                    if (ny > 1 && ny < GRID_SIZE - 2) c.y = ny; else c.dy *= -1;
                }
            });
        }

        updateScoreUI();
    }

    // Render Loop
    function render(timestamp) {
        // Clear Canvas with canvas texture
        ctx.fillStyle = '#080f24';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw Swirling Canvas Background Flow Lines
        ctx.strokeStyle = 'rgba(30, 58, 138, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let y = 0; y < CANVAS_SIZE; y += 40) {
            ctx.moveTo(0, y + Math.sin(timestamp * 0.001 + y) * 10);
            for (let x = 0; x < CANVAS_SIZE; x += 40) {
                ctx.lineTo(x, y + Math.sin(timestamp * 0.0015 + x * 0.01) * 12);
            }
        }
        ctx.stroke();

        // Draw Background Stars
        backgroundStars.forEach(star => {
            star.angle += star.speed;
            const currentAlpha = star.alpha + Math.sin(star.angle) * 0.2;
            ctx.fillStyle = `rgba(255, 200, 87, ${Math.max(0.1, Math.min(1, currentAlpha))})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Storm Clouds
        stormClouds.forEach(c => {
            const cx = c.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = c.y * CELL_SIZE + CELL_SIZE / 2;
            const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, CELL_SIZE * 0.8);
            grad.addColorStop(0, 'rgba(147, 51, 234, 0.9)');
            grad.addColorStop(0.6, 'rgba(30, 27, 75, 0.8)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, CELL_SIZE * 0.8, 0, Math.PI * 2);
            ctx.fill();

            // Cloud core icon
            ctx.fillStyle = '#c084fc';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('☁️', cx, cy);
        });

        // Draw Star Orb (Food 1)
        if (starOrb) {
            const ox = starOrb.x * CELL_SIZE + CELL_SIZE / 2;
            const oy = starOrb.y * CELL_SIZE + CELL_SIZE / 2;
            const pulseRadius = CELL_SIZE * 0.45 + Math.sin(timestamp * 0.006) * 3;

            const orbGrad = ctx.createRadialGradient(ox, oy, 2, ox, oy, pulseRadius);
            orbGrad.addColorStop(0, '#ffffff');
            orbGrad.addColorStop(0.4, '#ffee88');
            orbGrad.addColorStop(1, 'rgba(255, 200, 87, 0.1)');

            ctx.fillStyle = orbGrad;
            ctx.beginPath();
            ctx.arc(ox, oy, pulseRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffc857';
            ctx.font = '16px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🌟', ox, oy);
        }

        // Draw Sunflower (Food 2)
        if (sunflower) {
            const fx = sunflower.x * CELL_SIZE + CELL_SIZE / 2;
            const fy = sunflower.y * CELL_SIZE + CELL_SIZE / 2;

            ctx.save();
            ctx.translate(fx, fy);
            ctx.rotate(timestamp * 0.002);
            ctx.fillStyle = '#ff9900';
            for (let i = 0; i < 8; i++) {
                ctx.rotate(Math.PI / 4);
                ctx.beginPath();
                ctx.ellipse(0, 10, 3, 7, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw Color Tube (Item)
        if (colorTube) {
            const tx = colorTube.x * CELL_SIZE + CELL_SIZE / 2;
            const ty = colorTube.y * CELL_SIZE + CELL_SIZE / 2;
            const tubeColor = colorTube.type === 'blue' ? '#38bdf8' : colorTube.type === 'yellow' ? '#ffc857' : '#10b981';

            ctx.fillStyle = tubeColor;
            ctx.beginPath();
            ctx.arc(tx, ty, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🎨', tx, ty);
        }

        // Draw Snake (Impasto Oil Paint Body)
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const sx = seg.x * CELL_SIZE + CELL_SIZE / 2;
            const sy = seg.y * CELL_SIZE + CELL_SIZE / 2;
            const isHead = i === 0;

            const ratio = i / snake.length;

            ctx.save();
            if (isHead) {
                // Glow aura for head
                const auraGrad = ctx.createRadialGradient(sx, sy, 4, sx, sy, CELL_SIZE * 0.9);
                if (vortexActive) {
                    auraGrad.addColorStop(0, '#ffffff');
                    auraGrad.addColorStop(0.5, '#38bdf8');
                    auraGrad.addColorStop(1, 'rgba(255, 200, 87, 0)');
                } else {
                    auraGrad.addColorStop(0, '#ffffee');
                    auraGrad.addColorStop(0.5, '#ffc857');
                    auraGrad.addColorStop(1, 'rgba(29, 78, 216, 0)');
                }
                ctx.fillStyle = auraGrad;
                ctx.beginPath();
                ctx.arc(sx, sy, CELL_SIZE * 0.9, 0, Math.PI * 2);
                ctx.fill();

                // Snake Head Body
                ctx.fillStyle = vortexActive ? '#38bdf8' : '#ffc857';
                ctx.beginPath();
                ctx.arc(sx, sy, CELL_SIZE * 0.48, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Snake Crown / Eyes
                ctx.fillStyle = '#050b1a';
                ctx.beginPath();
                ctx.arc(sx - 4, sy - 3, 2.5, 0, Math.PI * 2);
                ctx.arc(sx + 4, sy - 3, 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Gradient body segments (Impasto Dabs)
                const hue = 210 + ratio * 40; // Cobalt blue transition
                const sat = 85;
                const light = 60 - ratio * 20;

                ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
                const radius = (CELL_SIZE * 0.42) * (1 - ratio * 0.35);

                ctx.beginPath();
                ctx.arc(sx, sy, radius, 0, Math.PI * 2);
                ctx.fill();

                // Impasto highlights on body
                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.beginPath();
                ctx.arc(sx - radius * 0.3, sy - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Draw Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.025;
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // Draw Floating Texts
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y -= 1.2;
            ft.alpha -= 0.02;
            if (ft.alpha <= 0) {
                floatingTexts.splice(i, 1);
                continue;
            }
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = ft.alpha;
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.globalAlpha = 1.0;
        }

        // Vortex Galaxy Overlay Effect
        if (vortexActive) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 200, 87, 0.4)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, 180 + Math.sin(timestamp * 0.005) * 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        requestAnimationFrame(render);
    }

    // Timers Loop
    let lastSecondTimer = performance.now();
    function gameLoop(timestamp) {
        if (isRunning && !isPaused) {
            if (timestamp - lastMoveTime >= (vortexActive ? moveInterval * 0.7 : moveInterval)) {
                tick();
                lastMoveTime = timestamp;
            }

            // 1-Second Timer for Buffs & Vortex
            if (timestamp - lastSecondTimer >= 1000) {
                if (vortexActive) {
                    vortexTimeLeft--;
                    if (vortexTimeLeft <= 0) {
                        vortexActive = false;
                        vortexOverlay.classList.remove('active');
                    }
                }
                if (activeBuff) {
                    buffTimeLeft--;
                    if (buffTimeLeft <= 0) {
                        activeBuff = null;
                    }
                }
                lastSecondTimer = timestamp;
            }
        }
        requestAnimationFrame(gameLoop);
    }

    // Game Control Actions
    function startGame() {
        initAudio();
        resetGame();
        isRunning = true;
        isPaused = false;
        startScreen.classList.remove('active');
        pauseScreen.classList.remove('active');
        gameoverScreen.classList.remove('active');
    }

    function togglePause() {
        if (!isRunning) return;
        isPaused = !isPaused;
        if (isPaused) {
            pauseScreen.classList.add('active');
        } else {
            pauseScreen.classList.remove('active');
        }
    }

    function gameOver(reason) {
        isRunning = false;
        playGameOverSound();
        finalScore.textContent = score;
        finalHighScore.textContent = highScore;
        finalMaxCombo.textContent = `x${maxComboCount}`;
        finalVortexBlasts.textContent = vortexBlastsCount;
        gameoverScreen.classList.add('active');
    }

    // Key input listeners
    window.addEventListener('keydown', (e) => {
        if (!isRunning) return;
        initAudio();

        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            if (dir.y !== 1) nextDir = { x: 0, y: -1 };
            e.preventDefault();
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            if (dir.y !== -1) nextDir = { x: 0, y: 1 };
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            if (dir.x !== 1) nextDir = { x: -1, y: 0 };
            e.preventDefault();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            if (dir.x !== -1) nextDir = { x: 1, y: 0 };
            e.preventDefault();
        } else if (e.key === ' ') {
            activateVortexMode();
            e.preventDefault();
        } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            togglePause();
            e.preventDefault();
        }
    });

    // Touch D-Pad Controls
    btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); if (dir.y !== 1) nextDir = { x: 0, y: -1 }; });
    btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); if (dir.y !== -1) nextDir = { x: 0, y: 1 }; });
    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); if (dir.x !== 1) nextDir = { x: -1, y: 0 }; });
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); if (dir.x !== -1) nextDir = { x: 1, y: 0 }; });
    btnVortex.addEventListener('touchstart', (e) => { e.preventDefault(); activateVortexMode(); });

    btnUp.addEventListener('click', () => { if (dir.y !== 1) nextDir = { x: 0, y: -1 }; });
    btnDown.addEventListener('click', () => { if (dir.y !== -1) nextDir = { x: 0, y: 1 }; });
    btnLeft.addEventListener('click', () => { if (dir.x !== 1) nextDir = { x: -1, y: 0 }; });
    btnRight.addEventListener('click', () => { if (dir.x !== -1) nextDir = { x: 1, y: 0 }; });
    btnVortex.addEventListener('click', () => activateVortexMode());

    // Swipe Gestures on Canvas
    let touchStartX = 0;
    let touchStartY = 0;
    canvasWrapper.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    canvasWrapper.addEventListener('touchend', (e) => {
        if (!isRunning || isPaused) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const minSwipe = 25;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > minSwipe && dir.x !== -1) nextDir = { x: 1, y: 0 };
            else if (dx < -minSwipe && dir.x !== 1) nextDir = { x: -1, y: 0 };
        } else {
            if (dy > minSwipe && dir.y !== -1) nextDir = { x: 0, y: 1 };
            else if (dy < -minSwipe && dir.y !== 1) nextDir = { x: 0, y: -1 };
        }
    }, { passive: true });

    // UI Buttons
    startBtn.addEventListener('click', () => { playClickSound(); startGame(); });
    resumeBtn.addEventListener('click', () => { playClickSound(); togglePause(); });
    restartBtn.addEventListener('click', () => { playClickSound(); startGame(); });

    shareBtn.addEventListener('click', () => {
        playClickSound();
        const text = `🎨 我在《每日贪吃蛇 - 梵高星夜》中获得了 ${score} 分！高能触发了 ${vortexBlastsCount} 次星漩暴风！快来挑战吧：https://dailysnake.org/games/daily-2026-08-14/`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => alert('战报已复制到剪贴板！'));
        } else {
            alert(text);
        }
    });

    soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    });

    helpBtn.addEventListener('click', () => { helpModal.classList.add('active'); });
    closeHelpBtn.addEventListener('click', () => { helpModal.classList.remove('active'); });

    // Start background render animation
    requestAnimationFrame(render);
    requestAnimationFrame(gameLoop);
})();
