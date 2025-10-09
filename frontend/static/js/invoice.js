(function () {
    const helpers = window.BillingApp || {};
    const formatCurrency = typeof helpers.formatCurrency === "function"
        ? helpers.formatCurrency
        : (value) => Number(value || 0).toFixed(2);
    const parseNumber = typeof helpers.parseNumber === "function"
        ? helpers.parseNumber
        : (value) => Number.parseFloat(value || 0) || 0;
    const togglePreview = typeof helpers.togglePreview === "function"
        ? helpers.togglePreview
        : () => {};
    const moduleId = "invoice-module";
    const form = document.getElementById("invoice-form");
    if (!form) return;

    const itemsPayload = document.getElementById("invoice-items-payload");
    const itemsTableBody = document.querySelector("#invoice-items-table tbody");
    const subtotalEl = document.getElementById("invoice-subtotal");
    const grandTotalEl = document.getElementById("invoice-grand-total");
    const levyEls = document.querySelectorAll("[data-levy]");
    const previewSubtotalEl = document.getElementById("invoice-preview-subtotal");
    const previewGrandEl = document.getElementById("invoice-preview-grand");
    const previewRows = document.getElementById("invoice-preview-rows");
    const addItemBtn = document.getElementById("invoice-add-item");
    const previewToggleBtn = document.getElementById("invoice-preview-toggle");
    const submitBtn = document.getElementById("invoice-submit");
    const moduleEl = document.getElementById(moduleId);

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
        recalcTotals();
    }

    function recalcTotals() {
        const subtotal = items.reduce((sum, item) => sum + parseNumber(item.total), 0);
        if (subtotalEl) {
            subtotalEl.textContent = formatCurrency(subtotal);
        }
        if (previewSubtotalEl) {
            previewSubtotalEl.textContent = formatCurrency(subtotal);
        }

        let levyTotal = 0;
        levyEls.forEach((el) => {
            const levyName = el.getAttribute("data-levy");
            const rate = Number(el.getAttribute("data-rate")) || 0;
            const amount = subtotal * rate;
            el.textContent = formatCurrency(amount);
            const previewEl = document.querySelector(`[data-preview-levy="${levyName}"]`);
            if (previewEl) {
                previewEl.textContent = formatCurrency(amount);
            }
            levyTotal += amount;
        });

        const grandTotal = subtotal + levyTotal;
        if (grandTotalEl) {
            grandTotalEl.textContent = formatCurrency(grandTotal);
        }
        if (previewGrandEl) {
            previewGrandEl.textContent = formatCurrency(grandTotal);
        }
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

    if (previewToggleBtn) {
        previewToggleBtn.addEventListener("click", () => {
            togglePreview(moduleId, true);
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

    if (submitBtn) {
        submitBtn.addEventListener("click", () => {
            form.submit();
        });
    }

    loadInitialItems();
})();
