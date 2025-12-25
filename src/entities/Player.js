// objects/player.js

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 24;
    this.color = '#2196F3'; // 主队蓝色
    this.state = 'idle'; 
    this.animTime = 0;
    this.dir = 1; // 1为向右，-1为向左
  }

  moveTo(x, y) {
    if (x !== this.x) this.dir = x > this.x ? 1 : -1;
    this.x = x;
    this.y = y;
    this.state = 'move';
  }

  shoot() {
    this.state = 'shoot';
    this.animTime = 0;
  }

  update() {
    this.animTime++;
    if (this.state === 'shoot' && this.animTime > 20) this.state = 'idle';
    if (this.state === 'move' && Math.random() > 0.8) this.state = 'idle';
  }

  render(ctx) {
    const t = this.animTime;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.dir, 1); // 根据移动方向镜像翻转

    // 1. 落地阴影 (最底层)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius - 2, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 动画参数
    let bob = Math.sin(t * 0.2) * 2; // 呼吸起伏
    let legSwing = this.state === 'move' ? Math.sin(t * 0.4) * 12 : 0;
    let punch = this.state === 'shoot' ? Math.sin(Math.min(t, 10) * 0.3) * 15 : 0;

    // 2. 绘制身体 (方正的球衣)
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = this.color;
    // 身体主体
    this.drawRoundedRect(ctx, -15, -15 + bob, 30, 25, 5);

    // 3. 绘制腿部 (像素块风格)
    ctx.fillStyle = '#FFDAB9'; // 肤色
    // 左腿
    ctx.fillRect(-12, 5 + bob + legSwing, 10, 8);
    ctx.strokeRect(-12, 5 + bob + legSwing, 10, 8);
    // 右腿
    ctx.fillRect(2, 5 + bob - legSwing, 10, 8);
    ctx.strokeRect(2, 5 + bob - legSwing, 10, 8);

    // 4. 绘制头部 (大头是精髓)
    ctx.save();
    ctx.translate(0 + punch, -25 + bob); 
    
    // 脸部
    ctx.fillStyle = '#FFDAB9';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 头发 (简单的像素发型)
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(0, -8, 18, Math.PI, 0);
    ctx.fill();

    // 5. 绘制表情 (热血漫画眼)
    this.drawEyes(ctx, t);

    ctx.restore(); // 结束头部坐标系
    ctx.restore(); // 结束球员坐标系
  }

  // 辅助方法：绘制圆角矩形
  drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 辅助方法：绘制暴走风格眼睛
  drawEyes(ctx, t) {
    ctx.fillStyle = '#000';
    if (this.state === 'shoot') {
      // 射门时：愤怒的斜线眼
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(4, -2); ctx.lineTo(14, 2);
      ctx.moveTo(-4, -2); ctx.lineTo(-14, 2);
      ctx.stroke();
    } else {
      // 平时：方块豆豆眼
      ctx.fillRect(5, -2, 5, 7);
      ctx.fillRect(-10, -2, 5, 7);
    }
  }
}

module.exports = Player;
