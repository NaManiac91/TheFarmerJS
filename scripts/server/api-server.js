import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const port = process.env.PORT || 3000;
const app = express();
app.use(cors()); // Allow requests from your frontend origin
app.use(express.json()); // Parse JSON request bodies

function getLeaderboard() {
    const filePath = path.join('', 'leaderboard.json'); // Construct absolute path
    const fileContent = fs.readFileSync(filePath, 'utf8'); // Read file content as string
    return JSON.parse(fileContent); // Parse the JSON string into a JavaScript object
}

function saveLeaderboard(leaderboard) {
    const filePath = path.join('', 'leaderboard.json'); // Construct absolute path
    console.log(leaderboard);
    fs.writeFileSync(filePath, leaderboard, 'utf8');
}

app.get('/api/leaderboard', async (req, res) =>  {
    try {
        const jsonData = getLeaderboard();

        if (jsonData) {
            console.log('Leaderboard read successfully:', jsonData);

            res.json(jsonData);
        } else {
            res.status(404).json({ message: 'Player not found' });
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.get('/api/leaderboard/:nickname', async (req, res) =>  {
    const { nickname } = req.params;
    try {
        const jsonData = getLeaderboard();

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

app.post('/api/leaderboard/updateRecord', async (req, res) => {
    const { nickname, points } = req.body;
    if (!nickname) {
        return res.status(400).json({ message: 'Player name is required' });
    }

    try {
        const jsonData = getLeaderboard();

        if (jsonData) {
            jsonData[nickname] = points;
        }

        saveLeaderboard(JSON.stringify(jsonData));

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