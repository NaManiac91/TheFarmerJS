const API_BASE_URL = 'http://localhost:5002'; // Your Node.js server address

export async function getLeaderboard() {
    const response = await fetch(API_BASE_URL + `/api/leaderboard`);

    if (response.ok) {
        const playerData = await response.json();
        console.log('Leaderboard fetched:', playerData);
        return playerData;
    } else if (response.status === 404) {
        console.error('Leaderboard not found');
    }
}

export async function getPlayerScore(nickname) {
    const response = await fetch(API_BASE_URL + `/api/leaderboard/${nickname}`);

    if (response.ok) {
        const playerData = await response.json();
        console.log(`Player: ${nickname} - ${playerData}`);
        return playerData;
    } else if (response.status === 404) {
        console.error('Player not found');
    }
}

export async function saveRecord(nickname, points) {
    // Try to get the leaderboard via the backend API
    const response = await fetch(API_BASE_URL + `/api/leaderboard/updateRecord`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // Or the appropriate content type for your API
        },
        body: JSON.stringify({nickname: nickname, points: points}), // Convert your JavaScript object to a JSON string
    });

    if (response.ok) {
        const playerData = await response.json();
        console.log('Leaderboard fetched:', playerData);
        return playerData;
    } else if (response.status === 404) {
        console.error('Leaderboard not found');
    }
}