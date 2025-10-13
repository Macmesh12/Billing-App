(function () {
    // IIFE for waybill module
    const helpers = window.BillingApp || {};
    // Get global helpers
    const togglePreview = typeof helpers.togglePreview === "function" ? helpers.togglePreview : () => {};
    // Fallback for togglePreview
    const parseNumber = typeof helpers.parseNumber === "function" ? helpers.parseNumber : (value) => Number.parseFloat(value || 0) || 0;
    // Fallback for parseNumber
    const formatCurrency = typeof helpers.formatCurrency === "function" ? helpers.formatCurrency : (value) => Number(value || 0).toFixed(2);
    // Fallback for formatCurrency
    const formatQuantity = typeof helpers.formatQuantity === "function"
        ? helpers.formatQuantity
        : (value) => {
            const numeric = Number.parseFloat(value || 0);
            if (!Number.isFinite(numeric)) return "0";
            return Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(2);
        };

    const moduleId = "waybill-module";
    // Module ID
    const moduleEl = document.getElementById(moduleId);
    // Module element
    const form = document.getElementById("waybill-form");
    // Form element
    if (!moduleEl || !form) return;
    // Exit if elements not found

    const config = window.BILLING_APP_CONFIG || {};
    // Global config
    const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";
    // API base URL

    const elements = {
        // DOM elements object
        itemsPayload: document.getElementById("waybill-items-payload"),
        itemsTableBody: document.querySelector("#waybill-items-table tbody"),
        previewRowsContainers: document.querySelectorAll(".js-waybill-preview-rows"),
        previewToggleBtn: document.getElementById("waybill-preview-toggle"),
        submitBtn: document.getElementById("waybill-submit"),
        addItemBtn: document.getElementById("waybill-add-item"),
        toast: document.getElementById("waybill-toast"),
        number: document.getElementById("waybill-number"),
        previewNumberEls: document.querySelectorAll(".js-waybill-preview-number"),
        previewDateEls: document.querySelectorAll(".js-waybill-preview-date"),
        previewCustomerEls: document.querySelectorAll(".js-waybill-preview-customer"),
        previewDestinationEls: document.querySelectorAll(".js-waybill-preview-destination"),
        previewDriverEls: document.querySelectorAll(".js-waybill-preview-driver"),
        previewReceiverEls: document.querySelectorAll(".js-waybill-preview-receiver"),
        previewNoteEls: document.querySelectorAll(".js-waybill-preview-note"),
        previewDeliveryDateEls: document.querySelectorAll(".js-waybill-preview-delivery-date"),
        previewReceivedDateEls: document.querySelectorAll(".js-waybill-preview-received-date"),
        previewContactEls: document.querySelectorAll(".js-waybill-preview-contact"),
    };

    const inputs = {
        // Input elements object
        issueDate: document.getElementById("waybill-issue-date"),
        customer: document.getElementById("waybill-customer"),
        destination: document.getElementById("waybill-destination"),
        driver: document.getElementById("waybill-driver"),
        receiver: document.getElementById("waybill-receiver"),
        note: document.getElementById("waybill-note"),
        deliveryDate: document.getElementById("waybill-delivery-date"),
        receivedDateText: document.getElementById("waybill-received-date"),
        contact: document.getElementById("waybill-contact"),
    };

    const state = {
        // State object
        items: [],
        waybillId: null,
        waybillNumber: "WB-NEW",
        isSaving: false,
    };

    function setText(target, text) {
        if (!target) return;
        if (typeof target.length === "number" && !target.nodeType) {
            Array.from(target).forEach((node) => {
                if (node) node.textContent = text;
            });
            return;
        }
        target.textContent = text;
    }

    function valueOrPlaceholder(field, fallback = "—") {
        if (!field) return fallback;
        const value = (field.value || "").trim();
        if (value) return value;
        if (field.placeholder) return field.placeholder.trim();
        return fallback;
    }

    function formatDisplayDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
        }).format(date);
    }

    function showToast(message, tone = "success") {
        // Function to show toast
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
        // API call function
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

    function updatePreviewItems() {
        const previewBodies = elements.previewRowsContainers;
        if (!previewBodies || !previewBodies.length) return;
        previewBodies.forEach((container) => {
            if (!container) return;
            container.innerHTML = "";
            if (!state.items.length) {
                const placeholder = document.createElement("tr");
                placeholder.innerHTML = `<td colspan="4" class="empty-state">No line items yet.</td>`;
                container.appendChild(placeholder);
                return;
            }
            state.items.forEach((item) => {
                const previewRow = document.createElement("tr");
                previewRow.innerHTML = `
                    <td>${item.description || ""}</td>
                    <td>${formatQuantity(item.quantity || 0)}</td>
                    <td>${formatCurrency(item.unit_price || 0)}</td>
                    <td>${formatCurrency(item.total || 0)}</td>
                `;
                container.appendChild(previewRow);
            });
        });
    }

    function renderItems() {
        // Function to render items in table and preview
        const tableBody = elements.itemsTableBody;
        tableBody && (tableBody.innerHTML = "");

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
        });

        if (state.items.length === 0) {
            const placeholder = document.createElement("tr");
            placeholder.innerHTML = `<td colspan="5" class="empty-state">No line items yet. Add one to begin.</td>`;
            tableBody?.appendChild(placeholder);
        }

        if (elements.itemsPayload) {
            elements.itemsPayload.value = JSON.stringify(state.items);
        }

        updatePreviewItems();
    }

    function syncPreview() {
        // Sync preview with form data
        setText(elements.previewNumberEls, state.waybillNumber);
        const prettyDate = formatDisplayDate(inputs.issueDate?.value || "");
        setText(elements.previewDateEls, prettyDate);
        setText(elements.previewCustomerEls, valueOrPlaceholder(inputs.customer, "—"));
        setText(elements.previewDestinationEls, valueOrPlaceholder(inputs.destination, "—"));
        setText(elements.previewDriverEls, valueOrPlaceholder(inputs.driver, "—"));
        setText(elements.previewReceiverEls, valueOrPlaceholder(inputs.receiver, "—"));
        setText(elements.previewNoteEls, valueOrPlaceholder(inputs.note, "Please sign for acceptance"));
        const deliveryTyped = (inputs.deliveryDate?.value || "").trim();
        let deliveryDateText = deliveryTyped;
        if (!deliveryDateText) {
            deliveryDateText = prettyDate !== "—" ? prettyDate : valueOrPlaceholder(inputs.deliveryDate, "—");
        }
        setText(elements.previewDeliveryDateEls, deliveryDateText);
        setText(elements.previewReceivedDateEls, valueOrPlaceholder(inputs.receivedDateText, "—"));
    setText(elements.previewContactEls, valueOrPlaceholder(inputs.contact, "DELIVERED BY SPAQUELS \u2022 CONTACT: 0540 673202 | 050 532 1475 | 030 273 8719"));
        updatePreviewItems();
    }

    function buildPayload() {
        // Build payload from inputs
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
        // Handle preview toggle
        syncPreview();
        togglePreview(moduleId, true);
    }

    async function handleSave() {
        // Handle save/submit
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
                setText(elements.previewNumberEls, state.waybillNumber);
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
        // Get URL query param
        return new URLSearchParams(window.location.search).get(name);
    }

    async function loadExistingWaybill() {
        // Load existing waybill if ID in URL
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
            setText(elements.previewNumberEls, state.waybillNumber);
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
        // Attach event listeners
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
            const rowEl = target.closest("tr");
            const totalEl = rowEl ? rowEl.querySelector(".row-total") : null;
            if (totalEl) totalEl.textContent = formatCurrency(item.total || 0);
            if (elements.itemsPayload) {
                elements.itemsPayload.value = JSON.stringify(state.items);
            }
            updatePreviewItems();
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

        // Live preview sync on form input
        form.addEventListener("input", () => {
            syncPreview();
        });
    }

    (async function init() {
        // Init function
        attachEventListeners();
        await loadExistingWaybill();
    })();
})();
