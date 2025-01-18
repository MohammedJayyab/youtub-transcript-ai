export const API_CONSTANTS = {
  MODEL: 'deepseek-chat',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.7,
  TIMEOUT: 30000,
  ENDPOINTS: {
    CHAT: '/v1/chat/completions'
  }
};

export const YOUTUBE_CONSTANTS = {
  URL_PATTERNS: {
    WATCH: 'youtube.com/watch',
    VIDEO_PARAM: 'v'
  },
  SELECTORS: {
    CAPTIONS: '.ytp-caption-segment',
    SUBTITLE_BUTTON: '.ytp-subtitles-button'
  },
  LANGUAGES: {
    DEFAULT: 'en'
  }
};

export const UI_CONSTANTS = {
  ELEMENT_IDS: {
    SUMMARIZE_BTN: 'summarize-btn',
    LOADING: 'loading',
    RESULTS: 'results',
    ERROR: 'error',
    SUMMARY_TEXT: 'summary-text',
    KEY_POINTS_LIST: 'key-points-list',
    VIDEO_ID: 'video-id'
  },
  CLASSES: {
    HIDDEN: 'hidden',
    ERROR_MESSAGE: 'error-message'
  },
  MESSAGES: {
    LOADING: 'Processing transcript...',
    NO_VIDEO: 'Please open a YouTube video to use this extension',
    NO_TRANSCRIPT: 'No transcript available for this video',
    INIT_ERROR: 'Failed to initialize extension',
    API_ERROR: 'Failed to get summary from AI service',
    API_KEY_MISSING: 'DeepSeek API key is required. Please add your API key to use this extension.',
    API_KEY_INVALID: 'Invalid API key. Please check your DeepSeek API key.',
    API_KEY_INSTRUCTIONS: `
      To use this extension:
      1. Get an API key from DeepSeek
      2. Add it to your .env file
      3. Rebuild the extension
    `,
    API_RATE_LIMIT: 'API rate limit exceeded. Please try again later',
    PARSE_ERROR: 'Failed to parse AI response'
  }
};

export const PROMPTS = {
  SUMMARIZE: (transcript) => `Please provide a concise summary of this video transcript, followed by key points starting with "-":

${transcript}

Summary should include:
1. Main topic or purpose
2. Key arguments or information
3. Important conclusions

Key points should highlight:
- Important facts or statistics
- Main arguments or claims
- Significant conclusions
- Notable quotes or statements`
}; 