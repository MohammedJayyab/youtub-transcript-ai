# YouTube Transcript AI Summarizer

A Chrome extension that uses AI to generate summaries of YouTube video transcripts using the DeepSeek API.

## Features

- 🎥 Automatically extracts transcripts from YouTube videos
- 🤖 Generates AI-powered summaries
- 📝 Extracts key points from videos
- ⌚ Includes timestamps in transcripts
- 🔄 Works with any YouTube video that has captions

## Prerequisites

- Node.js and npm installed
- DeepSeek API key (get it from [DeepSeek's website](https://deepseek.com))
- Chrome browser

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd youtube-transcript-ai
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory (copy from .env.example):
```env
DEEPSEEK_API_KEY=your_deepseek_api_key
API_URL=https://api.deepseek.com/v1/chat/completions
API_TIMEOUT=30000
DEBUG_MODE=false
```

4. Build the extension:
```bash
npm run build
```

5. Load in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder

## Development Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Development with watch mode
npm run dev

# Clean build directory
npm run clean
```

## Project Structure

```
├── src/
│   ├── ai-service.js     # AI service for DeepSeek integration
│   ├── background.js     # Extension background script
│   ├── config.js         # Configuration management
│   ├── content.js        # YouTube page interaction
│   ├── popup.js          # Extension popup logic
│   └── settings-service.js # Settings management
├── public/
│   ├── manifest.json     # Extension manifest
│   ├── popup.html       # Popup interface
│   ├── popup.css        # Popup styles
│   ├── settings.html    # Settings page
│   └── icons/          # Extension icons
└── build.js            # Build configuration
```

## How It Works

1. The extension injects a content script into YouTube pages
2. When activated, it extracts the video transcript
3. Sends the transcript to DeepSeek's AI API
4. Processes the AI response to generate a summary and key points
5. Displays the results in the popup interface

## Configuration

The extension can be configured through the `.env` file:

- `DEEPSEEK_API_KEY`: Your DeepSeek API key
- `API_URL`: DeepSeek API endpoint
- `API_TIMEOUT`: API request timeout in milliseconds
- `DEBUG_MODE`: Enable/disable debug logging

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.