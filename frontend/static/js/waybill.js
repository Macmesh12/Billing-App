(function () {
    const helpers = window.BillingApp || {};
    const togglePreview = typeof helpers.togglePreview === "function" ? helpers.togglePreview : () => {};
    const parseNumber = typeof helpers.parseNumber === "function" ? helpers.parseNumber : (value) => Number.parseFloat(value || 0) || 0;
    const formatCurrency = typeof helpers.formatCurrency === "function" ? helpers.formatCurrency : (value) => Number(value || 0).toFixed(2);

    const moduleId = "waybill-module";
    const moduleEl = document.getElementById(moduleId);
    const form = document.getElementById("waybill-form");
    if (!moduleEl || !form) return;

    const config = window.BILLING_APP_CONFIG || {};
    const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";

    const elements = {
        itemsPayload: document.getElementById("waybill-items-payload"),
        itemsTableBody: document.querySelector("#waybill-items-table tbody"),
        previewRows: document.getElementById("waybill-preview-rows"),
        previewToggleBtn: document.getElementById("waybill-preview-toggle"),
        submitBtn: document.getElementById("waybill-submit"),
        addItemBtn: document.getElementById("waybill-add-item"),
        toast: document.getElementById("waybill-toast"),
        number: document.getElementById("waybill-number"),
        previewNumber: document.getElementById("waybill-preview-number"),
        previewDate: document.getElementById("waybill-preview-date"),
        previewCustomer: document.getElementById("waybill-preview-customer"),
        previewDestination: document.getElementById("waybill-preview-destination"),
        previewDriver: document.getElementById("waybill-preview-driver"),
        previewReceiver: document.getElementById("waybill-preview-receiver"),
    };

    const inputs = {
        issueDate: document.getElementById("waybill-issue-date"),
        customer: document.getElementById("waybill-customer"),
        destination: document.getElementById("waybill-destination"),
        driver: document.getElementById("waybill-driver"),
        receiver: document.getElementById("waybill-receiver"),
    };

    const state = {
        items: [],
        waybillId: null,
        waybillNumber: "WB-NEW",
        isSaving: false,
    };

    function showToast(message, tone = "success") {
        const el = elements.toast;
        if (!el) return;
        el.textContent = message;
        el.className = `module-toast is-${tone}`;
        el.hidden = false;
        setTimeout(() => {
            el.hidden = true;
        }, 4000);
    }

    async function callApi(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
            ...options,
        });
        if (!response.ok) {
            let detail = await response.json().catch(() => ({}));
            const message = detail.errors ? JSON.stringify(detail.errors) : `${response.status} ${response.statusText}`;
            throw new Error(message);
        }
        if (response.status === 204) return null;
        return response.json();
    }

    function renderItems() {
        const tableBody = elements.itemsTableBody;
        const previewBody = elements.previewRows;
        tableBody && (tableBody.innerHTML = "");
        previewBody && (previewBody.innerHTML = "");

        state.items.forEach((item, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><input type="text" data-field="description" data-index="${index}" value="${item.description || ""}" /></td>
                <td><input type="number" step="0.01" data-field="quantity" data-index="${index}" value="${item.quantity || 0}" /></td>
                <td><input type="number" step="0.01" data-field="unit_price" data-index="${index}" value="${item.unit_price || 0}" /></td>
                <td class="row-total">${formatCurrency(item.total || 0)}</td>
                <td><button type="button" class="button button-secondary" data-remove="${index}">Remove</button></td>
            `;
            tableBody?.appendChild(row);

            const previewRow = document.createElement("tr");
            previewRow.innerHTML = `
                <td>${item.description || ""}</td>
                <td>${formatCurrency(item.quantity || 0)}</td>
                <td>${formatCurrency(item.unit_price || 0)}</td>
                <td>${formatCurrency(item.total || 0)}</td>
            `;
            previewBody?.appendChild(previewRow);
        });

        if (state.items.length === 0) {
            const placeholder = document.createElement("tr");
            placeholder.innerHTML = `<td colspan="5" class="empty-state">No line items yet. Add one to begin.</td>`;
            tableBody?.appendChild(placeholder);
        }

        if (elements.itemsPayload) {
            elements.itemsPayload.value = JSON.stringify(state.items);
        }
    }

    function syncPreview() {
        elements.previewNumber && (elements.previewNumber.textContent = state.waybillNumber);
        elements.previewDate && (elements.previewDate.textContent = inputs.issueDate?.value || "—");
        elements.previewCustomer && (elements.previewCustomer.textContent = inputs.customer?.value || "—");
        elements.previewDestination && (elements.previewDestination.textContent = inputs.destination?.value || "—");
        elements.previewDriver && (elements.previewDriver.textContent = inputs.driver?.value || "—");
        elements.previewReceiver && (elements.previewReceiver.textContent = inputs.receiver?.value || "—");
    }

    function buildPayload() {
        return {
            customer_name: inputs.customer?.value || "",
            issue_date: inputs.issueDate?.value || "",
            destination: inputs.destination?.value || "",
            driver_name: inputs.driver?.value || "",
            receiver_name: inputs.receiver?.value || "",
            items_payload: JSON.stringify(state.items),
        };
    }

    async function handlePreview() {
        syncPreview();
        togglePreview(moduleId, true);
    }

    async function handleSave() {
        if (state.isSaving) return;
        state.isSaving = true;
        elements.submitBtn?.setAttribute("disabled", "disabled");
        try {
            const payload = buildPayload();
            const method = state.waybillId ? "PUT" : "POST";
            const path = state.waybillId ? `/waybills/api/${state.waybillId}/` : `/waybills/api/create/`;
            const result = await callApi(path, {
                method,
                body: JSON.stringify(payload),
            });
            if (result?.waybill_number) {
                state.waybillNumber = result.waybill_number;
                elements.number && (elements.number.textContent = state.waybillNumber);
                elements.previewNumber && (elements.previewNumber.textContent = state.waybillNumber);
            }
            if (result?.id) {
                state.waybillId = result.id;
            }
            showToast("Waybill saved successfully.");
        } catch (error) {
            console.error(error);
            showToast(`Failed to save waybill: ${error.message}`, "error");
        } finally {
            state.isSaving = false;
            elements.submitBtn?.removeAttribute("disabled");
        }
    }

    function getQueryParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    async function loadExistingWaybill() {
        const id = getQueryParam("id");
        if (!id) {
            state.items = [{ description: "", quantity: 0, unit_price: 0, total: 0 }];
            renderItems();
            syncPreview();
            return;
        }
        try {
            const data = await callApi(`/waybills/api/${id}/`);
            state.waybillId = data.id;
            state.waybillNumber = data.waybill_number || state.waybillNumber;
            elements.number && (elements.number.textContent = state.waybillNumber);
            elements.previewNumber && (elements.previewNumber.textContent = state.waybillNumber);
            if (inputs.issueDate && data.issue_date) inputs.issueDate.value = data.issue_date;
            if (inputs.customer) inputs.customer.value = data.customer_name || "";
            if (inputs.destination) inputs.destination.value = data.destination || "";
            if (inputs.driver) inputs.driver.value = data.driver_name || "";
            if (inputs.receiver) inputs.receiver.value = data.receiver_name || "";
            const receivedItems = Array.isArray(data.items) ? data.items : [];
            state.items = receivedItems.length ? receivedItems : [{ description: "", quantity: 0, unit_price: 0, total: 0 }];
            renderItems();
            syncPreview();
        } catch (error) {
            console.error("Failed to load waybill", error);
            showToast("Could not load waybill details", "error");
            state.items = [{ description: "", quantity: 0, unit_price: 0, total: 0 }];
            renderItems();
            syncPreview();
        }
    }

    function attachEventListeners() {
        elements.itemsTableBody?.addEventListener("input", (event) => {
            const target = event.target;
            const field = target.getAttribute("data-field");
            const index = Number(target.getAttribute("data-index"));
            if (Number.isNaN(index) || !field) return;
            const item = state.items[index] || {};
            if (field === "description") {
                item.description = target.value;
            } else {
                item[field] = parseNumber(target.value);
            }
            item.total = parseNumber(item.quantity) * parseNumber(item.unit_price);
            state.items[index] = item;
            renderItems();
        });

        elements.itemsTableBody?.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-remove]");
            if (!button) return;
            const index = Number(button.getAttribute("data-remove"));
            state.items.splice(index, 1);
            renderItems();
        });

        elements.addItemBtn?.addEventListener("click", () => {
            state.items.push({ description: "", quantity: 0, unit_price: 0, total: 0 });
            renderItems();
        });

        elements.previewToggleBtn?.addEventListener("click", () => {
            handlePreview();
        });

        elements.submitBtn?.addEventListener("click", () => {
            handleSave();
        });

        moduleEl.addEventListener("click", (event) => {
            if (event.target.matches("[data-exit-preview]")) {
                event.preventDefault();
                togglePreview(moduleId, false);
            }
        });
    }

    (async function init() {
        attachEventListeners();
        await loadExistingWaybill();
    })();
})();
