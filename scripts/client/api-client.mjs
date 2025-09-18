const API_BASE_URL = 'http://localhost:5002'; // Your Node.js server address

// Get leaderboard
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

// Get the @nickname score
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

// Save the new @points for the @nickname
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
        console.log('Record Updated successfully!');
        return await response.json();
    } else if (response.status === 404) {
        console.error('Something go wrong with the update');
    }
}

// Auth with Google
export function auth(nickname) {
    window.location.href = API_BASE_URL + '/auth/google';
}