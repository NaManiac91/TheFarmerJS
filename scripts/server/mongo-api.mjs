import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Connection URL - adjust for your MongoDB setup
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:00000';
const DB_NAME = process.env.MONGODB_DB_NAME || 'leaderboard';

let db;

// Initialize MongoDB connection
export async function initializeDatabase() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('Connected to MongoDB successfully');

        // Create indexes for better performance
        await db.collection('players').createIndex({ score: -1 });
        await db.collection('players').createIndex({ playerName: 1 }, { unique: true });

        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}
// Get leaderboard data (equivalent to your getLeaderboard function)
export async function getLeaderboard(nickname) {
    const collection = db.collection('players');

    if (nickname) {
        // Get specific player
        const player = await collection.findOne({ playerName: nickname });
        return player ? { [nickname]: player.score } : null;
    } else {
        // Get all players (equivalent to Firebase structure)
        const players = await collection.find({}).toArray();
        const playersObject = {};
        players.forEach(player => {
            playersObject[player.playerName] = player.score;
        });
        return playersObject;
    }
}

// Insert or update player score (equivalent to your upsertPlayer function)
export async function upsertPlayer(playerName, score) {
    const collection = db.collection('players');

    try {
        await collection.updateOne(
            { playerName },
            {
                $set: {
                    playerName,
                    score,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );
        console.log(`Player: ${playerName} set to ${score}`);
    } catch (error) {
        console.error('Error updating player:', error);
    }
}