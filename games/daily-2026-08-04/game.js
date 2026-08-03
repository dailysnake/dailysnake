/**
 * 星穹熔炉：恒星重核合成 (Stellar Forge: Nucleosynthesis)
 * Daily Snake - 2026-08-04
 */

(function() {
    'use strict';

    // Game Constants
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    const GRID_SIZE = 20; // 40 x 30 grid cells
    const COLS = CANVAS_WIDTH / GRID_SIZE;
    const ROWS = CANVAS_HEIGHT / GRID_SIZE;

    // Element Definitions
    const ELEMENTS = {
        H:  { symbol: '¹H',  name: '氢', color: '#00e5ff', glow: 'rgba(0, 229, 255, 0.8)',  score: 10,  mass: 0.05, energy: 12, length: 1, rarity: 0.50 },
        He: { symbol: '⁴He', name: '氦', color: '#ffb300', glow: 'rgba(255, 179, 0, 0.8)',  score: 30,  mass: 0.20, energy: 20, length: 2, rarity: 0.25 },
        C:  { symbol: '¹²C', name: '碳', color: '#00e676', glow: 'rgba(0, 230, 118, 0.8)',  score: 80,  mass: 0.60, energy: 30, length: 3, rarity: 0.15 },
        O:  { symbol: '¹⁶O', name: '氧', color: '#d500f9', glow: 'rgba(213, 0, 249, 0.8)',  score: 200, mass: 1.00, energy: 40, length: 4, rarity: 0.07 },
        Fe: { symbol: '⁵⁶Fe',name: '铁', color: '#ffd700', glow: 'rgba(255, 215, 0, 0.95)', score: 500, mass: 2.50, energy: 60, length: 5, rarity: 0.03 }
    };

    const ATOMIC_SEQUENCE = ['H', 'He', 'C', 'O', 'Fe'];

    // DOM Elements
    const gameCanvas = document.getElementById('game-canvas');
    const ctx = gameCanvas.getContext('2d');
    const cosmosCanvas = document.getElementById('cosmos-bg-canvas');
    const cosmosCtx = cosmosCanvas.getContext('2d');

    const scoreVal = document.getElementById('score-val');
    const massVal = document.getElementById('mass-val');
    const tempVal = document.getElementById('temp-val');
    const comboVal = document.getElementById('combo-val');
    const highScoreVal = document.getElementById('high-score-val');
    const supernovaProgress = document.getElementById('supernova-progress');
    const supernovaStatusText = document.getElementById('supernova-status-text');

    const overlayScreen = document.getElementById('overlay-screen');
    const overlayTitle = document.getElementById('overlay-title');
    const overlaySub = document.getElementById('overlay-sub');
    const overlayStats = document.getElementById('overlay-stats');
    const finalScore = document.getElementById('final-score');
    const finalMass = document.getElementById('final-mass');
    const finalFusions = document.getElementById('final-fusions');
    const startBtn = document.getElementById('start-btn');

    const soundBtn = document.getElementById('sound-btn');
    const soundIconOn = document.getElementById('sound-icon-on');
    const soundIconOff = document.getElementById('sound-icon-off');
    const pauseBtn = document.getElementById('pause-btn');
    const pauseIcon = document.getElementById('pause-icon');
    const playIcon = document.getElementById('play-icon');

    // Mobile Dpad Buttons
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnCenter = document.getElementById('btn-center');
    const mobileSkillBtn = document.getElementById('mobile-skill-btn');

    // Web Audio Synthesizer Class
    class SoundSynth {
        constructor() {
            this.ctx = null;
            this.muted = false;
        }

        init() {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.ctx = new AudioContext();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        play(type) {
            if (this.muted || !this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.ctx.destination);

                if (type === 'eat_H') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(523.25, now); // C5
                    osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.08);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                    osc.start(now);
                    osc.stop(now + 0.08);
                } else if (type === 'eat_He') {
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(659.25, now); // E5
                    osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                    osc.start(now);
                    osc.stop(now + 0.12);
                } else if (type === 'eat_C') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(783.99, now); // G5
                    osc.frequency.exponentialRampToValueAtTime(1567.98, now + 0.15);
                    gain.gain.setValueAtTime(0.18, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    osc.start(now);
                    osc.stop(now + 0.15);
                } else if (type === 'eat_O') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1046.50, now); // C6
                    osc.frequency.linearRampToValueAtTime(2093.00, now + 0.2);
                    gain.gain.setValueAtTime(0.25, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                } else if (type === 'eat_Fe') {
                    // Power chord
                    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                        const subOsc = this.ctx.createOscillator();
                        const subGain = this.ctx.createGain();
                        subOsc.type = 'square';
                        subOsc.frequency.setValueAtTime(freq, now + idx * 0.04);
                        subGain.gain.setValueAtTime(0.15, now + idx * 0.04);
                        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                        subOsc.connect(subGain);
                        subGain.connect(this.ctx.destination);
                        subOsc.start(now + idx * 0.04);
                        subOsc.stop(now + 0.35);
                    });
                } else if (type === 'supernova') {
                    // Sub-bass drop sweep
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
                    gain.gain.setValueAtTime(0.4, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                    osc.start(now);
                    osc.stop(now + 0.6);
                } else if (type === 'blackhole') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(120, now);
                    osc.frequency.linearRampToValueAtTime(80, now + 0.2);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                } else if (type === 'gameover') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(300, now);
                    osc.frequency.linearRampToValueAtTime(50, now + 0.5);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                    osc.start(now);
                    osc.stop(now + 0.5);
                }
            } catch(e) {
                console.warn('Audio play error', e);
            }
        }
    }

    const sound = new SoundSynth();

    // Game State Variables
    let gameLoopId = null;
    let bgAnimId = null;
    let isPlaying = false;
    let isPaused = false;
    let score = 0;
    let mass = 1.0;
    let coreTemp = 15.7; // Millions of K
    let comboCount = 1;
    let lastElementEaten = null;
    let totalFusions = 0;
    let highScore = parseInt(localStorage.getItem('stellar_forge_highscore') || '0', 10);

    let supernovaEnergy = 0; // 0 to 100
    let isSupernovaActive = false;
    let supernovaTimer = 0;

    // Snake State
    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let moveInterval = 100; // ms per tick
    let lastMoveTime = 0;
    let growPending = 0;

    // Game Entities
    let activeElements = [];
    let blackHoles = [];
    let dustClouds = [];
    let particles = [];
    let floatingTexts = [];

    // Background Stars Particle System
    let bgStars = [];

    function initCosmosBg() {
        cosmosCanvas.width = window.innerWidth;
        cosmosCanvas.height = window.innerHeight;
        bgStars = [];
        for (let i = 0; i < 150; i++) {
            bgStars.push({
                x: Math.random() * cosmosCanvas.width,
                y: Math.random() * cosmosCanvas.height,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.8 + 0.2,
                speed: Math.random() * 0.2 + 0.05
            });
        }
    }

    function updateCosmosBg() {
        cosmosCtx.clearRect(0, 0, cosmosCanvas.width, cosmosCanvas.height);
        
        // Draw Nebula Ambient Blends
        const grad1 = cosmosCtx.createRadialGradient(
            cosmosCanvas.width * 0.3, cosmosCanvas.height * 0.3, 50,
            cosmosCanvas.width * 0.3, cosmosCanvas.height * 0.3, 400
        );
        grad1.addColorStop(0, 'rgba(0, 229, 255, 0.08)');
        grad1.addColorStop(1, 'transparent');
        cosmosCtx.fillStyle = grad1;
        cosmosCtx.fillRect(0, 0, cosmosCanvas.width, cosmosCanvas.height);

        const grad2 = cosmosCtx.createRadialGradient(
            cosmosCanvas.width * 0.7, cosmosCanvas.height * 0.7, 50,
            cosmosCanvas.width * 0.7, cosmosCanvas.height * 0.7, 450
        );
        grad2.addColorStop(0, 'rgba(213, 0, 249, 0.08)');
        grad2.addColorStop(1, 'transparent');
        cosmosCtx.fillStyle = grad2;
        cosmosCtx.fillRect(0, 0, cosmosCanvas.width, cosmosCanvas.height);

        // Draw Stars
        bgStars.forEach(star => {
            star.y += star.speed;
            if (star.y > cosmosCanvas.height) star.y = 0;

            cosmosCtx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            cosmosCtx.beginPath();
            cosmosCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            cosmosCtx.fill();
        });

        bgAnimId = requestAnimationFrame(updateCosmosBg);
    }

    // Initialize Game State
    function resetGame() {
        score = 0;
        mass = 1.0;
        coreTemp = 15.7;
        comboCount = 1;
        lastElementEaten = null;
        totalFusions = 0;
        supernovaEnergy = 0;
        isSupernovaActive = false;
        supernovaTimer = 0;
        moveInterval = 100;
        growPending = 0;

        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };

        // Initial Snake Position
        const startX = Math.floor(COLS / 2);
        const startY = Math.floor(ROWS / 2);
        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
            { x: startX - 3, y: startY }
        ];

        activeElements = [];
        blackHoles = [];
        dustClouds = [];
        particles = [];
        floatingTexts = [];

        // Spawn Initial Elements
        for (let i = 0; i < 5; i++) {
            spawnElement();
        }

        // Spawn Initial Black Hole & Dust Cloud
        spawnBlackHole();
        spawnDustCloud();

        updateHUD();
    }

    function spawnElement() {
        const rand = Math.random();
        let selectedKey = 'H';
        let cumulative = 0;

        for (const key of ATOMIC_SEQUENCE) {
            cumulative += ELEMENTS[key].rarity;
            if (rand <= cumulative) {
                selectedKey = key;
                break;
            }
        }

        let pos;
        let attempts = 0;
        while (attempts < 100) {
            pos = {
                x: Math.floor(Math.random() * (COLS - 2)) + 1,
                y: Math.floor(Math.random() * (ROWS - 2)) + 1
            };
            const inSnake = snake.some(seg => seg.x === pos.x && seg.y === pos.y);
            const inElem = activeElements.some(e => e.x === pos.x && e.y === pos.y);
            if (!inSnake && !inElem) break;
            attempts++;
        }

        activeElements.push({
            x: pos.x,
            y: pos.y,
            type: selectedKey,
            pulse: Math.random() * Math.PI * 2
        });
    }

    function spawnBlackHole() {
        if (blackHoles.length >= 2) return;
        let pos;
        let attempts = 0;
        while (attempts < 100) {
            pos = {
                x: Math.floor(Math.random() * (COLS - 6)) + 3,
                y: Math.floor(Math.random() * (ROWS - 6)) + 3
            };
            const inSnake = snake.some(seg => Math.hypot(seg.x - pos.x, seg.y - pos.y) < 3);
            if (!inSnake) break;
            attempts++;
        }

        blackHoles.push({
            x: pos.x,
            y: pos.y,
            radius: 1.5, // grid units radius
            rotation: 0
        });
    }

    function spawnDustCloud() {
        if (dustClouds.length >= 2) return;
        dustClouds.push({
            x: Math.floor(Math.random() * (COLS - 8)) + 4,
            y: Math.floor(Math.random() * (ROWS - 8)) + 4,
            radius: 3
        });
    }

    function updateHUD() {
        scoreVal.textContent = score.toLocaleString('en-US', { minimumIntegerDigits: 6, useGrouping: false });
        massVal.textContent = mass.toFixed(2);
        tempVal.textContent = coreTemp.toFixed(1) + 'M';
        comboVal.textContent = 'x' + comboCount;
        highScoreVal.textContent = highScore.toLocaleString('en-US', { minimumIntegerDigits: 6, useGrouping: false });

        supernovaProgress.style.width = supernovaEnergy + '%';
        if (isSupernovaActive) {
            supernovaStatusText.textContent = `💥 超新星坍缩中 (${Math.ceil(supernovaTimer / 1000)}s)`;
            supernovaProgress.classList.add('full');
        } else if (supernovaEnergy >= 100) {
            supernovaStatusText.textContent = '⚡ 准备就绪！按 [SPACE]';
            supernovaProgress.classList.add('full');
        } else {
            supernovaStatusText.textContent = `聚变储能 ${Math.floor(supernovaEnergy)}%`;
            supernovaProgress.classList.remove('full');
        }
    }

    // Trigger Supernova Skill
    function activateSupernova() {
        if (supernovaEnergy < 100 || isSupernovaActive) return;
        isSupernovaActive = true;
        supernovaTimer = 6000; // 6 seconds duration
        supernovaEnergy = 0;
        sound.play('supernova');

        createExplosionParticles(snake[0].x * GRID_SIZE + GRID_SIZE/2, snake[0].y * GRID_SIZE + GRID_SIZE/2, '#ffd700', 40);
        addFloatingText('💥 SUPERNOVA PULSAR 💥', snake[0].x * GRID_SIZE, snake[0].y * GRID_SIZE, '#ffd700');
        updateHUD();
    }

    // Main Game Step Logic
    function updateGame(currentTime) {
        if (!isPlaying || isPaused) return;

        if (currentTime - lastMoveTime >= moveInterval) {
            lastMoveTime = currentTime;

            // Apply direction update
            dir = { ...nextDir };

            const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

            // Supernova attraction & black hole resolution
            if (isSupernovaActive) {
                supernovaTimer -= moveInterval;
                if (supernovaTimer <= 0) {
                    isSupernovaActive = false;
                }

                // Supernova pulls all active elements towards snake head
                activeElements.forEach(elem => {
                    if (elem.x < head.x) elem.x++;
                    else if (elem.x > head.x) elem.x--;
                    if (elem.y < head.y) elem.y++;
                    else if (elem.y > head.y) elem.y--;
                });
            }

            // Wall Collisions
            if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
                if (!isSupernovaActive) {
                    gameOver('撞击深空边界，星核湮灭！');
                    return;
                } else {
                    // Screen Wrap during Supernova
                    head.x = (head.x + COLS) % COLS;
                    head.y = (head.y + ROWS) % ROWS;
                }
            }

            // Self Collision
            if (!isSupernovaActive) {
                for (let i = 1; i < snake.length; i++) {
                    if (snake[i].x === head.x && snake[i].y === head.y) {
                        gameOver('与自身等离子缠绕触碰崩解！');
                        return;
                    }
                }
            }

            // Black Hole Gravitational Pull Collision
            blackHoles.forEach((bh, idx) => {
                const dist = Math.hypot(head.x - bh.x, head.y - bh.y);
                if (dist < bh.radius) {
                    if (isSupernovaActive) {
                        // Collapse Black Hole into Points
                        score += 1000;
                        addFloatingText('+1000 黑洞吞噬', head.x * GRID_SIZE, head.y * GRID_SIZE, '#d500f9');
                        blackHoles.splice(idx, 1);
                        setTimeout(spawnBlackHole, 3000);
                    } else {
                        sound.play('blackhole');
                        gameOver('坠入黑洞奇点，引力拉扯崩解！');
                        return;
                    }
                }
            });

            if (!isPlaying) return;

            // Move Head
            snake.unshift(head);

            // Check Element Eating
            let ateIndex = activeElements.findIndex(e => e.x === head.x && e.y === head.y);
            if (ateIndex !== -1) {
                const elem = activeElements[ateIndex];
                const def = ELEMENTS[elem.type];

                // Play Audio
                sound.play('eat_' + elem.type);

                // Fusion Combo Logic
                const prevSeq = ATOMIC_SEQUENCE.indexOf(lastElementEaten);
                const currSeq = ATOMIC_SEQUENCE.indexOf(elem.type);

                if (currSeq >= prevSeq && prevSeq !== -1) {
                    comboCount = Math.min(comboCount + 1, 5);
                    totalFusions++;
                } else {
                    comboCount = 1;
                }
                lastElementEaten = elem.type;

                // Calculate Score & Mass
                const gainScore = def.score * comboCount;
                score += gainScore;
                mass += def.mass;
                coreTemp += 0.5 * comboCount;
                growPending += def.length;

                // Energy fill
                supernovaEnergy = Math.min(100, supernovaEnergy + def.energy);

                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem('stellar_forge_highscore', highScore);
                }

                // FX
                createExplosionParticles(head.x * GRID_SIZE + GRID_SIZE/2, head.y * GRID_SIZE + GRID_SIZE/2, def.color, 15);
                addFloatingText(`+${gainScore} ${def.name}聚变`, head.x * GRID_SIZE, head.y * GRID_SIZE, def.color);

                // Remove eaten element & spawn new
                activeElements.splice(ateIndex, 1);
                spawnElement();

                // Chance to spawn additional elements as snake grows
                if (activeElements.length < 6 && Math.random() < 0.4) {
                    spawnElement();
                }
            }

            // Tail handling
            if (growPending > 0) {
                growPending--;
            } else {
                snake.pop();
            }

            updateHUD();
        }

        // Particle updates
        updateParticles();

        // Render Canvas
        renderGame();

        gameLoopId = requestAnimationFrame(updateGame);
    }

    // Particle FX Engine
    function createExplosionParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                life: 1.0,
                decay: Math.random() * 0.04 + 0.02,
                size: Math.random() * 3 + 2
            });
        }
    }

    function addFloatingText(text, x, y, color) {
        floatingTexts.push({
            text, x, y, color,
            alpha: 1.0,
            vy: -1
        });
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) particles.splice(i, 1);
        }

        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.02;
            if (ft.alpha <= 0) floatingTexts.splice(i, 1);
        }
    }

    // Canvas Rendering
    function renderGame() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw Grid Lines (Cosmic Coordinate Grid)
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_HEIGHT);
            ctx.stroke();
        }
        for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_WIDTH, y);
            ctx.stroke();
        }

        // Draw Dust Clouds
        dustClouds.forEach(cloud => {
            const cx = cloud.x * GRID_SIZE;
            const cy = cloud.y * GRID_SIZE;
            const rad = cloud.radius * GRID_SIZE;
            const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rad);
            grad.addColorStop(0, 'rgba(156, 39, 176, 0.25)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Black Holes
        blackHoles.forEach(bh => {
            bh.rotation += 0.03;
            const cx = bh.x * GRID_SIZE + GRID_SIZE/2;
            const cy = bh.y * GRID_SIZE + GRID_SIZE/2;
            const rad = bh.radius * GRID_SIZE;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(bh.rotation);

            // Gravitational Lensing Rings
            ctx.strokeStyle = 'rgba(213, 0, 249, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, rad + 6, 0, Math.PI * 1.5);
            ctx.stroke();

            // Core Event Horizon
            const bhGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, rad);
            bhGrad.addColorStop(0, '#000000');
            bhGrad.addColorStop(0.7, '#120024');
            bhGrad.addColorStop(1, 'rgba(213, 0, 249, 0.9)');
            ctx.fillStyle = bhGrad;
            ctx.beginPath();
            ctx.arc(0, 0, rad, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });

        // Draw Elements
        const nowTime = Date.now() * 0.005;
        activeElements.forEach(elem => {
            const def = ELEMENTS[elem.type];
            const cx = elem.x * GRID_SIZE + GRID_SIZE / 2;
            const cy = elem.y * GRID_SIZE + GRID_SIZE / 2;
            const pulseSize = GRID_SIZE / 2 - 2 + Math.sin(nowTime + elem.pulse) * 2;

            ctx.save();
            ctx.shadowColor = def.color;
            ctx.shadowBlur = 12;

            ctx.fillStyle = def.color;
            ctx.beginPath();
            ctx.arc(cx, cy, pulseSize, 0, Math.PI * 2);
            ctx.fill();

            // Element Symbol
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 9px Orbitron';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(def.symbol, cx, cy);

            ctx.restore();
        });

        // Draw Snake Segments & Magnetic Flux Lines
        if (snake.length > 0) {
            ctx.save();

            // Magnetic Cable Connecting Lines
            ctx.beginPath();
            ctx.strokeStyle = isSupernovaActive ? 'rgba(255, 215, 0, 0.9)' : 'rgba(0, 229, 255, 0.6)';
            ctx.lineWidth = isSupernovaActive ? 6 : 4;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            snake.forEach((seg, i) => {
                const px = seg.x * GRID_SIZE + GRID_SIZE / 2;
                const py = seg.y * GRID_SIZE + GRID_SIZE / 2;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();

            // Draw Snake Segments
            snake.forEach((seg, i) => {
                const px = seg.x * GRID_SIZE + GRID_SIZE / 2;
                const py = seg.y * GRID_SIZE + GRID_SIZE / 2;
                const isHead = i === 0;
                const radius = isHead ? GRID_SIZE / 2 + 2 : Math.max(4, GRID_SIZE / 2 - (i * 0.2));

                ctx.shadowColor = isSupernovaActive ? '#ffd700' : (isHead ? '#00e5ff' : '#9c27b0');
                ctx.shadowBlur = isHead ? 20 : 10;

                ctx.fillStyle = isSupernovaActive ? '#ffffff' : (isHead ? '#00e5ff' : '#04060f');
                ctx.strokeStyle = isSupernovaActive ? '#ffd700' : '#00e5ff';
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.arc(px, py, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Eyes on Head
                if (isHead) {
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(px + dir.x * 4, py + dir.y * 4, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            ctx.restore();
        }

        // Draw Particles
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Draw Floating Texts
        floatingTexts.forEach(ft => {
            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 12px Rajdhani';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });
    }

    // Game Over Handler
    function gameOver(reason) {
        isPlaying = false;
        sound.play('gameover');
        if (gameLoopId) cancelAnimationFrame(gameLoopId);

        overlayTitle.textContent = '恒星核衰变 - 游玩结束';
        overlaySub.innerHTML = `<span style="color:#ff4081">${reason}</span><br>你在星穹熔炉中完成了一场璀璨的恒星演化奇迹！`;
        finalScore.textContent = score.toLocaleString();
        finalMass.textContent = mass.toFixed(2) + ' M☉';
        finalFusions.textContent = totalFusions + ' 次';

        overlayStats.classList.remove('hidden');
        startBtn.querySelector('span').textContent = '重新开启核聚变';
        overlayScreen.style.opacity = '1';
        overlayScreen.classList.remove('hidden');
    }

    // Input Listeners
    function setupControls() {
        window.addEventListener('keydown', e => {
            sound.init();
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                if (dir.y === 0) nextDir = { x: 0, y: -1 };
            } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                if (dir.y === 0) nextDir = { x: 0, y: 1 };
            } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                if (dir.x === 0) nextDir = { x: -1, y: 0 };
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                if (dir.x === 0) nextDir = { x: 1, y: 0 };
            } else if (e.key === ' ') {
                e.preventDefault();
                activateSupernova();
            } else if (e.key === 'p' || e.key === 'P') {
                togglePause();
            } else if (e.key === 'r' || e.key === 'R') {
                startGame();
            }
        });

        // Mobile Dpad Touch Controls
        btnUp.addEventListener('click', () => { if (dir.y === 0) nextDir = { x: 0, y: -1 }; });
        btnDown.addEventListener('click', () => { if (dir.y === 0) nextDir = { x: 0, y: 1 }; });
        btnLeft.addEventListener('click', () => { if (dir.x === 0) nextDir = { x: -1, y: 0 }; });
        btnRight.addEventListener('click', () => { if (dir.x === 0) nextDir = { x: 1, y: 0 }; });
        mobileSkillBtn.addEventListener('click', activateSupernova);

        // Touch Swipe Gestures on Canvas
        let touchStartX = 0;
        let touchStartY = 0;

        gameCanvas.addEventListener('touchstart', e => {
            sound.init();
            if (e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        gameCanvas.addEventListener('touchend', e => {
            if (e.changedTouches.length === 0) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);

            if (Math.max(absX, absY) > 20) { // threshold
                if (absX > absY) {
                    if (dx > 0 && dir.x === 0) nextDir = { x: 1, y: 0 };
                    else if (dx < 0 && dir.x === 0) nextDir = { x: -1, y: 0 };
                } else {
                    if (dy > 0 && dir.y === 0) nextDir = { x: 0, y: 1 };
                    else if (dy < 0 && dir.y === 0) nextDir = { x: 0, y: -1 };
                }
            }
        }, { passive: true });

        startBtn.addEventListener('click', () => {
            sound.init();
            startGame();
        });

        pauseBtn.addEventListener('click', () => {
            sound.init();
            togglePause();
        });

        soundBtn.addEventListener('click', () => {
            sound.muted = !sound.muted;
            soundIconOn.classList.toggle('hidden', sound.muted);
            soundIconOff.classList.toggle('hidden', !sound.muted);
        });
    }

    function togglePause() {
        if (!isPlaying) return;
        isPaused = !isPaused;
        pauseIcon.classList.toggle('hidden', isPaused);
        playIcon.classList.toggle('hidden', !isPaused);

        if (isPaused) {
            overlayTitle.textContent = '游戏暂停';
            overlaySub.textContent = '按 P 或点击右上角继续演化';
            overlayScreen.classList.remove('hidden');
        } else {
            overlayScreen.classList.add('hidden');
            lastMoveTime = performance.now();
        }
    }

    function startGame() {
        resetGame();
        isPlaying = true;
        isPaused = false;
        overlayScreen.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        playIcon.classList.add('hidden');
        lastMoveTime = performance.now();
        requestAnimationFrame(updateGame);
    }

    // Window Resize Handling
    window.addEventListener('resize', () => {
        initCosmosBg();
    });

    // Init
    initCosmosBg();
    updateCosmosBg();
    setupControls();
    updateHUD();

})();
