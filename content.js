// Test script loaded
console.log("Content script loaded and running");

// Listen to copy with keyboard
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'c') {
        console.log("Ctrl+C detected");
        setTimeout(processClipboard, 100); // Give time for copy to complete
    }
});

// Listen to copy with context menu
document.addEventListener('copy', function(e) {
    console.log("Copy event detected");
    setTimeout(processClipboard, 100);
});

async function processClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        console.log("Clipboard content:", text);

        if (!text || !text.trim()) {
            console.log("Empty clipboard");
            return;
        }

        const lines = text.trim().split("\n");
        console.log("Number of lines:", lines.length);
        console.log("First line:", lines[0]);

        // Check if it's IPS data (has timestamp with @)
        if (lines[0].includes('@')) {
            console.log("Detected as IPS data");
            chrome.runtime.sendMessage({
                action: "saveIPSData",
                data: text
            }, response => {
                console.log("Response from background:", response);
            });
        }
        // Check if it's WAF data (has tabs)
        else if (lines[0].includes('\t')) {
            console.log("Detected as WAF data");
            chrome.runtime.sendMessage({
                action: "saveWAFData",
                data: text
            }, response => {
                console.log("Response from background:", response);
            });
        } else {
            console.log("Unknown data format");
        }
    } catch (error) {
        console.error("Error processing clipboard:", error);
    }
}

// Test message passing
chrome.runtime.sendMessage({
    action: "test",
    data: "Test message from content script"
}, response => {
    console.log("Test message response:", response);
});

// Listen untuk pesan dari popup atau background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageData") {
        // Logic untuk mengambil data dari halaman web jika diperlukan
        sendResponse({data: "Page data here"});
    }
});
