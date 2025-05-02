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
const pPause = document.getElementById('pause-text');
const leaderboard = document.getElementById('leaderboard');

let hoeLevel = 1;
let gridSize = 5;
let level = 1;
let timeLeft = 30; // seconds
let countdown = null;
let isPaused = false;

// Create the grid in the DOM and fill the grid with random items
export function initGrid() {
    const grid = document.createElement('div');
    grid.id = 'grid';
    let points = 0;
    let gold = false;

    for (let i = 0; i < gridSize; i++) {
        let row = document.createElement('div');
        row.classList.add('row');
        grid.append(row);
        for (let j = 0; j < gridSize; j++) {
            // Create cell
            let cell = document.createElement('div');
            cell.id = 'cell-' + i + '-' + j;
            cell.classList.add('cell');

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
                    value = !gold ? Math.floor(Math.random() * bonus.length) : 0;

                    // Only one gold dig per level
                    if (value === 1) {
                        gold = true;
                        cell.classList.add('gold');
                    }

                    object = bonus[value];
                    cell.setAttribute('isBonus', true);
                    img.classList.add('blink');
                }
            } else {    // Otherwise a diggable object
                value = Math.floor(Math.random() * objects.length)
                object = objects[value];
            }

            // Setup object img
            img.src = 'assets/ui/' + object;
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
    pRecord.setAttribute('points', record.value);
    pRecord.innerText = `Best Score - ${record.name}: ${record.value}`;
    leaderboard.style.display = 'block';
}

// Update the Record
export function updateRecord() {
    const record = JSON.parse(localStorage.getItem("Record"));
    const currentScore = Number(points.getAttribute('value'));
    if (currentScore > record.value) {
        record.value = currentScore;
        record.name = playerName.value;
        localStorage.setItem("Record", JSON.stringify(record));
        pRecord.innerText = `${record.name}: ${currentScore}`;
        pRecord.setAttribute('points', currentScore);

        // Show that a new record is in place
        const span = document.createElement('span');
        span.id = 'new-record';
        span.classList.add('blink');
        span.innerText = 'New Record!!!';
        pRecord.after(span);
    }
}

// Create the timer
export function createTimer(timerDisplay) {
    // Show timer
    timerDisplay.style.display = 'block';
    timerDisplay.firstChild.textContent = timeLeft;

    // Add interval to update seconds if the game is not in paused state
    countdown = setInterval(() => {
        if (!isPaused) {
            timeLeft--;
            timerDisplay.firstChild.textContent = timeLeft;

            // Show up if the time is finishing
            if (timeLeft < 15) {
                timerDisplay.classList.add('blink-bg');
            } else {
                timerDisplay.classList.remove('blink-bg');
            }

            if (timeLeft <= 0) {
                timerDisplay.style.display = 'none';
                endGame();
            }
        }
    }, 1000); // every 1000ms = 1 second
}

// Cleanup the game
function endGame() {
    clearInterval(countdown);
    updateRecord();     // Update record if needed
    document.getElementById('grid').remove();
    gameOver.style.display = 'block';
}

// Define the movement
export function move(keyCode, row, col, farmer) {
    const currentPosition = document.getElementById('cell-' + row + '-' + col);
    if (currentPosition.children.length > 0) {
        currentPosition.firstElementChild.style.display = 'block';    // show the object "behind" the farmer

        switch (keyCode) {
            case 'ArrowLeft':    // left 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'
                col -= 1;
                break;
            case 'ArrowUp':    // top
                row -= 1;
                break;
            case 'ArrowRight':    // right
                col += 1;
                break;
            case 'ArrowDown':    // bottom
                row += 1;
                break;
        }

        // Moving the farmer if the movement is allowed
        if (col < gridSize && col >= 0 && row >= 0 && row < gridSize) {
            const newPosition = document.getElementById('cell-' + row + '-' + col);

            // Check if is a bomb
            if (newPosition.hasAttribute('isMalus')) {
                // Add explosion
                const kaboom = document.createElement('img');
                kaboom.src = 'assets/ui/explosion.svg';
                kaboom.height = 50;
                container.append(kaboom);
                setTimeout(() => kaboom.remove(), 3000);    // Remove it after 3 secs

                endGame();
            }

            newPosition.firstElementChild.style.display = 'none';
            newPosition.appendChild(farmer);
        } else {
            currentPosition.firstElementChild.style.display = 'none';
        }
    }
}

// Add extra time to the timer
function addTime(time) {
    timeLeft += time;     // add 10 extra seconds to the timer

    const timeBonus = document.getElementById('time-bonus');
    timeBonus.classList.add('blink');
    timeBonus.textContent = '+' + time;
    setTimeout(() => {
        timeBonus.textContent = '';
        timeBonus.classList.remove('blink');
    }, 1000);
}

// Define the action
export function action(row, col) {
    // Get the current cell info
    const cell = document.getElementById('cell-' + row + '-' + col);
    let currentValue = Number(cell.getAttribute('value'));

    // Check if the cell contains a bonus or an object
    if (cell.hasAttribute('isBonus')) {
        if (currentValue === 0) {    // is a +10s
            addTime(10);    // add 10 extra seconds to the timer
        } else if (currentValue === 1) {    // is a gold dig
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
            cell.firstElementChild.style.display = 'none';
        } else {
            cell.firstChild.src = 'assets/ui/' + objects[currentValue];
        }
    }
}

// Return the farmer
export function createFarmer() {
    const farmer = document.createElement('img');
    farmer.id = 'farmer';
    farmer.src = 'assets/ui/farmer.svg';
    const firstCell = document.getElementById('cell-0-0');
    firstCell.firstElementChild.style.display = 'none';
    firstCell.appendChild(farmer);

    return farmer;
}

// Define the levelUp condition
export function levelUp() {
    if (gridSize < 9) {
        gridSize++;     // update the size  of the grid
    }
    level++;            // update the level
    addTime(30);     // add 30 extra seconds to the timer
}

// Reload the grid (used after a levelUp)
export function reloadGrid() {
    points.setAttribute('current', 0);
    container.removeChild(container.firstChild);
    return initGrid();
}

// Pause game
export function pause(button) {
    isPaused = !isPaused;

    if (isPaused) {
        button.src = 'assets/ui/play.svg';
        pPause.style.display = 'block';
    } else {
        button.src = 'assets/ui/pause.svg';
        pPause.style.display = 'none';
    }
    return isPaused;
}