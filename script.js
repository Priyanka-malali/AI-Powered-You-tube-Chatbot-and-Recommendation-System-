// YouTube Clone and Chatbot Functionality

// DOM Elements
const videoCardContainer = document.querySelector('.video-container');
const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessage = document.querySelector("#send-message");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");

// YouTube API Configuration
const YOUTUBE_API_KEY = "AIzaSyAkURPlqm6wagR2XLZzmB_0UqF-yPaFx8Q"; // Replace with your valid API key
const VIDEO_API_URL = "https://www.googleapis.com/youtube/v3/videos?";
const CHANNEL_API_URL = "https://www.googleapis.com/youtube/v3/channels?";
const REGION_CODE = 'IN';

// Chatbot API Configuration
const CHATBOT_API_KEY = "AIzaSyCJLHpuI3NEuQUFllLp-dSwVZNH7GsPyEo"; // Replace with your valid API key
const CHATBOT_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${CHATBOT_API_KEY}`;


const chatHistory = [];

// Helper: Fetch with Retry Logic
const fetchWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) return await response.json();
            console.warn(`Retrying (${i + 1}/${retries})...`);
        } catch (error) {
            console.error("Fetch error:", error);
        }
    }
    throw new Error("Service unavailable after multiple attempts");
};

const fetchPopularVideos = async () => {
    try {
        const url = VIDEO_API_URL + new URLSearchParams({
            key: YOUTUBE_API_KEY,
            part: 'snippet',
            chart: 'mostPopular',
            maxResults: 50,
            regionCode: REGION_CODE,
        });

        const data = await fetchWithRetry(url);

        if (!data.items || data.items.length === 0) {
            throw new Error("No video data found.");
        }

        // Fetch channel icons for videos
        data.items.forEach((video) => fetchChannelIcon(video));
    } catch (error) {
        console.error("YouTube API error:", error);
        videoCardContainer.innerHTML = `<p class="error">Unable to load videos. Please try again later.</p>`;
    }
};

// Fetch Channel Icon for Video
const fetchChannelIcon = async (video) => {
    try {
        const url = CHANNEL_API_URL + new URLSearchParams({
            key: YOUTUBE_API_KEY,
            part: 'snippet',
            id: video.snippet.channelId,
        });

        const data = await fetchWithRetry(url);

        video.channelThumbnail = data.items[0]?.snippet?.thumbnails?.default?.url || '';
        renderVideoCard(video);
    } catch (error) {
        console.error("Error fetching channel icon:", error);
    }
};

// Render Video Card
const renderVideoCard = (video) => {
    const videoElement = document.createElement('div');
    videoElement.className = "video";
    videoElement.onclick = () => {
        location.href = `https://youtube.com/watch?v=${video.id}`;
    };
    videoElement.innerHTML = `
        <img src="${video.snippet.thumbnails.high.url}" class="thumbnail" alt="Video Thumbnail">
        <div class="content">
            <img src="${video.channelThumbnail}" class="channel-icon" alt="Channel Icon">
            <div class="info">
                <h4 class="title">${video.snippet.title}</h4>
                <p class="channel-name">${video.snippet.channelTitle}</p>
            </div>
        </div>`;
    videoCardContainer.appendChild(videoElement);
};

// Initialize YouTube Functionality
fetchPopularVideos();

/** 
 * =========================
 * Chatbot Functionality
 * =========================
 */

// Create Message Element
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

// Generate Bot Response
const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");

    try {
        const response = await fetch(CHATBOT_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
        });

        if (!response.ok) {
            throw new Error("Chatbot API is unavailable.");
        }

        const data = await response.json();
        const apiResponseText = data.candidates[0]?.content?.parts[0]?.text || "No response received.";
        messageElement.innerText = apiResponseText;

        // Save bot response in chat history
        chatHistory.push({ role: "model", parts: [{ text: apiResponseText }] });
    } catch (error) {
        console.error("Chatbot API error:", error);
        messageElement.innerText = "I'm unable to respond right now. Please try again later.";
        messageElement.style.color = "#ff0000";
    } finally {
        incomingMessageDiv.classList.remove("thinking");
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    }
};

// Handle Outgoing User Messages
const handleOutgoingMessage = (e) => {
    e.preventDefault();
    const userMessage = messageInput.value.trim();
    if (!userMessage) return;

    // Add user message to chat history
    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

    // Render user message
    const outgoingMessageDiv = createMessageElement(`<div class="message-text">${userMessage}</div>`, "user-message");
    chatBody.appendChild(outgoingMessageDiv);

    // Render bot typing indicator
    const incomingMessageDiv = createMessageElement(`
        <div class="message-text">
            <div class="thinking-indicator">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
            </div>
        </div>
    `, "bot-message", "thinking");
    chatBody.appendChild(incomingMessageDiv);

    // Scroll to the bottom
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Generate bot response
    generateBotResponse(incomingMessageDiv);
};

// Event Listeners
sendMessage.addEventListener("click", handleOutgoingMessage);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) handleOutgoingMessage(e);
});
closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
