/* ============================================
   WAYBILL MODULE - MAIN JAVASCRIPT
   ============================================
   This file handles all waybill functionality including:
   - Line item management (add, edit, remove)
   - Logistics tracking (driver, destination, receiver)
   - Preview mode with dual-copy layout
   - Form validation
   - PDF/JPEG export functionality
   - Delivery confirmation tracking
   ============================================ */

// IIFE (Immediately Invoked Function Expression) to encapsulate module logic
// This prevents polluting the global namespace
(function () {
    // ============================================
    // HELPER FUNCTIONS AND UTILITIES
    // ============================================

    // Get helper functions from global BillingApp object (defined in main.js)
    const helpers = window.BillingApp || {};
    const togglePreview = typeof helpers.togglePreview === "function" ? helpers.togglePreview : () => {};
    const chooseDownloadFormat = typeof helpers.chooseDownloadFormat === "function" ? helpers.chooseDownloadFormat : async () => "pdf";
    const parseNumber = typeof helpers.parseNumber === "function" ? helpers.parseNumber : (value) => Number.parseFloat(value || 0) || 0;
    const formatCurrency = typeof helpers.formatCurrency === "function" ? helpers.formatCurrency : (value) => Number(value || 0).toFixed(2);
    const formatQuantity = typeof helpers.formatQuantity === "function"
        ? helpers.formatQuantity
        : (value) => {
            const numeric = Number.parseFloat(value || 0);
            if (!Number.isFinite(numeric)) return "0";
            return Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(2);
        };

    // ============================================
    // MODULE INITIALIZATION
    // ============================================

    const moduleId = "waybill-module"; // ID of the waybill module element
    const moduleEl = document.getElementById(moduleId); // Reference to module DOM element
    const form = document.getElementById("waybill-form"); // Reference to waybill form

    // Exit early if required elements are not found
    if (!moduleEl || !form) return;

    const config = window.BILLING_APP_CONFIG || {};
    const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";

    // ============================================
    // DOM ELEMENT REFERENCES
    // ============================================

    // Object containing references to all key DOM elements
    const elements = {
        itemsPayload: document.getElementById("waybill-items-payload"),
        itemsTableBody: document.querySelector("#waybill-items-table tbody"),
        previewRowsContainers: document.querySelectorAll(".js-waybill-preview-rows"),
        previewToggleBtn: document.getElementById("waybill-preview-toggle"),
        exitPreviewBtn: document.getElementById("waybill-exit-preview"),
        submitBtn: document.getElementById("waybill-submit"),
        addItemBtn: document.getElementById("waybill-add-item"),
        toast: document.getElementById("waybill-toast"),
        number: document.getElementById("waybill-number"),
        // Preview elements (multiple instances for dual-copy layout)
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

    // Form input field references
    const inputs = {
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

    // ============================================
    // APPLICATION STATE
    // ============================================

    // Object tracking the current state of the waybill module
    const state = {
        items: [], // Array of line items
        waybillId: null, // Database ID when editing existing waybill
        waybillNumber: "WB-NEW", // Current waybill number
        isSaving: false, // Prevents double-submission
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Set text content for single element or NodeList
     * @param {Element|NodeList} target - DOM element(s) to update
     * @param {string} text - Text content to set
     */
    function setText(target, text) {
        if (!target) return;
        if (typeof target.length === "number" && !target.nodeType) {
            // Handle NodeList - update all elements (for dual-copy layouts)
            Array.from(target).forEach((node) => {
                if (node) node.textContent = text;
            });
            return;
        }
        // Handle single element
        target.textContent = text;
    }

    /**
     * Get input value or its placeholder if empty
     * @param {HTMLElement} field - Input field element
     * @param {string} fallback - Default value if no value/placeholder
     * @returns {string} Field value, placeholder, or fallback
     */
    function valueOrPlaceholder(field, fallback = "—") {
        if (!field) return fallback;
        const value = (field.value || "").trim();
        if (value) return value;
        if (field.placeholder) return field.placeholder.trim();
        return fallback;
    }

    /**
     * Format date value for display using locale-aware formatting
     * @param {string} value - Date string (ISO format)
     * @returns {string} Formatted date (e.g., "15 October 2025")
     */
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

    /**
     * Display a toast notification message
     * @param {string} message - Message to display
     * @param {string} tone - Toast style: "success", "error", "warning"
     */
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

    // ============================================
    // API COMMUNICATION
    // ============================================

    /**
     * Make an API call to the backend
     * @param {string} path - API endpoint path
     * @param {Object} options - Fetch options (method, body, headers, etc.)
     * @returns {Promise<Object|null>} Parsed JSON response or null for 204
     * @throws {Error} On HTTP error status
     */
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

    // ============================================
    // RENDERING FUNCTIONS
    // ============================================

    /**
     * Update preview item rows in all preview containers
     * Handles dual-copy layout by updating multiple preview tables
     */
    function updatePreviewItems() {
        const previewBodies = elements.previewRowsContainers;
        if (!previewBodies || !previewBodies.length) return;
        previewBodies.forEach((container) => {
            if (!container) return;
            container.innerHTML = "";
            
            // Always render 10 rows
            for (let index = 0; index < 10; index++) {
                const item = state.items[index];
                const previewRow = document.createElement("tr");
                
                if (item) {
                    previewRow.innerHTML = `
                        <td>${item.description || ""}</td>
                        <td>${formatQuantity(item.quantity || 0)}</td>
                        <td>${formatCurrency(item.unit_price || 0)}</td>
                        <td>${formatCurrency(item.total || 0)}</td>
                    `;
                } else {
                    previewRow.innerHTML = `
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                    `;
                    previewRow.classList.add("empty-row");
                }
                container.appendChild(previewRow);
            }
        });
    }

    /**
     * Render line items in the edit mode table
     * Always displays 10 rows (filled + empty for visual consistency)
     */
    function renderItems() {
        const tableBody = elements.itemsTableBody;
        tableBody && (tableBody.innerHTML = "");

        // Render exactly 10 rows
        for (let index = 0; index < 10; index++) {
            const item = state.items[index];
            const row = document.createElement("tr");
            
            if (item) {
                row.innerHTML = `
                    <td><input type="text" data-field="description" data-index="${index}" value="${item.description || ""}" /></td>
                    <td><input type="number" step="0.01" data-field="quantity" data-index="${index}" value="${item.quantity || 0}" /></td>
                    <td><input type="number" step="0.01" data-field="unit_price" data-index="${index}" value="${item.unit_price || 0}" /></td>
                    <td class="row-total">${formatCurrency(item.total || 0)}</td>
                    <td><button type="button" class="btn-remove-row" data-remove="${index}" aria-label="Remove row" title="Remove this item">×</button></td>
                `;
            } else {
                row.innerHTML = `
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                `;
                row.classList.add("empty-row");
            }
            tableBody?.appendChild(row);
        }

        if (elements.itemsPayload) {
            elements.itemsPayload.value = JSON.stringify(state.items);
        }

        updatePreviewItems();
    }

    /**
     * Synchronize preview section with current form data
     * Updates all preview fields including both copies in dual-copy layout
     */
    function syncPreview() {
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

    // ============================================
    // EVENT HANDLERS
    // ============================================

    /**
     * Handle preview toggle button click
     * Syncs data and switches to preview mode
     */
    async function handlePreview() {
        syncPreview();
        togglePreview(moduleId, true);
    }

    // ============================================
    // PDF/JPEG GENERATION
    // ============================================

    /**
     * Build payload for PDF/JPEG generation
     * Clones preview element and wraps in export-ready HTML
     * @param {HTMLElement} previewEl - Preview element to clone
     * @param {string} format - Output format: "pdf" or "jpeg"
     * @returns {Object} Payload for render API
     */
    function buildWaybillPayload(previewEl, format) {
        const clone = previewEl.cloneNode(true);
        clone.removeAttribute("hidden");
        clone.setAttribute("data-pdf-clone", "true");
        clone.classList.add("pdf-export");
        clone.querySelectorAll("[data-exit-preview]").forEach((el) => el.remove());
        clone.querySelectorAll(".preview-actions").forEach((el) => el.remove());

        const wrapper = document.createElement("div");
        wrapper.className = "pdf-export-wrapper";
        wrapper.appendChild(clone);

        const normalizedFormat = format === "jpeg" ? "jpeg" : "pdf";
        const safeBase = String(state.waybillNumber || "waybill").trim().replace(/\s+/g, "_");
        const extension = normalizedFormat === "jpeg" ? "jpg" : "pdf";

        return {
            document_type: "waybill",
            html: wrapper.outerHTML,
            filename: `${safeBase}.${extension}`,
            format: normalizedFormat,
        };
    }

    /**
     * Download waybill as PDF or JPEG
     * Sends rendered HTML to server and triggers download
     * @param {string} format - Output format: "pdf" or "jpeg"
     * @throws {Error} On render or download failure
     */
    async function downloadWaybillDocument(format) {
        try {
            syncPreview();

            const previewEl = document.getElementById("waybill-preview");
            if (!previewEl) {
                throw new Error("Preview element not found");
            }

            const payload = buildWaybillPayload(previewEl, format);
            const normalizedFormat = payload.format === "jpeg" ? "jpeg" : "pdf";

            console.log("Sending render request to:", `${API_BASE}/api/pdf/render/`);
            console.log("Requested format:", normalizedFormat);
            console.log("Payload size:", JSON.stringify(payload).length, "bytes");

            const response = await fetch(`${API_BASE}/api/pdf/render/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: normalizedFormat === "jpeg" ? "image/jpeg" : "application/pdf",
                },
                body: JSON.stringify(payload),
            }).catch(err => {
                console.error("Fetch failed:", err);
                throw new Error(`Network error: ${err.message}. Make sure Django server is running on ${API_BASE}`);
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Render error response:", errorText);
                throw new Error(`Failed to generate document: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = payload.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download document error:", error);
            throw error;
        }
    }

    /**
     * Handle save/download button click
     * Prompts for format and downloads document
     */
    async function handleSave() {
        if (state.isSaving) return;

        state.isSaving = true;
        elements.submitBtn?.setAttribute("disabled", "disabled");

        try {
            const chosenFormat = await chooseDownloadFormat();
            if (!chosenFormat) {
                return;
            }
            const normalizedFormat = chosenFormat === "jpeg" ? "jpeg" : "pdf";
            await downloadWaybillDocument(normalizedFormat);
            const label = normalizedFormat === "jpeg" ? "JPEG" : "PDF";
            showToast(`Waybill downloaded as ${label}!`);
        } catch (error) {
            console.error("Failed to download waybill", error);
            showToast(error.message || "Failed to download waybill", "error");
        } finally {
            state.isSaving = false;
            elements.submitBtn?.removeAttribute("disabled");
        }
    }

    // ============================================
    // DATA LOADING
    // ============================================

    /**
     * Get URL query parameter value
     * @param {string} name - Parameter name
     * @returns {string|null} Parameter value or null
     */
    function getQueryParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    /**
     * Load existing waybill data from API
     * Called on page load if 'id' query parameter is present
     */
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

    /**
     * Attach all event listeners to form and buttons
     * Sets up interactions for editing, preview, and download
     */
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
            if (state.items.length >= 10) {
                showToast("Maximum 10 items allowed", "error");
                return;
            }
            state.items.push({ description: "", quantity: 0, unit_price: 0, total: 0 });
            renderItems();
        });

        elements.previewToggleBtn?.addEventListener("click", () => {
            handlePreview();
        });

        elements.submitBtn?.addEventListener("click", () => {
            handleSave();
        });

        elements.exitPreviewBtn?.addEventListener("click", () => {
            togglePreview(moduleId, false);
        });

        // Live preview sync on form input
        form.addEventListener("input", () => {
            syncPreview();
        });
    }

    /**
     * Load next available waybill number from server
     * Does not reserve the number (just peeks at next value)
     */
    async function loadNextWaybillNumber() {
        try {
            const response = await fetch(`${API_BASE}/api/counter/waybill/next/`);
            if (response.ok) {
                const data = await response.json();
                state.waybillNumber = data.next_number;
                elements.number && (elements.number.textContent = state.waybillNumber);
                setText(elements.previewNumberEls, state.waybillNumber);
            }
        } catch (error) {
            console.warn("Failed to load next waybill number", error);
        }
    }

    /**
     * Increment the waybill counter and get next number
     * Called after successful document download
     */
    async function incrementWaybillNumber() {
        try {
            const response = await fetch(`${API_BASE}/api/counter/waybill/next/`, { method: "POST" });
            if (response.ok) {
                const data = await response.json();
                state.waybillNumber = data.next_number;
                elements.number && (elements.number.textContent = state.waybillNumber);
                setText(elements.previewNumberEls, state.waybillNumber);
            }
        } catch (error) {
            console.warn("Failed to increment waybill number", error);
        }
    }

    // ============================================
    // MODULE INITIALIZATION
    // ============================================

    /**
     * Initialize the waybill module
     * Sets up listeners, loads data, and prepares UI
     */
    (async function init() {
        attachEventListeners();
        await loadNextWaybillNumber();  // Load the next number on page load
        await loadExistingWaybill();
    })();
})();
