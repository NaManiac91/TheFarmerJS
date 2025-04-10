import {initGrid, move, action, createFarmer} from "./game-ingine.mjs";

// Init core items
const container = document.getElementById('container');
const points = document.getElementById('points');
const leaderboard = document.getElementById('leaderboard');
let gridSize = 5;

// Init UI
// Init points and leaderboard
points.setAttribute('value', 0);
points.innerText = 'Points: 0';
let currentPoints = 0;
let record = JSON.parse(localStorage.getItem("Record"));
if (!record) {
    record = {name: 'Pippo', value: 1};
    localStorage.setItem("Record", JSON.stringify(record));
}

const p = document.createElement('p');
p.innerText = `${record.name}: ${record.value}`;
let topScore = record.value;
leaderboard.appendChild(p);

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

document.addEventListener('keyup', (e) => {
    e.preventDefault();

    if (e.code === 'Space') {
        farmer.src = 'assets/farmer.svg';

        if (points.getAttribute('current') === gridScore) {
            // TO DO update only when timer is finished
            if (gridScore > topScore) {
                topScore = gridScore
                localStorage.setItem("Record", JSON.stringify({name: 'Pippo', value: Number(grid.getAttribute('points'))}));
                p.innerText = `${record.name}: ${topScore}`;
            }

            // Reload the grid with a new level
            gridSize++;
            points.setAttribute('current', 0);
            container.removeChild(container.firstChild);
            grid = initGrid(gridSize);
            gridScore = grid.getAttribute('points');
            container.appendChild(grid);
            farmer = createFarmer(grid);
        }
    }
});