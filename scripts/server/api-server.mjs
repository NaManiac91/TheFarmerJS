import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {initializeDatabase, getLeaderboard, upsertPlayer, getPlayerByGoogleId} from './mongo-api.mjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';

const app = express();
app.set('trust proxy', 1);

// Allowed only my frontend origin
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN;
const FRONTEND_GAME = process.env.FRONTEND_GAME;

if (!ALLOWED_ORIGIN) {
    console.error(`[${new Date().toISOString()}] [ERROR] FRONTEND_ORIGIN environment variable is not set. CORS will not be properly configured.`);
}

// Setup cors options
const corsOptions = {
    origin: ALLOWED_ORIGIN,
    methods: 'GET,POST', // Specify allowed HTTP methods
    credentials: true, // Allow cookies to be sent
    optionsSuccessStatus: 204 // For pre-flight requests from some browsers
};

app.use(cors(corsOptions)); // Apply the configured CORS middleware
app.use(express.json()); // Parse JSON request bodies

// Limits each IP address to 100 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting to all API requests
app.use(apiLimiter);

// A simple middleware to log requests
app.use((req, res, next) => {
    const now = new Date();
    const timestamp = now.toISOString();
    const logLevel = 'INFO';
    const clientIp = req.ip;
    const method = req.method;
    const url = req.originalUrl;

    const logMessage = `[${timestamp}] [${logLevel}] [${clientIp}] ${method} ${url}`;
    console.log(logMessage);
    next(); // Pass control to the next middleware or route handler
});

// Setup OAuth with Google
// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true } // Set to true in production with HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: ALLOWED_ORIGIN + '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Use the Google ID as the unique identifier
        const googleId = profile.id;

        // Check if the player already exists in your database
        const existingPlayer = await getPlayerByGoogleId(googleId);

        if (existingPlayer) {
            return done(null, existingPlayer);
        } else {
            // Player does not exist, create a new record
            const newPlayer = await upsertPlayer(googleId, profile.displayName, profile.emails[0].value, 0);
            return done(null, newPlayer);
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] Passport Google Strategy error:`, error);
        return done(error, false);
    }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'Not authenticated' });
};

// Routes OAuth
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        console.log(`[${new Date().toISOString()}] [INFO] OAuth callback successful`);
        res.redirect(`${FRONTEND_GAME}?auth=success`);
    }
);

app.get('/auth/check', isAuthenticated, (req, res) => {
    res.json({
        authenticated: true,
        playerName: req.playerName
    });
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect(`${FRONTEND_GAME}?auth=logout`))
});

// GET Api to get top 10 leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        console.log(`[${new Date().toISOString()}] [INFO] Loading leaderboard...`);
        const leaderboardData = await getLeaderboard();

        if (leaderboardData && Object.keys(leaderboardData).length > 0) {
            console.log(`[${new Date().toISOString()}] [INFO] Leaderboard fetched successfully`);

            // Sort by score (descending)
            const sortedEntries = Object.entries(leaderboardData)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);      // Only top 10

            res.json(Object.fromEntries(sortedEntries));
        } else {
            res.status(404).json({error: 'Leaderboard not found'});
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] Error fetching leaderboard:`, error.message);
        res.status(500).json({message: 'Internal Server Error', error: error.message});
    }
});

// GET Api to get the best score for a given @nickname
app.get('/api/leaderboard/:nickname', isAuthenticated, async (req, res) => {
    const {nickname} = req.params;

    if (typeof nickname !== 'string' || nickname.length === 0) {
        return res.status(400).json({ message: 'Invalid player ID.' });
    }

    if (nickname.length < 2 || nickname.length > 20) {
        return res.status(400).json({ message: 'Player name must be between 2 and 20 characters.' });
    }

    try {
        console.log(`[${new Date().toISOString()}] [INFO] Loading player score...`);
        const playerData = await getLeaderboard(nickname);

        if (playerData) {
            console.log(`[${new Date().toISOString()}] [INFO] Player: ${nickname} - ${playerData[nickname]}`);
            return res.json(playerData[nickname]);
        } else {
            res.status(404).json({message: 'Player not found'});
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] Error fetching player:`, error.message);
        res.status(500).json({message: 'Internal Server Error', error: error.message});
    }
});

// POST Api to update the score @nickname with new @points
app.post('/api/updateRecord', isAuthenticated, async (req, res) => {
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
        const googleId = req.user.id;
        await upsertPlayer(googleId, nickname, points);

        console.log(`[${new Date().toISOString()}] [INFO] Record Updated successfully!`);
        res.status(200).json('Record Updated successfully!');
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] Error updating player score:`, error.message);
        res.status(500).json({message: 'Internal Server Error', error: error.message});
    }
});

// Start server
async function startServer() {
    await initializeDatabase();

    const PORT = process.env.PORT || 3333;
    app.listen(PORT, () => {
        console.log(`[${new Date().toISOString()}] [INFO] Server running on port ${PORT}`);
    });
}

startServer().catch(console.error);