document.addEventListener("DOMContentLoaded", () => {
    // Cache for alerts and WAF data
    let alerts = [];
    let wafEntries = [];

    // Load initial data
    loadData();

    // Tab switching
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", function() {
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));

            this.classList.add("active");
            document.getElementById(this.dataset.target).classList.add("active");

            // Load data when switching tabs
            if (this.dataset.target === "wafTab") {
                renderWAFTable();
            } else if (this.dataset.target === "alertsTab") {
                renderAlertsTable();
            }
        });
    });

    // Alerts Table Configuration
    const alertsTableBody = document.querySelector("#alertsTable tbody");
    const alertsPerPage = document.getElementById("rowsPerPage");
    const prevPageBtn = document.getElementById("prevPage");
    const nextPageBtn = document.getElementById("nextPage");
    const pageInfo = document.getElementById("pageInfo");
    let currentAlertsPage = 1;

    // WAF Table Configuration
    const wafTableBody = document.querySelector("#wafTable tbody");
    const wafPerPage = document.getElementById("rowsPerPageWAF");
    const prevPageWAFBtn = document.getElementById("prevPageWAF");
    const nextPageWAFBtn = document.getElementById("nextPageWAF");
    const pageInfoWAF = document.getElementById("pageInfoWAF");
    let currentWAFPage = 1;

    // Load all data from storage
    function loadData() {
        chrome.runtime.sendMessage({ action: "getData" }, response => {
            if (response && response.success) {
                alerts = response.alerts || [];
                wafEntries = response.wafEntries || [];
                renderAlertsTable();
                renderWAFTable();
            }
        });
    }

    // Render Alerts Table
    function renderAlertsTable() {
        const start = (currentAlertsPage - 1) * parseInt(alertsPerPage.value);
        const end = start + parseInt(alertsPerPage.value);
        const pageData = alerts.slice(start, end);

        alertsTableBody.innerHTML = '';
        pageData.forEach((alert, index) => {
            const row = document.createElement('tr');
            const actualIndex = start + index;
            row.setAttribute('data-index', actualIndex);
            row.innerHTML = `
                <td><input type="checkbox" class="rowCheckbox"></td>
                <td class="px-4 py-2">${alert.timestamp}</td>
                <td class="px-4 py-2">${alert.service}</td>
                <td class="px-4 py-2">${alert.sourceIP}</td>
                <td class="px-4 py-2">${alert.destIP}</td>
                <td class="px-4 py-2">${alert.port}</td>
                <td class="px-4 py-2">${alert.status}</td>
                <td class="px-4 py-2">${alert.country}</td>
                <td class="px-4 py-2">${alert.attackType}</td>
                <td class="px-4 py-2">${alert.severity}</td>
                <td class="px-4 py-2">
                    <button class="approveBtn">✔️</button>
                    <button class="declineBtn">❌</button>
                </td>
            `;
            alertsTableBody.appendChild(row);
        });

        updateAlertsPageInfo();
    }

    // Render WAF Table
    function renderWAFTable() {
        const start = (currentWAFPage - 1) * parseInt(wafPerPage.value);
        const end = start + parseInt(wafPerPage.value);
        const pageData = wafEntries.slice(start, end);

        wafTableBody.innerHTML = '';
        pageData.forEach((entry, index) => {
            const row = document.createElement('tr');
            const actualIndex = start + index;
            row.setAttribute('data-index', actualIndex);
            row.innerHTML = `
                <td><input type="checkbox" class="rowCheckbox"></td>
                <td class="px-4 py-2">${entry.attackType}</td>
                <td class="px-4 py-2">${entry.action}</td>
                <td class="px-4 py-2">${entry.count}</td>
            `;
            wafTableBody.appendChild(row);
        });

        updateWAFPageInfo();
    }

    // Update page information
    function updateAlertsPageInfo() {
        const totalPages = Math.ceil(alerts.length / parseInt(alertsPerPage.value));
        pageInfo.textContent = `Page ${currentAlertsPage} of ${totalPages}`;
        prevPageBtn.disabled = currentAlertsPage === 1;
        nextPageBtn.disabled = currentAlertsPage === totalPages;
    }

    function updateWAFPageInfo() {
        const totalPages = Math.ceil(wafEntries.length / parseInt(wafPerPage.value));
        pageInfoWAF.textContent = `Page ${currentWAFPage} of ${totalPages}`;
        prevPageWAFBtn.disabled = currentWAFPage === 1;
        nextPageWAFBtn.disabled = currentWAFPage === totalPages;
    }

    // Pagination event listeners
    prevPageBtn.addEventListener("click", () => {
        if (currentAlertsPage > 1) {
            currentAlertsPage--;
            renderAlertsTable();
        }
    });

    nextPageBtn.addEventListener("click", () => {
        const totalPages = Math.ceil(alerts.length / parseInt(alertsPerPage.value));
        if (currentAlertsPage < totalPages) {
            currentAlertsPage++;
            renderAlertsTable();
        }
    });

    prevPageWAFBtn.addEventListener("click", () => {
        if (currentWAFPage > 1) {
            currentWAFPage--;
            renderWAFTable();
        }
    });

    nextPageWAFBtn.addEventListener("click", () => {
        const totalPages = Math.ceil(wafEntries.length / parseInt(wafPerPage.value));
        if (currentWAFPage < totalPages) {
            currentWAFPage++;
            renderWAFTable();
        }
    });

    // Rows per page change handlers
    alertsPerPage.addEventListener("change", () => {
        currentAlertsPage = 1;
        renderAlertsTable();
    });

    wafPerPage.addEventListener("change", () => {
        currentWAFPage = 1;
        renderWAFTable();
    });

    // Select all checkboxes
    document.getElementById("selectAll").addEventListener("click", (e) => {
        const checkboxes = alertsTableBody.querySelectorAll(".rowCheckbox");
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById("selectAllWAF").addEventListener("click", (e) => {
        const checkboxes = wafTableBody.querySelectorAll(".rowCheckbox");
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });

    // Remove selected items
    document.getElementById("removeSelected").addEventListener("click", () => {
        const selectedRows = alertsTableBody.querySelectorAll(".rowCheckbox:checked");
        const selectedIndexes = Array.from(selectedRows).map(cb => 
            parseInt(cb.closest("tr").getAttribute("data-index"))
        );

        alerts = alerts.filter((_, index) => !selectedIndexes.includes(index));
        chrome.storage.local.set({ wazuh_alerts: alerts }, () => {
            currentAlertsPage = 1;
            renderAlertsTable();
        });
    });

    document.getElementById("removeSelectedWAF").addEventListener("click", () => {
        const selectedRows = wafTableBody.querySelectorAll(".rowCheckbox:checked");
        const selectedIndexes = Array.from(selectedRows).map(cb => 
            parseInt(cb.closest("tr").getAttribute("data-index"))
        );

        wafEntries = wafEntries.filter((_, index) => !selectedIndexes.includes(index));
        chrome.storage.local.set({ wafEntries: wafEntries }, () => {
            currentWAFPage = 1;
            renderWAFTable();
        });
    });

    // Report generation
    document.getElementById("generatePerAlert").addEventListener("click", () => {
        const report = generatePerAlertReport(alerts);
        document.getElementById("reportOutput").value = report;
    });

    document.getElementById("generatePer4Hours").addEventListener("click", () => {
        const report = generate4HourReport(alerts, wafEntries);
        document.getElementById("reportOutput").value = report;
    });

    // Report actions
    document.getElementById("saveReport").addEventListener("click", () => {
        const report = document.getElementById("reportOutput").value;
        if (!report) {
            alert("No report to save!");
            return;
        }

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wazuh_report.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById("copyReport").addEventListener("click", () => {
        const report = document.getElementById("reportOutput").value;
        if (!report) {
            alert("No report to copy!");
            return;
        }

        navigator.clipboard.writeText(report)
            .then(() => alert("Report copied to clipboard!"))
            .catch(err => console.error("Failed to copy report:", err));
    });

    // Listen for refresh messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "refreshAlertsTable" || message.action === "refreshWAFTable") {
            loadData();
        }
    });
});

// Report generation functions
function generatePerAlertReport(alerts) {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    
    const recentAlerts = alerts.filter(alert => {
        const alertTime = new Date(alert.timestamp);
        return alertTime >= tenMinutesAgo && alertTime <= now;
    });

    if (recentAlerts.length === 0) {
        return "No alerts found in the last 10 minutes.";
    }

    let report = "";
    recentAlerts.forEach((alert, index) => {
        report += `Report Attack ${index + 1}\n`;
        report += `Kami informasikan adanya Aktivitas mencurigakan yang berasal dari IP ${alert.sourceIP} (${alert.country}) yang melakukan akses ke IP ${alert.destIP}. `;
        report += `IP ${alert.sourceIP} (${alert.country}) ini melakukan komunikasi ke IP External terpantau dengan severity = ${alert.severity}, `;
        report += `Aktivitas dari IP ini terpantau dengan status ${alert.status} dari IPS.\n\n`;
        report += `Berikut merupakan beberapa serangan yang dilakukan terpantau pada Dashboard IPS Fortigate Wazuh:\n\n`;
        report += `\t1. ${alert.attackType} | ${alert.status}\n\n`;
        report += `Recommendation & Remediation: Dari IP ${alert.destIP} sudah kami lakukan penambahan pada list IP di platform SOC Radar.\n\n`;
    });

    return report;
}

function generate4HourReport(alerts, wafEntries) {
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    
    const recentAlerts = alerts.filter(alert => {
        const alertTime = new Date(alert.timestamp);
        return alertTime >= fourHoursAgo && alertTime <= now;
    });

    let report = `Dear Team,\n\n`;
    report += `Berikut kami laporkan mengenai aktivitas monitoring selama 4 jam pada Pukul ${fourHoursAgo.toLocaleTimeString()} - ${now.toLocaleTimeString()}, `;
    report += `${now.toLocaleDateString()} Berdasarkan aktivitas monitoring SIEM yang dilakukan pada FortiAnalyzer dan WAF.\n\n`;
    
    // Add sections for different monitoring areas
    report += generateMonitoringSection("FortiAnalyzer", recentAlerts);
    report += generateWAFSection(wafEntries);
    report += generateLicenseSection();

    return report;
}

function generateMonitoringSection(title, alerts) {
    let section = `====================================\n`;
    section += `${title}\n\n`;
    
    // Group alerts by type
    const groupedAlerts = {};
    alerts.forEach(alert => {
        const key = `${alert.attackType}-${alert.status}`;
        if (!groupedAlerts[key]) {
            groupedAlerts[key] = { count: 0, alert };
        }
        groupedAlerts[key].count++;
    });

    // Add grouped alerts to report
    Object.values(groupedAlerts).forEach((group, index) => {
        section += `    ${String.fromCharCode(97 + index)}. ${group.alert.attackType} = ${group.count} | ${group.alert.status}\n`;
    });

    section += `\n`;
    return section;
}

function generateWAFSection(wafEntries) {
    let section = `====================================\n`;
    section += `WAF Monitoring\n\n`;

    wafEntries.forEach((entry, index) => {
        section += `    ${String.fromCharCode(97 + index)}. ${entry.attackType} = ${entry.count} | ${entry.action}\n`;
    });

    section += `\n`;
    return section;
}

function generateLicenseSection() {
    let section = `====================================\n`;
    section += `License Information\n\n`;
    section += `   a. IPS\n`;
    section += `      License expired IPS: 16-02-2025\n`;
    section += `      IPS Definitions Version : 27.00755 | Last Update: 26 Maret 2024\n`;
    section += `   b. WAF Latest Version/Update : 2024-03-27 15:19:12\n`;
    section += `   c. Suricata Last Version : 6.0.4 | 18 November 2021 (Latest Version)\n`;
    section += `   d. Wazuh 4.7.2 version | 17 February 2024 (Latest Version)\n\n`;
    
    return section;
}
