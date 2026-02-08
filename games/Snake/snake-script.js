const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const pauseOverlay = document.getElementById('pauseOverlay');

const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const backBtn = document.getElementById('backBtn');
const homeBtn = document.getElementById('homeBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');

const speedSelect = document.getElementById('speed');
const gridSelect = document.getElementById('grid');

const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const statusText = document.getElementById('statusText');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gridSize = 20;
let tickRate = 110;
let tileSize = 0;
let backgroundCanvas = null;
let backgroundCtx = null;
let snake = [];
let direction = { x: 1, y: 0 };
let pendingDirection = null;
let food = null;
let score = 0;
let bestScore = 0;
let intervalId = null;
let isPaused = false;
let isGameOver = false;
const SNAKE_BEST_SCORE_KEY = 'gamehub.snake.bestScore';

function setActiveScreen(screen) {
    [menuScreen, gameScreen].forEach(el => el.classList.remove('active'));
    screen.classList.add('active');
}

function loadBestScore() {
    try {
        const stored = localStorage.getItem(SNAKE_BEST_SCORE_KEY);
        const parsed = parseInt(stored, 10);
        if (!Number.isNaN(parsed)) {
            bestScore = parsed;
        }
    } catch (err) {
        // Ignore storage errors to avoid affecting gameplay.
    }
}

function saveBestScore() {
    try {
        localStorage.setItem(SNAKE_BEST_SCORE_KEY, bestScore.toString());
    } catch (err) {
        // Ignore storage errors to avoid affecting gameplay.
    }
}

function resizeCanvas() {
    const size = Math.min(canvas.clientWidth, canvas.clientHeight);
    canvas.width = size;
    canvas.height = size;
    tileSize = canvas.width / gridSize;

    backgroundCanvas = document.createElement('canvas');
    backgroundCanvas.width = canvas.width;
    backgroundCanvas.height = canvas.height;
    backgroundCtx = backgroundCanvas.getContext('2d');
    buildBackground();
}

function resetState() {
    score = 0;
    scoreEl.textContent = '0';
    bestScoreEl.textContent = bestScore.toString();
    statusText.textContent = '';
    direction = { x: 1, y: 0 };
    pendingDirection = null;
    isPaused = false;
    isGameOver = false;

    const center = Math.floor(gridSize / 2);
    snake = [
        { x: center - 1, y: center },
        { x: center - 2, y: center },
        { x: center - 3, y: center }
    ];

    placeFood();
}

function placeFood() {
    const occupied = new Set(snake.map(segment => `${segment.x},${segment.y}`));
    const empty = [];

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (!occupied.has(`${x},${y}`)) {
                empty.push({ x, y });
            }
        }
    }

    if (empty.length === 0) {
        food = null;
        handleNoSpace();
        return;
    }

    const pick = empty[Math.floor(Math.random() * empty.length)];
    food = pick;
}

function handleNoSpace() {
    isGameOver = true;
    statusText.textContent = 'You win!';
    saveBestScore();
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function startGame() {
    gridSize = parseInt(gridSelect.value, 10);
    tickRate = parseInt(speedSelect.value, 10);
    setActiveScreen(gameScreen);
    resizeCanvas();
    resetState();
    drawBoard();

    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(gameTick, tickRate);

    pauseOverlay.classList.remove('active');
}

function buildBackground() {
    if (!backgroundCtx) return;

    backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    backgroundCtx.fillStyle = 'rgba(6, 12, 20, 0.9)';
    backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);

    backgroundCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    backgroundCtx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
        const pos = i * tileSize;
        backgroundCtx.beginPath();
        backgroundCtx.moveTo(pos, 0);
        backgroundCtx.lineTo(pos, backgroundCanvas.height);
        backgroundCtx.stroke();
        backgroundCtx.beginPath();
        backgroundCtx.moveTo(0, pos);
        backgroundCtx.lineTo(backgroundCanvas.width, pos);
        backgroundCtx.stroke();
    }
}

function drawBackground() {
    if (!backgroundCanvas) return;
    ctx.drawImage(backgroundCanvas, 0, 0);
}

function drawCellBackground(x, y) {
    if (!backgroundCanvas) return;
    const sx = x * tileSize;
    const sy = y * tileSize;
    ctx.drawImage(backgroundCanvas, sx, sy, tileSize, tileSize, sx, sy, tileSize, tileSize);
}

function drawSnakeSegment(segment, isHead) {
    ctx.fillStyle = isHead ? '#00ffff' : '#00ff88';
    ctx.fillRect(segment.x * tileSize + 1, segment.y * tileSize + 1, tileSize - 2, tileSize - 2);
}

function drawFood() {
    if (!food) return;
    ctx.fillStyle = '#ff4dff';
    ctx.beginPath();
    ctx.arc((food.x + 0.5) * tileSize, (food.y + 0.5) * tileSize, tileSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
}

function drawBoard() {
    drawBackground();
    snake.forEach((segment, index) => drawSnakeSegment(segment, index === 0));
    drawFood();
}

function clearCell(x, y) {
    drawCellBackground(x, y);
}

function redrawFoodCell() {
    if (!food) return;
    clearCell(food.x, food.y);
    drawFood();
}

function gameTick() {
    if (isPaused || isGameOver) return;

    if (pendingDirection) {
        direction = pendingDirection;
        pendingDirection = null;
    }

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    const hitWall = head.x < 0 || head.y < 0 || head.x >= gridSize || head.y >= gridSize;
    const hitSelf = snake.some(segment => segment.x === head.x && segment.y === head.y);

    if (hitWall || hitSelf) {
        isGameOver = true;
        statusText.textContent = 'Game Over';
        saveBestScore();
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        return;
    }

    const previousHead = snake[0];
    const previousTail = snake[snake.length - 1];
    const previousFood = food ? { x: food.x, y: food.y } : null;

    snake.unshift(head);
    let ateFood = false;

    if (head.x === food.x && head.y === food.y) {
        ateFood = true;
        score += 1;
        scoreEl.textContent = score.toString();
        if (score > bestScore) {
            bestScore = score;
            bestScoreEl.textContent = bestScore.toString();
        }
        placeFood();
    } else {
        snake.pop();
    }

    clearCell(previousHead.x, previousHead.y);
    drawSnakeSegment(previousHead, false);
    drawSnakeSegment(head, true);

    if (!ateFood) {
        clearCell(previousTail.x, previousTail.y);
    }

    if (ateFood) {
        if (previousFood) {
            clearCell(previousFood.x, previousFood.y);
        }
        drawFood();
    } else {
        redrawFoodCell();
    }
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    pauseOverlay.classList.toggle('active', isPaused);
    pauseBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
    pauseBtn.classList.toggle('paused', isPaused);
    statusText.textContent = isPaused ? 'Paused' : '';
}

function handleDirectionInput(nextDirection) {
    const isOpposite = nextDirection.x === -direction.x && nextDirection.y === -direction.y;
    if (!isOpposite) {
        pendingDirection = nextDirection;
    }
}

function handleKeydown(event) {
    const key = event.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') handleDirectionInput({ x: 0, y: -1 });
    if (key === 'arrowdown' || key === 's') handleDirectionInput({ x: 0, y: 1 });
    if (key === 'arrowleft' || key === 'a') handleDirectionInput({ x: -1, y: 0 });
    if (key === 'arrowright' || key === 'd') handleDirectionInput({ x: 1, y: 0 });
    if (key === ' ' || key === 'p') togglePause();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    resetState();
    drawBoard();
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    intervalId = setInterval(gameTick, tickRate);
    pauseOverlay.classList.remove('active');
    pauseBtn.textContent = '⏸ Pause';
    pauseBtn.classList.remove('paused');
});
backBtn.addEventListener('click', () => {
    if (intervalId) clearInterval(intervalId);
    setActiveScreen(menuScreen);
});

homeBtn.addEventListener('click', () => {
    window.location.href = '../../index.html';
});

pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);

window.addEventListener('resize', () => {
    if (!menuScreen.classList.contains('active')) {
        resizeCanvas();
        drawBoard();
    }
});

document.addEventListener('keydown', handleKeydown);

setActiveScreen(menuScreen);
loadBestScore();
resizeCanvas();
resetState();
drawBoard();
