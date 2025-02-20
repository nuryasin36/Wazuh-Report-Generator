document.addEventListener("copy", async () => {
    try {
        let text = await navigator.clipboard.readText();
        console.log("📋 Clipboard captured:", text);

        if (!text.trim()) {
            console.warn("⚠️ Clipboard is empty!");
            return;
        }

        let rows = text.trim().split("\n");
        let timestampRegex = /\w{3} \d{1,2}, \d{4} @ \d{2}:\d{2}:\d{2}\.\d{3}/;
        let wafData = [];

        rows.forEach(row => {
            if (!timestampRegex.test(row)) {
                let cols = row.split("\t");
                if (cols.length === 3) {
                    let attackType = cols[0].trim();
                    let status = cols[1].trim();
                    let count = cols[2].trim();

                    wafData.push({ attackType, status, count });
                }
            }
        });

        if (wafData.length > 0) {
            chrome.storage.local.get({ wafEntries: [] }, (data) => {
                let storedData = data.wafEntries || [];

                wafData.forEach(newEntry => {
                    let exists = storedData.some(entry =>
                        entry.attackType === newEntry.attackType &&
                        entry.status === newEntry.status
                    );

                    if (!exists) {
                        storedData.push(newEntry);
                    }
                });

                chrome.storage.local.set({ wafEntries: storedData }, () => {
                    console.log("✅ WAF Data Saved:", storedData);
                });
            });
        } else {
            chrome.runtime.sendMessage({ action: "saveClipboardData", data: text }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("❌ Error sending message:", chrome.runtime.lastError);
                } else {
                    console.log("✅ Message sent successfully:", response);
                }
            });
        }

    } catch (err) {
        console.error("🚨 Clipboard error:", err);
    }
});
