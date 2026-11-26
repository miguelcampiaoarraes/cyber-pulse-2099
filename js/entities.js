/* ==========================================================================
   CYBER PULSE 2099 - GAME ENTITIES & UPGRADES
   ========================================================================== */

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 18;
    this.angle = 0;

    // Upgradable Stats
    this.maxHealth = 100;
    this.health = 100;
    this.maxShield = 100;
    this.shield = 100;
    this.shieldRechargeDelay = 3; // Seconds without taking damage
    this.shieldTimer = 0;
    this.shieldRechargeRate = 25; // HP per sec

    this.baseSpeed = 350;
    this.speedMultiplier = 1;
    this.damageMultiplier = 1;
    this.fireRateMultiplier = 1;

    // Abilities & Cooldowns
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDuration = 0.25;
    this.dashCooldown = 2.0;
    this.dashCooldownTimer = 0;

    this.empCooldown = 15.0;
    this.empCooldownTimer = 0;

    this.overdriveGauge = 0; // 0 to 100
    this.isOverdrive = false;
    this.overdriveTimer = 0;
    this.overdriveDuration = 6.0;

    // Weapons & Upgrades
    this.activeWeapon = 'plasma';
    this.unlockedWeapons = { plasma: true, spread: false, railgun: false, missile: false };
    this.lastShotTime = 0;

    this.droneCount = 0;
    this.drones = [];

    // Levels for shop
    this.levels = {
      damage: 1,
      firerate: 1,
      shield: 1,
      speed: 1,
      drone: 0
    };
  }

  update(input, width, height, dt, currentTime) {
    // Dash Logic
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;
    if (this.empCooldownTimer > 0) this.empCooldownTimer -= dt;

    if (input.dash && this.dashCooldownTimer <= 0 && !this.isDashing) {
      this.isDashing = true;
      this.dashTimer = this.dashDuration;
      this.dashCooldownTimer = this.dashCooldown;
      audioManager.playDash();
    }

    let moveSpeed = this.baseSpeed * this.speedMultiplier;

    if (this.isDashing) {
      this.dashTimer -= dt;
      moveSpeed *= 2.8; // Dash speed boost
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    // Overdrive logic
    if (this.isOverdrive) {
      this.overdriveTimer -= dt;
      if (this.overdriveTimer <= 0) {
        this.isOverdrive = false;
        this.overdriveGauge = 0;
      }
    }

    // Directional Movement
    let dx = 0;
    let dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.vx = dx * moveSpeed;
    this.vy = dy * moveSpeed;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Boundary Collisions
    this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));

    // Facing direction towards mouse
    this.angle = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);

    // Shield Recharge
    this.shieldTimer += dt;
    if (this.shieldTimer >= this.shieldRechargeDelay && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRechargeRate * dt);
    }

    // Update Companion Drones
    this.updateDrones(dt, currentTime);
  }

  updateDrones(dt, currentTime) {
    // Keep drones array in sync with count
    while (this.drones.length < this.droneCount) {
      this.drones.push({ angleOffset: (Math.PI * 2 / Math.max(1, this.droneCount)) * this.drones.length, lastShot: 0 });
    }

    const orbitRadius = 45;
    const orbitSpeed = 2;
    this.drones.forEach((drone, idx) => {
      drone.angleOffset += orbitSpeed * dt;
      drone.x = this.x + Math.cos(drone.angleOffset + idx) * orbitRadius;
      drone.y = this.y + Math.sin(drone.angleOffset + idx) * orbitRadius;
    });
  }

  takeDamage(amount) {
    if (this.isDashing) return false; // Invulnerable during dash!

    this.shieldTimer = 0; // Reset shield recharge delay
    audioManager.playShieldHit();

    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
      } else {
        const remaining = amount - this.shield;
        this.shield = 0;
        this.health = Math.max(0, this.health - remaining);
      }
    } else {
      this.health = Math.max(0, this.health - amount);
    }
    return true;
  }

  shoot(currentTime, targetX, targetY) {
    if (currentTime - this.lastShotTime < this.getFireInterval()) return null;
    this.lastShotTime = currentTime;

    const projectiles = [];
    const baseDamage = 25 * this.damageMultiplier * (this.isOverdrive ? 2 : 1);
    const speed = 750;

    audioManager.playShoot(this.activeWeapon);

    if (this.activeWeapon === 'plasma') {
      const vx = Math.cos(this.angle) * speed;
      const vy = Math.sin(this.angle) * speed;
      projectiles.push(new Projectile(this.x, this.y, vx, vy, 'plasma', baseDamage, true));
    } else if (this.activeWeapon === 'spread') {
      const angles = [this.angle - 0.2, this.angle, this.angle + 0.2];
      angles.forEach(ang => {
        const vx = Math.cos(ang) * speed * 0.9;
        const vy = Math.sin(ang) * speed * 0.9;
        projectiles.push(new Projectile(this.x, this.y, vx, vy, 'spread', baseDamage * 0.7, true));
      });
    } else if (this.activeWeapon === 'railgun') {
      const vx = Math.cos(this.angle) * speed * 1.5;
      const vy = Math.sin(this.angle) * speed * 1.5;
      const p = new Projectile(this.x, this.y, vx, vy, 'railgun', baseDamage * 2.5, true);
      p.pierce = true;
      projectiles.push(p);
    } else if (this.activeWeapon === 'missile') {
      const angles = [this.angle - 0.15, this.angle + 0.15];
      angles.forEach(ang => {
        const vx = Math.cos(ang) * 400;
        const vy = Math.sin(ang) * 400;
        const p = new Projectile(this.x, this.y, vx, vy, 'missile', baseDamage * 1.5, true);
        p.isHoming = true;
        projectiles.push(p);
      });
    }

    return projectiles;
  }

  getFireInterval() {
    let base = 0.22;
    if (this.activeWeapon === 'spread') base = 0.32;
    if (this.activeWeapon === 'railgun') base = 0.55;
    if (this.activeWeapon === 'missile') base = 0.45;

    const rate = base / (this.fireRateMultiplier * (this.isOverdrive ? 2.5 : 1));
    return rate;
  }

  draw(ctx, particleSystem) {
    // Draw Drones
    this.drones.forEach(drone => {
      ctx.save();
      ctx.fillStyle = '#00f3ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(drone.x, drone.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Thruster effect
    if (Math.hypot(this.vx, this.vy) > 10) {
      particleSystem.spawnThruster(
        this.x - Math.cos(this.angle) * 15,
        this.y - Math.sin(this.angle) * 15,
        this.angle,
        this.isDashing ? '#ff0055' : '#00f3ff'
      );
    }

    // Shield Aura Visual
    if (this.shield > 0) {
      ctx.strokeStyle = `rgba(0, 243, 255, ${0.3 + (this.shield / this.maxShield) * 0.4})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Dash Invulnerability Glow
    if (this.isDashing) {
      ctx.fillStyle = 'rgba(255, 0, 85, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ship Body (Cyber Vanguard Fighter)
    ctx.fillStyle = this.isOverdrive ? '#ffbe00' : '#05060f';
    ctx.strokeStyle = this.isOverdrive ? '#ffbe00' : '#00f3ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = this.isOverdrive ? '#ffbe00' : '#00f3ff';
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.moveTo(22, 0);       // Nose
    ctx.lineTo(-14, -16);    // Left Wing tip
    ctx.lineTo(-6, 0);       // Engines center
    ctx.lineTo(-14, 16);     // Right Wing tip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit Canopy
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(4, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class Projectile {
  constructor(x, y, vx, vy, type = 'plasma', damage = 20, isPlayer = true) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.damage = damage;
    this.isPlayer = isPlayer;
    this.radius = type === 'railgun' ? 6 : (type === 'missile' ? 5 : 4);
    this.pierce = false;
    this.isHoming = false;
    this.life = 3.0; // Seconds before self-destruct
  }

  update(enemies, dt) {
    this.life -= dt;

    // Homing logic for player missiles
    if (this.isHoming && enemies && enemies.length > 0) {
      let nearest = null;
      let minDist = 500;
      enemies.forEach(e => {
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < minDist) {
          minDist = d;
          nearest = e;
        }
      });

      if (nearest) {
        const targetAngle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
        const currentAngle = Math.atan2(this.vy, this.vx);
        const speed = Math.hypot(this.vx, this.vy);
        const newAngle = currentAngle + (targetAngle - currentAngle) * 0.15;
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    ctx.save();
    let color = '#00f3ff';
    if (!this.isPlayer) color = '#ff0055';
    if (this.type === 'spread') color = '#ffbe00';
    if (this.type === 'railgun') color = '#9d00ff';
    if (this.type === 'missile') color = '#00ff88';

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    if (this.type === 'railgun') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 0.08, this.y - this.vy * 0.08);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

class Enemy {
  constructor(x, y, type = 'drone', wave = 1) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.wave = wave;

    this.radius = 16;
    this.speed = 120;
    this.maxHealth = 30 + wave * 10;
    this.health = this.maxHealth;
    this.color = '#ff0055';
    this.scoreValue = 100;
    this.coreDropCount = 1;
    this.lastShot = 0;
    this.stunnedTimer = 0;

    if (type === 'cruiser') {
      this.radius = 30;
      this.speed = 60;
      this.maxHealth = 140 + wave * 30;
      this.health = this.maxHealth;
      this.color = '#9d00ff';
      this.scoreValue = 350;
      this.coreDropCount = 4;
    } else if (type === 'interceptor') {
      this.radius = 14;
      this.speed = 220;
      this.maxHealth = 50 + wave * 15;
      this.health = this.maxHealth;
      this.color = '#ffbe00';
      this.scoreValue = 250;
      this.coreDropCount = 2;
    } else if (type === 'boss') {
      this.radius = 65;
      this.speed = 45;
      this.maxHealth = 800 + wave * 350;
      this.health = this.maxHealth;
      this.color = '#ff0055';
      this.scoreValue = 2500;
      this.coreDropCount = 25;
      this.bossPhase = 1;
    }
  }

  update(player, dt, currentTime, projectiles) {
    if (this.stunnedTimer > 0) {
      this.stunnedTimer -= dt;
      return;
    }

    const angle = Math.atan2(player.y - this.y, player.x - this.x);

    // Movement Behavior
    if (this.type === 'drone') {
      this.x += Math.cos(angle) * this.speed * dt;
      this.y += Math.sin(angle) * this.speed * dt;
    } else if (this.type === 'cruiser') {
      // Maintains distance and shoots spread
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist > 250) {
        this.x += Math.cos(angle) * this.speed * dt;
        this.y += Math.sin(angle) * this.speed * dt;
      }
      if (currentTime - this.lastShot > 2.2) {
        this.lastShot = currentTime;
        const angles = [angle - 0.25, angle, angle + 0.25];
        angles.forEach(a => {
          projectiles.push(new Projectile(this.x, this.y, Math.cos(a) * 300, Math.sin(a) * 300, 'enemy_heavy', 18, false));
        });
      }
    } else if (this.type === 'interceptor') {
      this.x += Math.cos(angle) * this.speed * dt;
      this.y += Math.sin(angle) * this.speed * dt;
      if (currentTime - this.lastShot > 1.4) {
        this.lastShot = currentTime;
        projectiles.push(new Projectile(this.x, this.y, Math.cos(angle) * 450, Math.sin(angle) * 450, 'enemy_laser', 12, false));
      }
    } else if (this.type === 'boss') {
      // Boss AI
      this.x += Math.cos(angle) * this.speed * dt;
      this.y += Math.sin(angle) * this.speed * dt;

      const healthRatio = this.health / this.maxHealth;
      if (healthRatio < 0.35) this.bossPhase = 3;
      else if (healthRatio < 0.7) this.bossPhase = 2;

      const shotInterval = this.bossPhase === 3 ? 0.6 : (this.bossPhase === 2 ? 1.0 : 1.5);
      if (currentTime - this.lastShot > shotInterval) {
        this.lastShot = currentTime;

        if (this.bossPhase === 1) {
          // Ring of bullets
          for (let i = 0; i < 8; i++) {
            const a = angle + (Math.PI * 2 / 8) * i;
            projectiles.push(new Projectile(this.x, this.y, Math.cos(a) * 320, Math.sin(a) * 320, 'enemy_heavy', 15, false));
          }
        } else if (this.bossPhase === 2) {
          // Targeted burst
          for (let i = -2; i <= 2; i++) {
            const a = angle + i * 0.15;
            projectiles.push(new Projectile(this.x, this.y, Math.cos(a) * 400, Math.sin(a) * 400, 'enemy_laser', 20, false));
          }
        } else if (this.bossPhase === 3) {
          // Enraged fast bullet spiral
          for (let i = 0; i < 12; i++) {
            const a = (currentTime * 3) + (Math.PI * 2 / 12) * i;
            projectiles.push(new Projectile(this.x, this.y, Math.cos(a) * 380, Math.sin(a) * 380, 'enemy_heavy', 25, false));
          }
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const angle = Math.atan2(ctx.canvas.height / 2 - this.y, ctx.canvas.width / 2 - this.x); // Facing center/player

    ctx.fillStyle = '#05060f';
    ctx.strokeStyle = this.stunnedTimer > 0 ? '#00f3ff' : this.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;

    if (this.type === 'drone') {
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'cruiser') {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Outer armor ring
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'interceptor') {
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-12, -6);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'boss') {
      // Boss Dreadnought shape
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Boss Health Bar above ship
      ctx.restore();
      ctx.save();
      const barW = 100;
      const barH = 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 20, barW, barH);
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 20, barW * (this.health / this.maxHealth), barH);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(this.x - barW / 2, this.y - this.radius - 20, barW, barH);
      ctx.restore();
      return;
    }

    ctx.restore();
  }
}

class CyberCore {
  constructor(x, y, value = 1) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = 6;
    this.color = '#ffbe00';
  }

  update(player, dt) {
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist < 180) {
      // Magnet pull towards player
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      const pullSpeed = (180 - dist) * 4;
      this.x += Math.cos(angle) * pullSpeed * dt;
      this.y += Math.sin(angle) * pullSpeed * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
