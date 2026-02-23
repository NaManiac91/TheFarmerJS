import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {initializeDatabase, getLeaderboard, upsertPlayer, getPlayerByGoogleId} from './mongo-api.mjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import cookieParser from "cookie-parser";

const requiredEnvVars = [
    'FRONTEND_ORIGIN',
    'FRONTEND_GAME',
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter((envKey) => !process.env[envKey]);
if (missingEnvVars.length > 0) {
    throw new Error(
        `[${new Date().toISOString()}] [ERROR] Missing required env vars: ${missingEnvVars.join(', ')}`
    );
}

const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN.trim();
const FRONTEND_GAME = process.env.FRONTEND_GAME.trim();
const OAUTH_CALLBACK_URL = (process.env.OAUTH_CALLBACK_URL || `${ALLOWED_ORIGIN}/auth/google/callback`).trim();

const trustedProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? '1', 10);
if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 0) {
    throw new Error(`[${new Date().toISOString()}] [ERROR] TRUST_PROXY_HOPS must be a non-negative integer.`);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', trustedProxyHops);

const allowedOrigins = new Set([
    ALLOWED_ORIGIN,
    ...(process.env.EXTRA_ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
]);

// Setup cors options
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true, // Allow cookies to be sent
    optionsSuccessStatus: 204 // For pre-flight requests from some browsers
};

app.use(cors(corsOptions)); // Apply the configured CORS middleware
app.use(express.json({ limit: '10kb' })); // Parse JSON request bodies
app.use(cookieParser()); // Parse the cookie

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    next();
});

// Setup OAuth with Google
// Session configuration
const sessionCookieSameSite = (process.env.SESSION_COOKIE_SAMESITE || 'lax').toLowerCase();
if (!['lax', 'strict', 'none'].includes(sessionCookieSameSite)) {
    throw new Error(`[${new Date().toISOString()}] [ERROR] SESSION_COOKIE_SAMESITE must be one of: lax, strict, none.`);
}

const isProduction = process.env.NODE_ENV === 'production';
const useSecureCookies = sessionCookieSameSite === 'none' ? true : isProduction;

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'farmer.sid', // Give it a specific name
    cookie: {
        secure: useSecureCookies,
        httpOnly: true,
        sameSite: sessionCookieSameSite,
        maxAge: 24 * 60 * 60 * 1000,
        path: '/'
    },
    proxy: true // Important since you have trust proxy enabled
}));

app.use(passport.initialize());
app.use(passport.session());

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
    const timestamp = new Date().toISOString();
    const logLevel = 'INFO';
    const clientIp = req.ip;
    const method = req.method;
    const url = req.originalUrl;

    const isAuth = req.isAuthenticated() ? 'YES' : 'NO';
    const userName = req.user ? req.user.playerName : 'Anonymous';

    const logMessage = `[${timestamp}] [${logLevel}] [${clientIp}] ${method} ${url} | Auth: ${isAuth} | User: ${userName}`;
    console.log(logMessage);
    next(); // Pass control to the next middleware or route handler
});

// Passport configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: OAUTH_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Use the Google ID as the unique identifier
        const googleId = profile.id;
        const playerEmail = profile.emails?.[0]?.value ?? '';

        // Check if the player already exists in your database
        const existingPlayer = await getPlayerByGoogleId(googleId);

        if (existingPlayer) {
            return done(null, existingPlayer);
        } else {
            // Player does not exist, create a new record
            const newPlayer = await upsertPlayer(googleId, profile.displayName, playerEmail, 0);
            return done(null, newPlayer);
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] Passport Google Strategy error:`, error);
        return done(error, false);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.googleId);
});

passport.deserializeUser(async (googleId, done) => {
    try {
        const user = await getPlayerByGoogleId(googleId);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'Not authenticated' });
};

const nicknamePattern = /^[\p{L}\p{N}_ -]{2,20}$/u;
const MAX_ALLOWED_SCORE = 1000000;

function isTrustedRequestOrigin(req) {
    const origin = req.get('origin');
    if (origin) {
        return allowedOrigins.has(origin);
    }

    const referer = req.get('referer');
    if (!referer) {
        return false;
    }

    try {
        const refererOrigin = new URL(referer).origin;
        return allowedOrigins.has(refererOrigin);
    } catch {
        return false;
    }
}

function requireTrustedOrigin(req, res, next) {
    if (isTrustedRequestOrigin(req)) {
        next();
        return;
    }
    res.status(403).json({ error: 'Invalid origin' });
}

// Routes OAuth
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: FRONTEND_GAME }),
    (req, res) => {
        console.log(`[${new Date().toISOString()}] [INFO] OAuth callback successful`);

        // Save the session before redirecting
        req.session.save((err) => {
            if (err) {
                console.error(`[${new Date().toISOString()}] [ERROR] Session save error:`, err);
                return res.redirect(`${FRONTEND_GAME}?auth=failed`);
            }
            console.log(`[${new Date().toISOString()}] [INFO] Session saved, redirecting...`);
            res.redirect(`${FRONTEND_GAME}?auth=success`);
        });
    }
);

app.get('/auth/check', isAuthenticated, (req, res) => {
    res.json({
        authenticated: true,
        playerName: req.user.playerName
    });
});

app.post('/logout', isAuthenticated, requireTrustedOrigin, (req, res) => {
    req.logout((logoutError) => {
        if (logoutError) {
            console.error(`[${new Date().toISOString()}] [ERROR] Logout error:`, logoutError.message);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        req.session.destroy((sessionError) => {
            if (sessionError) {
                console.error(`[${new Date().toISOString()}] [ERROR] Session destroy error:`, sessionError.message);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            res.clearCookie('farmer.sid', {
                path: '/',
                httpOnly: true,
                secure: useSecureCookies,
                sameSite: sessionCookieSameSite
            });
            return res.redirect(`${FRONTEND_GAME}?auth=logout`);
        });
    });
});

app.get('/logout', (req, res) => {
    res.status(405).json({ error: 'Use POST /logout' });
});

// GET Api to get top 10 leaderboard
app.get('/api/leaderboard', isAuthenticated, async (req, res) => {
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

    if (typeof nickname !== 'string') {
        return res.status(400).json({ message: 'Invalid player ID.' });
    }

    if (!nicknamePattern.test(nickname)) {
        return res.status(400).json({ message: 'Player name must be 2-20 characters and contain only letters, numbers, spaces, "_" or "-".' });
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
app.post('/api/updateRecord', isAuthenticated, requireTrustedOrigin, async (req, res) => {
    const {nickname, points} = req.body;
    if (!nickname) {
        return res.status(400).json({message: 'Player name is required'});
    }

    if (typeof nickname !== 'string') {
        return res.status(400).json({ message: 'Invalid player ID.' });
    }

    if (!nicknamePattern.test(nickname)) {
        return res.status(400).json({ message: 'Player name must be 2-20 characters and contain only letters, numbers, spaces, "_" or "-".' });
    }

    if (!Number.isInteger(points) || points < 0 || points > MAX_ALLOWED_SCORE) {
        return res.status(400).json({ message: `Score must be an integer between 0 and ${MAX_ALLOWED_SCORE}.` });
    }

    try {
        const googleId = req.user.googleId;
        const email = req.user.email;
        await upsertPlayer(googleId, nickname, email, points);

        console.log(`[${new Date().toISOString()}] [INFO] Record Updated successfully!`);
        res.status(200).json('Record Updated successfully!');
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] Error updating player score:`, error.message);
        res.status(500).json({message: 'Internal Server Error', error: error.message});
    }
});

app.use((error, req, res, next) => {
    // Keep Express error-handler signature (4 args) and mark next as intentionally unused.
    void next;

    if (error.message === 'Origin not allowed by CORS') {
        return res.status(403).json({ error: 'Origin not allowed' });
    }

    console.error(`[${new Date().toISOString()}] [ERROR] Unhandled error:`, error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
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
