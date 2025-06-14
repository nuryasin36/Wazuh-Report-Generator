console.log("✅ Background script loaded and running!");

// Import utils.js for parsing functions
importScripts('utils.js');

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
            
            // Check for duplicates based on timestamp
            let newAlerts = parsedData.alerts.filter(newAlert => 
                !existingAlerts.some(existing => existing.timestamp === newAlert.timestamp)
            );
            
            let updatedAlerts = [...existingAlerts, ...newAlerts];
            
            chrome.storage.local.set({ wazuh_alerts: updatedAlerts }, () => {
                console.log("✅ Alerts saved:", updatedAlerts);
                // Notify popup to refresh
                chrome.runtime.sendMessage({ action: "refreshAlertsTable" });
                sendResponse({ success: true });
            });
        });

        return true; // Keep the message channel open for async response
    }

    if (message.action === "saveWAFData") {
        console.log("Processing WAF data...");
        let wafEntries = message.data;

        chrome.storage.local.get({ wafEntries: [] }, (result) => {
            let existingEntries = result.wafEntries;
            
            // Merge WAF entries, combining counts for same attack type and action
            wafEntries.forEach(newEntry => {
                let existingIndex = existingEntries.findIndex(e => 
                    e.attackType === newEntry.attackType && 
                    e.action === newEntry.action
                );

                if (existingIndex >= 0) {
                    // Update existing entry count
                    existingEntries[existingIndex].count = 
                        (parseInt(existingEntries[existingIndex].count) + 
                         parseInt(newEntry.count)).toString();
                } else {
                    // Add new entry
                    existingEntries.push(newEntry);
                }
            });

            chrome.storage.local.set({ wafEntries: existingEntries }, () => {
                console.log("✅ WAF entries saved:", existingEntries);
                // Notify popup to refresh
                chrome.runtime.sendMessage({ action: "refreshWAFTable" });
                sendResponse({ success: true });
            });
        });

        return true; // Keep the message channel open for async response
    }

    if (message.action === "getData") {
        chrome.storage.local.get(["wazuh_alerts", "wafEntries"], (result) => {
            sendResponse({ 
                success: true, 
                alerts: result.wazuh_alerts || [],
                wafEntries: result.wafEntries || []
            });
        });
        return true;
    }

    if (message.action === "deleteEntry") {
        if (message.type === "alert") {
            chrome.storage.local.get({ wazuh_alerts: [] }, (result) => {
                let updatedAlerts = result.wazuh_alerts.filter((_, index) => index !== message.index);
                chrome.storage.local.set({ wazuh_alerts: updatedAlerts }, () => {
                    sendResponse({ success: true, data: updatedAlerts });
                });
            });
        } else if (message.type === "waf") {
            chrome.storage.local.get({ wafEntries: [] }, (result) => {
                let updatedEntries = result.wafEntries.filter((_, index) => index !== message.index);
                chrome.storage.local.set({ wafEntries: updatedEntries }, () => {
                    sendResponse({ success: true, data: updatedEntries });
                });
            });
        }
        return true;
    }

    if (message.action === "updateEntry") {
        if (message.type === "alert") {
            chrome.storage.local.get({ wazuh_alerts: [] }, (result) => {
                let updatedAlerts = [...result.wazuh_alerts];
                updatedAlerts[message.index] = message.updatedData;
                chrome.storage.local.set({ wazuh_alerts: updatedAlerts }, () => {
                    sendResponse({ success: true, data: updatedAlerts });
                });
            });
        } else if (message.type === "waf") {
            chrome.storage.local.get({ wafEntries: [] }, (result) => {
                let updatedEntries = [...result.wafEntries];
                updatedEntries[message.index] = message.updatedData;
                chrome.storage.local.set({ wafEntries: updatedEntries }, () => {
                    sendResponse({ success: true, data: updatedEntries });
                });
            });
        }
        return true;
    }

    return true; // Keep the message channel open for async response
});
