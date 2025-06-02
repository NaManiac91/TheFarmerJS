import path from 'path';
import { readFile } from 'node:fs/promises';
import admin from 'firebase-admin';

// Initialize Firebase
const filePath = path.join(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = await readFile(filePath, 'utf8');

export function setup() {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
        databaseURL: process.env.DB
    });

}

// Get the leaderboard from db
export async function getLeaderboard(nickname) {
    const db = admin.database();
    const ref = db.ref('players' + (nickname ? '/' + nickname : ''));
    return await ref.once('value');
}

// Insert or update player score
export async function upsertPlayer(playerName, score) {
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