/**
 * Gothic Rose Window: Radiant Glass Snake (2026-08-09)
 * Daily Snake Workshop - HTML5 Canvas & Web Audio API Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    // Canvas & Context Setup
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const GRID_SIZE = 20; // 20x20 grid
    const CELL_SIZE = canvas.width / GRID_SIZE; // 30px

    // Game Colors (Jewel Palette)
    const PALETTE = {
        bg: '#080912',
        gridLine: 'rgba(217, 119, 6, 0.08)',
        ruby: '#ef4444',
        sapphire: '#3b82f6',
        emerald: '#10b981',
        amethyst: '#a855f7',
        topaz: '#f59e0b',
        gold: '#fbbf24',
        lead: '#1e2030',
        gargoyle: '#334155'
    };

    const SHARD_TYPES = [
        { type: 'ruby', color: PALETTE.ruby, name: '红宝石' },
        { type: 'sapphire', color: PALETTE.sapphire, name: '蓝宝石' },
        { type: 'emerald', color: PALETTE.emerald, name: '祖母绿' }
    ];

    // State Variables
    let snake = [];
    let direction = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let shards = [];
    let sunPrism = null;
    let gargoyles = [];
    let portals = [];
    let particles = [];
    let floatTexts = [];

    let score = 0;
    let highScore = parseInt(localStorage.getItem('daily_snake_gothic_highscore') || '0', 10);
    let combo = 1;
    let lastShardColor = null;
    let energy = 0; // 0 - 100
    let isRadiant = false;
    let radiantTimer = 0;

    let isPlaying = false;
    let isGameOver = false;
    let gameLoopId = null;
    let moveInterval = 130; // ms per tick
    let lastMoveTime = 0;

    // Web Audio Synthesizer Context
    let audioCtx = null;
    let soundEnabled = true;

    // UI Element References
    const scoreVal = document.getElementById('score-val');
    const highScoreVal = document.getElementById('high-score-val');
    const comboVal = document.getElementById('combo-val');
    const energyBarFill = document.getElementById('energy-bar-fill');
    const skillBtn = document.getElementById('skill-btn');
    const radianceOverlay = document.getElementById('radiance-overlay');
    const startScreen = document.getElementById('start-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const soundBtn = document.getElementById('sound-btn');
    const soundIcon = document.getElementById('sound-icon');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');
    const confirmHelp = document.getElementById('confirm-help');

    // Final Stats
    const finalScore = document.getElementById('final-score');
    const finalHighScore = document.getElementById('final-high-score');
    const finalComboCount = document.getElementById('final-combo-count');

    // Mobile D-Pad Buttons
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnCenter = document.getElementById('btn-center');

    // Display High Score Initial
    highScoreVal.textContent = highScore;

    // Initialize Audio
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

    // Play Synthesized Sounds
    function playTone(freq, type, duration, gainValue = 0.15) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(gainValue, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            console.error('Audio synth error:', e);
        }
    }

    // Pipe Organ Chord Synth for Combos
    function playOrganChord(frequencies) {
        if (!soundEnabled || !audioCtx) return;
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                try {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    const filter = audioCtx.createBiquadFilter();

                    osc.type = 'sawtooth';
                    osc.frequency.value = freq;
                    filter.type = 'lowpass';
                    filter.frequency.value = 1200;

                    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.6);
                } catch (e) {}
            }, index * 80);
        });
    }

    function playSoundEffect(name) {
        if (!soundEnabled || !audioCtx) return;
        initAudio();

        switch (name) {
            case 'eat':
                playTone(587.33, 'sine', 0.15, 0.2); // D5
                break;
            case 'combo':
                playOrganChord([440, 554.37, 659.25]); // A major organ chord
                break;
            case 'prism':
                playOrganChord([523.25, 659.25, 783.99, 1046.50]); // C major radiant chime
                break;
            case 'radiance':
                playOrganChord([349.23, 440, 523.25, 698.46]); // F major majestic fanfare
                setTimeout(() => playTone(880, 'sine', 0.8, 0.3), 200);
                break;
            case 'teleport':
                playTone(800, 'triangle', 0.2, 0.15);
                setTimeout(() => playTone(1200, 'sine', 0.2, 0.15), 50);
                break;
            case 'gameover':
                playTone(130.81, 'sawtooth', 0.9, 0.3); // C3 organ bell toll
                setTimeout(() => playTone(110.00, 'sawtooth', 1.2, 0.3), 300);
                break;
        }
    }

    // Reset Game State
    function resetGame() {
        snake = [
            { x: 10, y: 10, color: PALETTE.ruby },
            { x: 9, y: 10, color: PALETTE.sapphire },
            { x: 8, y: 10, color: PALETTE.emerald },
            { x: 7, y: 10, color: PALETTE.amethyst }
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        combo = 1;
        lastShardColor = null;
        energy = 0;
        isRadiant = false;
        radiantTimer = 0;
        moveInterval = 130;

        particles = [];
        floatTexts = [];
        gargoyles = [];
        portals = [];
        shards = [];
        sunPrism = null;

        updateUI();
        spawnPortals();
        spawnGargoyles(2);
        spawnShards(3);
    }

    // Spawn Edge Teleport Portals
    function spawnPortals() {
        portals = [
            { x1: 0, y1: 5, x2: GRID_SIZE - 1, y2: 14, color: PALETTE.amethyst },
            { x1: 5, y1: 0, x2: 14, y2: GRID_SIZE - 1, color: PALETTE.gold }
        ];
    }

    // Spawn Gargoyle Obstacles
    function spawnGargoyles(count) {
        gargoyles = [];
        for (let i = 0; i < count; i++) {
            let pos;
            let tries = 0;
            do {
                pos = {
                    x: Math.floor(Math.random() * (GRID_SIZE - 4)) + 2,
                    y: Math.floor(Math.random() * (GRID_SIZE - 4)) + 2
                };
                tries++;
            } while (isOccupied(pos) && tries < 50);

            if (tries < 50) {
                gargoyles.push(pos);
            }
        }
    }

    // Spawn Food Shards
    function spawnShards(count) {
        while (shards.length < count) {
            let pos;
            let tries = 0;
            do {
                pos = {
                    x: Math.floor(Math.random() * GRID_SIZE),
                    y: Math.floor(Math.random() * GRID_SIZE)
                };
                tries++;
            } while (isOccupied(pos) && tries < 50);

            if (tries < 50) {
                const shardDef = SHARD_TYPES[Math.floor(Math.random() * SHARD_TYPES.length)];
                shards.push({
                    x: pos.x,
                    y: pos.y,
                    type: shardDef.type,
                    color: shardDef.color,
                    pulse: Math.random() * Math.PI * 2
                });
            }
        }
    }

    // Spawn Rare Sun Prism
    function spawnSunPrism() {
        let pos;
        let tries = 0;
        do {
            pos = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
            tries++;
        } while (isOccupied(pos) && tries < 50);

        if (tries < 50) {
            sunPrism = {
                x: pos.x,
                y: pos.y,
                pulse: 0
            };
        }
    }

    // Check if cell is occupied
    function isOccupied(pos) {
        if (snake.some(seg => seg.x === pos.x && seg.y === pos.y)) return true;
        if (shards.some(s => s.x === pos.x && s.y === pos.y)) return true;
        if (sunPrism && sunPrism.x === pos.x && sunPrism.y === pos.y) return true;
        if (gargoyles.some(g => g.x === pos.x && g.y === pos.y)) return true;
        if (portals.some(p => (p.x1 === pos.x && p.y1 === pos.y) || (p.x2 === pos.x && p.y2 === pos.y))) return true;
        return false;
    }

    // Add Floating Text Effect
    function addFloatText(text, x, y, color) {
        floatTexts.push({
            text,
            x: (x + 0.5) * CELL_SIZE,
            y: (y + 0.5) * CELL_SIZE,
            color,
            alpha: 1.0,
            velocityY: -1.2
        });
    }

    // Create Shard Explosion Particles
    function createParticles(x, y, color, count = 12) {
        const px = (x + 0.5) * CELL_SIZE;
        const py = (y + 0.5) * CELL_SIZE;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1.5;
            particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: Math.random() * 4 + 2,
                life: 1.0
            });
        }
    }

    // Trigger Active Skill: Rose Window Radiance
    function activateRadiance() {
        if (energy < 100 || isRadiant || !isPlaying || isGameOver) return;

        energy = 0;
        isRadiant = true;
        radiantTimer = 35; // 35 ticks (~5.5 seconds)
        playSoundEffect('radiance');
        radianceOverlay.classList.remove('hidden');

        // Convert gargoyles to golden shards
        gargoyles.forEach(g => {
            shards.push({
                x: g.x,
                y: g.y,
                type: 'ruby',
                color: PALETTE.gold,
                pulse: 0
            });
            createParticles(g.x, g.y, PALETTE.gold, 16);
            addFloatText('PURIFIED!', g.x, g.y, PALETTE.gold);
        });
        gargoyles = [];

        updateUI();
    }

    // Update UI Stats
    function updateUI() {
        scoreVal.textContent = score;
        highScoreVal.textContent = highScore;
        comboVal.textContent = `x${combo}`;
        energyBarFill.style.width = `${energy}%`;

        if (energy >= 100 && !isRadiant) {
            skillBtn.disabled = false;
        } else {
            skillBtn.disabled = true;
        }
    }

    // Main Game Update Step
    function update(timestamp) {
        if (!isPlaying || isGameOver) return;

        if (timestamp - lastMoveTime >= (isRadiant ? moveInterval * 0.7 : moveInterval)) {
            lastMoveTime = timestamp;
            moveSnake();
        }

        // Particle updates
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
        });
        particles = particles.filter(p => p.life > 0);

        // Floating texts update
        floatTexts.forEach(t => {
            t.y += t.velocityY;
            t.alpha -= 0.02;
        });
        floatTexts = floatTexts.filter(t => t.alpha > 0);

        render();
        gameLoopId = requestAnimationFrame(update);
    }

    // Move Snake Engine Logic
    function moveSnake() {
        direction = { ...nextDirection };
        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

        // Handle Radiance Timer
        if (isRadiant) {
            radiantTimer--;
            if (radiantTimer <= 0) {
                isRadiant = false;
                radianceOverlay.classList.add('hidden');
            }
        }

        // Magnetically attract shards during Radiance
        if (isRadiant) {
            shards.forEach(s => {
                if (Math.abs(s.x - head.x) <= 2 && Math.abs(s.y - head.y) <= 2) {
                    s.x += Math.sign(head.x - s.x);
                    s.y += Math.sign(head.y - s.y);
                }
            });
        }

        // Portal Teleport Check
        portals.forEach(p => {
            if (head.x === p.x1 && head.y === p.y1) {
                head.x = p.x2;
                head.y = p.y2;
                playSoundEffect('teleport');
                createParticles(head.x, head.y, p.color, 10);
            } else if (head.x === p.x2 && head.y === p.y2) {
                head.x = p.x1;
                head.y = p.y1;
                playSoundEffect('teleport');
                createParticles(head.x, head.y, p.color, 10);
            }
        });

        // Boundary Collision (Screen Loop or Wall Collide)
        if (head.x < 0) head.x = GRID_SIZE - 1;
        if (head.x >= GRID_SIZE) head.x = 0;
        if (head.y < 0) head.y = GRID_SIZE - 1;
        if (head.y >= GRID_SIZE) head.y = 0;

        // Self Collision (unless Radiant)
        if (!isRadiant && snake.some((seg, idx) => idx > 0 && seg.x === head.x && seg.y === head.y)) {
            triggerGameOver();
            return;
        }

        // Gargoyle Collision (unless Radiant)
        if (!isRadiant && gargoyles.some(g => g.x === head.x && g.y === head.y)) {
            triggerGameOver();
            return;
        }

        // Check Shard Consumption
        let eatenIndex = shards.findIndex(s => s.x === head.x && s.y === head.y);
        let grew = false;

        if (eatenIndex !== -1) {
            const eaten = shards[eatenIndex];
            shards.splice(eatenIndex, 1);
            grew = true;

            // Combo logic
            if (lastShardColor && lastShardColor !== eaten.color) {
                combo = Math.min(combo + 1, 5);
                playSoundEffect('combo');
            } else if (lastShardColor === eaten.color) {
                combo = 1;
                playSoundEffect('eat');
            } else {
                playSoundEffect('eat');
            }
            lastShardColor = eaten.color;

            const pts = 10 * combo * (isRadiant ? 2 : 1);
            score += pts;
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('daily_snake_gothic_highscore', highScore.toString());
            }

            // Energy gain
            energy = Math.min(energy + 15, 100);

            createParticles(head.x, head.y, eaten.color, 14);
            addFloatText(`+${pts}`, head.x, head.y, eaten.color);

            // Chance to spawn Sun Prism
            if (Math.random() < 0.2 && !sunPrism) {
                spawnSunPrism();
            }

            spawnShards(3);
            updateUI();
        }

        // Check Sun Prism Consumption
        if (sunPrism && head.x === sunPrism.x && head.y === sunPrism.y) {
            score += 50 * combo;
            energy = Math.min(energy + 35, 100);
            createParticles(head.x, head.y, PALETTE.gold, 20);
            addFloatText(`+${50 * combo} PRISM!`, head.x, head.y, PALETTE.gold);
            playSoundEffect('prism');
            sunPrism = null;
            grew = true;
            updateUI();
        }

        // Move Body
        const newSegColor = eatenIndex !== -1 ? shards[eatenIndex]?.color || PALETTE.ruby : snake[0].color;
        snake.unshift({ x: head.x, y: head.y, color: isRadiant ? PALETTE.gold : newSegColor });

        if (!grew) {
            snake.pop();
        }
    }

    // Trigger Game Over
    function triggerGameOver() {
        isPlaying = false;
        isGameOver = true;
        playSoundEffect('gameover');

        finalScore.textContent = score;
        finalHighScore.textContent = highScore;
        finalComboCount.textContent = `x${combo}`;

        gameoverScreen.classList.remove('hidden');
    }

    // Render Canvas Frame
    function render() {
        // Background Dark Sanctuary
        ctx.fillStyle = PALETTE.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Background Rose Window Light Pattern
        drawRoseWindowBg();

        // Draw Grid Lines
        ctx.strokeStyle = PALETTE.gridLine;
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, canvas.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(canvas.width, i * CELL_SIZE);
            ctx.stroke();
        }

        // Draw Edge Teleport Portals
        portals.forEach(p => {
            drawPortal(p.x1, p.y1, p.color);
            drawPortal(p.x2, p.y2, p.color);
        });

        // Draw Gargoyles
        gargoyles.forEach(g => {
            drawGargoyle(g.x, g.y);
        });

        // Draw Food Shards
        shards.forEach(s => {
            s.pulse += 0.05;
            drawGlassShard(s.x, s.y, s.color, s.pulse);
        });

        // Draw Sun Prism Core
        if (sunPrism) {
            sunPrism.pulse += 0.08;
            drawSunPrism(sunPrism.x, sunPrism.y, sunPrism.pulse);
        }

        // Draw Snake
        drawSnake();

        // Draw Particles
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        // Draw Floating Texts
        floatTexts.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.globalAlpha = Math.max(0, t.alpha);
            ctx.font = '900 16px "Cinzel", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(t.text, t.x, t.y);
            ctx.globalAlpha = 1.0;
        });
    }

    // Render Procedural Background Rose Window
    function drawRoseWindowBg() {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.save();
        ctx.globalAlpha = isRadiant ? 0.35 : 0.12;

        // Outer Rose Ring
        ctx.strokeStyle = PALETTE.gold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 200, 0, Math.PI * 2);
        ctx.stroke();

        // Petals
        const petals = 12;
        for (let i = 0; i < petals; i++) {
            const angle = (i * Math.PI * 2) / petals;
            ctx.beginPath();
            ctx.arc(
                cx + Math.cos(angle) * 120,
                cy + Math.sin(angle) * 120,
                70,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = i % 3 === 0 ? PALETTE.ruby : i % 3 === 1 ? PALETTE.sapphire : PALETTE.emerald;
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    }

    // Draw Teleport Portal
    function drawPortal(x, y, color) {
        const cx = (x + 0.5) * CELL_SIZE;
        const cy = (y + 0.5) * CELL_SIZE;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, CELL_SIZE * 0.45, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.25;
        ctx.fill();
        ctx.restore();
    }

    // Draw Gargoyle Stone Obstacle
    function drawGargoyle(x, y) {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        ctx.save();
        ctx.fillStyle = PALETTE.gargoyle;
        ctx.strokeStyle = PALETTE.lead;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8, 6);
        ctx.fill();
        ctx.stroke();

        // Gargoyle glowing red eyes
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(px + 9, py + 10, 3, 3);
        ctx.fillRect(px + 18, py + 10, 3, 3);
        ctx.restore();
    }

    // Draw Stained Glass Shard
    function drawGlassShard(x, y, color, pulse) {
        const cx = (x + 0.5) * CELL_SIZE;
        const cy = (y + 0.5) * CELL_SIZE;
        const radius = CELL_SIZE * 0.35 + Math.sin(pulse) * 2;

        ctx.save();
        // Glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;

        // Diamond Shard Path
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx + radius, cy);
        ctx.lineTo(cx, cy + radius);
        ctx.lineTo(cx - radius, cy);
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    // Draw Sun Prism Special Core
    function drawSunPrism(x, y, pulse) {
        const cx = (x + 0.5) * CELL_SIZE;
        const cy = (y + 0.5) * CELL_SIZE;
        const r = CELL_SIZE * 0.4;

        ctx.save();
        ctx.shadowColor = PALETTE.gold;
        ctx.shadowBlur = 20;

        ctx.translate(cx, cy);
        ctx.rotate(pulse);

        // 8-point star
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const dist = i % 2 === 0 ? r : r * 0.5;
            ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, PALETTE.gold);
        grad.addColorStop(1, PALETTE.amethyst);

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    // Render Stained Glass Snake
    function drawSnake() {
        snake.forEach((seg, idx) => {
            const px = seg.x * CELL_SIZE;
            const py = seg.y * CELL_SIZE;
            const isHead = idx === 0;

            ctx.save();

            if (isRadiant) {
                ctx.shadowColor = PALETTE.gold;
                ctx.shadowBlur = 16;
            }

            if (isHead) {
                // Head: Crown/Jewel shape
                ctx.fillStyle = isRadiant ? PALETTE.gold : seg.color;
                ctx.beginPath();
                ctx.roundRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 8);
                ctx.fill();

                // Lead Came Outer Border
                ctx.strokeStyle = PALETTE.lead;
                ctx.lineWidth = 2.5;
                ctx.stroke();

                // Head Eyes
                ctx.fillStyle = '#ffffff';
                if (direction.x === 1) {
                    ctx.fillRect(px + 18, py + 7, 4, 4);
                    ctx.fillRect(px + 18, py + 19, 4, 4);
                } else if (direction.x === -1) {
                    ctx.fillRect(px + 8, py + 7, 4, 4);
                    ctx.fillRect(px + 8, py + 19, 4, 4);
                } else if (direction.y === -1) {
                    ctx.fillRect(px + 7, py + 8, 4, 4);
                    ctx.fillRect(px + 19, py + 8, 4, 4);
                } else {
                    ctx.fillRect(px + 7, py + 18, 4, 4);
                    ctx.fillRect(px + 19, py + 18, 4, 4);
                }
            } else {
                // Body Segment: Faceted Glass Tile
                ctx.fillStyle = isRadiant ? PALETTE.gold : seg.color;
                ctx.globalAlpha = 0.85;

                ctx.beginPath();
                ctx.roundRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6, 5);
                ctx.fill();

                // Inner Glass Refraction Line
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(px + 5, py + 5);
                ctx.lineTo(px + CELL_SIZE - 8, py + 8);
                ctx.stroke();

                // Lead Came Outer Border
                ctx.strokeStyle = PALETTE.lead;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            ctx.restore();
        });
    }

    // Input Event Listeners
    function handleKeyDown(e) {
        initAudio();
        if (!isPlaying) return;

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
                break;
            case ' ':
                e.preventDefault();
                activateRadiance();
                break;
        }
    }

    // Mobile D-Pad Event Binding
    btnUp.addEventListener('click', () => { if (direction.y !== 1) nextDirection = { x: 0, y: -1 }; });
    btnDown.addEventListener('click', () => { if (direction.y !== -1) nextDirection = { x: 0, y: 1 }; });
    btnLeft.addEventListener('click', () => { if (direction.x !== 1) nextDirection = { x: -1, y: 0 }; });
    btnRight.addEventListener('click', () => { if (direction.x !== -1) nextDirection = { x: 1, y: 0 }; });
    btnCenter.addEventListener('click', activateRadiance);
    skillBtn.addEventListener('click', activateRadiance);

    // Canvas Touch Drag Controls
    let touchStartX = 0;
    let touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
        if (!isPlaying) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const minSwipe = 25;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > minSwipe && direction.x !== -1) nextDirection = { x: 1, y: 0 };
            else if (dx < -minSwipe && direction.x !== 1) nextDirection = { x: -1, y: 0 };
        } else {
            if (dy > minSwipe && direction.y !== -1) nextDirection = { x: 0, y: 1 };
            else if (dy < -minSwipe && direction.y !== 1) nextDirection = { x: 0, y: -1 };
        }
    }, { passive: true });

    // Global Key Listener
    window.addEventListener('keydown', handleKeyDown);

    // Button Click Listeners
    startBtn.addEventListener('click', () => {
        initAudio();
        startScreen.classList.add('hidden');
        resetGame();
        isPlaying = true;
        isGameOver = false;
        lastMoveTime = performance.now();
        requestAnimationFrame(update);
    });

    restartBtn.addEventListener('click', () => {
        initAudio();
        gameoverScreen.classList.add('hidden');
        resetGame();
        isPlaying = true;
        isGameOver = false;
        lastMoveTime = performance.now();
        requestAnimationFrame(update);
    });

    soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    });

    helpBtn.addEventListener('click', () => {
        helpModal.classList.remove('hidden');
    });

    closeHelp.addEventListener('click', () => {
        helpModal.classList.add('hidden');
    });

    confirmHelp.addEventListener('click', () => {
        helpModal.classList.add('hidden');
    });

    // Initial Screen Render
    resetGame();
    render();
});
