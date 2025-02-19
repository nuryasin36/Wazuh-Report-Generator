document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.querySelector("#alertsTable tbody");
    const selectAllCheckbox = document.getElementById("selectAll");
    const removeSelectedButton = document.getElementById("removeSelected");
    const generateReportButton = document.getElementById("generateReport");
    const itemsPerPage = 10;
    let currentPage = 1;
    let alerts = [];

    function loadAlerts() {
        chrome.storage.local.get("wazuh_alerts", (result) => {
            alerts = result.wazuh_alerts || [];
            renderTable();
        });
    }

    function renderTable() {
        tableBody.innerHTML = "";
        const start = (currentPage - 1) * itemsPerPage;
        const paginatedAlerts = alerts.slice(start, start + itemsPerPage);

        paginatedAlerts.forEach((alert, index) => {
            let row = document.createElement("tr");
            row.innerHTML = `
                <td><input type="checkbox" class="rowCheckbox"></td>
                <td contenteditable="true" data-index="${start + index}" data-field="timestamp">${alert.timestamp}</td>
                <td contenteditable="true" data-index="${start + index}" data-field="service">${alert.service}</td>
                <td contenteditable="true" data-index="${start + index}" data-field="sourceIP">${alert.sourceIP}</td>
                <td contenteditable="true" data-index="${start + index}" data-field="destIP">${alert.destIP}</td>
                <td contenteditable="true" data-index="${start + index}" data-field="port">${alert.port}</td>
                <td contenteditable="true" data-index="${start + index}" data-field="status">${alert.status}</td>
                <td contenteditable="true" data-index="${start + index}" data-field="country">${alert.country}</td>
                <td contenteditable="true" data-index="${start + index}" data-field="attackType">${alert.attackType}</td>
                <td contenteditable="true" data-index="${start + index}" data-field="severity">${alert.severity}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    tableBody.addEventListener("input", (event) => {
        const cell = event.target;
        const index = cell.dataset.index;
        const field = cell.dataset.field;
        if (index !== undefined && field) {
            alerts[index][field] = cell.textContent;
            chrome.storage.local.set({ wazuh_alerts: alerts });
        }
    });

    selectAllCheckbox.addEventListener("change", () => {
        document.querySelectorAll(".rowCheckbox").forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
    });

    removeSelectedButton.addEventListener("click", () => {
        let updatedAlerts = alerts.filter((_, index) => {
            let checkbox = document.querySelector(`.rowCheckbox:nth-child(${index + 1})`);
            return !checkbox.checked;
        });

        chrome.storage.local.set({ wazuh_alerts: updatedAlerts }, () => {
            console.log("✅ Selected rows removed");
            loadAlerts();
        });
    });

    generateReportButton.addEventListener("click", () => {
        let selectedAlerts = [];
        document.querySelectorAll(".rowCheckbox").forEach((checkbox, index) => {
            if (checkbox.checked) {
                selectedAlerts.push(alerts[index]);
            }
        });

        if (selectedAlerts.length > 0) {
            console.log("📄 Report Data:", selectedAlerts);
            alert("Report generated! Check console for data.");
        } else {
            alert("No data selected!");
        }
    });

    document.getElementById("prevPage").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    document.getElementById("nextPage").addEventListener("click", () => {
        if (currentPage < Math.ceil(alerts.length / itemsPerPage)) {
            currentPage++;
            renderTable();
        }
    });

    loadAlerts();
});
