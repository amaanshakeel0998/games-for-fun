// Game State
let gameState = {
    player1: { name: '', color: '#ff00ff', symbol: 'X', wins: 0 },
    player2: { name: '', color: '#00ffff', symbol: 'O', wins: 0 },
    currentPlayer: 1,
    board: ['', '', '', '', '', '', '', '', ''],
    gameMode: 'pvp', // 'pvp' or 'pvc'
    difficulty: 'medium',
    gameActive: false,
    isComputerThinking: false
};

// DOM Elements
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverModal = document.getElementById('gameOverModal');

// Setup Elements
const player1NameInput = document.getElementById('player1Name');
const player2NameInput = document.getElementById('player2Name');
const player1ColorInput = document.getElementById('player1Color');
const player2ColorInput = document.getElementById('player2Color');
const modeButtons = document.querySelectorAll('.mode-btn');
const difficultySection = document.getElementById('difficultySection');
const difficultySelect = document.getElementById('difficulty');
const startGameBtn = document.getElementById('startGameBtn');

// Game Elements
const cells = document.querySelectorAll('.cell');
const p1NameDisplay = document.getElementById('p1Name');
const p2NameDisplay = document.getElementById('p2Name');
const p1ScoreDisplay = document.getElementById('p1Score');
const p2ScoreDisplay = document.getElementById('p2Score');
const currentTurnDisplay = document.getElementById('currentTurn');
const player1Info = document.getElementById('player1Info');
const player2Info = document.getElementById('player2Info');
const resetBtn = document.getElementById('resetBtn');
const newMatchBtn = document.getElementById('newMatchBtn');
const winLineCanvas = document.getElementById('winLine');

// Modal Elements
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');

// Winning combinations
const winningCombos = [
    [0, 1, 2], // Top row
    [3, 4, 5], // Middle row
    [6, 7, 8], // Bottom row
    [0, 3, 6], // Left column
    [1, 4, 7], // Middle column
    [2, 5, 8], // Right column
    [0, 4, 8], // Diagonal \
    [2, 4, 6]  // Diagonal /
];

// Setup Event Listeners
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        gameState.gameMode = btn.dataset.mode;
        
        if (gameState.gameMode === 'pvc') {
            difficultySection.style.display = 'block';
            player2NameInput.value = 'Computer';
            player2NameInput.disabled = true;
        } else {
            difficultySection.style.display = 'none';
            player2NameInput.disabled = false;
            if (player2NameInput.value === 'Computer') {
                player2NameInput.value = '';
            }
        }
    });
});

difficultySelect.addEventListener('change', (e) => {
    gameState.difficulty = e.target.value;
});

startGameBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);
newMatchBtn.addEventListener('click', newMatch);

cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
});

function startGame() {
    // Get player names
    const p1Name = player1NameInput.value.trim() || 'Player 1';
    const p2Name = gameState.gameMode === 'pvc' ? 'Computer' : (player2NameInput.value.trim() || 'Player 2');
    
    gameState.player1.name = p1Name;
    gameState.player1.color = player1ColorInput.value;
    gameState.player2.name = p2Name;
    gameState.player2.color = player2ColorInput.value;
    
    // Update displays
    p1NameDisplay.textContent = gameState.player1.name;
    p2NameDisplay.textContent = gameState.player2.name;
    p1ScoreDisplay.textContent = `Wins: ${gameState.player1.wins}`;
    p2ScoreDisplay.textContent = `Wins: ${gameState.player2.wins}`;
    
    // Apply colors
    document.querySelectorAll('.player-symbol')[0].style.backgroundColor = gameState.player1.color;
    document.querySelectorAll('.player-symbol')[1].style.backgroundColor = gameState.player2.color;
    
    // Switch screens
    setupScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    // Initialize game
    gameState.gameActive = true;
    gameState.currentPlayer = 1;
    updateTurnDisplay();
    
    // Resize canvas
    resizeCanvas();
}

function resizeCanvas() {
    const board = document.querySelector('.game-board');
    winLineCanvas.width = board.offsetWidth;
    winLineCanvas.height = board.offsetHeight;
}

window.addEventListener('resize', resizeCanvas);

function handleCellClick(e) {
    const index = parseInt(e.target.dataset.index);
    
    if (!gameState.gameActive || gameState.board[index] !== '' || gameState.isComputerThinking) {
        return;
    }
    
    makeMove(index);
}

function makeMove(index) {
    const symbol = gameState.currentPlayer === 1 ? gameState.player1.symbol : gameState.player2.symbol;
    const color = gameState.currentPlayer === 1 ? gameState.player1.color : gameState.player2.color;
    
    gameState.board[index] = symbol;
    
    const cell = cells[index];
    cell.textContent = symbol;
    cell.style.color = color;
    cell.classList.add('taken');
    cell.style.animation = 'cellPop 0.3s ease';
    
    // Add animation keyframes dynamically
    if (!document.querySelector('#cellPopAnimation')) {
        const style = document.createElement('style');
        style.id = 'cellPopAnimation';
        style.textContent = `
            @keyframes cellPop {
                0% { transform: scale(0); opacity: 0; }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Check for winner or draw
    const result = checkGameState();
    
    if (result.winner) {
        handleWin(result.combo);
    } else if (result.draw) {
        handleDraw();
    } else {
        // Switch player
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        updateTurnDisplay();
        
        // Computer's turn
        if (gameState.gameMode === 'pvc' && gameState.currentPlayer === 2 && gameState.gameActive) {
            gameState.isComputerThinking = true;
            setTimeout(() => {
                computerMove();
                gameState.isComputerThinking = false;
            }, 500);
        }
    }
}

function computerMove() {
    let move;
    
    switch (gameState.difficulty) {
        case 'easy':
            move = getRandomMove();
            break;
        case 'medium':
            move = Math.random() < 0.5 ? getBestMove() : getRandomMove();
            break;
        case 'hard':
            move = getBestMove();
            break;
        default:
            move = getRandomMove();
    }
    
    if (move !== -1) {
        makeMove(move);
    }
}

function getRandomMove() {
    const availableMoves = gameState.board
        .map((cell, index) => cell === '' ? index : null)
        .filter(index => index !== null);
    
    return availableMoves.length > 0 
        ? availableMoves[Math.floor(Math.random() * availableMoves.length)]
        : -1;
}

function getBestMove() {
    // Try to win
    for (let i = 0; i < 9; i++) {
        if (gameState.board[i] === '') {
            gameState.board[i] = gameState.player2.symbol;
            if (checkGameState().winner) {
                gameState.board[i] = '';
                return i;
            }
            gameState.board[i] = '';
        }
    }
    
    // Block player from winning
    for (let i = 0; i < 9; i++) {
        if (gameState.board[i] === '') {
            gameState.board[i] = gameState.player1.symbol;
            if (checkGameState().winner) {
                gameState.board[i] = '';
                return i;
            }
            gameState.board[i] = '';
        }
    }
    
    // Take center if available
    if (gameState.board[4] === '') {
        return 4;
    }
    
    // Take a corner
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(i => gameState.board[i] === '');
    if (availableCorners.length > 0) {
        return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }
    
    // Take any available space
    return getRandomMove();
}

function checkGameState() {
    // Check for winner
    for (let combo of winningCombos) {
        const [a, b, c] = combo;
        if (gameState.board[a] && 
            gameState.board[a] === gameState.board[b] && 
            gameState.board[a] === gameState.board[c]) {
            return { winner: true, combo: combo, draw: false };
        }
    }
    
    // Check for draw
    if (!gameState.board.includes('')) {
        return { winner: false, combo: null, draw: true };
    }
    
    return { winner: false, combo: null, draw: false };
}

function handleWin(combo) {
    gameState.gameActive = false;
    
    // Update score
    if (gameState.currentPlayer === 1) {
        gameState.player1.wins++;
        p1ScoreDisplay.textContent = `Wins: ${gameState.player1.wins}`;
    } else {
        gameState.player2.wins++;
        p2ScoreDisplay.textContent = `Wins: ${gameState.player2.wins}`;
    }
    
    // Highlight winning cells
    combo.forEach(index => {
        cells[index].classList.add('winner');
    });
    
    // Draw winning line
    drawWinLine(combo);
    
    // Show modal after animation
    setTimeout(() => {
        const winnerName = gameState.currentPlayer === 1 ? gameState.player1.name : gameState.player2.name;
        resultTitle.textContent = `🎉 ${winnerName} Wins! 🎉`;
        resultMessage.textContent = `Congratulations! You've won this round.`;
        gameOverModal.classList.add('active');
    }, 1000);
}

function handleDraw() {
    gameState.gameActive = false;
    
    setTimeout(() => {
        resultTitle.textContent = `🤝 It's a Draw! 🤝`;
        resultMessage.textContent = `Good game! No one wins this round.`;
        gameOverModal.classList.add('active');
    }, 500);
}

function drawWinLine(combo) {
    const canvas = winLineCanvas;
    const ctx = canvas.getContext('2d');
    const board = document.querySelector('.game-board');
    
    // Get cell positions
    const firstCell = cells[combo[0]].getBoundingClientRect();
    const lastCell = cells[combo[2]].getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    
    const startX = firstCell.left - boardRect.left + firstCell.width / 2;
    const startY = firstCell.top - boardRect.top + firstCell.height / 2;
    const endX = lastCell.left - boardRect.left + lastCell.width / 2;
    const endY = lastCell.top - boardRect.top + lastCell.height / 2;
    
    // Animate line drawing
    let progress = 0;
    const color = gameState.currentPlayer === 1 ? gameState.player1.color : gameState.player2.color;
    
    const animate = () => {
        progress += 0.05;
        if (progress > 1) progress = 1;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(
            startX + (endX - startX) * progress,
            startY + (endY - startY) * progress
        );
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.stroke();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    animate();
}

function updateTurnDisplay() {
    if (!gameState.gameActive) return;
    
    const currentPlayerName = gameState.currentPlayer === 1 ? gameState.player1.name : gameState.player2.name;
    const currentSymbol = gameState.currentPlayer === 1 ? gameState.player1.symbol : gameState.player2.symbol;
    
    currentTurnDisplay.textContent = `${currentPlayerName}'s Turn (${currentSymbol})`;
    
    if (gameState.currentPlayer === 1) {
        player1Info.classList.add('active');
        player2Info.classList.remove('active');
    } else {
        player1Info.classList.remove('active');
        player2Info.classList.add('active');
    }
}

function resetGame() {
    // Clear board
    gameState.board = ['', '', '', '', '', '', '', '', ''];
    gameState.currentPlayer = 1;
    gameState.gameActive = true;
    gameState.isComputerThinking = false;
    
    // Clear cells
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken', 'winner');
        cell.style.animation = '';
    });
    
    // Clear canvas
    const ctx = winLineCanvas.getContext('2d');
    ctx.clearRect(0, 0, winLineCanvas.width, winLineCanvas.height);
    
    // Hide modal
    gameOverModal.classList.remove('active');
    
    // Update display
    updateTurnDisplay();
}

function newMatch() {
    // Reset scores
    gameState.player1.wins = 0;
    gameState.player2.wins = 0;
    p1ScoreDisplay.textContent = 'Wins: 0';
    p2ScoreDisplay.textContent = 'Wins: 0';
    
    // Reset game
    resetGame();
    
    // Back to setup
    gameOverModal.classList.remove('active');
    gameScreen.classList.remove('active');
    setupScreen.classList.add('active');
}

function confirmExit() {
    if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
        window.location.href = '../../index.html';
    }
}

// Initialize
modeButtons[0].classList.add('selected');
