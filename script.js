let YOUTUBE_API_KEY = "";

// const API_BASE_URL = "https://youtube-kidfriendly-checker.onrender.com";

const API_BASE_URL = "http://127.0.0.1:3000";

// const API_BASE_URL = window.location.hostname === "localhost" 
//     ? "http://127.0.0.1:3000" 
//     : "https://youtube-kidfriendly-checker.onrender.com";  


// Fetch API key from backend
async function fetchApiKey() {
    try {
        const response = await fetch(`${API_BASE_URL}/config`);
        const data = await response.json();
        YOUTUBE_API_KEY = data.youtubeApiKey;
    } catch (error) {
        console.error("Error fetching API key:", error);
    }
}

// Call function on page load
fetchApiKey();



document.getElementById("channelForm").addEventListener("submit", async (event) =>{
  event.preventDefault();


  const input = document.getElementById("channelInput").value.trim();
  let channelId = null;
  let videoId = null;
  let resultTitle = null;
  let channelName = null;

  // ----- A) Detect If Input Is a Video URL -----
  if (input.includes("watch?v=") || input.includes("youtu.be/")) {
    videoId = extractVideoId(input);
    // console.log(videoId);
    await processVideo(videoId);
  } 

  // --------- B) If Input Is a YouTube Handle (@username) ---------
  else if (input.includes("youtube.com/@")) {
    channelName = input.split('@')[1].split('?')[0];
    console.log(channelName);
    await displayResult(channelName);
  }

  else{
    alert("Invalid YouTube channel or vide URL. Please enter a valid link.");
  }

  
})

// Function to Extract Video ID from YouTube Video URL
function extractVideoId(url) {
    let match = url.match(/(?:v=|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/|\/watch\?v=)([a-zA-Z0-9_-]{11})/);
    if (!match) {
        // Handle cases where "?si=" exists (from mobile share links)
        let cleanUrl = url.split("?")[0]; // Remove query parameters
        match = cleanUrl.match(/(?:youtu\.be\/|\/watch\?v=)([a-zA-Z0-9_-]{11})/);
    }
    return match ? match[1] : null;
}

// ----------Function to Fetch Channel Details--------------
async function fetchChannelDetails(channelName) {
  try {
      const response = await fetch(`${API_BASE_URL}/channel/${channelName}`);
      const data = await response.json();

      if (!data || !data.snippet) {
          console.error("❌ No channel data found.");
          return null;
      }

      return {
          title: data.snippet.title,
          description: data.snippet.description || "No description available.",
      };
  } catch (error) {
      console.error("Error fetching channel details:", error);
      return null;
  }
}


async function displayResult(channelName) {
  let channelElement = document.getElementById("result");

  // console.log("📡 Fetching channel details for:", channelName);

  // **Fetch channel details**
  const channelData = await fetchChannelDetails(channelName);
  // console.log("🔍 Channel Data:", channelData);

  if (!channelData) {
      console.error("❌ No channel data found.");
      return;
  }

  // **Fetch latest video details**
  const playlistId = await getUploadsPlaylistId(channelName);
  // console.log("📂 Playlist ID:", playlistId);

  const latestVideoId = playlistId ? await getLatestVideo(playlistId) : null;
  // console.log("🎥 Latest Video ID:", latestVideoId);

  const videoData = latestVideoId ? await fetchVideoDetails(latestVideoId) : null;
  // console.log("📩 Video Data:", videoData);

  // **Check if descriptions exist**
  if (!channelData?.description) {
      console.error("❌ Missing channel description. Full object:", channelData);
      return;
  }

  if (!videoData?.description) {
      console.error("❌ Missing video description. Full object:", videoData);
      return;
  }

  // console.log("✅ Channel and video descriptions exist. Sending to AI...");
  
  // **AI Analysis**
  const aiResponse = await checkChannelKidFriendly(channelData.description, videoData.description);
  // console.log("🤖 AI Analysis Result:", aiResponse);

  if (!aiResponse) {
      channelElement.innerHTML = `<h2>${channelData.title}</h2><p>Error retrieving AI analysis.</p>`;
      return;
  }

  // **Render UI**
  const madeForKids = aiResponse.MadeForKids;
  channelElement.innerHTML = `
      <div class="table-container">
        <div class="col">
          <h2 class="channelName">Channel Name: ${channelData.title}</h2>
          <table class="result-table">
              <tr>
                  <th>Category</th>
                  <th>Assessment</th>
              </tr>
              <tr>
                  <td>Made for Kids:</td>
                  <td>${madeForKids}</td>
              </tr>
              <tr>
                  <td>Below 5:</td>
                  <td>${aiResponse.Below5}</td>
              </tr>
              <tr>
                  <td>Ages 5-7:</td>
                  <td>${aiResponse.Ages5to7}</td>
              </tr>
              <tr>
                  <td>Ages 8-10:</td>
                  <td>${aiResponse.Ages8to10}</td>
              </tr>
              <tr>
                  <td>Ages 11-16:</td>
                  <td>${aiResponse.Ages11to16}</td>
              </tr>
              <tr>
                  <td>Ages 16+:</td>
                  <td>${aiResponse.Ages16Plus}</td>
              </tr>
              <tr class="summary-row">
                  <td>Final Summary:</td>
                  <td>${aiResponse.Summary}</td>
              </tr>
          </table>
        </div>
      </div>
  `;
}



async function analyzeWithAI(text) {
  try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
      });

      const data = await response.json();
      return data;
  } catch (error) {
      console.error("Error in AI Analysis:", error);
      return null;
  }
}



async function checkChannelKidFriendly(channelDescription, videoDescription) {
  if (!channelDescription || !videoDescription) {
      console.error("❌ Missing channel or video description.");
      return "Error: Missing channel or video description.";
  }

  // console.log("📡 Sending to AI:", { channelDescription, videoDescription });

  const combinedText = `Channel Description:\n${channelDescription}\n\nVideo Description:\n${videoDescription}`;

  const aiResponse = await analyzeWithAI(combinedText);
  // console.log("📩 AI Response Received:", aiResponse);

  if (!aiResponse) {
      console.error("❌ AI Analysis Failed.");
      return "Error retrieving AI analysis.";
  }

  return aiResponse;
}




// ------- Get all the uploads from the channel-----------------
async function getUploadsPlaylistId(channelName) {
  if (!YOUTUBE_API_KEY) {
      console.error("⚠️ API Key not loaded yet!");
      return null;
  }


  const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${channelName}&key=${YOUTUBE_API_KEY}`;
  
  try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data.items || data.items.length === 0) {
          console.error("No channel found.");
          return null;
      }
      // console.log(data.items[0].contentDetails.relatedPlaylists.uploads);
      return data.items[0].contentDetails.relatedPlaylists.uploads; // ✅ Uploads playlist ID
  } catch (error) {
      console.error("Error fetching uploads playlist:", error);
      return null;
  }
}

// -------------Fetch the Most Recent Video from the Playlist------------------
async function getLatestVideo(playlistId) {
  if (!YOUTUBE_API_KEY) {
      console.error("⚠️ API Key not loaded yet!");
      return null;
  }


  const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=1&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`;
  
  try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data.items || data.items.length === 0) {
          console.error("No videos found in playlist.");
          return null;
      }

      return data.items[0].contentDetails.videoId; // ✅ Latest video ID
  } catch (error) {
      console.error("Error fetching latest video:", error);
      return null;
  }
}


// --------------- Fetch Video Details (Title, Description, madeForKids Status)------------------
async function fetchVideoDetails(videoId) {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${videoId}&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            console.error("❌ No video details found.");
            return null;
        }

        const video = data.items[0];
        return {
            title: video.snippet.title,
            description: video.snippet?.description?.trim() || "No description available.",
            channelId: video.snippet.channelId,  // ✅ Extracts channelId
            madeForKids: video.status?.madeForKids ?? "Unknown"
        };
    } catch (error) {
        console.error("🚨 Error fetching video details:", error);
        return null;
    }
}


// --------------------Fetch from video---------------

async function processVideo(videoId) {
    let resultElement = document.getElementById("result");

    // **Fetch Video Details**
    const videoData = await fetchVideoDetails(videoId);
    // console.log("📩 Video Data:", videoData);

    if (!videoData || !videoData.channelId) {
        resultElement.innerHTML = "No video details found.";
        return;
    }

    // **Fetch Channel Details Using channelId**
    const channelData = await fetchChannelDetailsById(videoData.channelId);
    // console.log("📡 Channel Data:", channelData);

    if (!channelData) {
        resultElement.innerHTML = `<h2>${videoData.title}</h2><p>No channel details found.</p>`;
        return;
    }

    // **Send to AI for Analysis**
    const aiResponse = await checkChannelKidFriendly(channelData.description, videoData.description);
    // console.log("🤖 AI Analysis Result:", aiResponse);

    if (!aiResponse) {
        resultElement.innerHTML = `<h2>${videoData.title}</h2><p>Error retrieving AI analysis.</p>`;
        return;
    }

    // **Render UI**
    resultElement.innerHTML = `
        <div class="table-container">
          <div class="col">
            <h2 class="channelName">Channel: ${channelData.title}</h2>
            <table class="result-table">
                <tr>
                    <th>Category</th>
                    <th>Assessment</th>
                </tr>
                <tr>
                    <td>Made for Kids:</td>
                    <td>${aiResponse.MadeForKids}</td>
                </tr>
                <tr>
                    <td>Below 5:</td>
                    <td>${aiResponse.Below5}</td>
                </tr>
                <tr>
                    <td>Ages 5-7:</td>
                    <td>${aiResponse.Ages5to7}</td>
                </tr>
                <tr>
                    <td>Ages 8-10:</td>
                    <td>${aiResponse.Ages8to10}</td>
                </tr>
                <tr>
                    <td>Ages 11-16:</td>
                    <td>${aiResponse.Ages11to16}</td>
                </tr>
                <tr>
                    <td>Ages 16+:</td>
                    <td>${aiResponse.Ages16Plus}</td>
                </tr>
                <tr class="summary-row">
                    <td>Final Summary:</td>
                    <td>${aiResponse.Summary}</td>
                </tr>
            </table>
          </div>
        </div>
    `;
}


async function fetchChannelDetailsById(channelId) {
    const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            console.error("❌ No channel data found.");
            return null;
        }

        const channel = data.items[0];
        return {
            title: channel.snippet.title,
            description: channel.snippet?.description?.trim() || "No description available."
        };
    } catch (error) {
        console.error("🚨 Error fetching channel details:", error);
        return null;
    }
}
