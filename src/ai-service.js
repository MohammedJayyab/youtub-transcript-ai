import config from './config.js';
import { API_CONSTANTS, UI_CONSTANTS, PROMPTS } from './constants/index.js';

// Better debug lines
console.log('Config object:', {
  apiKey: config.apiKey,
  apiUrl: config.apiUrl,
  apiTimeout: config.apiTimeout,
  debugMode: config.debugMode
});

export class AIService {
  constructor() {
    // Add more debug
    console.log('AIService initialized with config:', {
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      apiTimeout: config.apiTimeout,
      debugMode: config.debugMode
    });
    this.clearStoredApiKey();
  }

  clearStoredApiKey() {
    chrome.storage.sync.clear(() => {
      console.log('Chrome storage cleared');
    });
  }

  async summarizeTranscript(transcript) {
    try {
      if (!transcript?.trim()) {
        throw new Error(UI_CONSTANTS.MESSAGES.NO_TRANSCRIPT);
      }

      if (!config.apiKey || config.apiKey === 'undefined' || config.apiKey === 'null' || config.apiKey === '') {
        console.error('API Key missing or invalid:', config.apiKey);
        throw new Error(UI_CONSTANTS.MESSAGES.API_KEY_MISSING);
      }
      console.log('API Key:', config.apiKey);

      const response = await this.makeAPIRequest(transcript);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your DeepSeek API key.');
        }
        
        if (response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        }
        
        throw new Error(errorData.error?.message || UI_CONSTANTS.MESSAGES.API_ERROR);
      }

      const data = await response.json();
      
      if (!data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from AI service');
      }

      return this.parseAIResponse(data.choices[0].message.content);
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  async makeAPIRequest(transcript) {
    const url = `${config.apiUrl}${API_CONSTANTS.ENDPOINTS.CHAT}`;
    console.log('Making API request to:', url);
    console.log('Using Authorization:', `Bearer ${config.apiKey}`);

    const requestBody = {
      model: API_CONSTANTS.MODEL,
      messages: [{
        role: 'user',
        content: PROMPTS.SUMMARIZE(transcript)
      }],
      temperature: API_CONSTANTS.TEMPERATURE,
      max_tokens: API_CONSTANTS.MAX_TOKENS
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        // 'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      timeout: API_CONSTANTS.TIMEOUT
    });

    console.log('Response status:', response.status);
    return response;
  }

  parseAIResponse(text) {
    try {
      return {
        summary: this.extractSummary(text),
        keyPoints: this.extractKeyPoints(text)
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  extractSummary(text) {
    const keyPointsIndex = text.indexOf('Key points:');
    return keyPointsIndex > -1 ? text.substring(0, keyPointsIndex).trim() : text.trim();
  }

  extractKeyPoints(text) {
    return text.split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(1).trim());
  }
} 