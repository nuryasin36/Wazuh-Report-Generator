// Shared utility function to parse clipboard data for Wazuh alerts
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

// Check if timestamp is valid
function isValidTimestamp(timestamp) {
    return !isNaN(Date.parse(timestamp));
}

// Check if IP address is valid
function isValidIP(ip) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}

// Format severity with first letter capitalized
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

// Make functions globally available
window.parseClipboardData = parseClipboardData;
window.isValidTimestamp = isValidTimestamp;
window.isValidIP = isValidIP;
window.formatSeverity = formatSeverity;
