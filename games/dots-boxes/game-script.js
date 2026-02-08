// Game State
let gameState = {
    player1: { name: '', color: '#ff00ff', score: 0 },
    player2: { name: '', color: '#00ffff', score: 0 },
    currentPlayer: 1,
    gridSize: 5,
    timer: 40,
    timerInterval: null,
    dots: [],
    lines: [],
    boxes: [],
    zoom: 1,
    dragStart: { x: 0, y: 0 },
    boardPosition: { x: 0, y: 0 },
    isPaused: false
};
const DOTS_BOXES_RESULT_KEY = 'gamehub.dotsboxes.lastResult';

// DOM Elements
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const gameBoard = document.getElementById('gameBoard');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYesBtn = document.getElementById('confirmYes');
const confirmNoBtn = document.getElementById('confirmNo');

// Setup Screen Elements
const player1NameInput = document.getElementById('player1Name');
const player2NameInput = document.getElementById('player2Name');
const player1ColorInput = document.getElementById('player1Color');
const player2ColorInput = document.getElementById('player2Color');
const gridButtons = document.querySelectorAll('.grid-btn[data-size]');
const customSizeInput = document.getElementById('customSize');
const customBtn = document.getElementById('customBtn');
const startGameBtn = document.getElementById('startGameBtn');

// Game Screen Elements
const timerDisplay = document.getElementById('timer');
const p1NameDisplay = document.getElementById('p1Name');
const p2NameDisplay = document.getElementById('p2Name');
const p1ColorBox = document.getElementById('p1ColorBox');
const p2ColorBox = document.getElementById('p2ColorBox');
const p1ScoreDisplay = document.getElementById('p1Score');
const p2ScoreDisplay = document.getElementById('p2Score');
const player1Info = document.getElementById('player1Info');
const player2Info = document.getElementById('player2Info');

// Zoom Elements
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomResetBtn = document.getElementById('zoomReset');

// Setup Event Listeners
gridButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        gridButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customSizeInput.value = '';
        gameState.gridSize = parseInt(btn.dataset.size);
    });
});

customBtn.addEventListener('click', () => {
    const size = parseInt(customSizeInput.value);
    if (size >= 5 && size <= 25) {
        gridButtons.forEach(b => b.classList.remove('selected'));
        gameState.gridSize = size;
    } else {
        alert('Please enter a grid size between 5 and 25');
    }
});

startGameBtn.addEventListener('click', startGame);

// Zoom Controls
zoomInBtn.addEventListener('click', () => {
    gameState.zoom = Math.min(gameState.zoom + 0.2, 3);
    updateBoardZoom();
});

zoomOutBtn.addEventListener('click', () => {
    gameState.zoom = Math.max(gameState.zoom - 0.2, 0.5);
    updateBoardZoom();
});

zoomResetBtn.addEventListener('click', () => {
    gameState.zoom = 1;
    gameState.boardPosition = { x: 0, y: 0 };
    updateBoardZoom();
});

function updateBoardZoom() {
    gameBoard.style.transform = `translate(${gameState.boardPosition.x}px, ${gameState.boardPosition.y}px) scale(${gameState.zoom})`;
}

// Drag-to-pan intentionally disabled. Zoom only.

function startGame() {
    // Validate inputs
    const p1Name = player1NameInput.value.trim() || 'Player 1';
    const p2Name = player2NameInput.value.trim() || 'Player 2';
    
    gameState.player1 = {
        name: p1Name,
        color: player1ColorInput.value,
        score: 0
    };
    
    gameState.player2 = {
        name: p2Name,
        color: player2ColorInput.value,
        score: 0
    };
    
    gameState.currentPlayer = 1;
    gameState.timer = 40;
    gameState.lines = [];
    gameState.boxes = [];
    gameState.zoom = 1;
    gameState.boardPosition = { x: 0, y: 0 };
    
    // Update displays
    p1NameDisplay.textContent = gameState.player1.name;
    p2NameDisplay.textContent = gameState.player2.name;
    p1ColorBox.style.backgroundColor = gameState.player1.color;
    p2ColorBox.style.backgroundColor = gameState.player2.color;
    p1ScoreDisplay.textContent = 'Boxes: 0';
    p2ScoreDisplay.textContent = 'Boxes: 0';
    
    // Switch screens
    setupScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    // Initialize game
    initializeBoard();
    updatePlayerTurn();
    startTimer();
}

function initializeBoard() {
    gameBoard.innerHTML = '';
    gameBoard.style.transform = 'translate(0px, 0px) scale(1)';
    
    const spacing = Math.max(40, Math.min(60, 400 / gameState.gridSize));
    const dotSize = Math.max(8, Math.min(12, 100 / gameState.gridSize));
    const hitSize = Math.max(28, Math.round(dotSize * 2.5));
    
    gameBoard.style.display = 'grid';
    gameBoard.style.gridTemplateColumns = `repeat(${gameState.gridSize}, ${spacing}px)`;
    gameBoard.style.gridTemplateRows = `repeat(${gameState.gridSize}, ${spacing}px)`;
    gameBoard.style.gap = '0';
    gameBoard.style.position = 'relative';
    
    gameState.dots = [];
    gameState.boxes = [];
    
    // Create dots
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.style.width = hitSize + 'px';
            dot.style.height = hitSize + 'px';
            dot.style.position = 'relative';
            dot.style.zIndex = '10';
            dot.style.margin = 'auto';
            dot.style.display = 'flex';
            dot.style.alignItems = 'center';
            dot.style.justifyContent = 'center';
            dot.dataset.row = row;
            dot.dataset.col = col;

            const dotCore = document.createElement('span');
            dotCore.className = 'dot-core';
            dotCore.style.width = dotSize + 'px';
            dotCore.style.height = dotSize + 'px';
            dot.appendChild(dotCore);
            
            gameBoard.appendChild(dot);
            gameState.dots.push({ row, col, element: dot });
        }
    }
    
    // Initialize boxes array
    for (let row = 0; row < gameState.gridSize - 1; row++) {
        for (let col = 0; col < gameState.gridSize - 1; col++) {
            gameState.boxes.push({
                row,
                col,
                owner: null,
                element: null
            });
        }
    }
    
    // Add drag listeners to dots
    const dots = document.querySelectorAll('.dot');
    dots.forEach(dot => {
        dot.addEventListener('pointerdown', (e) => handleDotSelect(e, dot));
        dot.addEventListener('mousedown', (e) => handleDotSelect(e, dot));
        dot.addEventListener('touchstart', (e) => handleDotSelect(e, dot), { passive: false });
    });
}

let selectedDot = null;
function handleDotSelect(e, dot) {
    if (gameState.isPaused) return;
    e.preventDefault();
    e.stopPropagation();

    if (!selectedDot) {
        selectedDot = dot;
        dot.classList.add('selected');
        return;
    }

    if (selectedDot === dot) {
        resetAllDots();
        selectedDot = null;
        return;
    }

    const row1 = parseInt(selectedDot.dataset.row);
    const col1 = parseInt(selectedDot.dataset.col);
    const row2 = parseInt(dot.dataset.row);
    const col2 = parseInt(dot.dataset.col);

    const isHorizontal = row1 === row2 && Math.abs(col1 - col2) === 1;
    const isVertical = col1 === col2 && Math.abs(row1 - row2) === 1;

    if (isHorizontal || isVertical) {
        const lineKey = getLineKey(row1, col1, row2, col2);
        if (!gameState.lines.includes(lineKey)) {
            gameState.lines.push(lineKey);
            drawLine(row1, col1, row2, col2);

            const boxesCaptured = checkBoxes(row1, col1, row2, col2);

            if (boxesCaptured === 0) {
                switchPlayer();
            } else {
                resetTimer();
            }
        }
        resetAllDots();
        selectedDot = null;
        return;
    }

    resetAllDots();
    selectedDot = dot;
    dot.classList.add('selected');
}

function resetAllDots() {
    const allDots = document.querySelectorAll('.dot');
    allDots.forEach(dot => {
        dot.classList.remove('selected');
    });
}

function getLineKey(row1, col1, row2, col2) {
    const minRow = Math.min(row1, row2);
    const maxRow = Math.max(row1, row2);
    const minCol = Math.min(col1, col2);
    const maxCol = Math.max(col1, col2);
    return `${minRow},${minCol}-${maxRow},${maxCol}`;
}

function getDotCenter(row, col) {
    const dot = document.querySelector(`.dot[data-row="${row}"][data-col="${col}"]`);
    if (!dot) return null;
    return {
        x: dot.offsetLeft + dot.offsetWidth / 2,
        y: dot.offsetTop + dot.offsetHeight / 2
    };
}

function drawLine(row1, col1, row2, col2) {
    const dot1Center = getDotCenter(row1, col1);
    const dot2Center = getDotCenter(row2, col2);
    if (!dot1Center || !dot2Center) return;

    const line = document.createElement('div');
    line.className = 'line';
    line.style.position = 'absolute';
    line.style.backgroundColor = gameState.currentPlayer === 1 ? gameState.player1.color : gameState.player2.color;
    line.style.zIndex = '5';
    line.style.borderRadius = '2px';
    line.style.boxShadow = `0 0 8px ${gameState.currentPlayer === 1 ? gameState.player1.color : gameState.player2.color}`;
    line.style.pointerEvents = 'none';
    
    const dot1CenterX = dot1Center.x;
    const dot1CenterY = dot1Center.y;
    const dot2CenterX = dot2Center.x;
    const dot2CenterY = dot2Center.y;
    
    if (row1 === row2) {
        // Horizontal line
        const minX = Math.min(dot1CenterX, dot2CenterX);
        const maxX = Math.max(dot1CenterX, dot2CenterX);
        const lineWidth = maxX - minX;
        const lineHeight = 4;
        
        // Start from center of first dot to center of second dot
        line.style.width = lineWidth + 'px';
        line.style.height = lineHeight + 'px';
        line.style.left = minX + 'px';
        line.style.top = (dot1CenterY - lineHeight / 2) + 'px';
    } else {
        // Vertical line
        const minY = Math.min(dot1CenterY, dot2CenterY);
        const maxY = Math.max(dot1CenterY, dot2CenterY);
        const lineWidth = 4;
        const lineHeight = maxY - minY;
        
        // Start from center of first dot to center of second dot
        line.style.width = lineWidth + 'px';
        line.style.height = lineHeight + 'px';
        line.style.left = (dot1CenterX - lineWidth / 2) + 'px';
        line.style.top = minY + 'px';
    }
    
    // Add animation
    line.style.animation = 'drawLine 0.3s ease';
    
    gameBoard.appendChild(line);
}

function checkBoxes(row1, col1, row2, col2) {
    let boxesCaptured = 0;
    
    // Check all potential boxes that could be completed
    const boxesToCheck = [];
    
    if (row1 === row2) {
        // Horizontal line
        const minCol = Math.min(col1, col2);
        if (row1 > 0) boxesToCheck.push({ row: row1 - 1, col: minCol });
        if (row1 < gameState.gridSize - 1) boxesToCheck.push({ row: row1, col: minCol });
    } else {
        // Vertical line
        const minRow = Math.min(row1, row2);
        if (col1 > 0) boxesToCheck.push({ row: minRow, col: col1 - 1 });
        if (col1 < gameState.gridSize - 1) boxesToCheck.push({ row: minRow, col: col1 });
    }
    
    boxesToCheck.forEach(box => {
        if (isBoxComplete(box.row, box.col)) {
            const boxIndex = box.row * (gameState.gridSize - 1) + box.col;
            if (!gameState.boxes[boxIndex].owner) {
                gameState.boxes[boxIndex].owner = gameState.currentPlayer;
                fillBox(box.row, box.col);
                boxesCaptured++;
                
                if (gameState.currentPlayer === 1) {
                    gameState.player1.score++;
                    p1ScoreDisplay.textContent = `Boxes: ${gameState.player1.score}`;
                } else {
                    gameState.player2.score++;
                    p2ScoreDisplay.textContent = `Boxes: ${gameState.player2.score}`;
                }
            }
        }
    });
    
    // Check if game is over
    const totalBoxes = (gameState.gridSize - 1) * (gameState.gridSize - 1);
    if (gameState.player1.score + gameState.player2.score === totalBoxes) {
        endGame();
    }
    
    return boxesCaptured;
}

function isBoxComplete(row, col) {
    const top = getLineKey(row, col, row, col + 1);
    const bottom = getLineKey(row + 1, col, row + 1, col + 1);
    const left = getLineKey(row, col, row + 1, col);
    const right = getLineKey(row, col + 1, row + 1, col + 1);
    
    return gameState.lines.includes(top) &&
           gameState.lines.includes(bottom) &&
           gameState.lines.includes(left) &&
           gameState.lines.includes(right);
}

function fillBox(row, col) {
    const topLeft = getDotCenter(row, col);
    const bottomRight = getDotCenter(row + 1, col + 1);
    if (!topLeft || !bottomRight) return;

    const lineThickness = 4;
    const inset = lineThickness / 2;
    const minX = Math.min(topLeft.x, bottomRight.x) + inset;
    const maxX = Math.max(topLeft.x, bottomRight.x) - inset;
    const minY = Math.min(topLeft.y, bottomRight.y) + inset;
    const maxY = Math.max(topLeft.y, bottomRight.y) - inset;

    const box = document.createElement('div');
    box.className = 'box';
    box.style.position = 'absolute';
    box.style.width = Math.max(0, maxX - minX) + 'px';
    box.style.height = Math.max(0, maxY - minY) + 'px';
    box.style.left = minX + 'px';
    box.style.top = minY + 'px';
    box.style.backgroundColor = gameState.currentPlayer === 1 ? gameState.player1.color : gameState.player2.color;
    box.style.opacity = '0.3';
    box.style.zIndex = '1';
    box.style.borderRadius = '5px';
    gameBoard.appendChild(box);
    
    const boxIndex = row * (gameState.gridSize - 1) + col;
    gameState.boxes[boxIndex].element = box;
}

function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    updatePlayerTurn();
    resetTimer();
}

function updatePlayerTurn() {
    if (gameState.currentPlayer === 1) {
        player1Info.classList.add('active');
        player2Info.classList.remove('active');
    } else {
        player1Info.classList.remove('active');
        player2Info.classList.add('active');
    }
}

function startTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    gameState.timer = 40;
    timerDisplay.textContent = gameState.timer;
    timerDisplay.classList.remove('warning');
    
    gameState.timerInterval = setInterval(() => {
        if (!gameState.isPaused) {
            gameState.timer--;
            timerDisplay.textContent = gameState.timer;
            
            if (gameState.timer <= 10) {
                timerDisplay.classList.add('warning');
            }
            
            if (gameState.timer <= 0) {
                switchPlayer();
            }
        }
    }, 1000);
}

function resetTimer() {
    gameState.timer = 40;
    timerDisplay.textContent = gameState.timer;
    timerDisplay.classList.remove('warning');
}

function togglePause() {
    const pauseModal = document.getElementById('pauseModal');
    const pauseBtn = document.getElementById('pauseBtn');
    
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        pauseModal.classList.add('active');
        pauseBtn.textContent = '▶ Resume';
        pauseBtn.classList.add('paused');
    } else {
        pauseModal.classList.remove('active');
        pauseBtn.textContent = '⏸ Pause';
        pauseBtn.classList.remove('paused');
    }
}

function quitToHome() {
    showConfirm('Are you sure you want to quit? Your progress will be lost.', () => {
        clearInterval(gameState.timerInterval);
        window.location.href = '../../index.html';
    });
}

function endGame() {
    clearInterval(gameState.timerInterval);
    
    const winnerTitle = document.getElementById('winnerTitle');
    const finalScores = document.getElementById('finalScores');
    
    if (gameState.player1.score > gameState.player2.score) {
        winnerTitle.textContent = `🎉 ${gameState.player1.name} Wins! 🎉`;
    } else if (gameState.player2.score > gameState.player1.score) {
        winnerTitle.textContent = `🎉 ${gameState.player2.name} Wins! 🎉`;
    } else {
        winnerTitle.textContent = `🤝 It's a Tie! 🤝`;
    }
    
    finalScores.innerHTML = `
        <div class="final-score-item">
            <div class="final-player-info">
                <span class="final-color-box" style="background-color: ${gameState.player1.color}"></span>
                <span class="final-player-name">${gameState.player1.name}</span>
            </div>
            <span class="final-player-score">${gameState.player1.score} boxes</span>
        </div>
        <div class="final-score-item">
            <div class="final-player-info">
                <span class="final-color-box" style="background-color: ${gameState.player2.color}"></span>
                <span class="final-player-name">${gameState.player2.name}</span>
            </div>
            <span class="final-player-score">${gameState.player2.score} boxes</span>
        </div>
    `;

    try {
        localStorage.setItem(DOTS_BOXES_RESULT_KEY, JSON.stringify({
            player1: { name: gameState.player1.name, score: gameState.player1.score },
            player2: { name: gameState.player2.name, score: gameState.player2.score },
            finishedAt: new Date().toISOString()
        }));
    } catch (err) {
        // Ignore storage errors to avoid affecting gameplay.
    }
    
    gameScreen.classList.remove('active');
    gameOverScreen.classList.add('active');
}

function restartGame() {
    gameOverScreen.classList.remove('active');
    setupScreen.classList.add('active');
}

function confirmExit() {
    showConfirm('Are you sure you want to exit the game? Your progress will be lost.', () => {
        clearInterval(gameState.timerInterval);
        window.location.href = '../../index.html';
    });
}

let confirmCallback = null;

function showConfirm(message, onConfirm) {
    confirmMessage.textContent = message;
    confirmCallback = onConfirm;
    confirmModal.classList.add('active');
    confirmModal.setAttribute('aria-hidden', 'false');
}

function closeConfirm() {
    confirmModal.classList.remove('active');
    confirmModal.setAttribute('aria-hidden', 'true');
    confirmCallback = null;
}

confirmYesBtn.addEventListener('click', () => {
    if (typeof confirmCallback === 'function') {
        const callback = confirmCallback;
        closeConfirm();
        callback();
        return;
    }
    closeConfirm();
});

confirmNoBtn.addEventListener('click', closeConfirm);

confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        closeConfirm();
    }
});

// Set default grid size
gridButtons[0].classList.add('selected');
