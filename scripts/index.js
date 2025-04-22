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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/scripts/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}

// Init core items
const player = document.getElementById('player');
const legend = document.getElementById('legend');
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
    legend.remove();
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
    let farmer = createFarmer();

// Init events for the game engine
    document.addEventListener('keydown', (e) => {
        // Avoid double click
        if (e.defaultPrevented) return;
        e.preventDefault();

        // Get the current position
        const coordinates = farmer.parentElement.id.split('-');
        let row = Number(coordinates[1]);
        let col = Number(coordinates[2]);

        // Operation allowed: Movement and action
        if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
            move(e, row, col, farmer);
        } else if (e.code === 'Space') {
            farmer.src = 'assets/ui/farmer2.svg';
            action(row, col);
        }
    });

    document.addEventListener('keyup', (e) => {
        e.preventDefault();

        // If we have an action check the state of the game
        if (e.code === 'Space') {
            farmer.src = 'assets/ui/farmer.svg';

            // Reload the grid with a new level
            if (Number(points.getAttribute('current')) >= gridScore) {
                levelUp();
                gridScore = reloadGrid();
                farmer.remove();
                farmer = createFarmer();
            }
        }
    });
}