import express from 'express';
import cors from 'cors';
import path from 'path';
import { readFile, writeFile } from 'node:fs/promises';

const port = process.env.PORT || 3000;
const app = express();
app.use(cors()); // Allow requests from your frontend origin
app.use(express.json()); // Parse JSON request bodies


// Get the leaderboard from file
async function getLeaderboard() {
    const filePath = path.join(process.cwd(), 'leaderboard.json');
    const fileContent = await readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
}

// Write the file leaderboard
async function saveLeaderboard(leaderboard) {
    const filePath = path.join('', 'leaderboard.json');
    return await writeFile(filePath, leaderboard, 'utf8');
}

// GET Api to get leaderboard
app.get('/api/leaderboard', async (req, res) =>  {
    try {
        const leaderboardData = await getLeaderboard();

        if (leaderboardData) {
            console.log('Leaderboard fetched successfully');

            // Sort by score (descending)
            const sortedEntries = Object.entries(leaderboardData)
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
        const jsonData = await getLeaderboard();

        if (jsonData && jsonData[nickname]) {
            console.log(nickname + ' Data read successfully:', jsonData[nickname]);

            res.json(jsonData[nickname]);
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
        const jsonData = await getLeaderboard();

        if (jsonData) {
            jsonData[nickname] = points;
        }

        await saveLeaderboard(JSON.stringify(jsonData));

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