import express from 'express';
import cors from 'cors';
import path from 'path';
import { readFile } from 'node:fs/promises';
import admin from 'firebase-admin';

const port = process.env.PORT || 5002;
const app = express();
app.use(cors()); // Allow requests from your frontend origin
app.use(express.json()); // Parse JSON request bodies

// Initialize Firebase
const filePath = path.join(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = await readFile(filePath, 'utf8');

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
    databaseURL: "https://thefarmer-d8d99-default-rtdb.europe-west1.firebasedatabase.app"
});

// Get the leaderboard from db
async function getLeaderboard(nickname) {
    const db = admin.database();
    const ref = db.ref('players' + (nickname ? '/' + nickname : ''));
    return await ref.once('value');
}

// Insert or update player score
async function upsertPlayer(playerName, score) {
    const db = admin.database();
    const playersRef = db.ref('players');

    try {
        await playersRef.update({
            [playerName]: score
        });
        console.log(`Player: ${playerName} set to ${score}`);
    } catch (error) {
        console.error('Error updating player:', error);
    }
}

// GET Api to get leaderboard
app.get('/api/leaderboard', async (req, res) =>  {
    try {
        console.log('Loading leaderboard...');
        const leaderboardData = await getLeaderboard();

        if (leaderboardData.exists()) {
            console.log('Leaderboard fetched successfully');

            // Sort by score (descending)
            const sortedEntries = Object.entries(leaderboardData.val())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);      // Only top 10

            res.json( Object.fromEntries(sortedEntries));
        } else {
            res.status(404).json({ error: 'Leaderboard not found' });
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error.message);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Leaderboard file does not exist' });
        } else {
            res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    }
});

// GET Api to get the best score for a given @nickname
app.get('/api/leaderboard/:nickname', async (req, res) =>  {
    const { nickname } = req.params;
    try {
        console.log('Loading player score...');
        const playerData = await getLeaderboard(nickname);

        if (playerData.exists()) {
            console.log(`Player: ${nickname} - ${playerData.val()}`);
            return res.json(playerData.val());
        } else {
            res.status(404).json({ message: 'Player not found' });
        }
    } catch (error) {
        console.error('Error fetching player:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// POST Api to get update the score @nickname with new @points
app.post('/api/leaderboard/updateRecord', async (req, res) => {
    const { nickname, points } = req.body;
    if (!nickname) {
        return res.status(400).json({ message: 'Player name is required' });
    }

    try {
        await upsertPlayer(nickname, points);

        console.log('Record Updated successfully!');
        res.status(200).json('Record Updated successfully!');
    } catch (error) {
        console.error('Error creating player:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Node.js backend server listening on port ${port}`);
});