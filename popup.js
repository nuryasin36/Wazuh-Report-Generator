document.addEventListener("DOMContentLoaded", () => {
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

            // Event listener buat edit langsung di cell
            row.querySelectorAll("td[contenteditable=true]").forEach(cell => {
                cell.addEventListener("blur", (e) => saveEdit(e, start + index));
                cell.addEventListener("keypress", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        cell.blur();
                    }
                });
            });
        });

        pageInfo.textContent = `Page ${currentPage} of ${Math.max(1, Math.ceil(alerts.length / rowsPerPage))}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage * rowsPerPage >= alerts.length;
    }

    function saveEdit(event, index) {
        let field = event.target.dataset.field;
        alerts[index][field] = event.target.textContent;

        chrome.storage.local.set({ wazuh_alerts: alerts }, () => {
            console.log("Data updated");
        });
    }

    function loadAlerts() {
        chrome.storage.local.get("wazuh_alerts", (result) => {
            alerts = result.wazuh_alerts || [];
            currentPage = 1;
            renderTable();
        });
    }

    removeSelectedBtn.addEventListener("click", () => {
        let checkboxes = document.querySelectorAll(".rowCheckbox:checked");
        let indexesToRemove = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));

        alerts = alerts.filter((_, index) => !indexesToRemove.includes(index));

        chrome.storage.local.set({ wazuh_alerts: alerts }, () => {
            loadAlerts();
        });
    });

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

    loadAlerts();
});
