const gameContainer = document.getElementById("game-container");
const keyboard = document.getElementById("keyboard");
const popup = document.getElementById("popup");

let words = [];
let currentGuesses = ["", "", "", ""];
let currentRow = 0;
let targetWords = [];
let finishedBoards = [false, false, false, false];

async function loadWords() {
  const response = await fetch("words5.txt");
  const text = await response.text();
  words = text.split("\n").map(w => w.trim()).filter(w => w.length === 5);

  targetWords = Array.from({ length: 4 }, () => {
    return words[Math.floor(Math.random() * words.length)];
  });

  initBoards();
  initKeyboard();
}

function initBoards() {
  for (let i = 0; i < 4; i++) {
    const board = document.createElement("div");
    board.classList.add("board");
    board.dataset.index = i;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 5; c++) {
        const tile = document.createElement("div");
        tile.classList.add("tile");
        tile.dataset.row = r;
        tile.dataset.col = c;
        board.appendChild(tile);
      }
    }
    gameContainer.appendChild(board);
  }
}

function initKeyboard() {
  const keys = "QWERTYUIOPASDFGHJKLZXCVBNM".split("");
  keys.forEach(k => {
    const key = document.createElement("div");
    key.classList.add("key");
    key.textContent = k;
    for (let i = 0; i < 4; i++) {
      const quadrant = document.createElement("div");
      quadrant.classList.add("key-quadrant");
      quadrant.classList.add(["top-left", "top-right", "bottom-left", "bottom-right"][i]);
      key.appendChild(quadrant);
    }
    key.addEventListener("click", () => handleKey(k));
    keyboard.appendChild(key);
  });
}

function normalizeWord(word) {
  return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function handleKey(key) {
  if (key === "ENTER") {
    submitGuess();
  } else if (key === "BACKSPACE") {
    if (currentGuesses[0].length > 0) {
      currentGuesses = currentGuesses.map((g, i) =>
        finishedBoards[i] ? g : g.slice(0, -1)
      );
      updateBoards();
    }
  } else if (/^[A-Z]$/.test(key)) {
    if (currentGuesses[0].length < 5) {
      currentGuesses = currentGuesses.map((g, i) =>
        finishedBoards[i] ? g : g + key.toLowerCase()
      );
      updateBoards();
    }
  }
}

function updateBoards() {
  for (let b = 0; b < 4; b++) {
    const board = document.querySelectorAll(".board")[b];
    const guess = currentGuesses[b];
    for (let c = 0; c < 5; c++) {
      const tile = board.querySelector(`.tile[data-row="${currentRow}"][data-col="${c}"]`);
      tile.textContent = guess[c] || "";
    }
  }
}

function submitGuess() {
  const guess = normalizeWord(currentGuesses[0]);
  if (!words.some(w => normalizeWord(w) === guess)) {
    showPopup("Palavra inválida!");
    return;
  }

  for (let b = 0; b < 4; b++) {
    if (finishedBoards[b]) continue;

    const board = document.querySelectorAll(".board")[b];
    const target = normalizeWord(targetWords[b]);
    const guessRaw = currentGuesses[b];
    let correctCount = 0;

    for (let c = 0; c < 5; c++) {
      const tile = board.querySelector(`.tile[data-row="${currentRow}"][data-col="${c}"]`);
      tile.textContent = guessRaw[c];
      if (guess[c] === target[c]) {
        tile.classList.add("correct");
        updateKeyboard(guessRaw[c], b, "correct");
        correctCount++;
      } else if (target.includes(guess[c])) {
        tile.classList.add("present");
        updateKeyboard(guessRaw[c], b, "present");
      } else {
        tile.classList.add("absent");
        updateKeyboard(guessRaw[c], b, "absent");
      }
    }

    if (correctCount === 5) {
      finishedBoards[b] = true;
    }
  }

  currentGuesses = ["", "", "", ""];
  currentRow++;
}

function updateKeyboard(letter, boardIndex, status) {
  const key = Array.from(document.querySelectorAll(".key"))
    .find(k => k.textContent === letter.toUpperCase());
  if (key) {
    const quadrant = key.querySelectorAll(".key-quadrant")[boardIndex];
    quadrant.classList.remove("correct", "present", "absent");
    quadrant.classList.add(status);
  }
}

function showPopup(message) {
  popup.textContent = message;
  popup.classList.remove("hidden");
  setTimeout(() => popup.classList.add("hidden"), 2000);
}

document.addEventListener("keydown", (e) => {
  const key = e.key.toUpperCase();
  if (key === "ENTER" || key === "BACKSPACE" || /^[A-Z]$/.test(key)) {
    handleKey(key);
  }
});

loadWords();
