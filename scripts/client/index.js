import {
    action,
    createFarmer,
    initGrid,
    levelUp,
    move,
    createTimer,
    reloadGrid,
    togglePause,
    setupPlayer,
    generateRandomPlayerName,
    toggleSound,
    showLeaderboardOverlay,
    toggleSoundtrack
} from "./game-ingine.mjs";

// Init service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('scripts/client/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}

// Init core items
const header = document.getElementById('header');
const footer = document.getElementById('footer');
const player = document.getElementById('player');
const legend = document.getElementById('legend');
const startButton = document.getElementById('start-button');
const playerName = document.getElementById('player-name');
const pRecord = document.getElementById('record');
const restart = document.getElementsByClassName('restart');
const pauseButton = document.getElementById('pause-button');
const soundButton = document.getElementById('sound-button');
const clearButton = document.getElementById('clear-button');
const shareButton = document.getElementById('share-button');
const resumeButton = document.getElementById('resume-button');
const creditsButton = document.getElementById('credits-button');
const leaderboardButton = document.getElementById('leaderboard-button');
const leaderboardResumeButton = document.getElementById('leaderboard-resume-button');
const leaderboardOverlay = document.getElementById('leaderboard-overlay');
const creditsText = document.getElementById('credits-text');
const legendButton = document.getElementById('legend-button');
const legendItems = document.getElementById('legend-items');
const guidelines = document.getElementById('guidelines');
let pauseState = false;

/* Init values from localStorage */
// Player Name
const nickname = localStorage.getItem('playerName');
playerName.value = nickname ? nickname : generateRandomPlayerName();
startButton.disabled = false;

/* Init the sound state */
toggleSound(soundButton.firstElementChild, true);

// App went to background - pause/stop music
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        toggleSoundtrack(true);

        if (!pauseState) {
            pauseState = togglePause();
        }
    } else {
        toggleSoundtrack();
    }
});

/* Add events to the buttons in the UI */
playerName.addEventListener('input', () => {
    startButton.disabled = !playerName.value;

    if (!nickname || playerName.value !== nickname) {
        localStorage.setItem('playerName', playerName.value);
    }
});

startButton.addEventListener('click', () => {
    init();

    /* Define the game layout */
    player.remove();
    legend.remove();
    clearButton.remove();
    header.width = 'none';
    footer.width = '100%';
    pauseButton.classList.toggle('hidden');
    guidelines.classList.toggle('hidden');
    leaderboardButton.classList.toggle('hidden');
});

clearButton.addEventListener('click', () => {
    playerName.value = '';
    playerName.disabled = false;
    focus();
    startButton.disabled = true;
});

for (let button of restart) {
    button.addEventListener('click', () => {
        location.reload();
    });
}

creditsButton.addEventListener('click', () => {
    creditsText.classList.toggle('hidden');
});

leaderboardButton.addEventListener('click', () => {
    leaderboardButton.classList.toggle('hidden');
    leaderboardOverlay.classList.add('active');
    document.getElementById('leaderboard-text').innerText = '';
    showLeaderboardOverlay();
});

pauseButton.addEventListener('click', () => {
    pauseState = togglePause();
});

resumeButton.addEventListener('click', () => {
    pauseState = togglePause();
});

leaderboardResumeButton.addEventListener('click', () => {
    leaderboardOverlay.classList.remove('active');
    leaderboardButton.classList.toggle('hidden');
});

soundButton.addEventListener('click', () => {
    toggleSound(soundButton.firstElementChild);
});

shareButton.addEventListener('click', () => {
    // Copy the record in the clipboard
    navigator.clipboard.writeText([pRecord.innerText, 'Download The Farmer -> https://play.google.com/store/apps/details?id=org.namaniac91.twa'].join('\n'))
        .then(() => {
            window.alert('Record copied, share it with your friends!!!');
            console.log('Copied to clipboard')
        })
        .catch((error) => console.log('Copied to clipboard failed: ', error));
});

legendButton.addEventListener('click', () => {
    legendItems.classList.toggle('hidden');
    guidelines.classList.toggle('hidden');
});

/* Setup text languages */
const texts = navigator.language.startsWith('it') ? document.getElementsByClassName('eng') : document.getElementsByClassName('it');
for (let text of texts) {
    text.classList.add('hidden');
}

/* Let's go with the game */
function init() {
    const timer = document.getElementById('timer');
    const points = document.getElementById('points');

// Init points and leaderboard
    setupPlayer(playerName.value);

// Init timer
    createTimer(timer);

// Init grid
    let gridScore = initGrid();

// Init farmer position
    let farmer = createFarmer();

/* Init events for the game engine */
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

    // Init Pad
    document.getElementById('pad').classList.toggle('hidden');
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
        if (!pauseState && dpadState[direction] !== isPressed) { // Only update if state changed
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
        if (!pauseState) {
            const coordinates = farmer.parentElement.id.split('-');
            let row = Number(coordinates[1]);
            let col = Number(coordinates[2]);
            farmer.src = 'assets/ui/farmer2.svg';

            action(row, col);
        }
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