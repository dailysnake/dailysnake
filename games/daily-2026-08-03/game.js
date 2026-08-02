/* -------------------------------------------------------------
   DAILY SNAKE - BLUEPRINT ARCHITECT: VECTOR MATRIX (2026-08-03)
   Engine: HTML5 Canvas + Web Audio API + Responsive Touch
   ------------------------------------------------------------- */

(function () {
    'use strict';

    // Game Configuration
    const GRID_COLS = 32;
    const GRID_ROWS = 22;
    const TICK_INTERVAL = 110; // Base tick speed (ms)

    // DOM Elements
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const overlayScreen = document.getElementById('overlay-screen');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const startBtn = document.getElementById('start-btn');
    const startBtnText = document.getElementById('start-btn-text');
    const scoreSummary = document.getElementById('score-summary');
    const finalScoreEl = document.getElementById('final-score');
    const highScoreEl = document.getElementById('high-score');
    const nodesEatenEl = document.getElementById('nodes-eaten');

    const scoreValEl = document.getElementById('score-val');
    const scaleValEl = document.getElementById('scale-val');
    const ratioValEl = document.getElementById('ratio-val');
    const energyFillEl = document.getElementById('energy-fill');
    const energyTextEl = document.getElementById('energy-text');

    const hudCoordsEl = document.getElementById('hud-coords');
    const hudStatusEl = document.getElementById('hud-status');

    const soundBtn = document.getElementById('sound-btn');
    const soundIconOn = document.getElementById('sound-icon-on');
    const soundIconOff = document.getElementById('sound-icon-off');
    const pauseBtn = document.getElementById('pause-btn');

    // Mobile D-Pad Buttons
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnSkill = document.getElementById('btn-skill');

    // Web Audio Synthesizer Class
    class SoundSynth {
        constructor() {
            this.ctx = null;
            this.enabled = true;
        }

        init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        playEat() {
            if (!this.enabled || !this.ctx) return;
            this.init();
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.08);
        }

        playGolden() {
            if (!this.enabled || !this.ctx) return;
            this.init();
            const now = this.ctx.currentTime;
            const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

            freqs.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const startTime = now + idx * 0.05;

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0.2, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 0.15);
            });
        }

        playCompass() {
            if (!this.enabled || !this.ctx) return;
            this.init();
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.2);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.25);
        }

        playAbility() {
            if (!this.enabled || !this.ctx) return;
            this.init();
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.4);
        }

        playDie() {
            if (!this.enabled || !this.ctx) return;
            this.init();
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);

            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.45);
        }
    }

    const sound = new SoundSynth();

    // Game State
    let isRunning = false;
    let isPaused = false;
    let score = 0;
    let highScore = localStorage.getItem('daily_snake_blueprint_highscore') || 0;
    let nodesEaten = 0;
    let energy = 0; // 0 to 100
    let isProjectionActive = false;
    let projectionTimeLeft = 0;

    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };

    let foods = []; // Array of food items
    let particles = []; // Particle explosion effects
    let compassRipples = []; // Compass circle ripples
    let lastTickTime = 0;

    // High Score Initialization
    highScoreEl.textContent = highScore;

    // Canvas Sizing
    let cellSize = 20;

    function resizeCanvas() {
        const wrapper = canvas.parentElement;
        const rect = wrapper.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const cellW = canvas.width / GRID_COLS;
        const cellH = canvas.height / GRID_ROWS;
        cellSize = Math.min(cellW, cellH);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Game Initialization & Reset
    function initGame() {
        score = 0;
        nodesEaten = 0;
        energy = 0;
        isProjectionActive = false;
        projectionTimeLeft = 0;

        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };

        const startX = Math.floor(GRID_COLS / 3);
        const startY = Math.floor(GRID_ROWS / 2);

        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
            { x: startX - 3, y: startY }
        ];

        foods = [];
        spawnFood('elevation');
        spawnFood('golden');

        particles = [];
        compassRipples = [];

        updateHUD();
    }

    // Spawn Food Item
    function spawnFood(type) {
        let x, y, occupied;
        do {
            x = Math.floor(Math.random() * GRID_COLS);
            y = Math.floor(Math.random() * GRID_ROWS);
            occupied = snake.some(seg => seg.x === x && seg.y === y) ||
                       foods.some(f => f.x === x && f.y === y);
        } while (occupied);

        foods.push({
            x,
            y,
            type, // 'elevation', 'golden', 'compass'
            pulse: 0
        });
    }

    // Trigger Projection Ability
    function activateProjection() {
        if (energy < 100 || isProjectionActive) return;
        isProjectionActive = true;
        projectionTimeLeft = 6000; // 6 seconds
        energy = 0;
        sound.playAbility();

        // Create initial burst particles
        const head = snake[0];
        for (let i = 0; i < 20; i++) {
            particles.push({
                x: (head.x + 0.5) * cellSize,
                y: (head.y + 0.5) * cellSize,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: '#00e5ff',
                life: 1.0
            });
        }
    }

    // Spawn Compass Wave Ripple Effect
    function triggerCompassRipple(gridX, gridY) {
        compassRipples.push({
            x: (gridX + 0.5) * cellSize,
            y: (gridY + 0.5) * cellSize,
            radius: 5,
            maxRadius: cellSize * 6,
            life: 1.0
        });
    }

    // Main Game Loop (requestAnimationFrame)
    function gameLoop(timestamp) {
        if (!isRunning) return;

        const delta = timestamp - (lastTickTime || timestamp);

        if (!isPaused) {
            // Update Projection Ability Timer
            if (isProjectionActive) {
                projectionTimeLeft -= delta;
                if (projectionTimeLeft <= 0) {
                    isProjectionActive = false;
                    projectionTimeLeft = 0;
                }
            }

            // Tick Movement Logic
            if (timestamp - lastTickTime >= TICK_INTERVAL) {
                tick();
                lastTickTime = timestamp;
            }

            // Update Visual Animations
            updateAnimations(delta);
        }

        render();
        requestAnimationFrame(gameLoop);
    }

    // Tick Movement Logic
    function tick() {
        dir = { ...nextDir };
        let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Wrap around walls in Projection Mode or normal check
        if (isProjectionActive) {
            head.x = (head.x + GRID_COLS) % GRID_COLS;
            head.y = (head.y + GRID_ROWS) % GRID_ROWS;
        } else {
            // Wall Collision Check
            if (head.x < 0 || head.x >= GRID_COLS || head.y < 0 || head.y >= GRID_ROWS) {
                gameOver();
                return;
            }
            // Self Collision Check
            if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
                gameOver();
                return;
            }
        }

        snake.unshift(head);

        // Magnetic pull in Projection Mode
        if (isProjectionActive) {
            foods.forEach(f => {
                const dist = Math.hypot(f.x - head.x, f.y - head.y);
                if (dist < 4) {
                    if (f.x < head.x) f.x += 1;
                    else if (f.x > head.x) f.x -= 1;
                    if (f.y < head.y) f.y += 1;
                    else if (f.y > head.y) f.y -= 1;
                }
            });
        }

        // Food Collision Check
        let ateFood = false;
        foods = foods.filter(f => {
            if (f.x === head.x && f.y === head.y) {
                ateFood = true;
                nodesEaten++;

                if (f.type === 'elevation') {
                    score += 10;
                    energy = Math.min(100, energy + 10);
                    sound.playEat();
                } else if (f.type === 'golden') {
                    score += 30;
                    energy = Math.min(100, energy + 25);
                    sound.playGolden();
                } else if (f.type === 'compass') {
                    score += 20;
                    energy = Math.min(100, energy + 15);
                    triggerCompassRipple(head.x, head.y);
                    sound.playCompass();
                }

                // Create Particle burst
                for (let i = 0; i < 10; i++) {
                    particles.push({
                        x: (head.x + 0.5) * cellSize,
                        y: (head.y + 0.5) * cellSize,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 4,
                        color: f.type === 'golden' ? '#ffd700' : '#00e5ff',
                        life: 1.0
                    });
                }
                return false; // remove eaten food
            }
            return true;
        });

        if (!ateFood) {
            snake.pop();
        } else {
            // Respawn eaten foods
            if (!foods.some(f => f.type === 'elevation')) {
                spawnFood('elevation');
            }
            if (Math.random() < 0.4 && !foods.some(f => f.type === 'golden')) {
                spawnFood('golden');
            }
            if (Math.random() < 0.3 && !foods.some(f => f.type === 'compass')) {
                spawnFood('compass');
            }
        }

        updateHUD();
    }

    // Update HUD display
    function updateHUD() {
        scoreValEl.textContent = score;

        // Scale ratio calculation
        if (score < 100) scaleValEl.textContent = '1:100';
        else if (score < 300) scaleValEl.textContent = '1:50';
        else if (score < 600) scaleValEl.textContent = '1:20';
        else scaleValEl.textContent = '1:1 (FULL)';

        // Energy Bar Update
        energyFillEl.style.width = energy + '%';
        if (isProjectionActive) {
            const secLeft = (projectionTimeLeft / 1000).toFixed(1);
            energyTextEl.textContent = `PROJECTION ACTIVE (${secLeft}s)`;
        } else if (energy >= 100) {
            energyTextEl.textContent = '100% [PRESS SPACE / CLICK SKILL]';
        } else {
            energyTextEl.textContent = `${energy}% [CHARGING]`;
        }

        // Coords Display
        if (snake.length > 0) {
            hudCoordsEl.textContent = `X: ${snake[0].x.toString().padStart(2, '0')} Y: ${snake[0].y.toString().padStart(2, '0')}`;
        }
        hudStatusEl.textContent = isProjectionActive ? 'PHANTOM PROJECTION' : 'NORMAL DRAFT';
    }

    // Update animation effects (particles, ripples)
    function updateAnimations(delta) {
        // Particles
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= delta / 500;
        });
        particles = particles.filter(p => p.life > 0);

        // Ripples
        compassRipples.forEach(r => {
            r.radius += (r.maxRadius - r.radius) * 0.1;
            r.life -= delta / 600;
        });
        compassRipples = compassRipples.filter(r => r.life > 0);

        // Food Pulses
        foods.forEach(f => {
            f.pulse = (f.pulse || 0) + 0.05;
        });
    }

    // Render Canvas
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const offsetX = (canvas.width - GRID_COLS * cellSize) / 2;
        const offsetY = (canvas.height - GRID_ROWS * cellSize) / 2;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        // 1. Draw Grid Canvas Frame
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let c = 0; c <= GRID_COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * cellSize, 0);
            ctx.lineTo(c * cellSize, GRID_ROWS * cellSize);
            ctx.stroke();
        }
        for (let r = 0; r <= GRID_ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * cellSize);
            ctx.lineTo(GRID_COLS * cellSize, r * cellSize);
            ctx.stroke();
        }

        // Border Glow
        ctx.strokeStyle = isProjectionActive ? '#00e5ff' : 'rgba(0, 229, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = isProjectionActive ? 15 : 5;
        ctx.strokeRect(0, 0, GRID_COLS * cellSize, GRID_ROWS * cellSize);
        ctx.shadowBlur = 0;

        // 2. Draw Compass Ripples
        compassRipples.forEach(r => {
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 229, 255, ${r.life})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // 3. Draw Foods
        foods.forEach(f => {
            const cx = (f.x + 0.5) * cellSize;
            const cy = (f.y + 0.5) * cellSize;
            const scale = 1 + Math.sin(f.pulse) * 0.1;

            if (f.type === 'elevation') {
                // Elevation Square Callout
                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(scale, scale);
                ctx.fillStyle = '#00e5ff';
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 10;
                ctx.fillRect(-cellSize * 0.3, -cellSize * 0.3, cellSize * 0.6, cellSize * 0.6);

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(-cellSize * 0.3, -cellSize * 0.3, cellSize * 0.6, cellSize * 0.6);
                ctx.restore();
            } else if (f.type === 'golden') {
                // Golden Ratio Phi Node
                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(scale, scale);
                ctx.fillStyle = '#ffd700';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(0, 0, cellSize * 0.35, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#061120';
                ctx.font = `bold ${cellSize * 0.4}px var(--font-mono)`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Φ', 0, 0);
                ctx.restore();
            } else if (f.type === 'compass') {
                // Compass Icon Node
                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(scale, scale);
                ctx.strokeStyle = '#ffaa00';
                ctx.shadowColor = '#ffaa00';
                ctx.shadowBlur = 10;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, cellSize * 0.35, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(-cellSize * 0.2, cellSize * 0.2);
                ctx.lineTo(0, -cellSize * 0.2);
                ctx.lineTo(cellSize * 0.2, cellSize * 0.2);
                ctx.stroke();
                ctx.restore();
            }
        });

        // 4. Draw Snake
        if (snake.length > 0) {
            // Draw Snake Body Rulers & Joints
            for (let i = snake.length - 1; i >= 0; i--) {
                const seg = snake[i];
                const x = seg.x * cellSize;
                const y = seg.y * cellSize;

                if (i === 0) {
                    // Snake Head - Precision Drafting Stylus & Compass Node
                    ctx.save();
                    ctx.fillStyle = isProjectionActive ? '#ffffff' : '#00e5ff';
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur = isProjectionActive ? 20 : 12;
                    ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

                    // Crosshair on head
                    ctx.strokeStyle = '#061120';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x + cellSize / 2, y + 4);
                    ctx.lineTo(x + cellSize / 2, y + cellSize - 4);
                    ctx.moveTo(x + 4, y + cellSize / 2);
                    ctx.lineTo(x + cellSize - 4, y + cellSize / 2);
                    ctx.stroke();
                    ctx.restore();
                } else {
                    // Body Segment - Architectural Ruler Joint
                    ctx.save();
                    ctx.fillStyle = isProjectionActive ? 'rgba(0, 229, 255, 0.4)' : 'rgba(10, 40, 80, 0.9)';
                    ctx.strokeStyle = '#00e5ff';
                    ctx.lineWidth = 1;
                    if (isProjectionActive) {
                        ctx.shadowColor = '#00e5ff';
                        ctx.shadowBlur = 10;
                    }
                    ctx.fillRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
                    ctx.strokeRect(x + 3, y + 3, cellSize - 6, cellSize - 6);

                    // Subtle ruler ticks on segment
                    ctx.fillStyle = '#00e5ff';
                    ctx.fillRect(x + 5, y + 5, 2, 2);
                    ctx.fillRect(x + cellSize - 7, y + cellSize - 7, 2, 2);
                    ctx.restore();
                }
            }
        }

        // 5. Draw Particles
        particles.forEach(p => {
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        ctx.restore();
    }

    // Game Over Handler
    function gameOver() {
        isRunning = false;
        sound.playDie();

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('daily_snake_blueprint_highscore', highScore);
        }

        modalTitle.textContent = '工程碰撞 · 构形中止';
        modalDesc.innerHTML = `矢量笔头撞击外部边框或构形图层。<br>按 <kbd>SPACE</kbd> 或点击下方按钮重新生成工程蓝图！`;

        scoreSummary.style.display = 'block';
        finalScoreEl.textContent = score;
        highScoreEl.textContent = highScore;
        nodesEatenEl.textContent = nodesEaten;

        startBtnText.textContent = '重新绘制工程';
        overlayScreen.classList.add('active');
    }

    // Control Event Listeners
    function setDirection(dx, dy) {
        // Prevent 180 degree reverse
        if (dir.x + dx === 0 && dir.y + dy === 0) return;
        nextDir = { x: dx, y: dy };
    }

    window.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            setDirection(0, -1);
            e.preventDefault();
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            setDirection(0, 1);
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            setDirection(-1, 0);
            e.preventDefault();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            setDirection(1, 0);
            e.preventDefault();
        } else if (e.key === ' ' || e.code === 'Space') {
            if (overlayScreen.classList.contains('active')) {
                startGame();
            } else {
                activateProjection();
            }
            e.preventDefault();
        } else if (e.key === 'p' || e.key === 'P') {
            togglePause();
            e.preventDefault();
        }
    });

    // Touch D-Pad Events
    if (btnUp) btnUp.addEventListener('click', () => setDirection(0, -1));
    if (btnDown) btnDown.addEventListener('click', () => setDirection(0, 1));
    if (btnLeft) btnLeft.addEventListener('click', () => setDirection(-1, 0));
    if (btnRight) btnRight.addEventListener('click', () => setDirection(1, 0));
    if (btnSkill) btnSkill.addEventListener('click', () => activateProjection());

    // Swipe Touch Control on Canvas
    let touchStartX = 0;
    let touchStartY = 0;
    canvas.addEventListener('touchstart', e => {
        if (e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
        if (e.changedTouches.length > 0) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 20) setDirection(1, 0);
                else if (dx < -20) setDirection(-1, 0);
            } else {
                if (dy > 20) setDirection(0, 1);
                else if (dy < -20) setDirection(0, -1);
            }
        }
    }, { passive: true });

    // Buttons & Controls
    startBtn.addEventListener('click', () => {
        sound.init();
        startGame();
    });

    soundBtn.addEventListener('click', () => {
        sound.enabled = !sound.enabled;
        if (sound.enabled) {
            soundIconOn.style.display = 'block';
            soundIconOff.style.display = 'none';
        } else {
            soundIconOn.style.display = 'none';
            soundIconOff.style.display = 'block';
        }
    });

    function togglePause() {
        if (!isRunning) return;
        isPaused = !isPaused;
        pauseBtn.style.opacity = isPaused ? '0.5' : '1';
    }

    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);

    // Start Game Function
    function startGame() {
        overlayScreen.classList.remove('active');
        initGame();
        isRunning = true;
        isPaused = false;
        lastTickTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

})();
