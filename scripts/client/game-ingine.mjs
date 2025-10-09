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

// Cardinals coordinates used for the monster moves
const CARDINALS = [
    [0, -1],    // North
    [1, 0],     // South
    [0, 1],     // East
    [0, -1],    // West
    [-1, 1],    // Northeast
    [-1, -1],   // Northwest
    [1, 1],     // Southeast
    [1, -1],   // Southwest
]

// Init core items
const points = document.getElementById('points');
const playerName = document.getElementById('player-name');
const container = document.getElementById('container');
const gameOver = document.getElementById('game-over');
const pRecord = document.getElementById('record');
const pauseOverlay = document.getElementById('pause-overlay');
const pLife = document.getElementById('extralife');
const leaderboard = document.getElementById('leaderboard');
const pauseButton = document.getElementById('pause-button');
const shareButton = document.getElementById('share-button');

let hoeLevel = 1;
let gridSize = 4;
let level = 1;
let timeLeft = 30; // seconds
let countdown = null;
let monsterCountdown = null;
let isPaused = false;
let extraLife = 0;
let record = {};
let ratio = 0.5
let hasSound = localStorage.getItem('hasSound') === null ? true : (localStorage.getItem('hasSound') === 'true');
let leaderboardText = 'LEADERBOARD';
let pointsText = 'Points';
let bestScoreText = 'Best score';
let monsterPosition = {row: 3, col: 3};

// Setup language texts
if (navigator.language.startsWith('it')) {
    leaderboardText = 'CLASSIFICA';
    pointsText = 'Punti';
    bestScoreText = 'Miglior punteggio';
}

// Init Sounds
const actionSound = new Audio('assets/audio/pong.wav');
const bonusSound = new Audio('assets/audio/bonus.wav');
const bombSound = new Audio('assets/audio/bomb.wav');
const malusSound = new Audio('assets/audio/malus.wav');
const countdownSound = new Audio('assets/audio/countdown.wav');
const wolfSound = new Audio('assets/audio/wolf-attack.mp3');
const soundtrack = new Audio('assets/audio/EnchantedValley.mp3');

soundtrack.addEventListener('ended', () => {
    playSound(soundtrack);
}, false);

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
                    ratio += 0.01;
                }

                const canBeMalus = checkAngle(grid, i, j);    // check if there is a malus in the "problematic" cells

                if (Math.random() < ratio && canBeMalus) {
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

// Check if the cell contains a malus
function isMalus(grid, row, col) {
    const cell = grid.querySelector('#cell-' + row + '-' + col);
    return cell.classList.contains('isMalus');
}

/* Avoid blocking malus in grid's angles
 * the "problematic" cell is one of the following [1,0 -- 1, gridSize-1 -- gridSize-1, 1 -- gridSize-1, gridSize-2]
 * if there is a malus in the neighbours
 */
function checkAngle(grid, row, col) {
    if (row === 1 && col === 0) {
        return !isMalus(grid, 0, 1);
    } else if (row === 1 && col === gridSize - 1) {
        return !isMalus(grid, 0, gridSize - 2);
    } else if (row === gridSize - 1 && col === 1) {
        return !isMalus(grid, gridSize - 2, 0);
    } else if (row === gridSize - 1 && col === gridSize - 2) {
        return !isMalus(grid, gridSize - 2, gridSize - 1);
    }
    return true;    // the cell is not "problematic"
}

// Handler to manage the leaderboard if the DB is not reachable
function getLeaderboardErrorHandler(error) {
    console.error(error); // server not found, use local storage to play offline
    console.log('LocalStorage will be used for Record');
    record = JSON.parse(localStorage.getItem("Record"));

    if (!record) {
        // Init the record structure in the storage
        record = {};
        record[playerName.value] = 0;
        localStorage.setItem("Record", JSON.stringify(record));
    } else {
        // Sort by scores descending
        const sortedEntries = Object.entries(record).sort((a, b) => b[1] - a[1]);
        record = Object.fromEntries(sortedEntries);
    }
}

// Get the Leaderboard from db or localStorage
export function showLeaderboard() {
    // Update the UI
    document.getElementById('grid').remove();
    gameOver.style.display = 'block';
    shareButton.style.display = 'block';
    pauseButton.style.display = 'none';

    getLeaderboard().then(data => {
        record = data;  // Get leaderboard from db
        createLeaderboard();
    }, error => {
        getLeaderboardErrorHandler(error);
        createLeaderboard();
    });
}

// Create the leaderboard view
function createLeaderboard() {
    // Append top scores
    const lead = document.createElement('div');
    lead.classList.add('border-green');
    appendScores(lead);
    leaderboard.appendChild(lead);
    leaderboard.display = 'block';
}

// Define scores layout
function appendScores(container) {
    container.append(leaderboardText);

    Object.keys(record).forEach((name, index) => {
        let text = name + ' - ' + record[name];
        let span = document.createElement('span');
        let br = document.createElement('br');

        if (index === 0) {
            span.innerText = '🥇' + text;
        } else if (index === 1) {
            span.innerText = '🥈' + text;
        } else if (index === 2) {
            span.innerText = '🥉' + text;
        } else {
            span.innerText = text;
        }
        container.append(br);
        container.append(span);
    });
}

// Get the Leaderboard from db or localStorage and show leaderboard in overlay
export function showLeaderboardOverlay() {
    const leadText = document.getElementById('leaderboard-text');
    getLeaderboard().then(data => {
        record = data;  // Get leaderboard from db
        appendScores(leadText);
    }, error => {
        getLeaderboardErrorHandler(error);
        appendScores(leadText)
    });
}

// Setup player info like best score and nickname
export function setupPlayer(nickname) {
    // Init points and record
    points.setAttribute('value', 0);
    points.setAttribute('current', 0);
    points.innerText = `${pointsText}: 0`;

    // Get player score from server
    getPlayerScore(nickname).then(score => {
        record[nickname] = !score ? 0 : score;  // update player score

        pRecord.setAttribute('points', record[nickname]);
        pRecord.innerText = `${bestScoreText} - ${nickname}: ${record[nickname]}`;
    }, error => {
        console.error(error); // server not found, use local storage to play offline
        console.log('LocalStorage will be used for Record');
        record = JSON.parse(localStorage.getItem("Record"));

        // Init or update local storage with player data
        if (!record) {
            record = {};
        }

        if (!record[nickname]) {
            record[nickname] = 0;
            localStorage.setItem("Record", JSON.stringify(record));
        }

        pRecord.setAttribute('points', record[nickname]);
        pRecord.innerText = `${bestScoreText} - ${nickname}: ${record[nickname]}`;
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
        span.innerText = 'New ' + (currentScore > record[Object.keys(record)[0]] ? 'World' : 'Personal') + ' Record!!!';
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
                playSound(countdownSound);
                soundtrack.pause();
            } else {
                countdownSound.pause();
                playSound(soundtrack, true);
                timerDisplay.classList.remove('blink-bg');
            }

            if (timeLeft <= 0) {
                timerDisplay.style.display = 'none';
                countdownSound.pause();
                playSound(soundtrack, true);
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

/* Check if the farmer is dead or if there are extralife yet
 * the monster parameter is true if the monster reaches the farmer
 */
function checkIfDead(newPosition, monster) {
    if (extraLife > 0) {    // Update extraLife if have it
        playSound(malusSound);  // play malus sound

        extraLife--;
        if (extraLife > 0) {
            pLife.innerText = `Bonus Life: ${extraLife}`;
        } else {
            pLife.style.display = 'none';
        }

        if (newPosition.classList.contains('monster')) {
            document.getElementById('monster').remove();
        }
    } else {    // Otherwise die
        const isMonster = monster ? monster : newPosition.classList.contains('monster');

        playSound(isMonster ? wolfSound : bombSound);  // play bomb or wolf sound

        // Add explosion
        const kaboom = document.createElement('img');
        kaboom.src = 'assets/ui/' + (isMonster ? 'wolf.png' : 'explosion.svg');
        kaboom.height = 50;
        container.append(kaboom);
        setTimeout(() => kaboom.remove(), 3000);    // Remove it after 3 secs

        endGame();
    }
}

// Define the movement
export function move(keyCode, row, col, farmer) {
    const currentPosition = document.getElementById('cell-' + row + '-' + col);
    if (currentPosition && currentPosition.children.length > 0) {
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
            if (newPosition.hasAttribute('isMalus') || newPosition.classList.contains('monster')) {
                checkIfDead(newPosition);
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
    timeLeft += time;     // add extra seconds to the timer

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
    playSound(actionSound); // play action sound

    // Get the current cell info
    const cell = document.getElementById('cell-' + row + '-' + col);
    let currentValue = Number(cell.getAttribute('value'));

    // Check if the cell contains a bonus or an object
    if (cell.hasAttribute('isBonus')) {
        playSound(bonusSound); // play bonus sound

        if (currentValue === 0) {    // is a +10s
            addTime(10);    // add 10 extra seconds to the timer
        } else if (currentValue === 1) {    // is a gold dig, take all remaining points on the grid and levelup
            const gridScore = Number(document.getElementById('grid').getAttribute('points'));
            const currentScore = Number(document.getElementById('points').getAttribute('current'));
            const newPoints = Number(points.getAttribute('value')) + (gridScore - currentScore);
            points.setAttribute('current', gridScore);
            points.setAttribute('value', newPoints);
            points.innerText = `${pointsText}: ${newPoints}`;
            return;
        } else if (currentValue === 2) {    // is a heart, get an extralife and show it in a dedicated space
            extraLife++;
            pLife.style.display = 'block';
            pLife.innerText = `Bonus Life: ${extraLife}`;
            pLife.classList.add('blink-bg');
            setTimeout(() => pLife.classList.remove('blink-bg'), 2000);
        }
        cell.removeAttribute('isBonus');
        currentValue = -1;  // Don't add point for bonus
    }

    // Update the points
    if (currentValue >= 0) {
        currentValue = currentValue - hoeLevel;
        const value = Number(points.getAttribute('value')) + hoeLevel;
        const current = Number(points.getAttribute('current')) + hoeLevel;
        points.setAttribute('value', value);
        points.setAttribute('current', current);
        points.innerText = `${pointsText}: ${value}`;
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

// Create the farmer ui element and return it
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
    } else {
        clearInterval(monsterCountdown);
        showMonster();
    }
    level++;            // update the level
    addTime(30);     // add 30 extra seconds to the timer
}

// Reload the grid (used after a levelUp) and return it
export function reloadGrid() {
    points.setAttribute('current', 0);
    container.removeChild(container.firstChild);
    return initGrid();
}

// Pause game and return the state
export function togglePause() {
    isPaused = !isPaused;

    if (isPaused) {
        pauseOverlay.classList.add('active');
    } else {
        pauseOverlay.classList.remove('active');
    }
    return isPaused;
}

// Generate a random player name
export function generateRandomPlayerName() {
    const adjectives = [
        "Swift", "Brave", "Mighty", "Tough", "Quick", "Clever", "Fierce", "Silent", "Noble", "Lucky",
        "Shadow", "Crimson", "Golden", "Iron", "Steel", "Whisper", "Starlight", "Thunder", "Blaze", "Frost"
    ];

    const nouns = [
        "Warrior", "Hunter", "Knight", "Rogue", "Mage", "Archer", "Guardian", "Warden", "Paladin", "Scout",
        "Dragon", "Wolf", "Hawk", "Lion", "Bear", "Phoenix", "Viper", "Griffin", "Tiger", "Panther"
    ];

    const suffixes = [
        "", // No suffix
        "XV", "XX", "III", "IV", "V", // Roman numerals
        "99", "77", "07", "21", "88", // Numbers
        "Plays", "Gaming", "King", "Queen", "Lord", "Master", "Hero", "Legend" // Gaming-related
    ];

    // Randomly select an adjective, noun and suffix
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    // Combine them to form the name
    let playerName = `${randomAdjective}${randomNoun}`;

    // Add suffix if one was chosen
    if (randomSuffix) {
        // A small chance to add a space before the suffix for readability
        if (Math.random() < 0.3) { // 30% chance of a space
            playerName += ` ${randomSuffix}`;
        } else {
            playerName += randomSuffix;
        }
    }

    return playerName;
}

// Play a given sound
function playSound(sound, isSoundtrack) {
    if (!isSoundtrack) {
        sound.currentTime = 0; // Reset to start
    }

    if (hasSound) {
        sound.play()
            .then(() => {
                // Playback started successfully
                console.debug('Sound played successfully');
            })
            .catch((error) => {
                // Playback failed
                console.log('Failed to play sound:', error);
            });
    }
}

// Toggle the sound (mute/unmute)
export function toggleSound(button, init) {
    if (!init) {
        hasSound = !hasSound;
        localStorage.setItem('hasSound', hasSound);
    }
    button.src = hasSound ? 'assets/ui/volume-up.svg' : 'assets/ui/volume-mute.svg';

    if (hasSound) {
        playSound(soundtrack);
    } else {
        soundtrack.pause();
    }
}

// Manage the sound in pause state
export function toggleSoundtrack(pause) {
    if (pause) {
        soundtrack.pause();
        countdownSound.pause();
    } else {
        playSound(soundtrack);
    }
}

// MONSTER
// Create the monster ui element and return it
function createMonster() {
    if (document.getElementById('monster')) {
        return document.getElementById('monster');
    } else {
        const monster = document.createElement('img');
        monster.id = 'monster';
        monster.src = 'assets/ui/wolf.png';
        monster.width = 25;
        monster.height = 25;
        monsterPosition = {row: gridSize - 1, col: gridSize - 1};
        return monster;
    }
}

// Show the monster on the grid and init is movement
function showMonster() {
    const wolf = createMonster();
    monsterCountdown = setInterval(() => {
        let newPosition = moveMonster(monsterPosition.row, monsterPosition.col, gridSize - 1);
        let isChanged = newPosition.row !== monsterPosition.row || newPosition.col !== monsterPosition.col;

        let position = document.getElementById('cell-' + monsterPosition.row + '-' + monsterPosition.col);
        if (position && position.children.length > 0 && isChanged) {
            position.firstElementChild.style.display = 'block';
            position.classList.remove('monster');
        }

        monsterPosition.row = newPosition.row;
        monsterPosition.col = newPosition.col;

        position = document.getElementById('cell-' + newPosition.row + '-' + newPosition.col);
        if (position && position.children.length > 0 && isChanged) {
            if (position.children.item(1) && position.children.item(1).id === 'farmer') {
                checkIfDead(position, true);
            }

            position.firstElementChild.style.display = 'none';
            position.appendChild(wolf);
            position.classList.add('monster');
        }
    }, 2000); // every 2000ms = 2 second
}

/* The monster's movement logic: it can go randomly in the next 1 cell in all the direction.
 * if the new position is outside the grid, the monster will stay in the current position.
 * return the new X,Y coordinates for the monster
 */
function moveMonster(x, y, gridSize) {
    const random = Math.floor(Math.random() * 7);
    const point = CARDINALS[random];

    const xo = x + point[0];
    const yo = y + point[1];
    const row = xo >= gridSize || xo < 0 ? x : xo;
    const col = yo >= gridSize || yo < 0 ? y : yo;
    return {row, col};
}