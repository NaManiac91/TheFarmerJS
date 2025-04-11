export function initPoints(points, leaderboard) {
    // Init points and leaderboard
    let record = JSON.parse(localStorage.getItem("Record"));

    if (!record) {
        record = {name: 'Pippo', value: 1};
        localStorage.setItem("Record", JSON.stringify(record));
    }

    points.setAttribute('value', 0);
    points.setAttribute('current', 0);
    points.innerText = 'Points: 0';

    const p = document.createElement('p');
    p.id = 'record';
    p.innerText = `${record.name}: ${record.value}`;
    leaderboard.appendChild(p);
}

function updateRecord() {
    const record = JSON.parse(localStorage.getItem("Record"));
    const currentScore = document.getElementById('points').getAttribute('value');
    if (currentScore > record.value) {
        localStorage.setItem("Record", JSON.stringify({name: 'Pippo', value: Number(currentScore)}));
        document.getElementById('record').innerText = `${record.name}: ${currentScore}`;
    }
}

export function createTimer(timerDisplay) {
    let timeLeft = 60; // seconds

    const countdown = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(countdown);
            updateRecord();     // Update record if needed
        }
    }, 1000); // every 1000ms = 1 second
}

