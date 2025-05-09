import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config(); // Load variables from .env file
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from your frontend origin
app.use(express.json()); // Parse JSON request bodies

// Check if Supabase environment variables are set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file");
    process.exit(1);
}

// Initialize Supabase client (using Service Role Key for backend)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

app.get('/api/players/:nickname', async (req, res) =>  {
    const { nickname } = req.params;
    try {
        const { data, error } = await supabase
        .from('Player')
        .select("*")
        .eq('nickname', nickname)
        .maybeSingle();

        if (error) {
            throw error;
        }

        if (data) {
            res.json(data);
        } else {
            res.status(404).json({ message: 'Player not found' });
        }
    } catch (error) {
        console.error('Error fetching player:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.post('/api/players/createPlayer', async (req, res) => {
    const { nickname } = req.body;

    if (!nickname) {
        return res.status(400).json({ message: 'Player name is required' });
    }

    try {
        const { data, error } = await supabase
        .from('Player')
        .insert({nickname: nickname})
        .select()
        .single(); // Expecting a single record back

        if (error) {
            // Handle potential known errors, e.g., duplicate name if constraint exists
            if (error.code === '23505') { // Example: PostgreSQL unique violation code
                return res.status(409).json({ message: 'Player name already exists' });
            }
            throw error;
        }

        res.status(201).json(data); // 201 Created status
    } catch (error) {
        console.error('Error creating player:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

app.post('/api/players/updatePoints', async (req, res) => {
    const { nickname, points } = req.body;

    if (!nickname) {
        return res.status(400).json({ message: 'Player name is required' });
    }

    try {
        const { data, error } = await supabase
            .from('Player')
            .update({points: points})
            .eq('nickname', nickname)
            .select();

        if (error) {
            if (error.code) {
                return res.status(409).json({ message: 'Player name already exists' });
            }
            throw error;
        }

        res.status(201).json(data); // 201 Created status
    } catch (error) {
        console.error('Error creating player:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Node.js backend server listening on port ${port}`);
});