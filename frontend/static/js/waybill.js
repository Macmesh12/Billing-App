/* ============================================
   WAYBILL MODULE - MAIN JAVASCRIPT
   ============================================
   This file handles all waybill functionality including:
   - Shipped item management (add, edit, remove)
   - Delivery information tracking
   - Preview mode toggling
   - Form validation and submission
   - PDF/JPEG export functionality
   - API integration for saving waybills
   ============================================ */

// IIFE (Immediately Invoked Function Expression) to encapsulate module logic
// This prevents polluting the global namespace
(function () {
    // ============================================
    // GLOBAL HELPERS AND CONFIGURATION
    // ============================================
    
    // Import helper functions from global BillingApp object (defined in main.js)
    const helpers = window.BillingApp || {};
    
    /**
     * Preview Toggle Helper
     * Switches between edit and preview modes
     * @type {Function}
     */
    const togglePreview = typeof helpers.togglePreview === "function" ? helpers.togglePreview : () => {};
    
    /**
     * Download Format Chooser
     * Shows dialog to select PDF or JPEG format
     * @type {Function}
     * @returns {Promise<string|null>} - Returns "pdf", "jpeg", or null if cancelled
     */
    const chooseDownloadFormat = typeof helpers.chooseDownloadFormat === "function" ? helpers.chooseDownloadFormat : async () => "pdf";
    
    /**
     * Parse Number Helper
     * Safely converts strings to numbers
     * @type {Function}
     * @param {string|number} value - Value to parse
     * @returns {number} Parsed number
     */
    const parseNumber = typeof helpers.parseNumber === "function" ? helpers.parseNumber : (value) => Number.parseFloat(value || 0) || 0;
    
    /**
     * Currency Formatter
     * Formats numbers to currency strings (e.g., 1234.5 -> "1234.50")
     * @type {Function}
     * @param {number} value - Number to format
     * @returns {string} Formatted currency string
     */
    const formatCurrency = typeof helpers.formatCurrency === "function" ? helpers.formatCurrency : (value) => Number(value || 0).toFixed(2);
    
    /**
     * Quantity Formatter
     * Formats quantities, showing decimals only when needed
     * @type {Function}
     * @param {number} value - Quantity to format
     * @returns {string} Formatted quantity string
     */
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
    
    /**
     * Module Identification
     * Used to identify this specific module in the DOM
     */
    const moduleId = "waybill-module";
    const moduleEl = document.getElementById(moduleId);
    const form = document.getElementById("waybill-form");
    
    // Exit early if required elements are not found
    if (!moduleEl || !form) return;

    /**
     * API Configuration
     * Base URL for backend API calls
     */
    const config = window.BILLING_APP_CONFIG || {};
    const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";

    /**
     * DOM Element References
     * Cached references to frequently accessed DOM elements
     */
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

    /**
     * Form Input References
     * References to form input fields
     */
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

    /**
     * Application State
     * Central state management for waybill module
     */
    const state = {
        items: [],                  // Array of shipped items
        waybillId: null,            // Database ID of current waybill (null for new)
        waybillNumber: "WB-NEW",    // Current waybill number
        isSaving: false,            // Flag to prevent duplicate save operations
    };

    // ============================================
    // HELPER FUNCTIONS AND UTILITIES
    // ============================================

    /**
     * Set Text Content Helper
     * Sets text content for single element or NodeList
     * @param {HTMLElement|NodeList} target - Element or list of elements
     * @param {string} text - Text content to set
     */
    function setText(target, text) {
        if (!target) return;
        
        // Handle NodeList or HTMLCollection
        if (typeof target.length === "number" && !target.nodeType) {
            Array.from(target).forEach((node) => {
                if (node) node.textContent = text;
            });
            return;
        }
        
        // Handle single element
        target.textContent = text;
    }

    /**
     * Value or Placeholder Helper
     * Returns field value or placeholder if empty
     * @param {HTMLInputElement} field - Input field element
     * @param {string} fallback - Default value if no value or placeholder
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
     * Format Date for Display
     * Converts date string to human-readable format (e.g., "15 October 2025")
     * @param {string} value - Date string (ISO format or other parseable format)
     * @returns {string} Formatted date string or fallback
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
     * Show Toast Notification
     * Displays a temporary notification message
     * @param {string} message - Message to display
     * @param {string} tone - Tone/style of toast ("success", "error", "warning")
     */
    function showToast(message, tone = "success") {
        const el = elements.toast;
        if (!el) return;
        
        el.textContent = message;
        el.className = `module-toast is-${tone}`;
        el.hidden = false;
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            el.hidden = true;
        }, 4000);
    }

    /**
     * API Call Helper
     * Makes HTTP requests to backend API with error handling
     * @param {string} path - API endpoint path
     * @param {Object} options - Fetch options (method, headers, body, etc.)
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
        
        // Handle error responses
        if (!response.ok) {
            let detail = await response.json().catch(() => ({}));
            const message = detail.errors ? JSON.stringify(detail.errors) : `${response.status} ${response.statusText}`;
            throw new Error(message);
        }
        
        // Handle no-content responses
        if (response.status === 204) return null;
        
        return response.json();
    }

    // ============================================
    // RENDERING FUNCTIONS
    // ============================================

    /**
     * Update Preview Items
     * Renders shipped items in preview mode
     * Always renders exactly 10 rows for consistent layout
     */
    function updatePreviewItems() {
        const previewBodies = elements.previewRowsContainers;
        if (!previewBodies || !previewBodies.length) return;
        
        // Update all preview containers (may be multiple in waybill layout)
        previewBodies.forEach((container) => {
            if (!container) return;
            container.innerHTML = "";
            
            // Render exactly 10 rows for consistent spacing
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

    function renderItems() {
        // Function to render items in table and preview - always show 10 rows
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

    async function handlePreview() {
        // Handle preview toggle
        syncPreview();
        togglePreview(moduleId, true);
    }

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

    async function handleSave() {
        // Handle document download
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

    async function loadNextWaybillNumber() {
        // Load the next waybill number from the counter API
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

    async function incrementWaybillNumber() {
        // Increment the waybill number counter after successful PDF download
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

    (async function init() {
        // Init function
        attachEventListeners();
        await loadNextWaybillNumber();  // Load the next number on page load
        await loadExistingWaybill();
    })();
})();
