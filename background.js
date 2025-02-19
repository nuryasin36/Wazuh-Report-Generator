// ✅ Background script with CRUD & Pagination support

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

// 🛠️ Parsing dan validasi clipboard data
function parseClipboardData(rawData) {
    console.log("Parsing clipboard data...");

    let lines = rawData.replace(/\r/g, "").split("\n").map(line => line.trim()).filter(line => line);
    console.log("Parsed lines:", lines);

    if (lines.length < 9) {
        console.error("❌ Insufficient data:", lines);
        return { valid: false, errors: ["Data too short"], alerts: [] };
    }

    let alerts = [];
    let errors = [];

    for (let i = 0; i < lines.length; i += 9) {
        if (i + 8 >= lines.length) {
            errors.push(`Incomplete data at row ${i / 9 + 1}`);
            continue;
        }

        let alert = {
            timestamp: lines[i],
            service: lines[i + 1],
            sourceIP: lines[i + 2],
            destIP: lines[i + 3],
            port: lines[i + 4],
            status: lines[i + 5],
            country: lines[i + 6],
            attackType: lines[i + 7],
            severity: formatSeverity(lines[i + 8])
        };

        console.log(`Row ${i / 9 + 1}:`, alert);

        if (!isValidTimestamp(alert.timestamp)) errors.push(`Invalid timestamp: ${alert.timestamp}`);
        if (!isValidIP(alert.sourceIP)) errors.push(`Invalid source IP: ${alert.sourceIP}`);
        if (!isValidIP(alert.destIP)) errors.push(`Invalid destination IP: ${alert.destIP}`);

        alerts.push(alert);
    }

    console.log("Final parsed alerts:", alerts);

    return {
        valid: errors.length === 0,
        errors,
        alerts
    };
}

// 🔍 Cek validitas timestamp
function isValidTimestamp(timestamp) {
    return !isNaN(Date.parse(timestamp));
}

// 🔍 Cek validitas IP Address
function isValidIP(ip) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}

// 🔄 Format severity jadi kapitalisasi pertama
function formatSeverity(severity) {
    let lowerCaseSeverity = severity.toLowerCase();
    let formatted = {
        "critical": "Critical",
        "high": "High",
        "medium": "Medium",
        "low": "Low"
    };
    return formatted[lowerCaseSeverity] || severity;
}
