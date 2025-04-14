// Global variables
const objects = [   // Objects to dig
    'seedling.svg',
    'wood.svg',
    'rock.svg'
];

const points = document.getElementById('points');
const playerName = document.getElementById('player-name');
const gameOver = document.getElementById('game-over');
const pRecord = document.getElementById('record');

let hoeLevel = 1;
let gridSize = 5;
let level = 1;
let timeLeft = 30; // seconds

export function reset() {
    gameOver.style.display = 'none';

    hoeLevel = 1;
    gridSize = 5;
    level = 1;
    timeLeft = 30; // seconds
}

// Create the grid in the DOM and fill the grid with random items
export function initGrid() {
    const grid = document.createElement('div');
    grid.id = 'grid';
    let points = 0;

    for (let i = 0; i < gridSize; i++) {
        let row = document.createElement('div');
        row.className = 'row';
        grid.append(row);
        for (let j = 0; j < gridSize; j++) {
            // Create cell
            let cell = document.createElement('div');
            cell.className = 'cell cell-' + i + '-' + j;

            // Append a random object in the cell
            const img = document.createElement('img');
            const value = Math.floor(Math.random() * objects.length);
            img.src = 'assets/' + objects[value];
            cell.appendChild(img);
            cell.setAttribute('value', value);
            points += value + hoeLevel;

            // Append to the row
            row.append(cell);
        }
    }

    grid.setAttribute('points', points);
    return grid;
}

export function initPoints(points, leaderboard) {
    // Init points and leaderboard
    let record = JSON.parse(localStorage.getItem("Record"));

    if (!record) {
        record = {name: playerName.value, value: 0};
        localStorage.setItem("Record", JSON.stringify(record));
    }

    points.setAttribute('value', 0);
    points.setAttribute('current', 0);
    points.innerText = 'Points: 0';

    pRecord.id = 'record';
    pRecord.innerText = `${record.name}: ${record.value}`;
}

function updateRecord() {
    const record = JSON.parse(localStorage.getItem("Record"));
    const currentScore = Number(points.getAttribute('value'));
    if (currentScore > record.value) {
        record.value = currentScore;
        record.name = playerName.value;
        localStorage.setItem("Record", JSON.stringify(record));
        pRecord.innerText = `${record.name}: ${currentScore}`;
    }
    document.getElementById('grid').remove();
    gameOver.style.display = 'block';
}

export function createTimer(timerDisplay) {
    // Show timer
    timerDisplay.style.display = 'block';
    timerDisplay.textContent = timeLeft;

    // Add interval to update seconds
    const countdown = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(countdown);
            updateRecord();     // Update record if needed
        }
    }, 1000); // every 1000ms = 1 second
}

export function move(event, row, col, farmer, grid) {
    const currentPosition = grid.getElementsByClassName('cell-' + row + '-' + col)[0];
    currentPosition.children[0].style.display = 'block';    // show the object "behind" the farmer

    switch (event.keyCode) {
        case 37:    // left
            col -= 1;
            break;
        case 38:    // top
            row -= 1;
            break;
        case 39:    // right
            col += 1;
            break;
        case 40:    // bottom
            row += 1;
            break;
    }

    // Moving the farmer if the movement is allowed
    if (col < gridSize && col >= 0 && row >= 0 && row < gridSize) {
        const newPosition = grid.getElementsByClassName('cell-' + row + '-' + col)[0];
        newPosition.children[0].style.display = 'none';
        newPosition.appendChild(farmer);
    }
}

export function action(row, col, grid, points) {
    const cell = grid.getElementsByClassName('cell-' + row + '-' + col)[0];

    // Update the currentValue
    let currentValue = cell.getAttribute('value');
    if (currentValue >= 0) {
        currentValue = currentValue - hoeLevel;

        const value = Number(points.getAttribute('value')) + hoeLevel;
        const current = Number(points.getAttribute('current')) + hoeLevel;
        points.setAttribute('value', value);
        points.setAttribute('current', current);
        points.innerText = `Points: ${value}`;
    }

    // Hide or change the img of the object
    if (cell.firstChild) {
        if (currentValue < 0) {
            cell.firstChild.src = '';
            cell.children[0].style.display = 'none';
        } else {
            cell.firstChild.src = 'assets/' + objects[currentValue];
        }
    }

    cell.setAttribute('value', currentValue);
}

export function createFarmer(grid) {
    const farmer = document.createElement('img');
    farmer.id = 'farmer';
    farmer.src = 'assets/farmer.svg';
    farmer.height = 25;
    const firstCell = grid.getElementsByClassName('cell-0-0')[0];
    firstCell.children[0].style.display = 'none';
    firstCell.appendChild(farmer);

    return farmer;
}

export function levelUp() {
    if (gridSize < 10) {
        gridSize++;     // update the size  of the grid
    }
    level++;            // update the level
    if (level % 5 === 0) {
        hoeLevel++;     // update the hoe level each 5 level
    }
    timeLeft += 30;     // add 30 extra seconds to the timer
}
