/**
 * game.js - 影戏乾坤: 光影偶蛇 (Shadow Play Snake)
 * Author: Antigravity Team
 * Date: 2026-07-19
 */

// --- 游戏引擎状态 ---
const state = {
    // Canvas & Context
    canvas: null,
    ctx: null,
    
    // 游戏循环控制
    isRunning: false,
    isPaused: false,
    lastTime: 0,
    animationFrameId: null,
    
    // 核心账目数据
    score: 0,
    highScore: 0,
    
    // 操控设置
    controlMode: 'pointer', // 'pointer' (指引/触控拖拽) 或 'keyboard' (键盘 A/D)
    mousePos: { x: 300, y: 350 },
    keys: {},
    
    // 皮影蛇配置
    snake: {
        x: 300,
        y: 400,
        angle: -Math.PI / 2, // 初始向上游动
        targetAngle: -Math.PI / 2,
        speed: 2.2,
        baseSpeed: 2.2,
        size: 14,
        segmentSpacing: 12,
        segments: [], // 数组存储 {x, y, angle, colorType}
        invincibleTimer: 0, // 五彩琉璃状态剩余时间 (ms)
        freezeTimer: 0, // 定影状态剩余时间 (ms)
        speedTimer: 0, // 烛火暴走加速状态 (ms)
    },
    
    // 烛火光源
    candle: {
        x: 300,
        y: 30,
        swingTime: 0,
        swingSpeed: 0.015,     // 基础角速度
        baseSwingSpeed: 0.015,
        swingAmplitude: 240,   // 摆动幅度
        centerX: 300,
        kickForce: 0,          // 拨火赋予的额外角速度
    },
    
    // 戏台障碍源 (假山、屏风)
    obstacles: [
        { id: 1, x: 180, y: 220, r: 30, type: 'mountain', name: '焦墨假山' },
        { id: 2, x: 420, y: 220, r: 35, type: 'screen', name: '镂花屏风' },
        { id: 3, x: 300, y: 380, r: 25, type: 'tree', name: '古松剪影' }
    ],
    
    // 投影死区缓存
    shadows: [],
    
    // 戏台道具与食物
    entities: [],
    particles: [], // 散落的关节碎片
    
    // 音效引擎状态
    audioEnabled: true,
    synth: null
};

// --- Web Audio 声音合成器 (中式打击乐与丝竹) ---
class AudioSynth {
    constructor() {
        this.ctx = null;
        this.compressor = null;
        this.bowlOscs = [];
        this.bowlGain = null;
        this.playTickTimer = 0;
    }

    init() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            
            // 动态压缩器，保护耳朵并防止爆音
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-15, this.ctx.currentTime);
            this.compressor.knee.setValueAtTime(20, this.ctx.currentTime);
            this.compressor.ratio.setValueAtTime(10, this.ctx.currentTime);
            this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
            this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);
            this.compressor.connect(this.ctx.destination);
            
            this.startZenBGM();
        } catch (e) {
            console.error("音频初始化失败:", e);
        }
    }

    // 颂钵背景禅音 (深沉平稳的嗡嗡声)
    startZenBGM() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        this.bowlGain = this.ctx.createGain();
        this.bowlGain.gain.setValueAtTime(state.audioEnabled ? 0.15 : 0.0, now);
        this.bowlGain.connect(this.compressor);

        // 3个低频正弦波叠加，微小差频产生自然波动
        const freqs = [120.0, 120.4, 240.2];
        freqs.forEach(f => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);
            osc.connect(this.bowlGain);
            osc.start();
            this.bowlOscs.push(osc);
        });
    }

    setBGMVolume(volume) {
        if (this.bowlGain && this.ctx) {
            this.bowlGain.gain.linearRampToValueAtTime(state.audioEnabled ? volume : 0, this.ctx.currentTime + 0.1);
        }
    }

    // 皮影游动的关节碰撞声 (微弱的竹木沙沙)
    playTick() {
        if (!this.ctx || !state.audioEnabled || state.isPaused) return;
        const now = this.ctx.currentTime;
        
        // 限制触发频率
        if (now - this.playTickTimer < 0.12) return;
        this.playTickTimer = now;

        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.02, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2500, now);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.015, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.compressor);

        noise.start(now);
    }

    // 吞噬织蛾 (清脆的梆子声)
    playEatMoth(score) {
        if (!this.ctx || !state.audioEnabled) return;
        const now = this.ctx.currentTime;

        // 根据长度或者连击数使音高略微变化
        const baseFreq = 750 + (score % 5) * 60;

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.setValueAtTime(baseFreq * 0.5, now + 0.01); // 快速下滑音产生敲击硬质感

        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gainNode);
        gainNode.connect(this.compressor);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    // 吃定影烛泪 (碰铃清脆余音)
    playBell() {
        if (!this.ctx || !state.audioEnabled) return;
        const now = this.ctx.currentTime;

        // 使用两个极高频正弦波产生拍频
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(2200, now);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2204, now);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.compressor);

        osc1.start(now);
        osc2.start(now);
        
        osc1.stop(now + 2.1);
        osc2.stop(now + 2.1);
    }

    // 拨动火烛 (低沉堂鼓)
    playDrum() {
        if (!this.ctx || !state.audioEnabled) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

        gainNode.gain.setValueAtTime(0.45, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gainNode);
        gainNode.connect(this.compressor);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    // 散架死亡 (京剧大锣哐——)
    playGong() {
        if (!this.ctx || !state.audioEnabled) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        // 大锣声有特殊的急速下行滑频
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.6);

        // 叠加微弱的白噪声金属杂音
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.08, now);

        gainNode.gain.setValueAtTime(0.55, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc.connect(gainNode);
        noise.connect(noiseGain);
        noiseGain.connect(gainNode);
        
        gainNode.connect(this.compressor);

        osc.start(now);
        noise.start(now);
        
        osc.stop(now + 2.0);
    }
}

// --- 初始化与 DOM 挂载 ---
window.addEventListener('DOMContentLoaded', () => {
    state.canvas = document.getElementById('game-canvas');
    state.ctx = state.canvas.getContext('2d');
    state.synth = new AudioSynth();
    
    // 读取历史最高分
    state.highScore = parseInt(localStorage.getItem('shadow_play_high_score') || '0', 10);
    document.getElementById('high-score').innerText = state.highScore;
    
    bindEvents();
    resizeCanvas();
    resetGame();
    
    // 初始化戏台背景
    drawParchmentBackground();
});

// 处理 Canvas 大小以适应移动端
function resizeCanvas() {
    if (!state.canvas) return;
    const container = state.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    // 强制 Canvas 内部分辨率始终保持 600x600 的虚拟网格，以确保投影数学计算在不同屏幕尺寸下完全一致
    state.canvas.width = 600;
    state.canvas.height = 600;
}

window.addEventListener('resize', resizeCanvas);

// --- 绑定交互事件 ---
function bindEvents() {
    // 操控模式选择
    const controlSelect = document.getElementById('control-select');
    controlSelect.addEventListener('change', (e) => {
        state.controlMode = e.target.value;
    });

    // 音效开关
    const soundToggle = document.getElementById('sound-toggle');
    soundToggle.addEventListener('change', (e) => {
        state.audioEnabled = e.target.checked;
        if (state.synth) {
            state.synth.setBGMVolume(state.audioEnabled ? 0.15 : 0);
        }
    });

    // 开始游戏
    document.getElementById('start-btn').addEventListener('click', () => {
        startPlaying();
    });

    // 重新开始
    document.getElementById('restart-btn').addEventListener('click', () => {
        resetGame();
        startPlaying();
    });

    // 继续游戏
    document.getElementById('resume-btn').addEventListener('click', () => {
        resumePlaying();
    });

    // PC 键盘监听
    window.addEventListener('keydown', (e) => {
        // 阻止可能导致页面滚动的默认行为
        if ([' ', 'Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) || e.code === 'Space') {
            e.preventDefault();
        }
        
        state.keys[e.key] = true;
        
        // 空格拨动火烛
        if (e.key === ' ' || e.code === 'Space') {
            kickCandle();
        }
        
        // P 键暂停
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            togglePause();
        }
    });

    window.addEventListener('keyup', (e) => {
        state.keys[e.key] = false;
    });

    // PC 鼠标牵引 (只在 pointer 模式下)
    state.canvas.addEventListener('mousemove', (e) => {
        if (state.controlMode !== 'pointer') return;
        updateMousePos(e.clientX, e.clientY);
    });

    // 移动端触控拖动 (只在 pointer 模式下)
    let touchActive = false;
    const handleTouch = (e) => {
        if (state.controlMode !== 'pointer' || e.touches.length === 0) return;
        const touch = e.touches[0];
        updateMousePos(touch.clientX, touch.clientY);
    };

    state.canvas.addEventListener('touchstart', (e) => {
        // 防止页面滚动
        e.preventDefault();
        touchActive = true;
        handleTouch(e);
        // 如果音频未激活，在触碰时激活
        tryActivateAudio();
    });

    state.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (touchActive) handleTouch(e);
    });

    state.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchActive = false;
    });

    // 移动端拨火按钮
    const mobileFireBtn = document.getElementById('mobile-fire-btn');
    mobileFireBtn.addEventListener('click', (e) => {
        e.preventDefault();
        kickCandle();
    });
}

function updateMousePos(clientX, clientY) {
    const rect = state.canvas.getBoundingClientRect();
    // 映射到 600x600 逻辑空间
    state.mousePos.x = ((clientX - rect.left) / rect.width) * state.canvas.width;
    state.mousePos.y = ((clientY - rect.top) / rect.height) * state.canvas.height;
}

function tryActivateAudio() {
    if (!state.synth) return;
    if (!state.synth.ctx) {
        state.synth.init();
    }
    if (state.synth.ctx && state.synth.ctx.state === 'suspended') {
        state.synth.ctx.resume();
    }
}

// --- 游戏流程操控 ---
function startPlaying() {
    tryActivateAudio();
    
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    
    state.isRunning = true;
    state.isPaused = false;
    state.lastTime = performance.now();
    
    if (state.synth) {
        state.synth.setBGMVolume(0.15);
    }
    
    state.animationFrameId = requestAnimationFrame(gameLoop);
}

function resetGame() {
    state.score = 0;
    document.getElementById('current-score').innerText = '0';
    
    // 重置蛇身：初始在中间偏下
    state.snake.x = 300;
    state.snake.y = 450;
    state.snake.angle = -Math.PI / 2;
    state.snake.targetAngle = -Math.PI / 2;
    state.snake.speed = state.snake.baseSpeed;
    state.snake.invincibleTimer = 0;
    state.snake.freezeTimer = 0;
    state.snake.speedTimer = 0;
    state.snake.segments = [];
    
    // 初始段长度为 15 节，每节相距 spacing 像素
    for (let i = 0; i < 15; i++) {
        state.snake.segments.push({
            x: 300,
            y: 450 + i * state.snake.segmentSpacing,
            angle: -Math.PI / 2,
            colorType: i % 2 === 0 ? 'vermilion' : 'jade'
        });
    }
    
    updateLengthHUD();

    // 烛火重置
    state.candle.swingTime = 0;
    state.candle.kickForce = 0;
    state.candle.swingSpeed = state.candle.baseSwingSpeed;
    
    // 清空元素和粒子
    state.entities = [];
    state.particles = [];
    
    // 随机播撒一些初始食物
    for (let i = 0; i < 4; i++) {
        spawnEntity('moth');
    }
    
    // 每 6 秒生成一个特殊道具
    state.itemSpawnTimer = 0;
}

function updateLengthHUD() {
    const len = state.snake.segments.length;
    document.getElementById('snake-length-text').innerText = len + ' 节';
    // 设置最大满值比例 (例如 40 节为 100%)
    const pct = Math.min(100, (len / 40) * 100);
    document.getElementById('snake-length-bar').style.width = pct + '%';
}

function togglePause() {
    if (!state.isRunning) return;
    if (state.isPaused) {
        resumePlaying();
    } else {
        pausePlaying();
    }
}

function pausePlaying() {
    state.isPaused = true;
    document.getElementById('pause-screen').classList.remove('hidden');
    if (state.synth) {
        state.synth.setBGMVolume(0.04);
    }
}

function resumePlaying() {
    document.getElementById('pause-screen').classList.add('hidden');
    state.isPaused = false;
    state.lastTime = performance.now();
    if (state.synth) {
        state.synth.setBGMVolume(0.15);
    }
}

function gameOver(reason) {
    state.isRunning = false;
    cancelAnimationFrame(state.animationFrameId);
    
    if (state.synth) {
        state.synth.playGong();
        state.synth.setBGMVolume(0);
    }
    
    // 更新最高纪录
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('shadow_play_high_score', state.highScore);
        document.getElementById('high-score').innerText = state.highScore;
    }
    
    document.getElementById('death-reason').innerHTML = reason;
    document.getElementById('final-score').innerText = state.score;
    document.getElementById('final-high').innerText = state.highScore;
    document.getElementById('gameover-screen').classList.remove('hidden');
}

// 拨火操作
function kickCandle() {
    if (state.isPaused || !state.isRunning) return;
    state.candle.kickForce += 0.22; // 瞬时加速角速度
    if (state.synth) {
        state.synth.playDrum();
    }
    // 产生烛火闪烁微粒
    createSparks(state.candle.x, state.candle.y, '#ffdf9e', 8);
}

// --- 游戏实体生成器 ---
function spawnEntity(type) {
    let x, y, safe = false;
    let attempts = 0;
    
    // 尽量把道具随机撒到不受阴影和障碍物理碰撞的区域
    while (!safe && attempts < 50) {
        attempts++;
        x = 40 + Math.random() * 520;
        y = 80 + Math.random() * 460;
        
        // 避开圆心障碍物本身
        safe = true;
        for (const obs of state.obstacles) {
            const dx = x - obs.x;
            const dy = y - obs.y;
            if (Math.sqrt(dx*dx + dy*dy) < obs.r + 20) {
                safe = false;
                break;
            }
        }
        // 不能离蛇头太近
        const sDx = x - state.snake.x;
        const sDy = y - state.snake.y;
        if (Math.sqrt(sDx*sDx + sDy*sDy) < 50) {
            safe = false;
        }
    }
    
    const items = {
        moth: { type: 'moth', x, y, r: 8, color: '#12cbc4', value: 10, label: '蛾' },
        wax: { type: 'wax', x, y, r: 8, color: '#ffdf9e', value: 20, label: '油' },
        glaze: { type: 'glaze', x, y, r: 8, color: '#e056fd', value: 30, label: '璃' },
        flare: { type: 'flare', x, y, r: 8, color: '#ff4757', value: 15, label: '炎' }
    };
    
    state.entities.push(items[type]);
}

// --- 散落关节微粒发射 ---
function createSparks(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        state.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5, // 向上喷射
            r: 2 + Math.random() * 3,
            color,
            alpha: 1,
            decay: 0.02 + Math.random() * 0.02,
            gravity: 0.05
        });
    }
}

function spawnShatterJoints(segments) {
    segments.forEach(seg => {
        // 每个断掉的节段化为飞散的带有初速度和角速度的牛皮残片
        state.particles.push({
            x: seg.x,
            y: seg.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 + 1.5, // 向下掉落
            r: 10, // 与关节尺寸差不多
            angle: seg.angle,
            vAngle: (Math.random() - 0.5) * 0.1,
            color: seg.colorType === 'vermilion' ? '#b63d2f' : '#2b704c',
            alpha: 1.0,
            decay: 0.015,
            gravity: 0.2, // 较重重力
            isJoint: true
        });
    });
}

// --- 游戏物理与更新 (Physics & Update) ---
function gameLoop(time) {
    if (!state.isRunning) return;
    
    // 如果浏览器被置于后台或卡顿，限制最大时间差
    let dt = time - state.lastTime;
    if (dt > 100) dt = 16.66;
    state.lastTime = time;
    
    if (!state.isPaused) {
        update(dt);
    }
    
    render();
    
    state.animationFrameId = requestAnimationFrame(gameLoop);
}

function update(dt) {
    // 1. 更新特殊状态计时器 (毫秒) - 确保不递减为负数
    if (state.snake.invincibleTimer > 0) {
        state.snake.invincibleTimer = Math.max(0, state.snake.invincibleTimer - dt);
    }
    if (state.snake.freezeTimer > 0) {
        state.snake.freezeTimer = Math.max(0, state.snake.freezeTimer - dt);
    }
    if (state.snake.speedTimer > 0) {
        state.snake.speedTimer = Math.max(0, state.snake.speedTimer - dt);
    }
    
    // 2. 烛火物理摆动
    updateCandle(dt);
    
    // 3. 计算投射阴影
    calculateShadows();
    
    // 4. 蛇运动转向逻辑
    updateSnakeDirection();
    
    // 5. 蛇身体前行
    moveSnake();
    
    // 6. 边缘与自身碰撞检测 (脱节容错)
    checkSnakeCollisions();
    
    // 7. 检测与食物/道具碰撞
    checkEntityCollisions();
    
    // 8. 场景道具生成定时器
    updateSpawnTimer(dt);
    
    // 9. 更新粒子系统
    updateParticles(dt);
}

// 烛火简谐钟摆运算
function updateCandle(dt) {
    const c = state.candle;
    
    // 如果有定影状态，烛火速度归零
    if (state.snake.freezeTimer > 0) {
        c.kickForce = 0;
        document.getElementById('candle-hud-status').innerText = '定影中';
        // 缓慢将烛火拉回中心点，或者保持当时位置
        return;
    }
    
    // 拨火的额外力有阻力消耗
    if (c.kickForce > 0) {
        c.kickForce -= 0.001 * dt;
        if (c.kickForce < 0) c.kickForce = 0;
    }
    
    c.swingSpeed = c.baseSwingSpeed + c.kickForce;
    c.swingTime += c.swingSpeed * (dt / 16.66);
    
    // 烛火 X 轴位置简谐摆动
    c.x = c.centerX + Math.sin(c.swingTime) * c.swingAmplitude;
    
    // 更新 HUD 指针
    const angleRad = Math.sin(c.swingTime) * (Math.PI / 4.5); // 指针最大偏转弧度
    const angleDeg = angleRad * (180 / Math.PI);
    document.getElementById('candle-pointer').style.transform = `rotate(${angleDeg}deg)`;
    document.getElementById('candle-hud-status').innerText = c.kickForce > 0.05 ? '狂摆中🔥' : '摇曳中';
}

// 计算圆心障碍物投影的四边形阴影
function calculateShadows() {
    state.shadows = [];
    const lx = state.candle.x;
    const ly = state.candle.y;
    
    state.obstacles.forEach(obs => {
        const cx = obs.x;
        const cy = obs.y;
        const r = obs.r;
        
        // 光源到圆心的向量
        const dx = cx - lx;
        const dy = cy - ly;
        const dLen = Math.sqrt(dx*dx + dy*dy);
        if (dLen === 0) return;
        
        // 与光线垂直的法向量 (标准化)
        const ux = -dy / dLen;
        const uy = dx / dLen;
        
        // 圆在法向量方向上的两侧切点极值
        const v1x = cx - r * ux;
        const v1y = cy - r * uy;
        
        const v2x = cx + r * ux;
        const v2y = cy + r * uy;
        
        // 投影射线延长线 (投射到 1200 像素远，远远超出 600x600 边缘)
        const extend = 1200;
        
        const ray1x = v1x - lx;
        const ray1y = v1y - ly;
        const r1Len = Math.sqrt(ray1x*ray1x + ray1y*ray1y);
        const p1x = lx + (ray1x / r1Len) * extend;
        const p1y = ly + (ray1y / r1Len) * extend;
        
        const ray2x = v2x - lx;
        const ray2y = v2y - ly;
        const r2Len = Math.sqrt(ray2x*ray2x + ray2y*ray2y);
        const p2x = lx + (ray2x / r2Len) * extend;
        const p2y = ly + (ray2y / r2Len) * extend;
        
        // 阴影四边形顶点集 (V1 -> P1 -> P2 -> V2)
        state.shadows.push({
            polygon: [
                { x: v1x, y: v1y },
                { x: p1x, y: p1y },
                { x: p2x, y: p2y },
                { x: v2x, y: v2y }
            ],
            obsId: obs.id
        });
    });
}

// 蛇角改变平滑牵引
function updateSnakeDirection() {
    const s = state.snake;
    
    if (state.controlMode === 'pointer') {
        // 平滑追随鼠标/指引位置
        const dx = state.mousePos.x - s.x;
        const dy = state.mousePos.y - s.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // 距离大于 8 像素才调整朝向，避免原地颤抖
        if (dist > 8) {
            s.targetAngle = Math.atan2(dy, dx);
            
            // 平滑差值过渡，产生竹偶的柔韧感
            let angleDiff = s.targetAngle - s.angle;
            
            // 环形夹角标准化
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            
            s.angle += angleDiff * 0.12;
        }
    } else {
        // 键盘控制模式：左右键进行偏航角改变
        let turnSpeed = 0.05;
        if (state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A']) {
            s.angle -= turnSpeed;
        }
        if (state.keys['ArrowRight'] || state.keys['d'] || state.keys['D']) {
            s.angle += turnSpeed;
        }
    }
}

// 蛇身体位移
function moveSnake() {
    const s = state.snake;
    
    // 速度调控 (五彩琉璃/烛火暴走时移速爆发)
    let currentSpeed = s.baseSpeed;
    if (s.speedTimer > 0) {
        currentSpeed = s.baseSpeed * 1.25; // 暴走 1.25倍
    } else if (s.freezeTimer > 0) {
        currentSpeed = s.baseSpeed * 0.85;  // 定影减速更安全
    }
    s.speed = currentSpeed;
    
    // 发送游动声
    if (state.synth) {
        state.synth.playTick();
    }
    
    // 蛇头前进
    s.x += Math.cos(s.angle) * s.speed;
    s.y += Math.sin(s.angle) * s.speed;
    
    // 蛇身节点追随逻辑
    if (s.segments.length > 0) {
        let prevX = s.x;
        let prevY = s.y;
        let prevAngle = s.angle;
        
        for (let i = 0; i < s.segments.length; i++) {
            const seg = s.segments[i];
            const dx = prevX - seg.x;
            const dy = prevY - seg.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > s.segmentSpacing) {
                // 向前一个节点拉近
                const angle = Math.atan2(dy, dx);
                seg.x = prevX - Math.cos(angle) * s.segmentSpacing;
                seg.y = prevY - Math.sin(angle) * s.segmentSpacing;
                seg.angle = angle;
            }
            
            prevX = seg.x;
            prevY = seg.y;
            prevAngle = seg.angle;
        }
    }
}

// 碰撞检测与脱节机制
function checkSnakeCollisions() {
    const s = state.snake;
    
    // 1. 致命阴影碰撞 (只有在非五彩琉璃无敌下生效)
    if (s.invincibleTimer <= 0) {
        const headPt = { x: s.x, y: s.y };
        
        for (const sh of state.shadows) {
            if (isPointInPolygon(headPt, sh.polygon)) {
                gameOver(`皮影长蛇被<b>“摇摆烛光拉长的阴影”</b>吞没！<br>光影烧灼导致偶人木架瞬间焦裂烧毁。`);
                return;
            }
        }
    }
    
    // 2. 撞击假山屏风障碍物 (自身)
    for (const obs of state.obstacles) {
        const dx = s.x - obs.x;
        const dy = s.y - obs.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < obs.r + s.size * 0.4) {
            triggerDisconnection('obstacle', obs.name);
            return;
        }
    }
    
    // 3. 边界碰撞 (戏台木框)
    if (s.x < 15 || s.x > 585 || s.y < 50 || s.y > 585) {
        triggerDisconnection('boundary');
        return;
    }
    
    // 4. 咬尾碰撞 (前 20 节不作咬尾检测，防止误触)
    for (let i = 20; i < s.segments.length; i++) {
        const seg = s.segments[i];
        const dx = s.x - seg.x;
        const dy = s.y - seg.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < s.size * 0.6) {
            triggerDisconnection('self', i);
            return;
        }
    }
}

// 脱节处理函数
function triggerDisconnection(cause, details) {
    const s = state.snake;
    
    // 处于无敌保护期内，对边缘和障碍物撞击进行安全弹避，防止卡死
    if (s.invincibleTimer > 0) {
        if (cause === 'boundary') {
            s.x = Math.max(20, Math.min(580, s.x));
            s.y = Math.max(55, Math.min(580, s.y));
            s.angle += Math.PI; // 转向反方向
        } else if (cause === 'obstacle') {
            const obs = state.obstacles.find(o => o.name === details);
            if (obs) {
                const angleToObs = Math.atan2(s.y - obs.y, s.x - obs.x);
                s.angle = angleToObs; // 朝向远离障碍物的方向
                s.x = obs.x + Math.cos(angleToObs) * (obs.r + s.size * 0.6 + 5);
                s.y = obs.y + Math.sin(angleToObs) * (obs.r + s.size * 0.6 + 5);
            } else {
                s.angle = Math.atan2(300 - s.y, 300 - s.x);
            }
        }
        return;
    }
    
    let disconnectIndex = 0;
    let desc = '';
    
    if (cause === 'boundary') {
        disconnectIndex = Math.floor(s.segments.length / 2);
        desc = `偶蛇撞击到了<b>戏台红木边框</b>！`;
        s.angle = Math.atan2(300 - s.y, 300 - s.x);
        // 强制推离边界，防粘连
        s.x = Math.max(20, Math.min(580, s.x));
        s.y = Math.max(55, Math.min(580, s.y));
    } else if (cause === 'obstacle') {
        disconnectIndex = Math.floor(s.segments.length / 2);
        desc = `偶蛇与<b>“${details}”</b>发生激烈冲撞！`;
        s.angle = Math.atan2(300 - s.y, 300 - s.x);
        // 物理弹回，并将蛇头向外推开一段距离
        const obs = state.obstacles.find(o => o.name === details);
        if (obs) {
            const angleToObs = Math.atan2(s.y - obs.y, s.x - obs.x);
            s.x = obs.x + Math.cos(angleToObs) * (obs.r + s.size * 0.6 + 8);
            s.y = obs.y + Math.sin(angleToObs) * (obs.r + s.size * 0.6 + 8);
        }
    } else if (cause === 'self') {
        disconnectIndex = details;
        desc = `皮影蛇缠绕咬碎了<b>自身的关节</b>！`;
        // 自咬时反转蛇头朝向，阻止继续穿入剩下身体
        s.angle += Math.PI;
    }
    
    // 切割蛇身
    const intactCount = disconnectIndex;
    const brokenCount = s.segments.length - disconnectIndex;
    
    if (intactCount < 3) {
        gameOver(`${desc}<br>皮影骨架完全散架坍塌，大戏终演。`);
        return;
    }
    
    // 产生断裂音效 (大锣敲击 & 爆裂声)
    if (state.synth) {
        state.synth.playDrum();
    }
    
    const brokenSegments = s.segments.slice(disconnectIndex);
    s.segments = s.segments.slice(0, disconnectIndex);
    
    spawnShatterJoints(brokenSegments);
    
    // 得分折损惩罚 (最多扣除 50% 赏金)
    const penalty = Math.floor(state.score * 0.15);
    state.score = Math.max(0, state.score - penalty);
    document.getElementById('current-score').innerText = state.score;
    
    updateLengthHUD();
    
    // 给玩家 1.5 秒的无敌保护期，防止刚断节就被旁边的阴影立刻烧毁
    s.invincibleTimer = 1500;
}

// 射线交叉检测点是否在阴影多边形内
function isPointInPolygon(point, polygon) {
    const x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// 检测与道具的碰撞
function checkEntityCollisions() {
    const s = state.snake;
    
    for (let i = state.entities.length - 1; i >= 0; i--) {
        const item = state.entities[i];
        const dx = s.x - item.x;
        const dy = s.y - item.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < s.size * 0.8 + item.r) {
            // 拾取成功
            state.entities.splice(i, 1);
            
            // 产生火花特效
            createSparks(item.x, item.y, item.color, 12);
            
            if (item.type === 'moth') {
                // 吃织蛾：长一节，得分
                state.score += item.value;
                if (state.synth) {
                    state.synth.playEatMoth(state.score);
                }
                
                // 蛇尾巴处添加一节
                const last = s.segments.length > 0 ? s.segments[s.segments.length - 1] : s;
                s.segments.push({
                    x: last.x,
                    y: last.y + s.segmentSpacing,
                    angle: last.angle,
                    colorType: s.segments.length % 2 === 0 ? 'vermilion' : 'jade'
                });
                updateLengthHUD();
                
                // 补撒一个食物
                spawnEntity('moth');
            }
            else if (item.type === 'wax') {
                // 烛泪定影
                s.freezeTimer = 5000; // 5秒定影
                state.score += item.value;
                if (state.synth) {
                    state.synth.playBell();
                }
            }
            else if (item.type === 'glaze') {
                // 五彩琉璃无敌
                s.invincibleTimer = 5000; // 5秒无敌
                state.score += item.value;
                if (state.synth) {
                    state.synth.playBell();
                }
            }
            else if (item.type === 'flare') {
                // 烛火暴走加速
                s.speedTimer = 6000; // 6秒加速
                state.score += item.value;
                if (state.synth) {
                    state.synth.playEatMoth(state.score);
                }
                // 拨火加速
                state.candle.kickForce += 0.15;
            }
            
            document.getElementById('current-score').innerText = state.score;
        }
    }
}

// 道具定时生成
function updateSpawnTimer(dt) {
    state.itemSpawnTimer += dt;
    if (state.itemSpawnTimer > 7000) { // 7秒随机扔一个特殊道具
        state.itemSpawnTimer = 0;
        
        // 限制特殊道具最大数量，防止塞满屏幕
        const specials = state.entities.filter(e => e.type !== 'moth').length;
        if (specials < 3) {
            const types = ['wax', 'glaze', 'flare'];
            const randType = types[Math.floor(Math.random() * types.length)];
            spawnEntity(randType);
        }
    }
}

// 更新粒子与残肢碎片
function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.vy += p.gravity; // 施加重力
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        
        if (p.isJoint) {
            p.angle += p.vAngle; // 残肢旋转
        }
        
        if (p.alpha <= 0 || p.y > 620) {
            state.particles.splice(i, 1);
        }
    }
}

// --- 渲染系统 (Render System) ---
function render() {
    const ctx = state.ctx;
    if (!ctx) return;
    
    ctx.clearRect(0, 0, 600, 600);
    
    // 1. 绘制带烛光色温晕染的牛皮纸幕布背景
    drawParchmentBackground();
    
    // 2. 绘制烛光阴影多边形 (致命区)
    drawShadows();
    
    // 3. 绘制实体 (食物、道具)
    drawEntities();
    
    // 4. 绘制障碍物本身
    drawObstacles();
    
    // 5. 绘制皮影蛇
    drawSnake();
    
    // 6. 绘制碎屑与残骸粒子
    drawParticles();
    
    // 7. 绘制戏台烛火吊挂光源 (顶部)
    drawCandleLantern();
    
    // 8. 绘制戏台红木木框修饰内边框
    drawInnerFrame();
}

// 绘制牛皮纸张底纹和动态烛光发光晕染
function drawParchmentBackground() {
    const ctx = state.ctx;
    const lx = state.candle.x;
    const ly = state.candle.y;
    
    // 创建一个以烛火为光源中心的径向渐变
    // 五彩琉璃状态时，光源带有彩虹炫光
    let grad = ctx.createRadialGradient(lx, ly, 15, lx, ly, 750);
    
    if (state.snake.invincibleTimer > 0) {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.2, '#fff2db');
        grad.addColorStop(0.5, '#eec8f2');
        grad.addColorStop(0.8, '#dceaf6');
        grad.addColorStop(1, '#cdc3b4');
    } else {
        grad.addColorStop(0, '#fff6db'); // 光心亮色
        grad.addColorStop(0.4, '#f5edd7'); // 主体纸张米黄色
        grad.addColorStop(1, '#c2b090');   // 边缘暗黄
    }
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 600);
    
    // 绘制牛皮纸的细微横向纤维纹理
    ctx.save();
    ctx.strokeStyle = 'rgba(44, 26, 19, 0.04)';
    ctx.lineWidth = 1;
    for (let y = 50; y < 600; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(600, y);
        ctx.stroke();
    }
    ctx.restore();
}

// 绘制所有投影阴影
function drawShadows() {
    const ctx = state.ctx;
    ctx.save();
    
    state.shadows.forEach(sh => {
        ctx.beginPath();
        ctx.moveTo(sh.polygon[0].x, sh.polygon[0].y);
        for (let i = 1; i < sh.polygon.length; i++) {
            ctx.lineTo(sh.polygon[i].x, sh.polygon[i].y);
        }
        ctx.closePath();
        
        // 羽化边缘，模拟漫反射半影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 8;
        
        ctx.fillStyle = 'rgba(15, 8, 4, 0.72)'; // 炭黑半透明
        ctx.fill();
    });
    
    ctx.restore();
}

// 绘制屏风和假山物理障碍物自身
function drawObstacles() {
    const ctx = state.ctx;
    ctx.save();
    
    state.obstacles.forEach(obs => {
        // 圆形阴影修饰
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI*2);
        
        // 障碍物采用中国皮影中典型的雕花镂刻山石效果
        ctx.fillStyle = '#2c1a13'; // 褐木色
        ctx.strokeStyle = '#d4af37'; // 暗金描边
        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();
        
        // 内部镂空花纹装饰
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.r * 0.75, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 在中间绘制祥云或折线表示镂刻花纹
        ctx.beginPath();
        ctx.moveTo(obs.x - obs.r * 0.5, obs.y);
        ctx.quadraticCurveTo(obs.x, obs.y - obs.r * 0.3, obs.x + obs.r * 0.5, obs.y);
        ctx.quadraticCurveTo(obs.x, obs.y + obs.r * 0.3, obs.x - obs.r * 0.5, obs.y);
        ctx.strokeStyle = '#d4af37';
        ctx.stroke();
        
        // 文字标牌
        ctx.fillStyle = 'rgba(246, 235, 212, 0.3)';
        ctx.font = '10px "Noto Serif SC"';
        ctx.textAlign = 'center';
        ctx.fillText(obs.name, obs.x, obs.y + 4);
    });
    
    ctx.restore();
}

// 绘制皮影蛇
function drawSnake() {
    const ctx = state.ctx;
    const s = state.snake;
    
    if (s.segments.length === 0) return;
    
    ctx.save();
    
    // 如果无敌，开启彩虹流光滤镜
    const isInvincible = s.invincibleTimer > 0;
    const isFlickering = isInvincible && Math.floor(state.snake.invincibleTimer / 100) % 2 === 0;
    
    // 绘制连线铆钉 (先连骨骼架，产生提线木偶风格)
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    s.segments.forEach(seg => {
        ctx.lineTo(seg.x, seg.y);
    });
    ctx.strokeStyle = '#3c2a20';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 逆序绘制身体关节圆盘，使后方关节层叠在下方
    for (let i = s.segments.length - 1; i >= 0; i--) {
        const seg = s.segments[i];
        
        let color = seg.colorType === 'vermilion' ? '#b63d2f' : '#2b704c';
        if (isInvincible) {
            // 彩色流光变换
            const hue = (i * 12 + Date.now() / 6) % 360;
            color = `hsla(${hue}, 80%, 50%, 0.95)`;
        }
        
        drawJoint(ctx, seg.x, seg.y, s.size * 0.95, seg.angle, color, isFlickering);
    }
    
    // 绘制蛇头
    let headColor = '#b63d2f';
    if (isInvincible) {
        headColor = `hsla(${Date.now() / 4 % 360}, 95%, 50%, 0.95)`;
    }
    drawHead(ctx, s.x, s.y, s.size, s.angle, headColor, isFlickering);
    
    ctx.restore();
}

// 绘制蛇的单个镂空牛皮关节
function drawJoint(ctx, x, y, size, angle, fillColor, isFlickering) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    if (isFlickering) {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 12;
    }
    
    // 1. 绘制带有斑驳皮革边缘的外圈
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#d4af37'; // 描金边缘
    ctx.stroke();
    
    // 2. 绘制内圈镂空 (露出明亮背景，从而表现“镂空透光雕刻”)
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = '#ffdf9e'; // 微微发光的皮影黄
    ctx.fill();
    ctx.stroke();
    
    // 3. 关节中心的小黑孔与铆钉
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1c1c';
    ctx.fill();
    
    ctx.restore();
}

// 绘制镂花蛇头 (如龙头)
function drawHead(ctx, x, y, size, angle, fillColor, isFlickering) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    if (isFlickering) {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 15;
    }
    
    // 龙头/蛇头雕刻造型
    ctx.beginPath();
    ctx.moveTo(size * 1.5, 0); // 龙鼻
    ctx.quadraticCurveTo(size, -size * 0.7, 0, -size * 0.8); // 龙额
    ctx.quadraticCurveTo(-size * 0.8, -size * 0.7, -size, 0); // 脑后
    ctx.quadraticCurveTo(-size * 0.8, size * 0.7, 0, size * 0.8); // 下颚
    ctx.quadraticCurveTo(size, size * 0.7, size * 1.5, 0);
    ctx.closePath();
    
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    
    // 绘制龙须/蛇信 (描金红色线条)
    ctx.beginPath();
    ctx.moveTo(size * 1.5, 0);
    ctx.quadraticCurveTo(size * 2.2, -size * 0.4, size * 2.4, -size * 0.2);
    ctx.moveTo(size * 1.5, 0);
    ctx.quadraticCurveTo(size * 2.2, size * 0.4, size * 2.4, size * 0.2);
    ctx.strokeStyle = '#ff4757';
    ctx.lineWidth = 2.0;
    ctx.stroke();
    
    // 镂空眼睛 (透光圆圈)
    ctx.beginPath();
    ctx.arc(size * 0.5, -size * 0.35, size * 0.18, 0, Math.PI * 2);
    ctx.arc(size * 0.5, size * 0.35, size * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = '#ffdf9e';
    ctx.fill();
    ctx.stroke();
    
    // 瞳孔
    ctx.beginPath();
    ctx.arc(size * 0.55, -size * 0.35, size * 0.08, 0, Math.PI * 2);
    ctx.arc(size * 0.55, size * 0.35, size * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1c1c';
    ctx.fill();
    
    // 中心大铆钉
    ctx.beginPath();
    ctx.arc(-size * 0.4, 0, size * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1c1c';
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
}

// 绘制所有道具/食物
function drawEntities() {
    const ctx = state.ctx;
    ctx.save();
    
    state.entities.forEach(item => {
        // 光晕效果
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.r * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = item.color + '22'; // 10% 透明度光晕
        ctx.fill();
        
        if (item.type === 'moth') {
            // 荧光飞蛾绘制 (两个三角翅膀)
            ctx.save();
            ctx.translate(item.x, item.y);
            
            // 煽翅抖动效果
            const flap = Math.sin(Date.now() / 70) * 0.6;
            
            ctx.beginPath();
            // 左翅膀
            ctx.moveTo(0, 0);
            ctx.lineTo(-item.r * 1.2, -item.r * (1 + flap));
            ctx.lineTo(-item.r * 1.5, item.r * 0.5);
            ctx.closePath();
            // 右翅膀
            ctx.moveTo(0, 0);
            ctx.lineTo(item.r * 1.2, -item.r * (1 + flap));
            ctx.lineTo(item.r * 1.5, item.r * 0.5);
            ctx.closePath();
            
            ctx.fillStyle = '#12cbc4';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // 身体
            ctx.beginPath();
            ctx.ellipse(0, 0, item.r * 0.3, item.r * 0.9, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#2c1a13';
            ctx.fill();
            
            ctx.restore();
        } else {
            // 纸雕道具样式：菱形牛皮牌，内部刻有小标签文字
            ctx.beginPath();
            ctx.moveTo(item.x, item.y - item.r * 1.2);
            ctx.lineTo(item.x + item.r * 1.2, item.y);
            ctx.lineTo(item.x, item.y + item.r * 1.2);
            ctx.lineTo(item.x - item.r * 1.2, item.y);
            ctx.closePath();
            
            ctx.fillStyle = item.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // 文字
            ctx.fillStyle = '#120905';
            ctx.font = 'bold 9px "Noto Serif SC"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.label, item.x, item.y);
        }
    });
    
    ctx.restore();
}

// 绘制飞散的散落碎片
function drawParticles() {
    const ctx = state.ctx;
    ctx.save();
    
    state.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        
        if (p.isJoint) {
            // 绘制旋转坠落的断骨节段
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            
            ctx.beginPath();
            ctx.arc(0, 0, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#d4af37';
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, p.r * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffdf9e';
            ctx.fill();
            ctx.stroke();
        } else {
            // 烛火火花
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
        ctx.restore();
    });
    
    ctx.restore();
}

// 绘制吊挂灯笼/烛火 (顶层)
function drawCandleLantern() {
    const ctx = state.ctx;
    const cx = state.candle.x;
    const cy = state.candle.y;
    
    ctx.save();
    
    // 1. 吊绳
    ctx.beginPath();
    ctx.moveTo(300, -10);
    ctx.lineTo(cx, cy - 15);
    ctx.strokeStyle = '#1c1c1c';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 2. 烛台边缘
    ctx.fillStyle = '#4a3227';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(cx - 16, cy - 6, 32, 12);
    ctx.fill();
    ctx.stroke();
    
    // 3. 蜡烛火焰 (双层渐变发光)
    const rad = ctx.createRadialGradient(cx, cy - 16, 2, cx, cy - 16, 22);
    rad.addColorStop(0, '#ffffff');
    rad.addColorStop(0.3, '#ffdf9e');
    rad.addColorStop(0.7, '#ff4757');
    rad.addColorStop(1, 'rgba(255, 71, 87, 0)');
    
    ctx.beginPath();
    ctx.arc(cx, cy - 16, 22, 0, Math.PI * 2);
    ctx.fillStyle = rad;
    ctx.fill();
    
    // 4. 烛身
    ctx.fillStyle = '#b63d2f';
    ctx.beginPath();
    ctx.rect(cx - 5, cy - 6, 10, -10);
    ctx.fill();
    
    ctx.restore();
}

// 绘制戏台红木边框修饰
function drawInnerFrame() {
    const ctx = state.ctx;
    ctx.save();
    
    // 戏台底边界阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, 600, 48); // 顶部幕檐投影
    
    // 戏台红木横梁 (木板边框)
    ctx.fillStyle = '#2c1a13';
    ctx.fillRect(0, 0, 600, 42); // 顶部
    ctx.fillRect(0, 582, 600, 18); // 底部
    ctx.fillRect(0, 0, 12, 600); // 左侧
    ctx.fillRect(588, 0, 12, 600); // 右侧
    
    // 横梁上的金漆描边
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(6, 6, 588, 588);
    
    // 戏台标题文字 (顶横梁)
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 15px "Ma Shan Zheng"';
    ctx.textAlign = 'center';
    ctx.fillText('影  戲  乾  坤', 300, 26);
    
    ctx.restore();
}
