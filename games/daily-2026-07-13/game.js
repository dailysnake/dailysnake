/**
 * Magnetic Polarity Snake (磁极贪吃蛇)
 * Core Game Engine
 */

// --- Audio Synthesizer Class (Web Audio API) ---
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playEatNormal() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Electromagnetic pluck
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.14);
    }

    playSwitchPolarity() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Mechanical switch click + electrical buzz
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(80, now);
        osc1.frequency.exponentialRampToValueAtTime(300, now + 0.05);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(800, now);
        osc2.frequency.setValueAtTime(100, now + 0.02);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.08);
        osc2.start(now);
        osc2.stop(now + 0.08);
    }

    playMagnetHum() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // 120Hz electricity hum
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        
        // Lowpass filter to make it muted
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    playGameOver() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const bandpass = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        // Shock arc crash
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.6);

        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(500, now);
        bandpass.Q.setValueAtTime(3, now);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.7);
    }
}

// --- Particle Engine ---
class Particle {
    constructor(x, y, color, size, vx, vy, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.vx = vx;
        this.vy = vy;
        this.maxLife = life;
        this.life = life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.96;
        this.vy *= 0.96;
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    spawn(x, y, color, count = 8, speed = 4) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = (Math.random() * 0.7 + 0.3) * speed;
            const size = Math.random() * 3 + 1.5;
            const life = Math.floor(Math.random() * 15 + 15);
            this.particles.push(new Particle(
                x, y, color, size,
                Math.cos(angle) * velocity,
                Math.sin(angle) * velocity,
                life
            ));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }

    clear() {
        this.particles = [];
    }
}

// --- Main Game Class ---
class MagneticPolaritySnake {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.synth = new SoundSynth();
        this.particles = new ParticleSystem();

        // 24x24 grid
        this.gridSize = 24;
        this.cellSize = this.canvas.width / this.gridSize;

        // Electromagnetic Laser Walls (Fixed positions)
        // Row 7 is Red (N) laser, Row 16 is Blue (S) laser
        this.laserRedY = 7;
        this.laserBlueY = 16;

        // Game state variables
        this.snake = [];
        this.direction = 'right';
        this.nextDirection = 'right';
        
        // Snake head polarity: 'N' (positive/red) or 'S' (negative/blue)
        this.snakePolarity = 'N'; 
        
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('magnet_high_score')) || 0;
        
        this.statCores = 0;
        this.statSwitches = 0;

        // Food object
        this.food = null;
        
        // Flow Control
        this.isRunning = false;
        this.isGameOver = false;
        this.difficulty = 'normal';

        // Animated fields
        this.laserPhase = 0;
        this.lastUpdateTime = 0;
        
        // Attraction electric arcs
        this.attractionArc = null; // { from: {x,y}, to: {x,y}, color: '' }

        this.initUI();
        this.bindEvents();
        this.drawEmptyGrid();
    }

    initUI() {
        document.getElementById('high-score').textContent = this.formatNumber(this.highScore);
        
        // Audio Toggle
        const soundToggle = document.getElementById('sound-toggle');
        this.synth.enabled = soundToggle.checked;
        soundToggle.addEventListener('change', (e) => {
            this.synth.enabled = e.target.checked;
        });

        // Difficulty Selector
        const diffSelect = document.getElementById('difficulty-select');
        this.difficulty = diffSelect.value;
        diffSelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.canvas.focus();
        });
    }

    bindEvents() {
        // Keyboard Inputs
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;

            // Block default scroll action
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
                e.preventDefault();
            }

            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.direction !== 'down') this.nextDirection = 'up';
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.direction !== 'up') this.nextDirection = 'down';
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.direction !== 'right') this.nextDirection = 'left';
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.direction !== 'left') this.nextDirection = 'right';
                    break;

                // Shift key or Spacebar to switch polarity
                case 'Shift':
                case ' ':
                    this.switchPolarity();
                    break;
            }
        });

        // Click on Canvas overlay button
        document.getElementById('btn-start').addEventListener('click', () => {
            this.startGame();
        });
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.startGame();
        });

        // Polarity switches
        document.getElementById('btn-manual-switch').addEventListener('click', () => {
            this.switchPolarity();
        });

        // D-Pad Touch Controls
        document.getElementById('dpad-up').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.direction !== 'down') this.nextDirection = 'up'; });
        document.getElementById('dpad-down').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.direction !== 'up') this.nextDirection = 'down'; });
        document.getElementById('dpad-left').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.direction !== 'right') this.nextDirection = 'left'; });
        document.getElementById('dpad-right').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.direction !== 'left') this.nextDirection = 'right'; });
        
        document.getElementById('dpad-up').addEventListener('click', () => { if (this.direction !== 'down') this.nextDirection = 'up'; });
        document.getElementById('dpad-down').addEventListener('click', () => { if (this.direction !== 'up') this.nextDirection = 'down'; });
        document.getElementById('dpad-left').addEventListener('click', () => { if (this.direction !== 'right') this.nextDirection = 'left'; });
        document.getElementById('dpad-right').addEventListener('click', () => { if (this.direction !== 'left') this.nextDirection = 'right'; });

        // Mobile switch button
        document.getElementById('btn-mobile-switch').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.switchPolarity();
        });
        document.getElementById('btn-mobile-switch').addEventListener('click', () => {
            this.switchPolarity();
        });

        // Touch Swipe
        let touchStartX = 0;
        let touchStartY = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (!this.isRunning) return;
            const diffX = e.changedTouches[0].clientX - touchStartX;
            const diffY = e.changedTouches[0].clientY - touchStartY;
            const threshold = 30;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (Math.abs(diffX) > threshold) {
                    if (diffX > 0 && this.direction !== 'left') this.nextDirection = 'right';
                    else if (diffX < 0 && this.direction !== 'right') this.nextDirection = 'left';
                }
            } else {
                if (Math.abs(diffY) > threshold) {
                    if (diffY > 0 && this.direction !== 'up') this.nextDirection = 'down';
                    else if (diffY < 0 && this.direction !== 'down') this.nextDirection = 'up';
                }
            }
        }, { passive: true });
    }

    startGame() {
        this.synth.init();

        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');

        // Reset variables
        this.snake = [
            { x: 12, y: 12 },
            { x: 11, y: 12 },
            { x: 10, y: 12 }
        ];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.snakePolarity = 'N';

        this.score = 0;
        this.statCores = 0;
        this.statSwitches = 0;

        this.particles.clear();
        this.attractionArc = null;

        this.spawnFood();

        this.isGameOver = false;
        this.isRunning = true;

        this.updateUI();
        this.synth.playSwitchPolarity(); // start chime

        this.lastUpdateTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        // Laser phase animator
        this.laserPhase += 0.12;

        const currentInterval = this.getStepInterval();
        const elapsed = timestamp - this.lastUpdateTime;

        if (elapsed > currentInterval) {
            this.performGameStep();
            this.lastUpdateTime = timestamp;
        }

        // Render everything
        this.particles.update();
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    getStepInterval() {
        if (this.difficulty === 'easy') return 160;
        if (this.difficulty === 'hard') return 75;
        return 115; // normal
    }

    switchPolarity() {
        if (!this.isRunning) return;
        this.snakePolarity = this.snakePolarity === 'N' ? 'S' : 'N';
        this.statSwitches++;
        this.synth.playSwitchPolarity();

        // Spawn blast particles on head
        const head = this.snake[0];
        const hx = (head.x + 0.5) * this.cellSize;
        const hy = (head.y + 0.5) * this.cellSize;
        const color = this.snakePolarity === 'N' ? 'var(--color-n)' : 'var(--color-s)';
        this.particles.spawn(hx, hy, color, 12, 5);

        this.updateUI();
    }

    performGameStep() {
        this.direction = this.nextDirection;

        // Calculate next head position
        const head = this.snake[0];
        const nextHead = { x: head.x, y: head.y };

        switch (this.direction) {
            case 'up': nextHead.y--; break;
            case 'down': nextHead.y++; break;
            case 'left': nextHead.x--; break;
            case 'right': nextHead.x++; break;
        }

        // --- Collision Check (Walls & Body) ---
        let collided = false;

        // Wall collision
        if (nextHead.x < 0 || nextHead.x >= this.gridSize || nextHead.y < 0 || nextHead.y >= this.gridSize) {
            collided = true;
        }

        // Body self collision
        if (!collided) {
            for (let cell of this.snake) {
                if (cell.x === nextHead.x && cell.y === nextHead.y) {
                    collided = true;
                    break;
                }
            }
        }

        // --- Polarity Wall Collision Check ---
        // Laser Red Y: Row 7 (N) -> Only N (Red) snake can pass
        // Laser Blue Y: Row 16 (S) -> Only S (Blue) snake can pass
        if (!collided) {
            if (nextHead.y === this.laserRedY && this.snakePolarity !== 'N') {
                collided = true; // Electric shock!
            } else if (nextHead.y === this.laserBlueY && this.snakePolarity !== 'S') {
                collided = true; // Electric shock!
            }
        }

        if (collided) {
            this.triggerGameOver();
            return;
        }

        // Move head forward
        this.snake.unshift(nextHead);

        // --- Electromagnetic Attraction / Repulsion check ---
        let ateFood = false;

        const dist = Math.abs(nextHead.x - this.food.x) + Math.abs(nextHead.y - this.food.y);
        
        // Attraction check (Opposites Attract)
        const oppositesAttract = (this.snakePolarity !== this.food.polarity);

        if (oppositesAttract && dist <= 3) {
            // Food is drawn in magnetically!
            this.attractionArc = {
                from: { x: this.food.x, y: this.food.y },
                to: { x: nextHead.x, y: nextHead.y },
                color: this.snakePolarity === 'N' ? 'var(--color-n)' : 'var(--color-s)',
                timer: 3 // Draw arc for 3 frames
            };
            this.synth.playMagnetHum();
            
            // Mark food as consumed (sucked into head)
            ateFood = true;
            this.score += 20;
            this.statCores++;
            
            // Spawn sparks at food position
            const fx = (this.food.x + 0.5) * this.cellSize;
            const fy = (this.food.y + 0.5) * this.cellSize;
            this.particles.spawn(fx, fy, this.food.polarity === 'N' ? 'var(--color-n)' : 'var(--color-s)', 12, 4);
        } else if (!oppositesAttract && dist <= 2) {
            // Repulsion check (Like Repels Like)
            // Push food away in opposite direction of snake approach
            let pushX = 0;
            let pushY = 0;

            switch(this.direction) {
                case 'right': pushX = 1; break;
                case 'left': pushX = -1; break;
                case 'down': pushY = 1; break;
                case 'up': pushY = -1; break;
            }

            let newFoodX = this.food.x + pushX;
            let newFoodY = this.food.y + pushY;

            // Bounce back if pushed to the wall
            if (newFoodX < 0) newFoodX = 1;
            if (newFoodX >= this.gridSize) newFoodX = this.gridSize - 2;
            if (newFoodY < 0) newFoodY = 1;
            if (newFoodY >= this.gridSize) newFoodY = this.gridSize - 2;

            // Verify food doesn't land on laser barrier matching incorrect polarity
            if ((newFoodY === this.laserRedY && this.food.polarity !== 'N') || 
                (newFoodY === this.laserBlueY && this.food.polarity !== 'S')) {
                // Relocate to avoid getting stuck in laser
                newFoodY += 1;
            }

            this.food.x = newFoodX;
            this.food.y = newFoodY;

            // Spawn repelling dust
            const fx = (this.food.x + 0.5) * this.cellSize;
            const fy = (this.food.y + 0.5) * this.cellSize;
            this.particles.spawn(fx, fy, 'white', 5, 2);
            this.synth.playMagnetHum();
        }

        // Direct regular consumption
        if (!ateFood && nextHead.x === this.food.x && nextHead.y === this.food.y) {
            ateFood = true;
            this.score += 10;
            this.statCores++;
        }

        if (ateFood) {
            this.synth.playEatNormal();
            // Spawn splash particles on head
            const hx = (nextHead.x + 0.5) * this.cellSize;
            const hy = (nextHead.y + 0.5) * this.cellSize;
            const pColor = this.food.polarity === 'N' ? 'var(--color-n)' : 'var(--color-s)';
            this.particles.spawn(hx, hy, pColor, 15, 6);

            this.spawnFood();
        } else {
            this.snake.pop(); // Remove tail
        }

        // Sync high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('magnet_high_score', this.highScore);
        }

        this.updateUI();
    }

    spawnFood() {
        let valid = false;
        let x = 0;
        let y = 0;

        while(!valid) {
            x = Math.floor(Math.random() * this.gridSize);
            y = Math.floor(Math.random() * this.gridSize);

            // Avoid Laser lines
            if (y === this.laserRedY || y === this.laserBlueY) continue;

            // Avoid Snake body
            let hitBody = false;
            for (let cell of this.snake) {
                if (cell.x === x && cell.y === y) {
                    hitBody = true;
                    break;
                }
            }
            if (hitBody) continue;

            valid = true;
        }

        // Randomize food polarity ('N' / positive or 'S' / negative)
        const polarity = Math.random() > 0.5 ? 'N' : 'S';
        this.food = { x, y, polarity };
    }

    triggerGameOver() {
        this.isRunning = false;
        this.isGameOver = true;
        this.synth.playGameOver();

        // Head explosion
        if (this.snake.length > 0) {
            const head = this.snake[0];
            const hx = (head.x + 0.5) * this.cellSize;
            const hy = (head.y + 0.5) * this.cellSize;
            this.particles.spawn(hx, hy, 'orange', 35, 7);
        }

        document.getElementById('final-score').textContent = this.formatNumber(this.score);
        document.getElementById('stat-cores').textContent = this.statCores;
        document.getElementById('stat-switches').textContent = this.statSwitches;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    updateUI() {
        document.getElementById('current-score').textContent = this.formatNumber(this.score);
        document.getElementById('high-score').textContent = this.formatNumber(this.highScore);

        const badge = document.getElementById('polarity-header-badge');
        const vis = document.getElementById('polarity-vis');
        const letter = document.getElementById('polarity-letter');
        const desc = document.getElementById('polarity-desc');

        if (this.snakePolarity === 'N') {
            badge.textContent = '极性: N (正极)';
            badge.className = 'polarity-badge polarity-n';
            vis.className = 'polarity-visualizer n-active';
            letter.textContent = 'N';
            desc.textContent = '正电荷 (RED)';
        } else {
            badge.textContent = '极性: S (负极)';
            badge.className = 'polarity-badge polarity-s';
            vis.className = 'polarity-visualizer s-active';
            letter.textContent = 'S';
            desc.textContent = '负电荷 (BLUE)';
        }
    }

    formatNumber(num) {
        return String(num).padStart(4, '0');
    }

    drawEmptyGrid() {
        this.ctx.fillStyle = '#020308';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawLasers();
    }

    render() {
        // Clear board
        this.ctx.fillStyle = '#020308';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Grid lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.gridSize; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, this.canvas.height);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(this.canvas.width, i * this.cellSize);
            this.ctx.stroke();
        }

        // 2. Draw Lasers (Walls)
        this.drawLasers();

        // 3. Draw attraction lightning arcs
        if (this.attractionArc) {
            this.drawAttractionArc();
        }

        // 4. Draw Food
        if (this.isRunning && this.food) {
            this.drawFood();
        }

        // 5. Draw Snake
        if (this.isRunning && this.snake.length > 0) {
            this.drawSnake();
        }

        // 6. Draw particles
        this.particles.draw(this.ctx);
    }

    drawLasers() {
        this.ctx.save();

        const pulse = Math.sin(this.laserPhase) * 1.5;
        const cyRed = (this.laserRedY + 0.5) * this.cellSize;
        const cyBlue = (this.laserBlueY + 0.5) * this.cellSize;

        // Red Laser (Row 7)
        this.ctx.strokeStyle = 'var(--color-n)';
        this.ctx.lineWidth = 3 + pulse;
        this.ctx.shadowBlur = 15 + pulse * 2;
        this.ctx.shadowColor = 'var(--color-n)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, cyRed);
        this.ctx.lineTo(this.canvas.width, cyRed);
        this.ctx.stroke();

        // Draw laser transmitter emitters on the left/right walls
        this.ctx.fillStyle = '#ff6c00';
        this.ctx.shadowBlur = 0;
        this.ctx.fillRect(0, cyRed - 6, 4, 12);
        this.ctx.fillRect(this.canvas.width - 4, cyRed - 6, 4, 12);

        // Blue Laser (Row 16)
        this.ctx.strokeStyle = 'var(--color-s)';
        this.ctx.lineWidth = 3 + pulse;
        this.ctx.shadowBlur = 15 + pulse * 2;
        this.ctx.shadowColor = 'var(--color-s)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, cyBlue);
        this.ctx.lineTo(this.canvas.width, cyBlue);
        this.ctx.stroke();

        // Emitters
        this.ctx.fillStyle = '#0066ff';
        this.ctx.shadowBlur = 0;
        this.ctx.fillRect(0, cyBlue - 6, 4, 12);
        this.ctx.fillRect(this.canvas.width - 4, cyBlue - 6, 4, 12);

        this.ctx.restore();
    }

    drawFood() {
        const cx = (this.food.x + 0.5) * this.cellSize;
        const cy = (this.food.y + 0.5) * this.cellSize;
        const r = this.cellSize * 0.42;

        this.ctx.save();
        this.ctx.shadowBlur = 12;

        if (this.food.polarity === 'N') {
            // N Food (Red with N text)
            this.ctx.fillStyle = 'var(--color-n)';
            this.ctx.shadowColor = 'var(--color-n)';
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw letter 'N'
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 11px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('N', cx, cy + 0.5);
        } else {
            // S Food (Blue with S text)
            this.ctx.fillStyle = 'var(--color-s)';
            this.ctx.shadowColor = 'var(--color-s)';
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw letter 'S'
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 11px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('S', cx, cy + 0.5);
        }

        this.ctx.restore();
    }

    drawSnake() {
        this.ctx.save();
        const halfCell = this.cellSize / 2;

        for (let i = 0; i < this.snake.length; i++) {
            const current = this.snake[i];
            const cx = current.x * this.cellSize + halfCell;
            const cy = current.y * this.cellSize + halfCell;
            const r = this.cellSize * 0.43;

            let isHead = (i === 0);
            let color = '';
            let shadowColor = '';

            // Snake gradient color
            if (isHead) {
                // Head is always colored strictly by active polarity
                color = this.snakePolarity === 'N' ? 'var(--color-n)' : 'var(--color-s)';
                shadowColor = color;
            } else {
                // Body oscillates alternating red/blue stripes representing magnetic induction coils
                let bodySegmentPolarity = (Math.floor(i / 2) % 2 === 0);
                if (this.snakePolarity === 'S') bodySegmentPolarity = !bodySegmentPolarity; // reverse polarity flow
                
                color = bodySegmentPolarity ? 'rgba(255, 49, 49, 0.7)' : 'rgba(0, 210, 255, 0.7)';
                shadowColor = color;
            }

            this.ctx.fillStyle = color;
            this.ctx.shadowBlur = isHead ? 15 : 6;
            this.ctx.shadowColor = shadowColor;

            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r * (isHead ? 1.05 : 1 - (i / this.snake.length) * 0.35), 0, Math.PI * 2);
            this.ctx.fill();

            // Head details (magnetic coils rings or digital eyes)
            if (isHead) {
                this.ctx.shadowBlur = 5;
                this.ctx.fillStyle = '#fff';
                
                const eyeOffset = r * 0.4;
                const eyeRadius = r * 0.16;
                let eye1 = {x: 0, y: 0};
                let eye2 = {x: 0, y: 0};

                switch (this.direction) {
                    case 'right':
                        eye1 = { x: cx + eyeOffset, y: cy - eyeOffset };
                        eye2 = { x: cx + eyeOffset, y: cy + eyeOffset };
                        break;
                    case 'left':
                        eye1 = { x: cx - eyeOffset, y: cy - eyeOffset };
                        eye2 = { x: cx - eyeOffset, y: cy + eyeOffset };
                        break;
                    case 'up':
                        eye1 = { x: cx - eyeOffset, y: cy - eyeOffset };
                        eye2 = { x: cx + eyeOffset, y: cy - eyeOffset };
                        break;
                    case 'down':
                        eye1 = { x: cx - eyeOffset, y: cy + eyeOffset };
                        eye2 = { x: cx + eyeOffset, y: cy + eyeOffset };
                        break;
                }

                this.ctx.beginPath();
                this.ctx.arc(eye1.x, eye1.y, eyeRadius, 0, Math.PI * 2);
                this.ctx.arc(eye2.x, eye2.y, eyeRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Draw spine line connecting body
        this.ctx.lineWidth = this.cellSize * 0.45;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.shadowBlur = 0;
        this.ctx.beginPath();
        this.ctx.moveTo(this.snake[0].x * this.cellSize + halfCell, this.snake[0].y * this.cellSize + halfCell);
        for (let i = 1; i < this.snake.length; i++) {
            this.ctx.lineTo(this.snake[i].x * this.cellSize + halfCell, this.snake[i].y * this.cellSize + halfCell);
        }
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawAttractionArc() {
        this.ctx.save();
        
        const cellCenter = this.cellSize / 2;
        const x1 = this.attractionArc.from.x * this.cellSize + cellCenter;
        const y1 = this.attractionArc.from.y * this.cellSize + cellCenter;
        const x2 = this.attractionArc.to.x * this.cellSize + cellCenter;
        const y2 = this.attractionArc.to.y * this.cellSize + cellCenter;

        // Draw lightning electro-arc
        this.ctx.strokeStyle = this.attractionArc.color;
        this.ctx.lineWidth = 3;
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = this.attractionArc.color;

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);

        // Generate jagged electric sparks
        const midPoints = 4;
        for (let i = 1; i < midPoints; i++) {
            const ratio = i / midPoints;
            const mx = x1 + (x2 - x1) * ratio;
            const my = y1 + (y2 - y1) * ratio;

            // Offset perpendicularly
            const offset = (Math.random() - 0.5) * 22;
            const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;

            this.ctx.lineTo(
                mx + Math.cos(angle) * offset,
                my + Math.sin(angle) * offset
            );
        }

        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        this.ctx.restore();

        // Fade down duration
        this.attractionArc.timer--;
        if (this.attractionArc.timer <= 0) {
            this.attractionArc = null;
        }
    }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new MagneticPolaritySnake();
});
