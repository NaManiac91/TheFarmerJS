import {
    action,
    createFarmer,
    initGrid,
    levelUp,
    move,
    createTimer,
    initPoints,
    reloadGrid
} from "./game-ingine.mjs";

// Init core items
const player = document.getElementById('player');
const saveButton = document.getElementById('player-button');
const playerName = document.getElementById('player-name');
const restart = document.getElementById('restart');

// Add events to the button in the UI
playerName.addEventListener('input', () => {
    saveButton.disabled = !playerName.value;
});

saveButton.addEventListener('click', () => {
    init();
    player.remove();
});

restart.addEventListener('click', () => {
    location.reload();
});

// Let's go with the game
function init() {
    const timer = document.getElementById('timer');
    const points = document.getElementById('points');

// Init points and leaderboard
    initPoints();

// Init timer
    createTimer(timer);

// Init grid
    let gridScore = initGrid();

// Init farmer position
    let farmer = createFarmer(document.getElementById('grid'));

// Init events for the game engine
    document.addEventListener('keydown', (e) => {
        // Avoid double click
        if (e.defaultPrevented) return;
        e.preventDefault();

        // Get the current position
        const coordinates = farmer.parentElement.className.split('-');
        let row = Number(coordinates[1]);
        let col = Number(coordinates[2]);

        // Operation allowed: Movement and action
        if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
            move(e, row, col, farmer);
        } else if (e.code === 'Space') {
            farmer.src = 'assets/farmer2.svg';
            action(row, col);
        }
    });

    document.addEventListener('keyup', (e) => {
        e.preventDefault();

        // If we have an action check the state of the game
        if (e.code === 'Space') {
            farmer.src = 'assets/farmer.svg';

            // Reload the grid with a new level
            if (Number(points.getAttribute('current')) >= gridScore) {
                levelUp();
                gridScore = reloadGrid();
                farmer.remove();
                farmer = createFarmer(document.getElementById('grid'));
            }
        }
    });
}