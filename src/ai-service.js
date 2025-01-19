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

  async summarizeTranscript(transcript, language = 'en') {
    try {
      console.log('AI Service processing transcript in language:', language); // Debug log
      
      if (!transcript?.trim()) {
        throw new Error(UI_CONSTANTS.MESSAGES.NO_TRANSCRIPT);
      }

      if (!config.apiKey || config.apiKey === 'undefined' || config.apiKey === 'null' || config.apiKey === '') {
        console.error('API Key missing or invalid:', config.apiKey);
        throw new Error(UI_CONSTANTS.MESSAGES.API_KEY_MISSING);
      }
      console.log('API Key:', config.apiKey);

      const response = await this.makeAPIRequest(transcript, language);
      
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

  async makeAPIRequest(transcript, language) {
    const url = `${config.apiUrl}${API_CONSTANTS.ENDPOINTS.CHAT}`;
    console.log('Making API request to:', url);
    console.log('Using language:', language); // Debug log

    // Improved request configuration
    const requestBody = {
        model: API_CONSTANTS.MODEL,
        messages: [{
            role: 'user',
            content: PROMPTS.SUMMARIZE(transcript, language)
        }],
        temperature: API_CONSTANTS.TEMPERATURE,
        max_tokens: API_CONSTANTS.MAX_TOKENS,  // Increased from 2000 to 4000 for longer responses
        stream: false      // Ensure we get complete response
    };

    console.log('Request configuration:', {
        url,
        model: requestBody.model,
        maxTokens: requestBody.max_tokens,
        temperature: requestBody.temperature
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(errorData.error?.message || 'API request failed');
        }

        return response;
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
  }

  parseAIResponse(text) {
    try {
        console.log('Raw AI response:', text);

        const response = {
            abstract: '',
            keyPoints: [],
            category: '',
            summary: ''
        };

        // Try both markdown and plain text formats
        const patterns = {
            abstract: [
                /\*\*ABSTRACT:\*\*([\s\S]*?)(?=\*\*|$)/,  // Markdown
                /ABSTRACT:\s*([\s\S]*?)(?=KEY CONCEPTS:|$)/i  // Plain text
            ],
            keyPoints: [
                /\*\*KEY CONCEPTS:\*\*([\s\S]*?)(?=\*\*|$)/,
                /KEY CONCEPTS:\s*([\s\S]*?)(?=CATEGORY:|$)/i
            ],
            category: [
                /\*\*CATEGORY:\*\*([\s\S]*?)(?=\*\*|$)/,
                /CATEGORY:\s*([\s\S]*?)(?=SUMMARY:|$)/i
            ],
            summary: [
                /\*\*SUMMARY:\*\*([\s\S]*?)(?=\*\*|$)/,
                /SUMMARY:\s*([\s\S]*?)$/i
            ]
        };

        // Extract each section using both patterns
        for (const [section, sectionPatterns] of Object.entries(patterns)) {
            for (const pattern of sectionPatterns) {
                const match = text.match(pattern);
                if (match && match[1].trim()) {
                    if (section === 'keyPoints') {
                        response.keyPoints = match[1]
                            .split('\n')
                            .map(line => line.trim())
                            .filter(line => line.startsWith('•') || line.startsWith('-'))
                            .map(line => line.replace(/^[•-]\s*/, '').trim())
                            .filter(point => point.length > 0);
                    } else {
                        response[section] = match[1].trim();
                    }
                    break;
                }
            }
        }

        // Validation with detailed logging
        const validations = {
            abstract: response.abstract.length >= 10,
            keyPoints: response.keyPoints.length > 0,
            category: response.category.length > 0,
            summary: response.summary.length >= 50
        };

        console.log('Validation results:', validations);

        if (!validations.summary) {
            console.error('Invalid or incomplete response:', response);
            throw new Error('Failed to extract valid summary from AI response');
        }

        console.log('Successfully parsed response:', response);
        return response;
    } catch (error) {
        console.error('Error parsing AI response:', error);
        console.error('Raw text:', text);
        throw new Error(UI_CONSTANTS.MESSAGES.PARSE_ERROR);
    }
  }
} 