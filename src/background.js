// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

// Track injected tabs
const injectedTabs = new Set();

// Function to inject content script
async function injectContentScript(tabId) {
    if (injectedTabs.has(tabId)) {
        console.log('Content script already injected in tab:', tabId);
        return;
    }

    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });
        injectedTabs.add(tabId);
        console.log('Content script injected in tab:', tabId);
    } catch (err) {
        console.error('Script injection failed:', err);
    }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url?.includes('youtube.com')) {  // Changed from mail.google.com to youtube.com
        if (changeInfo.status === 'loading') {
            // Remove from injected set when page starts loading
            injectedTabs.delete(tabId);
        } else if (changeInfo.status === 'complete') {
            console.log('YouTube tab updated, injecting content script');  // Updated log message
            injectContentScript(tabId);
        }
    }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabs.delete(tabId);
});

// Listen for content script connection issues
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'contentScriptLoaded') {
        console.log('Content script loaded in tab:', sender.tab?.id);
        if (sender.tab?.id) {
            injectedTabs.add(sender.tab.id);
        }
        sendResponse({ status: 'acknowledged' });
        return true;
    }
});
