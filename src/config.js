console.log('Loading config with env:', {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    NODE_ENV: process.env.NODE_ENV
});

const config = {
  apiKey: process.env.DEEPSEEK_API_KEY || null,
  apiUrl: 'https://api.deepseek.com',
  apiTimeout: parseInt(process.env.API_TIMEOUT) || 30000,
  debugMode: process.env.DEBUG_MODE === 'true'
};

if (!config.apiKey) {
  console.error('DEEPSEEK_API_KEY is not set in .env file');
}

export default config; 