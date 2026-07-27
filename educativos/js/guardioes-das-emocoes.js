
const canvas = document.getElementById("guardianCanvas");
const ctx = canvas.getContext("2d");

const phaseLabel = document.getElementById("phaseLabel");
const livesLabel = document.getElementById("livesLabel");
const scoreLabel = document.getElementById("scoreLabel");
const weaponLabel = document.getElementById("weaponLabel");
const startOverlay = document.getElementById("guardianStart");
const phaseOverlay = document.getElementById("guardianPhase");
const endOverlay = document.getElementById("guardianEnd");
const startBtn = document.getElementById("guardianStartBtn");
const continueBtn = document.getElementById("phaseContinueBtn");
const restartBtn = document.getElementById("guardianRestartBtn");
const messageEl = document.getElementById("guardianMessage");
const phaseKicker = document.getElementById("phaseKicker");
const phaseTitle = document.getElementById("phaseTitle");
const phaseDescription = document.getElementById("phaseDescription");
const phaseWeapon = document.getElementById("phaseWeapon");
const phaseSymbol = document.getElementById("phaseSymbol");
const summaryEl = document.getElementById("guardianSummary");
const leftBtn = document.getElementById("guardianLeft");
const rightBtn = document.getElementById("guardianRight");
const shootBtn = document.getElementById("guardianShoot");

const W = canvas.width;
const H = canvas.height;

const phases = [
  {
    name: "Medo",
    symbol: "👻",
    weapon: "⭐ Coragem",
    shot: "⭐",
    bg1: "#09132b",
    bg2: "#1f254f",
    enemy: "👻",
    boss: "👹",
    description: "Use a Coragem para iluminar os fantasmas que aparecem pelo caminho.",
    tip: "Coragem não é não sentir medo. É conseguir seguir mesmo quando ele aparece."
  },
  {
    name: "Ansiedade",
    symbol: "🌪️",
    weapon: "🌬️ Respiração",
    shot: "🌬️",
    bg1: "#102c3b",
    bg2: "#315b6d",
    enemy: "🌪️",
    boss: "⛈️",
    description: "Use a Respiração para desacelerar os redemoinhos e pensamentos acelerados.",
    tip: "Respirar devagar pode ajudar o corpo a sair do modo de alerta."
  },
  {
    name: "Raiva",
    symbol: "🔥",
    weapon: "💧 Calma",
    shot: "💧",
    bg1: "#4b1616",
    bg2: "#8a3c21",
    enemy: "🔥",
    boss: "🌋",
    description: "Use a Calma para diminuir o fogo antes que ele chegue perto demais.",
    tip: "Fazer uma pausa pode ajudar antes de agir quando a raiva cresce."
  },
  {
    name: "Solidão",
    symbol: "🌑",
    weapon: "❤️ Conexão",
    shot: "❤️",
    bg1: "#111425",
    bg2: "#282d47",
    enemy: "🌑",
    boss: "🖤",
    description: "Use a Conexão para transformar sombras em companheiros de viagem.",
    tip: "Conexão pode começar com um gesto pequeno: conversar, procurar alguém ou aceitar companhia."
  }
];

const player = {
  x: W / 2 - 34,
  y: H - 90,
  w: 68,
  h: 58,
  speed: 7
};

let currentPhase = 0;
let score = 0;
let lives = 3;
let running = false;
let phaseRunning = false;
let bullets = [];
let enemies = [];
let particles = [];
let friends = [];
let keys = { left: false, right: false };
let spawnTimer = 0;
let phaseTimer = 0;
let bossSpawned = false;
let bossDefeated = false;
let frameLast = 0;
let shotsFired = 0;
let phaseKills = 0;
let invulnerableUntil = 0;

function updateHud() {
  phaseLabel.textContent = `${currentPhase + 1} — ${phases[currentPhase].name}`;
  livesLabel.textContent = "❤️".repeat(lives) || "—";
  scoreLabel.textContent = score;
  weaponLabel.textContent = phases[currentPhase].weapon;
}

function resetAll() {
  currentPhase = 0;
  score = 0;
  lives = 3;
  running = true;
  bullets = [];
  enemies = [];
  particles = [];
  friends = [];
  player.x = W / 2 - player.w / 2;
  updateHud();
}

function resetPhase() {
  bullets = [];
  enemies = [];
  particles = [];
  friends = [];
  spawnTimer = 0;
  phaseTimer = 0;
  bossSpawned = false;
  bossDefeated = false;
  shotsFired = 0;
  phaseKills = 0;
  player.x = W / 2 - player.w / 2;
  updateHud();
}

function showPhaseIntro() {
  const p = phases[currentPhase];
  phaseKicker.textContent = `FASE ${currentPhase + 1}`;
  phaseTitle.textContent = p.name;
  phaseDescription.textContent = p.description;
  phaseWeapon.textContent = `${p.weapon}`;
  phaseSymbol.textContent = p.symbol;
  phaseOverlay.classList.add("active");
}

function showMessage(text, tone = "good") {
  messageEl.textContent = text;
  messageEl.className = `guardian-message show ${tone}`;
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => {
    messageEl.classList.remove("show");
  }, 2200);
}

function spawnEnemy() {
  const p = phases[currentPhase];
  const size = 46 + Math.random() * 12;
  enemies.push({
    type: "normal",
    x: 20 + Math.random() * (W - size - 40),
    y: -70,
    w: size,
    h: size,
    speed: 1.3 + Math.random() * 1.3 + currentPhase * .12,
    hp: currentPhase === 3 ? 1 : 2,
    emoji: p.enemy,
    phase: currentPhase,
    sway: Math.random() * Math.PI * 2
  });
}

function spawnBoss() {
  const p = phases[currentPhase];
  enemies.push({
    type: "boss",
    x: W / 2 - 70,
    y: 40,
    w: 140,
    h: 120,
    speed: .6,
    hp: 18 + currentPhase * 4,
    maxHp: 18 + currentPhase * 4,
    emoji: p.boss,
    phase: currentPhase,
    dir: 1,
    sway: 0
  });
  bossSpawned = true;
  showMessage(`⚠️ Desafio maior: ${p.name}!`, "warn");
}

function shoot() {
  if (!phaseRunning) return;
  const p = phases[currentPhase];

  bullets.push({
    x: player.x + player.w / 2 - 10,
    y: player.y - 10,
    w: 20,
    h: 28,
    speed: currentPhase === 1 ? 9.6 : 10.5,
    emoji: p.shot,
    phase: currentPhase
  });

  shotsFired++;

  if (currentPhase === 1 && shotsFired % 7 === 0) {
    bullets.push({
      x: player.x + player.w / 2 - 28,
      y: player.y - 8,
      w: 56,
      h: 34,
      speed: 8.2,
      emoji: "💨",
      phase: currentPhase,
      wide: true
    });
  }
}

function hit(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function damagePlayer() {
  const now = performance.now();
  if (now < invulnerableUntil) return;

  lives--;
  invulnerableUntil = now + 1200;
  updateHud();
  showMessage("💥 Respire. Você ainda pode continuar.", "bad");

  if (lives <= 0) {
    phaseRunning = false;
    running = false;
    summaryEl.textContent = `Você chegou até a fase ${currentPhase + 1} e fez ${score} pontos.`;
    endOverlay.classList.add("active");
  }
}

function resolveEnemy(enemy) {
  if (enemy.type === "boss") {
    score += 150;
    bossDefeated = true;
    phaseKills++;
    burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "✨", 18);
    showMessage(phases[currentPhase].tip, "good");
    enemy.remove = true;
    setTimeout(finishPhase, 1300);
    return;
  }

  score += 10;
  phaseKills++;

  if (currentPhase === 3) {
    friends.push({
      x: enemy.x,
      y: enemy.y,
      w: 34,
      h: 34,
      emoji: "🙂",
      targetX: player.x + player.w / 2 + (friends.length % 2 ? 55 : -55),
      targetY: player.y + 18 + friends.length * 3
    });
    burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "❤️", 9);
  } else {
    burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, phases[currentPhase].shot, 8);
  }

  enemy.remove = true;
  if (phaseKills % 6 === 0) showMessage(phases[currentPhase].tip, "good");
}

function finishPhase() {
  phaseRunning = false;
  bullets = [];
  enemies = [];

  if (currentPhase < phases.length - 1) {
    currentPhase++;
    lives = Math.min(3, lives + 1);
    updateHud();
    setTimeout(showPhaseIntro, 500);
  } else {
    running = false;
    summaryEl.textContent = `Você fez ${score} pontos e desbloqueou Coragem, Respiração, Calma e Conexão.`;
    endOverlay.classList.add("active");
  }
}

function burst(x, y, emoji, count = 8) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - .5) * 5,
      vy: (Math.random() - .5) * 5,
      emoji,
      born: performance.now(),
      life: 650 + Math.random() * 550
    });
  }
}

function update(dt) {
  if (!phaseRunning) return;

  if (keys.left) player.x -= player.speed * dt * .06;
  if (keys.right) player.x += player.speed * dt * .06;
  player.x = Math.max(8, Math.min(W - player.w - 8, player.x));

  spawnTimer += dt;
  phaseTimer += dt;

  if (!bossSpawned && phaseTimer > 22000) {
    spawnBoss();
  } else if (!bossSpawned && spawnTimer > Math.max(420, 900 - currentPhase * 70)) {
    spawnEnemy();
    spawnTimer = 0;
  }

  bullets.forEach(b => b.y -= b.speed * dt * .06);
  bullets = bullets.filter(b => b.y + b.h > -30 && !b.remove);

  enemies.forEach(e => {
    if (e.type === "boss") {
      e.x += e.dir * e.speed * dt * .06;
      if (e.x <= 25 || e.x + e.w >= W - 25) e.dir *= -1;
      e.y = 52 + Math.sin(performance.now() * .002) * 20;
    } else {
      e.sway += dt * .0025;
      e.x += Math.sin(e.sway) * .65;
      e.y += e.speed * dt * .06;
    }
  });

  friends.forEach((f, index) => {
    const tx = player.x + player.w / 2 + (index % 2 ? 58 : -58);
    const ty = player.y + 8 + Math.floor(index / 2) * 26;
    f.x += (tx - f.x) * .04;
    f.y += (ty - f.y) * .04;
  });

  for (const b of bullets) {
    for (const e of enemies) {
      if (e.remove || b.remove) continue;
      if (hit(b, e)) {
        b.remove = true;

        if (currentPhase === 0) e.hp -= b.wide ? 2 : 1;
        if (currentPhase === 1) e.hp -= b.wide ? 3 : 1;
        if (currentPhase === 2) e.hp -= 1;
        if (currentPhase === 3) e.hp -= 1;

        burst(b.x, b.y, phases[currentPhase].shot, 4);

        if (e.hp <= 0) {
          resolveEnemy(e);
        }
      }
    }
  }

  const playerBox = { x: player.x + 10, y: player.y + 8, w: player.w - 20, h: player.h - 10 };

  enemies.forEach(e => {
    if (e.remove) return;

    if (e.type !== "boss" && e.y > H + 30) {
      e.remove = true;
      damagePlayer();
    } else if (hit(playerBox, e)) {
      e.remove = true;
      damagePlayer();
    }
  });

  enemies = enemies.filter(e => !e.remove);
  bullets = bullets.filter(b => !b.remove);

  particles = particles.filter(p => performance.now() - p.born < p.life);
  updateHud();
}

function drawBackground() {
  const p = phases[currentPhase];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p.bg1);
  g.addColorStop(1, p.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,.75)";
  for (let i = 0; i < 80; i++) {
    const x = (i * 83 + currentPhase * 29) % W;
    const y = (i * 47 + currentPhase * 61) % H;
    const r = (i % 3) + 1;
    ctx.globalAlpha = .18 + ((i % 5) * .11);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (currentPhase === 0) {
    ctx.globalAlpha = .12;
    ctx.font = "90px serif";
    ctx.fillText("🌫️", 80, 190);
    ctx.fillText("🌫️", 760, 310);
    ctx.globalAlpha = 1;
  }

  if (currentPhase === 1) {
    ctx.globalAlpha = .14;
    ctx.font = "82px serif";
    ctx.fillText("☁️", 120, 170);
    ctx.fillText("☁️", 710, 250);
    ctx.globalAlpha = 1;
  }

  if (currentPhase === 2) {
    ctx.globalAlpha = .12;
    ctx.font = "82px serif";
    ctx.fillText("🔥", 120, 210);
    ctx.fillText("🔥", 800, 230);
    ctx.globalAlpha = 1;
  }

  if (currentPhase === 3) {
    ctx.globalAlpha = .12;
    ctx.font = "88px serif";
    ctx.fillText("🌌", 100, 220);
    ctx.fillText("🌌", 710, 330);
    ctx.globalAlpha = 1;
  }
}

function drawShip() {
  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);

  if (performance.now() < invulnerableUntil && Math.floor(performance.now() / 100) % 2 === 0) {
    ctx.globalAlpha = .35;
  }

  ctx.fillStyle = "#f2f3f5";
  ctx.strokeStyle = "rgba(255,255,255,.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(28, 24);
  ctx.lineTo(7, 18);
  ctx.lineTo(0, 28);
  ctx.lineTo(-7, 18);
  ctx.lineTo(-28, 24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#8dd6df";
  ctx.beginPath();
  ctx.ellipse(0, -3, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffb36b";
  ctx.beginPath();
  ctx.moveTo(-7, 24);
  ctx.lineTo(0, 38 + Math.sin(performance.now() * .015) * 4);
  ctx.lineTo(7, 24);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawBullets() {
  bullets.forEach(b => {
    ctx.font = b.wide ? "34px serif" : "25px serif";
    ctx.fillText(b.emoji, b.x, b.y + b.h);
  });
}

function drawEnemies() {
  enemies.forEach(e => {
    if (e.type === "boss") {
      ctx.save();
      ctx.globalAlpha = .96;
      ctx.font = "90px serif";
      ctx.fillText(e.emoji, e.x + 22, e.y + 90);

      ctx.fillStyle = "rgba(255,255,255,.16)";
      ctx.fillRect(e.x, e.y + e.h + 8, e.w, 10);
      ctx.fillStyle = "#f1c96a";
      ctx.fillRect(e.x, e.y + e.h + 8, e.w * (e.hp / e.maxHp), 10);
      ctx.restore();
      return;
    }

    ctx.save();

    if (currentPhase === 0) {
      ctx.shadowColor = "rgba(255,255,255,.65)";
      ctx.shadowBlur = 14;
    } else if (currentPhase === 1) {
      ctx.shadowColor = "rgba(150,220,255,.45)";
      ctx.shadowBlur = 12;
    } else if (currentPhase === 2) {
      ctx.shadowColor = "rgba(255,100,40,.58)";
      ctx.shadowBlur = 13;
    } else {
      ctx.shadowColor = "rgba(90,100,160,.5)";
      ctx.shadowBlur = 14;
    }

    ctx.font = "42px serif";
    ctx.fillText(e.emoji, e.x, e.y + 40);
    ctx.restore();
  });
}

function drawFriends() {
  if (currentPhase !== 3) return;

  friends.forEach((f, index) => {
    ctx.save();
    ctx.shadowColor = "rgba(255,120,155,.5)";
    ctx.shadowBlur = 10;
    ctx.font = "28px serif";
    ctx.fillText(index % 2 ? "🙂" : "😊", f.x, f.y);
    ctx.restore();
  });
}

function drawParticles() {
  const now = performance.now();
  particles.forEach(p => {
    const age = now - p.born;
    const t = age / p.life;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += .02;
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.font = "18px serif";
    ctx.fillText(p.emoji, p.x, p.y);
  });
  ctx.globalAlpha = 1;
}

function render() {
  drawBackground();
  drawBullets();
  drawEnemies();
  drawFriends();
  drawShip();
  drawParticles();
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(32, now - frameLast || 16);
  frameLast = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function startJourney() {
  startOverlay.classList.remove("active");
  endOverlay.classList.remove("active");
  resetAll();
  showPhaseIntro();
  frameLast = performance.now();
  requestAnimationFrame(loop);
}

function startPhase() {
  phaseOverlay.classList.remove("active");
  resetPhase();
  phaseRunning = true;
  showMessage(phases[currentPhase].tip, "good");
}

window.addEventListener("keydown", e => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
  if (e.code === "Space") {
    e.preventDefault();
    shoot();
  }
});

window.addEventListener("keyup", e => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
});

let mobileLeft = false;
let mobileRight = false;

function syncMobile() {
  keys.left = mobileLeft;
  keys.right = mobileRight;
}

leftBtn.addEventListener("pointerdown", () => { mobileLeft = true; syncMobile(); });
leftBtn.addEventListener("pointerup", () => { mobileLeft = false; syncMobile(); });
leftBtn.addEventListener("pointerleave", () => { mobileLeft = false; syncMobile(); });

rightBtn.addEventListener("pointerdown", () => { mobileRight = true; syncMobile(); });
rightBtn.addEventListener("pointerup", () => { mobileRight = false; syncMobile(); });
rightBtn.addEventListener("pointerleave", () => { mobileRight = false; syncMobile(); });

shootBtn.addEventListener("click", shoot);
startBtn.addEventListener("click", startJourney);
continueBtn.addEventListener("click", startPhase);
restartBtn.addEventListener("click", startJourney);

updateHud();
render();
