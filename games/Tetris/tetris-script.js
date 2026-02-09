// Game State
const gameState = {
    playerName: 'Player',
    difficulty: 'easy',
    score: 0,
    level: 1,
    lines: 0,
    highScore: 0,
    isPaused: false,
    isGameOver: false,
    dropCounter: 0,
    dropInterval: 1000,
    lastTime: 0
};

// Board dimensions
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// Colors for different pieces
const COLORS = {
    I: '#00ffff', // Cyan
    O: '#ffff00', // Yellow
    T: '#8a2be2', // Purple
    S: '#00ff00', // Green
    Z: '#ff0000', // Red
    J: '#0000ff', // Blue
    L: '#ffa500', // Orange
    ghost: 'rgba(255, 255, 255, 0.2)'
};

// Tetromino shapes
const SHAPES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
};

// DOM Elements
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextPieceCanvas');
const nextCtx = nextCanvas.getContext('2d');

const playerNameInput = document.getElementById('playerName');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const difficultyDesc = document.getElementById('difficultyDesc');
const startGameBtn = document.getElementById('startGameBtn');

const playerNameDisplay = document.getElementById('playerNameDisplay');
const scoreDisplay = document.getElementById('scoreDisplay');
const levelDisplay = document.getElementById('levelDisplay');
const linesDisplay = document.getElementById('linesDisplay');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScore = document.getElementById('finalScore');
const pauseModal = document.getElementById('pauseModal');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

// Mobile controls
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const downBtn = document.getElementById('downBtn');
const rotateBtn = document.getElementById('rotateBtn');
const dropBtn = document.getElementById('dropBtn');

// Game board
let board = createBoard();
let currentPiece = null;
let nextPiece = null;

// Setup event listeners
difficultyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        difficultyButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        gameState.difficulty = btn.dataset.level;
        updateDifficultyDesc();
    });
});

function updateDifficultyDesc() {
    const descriptions = {
        easy: 'Starting speed: Slow',
        medium: 'Starting speed: Medium',
        hard: 'Starting speed: Fast'
    };
    difficultyDesc.textContent = descriptions[gameState.difficulty];
}

startGameBtn.addEventListener('click', startGame);

// Keyboard controls
document.addEventListener('keydown', handleKeyPress);

function handleKeyPress(e) {
    if (gameState.isGameOver || !currentPiece) return;
    
    if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
    }
    
    if (gameState.isPaused) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            movePiece(-1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            movePiece(1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            softDrop();
            break;
        case 'ArrowUp':
            e.preventDefault();
            rotatePiece();
            break;
        case ' ':
            e.preventDefault();
            hardDrop();
            break;
    }
}

// Mobile controls
leftBtn.addEventListener('click', () => movePiece(-1));
rightBtn.addEventListener('click', () => movePiece(1));
downBtn.addEventListener('click', () => softDrop());
rotateBtn.addEventListener('click', () => rotatePiece());
dropBtn.addEventListener('click', () => hardDrop());

// Touch events for mobile controls
[leftBtn, rightBtn, downBtn, rotateBtn, dropBtn].forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.click();
    });
});

function createBoard() {
    return Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

function createPiece() {
    const types = Object.keys(SHAPES);
    const type = types[Math.floor(Math.random() * types.length)];
    return {
        shape: SHAPES[type],
        type: type,
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2),
        y: 0
    };
}

function startGame() {
    // Get player name
    gameState.playerName = playerNameInput.value.trim() || 'Player';
    
    // Set initial speed based on difficulty
    const speeds = { easy: 1000, medium: 700, hard: 400 };
    gameState.dropInterval = speeds[gameState.difficulty];
    
    // Reset game state
    gameState.score = 0;
    gameState.level = 1;
    gameState.lines = 0;
    gameState.isPaused = false;
    gameState.isGameOver = false;
    board = createBoard();
    
    // Load high score
    gameState.highScore = localStorage.getItem('tetrisHighScore') || 0;
    
    // Update displays
    playerNameDisplay.textContent = gameState.playerName;
    scoreDisplay.textContent = gameState.score;
    levelDisplay.textContent = gameState.level;
    linesDisplay.textContent = gameState.lines;
    highScoreDisplay.textContent = gameState.highScore;
    
    // Switch screens
    setupScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    // Start game
    currentPiece = createPiece();
    nextPiece = createPiece();
    drawNextPiece();
    
    gameState.lastTime = 0;
    requestAnimationFrame(gameLoop);
}

function gameLoop(time = 0) {
    if (gameState.isGameOver) return;
    
    const deltaTime = time - gameState.lastTime;
    gameState.lastTime = time;
    
    if (!gameState.isPaused) {
        gameState.dropCounter += deltaTime;
        
        if (gameState.dropCounter > gameState.dropInterval) {
            dropPiece();
        }
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw board
    drawBoard();
    
    // Draw ghost piece
    if (currentPiece && !gameState.isPaused) {
        drawGhostPiece();
    }
    
    // Draw current piece
    if (currentPiece && !gameState.isPaused) {
        drawPiece(currentPiece);
    }
    
    // Draw grid lines
    drawGrid();
}

function drawBoard() {
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                ctx.fillStyle = board[row][col];
                ctx.fillRect(
                    col * BLOCK_SIZE,
                    row * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
                
                // Add highlight effect
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(
                    col * BLOCK_SIZE,
                    row * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    5
                );
            }
        }
    }
}

function drawPiece(piece) {
    ctx.fillStyle = COLORS[piece.type];
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillRect(
                    (piece.x + x) * BLOCK_SIZE,
                    (piece.y + y) * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
                
                // Add highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(
                    (piece.x + x) * BLOCK_SIZE,
                    (piece.y + y) * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    5
                );
                ctx.fillStyle = COLORS[piece.type];
            }
        });
    });
}

function drawGhostPiece() {
    const ghost = { ...currentPiece, y: currentPiece.y };
    
    while (!collision(ghost, board)) {
        ghost.y++;
    }
    ghost.y--;
    
    ctx.fillStyle = COLORS.ghost;
    ghost.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillRect(
                    (ghost.x + x) * BLOCK_SIZE,
                    (ghost.y + y) * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
            }
        });
    });
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }
}

function drawNextPiece() {
    nextCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (!nextPiece) return;
    
    const offsetX = (nextCanvas.width - nextPiece.shape[0].length * BLOCK_SIZE) / 2;
    const offsetY = (nextCanvas.height - nextPiece.shape.length * BLOCK_SIZE) / 2;
    
    nextCtx.fillStyle = COLORS[nextPiece.type];
    nextPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                nextCtx.fillRect(
                    offsetX + x * BLOCK_SIZE,
                    offsetY + y * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
            }
        });
    });
}

function movePiece(dir) {
    if (!currentPiece || gameState.isPaused) return;
    
    currentPiece.x += dir;
    if (collision(currentPiece, board)) {
        currentPiece.x -= dir;
    }
}

function dropPiece() {
    if (!currentPiece) return;
    
    gameState.dropCounter = 0;
    currentPiece.y++;
    
    if (collision(currentPiece, board)) {
        currentPiece.y--;
        mergePiece();
        clearLines();
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();
        
        if (collision(currentPiece, board)) {
            gameOver();
        }
    }
}

function softDrop() {
    if (!currentPiece || gameState.isPaused) return;
    
    currentPiece.y++;
    if (collision(currentPiece, board)) {
        currentPiece.y--;
    } else {
        gameState.score += 1;
        scoreDisplay.textContent = gameState.score;
    }
}

function hardDrop() {
    if (!currentPiece || gameState.isPaused) return;
    
    let dropDistance = 0;
    while (!collision(currentPiece, board)) {
        currentPiece.y++;
        dropDistance++;
    }
    currentPiece.y--;
    dropDistance--;
    
    gameState.score += dropDistance * 2;
    scoreDisplay.textContent = gameState.score;
    
    mergePiece();
    clearLines();
    currentPiece = nextPiece;
    nextPiece = createPiece();
    drawNextPiece();
    
    if (collision(currentPiece, board)) {
        gameOver();
    }
}

function rotatePiece() {
    if (!currentPiece || gameState.isPaused) return;
    
    const rotated = rotate(currentPiece.shape);
    const originalShape = currentPiece.shape;
    currentPiece.shape = rotated;
    
    // Wall kick
    let offset = 0;
    while (collision(currentPiece, board)) {
        currentPiece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > currentPiece.shape[0].length) {
            currentPiece.shape = originalShape;
            currentPiece.x -= offset;
            return;
        }
    }
}

function rotate(shape) {
    const rotated = [];
    for (let i = 0; i < shape[0].length; i++) {
        const row = [];
        for (let j = shape.length - 1; j >= 0; j--) {
            row.push(shape[j][i]);
        }
        rotated.push(row);
    }
    return rotated;
}

function collision(piece, board) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x;
                const newY = piece.y + y;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

function mergePiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[currentPiece.y + y][currentPiece.x + x] = COLORS[currentPiece.type];
            }
        });
    });
}

function clearLines() {
    let linesCleared = 0;
    
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            board.splice(row, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            row++; // Check the same row again
        }
    }
    
    if (linesCleared > 0) {
        // Update lines
        gameState.lines += linesCleared;
        linesDisplay.textContent = gameState.lines;
        
        // Update score
        const points = [0, 100, 300, 500, 800];
        gameState.score += points[linesCleared] * gameState.level;
        scoreDisplay.textContent = gameState.score;
        
        // Update level
        const newLevel = Math.floor(gameState.lines / 10) + 1;
        if (newLevel > gameState.level) {
            gameState.level = newLevel;
            levelDisplay.textContent = gameState.level;
            gameState.dropInterval = Math.max(100, gameState.dropInterval - 50);
        }
        
        // Flash effect for cleared lines
        setTimeout(() => draw(), 100);
    }
}

function gameOver() {
    gameState.isGameOver = true;
    
    // Update high score
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('tetrisHighScore', gameState.highScore);
        highScoreDisplay.textContent = gameState.highScore;
    }
    
    // Show game over overlay
    finalScore.textContent = `Score: ${gameState.score}`;
    gameOverOverlay.classList.add('active');
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    pauseModal.classList.toggle('active', gameState.isPaused);
    
    if (!gameState.isPaused) {
        gameState.lastTime = performance.now();
        gameState.dropCounter = 0;
    }
}

function restartGame() {
    gameOverOverlay.classList.remove('active');
    pauseModal.classList.remove('active');
    gameState.isPaused = false;
    startGame();
}

function backToSetup() {
    gameOverOverlay.classList.remove('active');
    pauseModal.classList.remove('active');
    gameState.isGameOver = true;
    gameScreen.classList.remove('active');
    setupScreen.classList.add('active');
}

function confirmExit() {
    showConfirm(
        'Are you sure you want to exit? Your progress will be lost.',
        () => {
            window.location.href = '../../index.html';
        }
    );
}

function showConfirm(message, onConfirm) {
    if (!confirmModal) {
        if (confirm(message)) {
            onConfirm();
        }
        return;
    }

    confirmMessage.textContent = message;
    confirmModal.classList.add('active');
    confirmModal.setAttribute('aria-hidden', 'false');

    const handleConfirm = () => {
        cleanup();
        onConfirm();
    };

    const handleCancel = () => {
        cleanup();
    };

    function cleanup() {
        confirmModal.classList.remove('active');
        confirmModal.setAttribute('aria-hidden', 'true');
        confirmYes.removeEventListener('click', handleConfirm);
        confirmNo.removeEventListener('click', handleCancel);
    }

    confirmYes.addEventListener('click', handleConfirm);
    confirmNo.addEventListener('click', handleCancel);
}

// Load high score on page load
gameState.highScore = localStorage.getItem('tetrisHighScore') || 0;
