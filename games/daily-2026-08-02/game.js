/* ==========================================================================
   Bio-Cellular Metamorphosis (2026-08-02) - Main Game Logic
   Core Engine: Canvas 2D Fluid Renderer, Web Audio Synthesizer & Evolution System
   ========================================================================== */

(() => {
    // --- Canvas & Context Setup ---
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // Grid configuration
    const COLS = 40;
    const ROWS = 30;
    let CELL_SIZE = 20;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        CELL_SIZE = canvas.width / COLS;
    }
    window.addEventListener('resize', resizeCanvas);

    // --- Audio Synthesizer (Web Audio API) ---
    class SoundEngine {
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

        playTone(freq, type, duration, startVol = 0.3, endVol = 0.01) {
            if (!this.enabled || !this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(endVol, this.ctx.currentTime + duration);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {
                // Ignore audio context errors
            }
        }

        playEatMitochondria() {
            this.init();
            this.playTone(523.25, 'triangle', 0.1, 0.4); // C5
            setTimeout(() => this.playTone(659.25, 'sine', 0.12, 0.3), 50); // E5
        }

        playEatChloroplast() {
            this.init();
            this.playTone(440, 'sine', 0.15, 0.3); // A4
            setTimeout(() => this.playTone(587.33, 'sine', 0.18, 0.3), 60); // D5
        }

        playEatRibosome() {
            this.init();
            this.playTone(659.25, 'sine', 0.12, 0.3); // E5
            setTimeout(() => this.playTone(880, 'triangle', 0.15, 0.3), 60); // A5
        }

        playEatNucleus() {
            this.init();
            // Golden Chord
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                setTimeout(() => this.playTone(freq, 'sine', 0.25, 0.35), idx * 60);
            });
        }

        playDash() {
            this.init();
            this.playTone(220, 'sawtooth', 0.08, 0.15, 0.01);
        }

        playShieldBreak() {
            this.init();
            this.playTone(300, 'sawtooth', 0.2, 0.4, 0.01);
            setTimeout(() => this.playTone(150, 'square', 0.25, 0.3, 0.01), 80);
        }

        playEvolution() {
            this.init();
            const freqs = [392.00, 493.88, 587.33, 783.99, 987.77];
            freqs.forEach((freq, i) => {
                setTimeout(() => this.playTone(freq, 'triangle', 0.3, 0.4), i * 70);
            });
        }

        playGameOver() {
            this.init();
            this.playTone(200, 'sawtooth', 0.4, 0.4, 0.01);
            setTimeout(() => this.playTone(130, 'square', 0.5, 0.4, 0.01), 150);
        }
    }

    const sound = new SoundEngine();

    // --- Particle System ---
    class ParticleEngine {
        constructor() {
            this.particles = [];
        }

        spawnBurst(x, y, color, count = 12) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 4;
                this.particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: 2 + Math.random() * 4,
                    color,
                    alpha: 1,
                    decay: 0.02 + Math.random() * 0.03
                });
            }
        }

        updateAndDraw(ctx) {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= p.decay;

                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
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
    }

    const particles = new ParticleEngine();

    // --- Game State Variables ---
    let isRunning = false;
    let isPaused = false;
    let score = 0;
    let highScore = parseInt(localStorage.getItem('daily_snake_bio_highscore') || '0', 10);
    let eatenCount = 0;
    let stage = 1; // 1: Amoeba, 2: Hydra, 3: Cyber-Leviathan
    let atp = 100;
    let isDashing = false;
    let shield = 0; // 0 or 1
    let dnaSequence = []; // e.g. ['M', 'C', 'R']

    // Directions: 0: UP, 1: RIGHT, 2: DOWN, 3: LEFT
    let dir = 1;
    let nextDir = 1;
    let snake = [];
    let organelles = [];
    let freeRadicals = [];

    let gameLoopId = null;
    let lastTime = 0;
    let moveAccumulator = 0;

    // Organelle Definitions
    const ORGANELLE_TYPES = {
        MITOCHONDRIA: { id: 'M', name: '线粒体', color: '#ff3b5c', score: 15, atpBoost: 30, icon: '⚡' },
        CHLOROPLAST: { id: 'C', name: '叶绿体', color: '#00f59b', score: 10, shield: true, icon: '🛡️' },
        RIBOSOME: { id: 'R', name: '核糖体', color: '#00d2ff', score: 10, magnet: true, icon: '🔮' },
        NUCLEUS: { id: 'N', name: '细胞核', color: '#ffd15c', score: 30, evoBoost: true, icon: '🧬' }
    };

    // --- DOM Elements ---
    const scoreValEl = document.getElementById('score-val');
    const highScoreValEl = document.getElementById('high-score-val');
    const stageBadgeEl = document.getElementById('stage-badge');
    const atpPercentEl = document.getElementById('atp-percent');
    const atpBarFillEl = document.getElementById('atp-bar-fill');
    const dnaSlotsEl = document.getElementById('dna-slots');
    const shieldTextEl = document.getElementById('shield-text');
    const evoToastEl = document.getElementById('evo-toast');
    const evoToastTitleEl = document.getElementById('evo-toast-title');
    const evoToastDescEl = document.getElementById('evo-toast-desc');

    const startModal = document.getElementById('start-modal');
    const pauseModal = document.getElementById('pause-modal');
    const gameoverModal = document.getElementById('gameover-modal');

    const startBtn = document.getElementById('start-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const restartPauseBtn = document.getElementById('restart-pause-btn');
    const restartBtn = document.getElementById('restart-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const soundBtn = document.getElementById('sound-btn');
    const soundIconOn = document.getElementById('sound-icon-on');
    const soundIconOff = document.getElementById('sound-icon-off');

    const finalScoreEl = document.getElementById('final-score');
    const finalEatenEl = document.getElementById('final-eaten');
    const finalStageEl = document.getElementById('final-stage');
    const finalHighScoreEl = document.getElementById('final-high-score');

    // Mobile D-Pad Buttons
    const btnUp = document.getElementById('btn-up');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnDown = document.getElementById('btn-down');
    const btnDash = document.getElementById('btn-dash');

    // Update UI initial state
    highScoreValEl.textContent = highScore;

    // --- Game Initialization & Control Functions ---
    function initGame() {
        resizeCanvas();
        score = 0;
        eatenCount = 0;
        stage = 1;
        atp = 100;
        isDashing = false;
        shield = 0;
        dnaSequence = [];
        dir = 1;
        nextDir = 1;

        // Create Snake (initial length 5 cells)
        snake = [];
        const startX = Math.floor(COLS / 4);
        const startY = Math.floor(ROWS / 2);
        for (let i = 0; i < 5; i++) {
            snake.push({ x: startX - i, y: startY, type: 'head' });
        }

        organelles = [];
        freeRadicals = [];

        // Spawn initial organelles
        spawnOrganelle(ORGANELLE_TYPES.MITOCHONDRIA);
        spawnOrganelle(ORGANELLE_TYPES.CHLOROPLAST);
        spawnOrganelle(ORGANELLE_TYPES.RIBOSOME);

        // Spawn initial free radical
        spawnFreeRadical();

        updateHUD();
        hideModals();

        isRunning = true;
        isPaused = false;
        lastTime = performance.now();
        moveAccumulator = 0;

        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function spawnOrganelle(typeOverride = null) {
        let x, y, occupied;
        do {
            x = Math.floor(Math.random() * COLS);
            y = Math.floor(Math.random() * ROWS);
            occupied = snake.some(s => s.x === x && s.y === y) ||
                       organelles.some(o => o.x === x && o.y === y);
        } while (occupied);

        const keys = Object.keys(ORGANELLE_TYPES);
        const selectedKey = keys[Math.floor(Math.random() * keys.length)];
        const type = typeOverride || ORGANELLE_TYPES[selectedKey];

        organelles.push({
            x, y,
            type,
            pulse: Math.random() * Math.PI * 2
        });
    }

    function spawnFreeRadical() {
        if (freeRadicals.length >= 3) return;
        let x, y, occupied;
        do {
            x = Math.floor(Math.random() * COLS);
            y = Math.floor(Math.random() * ROWS);
            occupied = snake.some(s => s.x === x && s.y === y);
        } while (occupied);

        const angle = Math.random() * Math.PI * 2;
        freeRadicals.push({
            x, y,
            vx: Math.cos(angle) * 0.05,
            vy: Math.sin(angle) * 0.05,
            pulse: 0
        });
    }

    // --- Evolution & DNA Management ---
    function addDNA(typeId) {
        dnaSequence.push(typeId);
        if (dnaSequence.length > 5) {
            dnaSequence.shift();
        }

        // Check Evolution Codons
        checkEvolution();
        updateDNAUI();
    }

    function checkEvolution() {
        const countMap = {};
        dnaSequence.forEach(id => countMap[id] = (countMap[id] || 0) + 1);

        let newStage = stage;
        if (countMap['N'] >= 1 || (countMap['M'] >= 2 && countMap['R'] >= 2 && countMap['C'] >= 1)) {
            newStage = 3;
        } else if (dnaSequence.length >= 3 && stage === 1) {
            newStage = 2;
        }

        if (newStage > stage) {
            stage = newStage;
            sound.playEvolution();
            showEvolutionToast(stage);
            // Spawn Nucleus if stage upgraded to 2
            if (stage === 2) {
                spawnOrganelle(ORGANELLE_TYPES.NUCLEUS);
            }
        }
    }

    function showEvolutionToast(stg) {
        const titles = {
            2: '2阶 荧光水螅 (Fluorescent Hydra)',
            3: '3阶 赛博巨兽原核体 (Cyber-Leviathan)'
        };
        const descs = {
            2: '解锁 ATP 喷射冲刺 [Space] 与外膜引力场！',
            3: '解锁全膜穿透 Mode！支持穿透自身与视界边界！'
        };

        evoToastTitleEl.textContent = `基因跃迁：${titles[stg]}`;
        evoToastDescEl.textContent = descs[stg];
        evoToastEl.classList.add('active');

        setTimeout(() => {
            evoToastEl.classList.remove('active');
        }, 3500);
    }

    // --- Main Game Loop ---
    function gameLoop(timestamp) {
        if (!isRunning) return;

        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        if (!isPaused) {
            update(deltaTime);
            draw();
        }

        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function update(deltaTime) {
        // Handle ATP & Dashing
        if (isDashing && atp > 0) {
            atp = Math.max(0, atp - 0.4);
            if (atp === 0) isDashing = false;
        } else {
            atp = Math.min(100, atp + 0.1);
        }

        // Speed interval: Base 130ms, Dashing 60ms
        const baseSpeed = stage === 3 ? 100 : (stage === 2 ? 115 : 130);
        const speedInterval = isDashing ? baseSpeed * 0.5 : baseSpeed;

        moveAccumulator += deltaTime;

        if (moveAccumulator >= speedInterval) {
            moveAccumulator = 0;
            stepSnake();
        }

        // Update Free Radicals Position
        freeRadicals.forEach(fr => {
            fr.x += fr.vx;
            fr.y += fr.vy;
            fr.pulse += 0.05;

            // Bounce on boundary
            if (fr.x < 0 || fr.x >= COLS) fr.vx *= -1;
            if (fr.y < 0 || fr.y >= ROWS) fr.vy *= -1;
        });

        // Magnetism Effect for Stage >= 2
        if (stage >= 2 && snake.length > 0) {
            const head = snake[0];
            organelles.forEach(o => {
                const dist = Math.hypot(head.x - o.x, head.y - o.y);
                if (dist < 3.5 && dist > 0.1) {
                    o.x += (head.x - o.x) * 0.08;
                    o.y += (head.y - o.y) * 0.08;
                }
            });
        }

        updateHUD();
    }

    function stepSnake() {
        dir = nextDir;
        const head = { ...snake[0] };

        if (dir === 0) head.y -= 1; // UP
        else if (dir === 1) head.x += 1; // RIGHT
        else if (dir === 2) head.y += 1; // DOWN
        else if (dir === 3) head.x -= 1; // LEFT

        // Stage 3 or Dash Phasing Boundary Wrap
        if (stage === 3 || (isDashing && stage >= 2)) {
            if (head.x < 0) head.x = COLS - 1;
            if (head.x >= COLS) head.x = 0;
            if (head.y < 0) head.y = ROWS - 1;
            if (head.y >= ROWS) head.y = 0;
        } else {
            // Wall Collision Check
            if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
                if (shield > 0) {
                    shield--;
                    sound.playShieldBreak();
                    particles.spawnBurst(head.x * CELL_SIZE, head.y * CELL_SIZE, '#00f59b', 20);
                    // Push head back inside
                    head.x = Math.max(0, Math.min(COLS - 1, head.x));
                    head.y = Math.max(0, Math.min(ROWS - 1, head.y));
                } else {
                    gameOver();
                    return;
                }
            }
        }

        // Self Body Collision Check
        const bodyCollision = snake.some((seg, idx) => idx > 0 && seg.x === head.x && seg.y === head.y);
        if (bodyCollision) {
            if (stage === 3 || (isDashing && stage >= 2)) {
                // Phase through body
            } else if (shield > 0) {
                shield--;
                sound.playShieldBreak();
                particles.spawnBurst(head.x * CELL_SIZE, head.y * CELL_SIZE, '#00f59b', 20);
            } else {
                gameOver();
                return;
            }
        }

        snake.unshift(head);

        // Check Organelle Consumption
        let eatenIndex = -1;
        organelles.forEach((o, idx) => {
            if (Math.round(o.x) === head.x && Math.round(o.y) === head.y) {
                eatenIndex = idx;
            }
        });

        if (eatenIndex !== -1) {
            const consumed = organelles[eatenIndex];
            organelles.splice(eatenIndex, 1);

            score += consumed.type.score;
            eatenCount++;

            // Effects
            if (consumed.type.atpBoost) atp = Math.min(100, atp + consumed.type.atpBoost);
            if (consumed.type.shield && shield < 1) shield = 1;

            // Audio & Particles
            if (consumed.type.id === 'M') sound.playEatMitochondria();
            else if (consumed.type.id === 'C') sound.playEatChloroplast();
            else if (consumed.type.id === 'R') sound.playEatRibosome();
            else if (consumed.type.id === 'N') sound.playEatNucleus();

            particles.spawnBurst(head.x * CELL_SIZE + CELL_SIZE / 2, head.y * CELL_SIZE + CELL_SIZE / 2, consumed.type.color, 16);

            addDNA(consumed.type.id);
            spawnOrganelle();

            // Occasionally spawn additional free radical after eating 5 organelles
            if (eatenCount % 5 === 0) {
                spawnFreeRadical();
            }
        } else {
            snake.pop(); // Remove tail if not eating
        }

        // Free Radical Touch Check
        freeRadicals.forEach((fr, idx) => {
            const dist = Math.hypot(head.x - fr.x, head.y - fr.y);
            if (dist < 1.0) {
                if (shield > 0) {
                    shield--;
                    sound.playShieldBreak();
                    freeRadicals.splice(idx, 1);
                } else if (snake.length > 3) {
                    snake.splice(-2); // Trim tail
                    sound.playShieldBreak();
                    freeRadicals.splice(idx, 1);
                } else {
                    gameOver();
                }
            }
        });
    }

    // --- Rendering Logic ---
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Petri Dish Grid Lines
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CELL_SIZE, 0);
            ctx.lineTo(x * CELL_SIZE, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CELL_SIZE);
            ctx.lineTo(canvas.width, y * CELL_SIZE);
            ctx.stroke();
        }

        // Draw Free Radicals
        freeRadicals.forEach(fr => {
            const cx = fr.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = fr.y * CELL_SIZE + CELL_SIZE / 2;
            const r = CELL_SIZE * 0.6;

            ctx.save();
            ctx.fillStyle = '#a855f7';
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 12;

            ctx.beginPath();
            const spikes = 8;
            for (let i = 0; i < spikes * 2; i++) {
                const radius = (i % 2 === 0) ? r : r * 0.5;
                const angle = (i / spikes) * Math.PI + fr.pulse;
                const sx = cx + Math.cos(angle) * radius;
                const sy = cy + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });

        // Draw Organelles
        organelles.forEach(o => {
            const cx = o.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = o.y * CELL_SIZE + CELL_SIZE / 2;
            o.pulse += 0.05;
            const floatOffset = Math.sin(o.pulse) * 3;

            ctx.save();
            ctx.fillStyle = o.type.color;
            ctx.shadowColor = o.type.color;
            ctx.shadowBlur = 15;

            ctx.beginPath();
            ctx.arc(cx, cy + floatOffset, CELL_SIZE * 0.45, 0, Math.PI * 2);
            ctx.fill();

            // Inner Organelle Symbol
            ctx.fillStyle = '#04070f';
            ctx.font = `900 ${CELL_SIZE * 0.5}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(o.type.id, cx, cy + floatOffset);

            ctx.restore();
        });

        // Draw Snake (Bioluminescent Metaball Cell Body)
        if (snake.length > 0) {
            // Body segments
            for (let i = snake.length - 1; i >= 0; i--) {
                const seg = snake[i];
                const cx = seg.x * CELL_SIZE + CELL_SIZE / 2;
                const cy = seg.y * CELL_SIZE + CELL_SIZE / 2;
                const isHead = i === 0;

                const ratio = 1 - (i / snake.length) * 0.4;
                const radius = (CELL_SIZE * 0.45) * ratio;

                ctx.save();

                if (isHead) {
                    // Head nucleus
                    const mainColor = stage === 3 ? '#ffd15c' : (stage === 2 ? '#00f59b' : '#00d2ff');
                    ctx.fillStyle = mainColor;
                    ctx.shadowColor = mainColor;
                    ctx.shadowBlur = 20;

                    ctx.beginPath();
                    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner Nucleus Core
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
                    ctx.fill();

                    // Bio Shield Aura
                    if (shield > 0) {
                        ctx.strokeStyle = '#00f59b';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } else {
                    // Tail segments
                    const segColor = stage === 3 ? 'rgba(255, 209, 92, 0.85)' : 'rgba(0, 210, 255, 0.75)';
                    ctx.fillStyle = segColor;
                    ctx.shadowColor = segColor;
                    ctx.shadowBlur = 8;

                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }
        }

        // Draw Particle Engine
        particles.updateAndDraw(ctx);
    }

    // --- UI Update & Modal Helpers ---
    function updateHUD() {
        scoreValEl.textContent = score;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('daily_snake_bio_highscore', highScore.toString());
            highScoreValEl.textContent = highScore;
        }

        const stagesText = { 1: '1阶: 原生变形虫', 2: '2阶: 荧光水螅', 3: '3阶: 赛博巨兽' };
        stageBadgeEl.textContent = stagesText[stage];

        atpPercentEl.textContent = `${Math.round(atp)}%`;
        atpBarFillEl.style.width = `${atp}%`;

        shieldTextEl.textContent = `护盾: ${shield}/1`;
    }

    function updateDNAUI() {
        if (dnaSequence.length === 0) {
            dnaSlotsEl.innerHTML = '<span class="dna-empty">等待胞吞细胞器...</span>';
            return;
        }

        const colorClasses = { M: 'red', C: 'green', R: 'blue', N: 'gold' };
        dnaSlotsEl.innerHTML = dnaSequence.map(id => {
            return `<span class="dna-chip ${colorClasses[id]}">${id}</span>`;
        }).join('');
    }

    function hideModals() {
        startModal.style.display = 'none';
        pauseModal.style.display = 'none';
        gameoverModal.style.display = 'none';
    }

    function pauseGame() {
        if (!isRunning || isPaused) return;
        isPaused = true;
        pauseModal.style.display = 'flex';
    }

    function resumeGame() {
        if (!isRunning || !isPaused) return;
        isPaused = false;
        pauseModal.style.display = 'none';
        lastTime = performance.now();
    }

    function gameOver() {
        isRunning = false;
        sound.playGameOver();

        finalScoreEl.textContent = score;
        finalEatenEl.textContent = eatenCount;
        finalStageEl.textContent = `${stage}阶`;
        finalHighScoreEl.textContent = highScore;

        gameoverModal.style.display = 'flex';
    }

    // --- Keyboard & Touch Event Listeners ---
    window.addEventListener('keydown', (e) => {
        if (!isRunning && (e.key === ' ' || e.key === 'Enter')) {
            initGame();
            return;
        }

        if (e.key === 'p' || e.key === 'P') {
            if (isPaused) resumeGame();
            else pauseGame();
            return;
        }

        if (e.key === 'r' || e.key === 'R') {
            initGame();
            return;
        }

        if (isPaused) return;

        // Direction Keys
        if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && dir !== 2) {
            nextDir = 0;
        } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && dir !== 3) {
            nextDir = 1;
        } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && dir !== 0) {
            nextDir = 2;
        } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && dir !== 1) {
            nextDir = 3;
        }

        // Space Dash
        if (e.key === ' ') {
            e.preventDefault();
            if (atp > 10) {
                isDashing = true;
                sound.playDash();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === ' ') {
            isDashing = false;
        }
    });

    // Touch D-Pad Events
    btnUp.addEventListener('click', () => { if (dir !== 2) nextDir = 0; });
    btnRight.addEventListener('click', () => { if (dir !== 3) nextDir = 1; });
    btnDown.addEventListener('click', () => { if (dir !== 0) nextDir = 2; });
    btnLeft.addEventListener('click', () => { if (dir !== 1) nextDir = 3; });

    btnDash.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (atp > 10) {
            isDashing = true;
            sound.playDash();
        }
    });
    btnDash.addEventListener('touchend', () => { isDashing = false; });
    btnDash.addEventListener('mousedown', () => {
        if (atp > 10) {
            isDashing = true;
            sound.playDash();
        }
    });
    btnDash.addEventListener('mouseup', () => { isDashing = false; });

    // Buttons
    startBtn.addEventListener('click', initGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartPauseBtn.addEventListener('click', initGame);
    restartBtn.addEventListener('click', initGame);
    pauseBtn.addEventListener('click', () => {
        if (isPaused) resumeGame();
        else pauseGame();
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

    // Initialize Canvas Size on Load
    resizeCanvas();
})();
