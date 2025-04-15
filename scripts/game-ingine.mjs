// Global variables
// Objects diggable
const objects = [
    'seedling.svg',
    'wood.svg',
    'rock.svg'
];

// Bonus
const bonus = [
    '10-seconds.svg',
    'spade.svg'
];

// Malus
const malus = [
    'bomb.svg',
]

// Init core items
const points = document.getElementById('points');
const playerName = document.getElementById('player-name');
const container = document.getElementById('container');
const gameOver = document.getElementById('game-over');
const pRecord = document.getElementById('record');

let hoeLevel = 1;
let gridSize = 5;
let level = 1;
let timeLeft = 30; // seconds
let countdown = null;

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

            // Add bonus/malus with a 5% of probability
            let value = 0;
            let object = null;

            if (Math.random() < 0.05) {
                // Choose from a bonus and malus 50%
                if (Math.random() < 0.5) {
                    value = -1;
                    object = malus[0];
                    cell.setAttribute('isMalus', true);
                } else {
                    value = Math.floor(Math.random() * bonus.length)
                    object = bonus[value];
                    cell.setAttribute('isBonus', true);
                }
            } else {    // Otherwise a diggable object
                value = Math.floor(Math.random() * objects.length)
                object = objects[value];
            }

            // Setup object img
            img.src = 'assets/' + object;
            cell.appendChild(img);

            // Update gridScore
            cell.setAttribute('value', value);
            points += value + hoeLevel;

            // Append to the row
            row.append(cell);
        }
    }

    grid.setAttribute('points', points);
    container.appendChild(grid);
    return points;
}

// Create the Leaderboard
export function initPoints() {
    // Retrieve record from the localStorage
    let record = JSON.parse(localStorage.getItem("Record"));

    if (!record) {
        record = {name: playerName.value, value: 0};
        localStorage.setItem("Record", JSON.stringify(record));
    }

    // Init points and record
    points.setAttribute('value', 0);
    points.setAttribute('current', 0);
    points.innerText = 'Points: 0';

    pRecord.id = 'record';
    pRecord.innerText = `${record.name}: ${record.value}`;
}

// Update the Record
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

// Create the timer
export function createTimer(timerDisplay) {
    // Show timer
    timerDisplay.style.display = 'block';
    timerDisplay.textContent = timeLeft;

    // Add interval to update seconds
    countdown = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;

        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000); // every 1000ms = 1 second
}

// Cleanup the game
function endGame() {
    clearInterval(countdown);
    updateRecord();     // Update record if needed
}

// Define the movement
export function move(event, row, col, farmer) {
    const currentPosition = document.getElementsByClassName('cell-' + row + '-' + col)[0];
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
        const newPosition = document.getElementsByClassName('cell-' + row + '-' + col)[0];

        // Check if is a bomb
        if (newPosition.getAttribute('isMalus')) {
            endGame();
        }

        newPosition.children[0].style.display = 'none';
        newPosition.appendChild(farmer);
    } else {
        currentPosition.children[0].style.display = 'none';
    }
}

// Define the action
export function action(row, col) {
    // Get the current cell info
    const cell = document.getElementsByClassName('cell-' + row + '-' + col)[0];
    let currentValue = Number(cell.getAttribute('value'));

    // Check if the cell contains a bonus or an object
    if (cell.getAttribute('isBonus')) {
        if (currentValue === 0) {    // is a +10s
            timeLeft += 10;     // add 30 extra seconds to the timer
        } else if (currentValue === 1) {
            const gridScore = Number(document.getElementById('grid').getAttribute('points'));
            const currentScore = Number(document.getElementById('points').getAttribute('current'));
            const newPoints = Number(points.getAttribute('value')) + (gridScore - currentScore);
            points.setAttribute('current', gridScore);
            points.setAttribute('value', newPoints);
            points.innerText = `Points: ${newPoints}`;
            return;
        }
        cell.setAttribute('isBonus', false);
    }

    // Update the points
    if (currentValue >= 0) {
        currentValue = currentValue - hoeLevel;
        const value = Number(points.getAttribute('value')) + hoeLevel;
        const current = Number(points.getAttribute('current')) + hoeLevel;
        points.setAttribute('value', value);
        points.setAttribute('current', current);
        points.innerText = `Points: ${value}`;
    }
    cell.setAttribute('value', currentValue);

    // Hide or change the img of the object
    if (cell.firstChild) {
        if (currentValue < 0) {
            cell.firstChild.src = '';
            cell.children[0].style.display = 'none';
        } else {
            cell.firstChild.src = 'assets/' + objects[currentValue];
        }
    }
}

// Return the farmer
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

// Define the levelUp condition
export function levelUp() {
    if (gridSize < 10) {
        gridSize++;     // update the size  of the grid
    }
    level++;            // update the level
    timeLeft += 30;     // add 30 extra seconds to the timer
}

// Reload the grid (used after a levelUp)
export function reloadGrid() {
    points.setAttribute('current', 0);
    container.removeChild(container.firstChild);
    return initGrid();
}