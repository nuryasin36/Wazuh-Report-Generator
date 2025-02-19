document.addEventListener("copy", async () => {
    try {
        let text = await navigator.clipboard.readText();
        console.log("📋 Clipboard captured:", text);

        if (!text.trim()) {
            console.warn("⚠️ Clipboard is empty!");
            return;
        }

        chrome.runtime.sendMessage({ action: "saveClipboardData", data: text }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("❌ Error sending message:", chrome.runtime.lastError);
            } else {
                console.log("✅ Message sent successfully:", response);
            }

            // Cek apakah data tersimpan di chrome.storage.local
            chrome.storage.local.get("wazuh_alerts", (data) => {
                console.log("📦 Stored Alerts:", data.wazuh_alerts);
            });
        });

    } catch (err) {
        console.error("🚨 Clipboard error:", err);
    }
});