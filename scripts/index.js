import {action, createFarmer, initGrid, levelUp, move, createTimer, initPoints, reset} from "./game-ingine.mjs";

// Init core items
const player = document.getElementById('player');
const saveButton = document.getElementById('player-button');
const playerName = document.getElementById('player-name');
const restart = document.getElementById('restart');

playerName.addEventListener('input', () => {
    saveButton.disabled = !playerName.value;
});

saveButton.addEventListener('click', () => {
    init();
    player.remove();
});

restart.addEventListener('click', () => {
    reset();
    init();
});


function init() {
    const container = document.getElementById('container');
    const timer = document.getElementById('timer');
    const points = document.getElementById('points');
    const leaderboard = document.getElementById('leaderboard');
    // Init UI
// Init points and leaderboard
    initPoints(points, leaderboard);

// Init timer
    createTimer(timer);

// Init grid
    let grid = initGrid();
    let gridScore = grid.getAttribute('points');
    container.appendChild(grid);

// Init farmer position
    let farmer = createFarmer(grid);

// Init events for the game engine
    document.addEventListener('keydown', (e) => {
        e.preventDefault();

        const coordinates = farmer.parentElement.className.split('-');
        let row = Number(coordinates[1]);
        let col = Number(coordinates[2]);

        if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
            move(e, row, col, farmer, grid);
        } else if (e.code === 'Space') {
            farmer.src = 'assets/farmer2.svg';
            action(row, col, grid, points);
        }
    });

    function reloadGrid() {
        points.setAttribute('current', 0);
        container.removeChild(container.firstChild);
        grid = initGrid();
        gridScore = grid.getAttribute('points');
        container.appendChild(grid);
        farmer = createFarmer(grid);
    }

    document.addEventListener('keyup', (e) => {
        e.preventDefault();

        if (e.code === 'Space') {
            farmer.src = 'assets/farmer.svg';

            if (points.getAttribute('current') === gridScore) {
                // Reload the grid with a new level
                levelUp();
                reloadGrid();
            }
        }
    });
}