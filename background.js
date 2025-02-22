// ✅ Background script with CRUD & Pagination support

console.log("✅ Background script loaded and running!");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background script received message:", message);

    if (message.action === "test") {
        console.log("Received test message");
        sendResponse({status: "OK"});
        return true;
    }

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

    if (message.action === "saveIPSData") {
        console.log("Processing IPS data...");
        processIPSData(message.data, sendResponse);
        return true;
    }
    
    if (message.action === "saveWAFData") {
        console.log("Processing WAF data...");
        processWAFData(message.data, sendResponse);
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

function processIPSData(rawData, sendResponse) {
    console.log("Raw IPS data:", rawData);
    let lines = rawData.split("\n").map(line => line.trim()).filter(line => line);
    console.log("Processed lines:", lines);
    
    for (let i = 0; i < lines.length; i += 9) {
        if (i + 8 >= lines.length) {
            console.log("Skipping incomplete data at index", i);
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
            severity: lines[i + 8]
        };
        console.log("Created alert object:", alert);

        chrome.storage.session.get({ ips_alerts: [] }, (result) => {
            console.log("Current IPS alerts:", result.ips_alerts);
            const isDuplicate = result.ips_alerts.some(existing => 
                existing.timestamp === alert.timestamp && 
                existing.sourceIP === alert.sourceIP && 
                existing.attackType === alert.attackType
            );
            
            if (!isDuplicate) {
                const updatedAlerts = [...result.ips_alerts, alert];
                chrome.storage.session.set({ ips_alerts: updatedAlerts }, () => {
                    console.log('IPS alert saved:', alert);
                    if (chrome.runtime.lastError) {
                        console.error('Storage error:', chrome.runtime.lastError);
                    }
                });
            } else {
                console.log("Duplicate alert found, skipping");
            }
        });
    }
}

function processWAFData(rawData, sendResponse) {
    console.log("=== WAF Data Processing Start ===");
    console.log("Raw WAF data:", rawData);
    
    let lines = rawData.split("\n")
        .map(line => line.trim())
        .filter(line => line);
    console.log("Filtered lines:", lines);
    
    // Process lines in groups of 3
    for (let i = 0; i < lines.length; i += 3) {
        console.log(`Processing group ${i/3 + 1}:`);
        console.log("Line 1 (Attack Type):", lines[i]);
        console.log("Line 2 (Status):", lines[i + 1]);
        console.log("Line 3 (Count):", lines[i + 2]);

        if (i + 2 >= lines.length) {
            console.log("Skipping incomplete group");
            continue;
        }

        const attackType = lines[i];
        const status = lines[i + 1];
        const count = lines[i + 2];

        if (attackType && status && count) {
            const wafEntry = {
                attackType: attackType,
                status: status,
                count: parseInt(count.replace(/,/g, ''))
            };
            console.log("Created WAF entry:", wafEntry);

            chrome.storage.session.get({ waf_data: [] }, (result) => {
                console.log("Current WAF data in storage:", result.waf_data);
                const isDuplicate = result.waf_data.some(existing =>
                    existing.attackType === wafEntry.attackType &&
                    existing.status === wafEntry.status
                );
                console.log("Is duplicate entry?", isDuplicate);

                if (!isDuplicate) {
                    const updatedData = [...result.waf_data, wafEntry];
                    console.log("Saving updated WAF data:", updatedData);
                    chrome.storage.session.set({ waf_data: updatedData }, () => {
                        console.log('WAF entry saved successfully:', wafEntry);
                        if (chrome.runtime.lastError) {
                            console.error('Storage error:', chrome.runtime.lastError);
                        }
                    });
                } else {
                    console.log("Skipping duplicate entry");
                }
            });
        } else {
            console.log("Invalid data in group, skipping");
        }
    }
    console.log("=== WAF Data Processing End ===");
}

// Generate report berdasarkan data yang diselect
function generateEventReport(selectedData) {
    let report = "Event Report\n";
    report += "Generated at: " + new Date().toLocaleString() + "\n\n";
    
    selectedData.forEach(data => {
        report += `Time: ${data.timestamp}\n`;
        report += `Attack: ${data.attackType}\n`;
        report += `Source: ${data.sourceIP}\n`;
        report += "------------------------\n";
    });
    
    return report;
}

// Generate report 4 jam
let lastReportTime = null;
setInterval(() => {
    let now = new Date();
    if (!lastReportTime || (now - lastReportTime) >= 4 * 60 * 60 * 1000) {
        generate4HourReport();
        lastReportTime = now;
    }
}, 60000); // Cek setiap menit

async function generate4HourReport() {
    const [ipsData, wafData] = await Promise.all([
        chrome.storage.session.get('ips_alerts'),
        chrome.storage.session.get('waf_data')
    ]);
    
    let report = "4-Hour Summary Report\n";
    report += "Period: " + new Date(Date.now() - 4*60*60*1000).toLocaleString();
    report += " to " + new Date().toLocaleString() + "\n\n";
    
    // Proses data IPS
    report += "IPS Events:\n";
    // ... format IPS data ...
    
    // Proses data WAF
    report += "\nWAF Events:\n";
    // ... format WAF data ...
    
    return report;
}
