import { YoutubeTranscript } from 'youtube-transcript';
import { YOUTUBE_CONSTANTS, UI_CONSTANTS } from './constants/index.js';

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
                this.getTranscript()
                    .then(result => {
                        console.log('Sending transcript result:', result);
                        sendResponse(result);
                    })
                    .catch(error => {
                        console.error('Transcript error:', error);
                        sendResponse({ 
                            error: error.message || 'Failed to fetch transcript',
                            troubleshooting: [
                                'Check if the video has closed captions available',
                                'Check if the video is available in your region',
                                'Try using a different video'
                            ]
                        });
                    });
                
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

            console.log('Fetching transcript for video ID:', videoId);

            // First try: Direct fetch with default options
            try {
                const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
                if (transcriptData && transcriptData.length > 0) {
                    // Get language from YouTube's player data
                    const language = await this.detectVideoLanguage() || 'en';
                    console.log('Found transcript with language:', language);

                    const formattedTranscript = this.formatTranscript(transcriptData);
                    console.log('Sending response with language:', language);
                    return {
                        transcript: formattedTranscript,
                        language: language
                    };
                }
            } catch (directError) {
                console.log('Direct fetch failed, trying alternative methods...');
            }

            // Second try: Using listTranscripts
            try {
                const transcriptList = await YoutubeTranscript.listTranscripts(videoId);
                let transcript;

                // Try different methods to get transcript
                const methods = [
                    {
                        name: 'Manual transcript',
                        fn: () => transcriptList.findManualTranscript(['en', 'ar', 'de'])
                    },
                    {
                        name: 'Generated transcript',
                        fn: () => transcriptList.findGeneratedTranscript(['en', 'ar', 'de'])
                    },
                    {
                        name: 'Any transcript',
                        fn: () => transcriptList.findTranscript(['en', 'ar', 'de', 'es', 'fr'])
                    }
                ];

                for (const method of methods) {
                    try {
                        console.log(`Trying ${method.name}...`);
                        transcript = await method.fn();
                        if (transcript) {
                            console.log(`Found transcript using ${method.name}`);
                            break;
                        }
                    } catch (err) {
                        console.log(`${method.name} not available:`, err.message);
                    }
                }

                if (!transcript) {
                    throw new Error('No transcript found after trying all methods');
                }

                const transcriptData = await transcript.fetch();
                const language = transcript.language_code?.split('-')[0] || 'en';
                console.log('Successfully fetched transcript in:', language);

                const formattedTranscript = this.formatTranscript(transcriptData);
                return {
                    transcript: formattedTranscript,
                    language: language
                };

            } catch (listError) {
                console.error('List transcripts method failed:', listError);
                throw new Error('No available transcript found');
            }

        } catch (error) {
            console.error('Transcript fetch error:', error);
            console.log('\nTroubleshooting steps:');
            console.log('1. Check if the video has closed captions available');
            console.log('2. Check if the video is available in your region');
            console.log('3. Try using a different video');
            throw new Error(UI_CONSTANTS.MESSAGES.NO_TRANSCRIPT);
        }
    }

    async detectVideoLanguage() {
        try {
            // First try: Get from ytInitialPlayerResponse
            const ytInitialData = document.body.textContent.match(/ytInitialPlayerResponse\s*=\s*({.+?});/)?.[1];
            if (ytInitialData) {
                try {
                    const playerData = JSON.parse(ytInitialData);
                    const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                    
                    if (captionTracks && captionTracks.length > 0) {
                        // Look for Arabic captions first
                        const arabicTrack = captionTracks.find(track => 
                            track.languageCode.startsWith('ar') || 
                            track.name?.simpleText?.toLowerCase().includes('arabic')
                        );
                        
                        if (arabicTrack) {
                            console.log('Found Arabic caption track');
                            return 'ar';
                        }

                        // Get the default/first track language
                        const defaultTrack = captionTracks[0];
                        const language = defaultTrack.languageCode.split('-')[0].toLowerCase();
                        console.log('Found caption track language:', language);
                        return language;
                    }
                } catch (e) {
                    console.error('Error parsing player data:', e);
                }
            }

            // Second try: Check video title and description for Arabic text
            const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent || '';
            const videoDescription = document.querySelector('ytd-expander.ytd-video-secondary-info-renderer')?.textContent || '';
            
            const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
            if (arabicPattern.test(videoTitle) || arabicPattern.test(videoDescription)) {
                console.log('Detected Arabic from video content');
                return 'ar';
            }

            // Third try: Check HTML lang attribute
            const htmlLang = document.documentElement.lang?.toLowerCase() || '';
            if (htmlLang.startsWith('ar')) {
                console.log('Detected Arabic from HTML lang');
                return 'ar';
            }

            // Fourth try: Check meta tags
            const metaLang = document.querySelector('meta[property="og:locale"]')?.content || 
                            document.querySelector('meta[http-equiv="content-language"]')?.content || '';
            if (metaLang.toLowerCase().startsWith('ar')) {
                console.log('Detected Arabic from meta tags');
                return 'ar';
            }

            // Default to the transcript's detected language or English
            return 'en';
        } catch (error) {
            console.error('Language detection error:', error);
            return 'en';
        }
    }

    formatTranscript(transcriptData) {
        return transcriptData
            .map(item => {
                const timestamp = this.formatTime(item.offset / 1000);
                return `[${timestamp}] ${item.text}`;
            })
            .join('\n');
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(YOUTUBE_CONSTANTS.URL_PATTERNS.VIDEO_PARAM);
    }
}

// Initialize transcript fetcher
new YouTubeTranscriptFetcher(); 