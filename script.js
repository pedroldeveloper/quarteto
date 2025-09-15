const NUM_BOARDS = 4;
const ROWS = 9;
const WORD_LEN = 5;
const TRY_FILES = ["words5.txt","palavras.txt","words.txt"];

const boardsContainer = document.getElementById("boards-container");
const keyboardEl = document.getElementById("keyboard");
const popupEl = document.getElementById("popup");
const mobileWrap = document.getElementById("mobile-input-wrap");
const mobileInput = document.getElementById("mobile-input");
const mobileSubmit = document.getElementById("mobile-submit");

let allOriginal = [];
let allNoAcc = [];
let mapNoAccToOriginal = {};
let secrets = [];
let attemptsCount = [];
let finished = [];
let currentTyped = "";
let keyboardStatus = {};
let isMobile = window.matchMedia("(max-width:720px)").matches;

function normalize(str){
  if(!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}

function truncateToNormalizedLength(s, max){
  let acc = "";
  for(const ch of Array.from(s)){
    const candidate = acc + ch;
    if(normalize(candidate).length <= max) acc = candidate;
    else break;
  }
  return acc;
}

async function loadWordsFile(){
  for(const fname of TRY_FILES){
    try{
      const r = await fetch(fname);
      if(!r.ok) continue;
      const txt = await r.text();
      const arr = txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
      const originals = [];
      for(const w of arr){
        const n = normalize(w);
        if(n.length === WORD_LEN){
          originals.push(w);
          if(!(n in mapNoAccToOriginal)) mapNoAccToOriginal[n] = w;
        }
      }
      if(originals.length > 0){
        allOriginal = Array.from(new Set(originals));
        allNoAcc = allOriginal.map(w=>normalize(w));
        return true;
      }
    }catch(e){
      continue;
    }
  }
  return false;
}

function pickSecrets(){
  const out = [];
  const pool = [...allOriginal];
  while(out.length < NUM_BOARDS && pool.length){
    const i = Math.floor(Math.random()*pool.length);
    out.push(pool.splice(i,1)[0]);
  }
  while(out.length < NUM_BOARDS){
    out.push(allOriginal[Math.floor(Math.random()*allOriginal.length)]);
  }
  return out;
}

function buildBoards(){
  boardsContainer.innerHTML = "";
  for(let b=0;b<NUM_BOARDS;b++){
    const board = document.createElement("div");
    board.className = "board";
    board.dataset.index = b;
    const grid = document.createElement("div");
    grid.className = "grid-rows";
    for(let r=0;r<ROWS;r++){
      const row = document.createElement("div");
      row.className = "row";
      for(let c=0;c<WORD_LEN;c++){
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.dataset.row = r;
        tile.dataset.col = c;
        row.appendChild(tile);
      }
      grid.appendChild(row);
    }
    board.appendChild(grid);
    if(isMobile) board.addEventListener("click", ()=> onBoardTap(b));
    boardsContainer.appendChild(board);
  }
}

function buildKeyboard(){
  keyboardEl.innerHTML = "";
  const layout = "QWERTYUIOPASDFGHJKLZXCVBNM".split("");
  for(const ch of layout){
    const key = document.createElement("div");
    key.className = "key";
    key.dataset.key = ch.toLowerCase();
    const quads = document.createElement("div");
    quads.className = "quads";
    for(let i=0;i<4;i++){
      const q = document.createElement("div");
      q.className = "quad";
      quads.appendChild(q);
    }
    const span = document.createElement("span");
    span.className = "letter";
    span.textContent = ch;
    key.appendChild(quads);
    key.appendChild(span);
    key.addEventListener("click", ()=> onVirtualKey(ch.toLowerCase()));
    keyboardEl.appendChild(key);
  }
  keyboardEl.style.display = isMobile ? "none" : "flex";
  updateKeyboardUI();
}

function onVirtualKey(ch){
  if(isMobile) return;
  const candidate = currentTyped + ch;
  if(normalize(candidate).length > WORD_LEN) return;
  currentTyped = candidate;
  renderTyping();
}

function onBoardTap(boardIndex){
  if(!isMobile) return;
  if(finished[boardIndex]) return;
  mobileWrap.style.display = "flex";
  mobileInput.value = currentTyped || "";
  mobileInput.focus();
}

mobileInput.addEventListener("input", ()=>{
  let v = mobileInput.value || "";
  v = Array.from(v).filter(ch => /[A-Za-zÀ-ÖØ-öø-ÿçÇ]/.test(ch)).join("");
  currentTyped = truncateToNormalizedLength(v, WORD_LEN);
  renderTyping();
});

mobileInput.addEventListener("keydown",(e)=>{
  if(e.key === "Enter"){
    e.preventDefault();
    submitAttemptFromString(mobileInput.value || "");
    mobileInput.value = "";
    mobileWrap.style.display = "none";
  } else if(e.key === "Escape"){
    mobileWrap.style.display = "none";
  }
});

mobileSubmit.addEventListener("click", ()=>{
  submitAttemptFromString(mobileInput.value || "");
  mobileInput.value = "";
  mobileWrap.style.display = "none";
});

function renderTyping(){
  for(let b=0;b<NUM_BOARDS;b++){
    if(finished[b]) continue;
    const rowIndex = attemptsCount[b];
    const board = boardsContainer.children[b];
    const rowEl = board.querySelectorAll(".row")[rowIndex];
    const secret = secrets[b] || "";
    for(let c=0;c<WORD_LEN;c++){
      const tile = rowEl.children[c];
      let ch = currentTyped[c] || "";
      if(ch && secret[c]){
        if(normalize(ch) === normalize(secret[c])) ch = secret[c];
      }
      tile.textContent = ch ? ch.toUpperCase() : "";
      tile.classList.remove("correct","present","absent");
    }
  }
}

function submitAttemptFromString(raw){
  let v = String(raw || "");
  v = Array.from(v).filter(ch=>/[A-Za-zÀ-ÖØ-öø-ÿçÇ]/.test(ch)).join("");
  v = truncateToNormalizedLength(v, WORD_LEN);
  const norm = normalize(v);
  if(norm.length !== WORD_LEN){
    showPopup("Palavra inválida!");
    return;
  }
  if(!allNoAcc.includes(norm)){
    showPopup("Palavra inválida!");
    return;
  }
  const displayOriginal = mapNoAccToOriginal[norm] || v;
  for(let b=0;b<NUM_BOARDS;b++){
    if(finished[b]) continue;
    if(attemptsCount[b] >= ROWS) continue;
    const secret = secrets[b];
    const res = evaluate(displayOriginal, secret);
    applyResultToBoard(b, attemptsCount[b], displayOriginal, res);
    updateKeyboardStatus(displayOriginal, res, b);
    if(normalize(displayOriginal) === normalize(secret)) finished[b] = true;
    attemptsCount[b] = Math.min(attemptsCount[b] + 1, ROWS);
  }
  currentTyped = "";
  renderTyping();
  updateKeyboardUI();
  if(finished.every(x=>x)) showPopup("Parabéns — todas as fileiras concluídas!");
}

function evaluate(guessOrig, secretOrig){
  const g = normalize(guessOrig);
  const s = normalize(secretOrig);
  const freq = {};
  for(const ch of s) freq[ch] = (freq[ch]||0) + 1;
  const out = Array(WORD_LEN).fill("absent");
  for(let i=0;i<WORD_LEN;i++){
    if(g[i] === s[i]){ out[i] = "correct"; freq[g[i]]--; }
  }
  for(let i=0;i<WORD_LEN;i++){
    if(out[i] === "absent"){
      const ch = g[i];
      if(freq[ch] && freq[ch] > 0){ out[i] = "present"; freq[ch]--; }
    }
  }
  return out;
}

function applyResultToBoard(boardIndex, rowIndex, displayWord, resArr){
  const board = boardsContainer.children[boardIndex];
  const rowEl = board.querySelectorAll(".row")[rowIndex];
  for(let i=0;i<WORD_LEN;i++){
    const tile = rowEl.children[i];
    const ch = (displayWord[i] || " ").toUpperCase();
    tile.textContent = ch;
    tile.classList.remove("correct","present","absent");
    if(resArr[i] === "correct") tile.classList.add("correct");
    else if(resArr[i] === "present") tile.classList.add("present");
    else tile.classList.add("absent");
  }
}

function updateKeyboardStatus(displayWord, resArr, boardIdx){
  for(let i=0;i<WORD_LEN;i++){
    const c = displayWord[i] || "";
    const n = normalize(c);
    if(!n) continue;
    if(!keyboardStatus[n]) keyboardStatus[n] = Array(NUM_BOARDS).fill("none");
    const cur = keyboardStatus[n][boardIdx];
    const newSt = resArr[i] === "correct" ? "green" : (resArr[i] === "present" ? "yellow" : "gray");
    if(cur === "green") continue;
    if(newSt === "green") keyboardStatus[n][boardIdx] = "green";
    else if(newSt === "yellow" && cur !== "green") keyboardStatus[n][boardIdx] = "yellow";
    else if(newSt === "gray" && cur !== "green" && cur !== "yellow") keyboardStatus[n][boardIdx] = "gray";
  }
}

function updateKeyboardUI(){
  const keys = keyboardEl.querySelectorAll(".key");
  keys.forEach(kd=>{
    const key = kd.dataset.key;
    const quads = kd.querySelectorAll(".quad");
    const arr = keyboardStatus[key] || [];
    for(let i=0;i<NUM_BOARDS;i++){
      quads[i].classList.remove("green","yellow","gray");
      const st = arr[i] || "none";
      if(st === "green") quads[i].classList.add("green");
      else if(st === "yellow") quads[i].classList.add("yellow");
      else if(st === "gray") quads[i].classList.add("gray");
    }
  });
}

function showPopup(msg){
  popupEl.textContent = msg;
  popupEl.classList.add("show");
  setTimeout(()=>popupEl.classList.remove("show"), 2200);
}

function onPhysicalKey(e){
  if(e.key === "Enter"){
    submitAttemptFromString(currentTyped);
    return;
  }
  if(e.key === "Backspace"){
    if(currentTyped.length === 0) return;
    currentTyped = truncateToNormalizedLength(currentTyped.slice(0,-1), WORD_LEN);
    renderTyping();
    return;
  }
  const k = e.key;
  if(k.length === 1 && /[A-Za-zÀ-ÖØ-öø-ÿÇç]/.test(k)){
    if(normalize(currentTyped + k).length > WORD_LEN) return;
    currentTyped += k;
    renderTyping();
  }
}

async function start(){
  const ok = await loadWordsFile();
  if(!ok){
    showPopup("Erro: coloque words5.txt / palavras.txt / words.txt na pasta");
    return;
  }
  secrets = pickSecrets();
  attemptsCount = Array(NUM_BOARDS).fill(0);
  finished = Array(NUM_BOARDS).fill(false);
  currentTyped = "";
  keyboardStatus = {};
  buildBoards();
  buildKeyboard();
  window.addEventListener("keydown", onPhysicalKey);
  isMobile = window.matchMedia("(max-width:720px)").matches;
  keyboardEl.style.display = isMobile ? "none" : "flex";
}

start();
