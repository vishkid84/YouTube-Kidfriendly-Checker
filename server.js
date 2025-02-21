const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); // Allow JSON requests

// Route to fetch YouTube Channel Data
app.get("/api/channel/:channelName", async (req, res) => {
    const channelName = req.params.channelName;
    const apiKey = process.env.YOUTUBE_API_KEY; // Hidden in .env

    try {
        const response = await axios.get(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&forHandle=${channelName}&key=${apiKey}`
        );
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching YouTube data:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

// Route to analyze content with Gemini API
app.post("/api/analyze", async (req, res) => {
    const { text } = req.body;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent?key=${geminiApiKey}`,
            {
                contents: [{ parts: [{ text }] }]
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error("Gemini API Request Failed:", error);
        res.status(500).json({ error: "Failed to analyze content" });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
