(function () {
    const helpers = window.BillingApp || {};
    const togglePreview = typeof helpers.togglePreview === "function" ? helpers.togglePreview : () => {};
    const parseNumber = typeof helpers.parseNumber === "function" ? helpers.parseNumber : (value) => Number.parseFloat(value || 0) || 0;
    const formatCurrency = typeof helpers.formatCurrency === "function" ? helpers.formatCurrency : (value) => Number(value || 0).toFixed(2);
    const moduleId = "waybill-module";
    const form = document.getElementById("waybill-form");
    if (!form) return;

    const itemsPayload = document.getElementById("waybill-items-payload");
    const itemsTableBody = document.querySelector("#waybill-items-table tbody");
    const previewRows = document.getElementById("waybill-preview-rows");
    const moduleEl = document.getElementById(moduleId);
    const previewToggleBtn = document.getElementById("waybill-preview-toggle");
    const addItemBtn = document.getElementById("waybill-add-item");

    let items = [];

    function loadInitialItems() {
        try {
            items = JSON.parse(itemsPayload.value || "[]");
        } catch (error) {
            items = [];
        }
        if (!Array.isArray(items)) {
            items = [];
        }
        if (items.length === 0) {
            items.push({ description: "", quantity: 0, unit_price: 0, total: 0 });
        }
        renderItems();
    }

    function renderItems() {
        if (itemsTableBody) {
            itemsTableBody.innerHTML = "";
        }
        if (previewRows) {
            previewRows.innerHTML = "";
        }
        items.forEach((item, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><input type="text" data-field="description" data-index="${index}" value="${item.description || ""}" /></td>
                <td><input type="number" step="0.01" data-field="quantity" data-index="${index}" value="${item.quantity || 0}" /></td>
                <td><input type="number" step="0.01" data-field="unit_price" data-index="${index}" value="${item.unit_price || 0}" /></td>
                <td class="row-total">${formatCurrency(item.total || 0)}</td>
                <td><button type="button" class="button button-secondary" data-remove="${index}">Remove</button></td>
            `;
            if (itemsTableBody) {
                itemsTableBody.appendChild(row);
            }

            const previewRow = document.createElement("tr");
            previewRow.innerHTML = `
                <td>${item.description || ""}</td>
                <td>${formatCurrency(item.quantity || 0)}</td>
                <td>${formatCurrency(item.unit_price || 0)}</td>
                <td>${formatCurrency(item.total || 0)}</td>
            `;
            if (previewRows) {
                previewRows.appendChild(previewRow);
            }
        });
        itemsPayload.value = JSON.stringify(items);
    }

    if (itemsTableBody) {
        itemsTableBody.addEventListener("input", (event) => {
            const target = event.target;
            const field = target.getAttribute("data-field");
            const index = Number(target.getAttribute("data-index"));
            if (Number.isNaN(index) || !field) return;
            items[index][field] = parseNumber(target.value);
            items[index].total = items[index].quantity * items[index].unit_price;
            renderItems();
        });

        itemsTableBody.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-remove]");
            if (!button) return;
            const index = Number(button.getAttribute("data-remove"));
            items.splice(index, 1);
            renderItems();
        });
    }

    if (addItemBtn) {
        addItemBtn.addEventListener("click", () => {
            items.push({ description: "", quantity: 0, unit_price: 0, total: 0 });
            renderItems();
        });
    }

    if (moduleEl) {
        moduleEl.addEventListener("click", (event) => {
            if (event.target.matches("[data-exit-preview]")) {
                event.preventDefault();
                togglePreview(moduleId, false);
            }
        });
    }

    if (previewToggleBtn) {
        previewToggleBtn.addEventListener("click", () => {
            togglePreview(moduleId, true);
        });
    }

    loadInitialItems();
})();
