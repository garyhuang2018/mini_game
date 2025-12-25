const Player = require('./objects/player');
const Goalkeeper = require('./objects/goalkeeper');
const VirtualJoystick = require('./utils/joystick');

const canvas = tt.createCanvas();
const ctx = canvas.getContext('2d');
const screenWidth = canvas.width;
const screenHeight = canvas.height;

// ==================== 1. 特效系统 (完整定义) ====================
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

// ==================== 2. 屏幕震动系统 (完整定义) ====================
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

// ==================== 3. 技能系统 (完整定义) ====================
class SkillManager {
  constructor() {
    this.skillCooldown = 0;
    this.skills = {
      'fire': { name: '火焰', color: '#FF4500', power: 25, cooldown: 120 },
      'lightning': { name: '闪电', color: '#00FFFF', power: 22, cooldown: 100 },
      'super': { name: '必杀', color: '#FF00FF', power: 35, cooldown: 200 }
    };
  }
  activateSkill(type, ball, fromX, fromY) {
    if (this.skillCooldown > 0) return false;
    const skill = this.skills[type];
    const dx = ball.x - fromX;
    const dy = ball.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // 必杀技触球范围
    if (dist > 100) return false; 

    ball.vx = (dx / dist) * skill.power;
    ball.vy = (dy / dist) * skill.power;
    this.skillCooldown = skill.cooldown;
    return true;
  }
  update() {
    if (this.skillCooldown > 0) this.skillCooldown--;
  }
}

// ==================== 4. 初始化游戏对象 ====================
const particles = new ParticleSystem();
const shake = new ScreenShake();
const skills = new SkillManager();
const joystick = new VirtualJoystick(100, screenHeight - 100);

const gameObjects = {
  ball: { 
    x: screenWidth / 2, y: screenHeight / 2, 
    radius: 12, vx: 0, vy: 0, 
    isSuper: false, superTimer: 0 
  },
  player: new Player(150, screenHeight / 2),
  goalie: new Goalkeeper(screenWidth - 50, screenHeight / 2),
  score: 0
};

const shootButtons = [
  { x: screenWidth - 70, y: screenHeight - 210, type: 'fire', label: '🔥' },
  { x: screenWidth - 70, y: screenHeight - 140, type: 'lightning', label: '⚡' },
  { x: screenWidth - 70, y: screenHeight - 70, type: 'super', label: '💥' }
];

// ==================== 5. 核心逻辑 ====================

function update() {
  const { player, ball, goalie } = gameObjects;

  // 1. 摇杆控制移动
  if (joystick.active) {
    player.x += joystick.vector.x * 5;
    player.y += joystick.vector.y * 5;
    player.state = 'move';
    if (Math.abs(joystick.vector.x) > 0.1) player.dir = joystick.vector.x > 0 ? 1 : -1;
  } else if (player.state === 'move') {
    player.state = 'idle';
  }
  player.update();

  // 2. 守门员更新
  goalie.updateAI(ball);

  // 3. 碰撞检测
  checkBallCollision(ball, player, true);
  checkBallCollision(ball, goalie, false);

  // 4. 物理更新
  updateBallPhysics(ball);
  
  // 5. 系统更新
  particles.update();
  shake.update();
  skills.update();
}

function checkBallCollision(ball, person, isPlayer) {
  const dx = ball.x - person.x;
  const dy = ball.y - person.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist < ball.radius + person.radius) {
    if (isPlayer) {
      // 球员带球：轻微推力
      ball.vx = (ball.x - person.x) * 0.2 + (person.state === 'move' ? person.dir * 2 : 0);
      ball.vy = (ball.y - person.y) * 0.2;
    } else {
      // 守门员：强力反弹
      ball.vx = -Math.abs(ball.vx) - 6;
      ball.vy += (Math.random() - 0.5) * 8;
      shake.shake(8, 5);
      particles.createSpark(ball.x, ball.y, '#FF0');
    }
  }
}

function updateBallPhysics(ball) {
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.vx *= 0.985; // 摩擦力
  ball.vy *= 0.985;

  // 边界
  if (ball.y < ball.radius || ball.y > screenHeight - ball.radius) {
    ball.vy *= -0.8;
  }

  // 进球判定
  if (ball.x > screenWidth - 30) {
    if (ball.y > screenHeight / 2 - 70 && ball.y < screenHeight / 2 + 70) {
      // GOAL!!
      gameObjects.score++;
      particles.createExplosion(ball.x, ball.y, 'super');
      shake.shake(25, 20);
      resetBall();
    } else {
      ball.vx *= -0.8;
    }
  }
  if (ball.x < ball.radius) ball.vx *= -0.8;
  
  // 拖尾效果
  if (Math.abs(ball.vx) > 3) {
    particles.createTrail(ball.x, ball.y, ball.vx, ball.vy, ball.isSuper ? '#F0F' : '#FFF');
  }
}

function resetBall() {
  gameObjects.ball.x = screenWidth / 2;
  gameObjects.ball.y = screenHeight / 2;
  gameObjects.ball.vx = 0;
  gameObjects.ball.vy = 0;
  gameObjects.ball.isSuper = false;
}

// ==================== 6. 输入处理 ====================
function initInput() {
  tt.onTouchStart((e) => {
    const touch = e.touches[0];
    // 检查技能按钮
    for (const btn of shootButtons) {
      const d = Math.sqrt((touch.clientX - btn.x)**2 + (touch.clientY - btn.y)**2);
      if (d < 35) {
        if (skills.activateSkill(btn.type, gameObjects.ball, gameObjects.player.x, gameObjects.player.y)) {
          gameObjects.player.shoot();
          particles.createExplosion(gameObjects.ball.x, gameObjects.ball.y, btn.type);
          if (btn.type === 'super') gameObjects.ball.isSuper = true;
          tt.vibrateShort();
        }
        return;
      }
    }
    joystick.handleTouch(e, 'start');
  });

  tt.onTouchMove((e) => joystick.handleTouch(e, 'move'));
  tt.onTouchEnd((e) => joystick.handleTouch(e, 'end'));
}

// ==================== 7. 渲染层 ====================
function render() {
  // 1. 绘制草坪背景 (格子风格)
  for (let i = 0; i < screenWidth; i += 60) {
    ctx.fillStyle = (i / 60) % 2 === 0 ? '#4CAF50' : '#45a049';
    ctx.fillRect(i, 0, 60, screenHeight);
  }

  const offset = shake.getOffset();
  ctx.save();
  ctx.translate(offset.x, offset.y);

  // 2. 绘制球门
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.strokeRect(screenWidth - 40, screenHeight/2 - 70, 40, 140);

  // 3. 渲染特效
  particles.render(ctx);

  // 4. 渲染角色
  gameObjects.player.render(ctx);
  gameObjects.goalie.render(ctx);

  // 5. 渲染足球
  const b = gameObjects.ball;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.fillStyle = b.isSuper ? '#FF00FF' : 'white';
  ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  ctx.restore();

  // 6. UI
  renderUI();
}

function renderUI() {
  // 摇杆
  joystick.render(ctx);
  
  // 按钮
  shootButtons.forEach(btn => {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.arc(btn.x, btn.y, 30, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(btn.label, btn.x, btn.y + 10);
  });

  // 分数
  ctx.fillStyle = 'white';
  ctx.font = 'bold 30px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${gameObjects.score}`, 30, 50);
}

// ==================== 8. 启动循环 ====================
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

initInput();
loop();
