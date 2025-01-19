import { AIService } from './ai-service.js';
import { UI_CONSTANTS } from './constants/index.js';
import config from './config.js';

class PopupUI {
  constructor() {
    this.aiService = new AIService();
    this.initializeUI();
  }

  async initializeUI() {
    try {
      // Get UI elements with null checks
      this.summarizeBtn = document.getElementById(UI_CONSTANTS.ELEMENT_IDS.SUMMARIZE_BTN);
      this.loadingDiv = document.getElementById(UI_CONSTANTS.ELEMENT_IDS.LOADING);
      this.resultsDiv = document.getElementById(UI_CONSTANTS.ELEMENT_IDS.RESULTS);
      this.errorDiv = document.getElementById(UI_CONSTANTS.ELEMENT_IDS.ERROR);
      this.summaryText = document.getElementById(UI_CONSTANTS.ELEMENT_IDS.SUMMARY_TEXT);
      this.keyPointsList = document.getElementById(UI_CONSTANTS.ELEMENT_IDS.KEY_POINTS_LIST);
      this.videoIdSpan = document.getElementById(UI_CONSTANTS.ELEMENT_IDS.VIDEO_ID);

      // Check API key first
      if (!config.apiKey || config.apiKey === 'your-default-api-key') {
        this.showError(UI_CONSTANTS.MESSAGES.API_KEY_MISSING);
        this.showApiKeyInstructions();
        this.summarizeBtn.disabled = true;
        return;
      }

      // Validate required elements
      if (!this.summarizeBtn || !this.loadingDiv || !this.resultsDiv || 
          !this.errorDiv || !this.summaryText || !this.keyPointsList || !this.videoIdSpan) {
        throw new Error('Required UI elements not found');
      }

      // Add event listeners
      this.summarizeBtn.addEventListener('click', () => this.handleSummarize());

      // Check if we're on YouTube
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url?.includes('youtube.com/watch')) {
        this.showError('Please open a YouTube video to use this extension');
        this.summarizeBtn.disabled = true;
        return;
      }

      // Extract and display video ID
      const videoId = this.getVideoIdFromUrl(tab.url);
      if (videoId) {
        this.videoIdSpan.textContent = videoId;
        console.log('Video ID:', videoId);
      } else {
        throw new Error('Could not extract video ID');
      }

      // Inject content script if needed
      await this.ensureContentScript(tab.id);

    } catch (error) {
      console.error('Initialization error:', error);
      this.showError(error.message || UI_CONSTANTS.MESSAGES.INIT_ERROR);
      if (this.summarizeBtn) {
        this.summarizeBtn.disabled = true;
      }
    }
  }

  getVideoIdFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('v');
    } catch {
      return null;
    }
  }

  async ensureContentScript(tabId) {
    try {
      // Try to ping content script
      await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    } catch (error) {
      // If content script doesn't respond, inject it
      console.log('Injecting content script...');
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
    }
  }

  async handleSummarize() {
    try {
      this.showLoading();
      console.log('Getting current tab...');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab);
      
      // Try to inject content script again if needed
      await this.ensureContentScript(tab.id);
      
      console.log('Sending message to content script...');
      
      // Use Promise wrapper for chrome.tabs.sendMessage
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { action: 'getTranscript' }, response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      console.log('Response from content script:', response);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response?.transcript) {
        throw new Error('No transcript available for this video');
      }

      // Update detected language display
      const detectedLang = response.language || 'en';
      const languageDisplay = document.getElementById('detected-language');
      
      if (languageDisplay) {
        const languageNames = { en: 'English', ar: 'Arabic', de: 'German' };
        languageDisplay.textContent = languageNames[detectedLang] || detectedLang;
      }

      // Set RTL for Arabic
      if (detectedLang === 'ar') {
        document.body.setAttribute('dir', 'rtl');
      } else {
        document.body.setAttribute('dir', 'ltr');
      }

      console.log('Getting AI summary...');
      const result = await this.aiService.summarizeTranscript(
        response.transcript,
        detectedLang
      );
      
      this.displayResults(result, detectedLang);
    } catch (error) {
      console.error('Popup Error:', error);
      this.showError(error.message);
    }
  }

  displayResults(result, language) {
    this.hideLoading();
    this.resultsDiv.classList.remove('hidden');
    
    // Abstract
    const abstractText = document.getElementById('abstract-text');
    if (abstractText) {
        abstractText.textContent = result.abstract || 'No abstract available';
    }
    
    // Key Points
    this.keyPointsList.innerHTML = '';
    if (result.keyPoints && result.keyPoints.length > 0) {
        result.keyPoints.forEach(point => {
            if (point && point.trim()) {  // Only add non-empty points
                const li = document.createElement('li');
                li.textContent = point;
                this.keyPointsList.appendChild(li);
            }
        });
    }
    
    // If no points were added, show the fallback message
    if (this.keyPointsList.children.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Processing key points...';
        li.className = 'fallback-message';
        this.keyPointsList.appendChild(li);
        
        // Retry parsing after a short delay
        setTimeout(() => {
            if (result.summary) {
                const fallbackPoints = result.summary
                    .split('.')
                    .filter(sentence => sentence.trim().length > 20)
                    .slice(0, 3)
                    .map(sentence => sentence.trim() + '.');
                
                if (fallbackPoints.length > 0) {
                    this.keyPointsList.innerHTML = '';
                    fallbackPoints.forEach(point => {
                        const li = document.createElement('li');
                        li.textContent = point;
                        this.keyPointsList.appendChild(li);
                    });
                }
            }
        }, 100);
    }
    
    // Category
    const categoryText = document.getElementById('category-text');
    if (categoryText) {
        categoryText.textContent = result.category || 'Uncategorized';
    }
    
    // Summary
    if (this.summaryText) {
        this.summaryText.textContent = result.summary || 'No detailed summary available';
    }

    // Add language-specific text direction
    const textDirection = language === 'ar' ? 'rtl' : 'ltr';
    const textElements = [
        document.getElementById('abstract-text'),
        document.getElementById('category-text'),
        this.summaryText,
        this.keyPointsList
    ];

    textElements.forEach(element => {
        if (element) {
            element.setAttribute('dir', textDirection);
        }
    });
  }

  showLoading() {
    this.loadingDiv.classList.remove('hidden');
    this.resultsDiv.classList.add('hidden');
    this.errorDiv.classList.add('hidden');
  }

  hideLoading() {
    this.loadingDiv.classList.add('hidden');
  }

  showError(message) {
    this.hideLoading();
    this.errorDiv.classList.remove('hidden');
    this.errorDiv.querySelector('.error-message').textContent = message;
  }

  showApiKeyInstructions() {
    const instructions = document.createElement('div');
    instructions.className = 'api-key-instructions';
    instructions.innerHTML = `
      <h3>API Key Required</h3>
      <p>To use this extension, you need to:</p>
      <ol>
        <li>Get a DeepSeek API key from <a href="https://deepseek.com" target="_blank">DeepSeek's website</a></li>
        <li>Create a .env file in the extension directory</li>
        <li>Add your API key: DEEPSEEK_API_KEY=your_api_key_here</li>
        <li>Rebuild the extension</li>
      </ol>
    `;
    this.errorDiv.appendChild(instructions);
  }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup initialized');
  try {
    new PopupUI();
  } catch (error) {
    console.error('Failed to initialize PopupUI:', error);
    // Show error in popup if possible
    const errorDiv = document.querySelector('.error-message');
    if (errorDiv) {
      errorDiv.textContent = 'Failed to initialize extension';
    }
  }
});
