# 🎯 YouTube Kid-Friendly Checker

This project is a **YouTube Kid-Friendly Checker** that analyzes YouTube channels and videos to determine their suitability for different age groups using **Google's Gemini AI API**.


---

## 🚀 Features
- Analyze **YouTube channels** using their handle (e.g., `@MrBeast`).
- Fetch **latest videos** from the channel.
- Run **AI analysis** to check if content is kid-friendly.
- Works with **YouTube API + Google Gemini AI**.
- **Live Deployment** (Hosted on Render).

## How it works

- Fetches video & channel details using the YouTube API
- Check if the video has been marked as MadeForKids by the creators, which is checked from the YouTube API
- Runs AI analysis based on descriptions of videos and channels (powered by Google Gemini) to check suitability
- Instantly categorizes content for different age groups

## TODO & Future Features
- Add custom domain
- Cache API responses to avoid rate limits
- Bulk request features
- Add user authentication