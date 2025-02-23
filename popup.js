document.addEventListener("DOMContentLoaded", () => {
    // Load data saat popup pertama kali dibuka
    loadAlerts();

    // Tab switching
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", function () {
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));

            this.classList.add("active");
            document.getElementById(this.dataset.target).classList.add("active");

            // Load data saat tab di-switch
            if (this.dataset.target === "wafTab") {
                console.log("🔄 WAF Tab clicked");
                loadWAFData();
            } else if (this.dataset.target === "alertsTab") {
                loadAlerts();
            }
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
    let sortColumn = "timestamp"; // Default sort column for IPS
    let sortDirection = "desc"; // Default sort direction for IPS

    // Prioritas severity
    const severityPriority = {
        "Critical": 4,
        "High": 3,
        "Medium": 2,
        "Low": 1
    };

    // Fungsi untuk mengurutkan severity berdasarkan kelompok
    function sortBySeverity(a, b, direction) {
        let priorityA = severityPriority[a.severity] || 0;
        let priorityB = severityPriority[b.severity] || 0;

        if (direction === "asc") {
            return priorityA - priorityB; // Low -> Medium -> High -> Critical
        } else {
            return priorityB - priorityA; // Critical -> High -> Medium -> Low
        }
    }

    // Update simbol panah di header kolom IPS
    function updateSortIcons() {
        document.querySelectorAll("#alertsTable th").forEach(header => {
            let icon = header.querySelector(".sort-icon");
            if (header.getAttribute("data-field") === sortColumn) {
                icon.classList.add(sortDirection);
                icon.classList.remove(sortDirection === "asc" ? "desc" : "asc");
            } else {
                icon.classList.remove("asc", "desc");
            }
        });
    }

    function renderTable() {
        tableBody.innerHTML = "";
        let start = (currentPage - 1) * rowsPerPage;
        let end = start + rowsPerPage;

        // Ambil data dari chrome.storage.local
        chrome.storage.local.get("wazuh_alerts", (result) => {
            let alerts = result.wazuh_alerts || [];

            // Sort data berdasarkan kolom dan arah yang dipilih
            if (sortColumn === "severity") {
                alerts.sort((a, b) => sortBySeverity(a, b, sortDirection));
            } else {
                alerts.sort((a, b) => {
                    if (a[sortColumn] < b[sortColumn]) return sortDirection === "asc" ? -1 : 1;
                    if (a[sortColumn] > b[sortColumn]) return sortDirection === "asc" ? 1 : -1;
                    return 0;
                });
            }

            let paginatedData = alerts.slice(start, end);

            paginatedData.forEach((alert, index) => {
                let row = document.createElement("tr");
                row.setAttribute("data-index", start + index); // Tambahkan data-index ke row

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
                    <td>
                        <button class="approveBtn" style="display: none;">✔️</button>
                        <button class="declineBtn" style="display: none;">❌</button>
                    </td>
                `;

                tableBody.appendChild(row);
            });

            // Update simbol panah di header kolom IPS
            updateSortIcons();

            // Update informasi halaman
            pageInfo.textContent = `Page ${currentPage} of ${Math.ceil(alerts.length / rowsPerPage)}`;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage * rowsPerPage >= alerts.length;
        });
    }

    function loadAlerts() {
        chrome.storage.local.get("wazuh_alerts", (result) => {
            if (chrome.runtime.lastError) {
                console.error("❌ Failed to load alerts:", chrome.runtime.lastError);
                return;
            }
            alerts = result.wazuh_alerts || [];
            currentPage = 1;
            renderTable();
        });
    }

    // Select All untuk Alerts
    selectAllCheckbox.addEventListener("click", () => {
        let checkboxes = document.querySelectorAll(".rowCheckbox");
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
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

    removeSelectedBtn.addEventListener("click", () => {
        let checkboxes = document.querySelectorAll(".rowCheckbox:checked");
        let indexesToRemove = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));

        chrome.storage.local.get("wazuh_alerts", (result) => {
            let alerts = result.wazuh_alerts || [];
            alerts = alerts.filter((_, index) => !indexesToRemove.includes(index));

            // Simpan data yang sudah dihapus ke storage
            chrome.storage.local.set({ wazuh_alerts: alerts }, () => {
                console.log("✅ Selected rows removed and saved.");
                loadAlerts(); // Render ulang tabel setelah menghapus
                document.getElementById("selectAll").checked = false; // Uncheck Select All
            });
        });
    });

    // Edit Data Alerts
    document.querySelector("#alertsTable tbody").addEventListener("input", (event) => {
        let cell = event.target;
        let row = cell.parentElement;

        // Tandai baris yang sedang diedit dengan garis merah
        row.style.border = "2px solid red";

        // Tampilkan tombol approve dan decline
        let approveBtn = row.querySelector(".approveBtn");
        let declineBtn = row.querySelector(".declineBtn");
        approveBtn.style.display = "inline-block";
        declineBtn.style.display = "inline-block";

        // Hapus event listener sebelumnya (jika ada)
        approveBtn.replaceWith(approveBtn.cloneNode(true));
        declineBtn.replaceWith(declineBtn.cloneNode(true));

        // Simpan perubahan saat tombol approve diklik
        row.querySelector(".approveBtn").addEventListener("click", () => {
            let rowIndex = parseInt(row.getAttribute("data-index"));
            if (!isNaN(rowIndex)) {
                chrome.storage.local.get("wazuh_alerts", (result) => {
                    let alerts = result.wazuh_alerts || [];
                    let updatedAlert = {};

                    // Ambil data dari sel yang diedit
                    row.querySelectorAll("[contenteditable=true]").forEach(cell => {
                        let field = cell.getAttribute("data-field");
                        updatedAlert[field] = cell.innerText;
                    });

                    // Update data di storage
                    alerts[rowIndex] = updatedAlert;
                    chrome.storage.local.set({ wazuh_alerts: alerts }, () => {
                        console.log("✅ Data updated and saved.");
                        row.style.border = ""; // Hapus garis merah
                        approveBtn.style.display = "none"; // Sembunyikan tombol
                        declineBtn.style.display = "none"; // Sembunyikan tombol

                        // Tetap di halaman yang sama setelah menyimpan perubahan
                        renderTable();
                    });
                });
            }
        });

        // Batalkan perubahan saat tombol decline diklik
        row.querySelector(".declineBtn").addEventListener("click", () => {
            let rowIndex = parseInt(row.getAttribute("data-index"));
            if (!isNaN(rowIndex)) {
                chrome.storage.local.get("wazuh_alerts", (result) => {
                    let alerts = result.wazuh_alerts || [];
                    let originalAlert = alerts[rowIndex];

                    // Kembalikan data ke keadaan semula
                    row.querySelectorAll("[contenteditable=true]").forEach(cell => {
                        let field = cell.getAttribute("data-field");
                        cell.innerText = originalAlert[field];
                    });

                    row.style.border = ""; // Hapus garis merah
                    approveBtn.style.display = "none"; // Sembunyikan tombol
                    declineBtn.style.display = "none"; // Sembunyikan tombol
                });
            }
        });
    });

    // Sort Data untuk IPS
    document.querySelectorAll("#alertsTable th").forEach(header => {
        header.addEventListener("click", () => {
            let column = header.getAttribute("data-field");
            if (column) {
                if (sortColumn === column) {
                    sortDirection = sortDirection === "asc" ? "desc" : "asc";
                } else {
                    sortColumn = column;
                    sortDirection = "asc";
                }
                renderTable();
            }
        });
    });

    // WAF Tab Functionality
    const wafTableBody = document.querySelector("#wafTable tbody");
    const selectAllWAFCheckbox = document.getElementById("selectAllWAF");
    const prevPageWAFBtn = document.getElementById("prevPageWAF");
    const nextPageWAFBtn = document.getElementById("nextPageWAF");
    const pageInfoWAF = document.getElementById("pageInfoWAF");
    const rowsPerPageWAFSelect = document.getElementById("rowsPerPageWAF");
    const removeSelectedWAFBtn = document.getElementById("removeSelectedWAF");

    let wafData = [];
    let currentPageWAF = 1;
    let rowsPerPageWAF = parseInt(rowsPerPageWAFSelect.value);
    let sortColumnWAF = "count"; // Default sort column for WAF
    let sortDirectionWAF = "desc"; // Default sort direction for WAF

    function renderWAFTable() {
        wafTableBody.innerHTML = "";
        let start = (currentPageWAF - 1) * rowsPerPageWAF;
        let end = start + rowsPerPageWAF;

        // Ambil data dari chrome.storage.local
        chrome.storage.local.get("wafEntries", (result) => {
            let wafData = result.wafEntries || [];

            // Sort data berdasarkan kolom dan arah yang dipilih
            wafData.sort((a, b) => {
                let valueA, valueB;

                if (sortColumnWAF === "count") {
                    // Konversi count ke integer
                    valueA = parseInt(a[sortColumnWAF]);
                    valueB = parseInt(b[sortColumnWAF]);
                } else {
                    valueA = a[sortColumnWAF];
                    valueB = b[sortColumnWAF];
                }

                if (valueA < valueB) return sortDirectionWAF === "asc" ? -1 : 1;
                if (valueA > valueB) return sortDirectionWAF === "asc" ? 1 : -1;
                return 0;
            });

            let paginatedData = wafData.slice(start, end);

            paginatedData.forEach((entry, index) => {
                let row = document.createElement("tr");

                row.innerHTML = `
                    <td><input type="checkbox" class="rowCheckboxWAF" data-index="${start + index}"></td>
                    <td contenteditable="true" data-field="attackType">${entry.attackType}</td>
                    <td contenteditable="true" data-field="action">${entry.action}</td>
                    <td contenteditable="true" data-field="count">${entry.count}</td>
                `;

                wafTableBody.appendChild(row);
            });

            // Update simbol panah di header kolom WAF
            document.querySelectorAll("#wafTable th").forEach(header => {
                let icon = header.querySelector(".sort-icon");
                if (header.getAttribute("data-field") === sortColumnWAF) {
                    icon.classList.add(sortDirectionWAF);
                    icon.classList.remove(sortDirectionWAF === "asc" ? "desc" : "asc");
                } else {
                    icon.classList.remove("asc", "desc");
                }
            });

            pageInfoWAF.textContent = `Page ${currentPageWAF} of ${Math.max(1, Math.ceil(wafData.length / rowsPerPageWAF))}`;
            prevPageWAFBtn.disabled = currentPageWAF === 1;
            nextPageWAFBtn.disabled = currentPageWAF * rowsPerPageWAF >= wafData.length;
        });
    }

    function loadWAFData() {
        chrome.storage.local.get("wafEntries", (result) => {
            wafData = result.wafEntries || [];
            console.log("📂 Loaded WAF Data from storage:", wafData);

            // Default sort: count descending
            sortColumnWAF = "count";
            sortDirectionWAF = "desc";

            currentPageWAF = 1;
            renderWAFTable();
        });
    }

    // Select All untuk WAF
    selectAllWAFCheckbox.addEventListener("click", () => {
        let checkboxes = document.querySelectorAll(".rowCheckboxWAF");
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllWAFCheckbox.checked;
        });
    });

    prevPageWAFBtn.addEventListener("click", () => {
        if (currentPageWAF > 1) {
            currentPageWAF--;
            renderWAFTable();
        }
    });

    nextPageWAFBtn.addEventListener("click", () => {
        if (currentPageWAF * rowsPerPageWAF < wafData.length) {
            currentPageWAF++;
            renderWAFTable();
        }
    });

    rowsPerPageWAFSelect.addEventListener("change", () => {
        rowsPerPageWAF = parseInt(rowsPerPageWAFSelect.value);
        currentPageWAF = 1;
        renderWAFTable();
    });

    removeSelectedWAFBtn.addEventListener("click", () => {
        let checkboxes = document.querySelectorAll(".rowCheckboxWAF:checked");
        let indexesToRemove = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));

        chrome.storage.local.get("wafEntries", (result) => {
            let wafData = result.wafEntries || [];
            wafData = wafData.filter((_, index) => !indexesToRemove.includes(index));

            // Simpan data yang sudah dihapus ke storage
            chrome.storage.local.set({ wafEntries: wafData }, () => {
                console.log("✅ Selected rows removed and saved.");
                loadWAFData(); // Render ulang tabel setelah menghapus
                document.getElementById("selectAllWAF").checked = false; // Uncheck Select All
            });
        });
    });

    // Sort Data untuk WAF
    document.querySelectorAll("#wafTable th").forEach(header => {
        header.addEventListener("click", () => {
            let column = header.getAttribute("data-field");
            if (column) {
                if (sortColumnWAF === column) {
                    sortDirectionWAF = sortDirectionWAF === "asc" ? "desc" : "asc";
                } else {
                    sortColumnWAF = column;
                    sortDirectionWAF = "asc";
                }
                renderWAFTable();
            }
        });
    });

    // Report Tab Functionality
    const reportOutput = document.getElementById("reportOutput");

    // Generate Report Per Alert
    document.getElementById("generatePerAlert").addEventListener("click", () => {
        chrome.storage.local.get("wazuh_alerts", (result) => {
            let alerts = result.wazuh_alerts || [];
            let now = new Date();
            let fiveMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000); // Rentang 10 menit
    
            // Filter data dalam rentang 10 menit
            let filteredAlerts = alerts.filter(alert => {
                let alertTime = new Date(alert.timestamp);
                return alertTime >= fiveMinutesAgo && alertTime <= now;
            });
    
            if (filteredAlerts.length === 0) {
                alert("No alerts found in the last 10 minutes.");
                return;
            }
    
            // Kelompokkan data berdasarkan sourceIP, attackType, dan status
            let groupedAlerts = {};
            filteredAlerts.forEach(alert => {
                let key = `${alert.sourceIP}-${alert.attackType}-${alert.status}`;
                if (!groupedAlerts[key]) {
                    groupedAlerts[key] = {
                        sourceIP: alert.sourceIP,
                        country: alert.country,
                        destIP: alert.destIP,
                        attackType: alert.attackType,
                        status: alert.status,
                        severity: alert.severity, // Tambahkan severity ke objek
                        count: 0
                    };
                }
                groupedAlerts[key].count++;
            });
    
            // Format laporan
            let report = "";
            Object.values(groupedAlerts).forEach((group, index) => {
                report += `Report Attack ${index + 1}\n`;
                report += `Kami informasikan adanya Aktivitas mencurigakan yang berasal dari IP ${group.sourceIP} (${group.country}) yang melakukan akses ke IP ${group.destIP}. IP ${group.sourceIP} (${group.country}) ini melakukan komunikasi ke IP External terpantau dengan severity = ${group.severity}, Aktivitas dari IP ini terpantau dengan status ${group.status} dari IPS.\n\n`;
                report += `Berikut merupakan beberapa serangan yang dilakukan terpantau pada Dashboard IPS Fortigate Wazuh:\n\n`;
                report += `\t1. ${group.attackType} = ${group.count} | ${group.status}\n\n`;
                report += `Recommendation & Remediation: Dari IP ${group.destIP} sudah kami lakukan penambahan pada list IP di platform SOC Radar.\n\n`;
            });
    
            // Tampilkan laporan di textarea
            document.getElementById("reportOutput").value = report;
        });
    });

    // Generate Report Per 4 Hours
    document.getElementById("generatePer4Hours").addEventListener("click", () => {
        chrome.storage.local.get(["wazuh_alerts", "wafEntries"], (result) => {
            let alerts = result.wazuh_alerts || [];
            let wafEntries = result.wafEntries || [];
            let now = new Date();
            let fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000); // Rentang 4 jam
    
            // Filter data IPS dalam rentang 4 jam
            let filteredAlerts = alerts.filter(alert => {
                let alertTime = new Date(alert.timestamp);
                return alertTime >= fourHoursAgo && alertTime <= now;
            });
    
            // Kelompokkan data IPS berdasarkan attackType dan status
            let groupedAlerts = {};
            filteredAlerts.forEach(alert => {
                let key = `${alert.attackType}-${alert.status}`;
                if (!groupedAlerts[key]) {
                    groupedAlerts[key] = {
                        attackType: alert.attackType,
                        status: alert.status,
                        count: 0
                    };
                }
                groupedAlerts[key].count++;
            });
    
            // Format laporan
            let report = `Dear Team Ganti,\n\nBerikut kami laporkan mengenai aktivitas monitoring selama 4 jam pada Pukul ${fourHoursAgo.toLocaleTimeString()} - ${now.toLocaleTimeString()}, ${now.toLocaleDateString()} Berdasarkan aktivitas monitoring SIEM yang dilakukan pada FortiAnalyzer dan WAF.\n\n`;
            report += "====================================\n\n";
            report += "1. FortiAnalyzer\n\n";
            report += "  ServerFarm (DC)\n\n";
            report += "    a. 0\n\n";
            report += "  ServerFarm (DRC)\n\n";
            report += "    a. 0\n\n";
            report += "  DMZ (DC 400 p)\n\n";
    
            // Fungsi untuk mengonversi angka ke huruf (a, b, ..., z, aa, ab, ...)
            function numberToLetters(num) {
                let letters = "";
                while (num >= 0) {
                    letters = String.fromCharCode(97 + (num % 26)) + letters;
                    num = Math.floor(num / 26) - 1;
                }
                return letters;
            }
    
            Object.values(groupedAlerts).forEach((group, index) => {
                report += `    ${numberToLetters(index)}. ${group.attackType} = ${group.count} | ${group.status}\n`;
            });
    
            report += "\n  DMZ (DC 400 s)\n\n";
            report += "    a. 0\n\n";
            report += "  DMZ (DRC 400 p)\n\n";
            report += "    a. 0\n\n";
            report += "  Firewall Internet User\n\n";
            report += "    a. 0\n\n";
            report += "  ThreatFedd SOC Radar :\n\n";
    
            // Ambil semua IP attacker dalam rentang 4 jam
            let uniqueIPs = [...new Set(filteredAlerts.map(alert => alert.sourceIP))];
            uniqueIPs.forEach((ip, index) => {
                let alert = filteredAlerts.find(a => a.sourceIP === ip);
                report += `    - [ganti] ${alert.attackType} - ${ip} (${alert.country})\n`;
            });
    
            report += `\n    Jumlah IP yang sudah diinput pada platform SOCRadar: ${uniqueIPs.length}\n\n`;
            report += "====================================\n\n";
            report += "2. Alert OwlH (Wazuh)\n\n";
            report += "    a. 0\n\n";
            report += "  Alert yang ditiket = 0\n\n";
            report += "====================================\n\n";
            report += "3. F5 - ASM (WAF) :\n\n";
    
            wafEntries.forEach((entry, index) => {
                report += `    ${numberToLetters(index)}. ${entry.attackType} = ${entry.count} | ${entry.action}\n`;
            });
    
            report += "\n  Alert yang ditiket = 0\n\n";
            report += "====================================\n\n";
            report += "4. Alert (Wazuh Agent WebAppServer)\n\n";
            report += "    a. 0\n\n";
            report += "  Alert yang ditiket = 0\n\n";
            report += "====================================\n\n";
            report += "5. HPU (High Previledge User)\n\n";
            report += "    a. 0\n\n";
            report += "  Alert yang ditiket = 0\n\n";
            report += "====================================\n\n";
            report += "6. Agent Disconnect\n\n";
            report += "    a. 0\n\n";
            report += "  Alert yang ditiket = 0\n\n";
            report += "====================================\n\n";
            report += "7. Palo Alto (THREAT severity)\n\n";
            report += "    a. 0\n\n";
            report += "====================================\n\n";
            report += "8. Crowdstrike\n\n";
            report += "    a. 0\n\n";
            report += "  Alert yang dilapor = 0\n\n";
            report += "====================================\n\n";
            report += "9. SOC Radar\n\n";
            report += "    a. 0\n\n";
            report += "  Alert yang ditiket = 0\n\n";
            report += "====================================\n\n";
            report += "Kesimpulan Analisa:\n\n";
            report += "- Hasil dari perangkat Fortianalyzer DMZ-DC terdapat aktivitas yang terdeteksi oleh Fortianalyzer dengan status dropped, beberapa IP sudah dimasukkan dalam Threat Feed SOC radar.\n\n";
            report += "======================================\n\n";
            report += "Informasi Lisensi IPS & WAF\n\n";
            report += "   a. IPS\n";
            report += "      License expired IPS: 16-02-2025\n";
            report += "      IPS Definitions Version : 27.00755 | Last Update: 26 Maret 2024\n";
            report += "   b. WAF Latest Version/Update : 2024-03-27 15:19:12\n";
            report += "   c. Suricata Last Version : 6.0.4 | 18 November 2021 (Latest Version)\n";
            report += "   d. Wazuh 4.7.2 version | 17 February 2024 (Latest Version)\n";
            report += "   e. Renewal license Ali/GIS | 21 Mar 2024 - 21 Sept 2024\n\n";
            report += "===================================\n";
            report += "Tiket Open   : 0\n";
            report += "Tiket Closed : 0\n";
            report += "===================================\n";
    
            // Tampilkan laporan di textarea
            document.getElementById("reportOutput").value = report;
        });
    });

    // Save Report to File
    document.getElementById("saveReport").addEventListener("click", () => {
        let report = document.getElementById("reportOutput").value;
        if (!report.trim()) {
            alert("No report to save.");
            return;
        }

        let blob = new Blob([report], { type: "text/plain" });
        let url = URL.createObjectURL(blob);
        let link = document.createElement("a");
        link.href = url;
        link.download = "wazuh_report.txt";
        link.click();
    });

    // Copy Report to Clipboard
    document.getElementById("copyReport").addEventListener("click", () => {
        let report = document.getElementById("reportOutput").value;
        if (!report.trim()) {
            alert("No report to copy.");
            return;
        }

        navigator.clipboard.writeText(report).then(() => {
            alert("Report copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy report:", err);
        });
    });
});