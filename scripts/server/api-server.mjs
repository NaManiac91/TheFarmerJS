import express from 'express';
import cors from 'cors';
import {initializeDatabase, getLeaderboard, upsertPlayer} from './mongo-api.mjs';

const app = express();
app.use(cors()); // Allow requests from your frontend origin
app.use(express.json()); // Parse JSON request bodies

// GET Api to get top 10 leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        console.log('Loading leaderboard...');
        const leaderboardData = await getLeaderboard();

        if (leaderboardData && Object.keys(leaderboardData).length > 0) {
            console.log('Leaderboard fetched successfully');

            // Sort by score (descending)
            const sortedEntries = Object.entries(leaderboardData)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);      // Only top 10

            res.json(Object.fromEntries(sortedEntries));
        } else {
            res.status(404).json({error: 'Leaderboard not found'});
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error.message);
        res.status(500).json({message: 'Internal Server Error', error: error.message});
    }
});

// GET Api to get the best score for a given @nickname
app.get('/api/leaderboard/:nickname', async (req, res) => {
    const {nickname} = req.params;
    try {
        console.log('Loading player score...');
        const playerData = await getLeaderboard(nickname);

        if (playerData) {
            console.log(`Player: ${nickname} - ${playerData[nickname]}`);
            return res.json(playerData[nickname]);
        } else {
            res.status(404).json({message: 'Player not found'});
        }
    } catch (error) {
        console.error('Error fetching player:', error.message);
        res.status(500).json({message: 'Internal Server Error', error: error.message});
    }
});

// POST Api to update the score @nickname with new @points
app.post('/api/leaderboard/updateRecord', async (req, res) => {
    const {nickname, points} = req.body;
    if (!nickname) {
        return res.status(400).json({message: 'Player name is required'});
    }

    try {
        await upsertPlayer(nickname, points);

        console.log('Record Updated successfully!');
        res.status(200).json('Record Updated successfully!');
    } catch (error) {
        console.error('Error updating player score:', error.message);
        res.status(500).json({message: 'Internal Server Error', error: error.message});
    }
});

// Start server
async function startServer() {
    await initializeDatabase();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer().catch(console.error);