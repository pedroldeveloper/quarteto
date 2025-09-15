const boards = [
  document.getElementById("board1"),
  document.getElementById("board2"),
  document.getElementById("board3"),
  document.getElementById("board4")
];
const keyboard = document.getElementById("keyboard");
const popup = document.getElementById("popup");
const mobileInput = document.getElementById("mobile-input");

let palavrasValidas = [];
let respostas = [];
let tentativas = [[], [], [], []];
let linhaAtual = [0,0,0,0];
let jogoEncerrado = [false, false, false, false];
let keyboardStatus = {};
const KEY_LAYOUT = "QWERTYUIOPASDFGHJKLZXCVBNM";
let isMobileView = window.matchMedia("(max-width:720px)").matches;

fetch("palavras.txt").then(r => r.text()).then(text => {
  palavrasValidas = text.split(/\r?\n/).map(p=>p.trim()).filter(p=>p.length===5);
  respostas = [];
  for(let i=0;i<4;i++) respostas.push(palavrasValidas[Math.floor(Math.random()*palavrasValidas.length)]);
  initBoards();
  initKeyboard();
  attachEvents();
});

function removerAcentos(s){if(!s) return "";return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}

function initBoards(){
  boards.forEach(b=>{
    b.innerHTML = "";
    for(let r=0;r<9;r++){
      const row = document.createElement("div");
      row.className = "row";
      for(let c=0;c<5;c++){
        const tile = document.createElement("div");
        tile.className = "tile";
        row.appendChild(tile);
      }
      b.appendChild(row);
    }
  });
}

function initKeyboard(){
  keyboard.innerHTML = "";
  for(const ch of KEY_LAYOUT){
    const key = document.createElement("div");
    key.className = "key";
    const span = document.createElement("span");
    span.textContent = ch;
    key.appendChild(span);
    const quads = document.createElement("div");
    quads.className = "quads";
    const q1 = document.createElement("div"); q1.className = "quad top-left";
    const q2 = document.createElement("div"); q2.className = "quad top-right";
    const q3 = document.createElement("div"); q3.className = "quad bottom-left";
    const q4 = document.createElement("div"); q4.className = "quad bottom-right";
    quads.appendChild(q1); quads.appendChild(q2); quads.appendChild(q3); quads.appendChild(q4);
    key.appendChild(quads);
    key.addEventListener("click", ()=> onKeyClick(ch));
    keyboard.appendChild(key);
  }
  if(isMobileView) keyboard.style.display = "none";
  else keyboard.style.display = "flex";
}

function onKeyClick(letter){
  for(let b=0;b<4;b++){
    if(jogoEncerrado[b]) continue;
    const rowIndex = linhaAtual[b];
    const rowEl = boards[b].children[rowIndex];
    const current = getCurrentGuess(b);
    if(current.length < 5){
      tentativas[b].push(letter.toLowerCase());
      renderBoard(b);
    }
  }
}

function getCurrentGuess(b){
  return (tentativas[b]||[]).join("");
}

function renderBoard(b){
  const rowIndex = linhaAtual[b];
  const rowEl = boards[b].children[rowIndex];
  const guess = getCurrentGuess(b);
  for(let c=0;c<5;c++){
    const tile = rowEl.children[c];
    tile.textContent = guess[c] ? guess[c].toUpperCase() : "";
  }
}

function attachEvents(){
  document.addEventListener("keydown", handlePhysical);
  boards.forEach((board, idx)=>{
    board.addEventListener("click", (ev)=>{
      if(isMobileView && !jogoEncerrado[idx]){
        mobileInput.value = getCurrentGuess(idx);
        mobileInput.style.display = "block";
        mobileInput.focus();
        mobileInput.dataset.active = "1";
        mobileInput.dataset.boardIndex = idx;
      }
    });
  });
  mobileInput.addEventListener("input", onMobileInput);
  mobileInput.addEventListener("keydown", onMobileKeydown);
  window.addEventListener("resize", ()=>{
    isMobileView = window.matchMedia("(max-width:720px)").matches;
    initKeyboard();
  });
}

function onMobileInput(e){
  const val = mobileInput.value || "";
  const activeBoardIndex = parseInt(mobileInput.dataset.boardIndex || "0",10);
  const normalized = val.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿçÇ]/g,"").slice(0,5);
  for(let b=0;b<4;b++){
    if(jogoEncerrado[b]) continue;
    tentativas[b] = normalized.split("").map(ch=>ch.toLowerCase());
  }
  for(let b=0;b<4;b++) renderBoard(b);
}

function onMobileKeydown(e){
  if(e.key === "Enter"){
    e.preventDefault();
    submitAll();
    mobileInput.blur();
    mobileInput.style.display = "none";
    mobileInput.dataset.active = "0";
    mobileInput.value = "";
  }
  if(e.key === "Backspace"){
    // input event will handle removal
    // when input becomes empty we already sync above
  }
}

function handlePhysical(e){
  const k = e.key;
  if(k === "Enter"){
    submitAll();
    return;
  }
  if(k === "Backspace"){
    for(let b=0;b<4;b++){
      if(jogoEncerrado[b]) continue;
      tentativas[b].pop();
      renderBoard(b);
    }
    return;
  }
  if(/^.[a-zA-ZÀ-ÖØ-öø-ÿçÇ]$/.test(k) || (k.length === 1 && k.match(/^[a-zA-ZçÇ]$/))){
    const letter = k.toUpperCase();
    for(let b=0;b<4;b++){
      if(jogoEncerrado[b]) continue;
      if((tentativas[b]||[]).length < 5){
        tentativas[b].push(letter.toLowerCase());
        renderBoard(b);
      }
    }
  }
}

function submitAll(){
  const sample = tentativas[0] ? tentativas[0].join("") : "";
  if(removerAcentos(sample).length !== 5){showPopup("Palavra inválida!"); return;}
  const normSample = removerAcentos(sample);
  if(!palavrasValidas.some(p => removerAcentos(p) === normSample)){showPopup("Palavra inválida!"); return;}
  const original = palavrasValidas.find(p => removerAcentos(p) === normSample) || sample;
  for(let b=0;b<4;b++){
    if(jogoEncerrado[b]) continue;
    const guess = original;
    const secret = respostas[b];
    const res = evaluateAndMark(guess, secret);
    applyResultToBoard(b, guess, res);
    if(removerAcentos(guess) === removerAcentos(secret)) jogoEncerrado[b] = true;
    tentativas[b] = [];
    linhaAtual[b] = Math.min(linhaAtual[b] + 1, 8);
  }
  mobileInput.value = "";
  renderAllBoards();
  updateKeyboardUI();
}

function evaluateAndMark(guessOrig, secretOrig){
  const guess = removerAcentos(guessOrig);
  const secret = removerAcentos(secretOrig);
  const freq = {};
  for(const ch of secret) freq[ch] = (freq[ch]||0) + 1;
  const res = Array(5).fill("gray");
  for(let i=0;i<5;i++){
    if(guess[i] === secret[i]){ res[i] = "green"; freq[guess[i]]--; }
  }
  for(let i=0;i<5;i++){
    if(res[i] === "gray"){
      const g = guess[i];
      if(freq[g] && freq[g] > 0){ res[i] = "yellow"; freq[g]--; }
    }
  }
  return res;
}

function applyResultToBoard(b, guessOrig, res){
  const secret = respostas[b];
  const rowIndex = linhaAtual[b];
  const rowEl = boards[b].children[rowIndex];
  for(let i=0;i<5;i++){
    const tile = rowEl.children[i];
    const ch = (guessOrig[i] || secret[i]).toUpperCase();
    tile.textContent = ch;
    tile.classList.remove("correct","present","absent");
    if(res[i] === "green") tile.classList.add("correct");
    else if(res[i] === "yellow") tile.classList.add("present");
    else tile.classList.add("absent");
  }
  for(let i=0;i<5;i++){
    const l = (guessOrig[i] || "").toLowerCase();
    const st = res[i] === "green" ? "green" : (res[i] === "yellow" ? "yellow" : "gray");
    setKeyQuad(l, b, st);
  }
}

function setKeyQuad(letter, boardIndex, status){
  if(!letter) return;
  const keyDiv = Array.from(document.querySelectorAll(".key")).find(k=>k.querySelector("span").textContent.toLowerCase() === letter.toLowerCase());
  if(!keyDiv) return;
  const quads = keyDiv.querySelectorAll(".quad");
  quads[boardIndex].classList.remove("green","yellow","gray");
  if(status === "green") quads[boardIndex].classList.add("green");
  else if(status === "yellow") quads[boardIndex].classList.add("yellow");
  else quads[boardIndex].classList.add("gray");
}

function renderAllBoards(){
  for(let b=0;b<4;b++){
    const rowIndex = linhaAtual[b];
    const current = getCurrentGuess(b);
    const rowEl = boards[b].children[rowIndex];
    for(let i=0;i<5;i++){
      const tile = rowEl.children[i];
      tile.textContent = current[i] ? current[i].toUpperCase() : "";
    }
  }
}

function updateKeyboardUI(){}

function showPopup(msg){
  popup.textContent = msg;
  popup.classList.add("show");
  setTimeout(()=>popup.classList.remove("show"),2000);
}
