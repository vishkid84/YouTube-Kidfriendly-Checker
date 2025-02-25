import 'dotenv/config'; // Direct import for dotenv
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json());

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files (your frontend)
app.use(express.static(__dirname)); // Serve all static files (CSS, JS, etc.)

app.get('/YouTube-Kidfriendly-Checker', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/config', (req, res) => {
  res.json({ youtubeApiKey: process.env.YOUTUBE_API_KEY });
});



// Fetch YouTube Channel Details
app.get('/channel/:handle', async (req, res) => {
  const { handle } = req.params;
  console.log("📡 Received request for channel:", handle);

  // Construct the YouTube API URL
  const youtubeUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&forHandle=${handle}&key=${YOUTUBE_API_KEY}`;
  console.log("🔍 Fetching from YouTube API:", youtubeUrl);

  try {
      const response = await fetch(youtubeUrl);
      const data = await response.json();

      console.log("📩 Full YouTube API Response:", JSON.stringify(data, null, 2)); // LOG RESPONSE

      if (!data || data.error) {
          console.error("🚨 API Error:", data.error);
          return res.status(500).json({ error: "YouTube API error", details: data.error });
      }

      if (!data.items || data.items.length === 0) {
          console.error("⚠️ Channel not found in API response.");
          return res.status(404).json({ error: "Channel not found", apiResponse: data });
      }

      res.json(data.items[0]); // ✅ Send channel data
  } catch (error) {
      console.error("🚨 Error fetching channel data:", error);
      res.status(500).json({ error: "Error fetching channel data" });
  }
});



// Analyze Content with Gemini
app.post('/analyze', async (req, res) => {
  const { text } = req.body;
  if (!text) {
      console.error("❌ Missing text input for AI analysis.");
      return res.status(400).json({ error: "Text input is required" });
  }

  console.log("📡 Received AI Analysis Request:", text);

  const requestBody = {
      contents: [{
          parts: [{
              text: `Analyze the following content and determine its suitability for children based on age groups.

              Please provide the output as a valid JSON object:
              {
                "MadeForKids": "The creator has tagged this as made for kids or The creator has not tagged this as made for kids",
                "Below5": "Suitability & Explanation",
                "Ages5to7": "Suitability & Explanation",
                "Ages8to10": "Suitability & Explanation",
                "Ages11to16": "Suitability & Explanation",
                "Ages16Plus": "Suitability & Explanation",
                "Summary": "Final overall summary"
              }

              Output ONLY the JSON, no extra text.
              Content to analyze: "${text}"`
          }]
      }]
  };

  const models = [
      "gemini-2.0-flash-lite-preview-02-05",
      "gemini-2.0-flash"
  ];

  for (let model of models) {
      try {
          console.log(`🚀 Trying AI Model: ${model}`);

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody)
          });

          const data = await response.json();
          console.log("📩 AI Response:", JSON.stringify(data, null, 2));

          // Check if there's an error in the response
          if (data.error) {
              console.error(`❌ AI Error from ${model}:`, data.error);
              if (data.error.code === 503 || data.error.status === "UNAVAILABLE") {
                  console.warn(`⚠️ Model ${model} is unavailable. Switching to the next model...`);
                  continue; // Try the next model
              } else {
                  return res.status(500).json({ error: data.error.message });
              }
          }

          // Extract AI response text
          let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          console.log("📝 Extracted Raw Text:", rawText);

          // Clean up output (if Gemini API wraps JSON in code blocks)
          rawText = rawText.replace(/^```json\s*/, "").replace(/```$/, "").trim();

          try {
              const parsedJson = JSON.parse(rawText);
              console.log("✅ Parsed AI JSON:", parsedJson);
              return res.json(parsedJson);
          } catch (jsonError) {
              console.error("🚨 Error Parsing AI JSON:", jsonError);
              return res.status(500).json({ error: "Invalid JSON from AI", rawText });
          }

      } catch (error) {
          console.error(`🚨 Request to ${model} failed:`, error);
          if (error.code === "ECONNRESET" || error.message.includes("503")) {
              console.warn(`⚠️ ${model} is unavailable. Trying next model...`);
              continue; // Try next model
          } else {
              return res.status(500).json({ error: "AI Analysis Failed", details: error.message });
          }
      }
  }

  // If all models failed
  console.error("❌ All AI models failed.");
  return res.status(500).json({ error: "All AI models failed." });
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
