/**
 * Botanical Terrarium: Carnivorous Vine (秘境温室：蔓藤突袭与光合跃升)
 * Game Logic & Audio Synthesizer - 2026-08-06
 */

class WebAudioSynth {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playDewdropSound() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    playOrchidSound() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);

            gain.gain.setValueAtTime(0.2, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.25);
        });
    }

    playSnapSound() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        // Crunchy Noise Pop for Flytrap Snap
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.08);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);

        // Sine thud
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    playSunburstSound() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const freqs = [329.63, 440, 554.37, 659.25]; // E4, A4, C#5, E5
        freqs.forEach(f => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.6);
        });
    }

    playGameOverSound() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
    }
}

class BotanicalTerrariumGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audio = new WebAudioSynth();

        this.gridCount = 20; // 20x20 grid
        this.cellSize = 30; // 30px per cell = 600px

        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('daily_snake_2026_08_06_high_score') || '0', 10);
        this.energy = 0; // 0 to 100
        this.sunburstTimer = 0; // frenzy mode timer in frames
        
        this.snake = [];
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };

        this.foods = []; // Dewdrops, Orchids, Sunlight Orbs
        this.thorns = []; // Obstacles

        this.particles = [];
        this.sunbeam = {
            colStart: 2,
            widthCols: 4,
            speed: 0.015,
            dir: 1
        };

        this.snapAnim = null; // { startX, startY, endX, endY, progress }

        this.isPaused = false;
        this.isRunning = false;
        this.isGameOver = false;

        this.tickInterval = 130; // ms per tick
        this.lastTickTime = 0;
        this.animFrameId = null;

        this.initDOM();
        this.resizeCanvas();
        this.updateUI();
    }

    initDOM() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());

        document.getElementById('sound-btn').addEventListener('click', () => {
            this.audio.muted = !this.audio.muted;
            document.getElementById('sound-icon').textContent = this.audio.muted ? '🔇' : '🔊';
        });

        document.getElementById('help-btn').addEventListener('click', () => {
            document.getElementById('help-modal').classList.remove('hidden');
        });
        document.getElementById('close-help-btn').addEventListener('click', () => {
            document.getElementById('help-modal').classList.add('hidden');
        });

        // Mobile buttons
        document.getElementById('btn-up').addEventListener('click', () => this.setDirection(0, -1));
        document.getElementById('btn-down').addEventListener('click', () => this.setDirection(0, 1));
        document.getElementById('btn-left').addEventListener('click', () => this.setDirection(-1, 0));
        document.getElementById('btn-right').addEventListener('click', () => this.setDirection(1, 0));
        document.getElementById('mobile-snap-btn').addEventListener('click', () => this.triggerSnapSkill());

        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.setDirection(0, -1);
            else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.setDirection(0, 1);
            else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.setDirection(-1, 0);
            else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.setDirection(1, 0);
            else if (e.code === 'Space') {
                e.preventDefault();
                this.triggerSnapSkill();
            } else if (e.key === 'p' || e.key === 'P') {
                this.togglePause();
            }
        });

        // Touch Swipe Gestures on Canvas
        let touchStartX = 0;
        let touchStartY = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (e.changedTouches.length > 0) {
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                if (Math.abs(dx) > 25 || Math.abs(dy) > 25) {
                    if (Math.abs(dx) > Math.abs(dy)) {
                        this.setDirection(dx > 0 ? 1 : -1, 0);
                    } else {
                        this.setDirection(0, dy > 0 ? 1 : -1);
                    }
                }
            }
        }, { passive: true });

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.resetTransform();
        this.ctx.scale(this.canvas.width / 600, this.canvas.height / 600);
    }

    startGame() {
        this.audio.init();
        this.snake = [
            { x: 5, y: 10 },
            { x: 4, y: 10 },
            { x: 3, y: 10 },
            { x: 2, y: 10 },
            { x: 1, y: 10 }
        ];
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };
        this.score = 0;
        this.energy = 0;
        this.sunburstTimer = 0;
        this.particles = [];
        this.foods = [];
        this.thorns = [];
        this.snapAnim = null;

        this.isGameOver = false;
        this.isPaused = false;
        this.isRunning = true;

        document.getElementById('start-overlay').classList.add('hidden');
        document.getElementById('game-over-overlay').classList.add('hidden');
        document.getElementById('pause-overlay').classList.add('hidden');

        // Spawn initial items & thorns
        this.spawnFood('dewdrop');
        this.spawnFood('dewdrop');
        this.spawnFood('orchid');
        this.spawnThorn();
        this.spawnThorn();

        this.updateUI();

        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.lastTickTime = performance.now();
        this.loop(performance.now());
    }

    setDirection(x, y) {
        if (!this.isRunning || this.isPaused) return;
        // Prevent 180 degree instant turn
        if (x !== 0 && this.dir.x === -x) return;
        if (y !== 0 && this.dir.y === -y) return;
        this.nextDir = { x, y };
    }

    triggerSnapSkill() {
        if (!this.isRunning || this.isPaused) return;
        if (this.energy < 100 && this.sunburstTimer <= 0) return; // Needs full energy or active frenzy

        this.audio.playSnapSound();

        const head = this.snake[0];
        const dir = this.dir;

        // Perform 3-tile snap attack forward
        let snappedItemsCount = 0;
        for (let i = 1; i <= 3; i++) {
            const targetX = head.x + dir.x * i;
            const targetY = head.y + dir.y * i;

            // Check boundary
            if (targetX < 0 || targetX >= this.gridCount || targetY < 0 || targetY >= this.gridCount) break;

            // Check food at target
            const foodIndex = this.foods.findIndex(f => f.x === targetX && f.y === targetY);
            if (foodIndex !== -1) {
                const food = this.foods[foodIndex];
                this.eatFood(food, foodIndex);
                snappedItemsCount++;
            }

            // Check thorns at target
            const thornIndex = this.thorns.findIndex(t => t.x === targetX && t.y === targetY);
            if (thornIndex !== -1) {
                this.thorns.splice(thornIndex, 1);
                this.score += 15;
                this.addSparks(targetX * this.cellSize + 15, targetY * this.cellSize + 15, '#ffb703', 10);
            }
        }

        // Trigger animation
        this.snapAnim = {
            startX: head.x * this.cellSize + 15,
            startY: head.y * this.cellSize + 15,
            endX: (head.x + dir.x * 3) * this.cellSize + 15,
            endY: (head.y + dir.y * 3) * this.cellSize + 15,
            progress: 0
        };

        // Reset energy
        if (this.sunburstTimer <= 0) {
            this.energy = 0;
        }

        this.updateUI();
    }

    spawnFood(type) {
        let x, y, safe = false;
        while (!safe) {
            x = Math.floor(Math.random() * this.gridCount);
            y = Math.floor(Math.random() * this.gridCount);
            safe = !this.snake.some(s => s.x === x && s.y === y) &&
                   !this.foods.some(f => f.x === x && f.y === y) &&
                   !this.thorns.some(t => t.x === x && t.y === y);
        }
        this.foods.push({ x, y, type, spawnTime: Date.now() });
    }

    spawnThorn() {
        if (this.thorns.length >= 6) return;
        let x, y, safe = false;
        while (!safe) {
            x = Math.floor(Math.random() * this.gridCount);
            y = Math.floor(Math.random() * this.gridCount);
            // Keep away from initial snake area
            safe = !this.snake.some(s => s.x === x && s.y === y) &&
                   !this.foods.some(f => f.x === x && f.y === y) &&
                   !this.thorns.some(t => t.x === x && t.y === y) &&
                   (Math.abs(x - this.snake[0].x) + Math.abs(y - this.snake[0].y) > 3);
        }
        this.thorns.push({ x, y });
    }

    togglePause() {
        if (!this.isRunning || this.isGameOver) return;
        this.isPaused = !this.isPaused;
        const overlay = document.getElementById('pause-overlay');
        if (this.isPaused) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
            this.lastTickTime = performance.now();
        }
    }

    tick() {
        this.dir = this.nextDir;
        const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

        // Wall collision check
        if (head.x < 0 || head.x >= this.gridCount || head.y < 0 || head.y >= this.gridCount) {
            this.gameOver('藤蔓撞击了温室黄铜边框！');
            return;
        }

        // Self collision check
        if (this.snake.some((s, idx) => idx > 0 && s.x === head.x && s.y === head.y)) {
            this.gameOver('藤蔓缠绕损毁了自身枝茎！');
            return;
        }

        // Thorn obstacle check
        const thornIdx = this.thorns.findIndex(t => t.x === head.x && t.y === head.y);
        if (thornIdx !== -1) {
            if (this.sunburstTimer > 0) {
                // Invincible frenzy! Crush thorn!
                this.thorns.splice(thornIdx, 1);
                this.score += 20;
                this.audio.playSnapSound();
                this.addSparks(head.x * this.cellSize + 15, head.y * this.cellSize + 15, '#38b000', 12);
                this.spawnThorn();
            } else {
                this.gameOver('藤蔓触碰了剧毒刺藤野芒！');
                return;
            }
        }

        this.snake.unshift(head);

        // Sunlight Photo-synthesis check
        const headInSunlight = head.x >= Math.floor(this.sunbeam.colStart) && 
                               head.x < Math.floor(this.sunbeam.colStart + this.sunbeam.widthCols);
        
        const multiplier = headInSunlight ? 2 : 1;

        if (headInSunlight) {
            this.gainEnergy(1.5);
            this.addSparks(head.x * this.cellSize + 15, head.y * this.cellSize + 15, '#ffb703', 2);
        }

        // Food collision check
        const foodIdx = this.foods.findIndex(f => f.x === head.x && f.y === head.y);
        if (foodIdx !== -1) {
            const food = this.foods[foodIdx];
            this.eatFood(food, foodIdx, multiplier);
        } else {
            this.snake.pop(); // Remove tail
        }

        // Energy frenzy check
        if (this.energy >= 100 && this.sunburstTimer <= 0) {
            this.sunburstTimer = 40; // 40 ticks (~5 seconds)
            this.audio.playSunburstSound();
        }

        if (this.sunburstTimer > 0) {
            this.sunburstTimer--;
            if (this.sunburstTimer === 0) {
                this.energy = 0;
            }
        }

        this.updateUI();
    }

    eatFood(food, index, multiplier = 1) {
        this.foods.splice(index, 1);
        const pixelX = food.x * this.cellSize + 15;
        const pixelY = food.y * this.cellSize + 15;

        if (food.type === 'dewdrop') {
            this.score += 10 * multiplier;
            this.gainEnergy(10);
            this.audio.playDewdropSound();
            this.addSparks(pixelX, pixelY, '#2ec4b6', 8);
            this.spawnFood('dewdrop');
        } else if (food.type === 'orchid') {
            this.score += 30 * multiplier;
            this.gainEnergy(35);
            this.audio.playOrchidSound();
            this.addSparks(pixelX, pixelY, '#9d4edd', 12);
            this.spawnFood('orchid');
            if (Math.random() < 0.4) this.spawnFood('sunlight');
        } else if (food.type === 'sunlight') {
            this.score += 50 * multiplier;
            this.energy = 100;
            this.audio.playSunburstSound();
            this.addSparks(pixelX, pixelY, '#ffb703', 18);
        }

        // Random chance to spawn thorn
        if (Math.random() < 0.2) this.spawnThorn();
    }

    gainEnergy(amount) {
        if (this.sunburstTimer > 0) return;
        this.energy = Math.min(100, this.energy + amount);
    }

    gameOver(reason) {
        this.isGameOver = true;
        this.isRunning = false;
        this.audio.playGameOverSound();

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('daily_snake_2026_08_06_high_score', this.highScore.toString());
        }

        document.getElementById('final-score-val').textContent = this.score;
        document.getElementById('final-high-val').textContent = this.highScore;
        document.getElementById('death-reason').textContent = reason;
        document.getElementById('game-over-overlay').classList.remove('hidden');
    }

    updateUI() {
        document.getElementById('score-val').textContent = this.score;
        document.getElementById('high-score-val').textContent = this.highScore;
        document.getElementById('length-val').textContent = this.snake.length;

        const energyFill = document.getElementById('energy-bar-fill');
        const percentage = this.sunburstTimer > 0 ? (this.sunburstTimer / 40) * 100 : this.energy;
        energyFill.style.width = `${percentage}%`;

        const snapBtn = document.getElementById('mobile-snap-btn');
        if (this.energy >= 100 || this.sunburstTimer > 0) {
            snapBtn.style.opacity = '1';
            snapBtn.style.transform = 'scale(1.05)';
        } else {
            snapBtn.style.opacity = '0.5';
            snapBtn.style.transform = 'scale(1)';
        }
    }

    addSparks(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                radius: Math.random() * 3 + 1.5,
                life: 1.0,
                decay: Math.random() * 0.05 + 0.02
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update Sunbeam
        this.sunbeam.colStart += this.sunbeam.speed * this.sunbeam.dir;
        if (this.sunbeam.colStart <= 0 || this.sunbeam.colStart + this.sunbeam.widthCols >= this.gridCount) {
            this.sunbeam.dir *= -1;
        }

        // Update Snap Animation
        if (this.snapAnim) {
            this.snapAnim.progress += 0.15;
            if (this.snapAnim.progress >= 1) {
                this.snapAnim = null;
            }
        }
    }

    render() {
        this.ctx.clearRect(0, 0, 600, 600);

        // 1. Draw Greenhouse Terrarium Grid Background
        this.ctx.fillStyle = '#071812';
        this.ctx.fillRect(0, 0, 600, 600);

        // Grid lines
        this.ctx.strokeStyle = 'rgba(42, 157, 143, 0.08)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.gridCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, 600);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(600, i * this.cellSize);
            this.ctx.stroke();
        }

        // 2. Draw Moving Sunbeam Ray
        const sbX = this.sunbeam.colStart * this.cellSize;
        const sbW = this.sunbeam.widthCols * this.cellSize;
        const grad = this.ctx.createLinearGradient(sbX, 0, sbX + sbW, 0);
        grad.addColorStop(0, 'rgba(255, 183, 3, 0)');
        grad.addColorStop(0.5, 'rgba(255, 183, 3, 0.18)');
        grad.addColorStop(1, 'rgba(255, 183, 3, 0)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(sbX, 0, sbW, 600);

        // 3. Draw Thorns
        this.thorns.forEach(t => {
            const cx = t.x * this.cellSize + 15;
            const cy = t.y * this.cellSize + 15;
            this.ctx.save();
            this.ctx.fillStyle = '#6b705c';
            this.ctx.strokeStyle = '#cb997e';
            this.ctx.lineWidth = 2;
            
            // Draw Thorn Star Cluster
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const rx = cx + Math.cos(angle) * 12;
                const ry = cy + Math.sin(angle) * 12;
                this.ctx.lineTo(rx, ry);
                this.ctx.lineTo(cx, cy);
            }
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.restore();
        });

        // 4. Draw Foods
        this.foods.forEach(f => {
            const cx = f.x * this.cellSize + 15;
            const cy = f.y * this.cellSize + 15;

            this.ctx.save();
            if (f.type === 'dewdrop') {
                // Cyan Dewdrop
                this.ctx.fillStyle = '#2ec4b6';
                this.ctx.shadowColor = '#2ec4b6';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, 9, 0, Math.PI * 2);
                this.ctx.fill();

                // Highlight
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (f.type === 'orchid') {
                // Purple Nectar Orchid
                this.ctx.fillStyle = '#9d4edd';
                this.ctx.shadowColor = '#9d4edd';
                this.ctx.shadowBlur = 14;

                for (let i = 0; i < 5; i++) {
                    const angle = (i * Math.PI * 2) / 5;
                    const px = cx + Math.cos(angle) * 8;
                    const py = cy + Math.sin(angle) * 8;
                    this.ctx.beginPath();
                    this.ctx.arc(px, py, 6, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                this.ctx.fillStyle = '#ffb703';
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, 4, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (f.type === 'sunlight') {
                // Glowing Golden Sunlight Orb
                const pulse = Math.sin(Date.now() * 0.008) * 3;
                this.ctx.fillStyle = '#ffb703';
                this.ctx.shadowColor = '#ffb703';
                this.ctx.shadowBlur = 20;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, 10 + pulse, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
        });

        // 5. Draw Carnivorous Vine Snake
        if (this.snake.length > 0) {
            const isFrenzy = this.sunburstTimer > 0;

            // Draw Body
            for (let i = this.snake.length - 1; i >= 1; i--) {
                const seg = this.snake[i];
                const cx = seg.x * this.cellSize + 15;
                const cy = seg.y * this.cellSize + 15;
                const ratio = 1 - i / this.snake.length;
                const radius = 6 + ratio * 6;

                this.ctx.save();
                this.ctx.fillStyle = isFrenzy ? '#ffb703' : '#2a9d8f';
                this.ctx.shadowColor = isFrenzy ? '#ffb703' : '#38b000';
                this.ctx.shadowBlur = isFrenzy ? 15 : 6;

                this.ctx.beginPath();
                this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                this.ctx.fill();

                // Leaf accents along body
                if (i % 2 === 0) {
                    this.ctx.fillStyle = isFrenzy ? '#ffe380' : '#38b000';
                    this.ctx.beginPath();
                    this.ctx.ellipse(cx + (i % 4 === 0 ? 8 : -8), cy, 6, 3, Math.PI / 4, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                this.ctx.restore();
            }

            // Draw Head (Venus Flytrap)
            const head = this.snake[0];
            const hcx = head.x * this.cellSize + 15;
            const hcy = head.y * this.cellSize + 15;

            this.ctx.save();
            this.ctx.translate(hcx, hcy);

            let angle = 0;
            if (this.dir.x === 1) angle = 0;
            else if (this.dir.x === -1) angle = Math.PI;
            else if (this.dir.y === 1) angle = Math.PI / 2;
            else if (this.dir.y === -1) angle = -Math.PI / 2;

            this.ctx.rotate(angle);

            // Venus Flytrap Jaws
            this.ctx.fillStyle = isFrenzy ? '#ffe380' : '#38b000';
            this.ctx.shadowColor = isFrenzy ? '#ffb703' : '#38b000';
            this.ctx.shadowBlur = 12;

            // Upper Jaw
            this.ctx.beginPath();
            this.ctx.arc(4, -5, 12, Math.PI * 0.1, Math.PI * 0.9);
            this.ctx.fill();

            // Lower Jaw
            this.ctx.beginPath();
            this.ctx.arc(4, 5, 12, -Math.PI * 0.9, -Math.PI * 0.1);
            this.ctx.fill();

            // Inner Nectar Mouth
            this.ctx.fillStyle = '#e63946';
            this.ctx.beginPath();
            this.ctx.arc(6, 0, 7, 0, Math.PI * 2);
            this.ctx.fill();

            // Teeth
            this.ctx.fillStyle = '#ffffff';
            for (let t = -8; t <= 8; t += 4) {
                this.ctx.fillRect(14, t, 3, 2);
            }

            // Glowing Eye
            this.ctx.fillStyle = isFrenzy ? '#ffffff' : '#ffb703';
            this.ctx.beginPath();
            this.ctx.arc(-2, -6, 3, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }

        // 6. Draw Snap Skill Animation Line
        if (this.snapAnim) {
            this.ctx.save();
            this.ctx.strokeStyle = '#ffb703';
            this.ctx.lineWidth = 6;
            this.ctx.shadowColor = '#ffb703';
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.moveTo(this.snapAnim.startX, this.snapAnim.startY);
            const currX = this.snapAnim.startX + (this.snapAnim.endX - this.snapAnim.startX) * this.snapAnim.progress;
            const currY = this.snapAnim.startY + (this.snapAnim.endY - this.snapAnim.startY) * this.snapAnim.progress;
            this.ctx.lineTo(currX, currY);
            this.ctx.stroke();

            // Snap Jaw Head
            this.ctx.fillStyle = '#38b000';
            this.ctx.beginPath();
            this.ctx.arc(currX, currY, 14, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // 7. Draw Particles
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        if (!this.isPaused) {
            const elapsed = timestamp - this.lastTickTime;
            if (elapsed > this.tickInterval) {
                this.tick();
                this.lastTickTime = timestamp;
            }
            this.updateParticles();
            this.render();
        }

        this.animFrameId = requestAnimationFrame((t) => this.loop(t));
    }
}

// Instantiate on Load
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new BotanicalTerrariumGame();
});
