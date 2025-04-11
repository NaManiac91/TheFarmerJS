import {action, createFarmer, initGrid, move} from "./game-ingine.mjs";
import {createTimer, initPoints} from "./ui-factory.mjs";

// Init core items
const container = document.getElementById('container');
const timer = document.getElementById('timer');
const points = document.getElementById('points');
const leaderboard = document.getElementById('leaderboard');
let gridSize = 5;
let currentPoints = 0;

// Init UI
// Init points and leaderboard
initPoints(points, leaderboard);

// Init timer
createTimer(timer);

// Init grid
let grid = initGrid(gridSize);
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
        move(e, row, col, farmer, grid, gridSize);
    } else if (e.code === 'Space') {
        farmer.src = 'assets/farmer2.svg';
        action(row, col, grid, points, currentPoints);
    }
});

function reloadGrid() {
    points.setAttribute('current', 0);
    container.removeChild(container.firstChild);
    grid = initGrid(gridSize);
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
            if (gridSize < 10)
                gridSize++;
            reloadGrid();
        }
    }
});