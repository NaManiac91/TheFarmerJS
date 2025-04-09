import {initGrid, move, action} from "./game-ingine.mjs";

const container = document.getElementById('container');
const n = 5;
const gridValues = Array(n).fill(Array(n));

//Init grid
const grid = initGrid(gridValues, n);
container.append(grid);

//Init farmer position
const farmer = document.createElement('img');
farmer.id = 'farmer';
farmer.src = 'assets/tractor.svg';
const firstCell = grid.getElementsByClassName('cell-0-0')[0];
firstCell.children[0].style.display = 'none';
firstCell.appendChild(farmer);

// Move
document.addEventListener('keydown', (e) => {
    const coordinates = farmer.parentElement.className.split('-');
    let row = Number(coordinates[1]);
    let col = Number(coordinates[2]);

    if ([37,38,39,40].includes(e.keyCode))
        move(e, row, col, farmer, grid, n);
    else if(e.keyCode === 32)
        action(row, col, grid, gridValues)
});