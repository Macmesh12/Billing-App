/* ============================================
   RECEIPT MODULE - MAIN JAVASCRIPT
   ============================================
   This file handles all receipt functionality including:
   - Line item management (add, edit, remove)
   - Real-time calculations (total, balance)
   - Preview mode toggling
   - Form validation and submission
   - PDF export functionality
   - API integration for saving receipts
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
    const formatCurrency = typeof helpers.formatCurrency === "function" ? helpers.formatCurrency : (value) => Number(value || 0).toFixed(2);

    // ============================================
    // MODULE INITIALIZATION
    // ============================================
    
    const moduleId = "receipt-module"; // ID of the receipt module element
    const moduleEl = document.getElementById(moduleId); // Reference to module DOM element
    const form = document.getElementById("receipt-form"); // Reference to receipt form
    
    // Exit early if required elements are not found
    if (!moduleEl || !form) return;

    const config = window.BILLING_APP_CONFIG || {};
    const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765"; // API base URL with fallback

    // DOM element references for receipt form and preview
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

    // Form input field references
    const inputs = {
        receivedFrom: document.getElementById("receipt-received-from"),
        customerName: document.getElementById("receipt-customer-name"),
        approvedBy: document.getElementById("receipt-approved-by"),
        issueDate: document.getElementById("receipt-issue-date"),
        amountPaid: document.getElementById("receipt-amount-paid"),
        paymentMethod: document.getElementById("receipt-payment-method"),
    };

    // Display element references for calculated values
    const displays = {
        totalDisplay: document.getElementById("receipt-total-display"),
        balanceDisplay: document.getElementById("receipt-balance-display"),
    };

    // Application state object
    const state = {
        receiptId: null, // Database ID of current receipt (null for new receipt)
        receiptNumber: "REC-NEW", // Current receipt number
        receiptNumberReserved: false, // Whether the number is reserved in the counter
        isSaving: false, // Flag to prevent concurrent save operations
        items: [], // Array of line items
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Set the receipt number in state and update all displays
     * @param {string} value - The receipt number to set
     * @param {Object} options - Options object
     * @param {boolean} options.reserved - Whether the number is reserved
     */
    function setReceiptNumber(value, { reserved = false } = {}) {
        if (!value) {
            return;
        }
        state.receiptNumber = value;
        state.receiptNumberReserved = reserved;
        if (elements.number) {
            elements.number.textContent = state.receiptNumber;
        }
        setText(elements.previewNumberEls, state.receiptNumber);
    }

    /**
     * Ensure a receipt number is reserved before saving
     * @returns {Promise<Object>} Object with number, reserved flag, and optional error
     */
    async function ensureReceiptNumberReserved() {
        if (state.receiptNumberReserved && state.receiptNumber) {
            return { number: state.receiptNumber, reserved: true };
        }
        try {
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
     * Set text content on a single element or NodeList
     * @param {Element|NodeList} target - Element or elements to update
     * @param {string} text - Text to set
     */
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

    /**
     * Get field value or placeholder/fallback
     * @param {HTMLInputElement} field - Input field
     * @param {string} fallback - Fallback text if no value or placeholder
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
     * Format a date value for display
     * @param {string} value - Date value (ISO format or other)
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
     * Display a toast notification message
     * @param {string} message - Message to display
     * @param {string} tone - Toast style: "success", "error", or "warning"
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

    /**
     * Make an API call with error handling
     * @param {string} path - API endpoint path
     * @param {Object} options - Fetch options
     * @returns {Promise<Object|null>} Response data or null
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
        if (!response.ok) {
            let detail = await response.json().catch(() => ({}));
            const message = detail.errors ? JSON.stringify(detail.errors) : `${response.status} ${response.statusText}`;
            throw new Error(message);
        }
        if (response.status === 204) return null;
        return response.json();
    }

    function calculateTotals() {
        // Calculate total amount from items
        const total = state.items.reduce((sum, item) => sum + (item.total || 0), 0);
        const amountPaid = Number(inputs.amountPaid?.value) || 0;
        const balance = total - amountPaid;
        
        // Update displays
        if (displays.totalDisplay) {
            displays.totalDisplay.textContent = `GH₵ ${formatCurrency(total)}`;
        }
        if (displays.balanceDisplay) {
            displays.balanceDisplay.textContent = `GH₵ ${formatCurrency(balance)}`;
        }
        
        return { total, amountPaid, balance };
    }

    function renderItems() {
        // Render items in the table - always show 10 rows
        const tbody = elements.itemsTable?.querySelector("tbody");
        if (!tbody) return;
        
        tbody.innerHTML = "";
        
        // Render up to 10 rows
        for (let index = 0; index < 10; index++) {
            const item = state.items[index] || {};
            const row = document.createElement("tr");
            
            if (index < state.items.length) {
                // Row with data and inputs
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
        
        calculateTotals();
        renderPreviewItems();
    }

    function renderPreviewItems() {
        // Render items in preview mode - always show 10 rows
        if (!elements.previewRows) return;
        
        elements.previewRows.innerHTML = "";
        
        // Render up to 10 rows
        for (let index = 0; index < 10; index++) {
            const item = state.items[index];
            const row = document.createElement("tr");
            
            if (item) {
                // Row with actual data
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

    function syncPreview() {
        // Sync preview with form data
        setText(elements.previewNumberEls, state.receiptNumber);
        const prettyDate = formatDisplayDate(inputs.issueDate?.value || "");
        setText(elements.previewDateEls, prettyDate);
        setText(elements.previewReceivedFromEls, inputs.receivedFrom?.value || "—");
        setText(elements.previewCustomerNameEls, inputs.customerName?.value || "—");
        setText(elements.previewApprovedByEls, inputs.approvedBy?.value || "—");
        
        const amountPaid = Number(inputs.amountPaid?.value) || 0;
        const paymentMethod = inputs.paymentMethod?.value || "—";
        setText(elements.previewAmountEls, `GH₵ ${formatCurrency(amountPaid)}`);
        setText(elements.previewPaymentMethodEls, paymentMethod);
        
        const totals = calculateTotals();
        setText(elements.previewTotalAmountEls, `GH₵ ${formatCurrency(totals.total)}`);
        setText(elements.previewBalanceEls, `GH₵ ${formatCurrency(totals.balance)}`);
        
        renderPreviewItems();
    }

    async function handlePreview() {
        // Handle preview toggle
        syncPreview();
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
