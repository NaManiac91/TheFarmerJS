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
    } else if (response.status === 401) {
        console.log('Unauthorized - redirecting to login');
        throw new Error(`HTTP error! status 401: ${response.statusMessage}`);
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
    } else if (response.status === 401) {
        console.log('Unauthorized - redirecting to login');
        throw new Error(`HTTP error! status 401: ${response.status}`);
    }
}

// Save the new @points for the @nickname
export async function saveRecord(nickname, points) {
    // Try to get the leaderboard via the backend API
    const response = await fetch(API_BASE_URL + `/api/updateRecord`, {
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
    } else if (response.status === 401) {
        console.log('Unauthorized - redirecting to login');
        throw new Error(`HTTP error! status 401: ${response.status}`);
    }
}

// Auth with Google
export function auth() {
    window.location.href = API_BASE_URL + '/auth/google';
}

// Check is the user is already authenticated and return the player name if it is
export async function checkAuth() {
    const response = await fetch(API_BASE_URL + '/auth/check', {
        credentials: 'include'
    });

    if (response.ok) {
        const playerData = await response.json();
        if (playerData.authenticated) {
            console.log(`Player: ${playerData.playerName} - Authenticated`);
            return playerData.playerName;
        } else {
            console.log('Unauthorized - redirecting to login');
            throw new Error(`HTTP error! status 401: ${response.status}`);
        }
    } else if (response.status === 401) {
        console.log('Unauthorized - redirecting to login');
        throw new Error(`HTTP error! status 401: ${response.status}`);
    }
}