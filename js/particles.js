/* ==========================================================================
   CYBER PULSE 2099 - PARTICLE SYSTEM & STARFIELD ENGINE
   ========================================================================== */

class Particle {
  constructor(x, y, vx, vy, color, size, maxLife, type = 'circle') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = maxLife;
    this.life = maxLife;
    this.type = type; // 'circle', 'spark', 'ring', 'text'
    this.text = '';
    this.alpha = 1;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.life -= dt;
    this.alpha = Math.max(0, this.life / this.maxLife);

    if (this.type === 'ring') {
      this.size += 400 * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;

    if (this.type === 'circle') {
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * this.alpha, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'spark') {
      ctx.strokeStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.lineWidth = this.size;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
      ctx.stroke();
    } else if (this.type === 'ring') {
      ctx.strokeStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'text') {
      ctx.font = `bold ${Math.floor(this.size)}px Orbitron, sans-serif`;
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.textAlign = 'center';
      ctx.fillText(this.text, this.x, this.y);
    }

    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.stars = [];
    this.warpSpeed = 1;
  }

  initStarfield(width, height, count = 120) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 3 + 1, // Depth layers
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2
      });
    }
  }

  updateStarfield(width, height, dt) {
    const speed = 60 * this.warpSpeed * dt;
    this.stars.forEach(star => {
      star.y += star.z * speed * 0.5;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
    });
  }

  drawStarfield(ctx) {
    ctx.save();
    this.stars.forEach(star => {
      ctx.fillStyle = `rgba(0, 243, 255, ${star.alpha})`;
      ctx.beginPath();
      if (this.warpSpeed > 2) {
        // Warp streak effect
        ctx.strokeStyle = `rgba(0, 243, 255, ${star.alpha})`;
        ctx.lineWidth = star.size;
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x, star.y - star.z * 15 * this.warpSpeed);
        ctx.stroke();
      } else {
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  spawnExplosion(x, y, color, count = 25, isLarge = false) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isLarge ? 8 : 4) + 1;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = Math.random() * (isLarge ? 6 : 3) + 1.5;
      const maxLife = Math.random() * 0.4 + 0.2;
      const type = Math.random() > 0.4 ? 'spark' : 'circle';

      this.particles.push(new Particle(x, y, vx, vy, color, size, maxLife, type));
    }
  }

  spawnShockwave(x, y, color) {
    const p = new Particle(x, y, 0, 0, color, 10, 0.4, 'ring');
    this.particles.push(p);
  }

  spawnThruster(x, y, angle, color = '#00f3ff') {
    const spread = (Math.random() - 0.5) * 0.5;
    const speed = Math.random() * 3 + 2;
    const vx = -Math.cos(angle + spread) * speed;
    const vy = -Math.sin(angle + spread) * speed;
    const size = Math.random() * 3 + 1;

    this.particles.push(new Particle(x, y, vx, vy, color, size, 0.25, 'circle'));
  }

  spawnFloatingText(x, y, text, color = '#ffbe00', fontSize = 16) {
    const p = new Particle(x, y, 0, -1.5, color, fontSize, 0.8, 'text');
    p.text = text;
    this.particles.push(p);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }
}
