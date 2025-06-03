import {getLeaderboard, getPlayerScore, saveRecord} from './api-client.mjs';

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
    'spade.svg',
    'heart.svg'
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
const pLife = document.getElementById('extralife');
const leaderboard = document.getElementById('leaderboard');

let hoeLevel = 1;
let gridSize = 5;
let level = 1;
let timeLeft = 30; // seconds
let countdown = null;
let isPaused = false;
let extraLife = 0;
let record = {};
let ratio = 0.5

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
                // Choose from a bonus and malus
                if (level % 5 === 0) {  // Grow  up the ratio of malus each 5 level
                    ratio += 0.1;
                }

                if (Math.random() < ratio) {
                    value = -1;
                    object = malus[0];
                    cell.setAttribute('isMalus', true);
                } else {
                    // Each 3 level can be found a heart
                    if (level % 3 === 0 && Math.random() < 0.3) {
                        value = 2;
                    } else {    // Otherwise gold dig or time bonus
                        value = !gold ? Math.floor(Math.random() * (bonus.length - 1)) : 0;

                        // Only one gold dig per level
                        if (value === 1) {
                            gold = true;
                            cell.classList.add('gold');
                        }
                    }

                    object = bonus[value];
                    cell.setAttribute('isBonus', true);
                    img.classList.add('blink');
                }
            } else {    // Otherwise a diggable object
                value = Math.floor(Math.random() * objects.length)
                object = objects[value];

                // Update gridScore
                points += value + hoeLevel;
            }

            // Setup object img and value
            cell.setAttribute('value', value);
            img.src = 'assets/ui/' + object;
            cell.appendChild(img);

            // Append to the row
            row.append(cell);
        }
    }

    grid.setAttribute('points', points);
    container.appendChild(grid);
    return points;
}

// Get the Leaderboard from db or localStorage
export function showLeaderboard() {
    document.getElementById('grid').remove();
    gameOver.style.display = 'block';
    getLeaderboard().then(data => {
        record = data;  // Get leaderboard from db
        createLeaderboard();
    }, error => {
        console.error(error); // server not found, use local storage to play offline
        console.log('LocalStorage will be used for Record');
        record = JSON.parse(localStorage.getItem("Record"));

        if (!record) {
            record = {};
            record[playerName.value] = 0;
            localStorage.setItem("Record", JSON.stringify(record));
        }

        createLeaderboard();
    });
}

// Create the leaderboard view
function createLeaderboard() {
    // Append top scores
    const lead = document.createElement('div');
    lead.classList.add('border-green');
    lead.innerText = ['LEADERBOARD', ...Object.keys(record).map(name => name + ' - ' + record[name])].join('\n');
    leaderboard.appendChild(lead);
    leaderboard.display = 'block';
}

// Get best score of player
export function setupPlayer(nickname) {
    getPlayerScore(nickname).then(score => {
        record[nickname] = !score ? 0 : score;

        // Init points and record
        points.setAttribute('value', 0);
        points.setAttribute('current', 0);
        points.innerText = 'Points: 0';

        pRecord.id = 'record';
        pRecord.setAttribute('points', record[nickname]);
        pRecord.innerText = `Best Score - ${nickname}: ${record[nickname]}`;
    }, error => {
        console.error(error); // server not found, use local storage to play offline
        console.log('LocalStorage will be used for Record');
        record = JSON.parse(localStorage.getItem("Record"));

        if (!record) {
            record = {};
            record[nickname] = 0;
            localStorage.setItem("Record", JSON.stringify(record));
        }
    });



    leaderboard.style.display = 'block';
}

// Update the Record
export async function updateRecord() {
    const name = playerName.value;
    const currentScore = Number(points.getAttribute('value'));
    if (currentScore > record[name]) {
        record[name] = currentScore;
        pRecord.innerText = `${name}: ${record[name]}`;
        pRecord.setAttribute('points', currentScore);

        // Show that a new record is in place
        const span = document.createElement('span');
        span.id = 'new-record';
        span.classList.add('blink');
        span.innerText = 'New ' + (currentScore > record[Object.keys(record)[0]]  ? 'World' : 'Personal') + ' Record!!!';
        pRecord.after(span);

        return await saveRecord(name, currentScore)
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

    // Update record if needed
    updateRecord().then(
        () => showLeaderboard(),
        error => {  // Use localStorage if the servers is not found
            console.log(error);
            localStorage.setItem("Record", JSON.stringify(record));
            showLeaderboard();
        });
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
                if (extraLife > 0) {    // Update extraLife if have it
                    extraLife--;
                    if (extraLife > 0) {
                        pLife.innerText = `Bonus Life: ${extraLife}`;
                    } else {
                        pLife.style.display = 'none';
                    }
                } else {    // Otherwise die
                    // Add explosion
                    const kaboom = document.createElement('img');
                    kaboom.src = 'assets/ui/explosion.svg';
                    kaboom.height = 50;
                    container.append(kaboom);
                    setTimeout(() => kaboom.remove(), 3000);    // Remove it after 3 secs

                    endGame();
                }
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
        } else if (currentValue === 2) {    // is a heart
            extraLife++;
            pLife.style.display = 'block';
            pLife.innerText = `Bonus Life: ${extraLife}`;
            pLife.classList.add('blink-bg');
            setTimeout(() => pLife.classList.remove('blink-bg'), 2000);
        }
        cell.setAttribute('isBonus', false);
        currentValue = -1;  // Don't add point for bonus
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