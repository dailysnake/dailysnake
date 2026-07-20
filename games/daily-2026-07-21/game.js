/* ==========================================
   PAPERFOLD ODYSSEY (纸境折跃) - GAME ENGINE
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- Canvas & Core Variables ---
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Grid settings
    const GRID_SIZE = 20;
    const CELL_SIZE = 30; // 20 * 30 = 600px canvas size
    
    // Game States
    let snake = [];
    let direction = { x: 0, y: -1 };
    let nextDirection = { x: 0, y: -1 };
    let score = 0;
    let highScore = parseInt(localStorage.getItem('origami_highscore') || '0');
    
    let activeForm = 'normal'; // 'normal' | 'crane' | 'frog' | 'boat'
    let formTimeRemaining = 0; // ms
    let formDuration = 0; // ms for progress bar
    
    let foldEnergy = 0; // 0 to 100
    let isFolded = false;
    let foldTimeRemaining = 0; // ms
    const FOLD_CREASE_Y_START = 8; // Row 8 to 11 will be folded
    const FOLD_CREASE_Y_END = 11;
    const FOLD_ROWS_COUNT = FOLD_CREASE_Y_END - FOLD_CREASE_Y_START + 1; // 4 rows
    
    let frogJumpCooldown = 0; // ms
    const JUMP_COOLDOWN_MAX = 3000; // 3 seconds
    
    let foodList = [];
    let obstacles = [];
    let inkPuddles = [];
    let particles = [];
    
    // Timing & Loop
    let lastTime = 0;
    let gameTickAccumulator = 0;
    let gameSpeed = 160; // ms per tick
    
    let isPlaying = false;
    let isPaused = false;
    let isGameOver = false;
    let deathReason = '';
    
    // Control & Audio Options
    let controlMode = 'keyboard'; // 'keyboard' | 'drag'
    let soundEnabled = true;
    
    // Mobile Detection
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouchDevice) {
        document.querySelector('.mobile-controls').style.display = 'block';
    }

    // Update initial high score display
    document.getElementById('high-score').textContent = highScore;

    // --- Web Audio Synthesizer ---
    let audioCtx = null;
    let bgmTimer = null;
    let bgmIndex = 0;
    const pentatonicScale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00]; // C pentatonic

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            startBGM();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // Helper: Synthesize a clicky/crisp paper sound (Eat)
    function playEatSound() {
        if (!soundEnabled || !audioCtx) return;
        
        // Simulating a paper snip/crisp fold: short burst of bandpass filtered white noise
        const bufferSize = Math.floor(audioCtx.sampleRate * 0.05); // 50ms buffer
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, audioCtx.currentTime);
        filter.Q.setValueAtTime(5, audioCtx.currentTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);

        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        noiseNode.start();

        // Also add a clean harmonic ping
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.05);

        oscGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

        osc.connect(oscGain);
        oscGain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.06);
    }

    // Helper: Synthesize paper slither/rustle (Move)
    function playMoveSound() {
        if (!soundEnabled || !audioCtx) return;
        
        const bufferSize = Math.floor(audioCtx.sampleRate * 0.02); // 20ms buffer
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(4000, audioCtx.currentTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);

        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        noiseNode.start();
    }

    // Helper: Synthesize paper tearing (Death)
    function playDeathSound() {
        if (!soundEnabled || !audioCtx) return;

        // Low frequency tear
        const duration = 0.4;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + duration);

        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);

        // Crackling tear noise
        const bufferSize = Math.floor(audioCtx.sampleRate * duration);
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // Add some "crackle" impulses
            if (Math.random() < 0.15) {
                data[i] = Math.random() * 2 - 1;
            } else {
                data[i] = 0;
            }
        }
        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
        filter.frequency.linearRampToValueAtTime(300, audioCtx.currentTime + duration);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        noiseNode.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseNode.start();
    }

    // Helper: Synthesize Space Fold sound
    function playFoldSound() {
        if (!soundEnabled || !audioCtx) return;

        const duration = 0.5;
        // Wooosh frequency sweep
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + duration * 0.5);
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + duration);

        gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + duration * 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);

        // Crushing sound
        const bufferSize = Math.floor(audioCtx.sampleRate * duration);
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1.0 - i / bufferSize);
        }
        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, audioCtx.currentTime);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        noiseNode.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseNode.start();
    }

    // Helper: Synthesize Transformation / Morphing
    function playMorphSound() {
        if (!soundEnabled || !audioCtx) return;

        const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.05);
            osc.frequency.linearRampToValueAtTime(freq * 1.5, audioCtx.currentTime + idx * 0.05 + 0.3);

            gainNode.gain.setValueAtTime(0, audioCtx.currentTime + idx * 0.05);
            gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + idx * 0.05 + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.05 + 0.4);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + idx * 0.05);
            osc.stop(audioCtx.currentTime + idx * 0.05 + 0.5);
        });
    }

    // Generative BGM loop
    function startBGM() {
        if (bgmTimer) clearInterval(bgmTimer);
        
        // Play a random pentatonic note every 2.5 seconds
        bgmTimer = setInterval(() => {
            if (!soundEnabled || !audioCtx || isPaused || !isPlaying) return;
            
            const noteFreq = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];
            
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = noteFreq;
            
            // Soft envelope
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.8);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 2.4);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 2.5);
        }, 2500);
    }

    // --- Core Game Functions ---

    function resetGame() {
        snake = [
            { x: 10, y: 14 },
            { x: 10, y: 15 },
            { x: 10, y: 16 }
        ];
        direction = { x: 0, y: -1 };
        nextDirection = { x: 0, y: -1 };
        score = 0;
        foldEnergy = 0;
        activeForm = 'normal';
        formTimeRemaining = 0;
        isFolded = false;
        foldTimeRemaining = 0;
        frogJumpCooldown = 0;
        
        obstacles = [];
        inkPuddles = [];
        foodList = [];
        particles = [];
        
        gameSpeed = 160;
        
        // Spawn basic map objects
        generateMapElements();
        
        // Spawn starting food
        spawnFood('confetti');
        spawnFood('confetti');
        spawnFood('crane_chart'); // At least one special food at start
        
        // Update DOM elements
        document.getElementById('current-score').textContent = score;
        document.getElementById('energy-percentage').textContent = '0%';
        document.getElementById('energy-bar-fill').style.width = '0%';
        document.getElementById('fold-ready-text').textContent = '能量未满，吃纸屑可充能';
        document.getElementById('fold-ready-text').classList.remove('ready-pulse');
        updateFormUI();
        
        isGameOver = false;
    }

    function generateMapElements() {
        // Place some static cardboard obstacles
        // Let's place a couple of cardstock walls
        const wallPositions = [
            { x: 5, y: 5 }, { x: 6, y: 5 },
            { x: 13, y: 5 }, { x: 14, y: 5 },
            { x: 5, y: 15 }, { x: 6, y: 15 },
            { x: 13, y: 15 }, { x: 14, y: 15 }
        ];
        
        wallPositions.forEach(p => {
            // Keep center path clear
            if (p.x !== 10 && p.y !== 10) {
                obstacles.push(p);
            }
        });
        
        // Place ink puddles (2 puddles)
        inkPuddles.push({ x: 3, y: 10, radius: 1.5 });
        inkPuddles.push({ x: 16, y: 10, radius: 1.8 });
    }

    function spawnFood(forceType = null) {
        let x, y;
        let valid = false;
        let attempts = 0;
        
        while (!valid && attempts < 100) {
            attempts++;
            x = Math.floor(Math.random() * GRID_SIZE);
            y = Math.floor(Math.random() * GRID_SIZE);
            
            // Do not spawn inside folded crease area if folded
            if (isFolded && y >= FOLD_CREASE_Y_START && y <= FOLD_CREASE_Y_END) {
                continue;
            }
            
            // Check collision with snake
            let hitSnake = snake.some(seg => seg.x === x && seg.y === y);
            if (hitSnake) continue;
            
            // Check collision with obstacles
            let hitObstacle = obstacles.some(obs => obs.x === x && obs.y === y);
            if (hitObstacle) continue;
            
            // Check collision with other food
            let hitFood = foodList.some(f => f.x === x && f.y === y);
            if (hitFood) continue;
            
            valid = true;
        }
        
        if (valid) {
            let type = 'confetti';
            if (forceType) {
                type = forceType;
            } else {
                // Determine food type based on random weights
                const rand = Math.random();
                if (rand < 0.70) {
                    type = 'confetti';
                } else if (rand < 0.80) {
                    type = 'crane_chart';
                } else if (rand < 0.90) {
                    type = 'frog_chart';
                } else {
                    type = 'boat_chart';
                }
            }
            
            foodList.push({ x, y, type, rotation: Math.random() * Math.PI * 2 });
        }
    }

    // --- Input Handlers ---

    // Keyboard controls
    window.addEventListener('keydown', e => {
        if (!isPlaying || isPaused || isGameOver) return;
        
        let prevent = true;
        
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (direction.y === 0) nextDirection = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (direction.y === 0) nextDirection = { x: 0, y: 1 };
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (direction.x === 0) nextDirection = { x: -1, y: 0 };
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (direction.x === 0) nextDirection = { x: 1, y: 0 };
                break;
            case 'f':
            case 'F':
                triggerSpaceFold();
                break;
            case ' ': // Space bar
                triggerFrogJump();
                break;
            default:
                prevent = false;
        }
        
        if (prevent) e.preventDefault();
    });

    // Touch controls (Keypad)
    document.getElementById('key-up').addEventListener('touchstart', e => {
        e.preventDefault();
        if (direction.y === 0) nextDirection = { x: 0, y: -1 };
    });
    document.getElementById('key-down').addEventListener('touchstart', e => {
        e.preventDefault();
        if (direction.y === 0) nextDirection = { x: 0, y: 1 };
    });
    document.getElementById('key-left').addEventListener('touchstart', e => {
        e.preventDefault();
        if (direction.x === 0) nextDirection = { x: -1, y: 0 };
    });
    document.getElementById('key-right').addEventListener('touchstart', e => {
        e.preventDefault();
        if (direction.x === 0) nextDirection = { x: 1, y: 0 };
    });
    
    // Jump & Fold Action buttons (Mobile)
    const mobileJumpBtn = document.getElementById('mobile-jump-btn');
    const mobileFoldBtn = document.getElementById('mobile-fold-btn');
    
    mobileJumpBtn.addEventListener('click', () => {
        triggerFrogJump();
    });
    mobileFoldBtn.addEventListener('click', () => {
        triggerSpaceFold();
    });

    // Touch drag controls (Optional mode)
    let touchStartX = 0;
    let touchStartY = 0;
    
    canvas.addEventListener('touchstart', e => {
        if (controlMode !== 'drag') return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: true });
    
    canvas.addEventListener('touchmove', e => {
        if (controlMode !== 'drag' || !isPlaying || isPaused || isGameOver) return;
        
        const touch = e.touches[0];
        const diffX = touch.clientX - touchStartX;
        const diffY = touch.clientY - touchStartY;
        
        // Require at least a 30px swipe to register
        if (Math.abs(diffX) > 30 || Math.abs(diffY) > 30) {
            if (Math.abs(diffX) > Math.abs(diffY)) {
                // Horizontal Swipe
                if (diffX > 0 && direction.x === 0) nextDirection = { x: 1, y: 0 };
                else if (diffX < 0 && direction.x === 0) nextDirection = { x: -1, y: 0 };
            } else {
                // Vertical Swipe
                if (diffY > 0 && direction.y === 0) nextDirection = { x: 0, y: 1 };
                else if (diffY < 0 && direction.y === 0) nextDirection = { x: 0, y: -1 };
            }
            
            // Update starting points to allow continuous swiping without releasing
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }
    }, { passive: true });

    // Handle Config Panel changes
    document.getElementById('control-select').addEventListener('change', e => {
        controlMode = e.target.value;
    });
    
    document.getElementById('sound-toggle').addEventListener('change', e => {
        soundEnabled = e.target.checked;
        if (soundEnabled) {
            initAudio();
        }
    });

    // --- Unique Mechanics Implementation ---

    // 1. Origami Frog Jump
    function triggerFrogJump() {
        if (activeForm !== 'frog' || frogJumpCooldown > 0) return;
        
        // Leap forward 2 grid cells in current face direction!
        let head = snake[0];
        let newX = head.x + direction.x * 2;
        let newY = head.y + direction.y * 2;
        
        // Handle folding coordinates transition if active
        if (isFolded) {
            // We leap 2 grid cells. Let's do it step by step to ensure correct fold wrapping
            let step1Y = head.y + direction.y;
            if (head.y <= FOLD_CREASE_Y_START - 1 && step1Y >= FOLD_CREASE_Y_START) {
                step1Y = FOLD_CREASE_Y_END + 1 + (step1Y - FOLD_CREASE_Y_START);
            } else if (head.y >= FOLD_CREASE_Y_END + 1 && step1Y <= FOLD_CREASE_Y_END) {
                step1Y = FOLD_CREASE_Y_START - 1 - (FOLD_CREASE_Y_END - step1Y);
            }
            
            newY = step1Y + direction.y;
            if (step1Y <= FOLD_CREASE_Y_START - 1 && newY >= FOLD_CREASE_Y_START) {
                newY = FOLD_CREASE_Y_END + 1 + (newY - FOLD_CREASE_Y_START);
            } else if (step1Y >= FOLD_CREASE_Y_END + 1 && newY <= FOLD_CREASE_Y_END) {
                newY = FOLD_CREASE_Y_START - 1 - (FOLD_CREASE_Y_END - newY);
            }
        }
        
        // Grid bounds check for jump
        if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) {
            // Jumped out of screen, fail
            handleDeath('折跃落空，落入桌底');
            return;
        }
        
        // Check obstacle collision
        let hitObstacle = obstacles.some(obs => obs.x === newX && obs.y === newY);
        if (hitObstacle) {
            handleDeath('折跃失败，撞上硬卡纸墙');
            return;
        }
        
        // Jump action (teleport head)
        // Add new head segment
        snake.unshift({ x: newX, y: newY });
        
        // Play dynamic jumping paper audio
        playFoldSound();
        
        // Pop tail to maintain length
        snake.pop();
        
        // Put jump on cooldown
        frogJumpCooldown = JUMP_COOLDOWN_MAX;
        mobileJumpBtn.disabled = true;
        
        // Burst particles at landing
        createPaperBurst(newX, newY, 'var(--washi-green)', 15);
    }

    // 2. Crease Space Fold
    function triggerSpaceFold() {
        if (foldEnergy < 100 || isFolded) return;
        
        initAudio();
        isFolded = true;
        foldEnergy = 0;
        foldTimeRemaining = 5000; // Fold lasts 5 seconds
        
        // If the snake head or body segments were inside the folded area (rows 8-11), 
        // we must push them outwards to avoid immediate death or glitch
        snake.forEach(seg => {
            if (seg.y >= FOLD_CREASE_Y_START && seg.y <= FOLD_CREASE_Y_END) {
                // Push to closest edge
                if (seg.y < (FOLD_CREASE_Y_START + FOLD_CREASE_Y_END) / 2) {
                    seg.y = FOLD_CREASE_Y_START - 1;
                } else {
                    seg.y = FOLD_CREASE_Y_END + 1;
                }
            }
        });
        
        // Teleport any food inside the fold to active space
        foodList.forEach(f => {
            if (f.y >= FOLD_CREASE_Y_START && f.y <= FOLD_CREASE_Y_END) {
                f.y = Math.floor(Math.random() * FOLD_CREASE_Y_START); // move to top active half
            }
        });
        
        // Play spatial folding sound
        playFoldSound();
        
        // Update DOM elements
        document.getElementById('energy-bar-fill').style.width = '0%';
        document.getElementById('energy-percentage').textContent = '0%';
        document.getElementById('fold-ready-text').textContent = '折叠状态激活！';
        document.getElementById('fold-ready-text').classList.remove('ready-pulse');
        mobileFoldBtn.disabled = true;
        
        // Paper folding screen distortion effect
        canvas.style.transform = 'perspective(800px) rotateX(10deg)';
        setTimeout(() => {
            canvas.style.transform = 'perspective(800px) rotateX(0deg)';
        }, 300);
        
        // Particle burst along the fold crease line
        for (let x = 0; x < GRID_SIZE; x++) {
            createPaperBurst(x, FOLD_CREASE_Y_START - 0.5, 'var(--border-color)', 2);
            createPaperBurst(x, FOLD_CREASE_Y_END + 0.5, 'var(--border-color)', 2);
        }
    }

    function deactivateFold() {
        isFolded = false;
        playFoldSound();
        document.getElementById('fold-ready-text').textContent = '折叠解开，正在充能';
        
        // Verify snake is not stuck inside the unfolded area. It shouldn't be, since 
        // rows 8-11 were unreachable when folded.
        canvas.style.transform = 'perspective(800px) rotateX(-5deg)';
        setTimeout(() => {
            canvas.style.transform = 'perspective(800px) rotateX(0deg)';
        }, 300);
    }

    // 3. Transformation handling
    function activateForm(formType) {
        activeForm = formType;
        playMorphSound();
        
        // Standard durations:
        if (formType === 'crane') {
            formDuration = 6000;
        } else if (formType === 'frog') {
            formDuration = 8000;
            frogJumpCooldown = 0;
            mobileJumpBtn.disabled = false;
        } else if (formType === 'boat') {
            formDuration = 10000;
        }
        formTimeRemaining = formDuration;
        
        updateFormUI();
        
        // Morph particles
        let morphColor = 'var(--text-primary)';
        if (formType === 'crane') morphColor = 'var(--washi-blue)';
        if (formType === 'frog') morphColor = 'var(--washi-green)';
        if (formType === 'boat') morphColor = 'var(--washi-yellow)';
        
        createPaperBurst(snake[0].x, snake[0].y, morphColor, 20);
    }

    function deactivateForm() {
        activeForm = 'normal';
        formTimeRemaining = 0;
        formDuration = 0;
        mobileJumpBtn.disabled = true;
        updateFormUI();
        createPaperBurst(snake[0].x, snake[0].y, 'var(--washi-red)', 10);
    }

    function updateFormUI() {
        const formText = document.getElementById('current-form-text');
        const durationFill = document.getElementById('form-duration-fill');
        
        formText.className = 'stat-value'; // reset
        
        if (activeForm === 'normal') {
            formText.textContent = '普通纸蛇';
            formText.classList.add('form-text-normal');
            durationFill.style.width = '0%';
        } else if (activeForm === 'crane') {
            formText.textContent = '千羽鹤 (浮空)';
            formText.classList.add('form-text-crane');
        } else if (activeForm === 'frog') {
            formText.textContent = '折纸蛙 (跃步)';
            formText.classList.add('form-text-frog');
        } else if (activeForm === 'boat') {
            formText.textContent = '乌篷船 (破水)';
            formText.classList.add('form-text-boat');
        }
    }

    // --- Particle FX Engine ---

    function createPaperBurst(gx, gy, color, count = 10) {
        const screenPos = gridToScreen(gx, gy);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4;
            particles.push({
                x: screenPos.x,
                y: screenPos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                rotation: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 0.3,
                color: color,
                width: 4 + Math.random() * 6,
                height: 4 + Math.random() * 6,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.vrot;
            p.vx *= 0.96; // drag
            p.vy *= 0.96;
            p.life -= p.decay;
            
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    // --- Game Logic Updates ---

    function updateGameTick() {
        direction = nextDirection;
        let head = snake[0];
        
        // Calculate new head position
        let newX = head.x + direction.x;
        let newY = head.y + direction.y;
        
        // 1. Fold Space Transition
        if (isFolded) {
            // Fold removes rows 8, 9, 10, 11 (FOLD_CREASE_Y_START to FOLD_CREASE_Y_END)
            // Entering the folded zone makes you warp across the fold!
            if (direction.y > 0 && head.y === FOLD_CREASE_Y_START - 1) {
                // Moving down past row 7, warp directly to row 12!
                newY = FOLD_CREASE_Y_END + 1;
            } else if (direction.y < 0 && head.y === FOLD_CREASE_Y_END + 1) {
                // Moving up past row 12, warp directly to row 7!
                newY = FOLD_CREASE_Y_START - 1;
            }
        }
        
        // 2. Map Border Collision Check
        if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) {
            handleDeath('越过了手工桌面裁剪边线');
            return;
        }
        
        // 3. Obstacle Cardboard Collision
        if (activeForm !== 'crane') {
            let hitObstacle = obstacles.some(obs => obs.x === newX && obs.y === newY);
            if (hitObstacle) {
                handleDeath('正面撞击了硬质卡纸挡板');
                return;
            }
        }
        
        // 4. Self Collision Check
        if (activeForm !== 'crane') {
            // Ignore tail tip if it's sliding away (which is standard snake behavior)
            // But if it eats food, the tail stays, so we check full length
            let hitSelf = snake.slice(0, -1).some(seg => seg.x === newX && seg.y === newY);
            if (hitSelf) {
                handleDeath('纸张受力挤压，首尾相撞折毁');
                return;
            }
        }
        
        // Move snake: insert new head
        const newHead = { x: newX, y: newY };
        snake.unshift(newHead);
        
        // Check food collision
        let eatenIndex = -1;
        for (let i = 0; i < foodList.length; i++) {
            if (foodList[i].x === newX && foodList[i].y === newY) {
                eatenIndex = i;
                break;
            }
        }
        
        if (eatenIndex !== -1) {
            // Eat Food!
            const foodItem = foodList[eatenIndex];
            foodList.splice(eatenIndex, 1);
            
            // Verify if crane form restricts eating
            if (activeForm === 'crane') {
                // Crane cannot digest. We keep tail pop to maintain length, and no points.
                snake.pop();
            } else {
                // Normal / Frog / Boat eating
                let scoreMultiplier = (activeForm === 'boat') ? 2 : 1;
                
                if (foodItem.type === 'confetti') {
                    score += 10 * scoreMultiplier;
                    // Boost Fold Energy
                    if (foldEnergy < 100) {
                        foldEnergy = Math.min(100, foldEnergy + 10);
                        if (foldEnergy === 100) {
                            document.getElementById('fold-ready-text').textContent = '空间折痕已锁定，按F键开启！';
                            document.getElementById('fold-ready-text').classList.add('ready-pulse');
                            mobileFoldBtn.disabled = false;
                        }
                    }
                    createPaperBurst(newX, newY, 'var(--washi-red)', 8);
                } else if (foodItem.type === 'crane_chart') {
                    score += 15 * scoreMultiplier;
                    activateForm('crane');
                } else if (foodItem.type === 'frog_chart') {
                    score += 15 * scoreMultiplier;
                    activateForm('frog');
                } else if (foodItem.type === 'boat_chart') {
                    score += 15 * scoreMultiplier;
                    activateForm('boat');
                }
                
                // Play snappy sound
                playEatSound();
                
                // Update score card
                document.getElementById('current-score').textContent = score;
                
                // Spawn replacements
                spawnFood();
            }
        } else {
            // Standard move: slide forward (remove tail)
            snake.pop();
            // Subtle move rustle
            if (Math.random() < 0.25) playMoveSound();
        }
        
        // Update grid speed based on terrain (Ink Puddle)
        // If head is in an ink puddle, normal snake slows down
        let headInPuddle = false;
        if (activeForm !== 'boat') {
            for (let puddle of inkPuddles) {
                const dist = Math.hypot(newHead.x - puddle.x, newHead.y - puddle.y);
                if (dist <= puddle.radius) {
                    headInPuddle = true;
                    break;
                }
            }
        }
        
        gameSpeed = headInPuddle ? 260 : 160;
    }

    function handleDeath(reason) {
        isPlaying = false;
        isGameOver = true;
        deathReason = reason;
        
        playDeathSound();
        
        // High score management
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('origami_highscore', highScore);
            document.getElementById('high-score').textContent = highScore;
        }
        
        // Update Death Screen UI
        document.getElementById('death-reason').textContent = reason;
        document.getElementById('final-score').textContent = score;
        document.getElementById('final-high').textContent = highScore;
        
        document.getElementById('gameover-screen').classList.remove('hidden');
    }

    // --- Main Game Loop (RequestAnimationFrame) ---

    function loop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        let elapsed = timestamp - lastTime;
        lastTime = timestamp;
        
        if (isPlaying && !isPaused && !isGameOver) {
            // Update Active Form timer
            if (activeForm !== 'normal') {
                formTimeRemaining -= elapsed;
                const percent = Math.max(0, (formTimeRemaining / formDuration) * 100);
                document.getElementById('form-duration-fill').style.width = `${percent}%`;
                
                if (formTimeRemaining <= 0) {
                    deactivateForm();
                }
            }
            
            // Update Frog Jump Cooldown
            if (frogJumpCooldown > 0) {
                frogJumpCooldown = Math.max(0, frogJumpCooldown - elapsed);
                if (frogJumpCooldown === 0 && activeForm === 'frog') {
                    mobileJumpBtn.disabled = false;
                }
            }
            
            // Update Space Fold Timer
            if (isFolded) {
                foldTimeRemaining -= elapsed;
                if (foldTimeRemaining <= 0) {
                    deactivateFold();
                }
            } else {
                // Update Energy Bar view
                document.getElementById('energy-bar-fill').style.width = `${foldEnergy}%`;
                document.getElementById('energy-percentage').textContent = `${foldEnergy}%`;
            }
            
            // Accumulate tick time
            gameTickAccumulator += elapsed;
            if (gameTickAccumulator >= gameSpeed) {
                updateGameTick();
                gameTickAccumulator -= gameSpeed;
            }
        }
        
        // Graphics updates
        updateParticles(elapsed);
        render();
        
        requestAnimationFrame(loop);
    }

    // --- Coordinate Transformation & Rendering ---

    // Translate grid coordinate to canvas rendering pixel coordinate
    function gridToScreen(gx, gy) {
        let x = gx * CELL_SIZE + CELL_SIZE / 2;
        let y = gy * CELL_SIZE + CELL_SIZE / 2;
        
        if (isFolded) {
            // Fold is active. Rows 8, 9, 10, 11 are "pinched" together in the middle (crease at Y=285)
            // Let's slide rows 12-19 upwards to meet rows 0-7.
            if (gy <= FOLD_CREASE_Y_START - 1) {
                // No change for top half
                y = gy * CELL_SIZE + CELL_SIZE / 2;
            } else if (gy >= FOLD_CREASE_Y_END + 1) {
                // Slide up by 4 rows
                y = (gy - FOLD_ROWS_COUNT) * CELL_SIZE + CELL_SIZE / 2;
            } else {
                // Inside the crease - squished tightly into the crease center
                y = FOLD_CREASE_Y_START * CELL_SIZE; // right on the crease line
            }
        }
        
        return { x, y };
    }

    function render() {
        // Clear canvas with desk shadow transparency
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Draw Board Sheet Background (Paper surface)
        ctx.save();
        ctx.fillStyle = '#fffdf7';
        // Drop shadow for the main paper sheet
        ctx.shadowColor = 'rgba(61, 53, 42, 0.15)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 4;
        
        if (isFolded) {
            // Draw paper board as smaller due to the fold
            // Active height is (20 - 4) * 30 = 480px
            ctx.fillRect(0, 0, canvas.width, 480);
        } else {
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.restore();

        // 2. Draw Fold Crease guide lines (subtle dashed creases)
        ctx.save();
        ctx.strokeStyle = 'rgba(61, 53, 42, 0.05)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        // Draw grid boundaries
        const heightBound = isFolded ? 480 : 600;
        for (let i = 0; i <= GRID_SIZE; i++) {
            // vertical grid lines
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, heightBound);
            ctx.stroke();
        }
        
        // horizontal grid lines (skip crease rows if folded)
        for (let j = 0; j <= GRID_SIZE; j++) {
            if (isFolded && j >= FOLD_CREASE_Y_START && j <= FOLD_CREASE_Y_END) continue;
            
            let drawY = j * CELL_SIZE;
            if (isFolded && j > FOLD_CREASE_Y_END) {
                drawY = (j - FOLD_ROWS_COUNT) * CELL_SIZE;
            }
            
            ctx.beginPath();
            ctx.moveTo(0, drawY);
            ctx.lineTo(canvas.width, drawY);
            ctx.stroke();
        }
        ctx.restore();

        // 3. Draw Ink Puddles (Desk spots)
        ctx.save();
        inkPuddles.forEach(puddle => {
            // Translate center position
            const pPos = gridToScreen(puddle.x, puddle.y);
            
            // Draw ink blob
            ctx.fillStyle = 'rgba(43, 43, 43, 0.16)';
            ctx.beginPath();
            ctx.arc(pPos.x, pPos.y, puddle.radius * CELL_SIZE, 0, Math.PI * 2);
            ctx.fill();
            
            // Small splatters
            ctx.fillStyle = 'rgba(43, 43, 43, 0.2)';
            for (let i = 0; i < 4; i++) {
                const angle = i * Math.PI / 2 + 0.2;
                const sx = pPos.x + Math.cos(angle) * (puddle.radius * CELL_SIZE * 0.9);
                const sy = pPos.y + Math.sin(angle) * (puddle.radius * CELL_SIZE * 0.9);
                ctx.beginPath();
                ctx.arc(sx, sy, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();

        // 4. Draw Cardboard Obstacles
        ctx.save();
        ctx.fillStyle = '#bab29e'; // Raw cardboard brown-gray
        ctx.strokeStyle = '#99907c';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(61, 53, 42, 0.1)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
        
        obstacles.forEach(obs => {
            // Fold checks: skip drawing if inside folded region
            if (isFolded && obs.y >= FOLD_CREASE_Y_START && obs.y <= FOLD_CREASE_Y_END) {
                return;
            }
            
            const pos = gridToScreen(obs.x, obs.y);
            // Draw cardboard piece
            const rectSize = CELL_SIZE - 4;
            ctx.fillRect(pos.x - rectSize/2, pos.y - rectSize/2, rectSize, rectSize);
            ctx.strokeRect(pos.x - rectSize/2, pos.y - rectSize/2, rectSize, rectSize);
            
            // Draw inner score creases to look like folded cutout
            ctx.strokeStyle = '#8c826e';
            ctx.lineWidth = 1;
            ctx.strokeRect(pos.x - rectSize/2 + 4, pos.y - rectSize/2 + 4, rectSize - 8, rectSize - 8);
        });
        ctx.restore();

        // 5. Draw Food (Origami Charts / Shards)
        ctx.save();
        foodList.forEach(food => {
            if (isFolded && food.y >= FOLD_CREASE_Y_START && food.y <= FOLD_CREASE_Y_END) {
                return;
            }
            
            const pos = gridToScreen(food.x, food.y);
            
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(food.rotation);
            
            // Paper drop shadow
            ctx.shadowColor = 'rgba(61, 53, 42, 0.15)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;
            
            if (food.type === 'confetti') {
                // Colored paper square confetti
                ctx.fillStyle = 'var(--washi-red)';
                ctx.fillRect(-6, -6, 12, 12);
                // Highlight crease line
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
                ctx.stroke();
            } else if (food.type === 'crane_chart') {
                // Miniature Crane (Blue)
                ctx.fillStyle = 'var(--washi-blue)';
                ctx.beginPath();
                ctx.moveTo(0, -10); // Head
                ctx.lineTo(8, 2);   // Right Wing
                ctx.lineTo(2, 6);   // Tail base
                ctx.lineTo(0, 10);  // Tail tip
                ctx.lineTo(-2, 6);  // Tail left
                ctx.lineTo(-8, 2);  // Left wing
                ctx.closePath();
                ctx.fill();
                
                // Crease Lines
                ctx.strokeStyle = '#1d5e85';
                ctx.beginPath();
                ctx.moveTo(0, -10); ctx.lineTo(0, 10);
                ctx.moveTo(-8, 2); ctx.lineTo(8, 2);
                ctx.stroke();
            } else if (food.type === 'frog_chart') {
                // Miniature Frog (Green)
                ctx.fillStyle = 'var(--washi-green)';
                ctx.beginPath();
                ctx.moveTo(-8, -6);
                ctx.lineTo(8, -6);
                ctx.lineTo(6, 6);
                ctx.lineTo(-6, 6);
                ctx.closePath();
                ctx.fill();
                
                // Eyes/Leg folds
                ctx.fillStyle = '#396348';
                ctx.fillRect(-6, -8, 3, 3);
                ctx.fillRect(3, -8, 3, 3);
            } else if (food.type === 'boat_chart') {
                // Miniature Boat (Yellow)
                ctx.fillStyle = 'var(--washi-yellow)';
                ctx.beginPath();
                ctx.moveTo(-12, 0);
                ctx.lineTo(0, -6);
                ctx.lineTo(12, 0);
                ctx.lineTo(0, 6);
                ctx.closePath();
                ctx.fill();
                
                // Middle triangle sail
                ctx.fillStyle = '#a67d26';
                ctx.beginPath();
                ctx.moveTo(-4, 0);
                ctx.lineTo(0, -6);
                ctx.lineTo(4, 0);
                ctx.closePath();
                ctx.fill();
            }
            
            ctx.restore();
        });
        ctx.restore();

        // 6. Draw Paper Snake
        ctx.save();
        
        // Determine theme colors based on active transformation
        let bodyColor = 'var(--washi-red)';
        let accentColor = '#f38169'; // light orange-red
        let shadeColor = '#9a321e';  // dark shade red
        
        if (activeForm === 'crane') {
            bodyColor = 'var(--washi-blue)';
            accentColor = '#6eaed4';
            shadeColor = '#1d5e85';
        } else if (activeForm === 'frog') {
            bodyColor = 'var(--washi-green)';
            accentColor = '#80b892';
            shadeColor = '#396348';
        } else if (activeForm === 'boat') {
            bodyColor = 'var(--washi-yellow)';
            accentColor = '#f1cb75';
            shadeColor = '#926a1d';
        }
        
        ctx.shadowColor = 'rgba(61, 53, 42, 0.2)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 3;

        // Draw segments starting from tail to head (so head is drawn on top)
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            
            // Skip rendering if inside folded area
            if (isFolded && seg.y >= FOLD_CREASE_Y_START && seg.y <= FOLD_CREASE_Y_END) {
                continue;
            }
            
            const sPos = gridToScreen(seg.x, seg.y);
            
            ctx.save();
            ctx.translate(sPos.x, sPos.y);
            
            if (i === 0) {
                // --- RENDER HEAD ---
                // Rotate head according to moving direction
                let headAngle = Math.atan2(direction.y, direction.x);
                ctx.rotate(headAngle);
                
                if (activeForm === 'crane') {
                    // Origami Crane Head & Wings
                    ctx.fillStyle = bodyColor;
                    ctx.beginPath();
                    ctx.moveTo(15, 0);   // Beak
                    ctx.lineTo(2, -14);  // Left wing tip
                    ctx.lineTo(-4, -4);  // Left fold base
                    ctx.lineTo(-12, 0);  // Tail/Back fold
                    ctx.lineTo(-4, 4);   // Right fold base
                    ctx.lineTo(2, 14);   // Right wing tip
                    ctx.closePath();
                    ctx.fill();
                    
                    // Detail folds
                    ctx.fillStyle = accentColor;
                    ctx.beginPath();
                    ctx.moveTo(15, 0);
                    ctx.lineTo(2, -14);
                    ctx.lineTo(-4, 0);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.strokeStyle = shadeColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else if (activeForm === 'frog') {
                    // Origami Frog Shape
                    ctx.fillStyle = bodyColor;
                    ctx.beginPath();
                    ctx.moveTo(12, -8);
                    ctx.lineTo(12, 8);
                    ctx.lineTo(-12, 12);
                    ctx.lineTo(-8, 0);
                    ctx.lineTo(-12, -12);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Front fold facets
                    ctx.fillStyle = accentColor;
                    ctx.beginPath();
                    ctx.moveTo(12, -8);
                    ctx.lineTo(12, 8);
                    ctx.lineTo(0, 0);
                    ctx.closePath();
                    ctx.fill();
                } else if (activeForm === 'boat') {
                    // Origami Boat Shape
                    ctx.fillStyle = bodyColor;
                    ctx.beginPath();
                    ctx.moveTo(18, 0);   // Bow
                    ctx.lineTo(-4, -10); // Port
                    ctx.lineTo(-15, 0);  // Stern
                    ctx.lineTo(-4, 10);  // Starboard
                    ctx.closePath();
                    ctx.fill();
                    
                    // Center fold (sail)
                    ctx.fillStyle = accentColor;
                    ctx.beginPath();
                    ctx.moveTo(0, -6);
                    ctx.lineTo(5, 0);
                    ctx.lineTo(-5, 0);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Normal Origami Snake Head (Folded Hexagon / Diamond)
                    ctx.fillStyle = bodyColor;
                    ctx.beginPath();
                    ctx.moveTo(15, 0);
                    ctx.lineTo(3, -12);
                    ctx.lineTo(-12, -6);
                    ctx.lineTo(-12, 6);
                    ctx.lineTo(3, 12);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Geometric Fold Facets
                    ctx.fillStyle = accentColor;
                    ctx.beginPath();
                    ctx.moveTo(15, 0);
                    ctx.lineTo(3, -12);
                    ctx.lineTo(-3, 0);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.fillStyle = shadeColor;
                    ctx.beginPath();
                    ctx.moveTo(15, 0);
                    ctx.lineTo(3, 12);
                    ctx.lineTo(-3, 0);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Highlight Crease Lines
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(-12, 0);
                    ctx.lineTo(15, 0);
                    ctx.stroke();
                }
            } else {
                // --- RENDER BODY SEGMENTS ---
                // Alternating geometric folds for body link look
                const isOdd = (i % 2 === 0);
                ctx.rotate(isOdd ? 0 : Math.PI / 4);
                
                ctx.fillStyle = isOdd ? bodyColor : accentColor;
                
                // Draw a square segment with fold lines
                const bodySize = CELL_SIZE - 6 - Math.min(i * 0.4, 8); // Tapir size
                ctx.fillRect(-bodySize/2, -bodySize/2, bodySize, bodySize);
                
                // Inner creases
                ctx.strokeStyle = isOdd ? shadeColor : 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 1;
                ctx.strokeRect(-bodySize/2 + 2, -bodySize/2 + 2, bodySize - 4, bodySize - 4);
                
                // Diagonal cross crease
                ctx.beginPath();
                ctx.moveTo(-bodySize/2, -bodySize/2);
                ctx.lineTo(bodySize/2, bodySize/2);
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.restore();

        // 7. Draw Space Fold Crease overlay & shadows on Canvas
        if (isFolded) {
            ctx.save();
            const creaseY = FOLD_CREASE_Y_START * CELL_SIZE; // 8 * 30 = 240px
            
            // Draw a thick horizontal fold seam
            ctx.strokeStyle = '#d3caaf';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, creaseY);
            ctx.lineTo(canvas.width, creaseY);
            ctx.stroke();
            
            // Draw dash folding indicators along crease Y
            ctx.strokeStyle = 'rgba(61, 53, 42, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, creaseY - 3); ctx.lineTo(canvas.width, creaseY - 3);
            ctx.moveTo(0, creaseY + 3); ctx.lineTo(canvas.width, creaseY + 3);
            ctx.stroke();
            
            // Render 3D Paper fold lighting gradients
            // Top half shadows bending inward
            const gradTop = ctx.createLinearGradient(0, creaseY - 40, 0, creaseY);
            gradTop.addColorStop(0, 'rgba(61, 53, 42, 0)');
            gradTop.addColorStop(1, 'rgba(61, 53, 42, 0.15)');
            ctx.fillStyle = gradTop;
            ctx.fillRect(0, creaseY - 40, canvas.width, 40);
            
            // Bottom half shadows bending inward
            const gradBot = ctx.createLinearGradient(0, creaseY, 0, creaseY + 40);
            gradBot.addColorStop(0, 'rgba(61, 53, 42, 0.15)');
            gradBot.addColorStop(1, 'rgba(61, 53, 42, 0)');
            ctx.fillStyle = gradBot;
            ctx.fillRect(0, creaseY, canvas.width, 40);
            
            ctx.restore();
        }

        // 8. Render Particles
        ctx.save();
        particles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
            ctx.restore();
        });
        ctx.restore();
    }

    // --- UI Interactions ---

    const startScreen = document.getElementById('start-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    const pauseScreen = document.getElementById('pause-screen');
    
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const resumeBtn = document.getElementById('resume-btn');

    startBtn.addEventListener('click', () => {
        initAudio();
        startScreen.classList.add('hidden');
        resetGame();
        isPlaying = true;
    });

    restartBtn.addEventListener('click', () => {
        initAudio();
        gameoverScreen.classList.add('hidden');
        resetGame();
        isPlaying = true;
    });

    // Pause toggle logic via canvas click / focus
    canvas.addEventListener('click', () => {
        if (!isPlaying || isGameOver) return;
        
        initAudio();
        isPaused = !isPaused;
        if (isPaused) {
            pauseScreen.classList.remove('hidden');
        } else {
            pauseScreen.classList.add('hidden');
        }
    });

    resumeBtn.addEventListener('click', () => {
        initAudio();
        isPaused = false;
        pauseScreen.classList.add('hidden');
    });

    // --- Initialize Engine ---
    requestAnimationFrame(loop);
});
