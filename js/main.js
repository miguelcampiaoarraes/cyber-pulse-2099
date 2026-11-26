/* ==========================================================================
   CYBER PULSE 2099 - INPUT & UI MANAGER (MAIN ENTRYPOINT)
   ========================================================================== */

class InputManager {
  constructor() {
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.dash = false;
    this.emp = false;
    this.overdrive = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
  }

  init() {
    window.addEventListener('keydown', (e) => this.handleKey(e, true));
    window.addEventListener('keyup', (e) => this.handleKey(e, false));
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        gameEngine.isShooting = true;
        audioManager.init(); // Init AudioContext on user click
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouseDown = false;
        gameEngine.isShooting = false;
      }
    });
  }

  handleKey(e, isPressed) {
    const key = e.key.toLowerCase();

    if (key === 'w' || key === 'arrowup') this.up = isPressed;
    if (key === 's' || key === 'arrowdown') this.down = isPressed;
    if (key === 'a' || key === 'arrowleft') this.left = isPressed;
    if (key === 'd' || key === 'arrowright') this.right = isPressed;
    if (key === ' ' || e.code === 'Space') this.dash = isPressed;
    if (key === 'e') this.emp = isPressed;
    if (key === 'q') this.overdrive = isPressed;

    if (isPressed) {
      if (key === '1' && gameEngine.player?.unlockedWeapons.plasma) uiManager.selectWeapon('plasma');
      if (key === '2' && gameEngine.player?.unlockedWeapons.spread) uiManager.selectWeapon('spread');
      if (key === '3' && gameEngine.player?.unlockedWeapons.railgun) uiManager.selectWeapon('railgun');
      if (key === '4' && gameEngine.player?.unlockedWeapons.missile) uiManager.selectWeapon('missile');

      if (key === 'escape') {
        if (gameEngine.state === 'PLAYING') {
          gameEngine.state = 'PAUSED';
          uiManager.showPauseModal();
        } else if (gameEngine.state === 'PAUSED') {
          gameEngine.state = 'PLAYING';
          uiManager.hideAllModals();
        }
      }
    }
  }
}

class UIManager {
  constructor() {
    this.hud = document.getElementById('hud');
    this.startScreen = document.getElementById('start-screen');
    this.shopModal = document.getElementById('shop-modal');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.crtOverlay = document.getElementById('crt-overlay');

    this.scoreEl = document.getElementById('hud-score');
    this.waveEl = document.getElementById('hud-wave');
    this.coresEl = document.getElementById('hud-cores');
    this.shieldFill = document.getElementById('shield-bar-fill');
    this.healthFill = document.getElementById('health-bar-fill');
    this.shieldText = document.getElementById('shield-text');
    this.healthText = document.getElementById('health-text');
    this.overdriveFill = document.getElementById('overdrive-bar-fill');
    this.comboBadge = document.getElementById('combo-badge');
    this.comboCount = document.getElementById('combo-count');

    this.dashCdOverlay = document.getElementById('dash-cd-overlay');
    this.empCdOverlay = document.getElementById('emp-cd-overlay');
  }

  init() {
    // Setup Start High Score
    document.getElementById('start-high-score').textContent = gameEngine.highScore;

    // Start Button
    document.getElementById('btn-start').addEventListener('click', () => {
      audioManager.init();
      audioManager.playClick();
      this.hideAllModals();
      this.hud.classList.remove('hidden');
      gameEngine.startNewGame();
    });

    // Mute Audio Toggle Button
    document.getElementById('btn-audio-toggle').addEventListener('click', (e) => {
      audioManager.init();
      audioManager.playClick();
      const isMuted = audioManager.toggleMute();
      e.target.textContent = isMuted ? "🔇 ÁUDIO: DESLIGADO" : "🔊 ÁUDIO: LIGADO";
    });

    // CRT Toggle Button
    document.getElementById('btn-toggle-crt').addEventListener('click', (e) => {
      audioManager.playClick();
      this.crtOverlay.classList.toggle('hidden');
      e.target.textContent = this.crtOverlay.classList.contains('hidden') ? "FILTRO CRT: DESLIGADO" : "FILTRO CRT: LIGADO";
    });

    // Resume Button
    document.getElementById('btn-resume').addEventListener('click', () => {
      audioManager.playClick();
      gameEngine.state = 'PLAYING';
      this.hideAllModals();
    });

    // Quit Button
    document.getElementById('btn-quit').addEventListener('click', () => {
      audioManager.playClick();
      audioManager.stopSynthMusic();
      gameEngine.state = 'MENU';
      this.hideAllModals();
      this.startScreen.classList.remove('hidden');
      this.hud.classList.add('hidden');
      document.getElementById('start-high-score').textContent = gameEngine.highScore;
    });

    // Restart Button
    document.getElementById('btn-restart').addEventListener('click', () => {
      audioManager.playClick();
      this.hideAllModals();
      this.hud.classList.remove('hidden');
      gameEngine.startNewGame();
    });

    // Next Wave Shop Button
    document.getElementById('btn-next-wave').addEventListener('click', () => {
      audioManager.playClick();
      gameEngine.nextWave();
    });

    // Weapon slots click listeners
    document.querySelectorAll('.weapon-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const weapon = slot.getAttribute('data-weapon');
        if (gameEngine.player?.unlockedWeapons[weapon]) {
          this.selectWeapon(weapon);
        }
      });
    });

    // Setup Shop Upgrades
    this.setupShop();
  }

  selectWeapon(weapon) {
    if (!gameEngine.player) return;
    gameEngine.player.activeWeapon = weapon;
    audioManager.playClick();

    document.querySelectorAll('.weapon-slot').forEach(s => {
      s.classList.remove('active');
      if (s.getAttribute('data-weapon') === weapon) {
        s.classList.add('active');
      }
    });
  }

  setupShop() {
    const updateShopUI = () => {
      document.getElementById('shop-cores-count').textContent = `💎 ${gameEngine.cores}`;
      const p = gameEngine.player;
      if (!p) return;

      // Dots
      this.renderLevelDots('dots-damage', p.levels.damage, 5);
      this.renderLevelDots('dots-firerate', p.levels.firerate, 5);
      this.renderLevelDots('dots-shield', p.levels.shield, 5);
      this.renderLevelDots('dots-speed', p.levels.speed, 5);
      this.renderLevelDots('dots-drone', p.levels.drone, 3);

      // Buttons
      this.updateBuyButton('buy-damage', 50 * p.levels.damage, p.levels.damage >= 5);
      this.updateBuyButton('buy-firerate', 60 * p.levels.firerate, p.levels.firerate >= 5);
      this.updateBuyButton('buy-shield', 40 * p.levels.shield, p.levels.shield >= 5);
      this.updateBuyButton('buy-speed', 35 * p.levels.speed, p.levels.speed >= 5);
      this.updateBuyButton('buy-drone', 120 * (p.levels.drone + 1), p.levels.drone >= 3);

      // Unlocks
      this.updateBuyButton('buy-unlock-spread', 100, p.unlockedWeapons.spread);
      this.updateBuyButton('buy-unlock-railgun', 150, p.unlockedWeapons.railgun);
      this.updateBuyButton('buy-unlock-missile', 200, p.unlockedWeapons.missile);
    };

    document.getElementById('buy-damage').addEventListener('click', () => {
      const p = gameEngine.player;
      const cost = 50 * p.levels.damage;
      if (gameEngine.cores >= cost && p.levels.damage < 5) {
        gameEngine.cores -= cost;
        p.levels.damage++;
        p.damageMultiplier += 0.2;
        audioManager.playCollectCore();
        updateShopUI();
      }
    });

    document.getElementById('buy-firerate').addEventListener('click', () => {
      const p = gameEngine.player;
      const cost = 60 * p.levels.firerate;
      if (gameEngine.cores >= cost && p.levels.firerate < 5) {
        gameEngine.cores -= cost;
        p.levels.firerate++;
        p.fireRateMultiplier += 0.15;
        audioManager.playCollectCore();
        updateShopUI();
      }
    });

    document.getElementById('buy-shield').addEventListener('click', () => {
      const p = gameEngine.player;
      const cost = 40 * p.levels.shield;
      if (gameEngine.cores >= cost && p.levels.shield < 5) {
        gameEngine.cores -= cost;
        p.levels.shield++;
        p.maxShield += 25;
        p.shield = p.maxShield;
        audioManager.playCollectCore();
        updateShopUI();
      }
    });

    document.getElementById('buy-speed').addEventListener('click', () => {
      const p = gameEngine.player;
      const cost = 35 * p.levels.speed;
      if (gameEngine.cores >= cost && p.levels.speed < 5) {
        gameEngine.cores -= cost;
        p.levels.speed++;
        p.speedMultiplier += 0.15;
        audioManager.playCollectCore();
        updateShopUI();
      }
    });

    document.getElementById('buy-drone').addEventListener('click', () => {
      const p = gameEngine.player;
      const cost = 120 * (p.levels.drone + 1);
      if (gameEngine.cores >= cost && p.levels.drone < 3) {
        gameEngine.cores -= cost;
        p.levels.drone++;
        p.droneCount++;
        audioManager.playCollectCore();
        updateShopUI();
      }
    });

    document.getElementById('buy-unlock-spread').addEventListener('click', () => {
      if (gameEngine.cores >= 100 && !gameEngine.player.unlockedWeapons.spread) {
        gameEngine.cores -= 100;
        gameEngine.player.unlockedWeapons.spread = true;
        document.getElementById('slot-2').classList.remove('locked');
        audioManager.playCollectCore();
        updateShopUI();
      }
    });

    document.getElementById('buy-unlock-railgun').addEventListener('click', () => {
      if (gameEngine.cores >= 150 && !gameEngine.player.unlockedWeapons.railgun) {
        gameEngine.cores -= 150;
        gameEngine.player.unlockedWeapons.railgun = true;
        document.getElementById('slot-3').classList.remove('locked');
        audioManager.playCollectCore();
        updateShopUI();
      }
    });

    document.getElementById('buy-unlock-missile').addEventListener('click', () => {
      if (gameEngine.cores >= 200 && !gameEngine.player.unlockedWeapons.missile) {
        gameEngine.cores -= 200;
        gameEngine.player.unlockedWeapons.missile = true;
        document.getElementById('slot-4').classList.remove('locked');
        audioManager.playCollectCore();
        updateShopUI();
      }
    });

    this.updateShopUIFunc = updateShopUI;
  }

  renderLevelDots(containerId, currentLevel, maxLevel) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    for (let i = 1; i <= maxLevel; i++) {
      const dot = document.createElement('div');
      dot.className = `dot ${i <= currentLevel ? 'active' : ''}`;
      el.appendChild(dot);
    }
  }

  updateBuyButton(btnId, cost, isMaxedOrUnlocked) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isMaxedOrUnlocked) {
      btn.disabled = true;
      btn.textContent = "COMPRADO";
    } else {
      btn.disabled = gameEngine.cores < cost;
      btn.textContent = `💎 ${cost}`;
    }
  }

  showShopModal() {
    this.shopModal.classList.remove('hidden');
    if (this.updateShopUIFunc) this.updateShopUIFunc();
  }

  showPauseModal() {
    this.pauseScreen.classList.remove('hidden');
  }

  showGameOverModal(score, wave, kills, cores, maxCombo, isNewHigh) {
    document.getElementById('go-score').textContent = score;
    document.getElementById('go-wave').textContent = wave;
    document.getElementById('go-kills').textContent = kills;
    document.getElementById('go-cores').textContent = cores;
    document.getElementById('go-combo').textContent = `${maxCombo}x`;

    const newHighMsg = document.getElementById('new-high-score-msg');
    if (isNewHigh) newHighMsg.classList.remove('hidden');
    else newHighMsg.classList.add('hidden');

    this.gameOverScreen.classList.remove('hidden');
  }

  hideAllModals() {
    this.startScreen.classList.add('hidden');
    this.shopModal.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
  }

  updateHUD() {
    if (gameEngine.state !== 'PLAYING') return;

    this.scoreEl.textContent = String(gameEngine.score).padStart(6, '0');
    this.waveEl.textContent = gameEngine.wave;
    this.coresEl.textContent = `💎 ${gameEngine.cores}`;

    const p = gameEngine.player;
    if (p) {
      // Shield Bar
      const shieldPct = Math.max(0, (p.shield / p.maxShield) * 100);
      this.shieldFill.style.width = `${shieldPct}%`;
      this.shieldText.textContent = `${Math.ceil(p.shield)}/${p.maxShield}`;

      // Health Bar
      const healthPct = Math.max(0, (p.health / p.maxHealth) * 100);
      this.healthFill.style.width = `${healthPct}%`;
      this.healthText.textContent = `${Math.ceil(p.health)}/${p.maxHealth}`;

      // Overdrive Bar
      this.overdriveFill.style.width = `${p.overdriveGauge}%`;

      // Skill Cooldown overlays
      const dashCdRatio = p.dashCooldownTimer > 0 ? (p.dashCooldownTimer / p.dashCooldown) : 0;
      this.dashCdOverlay.style.height = `${dashCdRatio * 100}%`;

      const empCdRatio = p.empCooldownTimer > 0 ? (p.empCooldownTimer / p.empCooldown) : 0;
      this.empCdOverlay.style.height = `${empCdRatio * 100}%`;

      // Combo badge
      if (gameEngine.combo > 1) {
        this.comboBadge.classList.remove('hidden');
        this.comboCount.textContent = `${gameEngine.combo}x`;
      } else {
        this.comboBadge.classList.add('hidden');
      }
    }
  }
}

const inputManager = new InputManager();
const uiManager = new UIManager();

// Main Loop
function gameLoop(timestamp) {
  if (!gameEngine.lastTime) gameEngine.lastTime = timestamp;
  const dt = Math.min(0.1, (timestamp - gameEngine.lastTime) / 1000);
  gameEngine.lastTime = timestamp;

  gameEngine.update(timestamp, dt);
  gameEngine.draw();
  uiManager.updateHUD();

  requestAnimationFrame(gameLoop);
}

// Window Onload Init
window.addEventListener('DOMContentLoaded', () => {
  inputManager.init();
  gameEngine.init();
  uiManager.init();
  requestAnimationFrame(gameLoop);
});
