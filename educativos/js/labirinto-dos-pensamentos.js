
const canvas = document.getElementById("mindCanvas");
const ctx = canvas.getContext("2d");
const levelEl = document.getElementById("mindLevel");
const livesEl = document.getElementById("mindLives");
const scoreEl = document.getElementById("mindScore");
const powerEl = document.getElementById("mindPower");
const startOverlay = document.getElementById("mindStart");
const reflectionOverlay = document.getElementById("reflectionOverlay");
const levelOverlay = document.getElementById("mindLevelOverlay");
const endOverlay = document.getElementById("mindEnd");
const messageEl = document.getElementById("mindMessage");
const questionEl = document.getElementById("reflectionQuestion");
const helpfulBtn = document.getElementById("reflectionHelpful");
const unhelpfulBtn = document.getElementById("reflectionUnhelpful");
const nextBtn = document.getElementById("mindNextBtn");

const COLS = 15, ROWS = 11, TILE = 54;
const OFFSET_X = 45, OFFSET_Y = 28;
const maps = [
[
"###############",
"#P..#.....#...#",
"#.#.#.###.#.#.#",
"#.#...#L#...#.#",
"#.###.#.#.###.#",
"#.....#.#.....#",
"###.#.#.#.#.###",
"#...#...#.#...#",
"#.#####.#.###.#",
"#......L......E#",
"###############"
],
[
"###############",
"#P....#.......#",
"###.#.#.#####.#",
"#...#...#...#.#",
"#.#####.#.#.#.#",
"#.....#L#.#...#",
"#.###.###.###.#",
"#.#.......#...#",
"#.#.#####.#.###",
"#...L.....#...E#",
"###############"
],
[
"###############",
"#P..#.........#",
"#.#.#.#######.#",
"#.#...#.....#.#",
"#.###.#.###.#.#",
"#...#L#.#...#.#",
"###.#.#.#.###.#",
"#...#...#.....#",
"#.#####.#####.#",
"#.....L.......E#",
"###############"
]
];

const reflections = [
 {q:"“Eu não consigo fazer isso.”", good:"Ainda não consigo, mas posso aprender.", bad:"Nunca vou conseguir.", power:"🛡️ Autoconfiança"},
 {q:"“Se eu errar, vai ser horrível.”", good:"Errar também faz parte de aprender.", bad:"Eu tenho que acertar tudo.", power:"❤️ Autocompaixão"},
 {q:"“Todo mundo vai rir de mim.”", good:"Não posso saber o que todos vão pensar.", bad:"Com certeza vão rir.", power:"🔦 Outra perspectiva"},
 {q:"“Preciso resolver isso agora!”", good:"Posso fazer uma pausa e pensar.", bad:"Tenho que resolver tudo imediatamente.", power:"🐢 Pausa"}
];

let level=0, score=0, lives=3, running=false, paused=false;
let grid=[], player={c:1,r:1}, dots=[], lights=[], enemies=[], exit={c:13,r:9};
let currentReflection=null, power=null, powerUntil=0, lastMove=0, enemyTick=0, frame=0;
let direction={dc:0,dr:0};

function parseMap(){
  grid=maps[level].map(r=>r.split(""));
  dots=[]; lights=[]; enemies=[];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const ch=grid[r][c];
    if(ch==="P"){player={c,r};grid[r][c]=" ";}
    if(ch==="E"){exit={c,r};grid[r][c]=" ";}
    if(ch==="L"){lights.push({c,r,used:false});grid[r][c]=" ";}
    if(grid[r][c]==="."){dots.push({c,r,used:false});grid[r][c]=" ";}
  }
  const starts = level===0 ? [[13,1],[7,5]] : level===1 ? [[13,1],[7,7],[1,9]] : [[13,1],[7,3],[1,9],[11,7]];
  enemies=starts.map((p,i)=>({c:p[0],r:p[1],emoji:["🌩️","👁️","💢","🌑"][i%4]}));
}

function wall(c,r){return c<0||r<0||c>=COLS||r>=ROWS||grid[r][c]==="#";}
function updateHud(){
  levelEl.textContent=`${level+1} / 3`;
  livesEl.textContent="❤️".repeat(lives)||"—";
  scoreEl.textContent=score;
  powerEl.textContent=power&&performance.now()<powerUntil?power:"—";
}
function msg(t,tone="good"){
  messageEl.textContent=t; messageEl.className=`mind-message show ${tone}`;
  clearTimeout(msg.t); msg.t=setTimeout(()=>messageEl.classList.remove("show"),1800);
}
function move(dc,dr){
  if(!running||paused)return;
  const nc=player.c+dc,nr=player.r+dr;
  if(!wall(nc,nr)){player.c=nc;player.r=nr;checkTile();}
}
function checkTile(){
  dots.forEach(d=>{
    if(!d.used&&d.c===player.c&&d.r===player.r){d.used=true;score+=5;}
  });
  const light=lights.find(l=>!l.used&&l.c===player.c&&l.r===player.r);
  if(light){light.used=true;openReflection();}
  if(player.c===exit.c&&player.r===exit.r&&dots.filter(d=>!d.used).length<=Math.max(3,10-level*2)) finishLevel();
  updateHud();
}
function openReflection(){
  paused=true;
  currentReflection=reflections[Math.floor(Math.random()*reflections.length)];
  questionEl.textContent=currentReflection.q;
  helpfulBtn.textContent="🌱 "+currentReflection.good;
  unhelpfulBtn.textContent="🌩️ "+currentReflection.bad;
  reflectionOverlay.classList.add("active");
}
function chooseReflection(helpful){
  reflectionOverlay.classList.remove("active");
  if(helpful){
    score+=40; power=currentReflection.power; powerUntil=performance.now()+9000;
    msg(`✨ ${power} ativado!`,"good");
  }else{
    msg("💭 Talvez exista outra maneira de olhar para esse pensamento.","neutral");
  }
  paused=false; updateHud();
}
function finishLevel(){
  paused=true; running=false;
  if(level<2){
    document.getElementById("mindLevelTitle").textContent=`Fase ${level+1} concluída!`;
    document.getElementById("mindLevelText").textContent="Você encontrou pensamentos que ajudam e chegou à saída.";
    nextBtn.textContent="Próxima fase";
    levelOverlay.classList.add("active");
  }else{
    document.getElementById("mindSummary").textContent=`Você fez ${score} pontos e atravessou os três labirintos.`;
    endOverlay.classList.add("active");
  }
}
function damage(){
  if(power==="🛡️ Autoconfiança"&&performance.now()<powerUntil){msg("🛡️ A Autoconfiança protegeu você!");power=null;return;}
  lives--; msg("🌩️ Um pensamento difícil alcançou você. Continue tentando.","bad");
  if(lives<=0){
    running=false;paused=true;
    document.getElementById("mindSummary").textContent=`Você chegou à fase ${level+1} e fez ${score} pontos.`;
    endOverlay.classList.add("active");
  }else{
    player={c:1,r:1};
  }
  updateHud();
}
function enemyMove(){
  if(paused||!running)return;
  const slow=power==="🐢 Pausa"&&performance.now()<powerUntil;
  if(slow&&Math.random()<.55)return;
  enemies.forEach(e=>{
    let opts=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dc,dr])=>!wall(e.c+dc,e.r+dr));
    opts.sort((a,b)=>{
      const da=Math.abs(e.c+a[0]-player.c)+Math.abs(e.r+a[1]-player.r);
      const db=Math.abs(e.c+b[0]-player.c)+Math.abs(e.r+b[1]-player.r);
      return da-db+(Math.random()-.5)*2.2;
    });
    if(opts.length){e.c+=opts[0][0];e.r+=opts[0][1];}
    if(e.c===player.c&&e.r===player.r)damage();
  });
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const g=ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,"#11192e");g.addColorStop(1,"#28354a");
  ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);

  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const x=OFFSET_X+c*TILE,y=OFFSET_Y+r*TILE;
    if(grid[r][c]==="#"){
      ctx.fillStyle="#3f5b58"; roundRect(x+2,y+2,TILE-4,TILE-4,10);
      ctx.strokeStyle="rgba(154,209,193,.22)";ctx.lineWidth=2;ctx.stroke();
    }else{
      ctx.fillStyle="rgba(255,255,255,.035)";ctx.fillRect(x+5,y+5,TILE-10,TILE-10);
    }
  }
  dots.forEach(d=>{
    if(d.used)return;
    const x=OFFSET_X+d.c*TILE+TILE/2,y=OFFSET_Y+d.r*TILE+TILE/2;
    ctx.fillStyle="#f2d97d";ctx.shadowColor="#f2d97d";ctx.shadowBlur=10;
    ctx.beginPath();ctx.arc(x,y,4.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  });
  lights.forEach(l=>{
    if(l.used)return;
    ctx.font="30px serif";ctx.fillText("💡",OFFSET_X+l.c*TILE+12,OFFSET_Y+l.r*TILE+38);
  });
  ctx.font="32px serif";ctx.fillText("🚪",OFFSET_X+exit.c*TILE+10,OFFSET_Y+exit.r*TILE+39);

  enemies.forEach(e=>{
    ctx.save();ctx.shadowColor="rgba(109,72,138,.8)";ctx.shadowBlur=18;
    ctx.font="32px serif";ctx.fillText(e.emoji,OFFSET_X+e.c*TILE+11,OFFSET_Y+e.r*TILE+38);ctx.restore();
  });

  const px=OFFSET_X+player.c*TILE+TILE/2,py=OFFSET_Y+player.r*TILE+TILE/2;
  if(power&&performance.now()<powerUntil){
    ctx.strokeStyle=power.includes("Autoconfiança")?"#a8e1c1":"#f0d875";
    ctx.lineWidth=3;ctx.beginPath();ctx.arc(px,py,22,0,Math.PI*2);ctx.stroke();
  }
  ctx.font="34px serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🙂",px,py);
  ctx.textAlign="start";ctx.textBaseline="alphabetic";

  if(power==="🔦 Outra perspectiva"&&performance.now()<powerUntil){
    ctx.save();ctx.globalAlpha=.18;ctx.fillStyle="#fff3a8";
    ctx.beginPath();ctx.arc(OFFSET_X+exit.c*TILE+TILE/2,OFFSET_Y+exit.r*TILE+TILE/2,55+Math.sin(performance.now()*.01)*8,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}
function roundRect(x,y,w,h,r){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
function loop(t){
  frame=requestAnimationFrame(loop);
  if(running&&!paused){
    if(t-enemyTick>Math.max(260,520-level*70)){enemyMove();enemyTick=t;}
    if(power&&t>powerUntil){power=null;updateHud();}
  }
  draw();
}
function startGame(){
  level=0;score=0;lives=3;power=null;paused=false;running=true;
  startOverlay.classList.remove("active");endOverlay.classList.remove("active");levelOverlay.classList.remove("active");
  parseMap();updateHud();msg("✨ Colete as luzes e procure a saída.");
}
function nextLevel(){
  level++;power=null;paused=false;running=true;levelOverlay.classList.remove("active");parseMap();updateHud();
  msg("🧠 O novo labirinto é um pouco mais desafiador.");
}

document.getElementById("mindStartBtn").onclick=startGame;
document.getElementById("mindRestartBtn").onclick=startGame;
nextBtn.onclick=nextLevel;
helpfulBtn.onclick=()=>chooseReflection(true);
unhelpfulBtn.onclick=()=>chooseReflection(false);

window.addEventListener("keydown",e=>{
  const dirs={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]};
  if(dirs[e.code]){e.preventDefault();move(...dirs[e.code]);}
});
document.querySelectorAll(".mind-controls button").forEach(b=>{
  b.addEventListener("click",()=>{
    const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[b.dataset.dir];move(...d);
  });
});
parseMap();updateHud();requestAnimationFrame(loop);
