console.log("✅ Content script loaded");

// Listen for copy events
document.addEventListener('copy', function(e) {
    // Get selected text
    const selectedText = window.getSelection().toString();
    
    if (!selectedText) {
        console.log("No text selected");
        return;
    }

    console.log("📋 Text copied:", selectedText);

    // Send data to background script
    chrome.runtime.sendMessage({
        action: "saveClipboardData",
        data: selectedText
    }, response => {
        if (response && response.success) {
            console.log("✅ Data successfully processed and saved");
        } else {
            console.error("❌ Error processing data:", response?.error);
        }
    });
});

// Listen for paste events to capture WAF data
document.addEventListener('paste', async function(e) {
    try {
        const text = e.clipboardData.getData('text');
        if (!text) return;

        console.log("📋 Pasted text captured");

        // Check if it's WAF data (3 lines format)
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length % 3 === 0) {
            const wafEntries = [];
            
            for (let i = 0; i < lines.length; i += 3) {
                const attackType = lines[i];
                const action = lines[i + 1]?.toLowerCase();
                const count = lines[i + 2]?.replace(/,/g, '');

                if (action === 'blocked' || action === 'alerted') {
                    wafEntries.push({ attackType, action, count });
                }
            }

            if (wafEntries.length > 0) {
                chrome.runtime.sendMessage({
                    action: "saveWAFData",
                    data: wafEntries
                }, response => {
                    if (response && response.success) {
                        console.log("✅ WAF data saved successfully");
                    } else {
                        console.error("❌ Error saving WAF data");
                    }
                });
            }
        }
    } catch (err) {
        console.error("🚨 Error processing paste event:", err);
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "refreshData") {
        console.log("🔄 Refreshing data...");
        // You can add any refresh logic here if needed
        sendResponse({ success: true });
    }
    return true;
});
