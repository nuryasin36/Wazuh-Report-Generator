// List kemungkinan attack types
const possibleAttacks = [
    "Information Leakage",
    "HTTP Parser Attack",
    "Abuse of Functionality",
    "Non-browser Client",
    "Vulnerability Scan",
    "Buffer Overflow",
    "Forceful Browsing",
    "Injection Attempt",
    "Detection Evasion"
];

document.addEventListener("copy", async () => {
    try {
        // Baca data dari clipboard
        let text = await navigator.clipboard.readText();
        console.log("📋 Clipboard captured:", text);

        // Jika clipboard kosong, hentikan proses
        if (!text.trim()) {
            console.warn("⚠️ Clipboard is empty!");
            return;
        }

        // Pisahkan data menjadi baris-baris dan bersihkan
        let rows = text
            .split("\n") // Pisahkan berdasarkan newline
            .map(row => row.trim()) // Hilangkan spasi di awal dan akhir
            .filter(row => row.length > 0); // Hapus baris kosong

        console.log("🧹 Cleaned rows:", rows);

        // Cek apakah baris pertama adalah timestamp
        let firstRow = rows[0];
        let timestampRegex = /\w{3} \d{1,2}, \d{4} @ \d{2}:\d{2}:\d{2}\.\d{3}/;

        if (timestampRegex.test(firstRow)) {
            // Jika baris pertama adalah timestamp, masukkan ke IPS (Alerts)
            console.log("✅ Data is for IPS (Alerts)");
            chrome.storage.local.get("wazuh_alerts", (result) => {
                let existingAlerts = result.wazuh_alerts || [];
                let newAlerts = parseClipboardData(text).alerts;

                // Cek duplikasi berdasarkan timestamp
                newAlerts.forEach(newAlert => {
                    let exists = existingAlerts.some(alert => alert.timestamp === newAlert.timestamp);
                    if (!exists) {
                        existingAlerts.push(newAlert);
                    }
                });

                // Simpan data ke storage
                chrome.storage.local.set({ wazuh_alerts: existingAlerts }, () => {
                    console.log("✅ Alerts saved without duplicates.");
                    // Kirim pesan ke popup.js untuk render ulang tabel
                    chrome.runtime.sendMessage({ action: "refreshAlertsTable" });
                });
            });
        } else {
            // Cek apakah data mengandung jenis serangan (untuk WAF)
            let isWAFData = false;
            let wafEntries = [];

            // Loop melalui setiap baris data (per 3 baris)
            for (let i = 0; i < rows.length; i += 3) {
                let attackTypeRow = rows[i];
                let actionRow = rows[i + 1];
                let countRow = rows[i + 2];

                // Pastikan ada 3 baris yang valid
                if (attackTypeRow && actionRow && countRow) {
                    // Validasi action (hanya "alerted" atau "blocked")
                    let validActions = ["alerted", "blocked"];
                    if (validActions.includes(actionRow.toLowerCase())) {
                        isWAFData = true;

                        // Bersihkan dan format data
                        let attackType = attackTypeRow; // Biarkan multiple attack types dalam satu cell
                        let action = actionRow.trim().toLowerCase();
                        let count = countRow.replace(/,/g, "").trim(); // Hapus koma dari angka

                        wafEntries.push({ attackType, action, count });
                    }
                }
            }

            if (isWAFData) {
                // Jika data mengandung jenis serangan, masukkan ke WAF
                console.log("✅ Data is for WAF. Entries to be saved:", wafEntries);
                chrome.storage.local.get({ wafEntries: [] }, (data) => {
                    let storedData = data.wafEntries || [];

                    // Tambahkan data baru ke storage jika belum ada
                    wafEntries.forEach(newEntry => {
                        let exists = storedData.some(entry =>
                            entry.attackType === newEntry.attackType &&
                            entry.action === newEntry.action
                        );

                        if (!exists) {
                            storedData.push(newEntry);
                        }
                    });

                    // Simpan data ke chrome.storage.local
                    chrome.storage.local.set({ wafEntries: storedData }, () => {
                        console.log("✅ WAF Data Saved:", storedData);
                        // Cek apakah data benar-benar tersimpan
                        chrome.storage.local.get("wafEntries", (result) => {
                            console.log("🔄 Data in storage:", result.wafEntries);
                        });
                    });
                });
            } else {
                // Jika tidak memenuhi kedua kondisi, abaikan data
                console.log("❌ Data is not for IPS or WAF. Ignoring...");
            }
        }

    } catch (err) {
        console.error("🚨 Clipboard error:", err);
    }
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