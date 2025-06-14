import { parseClipboardData } from './utils.js';

console.log("✅ Background script loaded and running!");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📩 Received message in background:", message);

    if (message.action === "saveClipboardData") {
        console.log("Processing clipboard data...");
        let rawData = message.data;

        let parsedData = parseClipboardData(rawData);

        if (!parsedData.valid) {
            console.error("❌ Invalid data detected:", parsedData.errors);
            sendResponse({ success: false, error: parsedData.errors });
            return;
        }

        chrome.storage.local.get({ wazuh_alerts: [] }, (result) => {
            let existingAlerts = result.wazuh_alerts;
            let updatedAlerts = [...existingAlerts, ...parsedData.alerts];
            
            chrome.storage.local.set({ wazuh_alerts: updatedAlerts }, () => {
                console.log("✅ Formatted report saved:", updatedAlerts);
                sendResponse({ success: true });
            });
        });
    }

    if (message.action === "getData") {
        chrome.storage.local.get({ wazuh_alerts: [] }, (result) => {
            sendResponse({ success: true, data: result.wazuh_alerts });
        });
        return true;
    }

    if (message.action === "deleteEntry") {
        chrome.storage.local.get({ wazuh_alerts: [] }, (result) => {
            let updatedAlerts = result.wazuh_alerts.filter((_, index) => index !== message.index);
            chrome.storage.local.set({ wazuh_alerts: updatedAlerts }, () => {
                sendResponse({ success: true, data: updatedAlerts });
            });
        });
        return true;
    }

    if (message.action === "updateEntry") {
        chrome.storage.local.get({ wazuh_alerts: [] }, (result) => {
            let updatedAlerts = [...result.wazuh_alerts];
            updatedAlerts[message.index] = message.updatedData;
            chrome.storage.local.set({ wazuh_alerts: updatedAlerts }, () => {
                sendResponse({ success: true, data: updatedAlerts });
            });
        });
        return true;
    }

    return true; // Penting untuk async response
});
