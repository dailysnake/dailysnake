/**
 * Neon Snake Game - Core Engine Script
 * Handles game loop, Canvas rendering, particle physics, Web Audio synth, inputs, and states.
 */

// --- Audio Synthesizer Class ---
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            // Initialize AudioContext on user action to satisfy browser security policies
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playEatNormal() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.1);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    playEatGold() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Ascending Arpeggio: C5 -> E5 -> G5
        const notes = [523.25, 659.25, 783.99]; 
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = now + (idx * 0.07);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, noteStart);
            
            gain.gain.setValueAtTime(0.15, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.12);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(noteStart);
            osc.stop(noteStart + 0.12);
        });
    }

    playEatSpeed() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.25);

        // Lowpass filter to make it sound "cyber-ish"
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.25);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    playGameOver() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.6);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(147, now);
        osc2.frequency.linearRampToValueAtTime(38, now + 0.6);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.6);
        osc2.stop(now + 0.6);
    }

    playClick() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
    }
}

// --- Particle System ---
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        // Explode outward radially
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = Math.random() * 4 + 2;
        this.alpha = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        // Friction / Air resistance
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.alpha -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- Main Game Controller ---
const Game = {
    // Canvas & Context
    canvas: null,
    ctx: null,
    
    // Grid Configurations (25x25 grid on a 600x600 canvas)
    gridSize: 25,
    cellSize: 24, // 600 / 25
    
    // States: 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
    state: 'START',
    
    // Audio engine
    synth: new SoundSynth(),
    
    // Game speed & timings (ms per tick)
    tickInterval: 120, // default (normal speed)
    lastTickTime: 0,
    lastFrameTime: 0,
    
    // Difficulty Speeds
    speeds: {
        easy: 160,
        normal: 110,
        hard: 70
    },

    // Game entity data
    snake: [],
    direction: 'RIGHT',
    nextDirection: 'RIGHT',
    
    // Foods list
    foods: {
        normal: null, // {x, y}
        gold: null,   // {x, y, timeLeft, maxTime}
        speed: null   // {x, y, timeLeft, maxTime}
    },
    
    // Multipliers & Scores
    score: 0,
    highScore: 0,
    comboMultiplier: 1.0,
    speedBuffTimer: 0, // In game loop seconds / ticks
    
    // Visual systems
    particles: [],
    gridVisible: true,
    animationTime: 0, // running frame clock
    
    // Initialization
    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.loadHighScore();
        this.setupEventHandlers();
        
        // Trigger initial render
        this.resetGameData();
        requestAnimationFrame((t) => this.loop(t));
    },

    loadHighScore() {
        const saved = localStorage.getItem('neon_snake_high_score');
        this.highScore = saved ? parseInt(saved, 10) : 0;
        this.updateScoreUI();
    },

    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('neon_snake_high_score', this.highScore);
        }
    },

    resetGameData() {
        // Snake starting in the middle moving right
        const mid = Math.floor(this.gridSize / 2);
        this.snake = [
            { x: mid, y: mid },
            { x: mid - 1, y: mid },
            { x: mid - 2, y: mid }
        ];
        this.direction = 'RIGHT';
        this.nextDirection = 'RIGHT';
        
        this.score = 0;
        this.comboMultiplier = 1.0;
        this.speedBuffTimer = 0;
        
        // Reset foods
        this.foods.normal = null;
        this.foods.gold = null;
        this.foods.speed = null;
        
        this.particles = [];
        
        // Spawn first normal food
        this.spawnFood('normal');
        
        this.updateScoreUI();
    },

    spawnFood(type) {
        let attempts = 0;
        let pos = null;
        
        while (attempts < 200) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            
            // Check if coordinates overlap with snake body
            const onSnake = this.snake.some(segment => segment.x === x && segment.y === y);
            
            // Check overlap with other active foods
            let onFood = false;
            for (let fKey in this.foods) {
                if (this.foods[fKey] && this.foods[fKey].x === x && this.foods[fKey].y === y) {
                    onFood = true;
                }
            }
            
            if (!onSnake && !onFood) {
                pos = { x, y };
                break;
            }
            attempts++;
        }
        
        if (!pos) return; // Grid full or failed to spawn
        
        if (type === 'normal') {
            this.foods.normal = pos;
        } else if (type === 'gold') {
            this.foods.gold = {
                x: pos.x,
                y: pos.y,
                timeLeft: 5.0, // seconds active
                maxTime: 5.0
            };
        } else if (type === 'speed') {
            this.foods.speed = {
                x: pos.x,
                y: pos.y,
                timeLeft: 7.0, // seconds active
                maxTime: 7.0
            };
        }
    },

    // UI Updates
    updateScoreUI() {
        const curEl = document.getElementById('current-score');
        const hiEl = document.getElementById('high-score');
        const multEl = document.getElementById('combo-multiplier');
        
        curEl.textContent = String(this.score).padStart(4, '0');
        hiEl.textContent = String(this.highScore).padStart(4, '0');
        multEl.textContent = `x${this.comboMultiplier.toFixed(1)}`;
        
        if (this.speedBuffTimer > 0) {
            multEl.className = 'digital-value small neon-text-blue';
        } else {
            multEl.className = 'digital-value small neon-text-gold';
        }
    },

    // Keyboard & interaction setup
    setupEventHandlers() {
        // Document Keyboard listeners
        document.addEventListener('keydown', (e) => {
            this.synth.init(); // Initialize audio context on first action
            
            switch (e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    if (this.direction !== 'DOWN') this.nextDirection = 'UP';
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    if (this.direction !== 'UP') this.nextDirection = 'DOWN';
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    if (this.direction !== 'RIGHT') this.nextDirection = 'LEFT';
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    if (this.direction !== 'LEFT') this.nextDirection = 'RIGHT';
                    e.preventDefault();
                    break;
                case 'Space':
                    this.togglePause();
                    e.preventDefault();
                    break;
                case 'Escape':
                    this.triggerRestart();
                    e.preventDefault();
                    break;
            }
        });

        // Config Controls
        const diffSel = document.getElementById('difficulty-select');
        diffSel.addEventListener('change', (e) => {
            this.synth.init();
            this.synth.playClick();
            const mode = e.target.value;
            this.tickInterval = this.speeds[mode] || 110;
        });
        
        // Initial tick speed setup
        this.tickInterval = this.speeds[diffSel.value] || 110;

        const sndTog = document.getElementById('sound-toggle');
        sndTog.addEventListener('change', (e) => {
            this.synth.enabled = e.target.checked;
            this.synth.init();
            this.synth.playClick();
        });
        this.synth.enabled = sndTog.checked;

        const gridTog = document.getElementById('grid-toggle');
        gridTog.addEventListener('change', (e) => {
            this.synth.playClick();
            this.gridVisible = e.target.checked;
        });
        this.gridVisible = gridTog.checked;

        // Overlay Button actions
        document.getElementById('start-btn').addEventListener('click', () => {
            this.synth.init();
            this.synth.playClick();
            this.startGame();
        });
        
        document.getElementById('resume-btn').addEventListener('click', () => {
            this.synth.playClick();
            this.resumeGame();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.synth.playClick();
            this.triggerRestart();
        });

        // Mobile Controls
        const setupMobileButton = (id, dir) => {
            const btn = document.getElementById(id);
            btn.addEventListener('touchstart', (e) => {
                this.synth.init();
                this.synth.playClick();
                if (this.state === 'PLAYING') {
                    if (dir === 'UP' && this.direction !== 'DOWN') this.nextDirection = 'UP';
                    if (dir === 'DOWN' && this.direction !== 'UP') this.nextDirection = 'DOWN';
                    if (dir === 'LEFT' && this.direction !== 'RIGHT') this.nextDirection = 'LEFT';
                    if (dir === 'RIGHT' && this.direction !== 'LEFT') this.nextDirection = 'RIGHT';
                }
                e.preventDefault();
            }, { passive: false });
            
            // Mouse click support for debug on desktop
            btn.addEventListener('mousedown', () => {
                this.synth.init();
                this.synth.playClick();
                if (this.state === 'PLAYING') {
                    if (dir === 'UP' && this.direction !== 'DOWN') this.nextDirection = 'UP';
                    if (dir === 'DOWN' && this.direction !== 'UP') this.nextDirection = 'DOWN';
                    if (dir === 'LEFT' && this.direction !== 'RIGHT') this.nextDirection = 'LEFT';
                    if (dir === 'RIGHT' && this.direction !== 'LEFT') this.nextDirection = 'RIGHT';
                }
            });
        };

        setupMobileButton('ctrl-up', 'UP');
        setupMobileButton('ctrl-down', 'DOWN');
        setupMobileButton('ctrl-left', 'LEFT');
        setupMobileButton('ctrl-right', 'RIGHT');

        // Swipe Gestures support on Canvas
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.state !== 'PLAYING') return;
            const diffX = e.changedTouches[0].clientX - touchStartX;
            const diffY = e.changedTouches[0].clientY - touchStartY;
            
            // Minimum distance to trigger swipe (30px)
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (Math.abs(diffX) > 30) {
                    if (diffX > 0 && this.direction !== 'LEFT') this.nextDirection = 'RIGHT';
                    else if (diffX < 0 && this.direction !== 'RIGHT') this.nextDirection = 'LEFT';
                }
            } else {
                if (Math.abs(diffY) > 30) {
                    if (diffY > 0 && this.direction !== 'UP') this.nextDirection = 'DOWN';
                    else if (diffY < 0 && this.direction !== 'DOWN') this.nextDirection = 'UP';
                }
            }
        }, { passive: true });
    },

    // Game states switcher
    startGame() {
        this.state = 'PLAYING';
        this.resetGameData();
        this.hideAllOverlays();
    },

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pause-overlay').classList.add('active');
        } else if (this.state === 'PAUSED') {
            this.resumeGame();
        }
    },

    resumeGame() {
        this.state = 'PLAYING';
        this.hideAllOverlays();
    },

    triggerRestart() {
        this.resetGameData();
        this.state = 'PLAYING';
        this.hideAllOverlays();
    },

    gameOver() {
        this.state = 'GAMEOVER';
        this.synth.playGameOver();
        
        const finalScoreVal = document.getElementById('final-score');
        finalScoreVal.textContent = this.score;
        
        const recordMsg = document.getElementById('new-record-msg');
        if (this.score > this.highScore) {
            recordMsg.classList.remove('hidden');
        } else {
            recordMsg.classList.add('hidden');
        }
        
        this.saveHighScore();
        this.updateScoreUI();
        
        document.getElementById('gameover-overlay').classList.add('active');
    },

    hideAllOverlays() {
        document.getElementById('start-overlay').classList.remove('active');
        document.getElementById('pause-overlay').classList.remove('active');
        document.getElementById('gameover-overlay').classList.remove('active');
    },

    // --- Physics Tick ---
    tick() {
        if (this.state !== 'PLAYING') return;

        this.direction = this.nextDirection;
        
        // Calculate new head position
        const head = { ...this.snake[0] };
        
        switch (this.direction) {
            case 'UP':    head.y -= 1; break;
            case 'DOWN':  head.y += 1; break;
            case 'LEFT':  head.x -= 1; break;
            case 'RIGHT': head.x += 1; break;
        }

        // Boundary / Wall Collision
        if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
            this.gameOver();
            return;
        }

        // Self Collision
        const selfCollision = this.snake.some(segment => segment.x === head.x && segment.y === head.y);
        if (selfCollision) {
            this.gameOver();
            return;
        }

        // Insert new head
        this.snake.unshift(head);

        // Check Food Eaten
        let foodEaten = false;
        const headScreenX = head.x * this.cellSize + this.cellSize / 2;
        const headScreenY = head.y * this.cellSize + this.cellSize / 2;

        // 1. Regular Normal Food
        if (this.foods.normal && head.x === this.foods.normal.x && head.y === this.foods.normal.y) {
            this.score += Math.round(10 * this.comboMultiplier);
            this.foods.normal = null;
            foodEaten = true;
            this.synth.playEatNormal();
            this.spawnParticles(headScreenX, headScreenY, '#ff007f'); // Pink sparks
            
            // Random chance (15%) to spawn a golden crystal
            if (Math.random() < 0.15 && !this.foods.gold) {
                this.spawnFood('gold');
            }
            
            // Random chance (10%) to spawn a speed boost
            if (Math.random() < 0.10 && !this.foods.speed) {
                this.spawnFood('speed');
            }
            
            // Spawn next normal food
            this.spawnFood('normal');
        } 
        // 2. Golden Food
        else if (this.foods.gold && head.x === this.foods.gold.x && head.y === this.foods.gold.y) {
            this.score += Math.round(50 * this.comboMultiplier);
            this.foods.gold = null;
            foodEaten = true;
            this.synth.playEatGold();
            this.spawnParticles(headScreenX, headScreenY, '#ffb700'); // Gold sparks
            
            // Temporary boost to combo multiplier
            this.comboMultiplier += 0.5;
        } 
        // 3. Speed Boost Food
        else if (this.foods.speed && head.x === this.foods.speed.x && head.y === this.foods.speed.y) {
            this.score += Math.round(20 * this.comboMultiplier);
            this.foods.speed = null;
            foodEaten = true;
            this.synth.playEatSpeed();
            this.spawnParticles(headScreenX, headScreenY, '#00f0ff'); // Blue sparks
            
            // Apply Speed Buff: multiplier goes to double, speed ticks faster
            this.speedBuffTimer = 50; // ticks counter
            this.comboMultiplier = 2.0;
        }

        // If no food eaten, pop tail to keep size constant. Else, snake grows!
        if (!foodEaten) {
            this.snake.pop();
        }

        // Handle speed buff decrement
        if (this.speedBuffTimer > 0) {
            this.speedBuffTimer--;
            if (this.speedBuffTimer === 0) {
                this.comboMultiplier = 1.0;
            }
        }

        this.updateScoreUI();
    },

    spawnParticles(x, y, color) {
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    },

    // --- Game Time Loop (60 FPS) ---
    loop(timestamp) {
        this.animationTime += 0.016; // increment animation timer approx 60fps
        
        // 1. Process Timers (like food decay)
        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const dt = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;
        
        this.updateFoodTimers(dt);

        // 2. Game Tick Throttling (Snake Physics)
        let speedInterval = this.tickInterval;
        if (this.speedBuffTimer > 0) {
            speedInterval = Math.round(this.tickInterval * 0.65); // speed up 35% when buffed
        }
        
        if (timestamp - this.lastTickTime >= speedInterval) {
            this.tick();
            this.lastTickTime = timestamp;
        }

        // 3. Frame Update: Particle engine (runs smooth 60fps independent of snake speed)
        this.particles.forEach((p, idx) => {
            p.update();
            if (p.alpha <= 0) {
                this.particles.splice(idx, 1);
            }
        });

        // 4. Frame Draw: Render board
        this.draw();

        // Continue loop
        requestAnimationFrame((t) => this.loop(t));
    },

    updateFoodTimers(dt) {
        if (this.state !== 'PLAYING') return;

        // Golden food decay
        if (this.foods.gold) {
            this.foods.gold.timeLeft -= dt;
            if (this.foods.gold.timeLeft <= 0) {
                this.foods.gold = null; // disappears
            }
        }

        // Speed buff item decay
        if (this.foods.speed) {
            this.foods.speed.timeLeft -= dt;
            if (this.foods.speed.timeLeft <= 0) {
                this.foods.speed = null; // disappears
            }
        }
    },

    // --- Render Board Screen ---
    draw() {
        const c = this.canvas;
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, c.width, c.height);

        // Draw subgrid helper lines
        if (this.gridVisible) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= this.gridSize; i++) {
                // Vertical lines
                ctx.beginPath();
                ctx.moveTo(i * this.cellSize, 0);
                ctx.lineTo(i * this.cellSize, c.height);
                ctx.stroke();
                
                // Horizontal lines
                ctx.beginPath();
                ctx.moveTo(0, i * this.cellSize);
                ctx.lineTo(c.width, i * this.cellSize);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Draw Foods (with pulse & countdown glows)
        this.drawFood();

        // Draw Snake (Neon green tube with shadows)
        this.drawSnake();

        // Draw Particles
        this.particles.forEach(p => p.draw(ctx));
    },

    drawFood() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const pulseRatio = 1 + Math.sin(this.animationTime * 8) * 0.08; // scale oscillation

        // 1. Regular normal food (Neon pink/red sphere)
        if (this.foods.normal) {
            const fx = this.foods.normal.x * cs + cs / 2;
            const fy = this.foods.normal.y * cs + cs / 2;
            const r = (cs / 2.6) * pulseRatio;

            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff007f';
            
            // Radial Gradient
            const grad = ctx.createRadialGradient(fx - 2, fy - 2, 1, fx, fy, r);
            grad.addColorStop(0, '#ff66b2');
            grad.addColorStop(1, '#ff007f');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(fx, fy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 2. Golden food (Gold sphere with countdown arc)
        if (this.foods.gold) {
            const fx = this.foods.gold.x * cs + cs / 2;
            const fy = this.foods.gold.y * cs + cs / 2;
            const r = (cs / 2.4) * pulseRatio;
            const timePct = this.foods.gold.timeLeft / this.foods.gold.maxTime;

            ctx.save();
            // Outer countdown glow ring
            ctx.strokeStyle = '#ffb700';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ffb700';
            ctx.beginPath();
            ctx.arc(fx, fy, cs / 2 - 2, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * timePct));
            ctx.stroke();

            // Inner gold body
            const grad = ctx.createRadialGradient(fx - 2, fy - 2, 1, fx, fy, r);
            grad.addColorStop(0, '#ffe57f');
            grad.addColorStop(1, '#ffb700');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(fx, fy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 3. Speed Boost food (Cyan pill with rotating shine)
        if (this.foods.speed) {
            const fx = this.foods.speed.x * cs + cs / 2;
            const fy = this.foods.speed.y * cs + cs / 2;
            const r = (cs / 2.5) * pulseRatio;
            const timePct = this.foods.speed.timeLeft / this.foods.speed.maxTime;

            ctx.save();
            // Outer countdown line
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00f0ff';
            ctx.beginPath();
            ctx.arc(fx, fy, cs / 2 - 2, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * timePct));
            ctx.stroke();

            // Draw cyan neon gem
            const grad = ctx.createRadialGradient(fx - 2, fy - 2, 1, fx, fy, r);
            grad.addColorStop(0, '#b2f9ff');
            grad.addColorStop(1, '#00f0ff');
            ctx.fillStyle = grad;
            
            // Draw diamond shape instead of circle for variety
            ctx.beginPath();
            ctx.moveTo(fx, fy - r);
            ctx.lineTo(fx + r, fy);
            ctx.lineTo(fx, fy + r);
            ctx.lineTo(fx - r, fy);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    },

    drawSnake() {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const body = this.snake;

        if (body.length === 0) return;

        // Custom Neon Green settings
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Apply Speed Overdrive color shifts
        const isSpeedOverdrive = this.speedBuffTimer > 0;
        const glowColor = isSpeedOverdrive ? '#00f0ff' : '#39ff14';
        const bodyColor = isSpeedOverdrive ? 'rgba(0, 240, 255, 0.95)' : 'rgba(57, 255, 20, 0.95)';
        
        ctx.shadowBlur = 18;
        ctx.shadowColor = glowColor;

        // 1. Draw glowing connecting line along entire snake body (creates a tube feel)
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = cs * 0.72;
        ctx.beginPath();
        body.forEach((segment, idx) => {
            const sx = segment.x * cs + cs / 2;
            const sy = segment.y * cs + cs / 2;
            if (idx === 0) {
                ctx.moveTo(sx, sy);
            } else {
                ctx.lineTo(sx, sy);
            }
        });
        ctx.stroke();

        // 2. Draw inner neon core line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = cs * 0.22;
        ctx.beginPath();
        body.forEach((segment, idx) => {
            const sx = segment.x * cs + cs / 2;
            const sy = segment.y * cs + cs / 2;
            if (idx === 0) {
                ctx.moveTo(sx, sy);
            } else {
                ctx.lineTo(sx, sy);
            }
        });
        ctx.stroke();

        // 3. Draw head details (eyes pointing in the movement direction)
        const head = body[0];
        const hx = head.x * cs + cs / 2;
        const hy = head.y * cs + cs / 2;
        
        ctx.shadowBlur = 0; // Disable shadow for detailed drawing
        ctx.fillStyle = '#000000'; // Eye socket color

        // Determine offsets based on direction
        let eyeL = { x: 0, y: 0 };
        let eyeR = { x: 0, y: 0 };
        const eyeOffset = cs * 0.22; // distance from center
        const pupilOffset = cs * 0.08;

        switch (this.direction) {
            case 'RIGHT':
                eyeL = { x: hx + eyeOffset, y: hy - eyeOffset };
                eyeR = { x: hx + eyeOffset, y: hy + eyeOffset };
                break;
            case 'LEFT':
                eyeL = { x: hx - eyeOffset, y: hy + eyeOffset };
                eyeR = { x: hx - eyeOffset, y: hy - eyeOffset };
                break;
            case 'UP':
                eyeL = { x: hx - eyeOffset, y: hy - eyeOffset };
                eyeR = { x: hx + eyeOffset, y: hy - eyeOffset };
                break;
            case 'DOWN':
                eyeL = { x: hx + eyeOffset, y: hy + eyeOffset };
                eyeR = { x: hx - eyeOffset, y: hy + eyeOffset };
                break;
        }

        // Draw left & right eye white bases
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eyeL.x, eyeL.y, cs * 0.12, 0, Math.PI * 2);
        ctx.arc(eyeR.x, eyeR.y, cs * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // Draw left & right pupils (make them look forward)
        ctx.fillStyle = '#000000';
        let pupilDx = 0;
        let pupilDy = 0;
        
        switch (this.direction) {
            case 'RIGHT': pupilDx = pupilOffset; break;
            case 'LEFT':  pupilDx = -pupilOffset; break;
            case 'UP':    pupilDy = -pupilOffset; break;
            case 'DOWN':  pupilDy = pupilOffset; break;
        }

        ctx.beginPath();
        ctx.arc(eyeL.x + pupilDx, eyeL.y + pupilDy, cs * 0.06, 0, Math.PI * 2);
        ctx.arc(eyeR.x + pupilDx, eyeR.y + pupilDy, cs * 0.06, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
};

// Start the game initialization when document is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
