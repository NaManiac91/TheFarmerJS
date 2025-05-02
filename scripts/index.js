import {
    action,
    createFarmer,
    initGrid,
    levelUp,
    move,
    createTimer,
    initPoints,
    reloadGrid,
    pause
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
const pauseButton = document.getElementById('pause-button');
const isMobile = window.matchMedia('(max-width: 480px)').matches
    || window.matchMedia('(max-width: 768px)').matches || window.matchMedia('(max-width: 1024px)').matches;
let pauseState = false;

// Add events to the button in the UI
playerName.addEventListener('input', () => {
    saveButton.disabled = !playerName.value;
});

saveButton.addEventListener('click', () => {
    init();

    /* Define the game layout */
    player.remove();
    legend.remove();
    pauseButton.style.display = 'block';
});

restart.addEventListener('click', () => {
    location.reload();
});

pauseButton.addEventListener('click', () => {
    pauseState = pause(pauseButton.firstElementChild);
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
        // Avoid double click or disable action if the game is in pause
        if (e.defaultPrevented || pauseState) return;
        e.preventDefault();

        // Get the current position
        const coordinates = farmer.parentElement.id.split('-');
        let row = Number(coordinates[1]);
        let col = Number(coordinates[2]);

        // Operation allowed: Movement and action
        if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
            move(e.code, row, col, farmer);
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


    /* Pad Logic */
    // Check if is a mobile device
    if (isMobile) {
        document.getElementById('pad').style.display = 'block';
        const upButton = document.getElementById('dpad-up');
        const downButton = document.getElementById('dpad-down');
        const leftButton = document.getElementById('dpad-left');
        const rightButton = document.getElementById('dpad-right');

        // State object to hold the current press state of each button
        const dpadState = {
            up: false,
            down: false,
            left: false,
            right: false,
        };

        // Function to update state and potentially trigger game actions
        function updateDirectionState(direction, isPressed) {
            if (dpadState[direction] !== isPressed) { // Only update if state changed
                dpadState[direction] = isPressed;

                // Move engine
                if (direction && isPressed) {
                    // Get the current position
                    const coordinates = farmer.parentElement.id.split('-');
                    let row = Number(coordinates[1]);
                    let col = Number(coordinates[2]);
                    move(direction, row, col, farmer);
                }
            }
        }

        // Helper to add listeners for both touch and mouse (for easier desktop testing)
        function addListeners(element, direction) {
            // Touch Events
            element.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent scrolling/zooming
                updateDirectionState(direction, true);
            }, {passive: false}); // Need passive: false to call preventDefault

            element.addEventListener('touchend', (e) => {
                e.preventDefault();
                updateDirectionState(direction, false);
            }, {passive: false});

            element.addEventListener('touchcancel', (e) => {
                // Handle cases where touch is interrupted (e.g., alert popup)
                e.preventDefault();
                updateDirectionState(direction, false);
            }, {passive: false});

            // Mouse Events (Optional, for Desktop Testing)
            element.addEventListener('mousedown', (e) => {
                // Check if it was the primary button (left mouse button)
                if (e.button === 0) {
                    updateDirectionState(direction, true);
                }
            });

            element.addEventListener('mouseup', (e) => {
                if (e.button === 0) {
                    updateDirectionState(direction, false);
                }
            });

            // Handle mouse leaving the button area while pressed
            element.addEventListener('mouseleave', (e) => {
                // Check if the primary button is still pressed (buttons property)
                if (e.buttons === 1) {
                    updateDirectionState(direction, false);
                }
            });
        }

        // Assign listeners to each button
        addListeners(upButton, 'ArrowUp');
        addListeners(downButton, 'ArrowDown');
        addListeners(leftButton, 'ArrowLeft');
        addListeners(rightButton, 'ArrowRight');


        // Add listener to action button
        const buttonA = document.getElementById('button-a');
        buttonA.addEventListener('touchstart', (e) => {
            e.preventDefault();

            const coordinates = farmer.parentElement.id.split('-');
            let row = Number(coordinates[1]);
            let col = Number(coordinates[2]);
            farmer.src = 'assets/ui/farmer2.svg';

            action(row, col);
        });

        buttonA.addEventListener('touchend', (e) => {
            e.preventDefault();

            farmer.src = 'assets/ui/farmer.svg';

            // Reload the grid with a new level
            if (Number(points.getAttribute('current')) >= gridScore) {
                levelUp();
                gridScore = reloadGrid();
                farmer.remove();
                farmer = createFarmer();
            }
        });
    }
}