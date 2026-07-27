
const stage = document.getElementById("rainStage");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const timerEl = document.getElementById("timer");
const msgEl = document.getElementById("gameMessage");
const startBtn = document.getElementById("startGame");
const restartBtn = document.getElementById("restartGame");
const soundBtn = document.getElementById("soundToggle");

const EMOTIONS = [
  { type: "raiva", emoji: "😡", label: "Raiva" },
  { type: "tristeza", emoji: "😢", label: "Tristeza" },
  { type: "medo", emoji: "😨", label: "Medo" },
  { type: "preocupacao", emoji: "😟", label: "Preocupação" },
  { type: "alegria", emoji: "😄", label: "Alegria" }
];

const TIPS = {
  raiva: "Respirar e fazer uma pausa pode ajudar a raiva a diminuir.",
  tristeza: "A tristeza também precisa de acolhimento e companhia.",
  medo: "Quando sentimos medo, procurar segurança e apoio pode ajudar.",
  preocupacao: "Conversar com alguém de confiança pode aliviar uma preocupação.",
  alegria: "Alegria também pode ser compartilhada e guardada como uma boa lembrança."
};

let playing = false;
let score = 0;
let combo = 1;
let timeLeft = 60;
let spawnTimer = null;
let gameTimer = null;
let soundOn = false;

function updateHud() {
  scoreEl.textContent = score;
  comboEl.textContent = `x${combo}`;
  timerEl.textContent = timeLeft;
}

function clearDrops() {
  stage.querySelectorAll(".emotion-drop").forEach(el => el.remove());
}

function showMessage(text, good = null) {
  msgEl.innerHTML = text;
  msgEl.classList.remove("good", "try");
  if (good === true) msgEl.classList.add("good");
  if (good === false) msgEl.classList.add("try");
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnEmotion() {
  if (!playing) return;

  const emotion = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
  const drop = document.createElement("div");
  drop.className = "emotion-drop";
  drop.dataset.type = emotion.type;
  drop.setAttribute("role", "button");
  drop.setAttribute("aria-label", emotion.label);
  drop.innerHTML = `<span>${emotion.emoji}</span><small>${emotion.label}</small>`;

  const maxX = Math.max(40, stage.clientWidth - 90);
  drop.style.left = `${randomBetween(10, maxX)}px`;
  drop.style.top = `42px`;

  stage.appendChild(drop);

  const duration = randomBetween(7.5, 11.5) * 1000;
  const start = performance.now();
  let dragging = false;
  let pointerId = null;
  let offsetX = 0;
  let offsetY = 0;

  function fall(now) {
    if (!drop.isConnected || dragging || !playing) return;
    const t = Math.min(1, (now - start) / duration);
    const maxY = stage.clientHeight - 125;
    drop.style.top = `${42 + t * (maxY - 42)}px`;

    if (t < 1) {
      requestAnimationFrame(fall);
    } else {
      miss(drop);
    }
  }

  drop.addEventListener("pointerdown", e => {
    if (!playing) return;
    dragging = true;
    pointerId = e.pointerId;
    drop.setPointerCapture(pointerId);
    drop.classList.add("dragging");

    const rect = drop.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
  });

  drop.addEventListener("pointermove", e => {
    if (!dragging || e.pointerId !== pointerId) return;
    const stageRect = stage.getBoundingClientRect();
    const x = e.clientX - stageRect.left - offsetX;
    const y = e.clientY - stageRect.top - offsetY;

    drop.style.left = `${Math.max(0, Math.min(x, stage.clientWidth - drop.offsetWidth))}px`;
    drop.style.top = `${Math.max(0, Math.min(y, stage.clientHeight - drop.offsetHeight))}px`;
  });

  drop.addEventListener("pointerup", e => {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    drop.classList.remove("dragging");
    evaluateDrop(drop);
  });

  requestAnimationFrame(fall);
}

function evaluateDrop(drop) {
  const dropRect = drop.getBoundingClientRect();
  const cx = dropRect.left + dropRect.width / 2;
  const cy = dropRect.top + dropRect.height / 2;

  const zones = [...stage.querySelectorAll(".drop-zone")];
  const target = zones.find(zone => {
    const r = zone.getBoundingClientRect();
    return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  });

  if (!target) {
    showMessage("Quase! Arraste a emoção até uma das áreas de cuidado.", false);
    return;
  }

  const emotionType = drop.dataset.type;
  const zoneType = target.dataset.zone;

  if (emotionType === zoneType) {
    score += 10 * combo;
    combo = Math.min(combo + 1, 5);
    updateHud();

    target.classList.add("zone-hit");
    drop.classList.add("resolved");
    const originalEmoji = drop.querySelector("span").textContent;

    setTimeout(() => {
      if (emotionType !== "alegria") {
        drop.querySelector("span").textContent = "😌";
      } else {
        drop.querySelector("span").textContent = "✨";
      }
    }, 180);

    showMessage(`⭐ <strong>Boa!</strong> ${TIPS[emotionType]}`, true);
    beep(true);

    setTimeout(() => {
      target.classList.remove("zone-hit");
      drop.remove();
    }, 650);
  } else {
    combo = 1;
    updateHud();
    target.classList.add("zone-wrong");
    showMessage(`🤔 Essa emoção talvez precise de outro tipo de cuidado. Tente novamente.`, false);
    beep(false);
    setTimeout(() => target.classList.remove("zone-wrong"), 450);
  }
}

function miss(drop) {
  if (!drop.isConnected) return;
  combo = 1;
  updateHud();
  drop.classList.add("missed");
  showMessage("Essa emoção passou sem cuidado. Tudo bem — tente pegar a próxima.", false);
  setTimeout(() => drop.remove(), 500);
}

function startGame() {
  clearDrops();
  score = 0;
  combo = 1;
  timeLeft = 60;
  playing = true;
  updateHud();

  startBtn.disabled = true;
  restartBtn.disabled = false;
  showMessage("Vamos lá! Arraste cada emoção até o lugar que pode ajudar a cuidar dela.");

  spawnEmotion();
  spawnTimer = setInterval(spawnEmotion, 1250);

  gameTimer = setInterval(() => {
    timeLeft--;
    updateHud();

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  playing = false;
  clearInterval(spawnTimer);
  clearInterval(gameTimer);
  startBtn.disabled = false;
  restartBtn.disabled = true;

  stage.querySelectorAll(".emotion-drop").forEach(el => {
    el.classList.add("paused");
  });

  let ending = "Você praticou cuidar das emoções!";
  if (score >= 250) ending = "Uau! Você cuidou de muitas emoções!";
  else if (score >= 120) ending = "Muito bem! Você encontrou vários lugares de cuidado.";

  showMessage(`🌱 <strong>${ending}</strong><br>Você fez <strong>${score} pontos</strong>.`);
}

function restartGame() {
  clearInterval(spawnTimer);
  clearInterval(gameTimer);
  playing = false;
  clearDrops();
  startGame();
}

function beep(success) {
  if (!soundOn) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = success ? 640 : 220;
    gain.gain.value = 0.04;

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (_) {}
}

soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  soundBtn.setAttribute("aria-pressed", String(soundOn));
  soundBtn.textContent = soundOn ? "🔊 Som" : "🔇 Som";
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);

updateHud();
