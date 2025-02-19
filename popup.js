document.addEventListener("DOMContentLoaded", () => {
    // Tab switching
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", function () {
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));

            this.classList.add("active");
            document.getElementById(this.dataset.target).classList.add("active");
        });
    });

    // Load Alerts Data
    const tableBody = document.querySelector("#alertsTable tbody");
    const selectAllCheckbox = document.getElementById("selectAll");
    const prevPageBtn = document.getElementById("prevPage");
    const nextPageBtn = document.getElementById("nextPage");
    const pageInfo = document.getElementById("pageInfo");
    const rowsPerPageSelect = document.getElementById("rowsPerPage");
    const removeSelectedBtn = document.getElementById("removeSelected");
    
    let alerts = [];
    let currentPage = 1;
    let rowsPerPage = parseInt(rowsPerPageSelect.value);

    function renderTable() {
        tableBody.innerHTML = "";
        let start = (currentPage - 1) * rowsPerPage;
        let end = start + rowsPerPage;
        let paginatedData = alerts.slice(start, end);

        paginatedData.forEach((alert, index) => {
            let row = document.createElement("tr");

            row.innerHTML = `
                <td><input type="checkbox" class="rowCheckbox" data-index="${start + index}"></td>
                <td contenteditable="true" data-field="timestamp">${alert.timestamp}</td>
                <td contenteditable="true" data-field="service">${alert.service}</td>
                <td contenteditable="true" data-field="sourceIP">${alert.sourceIP}</td>
                <td contenteditable="true" data-field="destIP">${alert.destIP}</td>
                <td contenteditable="true" data-field="port">${alert.port}</td>
                <td contenteditable="true" data-field="status">${alert.status}</td>
                <td contenteditable="true" data-field="country">${alert.country}</td>
                <td contenteditable="true" data-field="attackType">${alert.attackType}</td>
                <td contenteditable="true" data-field="severity">${alert.severity}</td>
            `;

            tableBody.appendChild(row);
        });

        pageInfo.textContent = `Page ${currentPage} of ${Math.max(1, Math.ceil(alerts.length / rowsPerPage))}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage * rowsPerPage >= alerts.length;
    }

    function loadAlerts() {
        chrome.storage.local.get("wazuh_alerts", (result) => {
            alerts = result.wazuh_alerts || [];
            currentPage = 1;
            renderTable();
        });
    }

    prevPageBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    nextPageBtn.addEventListener("click", () => {
        if (currentPage * rowsPerPage < alerts.length) {
            currentPage++;
            renderTable();
        }
    });

    rowsPerPageSelect.addEventListener("change", () => {
        rowsPerPage = parseInt(rowsPerPageSelect.value);
        currentPage = 1;
        renderTable();
    });

    removeSelectedBtn.addEventListener("click", () => {
        let checkboxes = document.querySelectorAll(".rowCheckbox:checked");
        let indexesToRemove = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));

        alerts = alerts.filter((_, index) => !indexesToRemove.includes(index));

        chrome.storage.local.set({ wazuh_alerts: alerts }, () => {
            loadAlerts();
        });
    });

    loadAlerts();

    document.querySelector("#alertsTable tbody").addEventListener("input", (event) => {
        let cell = event.target;
        let row = cell.parentElement;
        let rowIndex = row.getAttribute("data-index"); // Ambil index row yang diedit
    
        if (rowIndex !== null) {
            chrome.storage.local.get("wazuh_alerts", (result) => {
                let alerts = result.wazuh_alerts || [];
                let alertIndex = parseInt(rowIndex);
    
                if (alerts[alertIndex]) {
                    let columnIndex = cell.cellIndex - 1; // Karena ada checkbox di kolom pertama
                    let headers = ["timestamp", "service", "sourceIP", "destIP", "port", "status", "country", "attackType", "severity"];
    
                    if (columnIndex >= 0 && columnIndex < headers.length) {
                        alerts[alertIndex][headers[columnIndex]] = cell.innerText;
                        chrome.storage.local.set({ wazuh_alerts: alerts }, () => {
                            console.log(`✅ Data updated: ${headers[columnIndex]} -> ${cell.innerText}`);
                        });
                    }
                }
            });
        }
    });    

    document.getElementById("generatePerAttack").addEventListener("click", () => {
        alert("🔍 Report Per Attack Generated!");
    });
    
    document.getElementById("generatePer4Hours").addEventListener("click", () => {
        alert("⏳ Report Per 4 Hours Generated!");
    });
    
});
