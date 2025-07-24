import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {initializeDatabase, getLeaderboard, upsertPlayer} from './mongo-api.mjs';

const app = express();
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN;

console.log('FRONTEND_ORIGIN: ' + ALLOWED_ORIGIN);

if (!ALLOWED_ORIGIN) {
    console.error('FATAL ERROR: FRONTEND_ORIGIN environment variable is not set. CORS will not be properly configured.');
}

const corsOptions = {
    origin: ALLOWED_ORIGIN,
    methods: 'GET,POST', // Specify allowed HTTP methods
    credentials: true, // Allow cookies to be sent (if you plan to use them for auth later)
    optionsSuccessStatus: 204 // For pre-flight requests from some browsers
};

app.use(cors(corsOptions)); // Apply the configured CORS middleware
app.use(express.json()); // Parse JSON request bodies

// Limits each IP address to 100 requests per 15 minutes.
// Adjust these values based on your game's expected traffic and API usage.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting to all API requests
app.use(apiLimiter);

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

    if (typeof nickname !== 'string' || nickname.length === 0) {
        return res.status(400).json({ message: 'Invalid player ID.' });
    }

    if (nickname.length < 2 || nickname.length > 20) {
        return res.status(400).json({ message: 'Player name must be between 2 and 20 characters.' });
    }

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

    if (typeof nickname !== 'string' || nickname.length === 0) {
        return res.status(400).json({ message: 'Invalid player ID.' });
    }

    if (nickname.length < 2 || nickname.length > 20) {
        return res.status(400).json({ message: 'Player name must be between 2 and 20 characters.' });
    }

    if (typeof points !== 'number' || points < 0) {
        return res.status(400).json({ message: 'Score must be a non-negative number.' });
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

    const PORT = process.env.PORT || 3333;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer().catch(console.error);