import config from './config.js';

export class SettingsService {
  constructor() {
    this.defaults = {
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      apiTimeout: config.apiTimeout,
      debugMode: config.debugMode
    };
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(this.defaults, (settings) => {
        if (config.debugMode) {
          console.log('Retrieved settings:', settings);
        }
        resolve(settings);
      });
    });
  }

  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(settings, () => {
        if (config.debugMode) {
          console.log('Saved settings:', settings);
        }
        resolve();
      });
    });
  }

  async getApiKey() {
    const settings = await this.getSettings();
    return settings.apiKey || config.apiKey;
  }
} 