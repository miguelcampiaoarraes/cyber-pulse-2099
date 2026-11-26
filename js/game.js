/* ==========================================================================
   CYBER PULSE 2099 - GAME ENGINE & SYSTEM MANAGEMENT
   ========================================================================== */

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particleSystem = new ParticleSystem();

    this.state = 'MENU'; // MENU, PLAYING, SHOP, PAUSED, GAMEOVER

    this.player = null;
    this.projectiles = [];
    this.enemies = [];
    this.cyberCores = [];

    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('cyber_pulse_highscore')) || 0;
    this.wave = 1;
    this.cores = 0;
    this.kills = 0;

    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;

    this.screenShake = 0;
    this.cameraX = 0;
    this.cameraY = 0;

    this.waveState = 'SPAWNING'; // SPAWNING, IN_PROGRESS, CLEAR
    this.enemiesToSpawn = [];
    this.spawnTimer = 0;

    this.lastTime = 0;
    this.isShooting = false;
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.particleSystem.initStarfield(this.canvas.width, this.canvas.height);
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.particleSystem) {
      this.particleSystem.initStarfield(this.canvas.width, this.canvas.height);
    }
  }

  startNewGame() {
    this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
    this.projectiles = [];
    this.enemies = [];
    this.cyberCores = [];

    this.score = 0;
    this.wave = 1;
    this.cores = 0;
    this.kills = 0;
    this.combo = 0;
    this.maxCombo = 0;

    this.state = 'PLAYING';
    this.startWave(this.wave);

    audioManager.startSynthMusic();
  }

  startWave(waveNum) {
    this.waveState = 'SPAWNING';
    this.enemiesToSpawn = [];

    const isBossWave = waveNum % 5 === 0;

    if (isBossWave) {
      this.enemiesToSpawn.push('boss');
      audioManager.playBossAlarm();
      this.particleSystem.spawnFloatingText(this.canvas.width / 2, 200, "⚠️ CHEFÃO DETECTADO! ⚠️", "#ff0055", 28);
    } else {
      const droneCount = 6 + waveNum * 3;
      const cruiserCount = Math.floor(waveNum / 2);
      const interceptorCount = Math.floor(waveNum / 3);

      for (let i = 0; i < droneCount; i++) this.enemiesToSpawn.push('drone');
      for (let i = 0; i < cruiserCount; i++) this.enemiesToSpawn.push('cruiser');
      for (let i = 0; i < interceptorCount; i++) this.enemiesToSpawn.push('interceptor');

      // Shuffle spawn queue
      this.enemiesToSpawn.sort(() => Math.random() - 0.5);
    }

    this.particleSystem.spawnFloatingText(
      this.canvas.width / 2,
      this.canvas.height / 2 - 100,
      `ONDA ${waveNum}`,
      '#00f3ff',
      36
    );
  }

  update(currentTime, dt) {
    if (this.state !== 'PLAYING') return;

    // Camera Shake decay
    if (this.screenShake > 0) {
      this.screenShake -= dt * 25;
      this.cameraX = (Math.random() - 0.5) * this.screenShake;
      this.cameraY = (Math.random() - 0.5) * this.screenShake;
    } else {
      this.cameraX = 0;
      this.cameraY = 0;
    }

    // Combo Timer Decay
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // Starfield Background
    this.particleSystem.warpSpeed = this.player.isDashing ? 3 : 1;
    this.particleSystem.updateStarfield(this.canvas.width, this.canvas.height, dt);
    this.particleSystem.update(dt);

    // Spawner Queue
    if (this.enemiesToSpawn.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = 0.5; // Spawn interval
        const type = this.enemiesToSpawn.pop();
        const pos = this.getRandomSpawnPosition();
        this.enemies.push(new Enemy(pos.x, pos.y, type, this.wave));
      }
    } else if (this.enemies.length === 0 && this.waveState === 'SPAWNING') {
      // Wave Completed!
      this.waveState = 'CLEAR';
      setTimeout(() => this.openShop(), 1200);
    }

    // Player Shooting
    if (this.isShooting) {
      const shots = this.player.shoot(currentTime / 1000, inputManager.mouseX, inputManager.mouseY);
      if (shots) {
        this.projectiles.push(...shots);
      }
    }

    // Companion Drones auto-shooting
    this.player.drones.forEach(drone => {
      if (currentTime / 1000 - drone.lastShot > 0.6 && this.enemies.length > 0) {
        drone.lastShot = currentTime / 1000;
        // Nearest enemy
        let nearest = this.enemies[0];
        let minDist = Math.hypot(nearest.x - drone.x, nearest.y - drone.y);
        for (let i = 1; i < this.enemies.length; i++) {
          const d = Math.hypot(this.enemies[i].x - drone.x, this.enemies[i].y - drone.y);
          if (d < minDist) {
            minDist = d;
            nearest = this.enemies[i];
          }
        }
        const angle = Math.atan2(nearest.y - drone.y, nearest.x - drone.x);
        this.projectiles.push(new Projectile(drone.x, drone.y, Math.cos(angle) * 600, Math.sin(angle) * 600, 'plasma', 15, true));
      }
    });

    // Update Player
    this.player.update(inputManager, this.canvas.width, this.canvas.height, dt, currentTime / 1000);

    // Check Player EMP Trigger
    if (inputManager.emp && this.player.empCooldownTimer <= 0) {
      this.player.empCooldownTimer = this.player.empCooldown;
      audioManager.playEmp();
      this.triggerEMP();
    }

    // Check Overdrive activation key Q
    if (inputManager.overdrive && this.player.overdriveGauge >= 100 && !this.player.isOverdrive) {
      this.player.isOverdrive = true;
      this.player.overdriveTimer = this.player.overdriveDuration;
      audioManager.playBossAlarm();
      this.particleSystem.spawnFloatingText(this.player.x, this.player.y - 30, "OVERDRIVE ATIVADO!", "#ffbe00", 22);
    }

    // Check Player Death
    if (this.player.health <= 0) {
      this.gameOver();
      return;
    }

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(this.enemies, dt);

      // Out of bounds or expired
      if (
        p.life <= 0 ||
        p.x < -50 || p.x > this.canvas.width + 50 ||
        p.y < -50 || p.y > this.canvas.height + 50
      ) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Player Projectiles vs Enemies
      if (p.isPlayer) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
            // Hit!
            e.health -= p.damage;
            this.particleSystem.spawnExplosion(p.x, p.y, p.type === 'railgun' ? '#9d00ff' : '#00f3ff', 5);

            // Overdrive Gauge Gain
            if (!this.player.isOverdrive) {
              this.player.overdriveGauge = Math.min(100, this.player.overdriveGauge + 3);
            }

            if (!p.pierce) {
              this.projectiles.splice(i, 1);
            }

            if (e.health <= 0) {
              // Enemy Destroyed
              this.onEnemyKilled(e);
              this.enemies.splice(j, 1);
            }
            break;
          }
        }
      } else {
        // Enemy Projectiles vs Player
        if (Math.hypot(this.player.x - p.x, this.player.y - p.y) < this.player.radius + p.radius) {
          if (this.player.takeDamage(p.damage)) {
            this.screenShake = 12;
            this.particleSystem.spawnExplosion(this.player.x, this.player.y, '#ff0055', 10);
          }
          this.projectiles.splice(i, 1);
        }
      }
    }

    // Update Enemies & Collisions with Player
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(this.player, dt, currentTime / 1000, this.projectiles);

      // Body Collision with Player
      if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < this.player.radius + e.radius) {
        if (this.player.takeDamage(20)) {
          this.screenShake = 15;
          this.particleSystem.spawnExplosion(this.player.x, this.player.y, '#ff0055', 12);
        }
      }
    }

    // Update Cyber Cores (Pickups)
    for (let i = this.cyberCores.length - 1; i >= 0; i--) {
      const c = this.cyberCores[i];
      c.update(this.player, dt);

      if (Math.hypot(this.player.x - c.x, this.player.y - c.y) < this.player.radius + c.radius) {
        this.cores += c.value;
        audioManager.playCollectCore();
        this.particleSystem.spawnFloatingText(c.x, c.y, `+${c.value}💎`, '#ffbe00', 14);
        this.cyberCores.splice(i, 1);
      }
    }
  }

  triggerEMP() {
    this.screenShake = 20;
    this.particleSystem.spawnShockwave(this.player.x, this.player.y, '#00f3ff');

    // Destroy all enemy projectiles
    this.projectiles = this.projectiles.filter(p => p.isPlayer);

    // Stun and damage all enemies
    this.enemies.forEach(e => {
      e.stunnedTimer = 2.5;
      e.health -= 80;
      this.particleSystem.spawnExplosion(e.x, e.y, '#00f3ff', 8);
    });

    // Remove dead enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].health <= 0) {
        this.onEnemyKilled(this.enemies[i]);
        this.enemies.splice(i, 1);
      }
    }
  }

  onEnemyKilled(enemy) {
    this.kills++;
    this.combo++;
    this.comboTimer = 3.5; // 3.5s to chain next kill
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const multiplier = 1 + (this.combo * 0.1);
    const addedScore = Math.floor(enemy.scoreValue * multiplier);
    this.score += addedScore;

    audioManager.playExplosion(enemy.type === 'boss' || enemy.type === 'cruiser');
    this.screenShake = enemy.type === 'boss' ? 25 : 8;

    this.particleSystem.spawnExplosion(enemy.x, enemy.y, enemy.color, enemy.type === 'boss' ? 50 : 20, enemy.type === 'boss');
    this.particleSystem.spawnFloatingText(enemy.x, enemy.y, `+${addedScore}`, '#00f3ff', 16);

    // Spawn Cyber Cores
    for (let i = 0; i < enemy.coreDropCount; i++) {
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;
      this.cyberCores.push(new CyberCore(enemy.x + offsetX, enemy.y + offsetY, 1));
    }
  }

  getRandomSpawnPosition() {
    // Spawn outside screen edges
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const padding = 60;

    if (side === 0) { // Top
      x = Math.random() * this.canvas.width;
      y = -padding;
    } else if (side === 1) { // Right
      x = this.canvas.width + padding;
      y = Math.random() * this.canvas.height;
    } else if (side === 2) { // Bottom
      x = Math.random() * this.canvas.width;
      y = this.canvas.height + padding;
    } else { // Left
      x = -padding;
      y = Math.random() * this.canvas.height;
    }
    return { x, y };
  }

  openShop() {
    this.state = 'SHOP';
    uiManager.showShopModal();
  }

  nextWave() {
    this.wave++;
    this.state = 'PLAYING';
    uiManager.hideAllModals();
    this.startWave(this.wave);
  }

  gameOver() {
    this.state = 'GAMEOVER';
    audioManager.stopSynthMusic();
    audioManager.playExplosion(true);

    let isNewHigh = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('cyber_pulse_highscore', this.highScore.toString());
      isNewHigh = true;
    }

    uiManager.showGameOverModal(this.score, this.wave, this.kills, this.cores, this.maxCombo, isNewHigh);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.cameraX, this.cameraY);

    // Render Starfield Background
    this.particleSystem.drawStarfield(this.ctx);

    // Render Game Entities
    if (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'SHOP') {
      this.cyberCores.forEach(c => c.draw(this.ctx));
      this.projectiles.forEach(p => p.draw(this.ctx));
      this.enemies.forEach(e => e.draw(this.ctx));
      if (this.player) this.player.draw(this.ctx, this.particleSystem);
    }

    // Render Particles
    this.particleSystem.draw(this.ctx);

    this.ctx.restore();
  }
}

const gameEngine = new GameEngine();
