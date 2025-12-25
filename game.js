// game.js - 完整整合版本
const Player = require('./objects/player');

const canvas = tt.createCanvas();
const ctx = canvas.getContext('2d');
const screenWidth = canvas.width;
const screenHeight = canvas.height;

// ==================== 1. 特效系统 ====================
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.trails = [];
    this.explosions = [];
  }

  createSpark(x, y, color = '#FFD700', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  createTrail(x, y, vx, vy, color = '#FFFFFF') {
    this.trails.push({
      x: x - vx * 0.2, y: y - vy * 0.2,
      vx: vx * 0.3, vy: vy * 0.3,
      life: 0.8, color,
      size: 1 + Math.random() * 2
    });
  }

  createExplosion(x, y, type = 'normal') {
    const explosion = {
      x, y, radius: 5,
      maxRadius: type === 'super' ? 80 : 40,
      life: 1.0,
      color: type === 'fire' ? '#FF4500' : 
             type === 'lightning' ? '#00FFFF' : 
             type === 'super' ? '#FF00FF' : '#FFD700'
    };
    this.explosions.push(explosion);
    
    const count = type === 'super' ? 30 : 15;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        color: explosion.color,
        size: 3 + Math.random() * 4
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= 0.02;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].life -= 0.015;
      if (this.trails[i].life <= 0) this.trails.splice(i, 1);
    }
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i];
      e.radius += (e.maxRadius - e.radius) * 0.2;
      e.life -= 0.02;
      if (e.life <= 0) this.explosions.splice(i, 1);
    }
  }

  render(ctx) {
    this.trails.forEach(t => {
      ctx.globalAlpha = t.life;
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2); ctx.fill();
    });
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    this.explosions.forEach(e => {
      ctx.globalAlpha = e.life * 0.5;
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

// ==================== 2. 屏幕震动系统 ====================
class ScreenShake {
  constructor() {
    this.intensity = 0;
    this.duration = 0;
  }
  shake(intensity, duration) {
    this.intensity = intensity;
    this.duration = duration;
  }
  update() {
    if (this.duration > 0) {
      this.duration--;
      this.intensity *= 0.9;
    }
  }
  getOffset() {
    if (this.duration <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.intensity,
      y: (Math.random() - 0.5) * this.intensity
    };
  }
}

// ==================== 3. 技能系统 ====================
class SkillManager {
  constructor() {
    this.currentSkill = null;
    this.skillCooldown = 0;
    this.skills = {
      'fire': { name: '火焰射门', color: '#FF4500', power: 25, cooldown: 180 },
      'lightning': { name: '闪电射门', color: '#00FFFF', power: 22, cooldown: 150 },
      'banana': { name: '香蕉球', color: '#FFD700', power: 18, cooldown: 120 },
      'super': { name: '超级射门', color: '#FF00FF', power: 30, cooldown: 240 }
    };
  }
  activateSkill(type, ball, fromX, fromY) {
    if (this.skillCooldown > 0) return false;
    const skill = this.skills[type];
    const dx = ball.x - fromX;
    const dy = ball.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 180) return false; // 判定范围稍微放大

    ball.vx = (dx / dist) * skill.power;
    ball.vy = (dy / dist) * skill.power;
    this.skillCooldown = skill.cooldown;
    this.currentSkill = type;
    return true;
  }
  update() {
    if (this.skillCooldown > 0) this.skillCooldown--;
  }
}

// ==================== 4. 初始化对象 ====================
const particleSystem = new ParticleSystem();
const screenShake = new ScreenShake();
const skillManager = new SkillManager();

const gameObjects = {
  ball: { 
    x: screenWidth / 2, y: screenHeight / 2, 
    radius: 12, vx: 0, vy: 0, 
    isSuper: false, superTimer: 0 
  },
  player: new Player(150, screenHeight / 2),
  score: { player: 0, ai: 0 }
};

const shootButtons = [
  { x: screenWidth - 60, y: screenHeight - 260, type: 'fire', label: '🔥' },
  { x: screenWidth - 60, y: screenHeight - 190, type: 'lightning', label: '⚡' },
  { x: screenWidth - 60, y: screenHeight - 120, type: 'banana', label: '🍌' },
  { x: screenWidth - 60, y: screenHeight - 50, type: 'super', label: '💥' }
];

// ==================== 5. 核心逻辑 ====================

function updatePhysics() {
  const ball = gameObjects.ball;
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.vx *= 0.98;
  ball.vy *= 0.98;

  // 边界碰撞
  if (ball.y < ball.radius || ball.y > screenHeight - ball.radius) {
    ball.vy *= -0.8;
    particleSystem.createSpark(ball.x, ball.y, '#FFF');
  }
  
  // 进球检测 (右侧球门)
  if (ball.x > screenWidth - 20) {
    if (ball.y > screenHeight / 2 - 60 && ball.y < screenHeight / 2 + 60) {
      gameObjects.score.player++;
      particleSystem.createExplosion(ball.x, ball.y, 'super');
      screenShake.shake(20, 15);
      tt.vibrateLong();
      resetBall();
    } else {
      ball.vx *= -0.8;
    }
  }

  if (ball.x < 20) ball.vx *= -0.8;

  // 轨迹特效
  if (Math.abs(ball.vx) > 2) {
    particleSystem.createTrail(ball.x, ball.y, ball.vx, ball.vy, ball.isSuper ? '#FF00FF' : '#FFF');
  }
}

function resetBall() {
  gameObjects.ball.x = screenWidth / 2;
  gameObjects.ball.y = screenHeight / 2;
  gameObjects.ball.vx = 0;
  gameObjects.ball.vy = 0;
  gameObjects.ball.isSuper = false;
}

function initInput() {
  tt.onTouchStart((e) => {
    const touch = e.touches[0];
    // 检查按钮点击
    for (const btn of shootButtons) {
      const dist = Math.sqrt((touch.clientX - btn.x)**2 + (touch.clientY - btn.y)**2);
      if (dist < 30) {
        if (skillManager.activateSkill(btn.type, gameObjects.ball, gameObjects.player.x, gameObjects.player.y)) {
          gameObjects.player.shoot(); // 触发球员射门动作
          particleSystem.createExplosion(gameObjects.ball.x, gameObjects.ball.y, btn.type);
          if (btn.type === 'super') {
             gameObjects.ball.isSuper = true;
             screenShake.shake(20, 15);
          }
          tt.vibrateShort();
        }
        return;
      }
    }
    // 移动球员
    gameObjects.player.moveTo(touch.clientX, touch.clientY);
  });

  tt.onTouchMove((e) => {
    const touch = e.touches[0];
    gameObjects.player.moveTo(touch.clientX, touch.clientY);
  });
}

// ==================== 6. 渲染引擎 ====================

function render() {
  // 背景
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, 0, screenWidth, screenHeight);

  // 震动
  const offset = screenShake.getOffset();
  ctx.save();
  ctx.translate(offset.x, offset.y);

  // 绘制球门
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.strokeRect(screenWidth - 40, screenHeight/2 - 60, 40, 120);

  // 特效渲染
  particleSystem.render(ctx);

  // 足球渲染
  const ball = gameObjects.ball;
  ctx.fillStyle = ball.isSuper ? '#FF00FF' : 'white';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 球员渲染 (重点！)
  gameObjects.player.render(ctx);

  // 界面渲染
  renderUI();

  ctx.restore();
}

function renderUI() {
  // 绘制按钮
  shootButtons.forEach(btn => {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.arc(btn.x, btn.y, 25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(btn.label, btn.x, btn.y + 8);
  });

  // 分数
  ctx.fillStyle = 'white';
  ctx.font = 'bold 30px Arial';
  ctx.fillText(`SCORE: ${gameObjects.score.player}`, 80, 50);
}

// ==================== 7. 主循环 ====================

function loop() {
  // 1. 更新数据
  gameObjects.player.update();
  updatePhysics();
  particleSystem.update();
  screenShake.update();
  skillManager.update();

  // 2. 绘制画面
  render();

  requestAnimationFrame(loop);
}

// 启动
initInput();
loop();
