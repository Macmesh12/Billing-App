/* ============================================
   RECEIPT MODULE - MAIN JAVASCRIPT
   ============================================
   This file handles all receipt functionality including:
   - Line item management (add, edit, remove)
   - Amount calculations (total, balance)
   - Preview mode toggling
   - Form validation and submission
   - PDF/JPEG export functionality
   - API integration for saving receipts
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
     * Currency Formatter
     * Formats numbers to currency strings (e.g., 1234.5 -> "1234.50")
     * @type {Function}
     * @param {number} value - Number to format
     * @returns {string} Formatted currency string
     */
    const formatCurrency = typeof helpers.formatCurrency === "function" ? helpers.formatCurrency : (value) => Number(value || 0).toFixed(2);

    // ============================================
    // MODULE INITIALIZATION
    // ============================================
    
    /**
     * Module Identification
     * Used to identify this specific module in the DOM
     */
    const moduleId = "receipt-module";
    const moduleEl = document.getElementById(moduleId);
    const form = document.getElementById("receipt-form");
    
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
        previewToggleBtn: document.getElementById("receipt-preview-toggle"),
        exitPreviewBtn: document.getElementById("receipt-exit-preview"),
        submitBtn: document.getElementById("receipt-submit"),
        toast: document.getElementById("receipt-toast"),
        number: document.getElementById("receipt-number"),
        addItemBtn: document.getElementById("receipt-add-item"),
        itemsTable: document.getElementById("receipt-items-table"),
        previewRows: document.getElementById("receipt-preview-rows"),
        previewNumberEls: document.querySelectorAll(".js-receipt-preview-number"),
        previewDateEls: document.querySelectorAll(".js-receipt-preview-date"),
        previewReceivedFromEls: document.querySelectorAll(".js-receipt-preview-received-from"),
        previewAmountEls: document.querySelectorAll(".js-receipt-preview-amount-paid"),
        previewPaymentMethodEls: document.querySelectorAll(".js-receipt-preview-payment-method"),
        previewCustomerNameEls: document.querySelectorAll(".js-receipt-preview-customer-name"),
        previewApprovedByEls: document.querySelectorAll(".js-receipt-preview-approved-by"),
        previewTotalAmountEls: document.querySelectorAll(".js-receipt-preview-total-amount"),
        previewBalanceEls: document.querySelectorAll(".js-receipt-preview-balance"),
    };

    /**
     * Form Input References
     * References to form input fields
     */
    const inputs = {
        receivedFrom: document.getElementById("receipt-received-from"),
        customerName: document.getElementById("receipt-customer-name"),
        approvedBy: document.getElementById("receipt-approved-by"),
        issueDate: document.getElementById("receipt-issue-date"),
        amountPaid: document.getElementById("receipt-amount-paid"),
        paymentMethod: document.getElementById("receipt-payment-method"),
    };

    /**
     * Display Element References
     * Elements that display calculated values
     */
    const displays = {
        totalDisplay: document.getElementById("receipt-total-display"),
        balanceDisplay: document.getElementById("receipt-balance-display"),
    };

    /**
     * Application State
     * Central state management for receipt module
     */
    const state = {
        receiptId: null,                    // Database ID of current receipt (null for new)
        receiptNumber: "REC-NEW",           // Current receipt number
        receiptNumberReserved: false,       // Whether number has been reserved in counter
        isSaving: false,                    // Flag to prevent duplicate save operations
        items: [],                          // Array of receipt line items
    };

    // ============================================
    // HELPER FUNCTIONS AND UTILITIES
    // ============================================

    /**
     * Set Receipt Number
     * Updates the receipt number in state and UI
     * @param {string} value - The receipt number to set
     * @param {Object} options - Configuration options
     * @param {boolean} options.reserved - Whether the number has been reserved in counter
     */
    function setReceiptNumber(value, { reserved = false } = {}) {
        if (!value) {
            return;
        }
        state.receiptNumber = value;
        state.receiptNumberReserved = reserved;
        
        // Update edit mode display
        if (elements.number) {
            elements.number.textContent = state.receiptNumber;
        }
        
        // Update preview mode display
        setText(elements.previewNumberEls, state.receiptNumber);
    }

    /**
     * Ensure Receipt Number is Reserved
     * Reserves a receipt number from the counter API if not already reserved
     * @returns {Promise<Object>} Object with number, reserved flag, and optional error
     */
    async function ensureReceiptNumberReserved() {
        // Return early if already reserved
        if (state.receiptNumberReserved && state.receiptNumber) {
            return { number: state.receiptNumber, reserved: true };
        }
        
        try {
            // Call API to reserve the next receipt number
            const response = await fetch(`${API_BASE}/api/counter/receipt/next/`, { method: "POST" });
            if (!response.ok) {
                throw new Error(`Failed to reserve receipt number (${response.status})`);
            }
            const data = await response.json().catch(() => ({}));
            if (data?.next_number) {
                setReceiptNumber(data.next_number, { reserved: true });
            }
            return { number: state.receiptNumber, reserved: true };
        } catch (error) {
            console.warn("Could not reserve receipt number", error);
            state.receiptNumberReserved = false;
            if (!state.receiptNumber) {
                await loadNextReceiptNumber();
            }
            return { number: state.receiptNumber, reserved: false, error };
        }
    }

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
        const url = `${API_BASE}${path}`;
        const response = await fetch(url, {
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

    /**
     * Calculate Totals
     * Computes total amount, amount paid, and balance from items
     * @returns {Object} Object with total, amountPaid, and balance properties
     */
    function calculateTotals() {
        // Sum all item totals
        const total = state.items.reduce((sum, item) => sum + (item.total || 0), 0);
        const amountPaid = Number(inputs.amountPaid?.value) || 0;
        const balance = total - amountPaid;
        
        // Update display elements
        if (displays.totalDisplay) {
            displays.totalDisplay.textContent = `GH₵ ${formatCurrency(total)}`;
        }
        if (displays.balanceDisplay) {
            displays.balanceDisplay.textContent = `GH₵ ${formatCurrency(balance)}`;
        }
        
        return { total, amountPaid, balance };
    }

    // ============================================
    // RENDERING FUNCTIONS
    // ============================================

    /**
     * Render Items in Edit Mode
     * Creates table rows for all items in edit mode
     * Always renders exactly 10 rows for consistent layout
     */
    function renderItems() {
        const tbody = elements.itemsTable?.querySelector("tbody");
        if (!tbody) return;
        
        tbody.innerHTML = "";
        
        // Render exactly 10 rows for consistent spacing
        for (let index = 0; index < 10; index++) {
            const item = state.items[index] || {};
            const row = document.createElement("tr");
            
            if (index < state.items.length) {
                // Row with data and editable inputs
                row.innerHTML = `
                    <td><input type="text" value="${item.description || ""}" data-index="${index}" data-field="description" placeholder="Item description"></td>
                    <td><input type="number" value="${item.quantity || 0}" data-index="${index}" data-field="quantity" min="0" step="1"></td>
                    <td><input type="number" value="${item.unit_price || 0}" data-index="${index}" data-field="unit_price" min="0" step="0.01"></td>
                    <td class="total-cell">${formatCurrency(item.total || 0)}</td>
                    <td><button type="button" class="button-icon" data-remove="${index}" title="Remove item">×</button></td>
                `;
            } else {
                // Empty row for visual spacing
                row.innerHTML = `
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                `;
                row.classList.add("empty-row");
            }
            tbody.appendChild(row);
        }
        
        // Update totals and preview after rendering
        calculateTotals();
        renderPreviewItems();
    }

    /**
     * Render Items in Preview Mode
     * Creates read-only table rows for preview display
     * Always renders exactly 10 rows for consistent layout
     */
    function renderPreviewItems() {
        if (!elements.previewRows) return;
        
        elements.previewRows.innerHTML = "";
        
        // Render exactly 10 rows for consistent spacing
        for (let index = 0; index < 10; index++) {
            const item = state.items[index];
            const row = document.createElement("tr");
            
            if (item) {
                // Row with actual data (read-only)
                row.innerHTML = `
                    <td>${item.description || "—"}</td>
                    <td>${item.quantity || 0}</td>
                    <td>${formatCurrency(item.unit_price || 0)}</td>
                    <td>${formatCurrency(item.total || 0)}</td>
                `;
            } else {
                // Empty row for visual spacing
                row.innerHTML = `
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                `;
                row.classList.add("empty-row");
            }
            elements.previewRows.appendChild(row);
        }
    }

    /**
     * Sync Preview with Form Data
     * Updates all preview elements to match current form values
     * Called before showing preview or generating PDF
     */
    function syncPreview() {
        // Update receipt number
        setText(elements.previewNumberEls, state.receiptNumber);
        
        // Update date with formatted display
        const prettyDate = formatDisplayDate(inputs.issueDate?.value || "");
        setText(elements.previewDateEls, prettyDate);
        
        // Update receipt metadata fields
        setText(elements.previewReceivedFromEls, inputs.receivedFrom?.value || "—");
        setText(elements.previewCustomerNameEls, inputs.customerName?.value || "—");
        setText(elements.previewApprovedByEls, inputs.approvedBy?.value || "—");
        
        // Update payment information
        const amountPaid = Number(inputs.amountPaid?.value) || 0;
        const paymentMethod = inputs.paymentMethod?.value || "—";
        setText(elements.previewAmountEls, `GH₵ ${formatCurrency(amountPaid)}`);
        setText(elements.previewPaymentMethodEls, paymentMethod);
        
        // Update calculated totals
        const totals = calculateTotals();
        setText(elements.previewTotalAmountEls, `GH₵ ${formatCurrency(totals.total)}`);
        setText(elements.previewBalanceEls, `GH₵ ${formatCurrency(totals.balance)}`);
        
        // Re-render preview items
        renderPreviewItems();
    }

    /**
     * Handle Preview Toggle
     * Switches from edit mode to preview mode
     */
    async function handlePreview() {
        // Sync preview with latest data
        syncPreview();
        // Switch to preview mode
        togglePreview(moduleId, true);
    }

    function buildReceiptPayload(previewEl, format) {
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
        const safeBase = String(state.receiptNumber || "receipt").trim().replace(/\s+/g, "_");
        const extension = normalizedFormat === "jpeg" ? "jpg" : "pdf";

        return {
            document_type: "receipt",
            html: wrapper.outerHTML,
            filename: `${safeBase}.${extension}`,
            format: normalizedFormat,
        };
    }

    async function downloadReceiptDocument(format) {
        try {
            syncPreview();

            const previewEl = document.getElementById("receipt-preview");
            if (!previewEl) {
                throw new Error("Preview element not found");
            }

            const payload = buildReceiptPayload(previewEl, format);
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
            syncPreview();
            const reservation = await ensureReceiptNumberReserved();
            const normalizedFormat = chosenFormat === "jpeg" ? "jpeg" : "pdf";
            await downloadReceiptDocument(normalizedFormat);
            const label = normalizedFormat === "jpeg" ? "JPEG" : "PDF";
            const successMessage = `Receipt downloaded as ${label}!`;
            if (reservation?.reserved) {
                showToast(successMessage);
                if (!state.receiptId) {
                    state.receiptNumberReserved = false;
                    await loadNextReceiptNumber();
                }
            } else {
                showToast(`${successMessage} However, a new number could not be reserved.`, "warning");
                if (!state.receiptId) {
                    state.receiptNumberReserved = false;
                    await loadNextReceiptNumber();
                }
            }
        } catch (error) {
            console.error("Failed to download receipt", error);
            showToast(error.message || "Failed to download receipt", "error");
        } finally {
            state.isSaving = false;
            elements.submitBtn?.removeAttribute("disabled");
        }
    }

    function getQueryParam(name) {
        // Get URL query param
        return new URLSearchParams(window.location.search).get(name);
    }

    async function loadExistingReceipt() {
        // Load existing receipt if ID in URL
        const id = getQueryParam("id");
        if (!id) return;
        try {
            const data = await callApi(`/receipts/api/${id}/`);
            state.receiptId = data.id;
            setReceiptNumber(data.receipt_number || state.receiptNumber, { reserved: true });
            if (inputs.receivedFrom) inputs.receivedFrom.value = data.received_from || "";
            if (inputs.amount) inputs.amount.value = data.amount ?? "";
            if (inputs.paymentMethod) inputs.paymentMethod.value = data.payment_method || "";
            if (inputs.description) inputs.description.value = data.description || "";
            if (inputs.approvedBy) inputs.approvedBy.value = data.approved_by || "";
            if (inputs.issueDate && data.issue_date) inputs.issueDate.value = data.issue_date;
            syncPreview();
        } catch (error) {
            console.error("Failed to load receipt", error);
            showToast("Could not load receipt details", "error");
        }
    }

    function attachEventListeners() {
        // Attach event listeners
        elements.previewToggleBtn?.addEventListener("click", () => {
            handlePreview();
        });

        elements.submitBtn?.addEventListener("click", () => {
            handleSave();
        });

        elements.addItemBtn?.addEventListener("click", () => {
            if (state.items.length >= 10) {
                showToast("Maximum 10 items allowed", "error");
                return;
            }
            state.items.push({ description: "", quantity: 0, unit_price: 0, total: 0 });
            renderItems();
        });

        elements.itemsTable?.addEventListener("input", (event) => {
            const input = event.target;
            if (!input.matches("[data-index]")) return;
            
            const index = Number(input.getAttribute("data-index"));
            const field = input.getAttribute("data-field");
            const value = input.value;
            
            if (state.items[index]) {
                state.items[index][field] = value;
                
                // Calculate total
                const qty = Number(state.items[index].quantity) || 0;
                const price = Number(state.items[index].unit_price) || 0;
                state.items[index].total = qty * price;
                
                renderItems();
            }
        });

        elements.itemsTable?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-remove]");
            if (!button) return;
            const index = Number(button.getAttribute("data-remove"));
            state.items.splice(index, 1);
            renderItems();
        });

        elements.exitPreviewBtn?.addEventListener("click", () => {
            togglePreview(moduleId, false);
        });

        // Recalculate totals when amount paid changes
        inputs.amountPaid?.addEventListener("input", () => {
            calculateTotals();
            syncPreview();
        });

        // Live preview sync for a responsive feel
        form.addEventListener("input", () => {
            syncPreview();
        });
    }

    async function loadNextReceiptNumber() {
        // Load the next receipt number from the counter API
        if (state.receiptNumberReserved || state.receiptId) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE}/api/counter/receipt/next/`);
            if (response.ok) {
                const data = await response.json();
                setReceiptNumber(data.next_number || state.receiptNumber, { reserved: false });
            }
        } catch (error) {
            console.warn("Failed to load next receipt number", error);
        }
    }

    (async function init() {
        // Init function
        attachEventListeners();
        await loadNextReceiptNumber();  // Load the next number on page load
        await loadExistingReceipt();
        syncPreview();
    })();
})();
