document.addEventListener("DOMContentLoaded", () => {
    // Tab switching
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.target;
            
            // Update active tab
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            
            tab.classList.add("active");
            document.getElementById(target).classList.add("active");
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
        if (event.target.hasAttribute('contenteditable')) {
            const row = event.target.parentElement;
            const rowIndex = Array.from(row.parentElement.children).indexOf(row);
            const field = event.target.dataset.field;
            
            chrome.storage.session.get({ ips_alerts: [] }, (result) => {
                let alerts = result.ips_alerts;
                if (alerts[rowIndex]) {
                    alerts[rowIndex][field] = event.target.textContent;
                    chrome.storage.session.set({ ips_alerts: alerts }, () => {
                        console.log('Data updated successfully');
                    });
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
    
    // WAF tab functionality
    const wafTable = document.getElementById('wafTable');
    const selectAllWaf = document.getElementById('selectAllWaf');
    // ... WAF table logic

    // Report tab functionality
    document.getElementById('generateEventReport').addEventListener('click', async () => {
        const reportOutput = document.getElementById('reportOutput');
        reportOutput.value = "Generating event report...";
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'generateEventReport'
            });
            
            if (!response) {
                throw new Error('No response from background script');
            }
            
            reportOutput.value = response.report;
        } catch (error) {
            showError(`Error generating report: ${error.message}`);
            reportOutput.value = "Error generating report. Please try again.";
        }
    });

    document.getElementById('generate4HourReport').addEventListener('click', async () => {
        const reportOutput = document.getElementById('reportOutput');
        reportOutput.value = "Generating 4-hour report...";
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'generate4HourReport'
            });
            reportOutput.value = response.report;
        } catch (error) {
            reportOutput.value = "Error generating report: " + error.message;
        }
    });

    // Error handling utilities
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        document.body.insertBefore(errorDiv, document.body.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Add loading states
    function setLoading(isLoading) {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = isLoading;
            if (isLoading) {
                button.dataset.originalText = button.textContent;
                button.textContent = 'Loading...';
            } else {
                button.textContent = button.dataset.originalText;
            }
        });
    }

    // Select All functionality untuk IPS
    document.getElementById('selectAll').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('#alertsTable .rowCheckbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });

    // Select All functionality untuk WAF
    document.getElementById('selectAllWaf').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('#wafTable .rowCheckbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });

    // WAF table edit functionality
    document.querySelector('#wafTable tbody').addEventListener('input', function(e) {
        if (e.target.hasAttribute('contenteditable')) {
            const row = e.target.parentElement;
            const rowIndex = Array.from(row.parentElement.children).indexOf(row);
            const field = e.target.dataset.field;
            
            chrome.storage.session.get({ waf_data: [] }, (result) => {
                let wafData = result.waf_data;
                if (wafData[rowIndex]) {
                    wafData[rowIndex][field] = e.target.textContent;
                    chrome.storage.session.set({ waf_data: wafData }, () => {
                        console.log('WAF data updated successfully');
                    });
                }
            });
        }
    });

    function renderIPSTable() {
        chrome.storage.session.get({ ips_alerts: [] }, (result) => {
            const tableBody = document.querySelector('#alertsTable tbody');
            tableBody.innerHTML = '';
            
            result.ips_alerts.forEach((alert, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="checkbox" class="rowCheckbox" data-index="${index}"></td>
                    <td contenteditable="true" data-field="timestamp">${alert.timestamp || ''}</td>
                    <td contenteditable="true" data-field="service">${alert.service || ''}</td>
                    <td contenteditable="true" data-field="sourceIP">${alert.sourceIP || ''}</td>
                    <td contenteditable="true" data-field="destIP">${alert.destIP || ''}</td>
                    <td contenteditable="true" data-field="port">${alert.port || ''}</td>
                    <td contenteditable="true" data-field="status">${alert.status || ''}</td>
                    <td contenteditable="true" data-field="country">${alert.country || ''}</td>
                    <td contenteditable="true" data-field="attackType">${alert.attackType || ''}</td>
                    <td contenteditable="true" data-field="severity">${alert.severity || ''}</td>
                `;
                tableBody.appendChild(row);
            });
        });
    }

    function renderWAFTable() {
        chrome.storage.session.get({ waf_data: [] }, (result) => {
            const tableBody = document.querySelector('#wafTable tbody');
            tableBody.innerHTML = '';
            
            result.waf_data.forEach((entry, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="checkbox" class="rowCheckbox" data-index="${index}"></td>
                    <td contenteditable="true" data-field="attackType">${entry.attackType || ''}</td>
                    <td contenteditable="true" data-field="status">${entry.status || ''}</td>
                    <td contenteditable="true" data-field="count">${entry.count || ''}</td>
                `;
                tableBody.appendChild(row);
            });
        });
    }

    // Panggil fungsi render saat popup dibuka dan setelah data diupdate
    renderIPSTable();
    renderWAFTable();
});
