console.log('Initial process.env:', {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY
});

import * as esbuild from 'esbuild';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Better .env loading
async function loadEnv() {
    try {
        // Log current directory and .env path
        console.log('Current directory:', process.cwd());
        console.log('.env file path:', path.resolve('.env'));
        
        // Check if .env exists
        await fs.access('.env');
        
        // Read .env content directly
        const envContent = await fs.readFile('.env', 'utf8');
        console.log('.env file content:', envContent);
        
        const result = dotenv.config();
        if (result.error) {
            throw new Error('Failed to parse .env file');
        }
        
        // Log immediately after loading
        console.log('Initial env from .env:', {
            DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
            NODE_ENV: process.env.NODE_ENV
        });
        
        // Validate API key
        if (!process.env.DEEPSEEK_API_KEY) {
            throw new Error('DEEPSEEK_API_KEY is required in .env file');
        }
        
        console.log('Validated environment:', {
            DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,  // Log actual value to see when it changes
            NODE_ENV: process.env.NODE_ENV
        });
        
    } catch (error) {
        console.error('Environment loading error:', error.message);
        process.exit(1);
    }
}

// Call loadEnv before build
await loadEnv();

const watch = process.argv.includes('--watch');

// Add this at the top to debug
console.log('Environment variables:', {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    NODE_ENV: process.env.NODE_ENV
});

 

// Function to clean dist directory
async function cleanDist() {
    try {
        await fs.rm('dist', { recursive: true, force: true });
        console.log('Cleaned dist directory');
    } catch (error) {
        console.error('Error cleaning dist directory:', error);
    }
}

// Function to ensure directory exists
async function ensureDir(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
}

// Function to check if file exists
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Function to find valid entry points
async function getValidEntryPoints() {
    const files = ['popup.js', 'content.js', 'background.js', 'ai-service.js'];
    const validEntryPoints = [];

    for (const file of files) {
        const srcPath = path.join('src', file).replace(/\\/g, '/');
        if (await fileExists(srcPath)) {
            validEntryPoints.push(srcPath);
        }
    }

    if (validEntryPoints.length === 0) {
        throw new Error('No valid entry points found in src directory');
    }

    return validEntryPoints;
}

// Function to copy public files to dist
async function copyPublicFiles() {
    try {
        await ensureDir('dist');
        await ensureDir('dist/icons');

        // Copy static files
        const files = ['manifest.json', 'popup.html', 'popup.css'];
        for (const file of files) {
            const sourcePath = path.join('public', file);
            const destPath = path.join('dist', file);
            try {
                await fs.copyFile(sourcePath, destPath);
                console.log(`Copied: ${file}`);
            } catch (error) {
                console.error(`Error copying ${file}:`, error);
            }
        }

        // Copy icons
        const iconDir = path.join('public', 'icons');
        const requiredIcons = ['icon16.png', 'icon48.png', 'icon128.png'];
        
        for (const iconFile of requiredIcons) {
            const sourcePath = path.join(iconDir, iconFile);
            const destPath = path.join('dist/icons', iconFile);
            try {
                await fs.copyFile(sourcePath, destPath);
                console.log(`Copied icon: ${iconFile}`);
            } catch (error) {
                console.error(`Error copying icon ${iconFile}:`, error);
            }
        }

        console.log('Files copied successfully!');
    } catch (error) {
        console.error('Error copying files:', error);
        throw error;
    }
}

async function build() {
    try {
        // Clean dist directory first
        await cleanDist();

        // Copy public files
        await copyPublicFiles();

        // Get valid entry points
        const entryPoints = await getValidEntryPoints();
        console.log('Building with entry points:', entryPoints);

        // Define environment variables for build
        const define = {
            'process.env.DEEPSEEK_API_KEY': process.env.DEEPSEEK_API_KEY ? 
                JSON.stringify(process.env.DEEPSEEK_API_KEY) : 'null',
            'process.env.API_URL': JSON.stringify(process.env.API_URL || 'https://api.deepseek.com'),
            'process.env.API_TIMEOUT': JSON.stringify(process.env.API_TIMEOUT || '30000'),
            'process.env.DEBUG_MODE': JSON.stringify(process.env.DEBUG_MODE || 'false')
        };

        const buildOptions = {
            entryPoints,
            bundle: true,
            outdir: 'dist',
            format: 'esm',
            define,
            minify: !watch,
            target: ['chrome58'],
            sourcemap: true,
            splitting: false,
            external: ['chrome'],
            outbase: 'src'
        };
        
        if (watch) {
            const context = await esbuild.context(buildOptions);
            await context.watch();
            console.log('Watching for changes...');
        } else {
            await esbuild.build(buildOptions);
            console.log('Build complete!');
        }
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

build(); 