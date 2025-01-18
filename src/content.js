import { YOUTUBE_CONSTANTS, UI_CONSTANTS } from './constants/index.js';

// YouTube transcript fetching logic
class YouTubeTranscriptFetcher {
    constructor() {
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'ping') {
                sendResponse({ status: 'ok' });
                return true;
            }
            if (request.action === 'getTranscript') {
                this.getTranscript().then(sendResponse);
                return true;
            }
        });
    }

    async getTranscript() {
        try {
            const videoId = this.getVideoId();
            if (!videoId) {
                throw new Error(UI_CONSTANTS.MESSAGES.NO_VIDEO);
            }

            const transcript = await this.fetchTranscriptFromAPI(videoId);
            console.log('Fetched transcript:', transcript.substring(0, 100) + '...');
            return { transcript };
        } catch (error) {
            console.error('Content Script Error:', error);
            return { error: error.message };
        }
    }

    getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(YOUTUBE_CONSTANTS.URL_PATTERNS.VIDEO_PARAM);
    }

    async fetchTranscriptFromAPI(videoId) {
        try {
            const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
            const html = await response.text();
            
            const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
            if (!match) {
                throw new Error(UI_CONSTANTS.MESSAGES.NO_TRANSCRIPT);
            }

            let playerData;
            try {
                playerData = JSON.parse(match[1]);
            } catch (e) {
                console.error('Failed to parse player data:', e);
                throw new Error(UI_CONSTANTS.MESSAGES.NO_TRANSCRIPT);
            }

            const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (!captions || captions.length === 0) {
                throw new Error(UI_CONSTANTS.MESSAGES.NO_TRANSCRIPT);
            }

            const captionTrack = captions.find(track => 
                track.languageCode === YOUTUBE_CONSTANTS.LANGUAGES.DEFAULT
            ) || captions[0];
            
            if (!captionTrack?.baseUrl) {
                throw new Error(UI_CONSTANTS.MESSAGES.NO_TRANSCRIPT);
            }

            const captionsResponse = await fetch(captionTrack.baseUrl);
            if (!captionsResponse.ok) {
                throw new Error(UI_CONSTANTS.MESSAGES.NO_TRANSCRIPT);
            }

            const captionsText = await captionsResponse.text();
            const transcript = this.parseTranscript(captionsText);

            if (!transcript.trim()) {
                throw new Error(UI_CONSTANTS.MESSAGES.NO_TRANSCRIPT);
            }

            console.log('Successfully extracted transcript');
            return transcript;

        } catch (error) {
            console.error('Transcript fetch error:', error);
            throw error;
        }
    }

    parseTranscript(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const textElements = xmlDoc.getElementsByTagName('text');
        let transcript = '';
        
        for (const element of textElements) {
            const text = element.textContent.trim();
            if (text) {
                const start = element.getAttribute('start');
                const duration = element.getAttribute('dur');
                if (start && duration) {
                    const timeStamp = this.formatTime(parseFloat(start));
                    transcript += `[${timeStamp}] ${text}\n`;
                } else {
                    transcript += `${text}\n`;
                }
            }
        }

        return transcript.trim();
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Initialize transcript fetcher
new YouTubeTranscriptFetcher(); 