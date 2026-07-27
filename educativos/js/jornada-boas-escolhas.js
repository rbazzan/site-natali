
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const stage = document.getElementById("runnerStage");
const startOverlay = document.getElementById("startOverlay");
const endOverlay = document.getElementById("endOverlay");
const startBtn = document.getElementById("startRunner");
const restartBtn = document.getElementById("restartRunner");
const jumpBtn = document.getElementById("jumpBtn");
const duckBtn = document.getElementById("duckBtn");
const feedbackEl = document.getElementById("runnerFeedback");
const distanceEl = document.getElementById("distance");
const goodChoicesEl = document.getElementById("goodChoices");
const energyFill = document.getElementById("energyFill");
const powerLabel = document.getElementById("powerLabel");
const endSummary = document.getElementById("endSummary");

const W = canvas.width;
const H = canvas.height;
const GROUND = 410;

const GOOD_ITEMS = [
  { emoji: "❤️", label: "Empatia", power: "multiplier", tip: "Empatia é tentar perceber como o outro pode estar se sentindo." },
  { emoji: "🤝", label: "Ajuda", power: "secondChance", tip: "Oferecer ajuda pode fazer diferença quando alguém está com dificuldade." },
  { emoji: "💬", label: "Diálogo", power: "dialogue", tip: "Conversar com respeito ajuda a resolver problemas." },
  { emoji: "🌬️", label: "Calma", power: "shield", tip: "Respirar e fazer uma pausa pode ajudar antes de agir." },
  { emoji: "⭐", label: "Coragem", power: "highJump", tip: "Coragem não é não sentir medo; é conseguir seguir mesmo com ele." },
  { emoji: "🫂", label: "Amizade", power: "friendship", tip: "Amizade também envolve respeito, cuidado e espaço para conversar." }
];

const BAD_ITEMS = [
  { emoji: "😡", label: "Gritar", tip: "Gritar pode deixar uma conversa ainda mais difícil." },
  { emoji: "👊", label: "Bater", tip: "Bater pode machucar. É melhor buscar outra forma de mostrar o que sentimos." },
  { emoji: "😒", label: "Zombar", tip: "Zombar pode ferir alguém, mesmo quando parece brincadeira." },
  { emoji: "🚫", label: "Excluir", tip: "Deixar alguém de fora pode machucar. Incluir e conversar costuma ajudar." },
  { emoji: "🤬", label: "Xingar", tip: "Xingar pode aumentar o conflito. Palavras respeitosas ajudam mais." }
];

const player = {
  x: 150,
  y: GROUND - 72,
  w: 54,
  h: 72,
  vy: 0,
  jumping: false,
  ducking: false,
  grounded: true
};

let running = false;
let lastTime = 0;
let speed = 7;
let distance = 0;
let goodChoices = 0;
let energy = 100;
let worldOffset = 0;
let spawnClock = 0;
let scenarioClock = 0;
let objects = [];
let particles = [];
let activePower = null;
let powerUntil = 0;
let graceUntil = 0;
let secondChance = false;
let choiceMultiplier = 1;
let currentScenario = null;
let swipeStartY = null;

function resetGame() {
  player.y = GROUND - 72;
  player.vy = 0;
  player.jumping = false;
  player.ducking = false;
  player.grounded = true;
  speed = 7;
  distance = 0;
  goodChoices = 0;
  energy = 100;
  worldOffset = 0;
  spawnClock = 0;
  scenarioClock = 0;
  objects = [];
  particles = [];
  activePower = null;
  powerUntil = 0;
  graceUntil = 0;
  secondChance = false;
  choiceMultiplier = 1;
  currentScenario = null;
  updateHud();
}

function updateHud() {
  distanceEl.textContent = Math.floor(distance);
  goodChoicesEl.textContent = goodChoices;
  energyFill.style.width = `${Math.max(0, energy)}%`;
  energyFill.classList.toggle("low", energy <= 30);
  powerLabel.textContent = activePower ? activePower.label : "—";
}

function showFeedback(text, tone = "good") {
  feedbackEl.textContent = text;
  feedbackEl.className = `runner-feedback show ${tone}`;
  clearTimeout(showFeedback.timer);
  showFeedback.timer = setTimeout(() => {
    feedbackEl.classList.remove("show");
  }, 2200);
}

function jump() {
  if (!running) return;
  if (player.grounded) {
    const boost = activePower?.type === "highJump" && performance.now() < powerUntil ? 1.22 : 1;
    player.vy = -17.2 * boost;
    player.grounded = false;
    player.jumping = true;
    player.ducking = false;
  }
}

function setDuck(value) {
  if (!running) return;
  player.ducking = value && player.grounded;
}

function spawn(type, data = {}) {
  if (type === "rock") {
    objects.push({ type, x: W + 60, y: GROUND - 44, w: 48, h: 44, emoji: "🪨" });
  } else if (type === "log") {
    objects.push({ type, x: W + 60, y: GROUND - 34, w: 70, h: 34, emoji: "🪵" });
  } else if (type === "puddle") {
    objects.push({ type, x: W + 60, y: GROUND - 18, w: 85, h: 18, emoji: "💧" });
  } else if (type === "branch") {
    objects.push({ type, x: W + 60, y: GROUND - 125, w: 90, h: 32, emoji: "🌿" });
  } else if (type === "gap") {
    objects.push({ type, x: W + 60, y: GROUND, w: 130, h: 120 });
  } else if (type === "good") {
    const item = data.item || GOOD_ITEMS[Math.floor(Math.random() * GOOD_ITEMS.length)];
    objects.push({ type, x: W + 60, y: GROUND - (Math.random() > .45 ? 120 : 65), w: 54, h: 54, item });
  } else if (type === "bad") {
    const item = data.item || BAD_ITEMS[Math.floor(Math.random() * BAD_ITEMS.length)];
    objects.push({ type, x: W + 60, y: GROUND - (Math.random() > .5 ? 115 : 60), w: 56, h: 56, item });
  } else if (type === "choice") {
    objects.push({ ...data, type, x: W + 80, w: 62, h: 62 });
  }
}

function spawnPattern() {
  const roll = Math.random();

  if (roll < .22) spawn("rock");
  else if (roll < .36) spawn("log");
  else if (roll < .48) spawn("puddle");
  else if (roll < .58) spawn("gap");
  else if (roll < .66) spawn("branch");
  else if (roll < .84) spawn("good");
  else spawn("bad");

  if (Math.random() < .28) {
    setTimeout(() => {
      if (running) spawn(Math.random() > .48 ? "good" : "bad");
    }, 520);
  }
}

const SCENARIOS = [
  {
    text: "Uma criança caiu no recreio.",
    good: { emoji: "🤝", label: "Ajudar", tip: "Oferecer ajuda mostra cuidado e atenção com o outro." },
    bad: { emoji: "😂", label: "Zombar", tip: "Zombar pode deixar alguém ainda mais triste ou envergonhado." }
  },
  {
    text: "Seu amigo está triste.",
    good: { emoji: "💬", label: "Conversar", tip: "Perguntar se a pessoa quer conversar pode ser uma forma de cuidado." },
    bad: { emoji: "😒", label: "Ignorar", tip: "Às vezes precisamos de espaço, mas também podemos mostrar que estamos disponíveis." }
  },
  {
    text: "Alguém pegou seu brinquedo sem pedir.",
    good: { emoji: "🌬️", label: "Respirar", tip: "Respirar antes de agir pode ajudar a escolher o que fazer." },
    bad: { emoji: "👊", label: "Bater", tip: "Bater pode machucar. Falar ou pedir ajuda costuma ser melhor." }
  },
  {
    text: "Você quer entrar numa brincadeira.",
    good: { emoji: "🗣️", label: "Perguntar", tip: "Perguntar se pode participar é uma forma respeitosa de se aproximar." },
    bad: { emoji: "🚫", label: "Empurrar", tip: "Empurrar pode machucar e dificultar a aproximação." }
  }
];

function spawnScenario() {
  if (!running || objects.some(o => o.type === "choice")) return;
  const s = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  currentScenario = s;
  showFeedback(`💭 ${s.text}`, "scenario");

  spawn("choice", { y: GROUND - 130, item: s.good, choiceKind: "good", scenario: s });
  setTimeout(() => {
    if (running) spawn("choice", { y: GROUND - 65, item: s.bad, choiceKind: "bad", scenario: s });
  }, 420);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}

function playerHitbox() {
  const h = player.ducking ? 42 : player.h;
  const y = player.ducking ? GROUND - 42 : player.y;
  return { x: player.x + 8, y: y + 4, w: player.w - 16, h: h - 6 };
}

function fallIntoGap(obj) {
  if (!running) return;

  running = false;
  clearTimeout(showFeedback.timer);
  showFeedback("🕳️ Ops! Você caiu no penhasco.", "bad");

  // Pequena animação de queda antes da tela final.
  const startY = player.y;
  const start = performance.now();

  function animateFall(now) {
    const t = Math.min(1, (now - start) / 650);
    player.y = startY + (H - startY + 80) * (t * t);
    player.vy = 0;

    drawBackground();
    drawObjects();
    drawPlayer();
    drawParticles();

    if (t < 1) {
      requestAnimationFrame(animateFall);
    } else {
      endSummary.textContent =
        `Você percorreu ${Math.floor(distance)} metros e encontrou ${goodChoices} boas escolhas. O penhasco encerrou esta corrida.`;
      endOverlay.classList.add("active");
    }
  }

  requestAnimationFrame(animateFall);
}

function loseEnergy(amount, text) {
  const now = performance.now();
  if (now < graceUntil) return;

  if (activePower?.type === "shield" && now < powerUntil) {
    showFeedback("🌬️ A calma protegeu você desta vez.", "good");
    activePower = null;
    powerUntil = 0;
    updateHud();
    graceUntil = now + 800;
    return;
  }

  if (secondChance) {
    secondChance = false;
    showFeedback("🤝 A ajuda deu uma segunda chance!", "good");
    graceUntil = now + 900;
    return;
  }

  energy = Math.max(0, energy - amount);
  graceUntil = now + 900;
  showFeedback(text, "bad");
  updateHud();

  if (energy <= 0) endGame();
}

function activateGood(item) {
  goodChoices++;
  energy = Math.min(100, energy + 7);

  const now = performance.now();
  if (item.power === "shield") {
    activePower = { type: "shield", label: "🌬️ Calma" };
    powerUntil = now + 6500;
  } else if (item.power === "highJump") {
    activePower = { type: "highJump", label: "⭐ Coragem" };
    powerUntil = now + 7000;
  } else if (item.power === "secondChance") {
    secondChance = true;
    activePower = { type: "secondChance", label: "🤝 Ajuda" };
    powerUntil = now + 9000;
  } else if (item.power === "multiplier") {
    choiceMultiplier = 2;
    activePower = { type: "multiplier", label: "❤️ Empatia x2" };
    powerUntil = now + 7000;
  } else {
    activePower = { type: item.power, label: `${item.emoji} ${item.label}` };
    powerUntil = now + 5000;
  }

  showFeedback(`${item.emoji} ${item.tip}`, "good");
  burst(player.x + 40, player.y + 25, item.emoji);
  updateHud();
}

function handleCollision(obj) {
  if (obj.hit) return;
  obj.hit = true;

  if (obj.type === "good") {
    activateGood(obj.item);
    obj.remove = true;
  } else if (obj.type === "bad") {
    loseEnergy(14, `${obj.item.emoji} ${obj.item.tip}`);
    obj.remove = true;
  } else if (obj.type === "choice") {
    if (obj.choiceKind === "good") {
      goodChoices += 1 * choiceMultiplier;
      energy = Math.min(100, energy + 9);
      showFeedback(`⭐ ${obj.item.tip}`, "good");
      burst(player.x + 40, player.y + 20, obj.item.emoji);
    } else {
      loseEnergy(16, `${obj.item.emoji} ${obj.item.tip}`);
    }
    obj.remove = true;
  } else {
    const messages = {
      rock: "🪨 Ops! Uma pedra. Tente observar o caminho e pular no tempo certo.",
      log: "🪵 O tronco atrapalhou o caminho. Vamos de novo!",
      puddle: "💧 Você escorregou na poça. Tudo bem, continue.",
      branch: "🌿 Esse galho era baixo. Abaixar ajuda a passar.",
      gap: "🕳️ Cuidado com o abismo! Pule antes de chegar nele."
    };
    loseEnergy(obj.type === "gap" ? 24 : 18, messages[obj.type]);
  }
}

function burst(x, y, emoji) {
  for (let i = 0; i < 7; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - .5) * 5,
      vy: -Math.random() * 5 - 1,
      life: 800 + Math.random() * 500,
      born: performance.now(),
      emoji
    });
  }
}

function update(dt) {
  speed += dt * 0.00028;
  distance += speed * dt * 0.012;
  worldOffset += speed * dt * 0.06;

  if (activePower && performance.now() > powerUntil) {
    if (activePower.type === "multiplier") choiceMultiplier = 1;
    if (activePower.type === "secondChance") secondChance = false;
    activePower = null;
    powerUntil = 0;
  }

  player.vy += 0.9 * dt * 0.06;
  player.y += player.vy * dt * 0.06;

  if (player.y >= GROUND - player.h) {
    player.y = GROUND - player.h;
    player.vy = 0;
    player.grounded = true;
    player.jumping = false;
  }

  spawnClock += dt;
  scenarioClock += dt;

  const spawnInterval = Math.max(850, 1500 - speed * 35);
  if (spawnClock > spawnInterval) {
    spawnPattern();
    spawnClock = 0;
  }

  if (scenarioClock > 12000) {
    spawnScenario();
    scenarioClock = 0;
  }

  const hitbox = playerHitbox();

  for (const obj of objects) {
    obj.x -= speed * dt * 0.06;

    if (obj.type === "gap") {
      const playerLeft = hitbox.x + 8;
      const playerRight = hitbox.x + hitbox.w - 8;
      const overGap = playerRight > obj.x + 10 && playerLeft < obj.x + obj.w - 10;

      // O penhasco é o único obstáculo fatal:
      // se o personagem estiver no chão sobre o vão, a corrida termina.
      if (overGap && player.grounded) {
        fallIntoGap(obj);
      }
    } else if (rectsOverlap(hitbox, obj)) {
      handleCollision(obj);
    }

    if (obj.x + obj.w < -40) obj.remove = true;
  }

  objects = objects.filter(o => !o.remove);
  particles = particles.filter(p => performance.now() - p.born < p.life);
  updateHud();
}

function drawBackground() {
  ctx.clearRect(0, 0, W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#dff0ef");
  sky.addColorStop(.7, "#f8f2e9");
  sky.addColorStop(1, "#e8efdf");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,.75)";
  for (let i = 0; i < 5; i++) {
    const x = ((i * 280 - worldOffset * 0.15) % (W + 320)) - 120;
    const y = 75 + (i % 2) * 45;
    ctx.font = "54px serif";
    ctx.fillText("☁️", x, y);
  }

  ctx.fillStyle = "#9dbb91";
  for (let i = 0; i < 9; i++) {
    const x = ((i * 170 - worldOffset * 0.32) % (W + 220)) - 110;
    ctx.font = "72px serif";
    ctx.fillText(i % 3 === 0 ? "🌳" : "🌲", x, GROUND - 25);
  }

  ctx.fillStyle = "#7f9b73";
  ctx.fillRect(0, GROUND, W, 12);

  ctx.fillStyle = "#d8c5a8";
  ctx.fillRect(0, GROUND + 12, W, H - GROUND - 12);

  ctx.strokeStyle = "rgba(90,70,50,.12)";
  ctx.lineWidth = 2;
  for (let x = -100; x < W + 100; x += 80) {
    const px = x - (worldOffset % 80);
    ctx.beginPath();
    ctx.moveTo(px, GROUND + 70);
    ctx.lineTo(px + 35, GROUND + 70);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();

  const x = player.x;
  const y = player.ducking ? GROUND - 44 : player.y;
  const bob = player.grounded && running ? Math.sin(worldOffset * .08) * 2 : 0;

  ctx.translate(x, y + bob);

  ctx.font = player.ducking ? "42px serif" : "54px serif";
  ctx.fillText(player.ducking ? "🧒" : "🧒", 0, player.ducking ? 38 : 50);

  ctx.strokeStyle = "#244634";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  if (!player.ducking) {
    const phase = Math.sin(worldOffset * .18);
    ctx.beginPath();
    ctx.moveTo(26, 48);
    ctx.lineTo(18 + phase * 8, 70);
    ctx.moveTo(28, 48);
    ctx.lineTo(38 - phase * 8, 70);
    ctx.stroke();
  }

  if (performance.now() < graceUntil) {
    ctx.strokeStyle = "rgba(170,33,69,.35)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(27, 34, 38, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (activePower?.type === "shield" && performance.now() < powerUntil) {
    ctx.strokeStyle = "rgba(63,125,145,.55)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(27, 34, 43, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawObjects() {
  for (const obj of objects) {
    if (obj.type === "gap") {
      // Dark depth behind the broken ground.
      const abyss = ctx.createLinearGradient(0, GROUND, 0, H);
      abyss.addColorStop(0, "#302923");
      abyss.addColorStop(.42, "#171515");
      abyss.addColorStop(1, "#090a0a");
      ctx.fillStyle = abyss;
      ctx.fillRect(obj.x, GROUND - 2, obj.w, H - GROUND + 4);

      // Subtle mist deep inside the ravine.
      ctx.save();
      ctx.globalAlpha = .16;
      ctx.fillStyle = "#d9e7df";
      ctx.beginPath();
      ctx.ellipse(obj.x + obj.w * .48, GROUND + 112, obj.w * .38, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Left broken cliff face.
      ctx.fillStyle = "#7d644c";
      ctx.beginPath();
      ctx.moveTo(obj.x - 44, GROUND - 4);
      ctx.lineTo(obj.x + 6, GROUND - 4);
      ctx.lineTo(obj.x - 5, GROUND + 34);
      ctx.lineTo(obj.x + 10, GROUND + 62);
      ctx.lineTo(obj.x - 8, GROUND + 96);
      ctx.lineTo(obj.x + 4, GROUND + 135);
      ctx.lineTo(obj.x - 28, H);
      ctx.lineTo(obj.x - 62, H);
      ctx.closePath();
      ctx.fill();

      // Right broken cliff face.
      ctx.beginPath();
      ctx.moveTo(obj.x + obj.w - 6, GROUND - 4);
      ctx.lineTo(obj.x + obj.w + 46, GROUND - 4);
      ctx.lineTo(obj.x + obj.w + 62, H);
      ctx.lineTo(obj.x + obj.w + 26, H);
      ctx.lineTo(obj.x + obj.w + 4, GROUND + 138);
      ctx.lineTo(obj.x + obj.w + 14, GROUND + 104);
      ctx.lineTo(obj.x + obj.w - 7, GROUND + 73);
      ctx.lineTo(obj.x + obj.w + 8, GROUND + 36);
      ctx.closePath();
      ctx.fill();

      // Rock strata on both walls.
      ctx.strokeStyle = "rgba(57,43,32,.34)";
      ctx.lineWidth = 3;
      for (let yy = GROUND + 34; yy < H - 14; yy += 42) {
        ctx.beginPath();
        ctx.moveTo(obj.x - 34, yy);
        ctx.lineTo(obj.x - 3, yy + 8);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(obj.x + obj.w + 4, yy + 4);
        ctx.lineTo(obj.x + obj.w + 36, yy - 3);
        ctx.stroke();
      }

      // Jagged grass edges emphasize where the safe ground stops.
      ctx.fillStyle = "#6f8f66";
      ctx.beginPath();
      ctx.moveTo(obj.x - 52, GROUND - 5);
      ctx.lineTo(obj.x - 26, GROUND - 12);
      ctx.lineTo(obj.x - 9, GROUND - 4);
      ctx.lineTo(obj.x + 5, GROUND - 15);
      ctx.lineTo(obj.x + 3, GROUND + 2);
      ctx.lineTo(obj.x - 52, GROUND + 2);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(obj.x + obj.w - 3, GROUND - 15);
      ctx.lineTo(obj.x + obj.w + 12, GROUND - 5);
      ctx.lineTo(obj.x + obj.w + 30, GROUND - 13);
      ctx.lineTo(obj.x + obj.w + 53, GROUND - 4);
      ctx.lineTo(obj.x + obj.w + 53, GROUND + 2);
      ctx.lineTo(obj.x + obj.w - 3, GROUND + 2);
      ctx.closePath();
      ctx.fill();

      continue;
    }

    if (obj.type === "good" || obj.type === "bad" || obj.type === "choice") {
      const isGood = obj.type === "good" || obj.choiceKind === "good";
      const now = performance.now();

      ctx.save();

      if (isGood) {
        // Positive items pulse and glow so the child immediately knows they are desirable.
        const pulse = 1 + Math.sin(now * 0.009 + obj.x * 0.02) * 0.10;
        const cx = obj.x + obj.w / 2;
        const cy = obj.y + obj.h / 2;

        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);
        ctx.translate(-cx, -cy);

        const glow = .28 + (Math.sin(now * 0.012 + obj.x) + 1) * .16;
        ctx.shadowColor = `rgba(255, 218, 92, ${glow})`;
        ctx.shadowBlur = 22;
        ctx.fillStyle = "rgba(255,255,246,.96)";
        ctx.strokeStyle = "rgba(246,190,45,.72)";
        ctx.lineWidth = 3;
        roundRect(ctx, obj.x, obj.y, obj.w, obj.h, 18, true, true);

        ctx.shadowBlur = 12;
        ctx.font = "36px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(obj.item.emoji, cx, cy + 1);

        // Small twinkling stars around positive items.
        ctx.shadowBlur = 0;
        ctx.globalAlpha = .55 + (Math.sin(now * .015) + 1) * .18;
        ctx.font = "13px serif";
        ctx.fillText("✨", obj.x + 5, obj.y + 8);
        ctx.fillText("✨", obj.x + obj.w - 5, obj.y + obj.h - 6);
      } else {
        // Undesirable choices get a haunted, smoky visual instead of a text label.
        const wobble = Math.sin(now * 0.006 + obj.x * .015) * 2;
        ctx.translate(wobble, 0);

        ctx.shadowColor = "rgba(68, 30, 88, .72)";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "rgba(58, 46, 66, .90)";
        ctx.strokeStyle = "rgba(111, 76, 128, .82)";
        ctx.lineWidth = 3;
        roundRect(ctx, obj.x, obj.y, obj.w, obj.h, 18, true, true);

        const cx = obj.x + obj.w / 2;
        const cy = obj.y + obj.h / 2;

        ctx.shadowBlur = 7;
        ctx.font = "34px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = .88;
        ctx.fillText(obj.item.emoji, cx, cy);

        // Ghostly mist / aura.
        ctx.shadowBlur = 0;
        ctx.globalAlpha = .30 + (Math.sin(now * .01 + obj.x) + 1) * .10;
        ctx.fillStyle = "rgba(88,72,102,.55)";
        ctx.beginPath();
        ctx.arc(obj.x + 10, obj.y + 7, 7, 0, Math.PI * 2);
        ctx.arc(obj.x + obj.w - 8, obj.y + 12, 10, 0, Math.PI * 2);
        ctx.arc(obj.x + obj.w / 2, obj.y + obj.h - 5, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      continue;
    }

    ctx.font = obj.type === "branch" ? "54px serif" : "44px serif";
    ctx.fillText(obj.emoji, obj.x, obj.y + obj.h);
  }
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawParticles() {
  const now = performance.now();
  for (const p of particles) {
    const age = now - p.born;
    const t = age / p.life;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += .08;
    ctx.globalAlpha = 1 - t;
    ctx.font = "20px serif";
    ctx.fillText(p.emoji, p.x, p.y);
    ctx.globalAlpha = 1;
  }
}

function render() {
  drawBackground();
  drawObjects();
  drawPlayer();
  drawParticles();
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(32, now - lastTime || 16.67);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function startGame() {
  resetGame();
  running = true;
  startOverlay.classList.remove("active");
  endOverlay.classList.remove("active");
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function endGame() {
  if (!running) return;
  running = false;
  endSummary.textContent = `Você percorreu ${Math.floor(distance)} metros e encontrou ${goodChoices} boas escolhas.`;
  endOverlay.classList.add("active");
}

window.addEventListener("keydown", e => {
  if (["Space", "ArrowUp"].includes(e.code)) {
    e.preventDefault();
    jump();
  }
  if (e.code === "ArrowDown") {
    e.preventDefault();
    setDuck(true);
  }
});

window.addEventListener("keyup", e => {
  if (e.code === "ArrowDown") setDuck(false);
});

stage.addEventListener("pointerdown", e => {
  swipeStartY = e.clientY;
});

stage.addEventListener("pointerup", e => {
  if (swipeStartY === null) return;
  const dy = e.clientY - swipeStartY;
  if (dy > 40) {
    setDuck(true);
    setTimeout(() => setDuck(false), 500);
  } else {
    jump();
  }
  swipeStartY = null;
});

jumpBtn.addEventListener("click", jump);
duckBtn.addEventListener("pointerdown", () => setDuck(true));
duckBtn.addEventListener("pointerup", () => setDuck(false));
duckBtn.addEventListener("pointerleave", () => setDuck(false));
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

resetGame();
render();
