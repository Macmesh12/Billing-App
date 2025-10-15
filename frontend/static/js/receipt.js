/* ============================================
   RECEIPT MODULE - MAIN JAVASCRIPT
   ============================================
   This file handles all receipt functionality including:
   - Line item management (add, edit, remove)
   - Real-time calculations (totals, balance)
   - Preview mode toggling
   - Form validation
   - PDF and JPEG export functionality
   - API integration for document numbering
   
   EDIT MODE:
   - Users fill out form with line items, payment info
   - Real-time calculation of totals and balance
   - "Preview" button switches to preview mode
   
   PREVIEW MODE:
   - Read-only view matching final document output
   - "Download" button triggers format selection
   - "Back to Edit" returns to edit mode
   
   PDF/JPEG DOWNLOAD PROCESS:
   1. User clicks "Download" button
   2. chooseDownloadFormat() shows modal dialog
   3. User selects PDF or JPEG format
   4. syncPreviewFromForm() updates preview with form data
   5. buildDocumentPayload() clones preview HTML
   6. Payload sent to /api/pdf/render/ endpoint
   7. Backend generates PDF (or JPEG from PDF)
   8. Browser downloads file
   ============================================ */

// IIFE (Immediately Invoked Function Expression) to encapsulate module logic
(function () {
    // ============================================
    // DEPENDENCIES AND GLOBAL REFERENCES
    // ============================================
    
    // Get helper functions from global BillingApp object (defined in main.js)
    const helpers = window.BillingApp || {};
    
    // Extract helper functions with fallbacks
    const togglePreview = typeof helpers.togglePreview === "function" ? helpers.togglePreview : () => {};
    const chooseDownloadFormat = typeof helpers.chooseDownloadFormat === "function" ? helpers.chooseDownloadFormat : async () => "pdf";
    const formatCurrency = typeof helpers.formatCurrency === "function" ? helpers.formatCurrency : (value) => Number(value || 0).toFixed(2);

    const moduleId = "receipt-module";
    // Module ID
    const moduleEl = document.getElementById(moduleId);
    // Module element
    const form = document.getElementById("receipt-form");
    // Form element
    if (!moduleEl || !form) return;
    // Exit if elements not found

    const config = window.BILLING_APP_CONFIG || {};
    // Global config
    const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";
    // API base URL

    const elements = {
        // DOM elements object
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

    const inputs = {
        // Input elements object
        receivedFrom: document.getElementById("receipt-received-from"),
        customerName: document.getElementById("receipt-customer-name"),
        approvedBy: document.getElementById("receipt-approved-by"),
        issueDate: document.getElementById("receipt-issue-date"),
        amountPaid: document.getElementById("receipt-amount-paid"),
        paymentMethod: document.getElementById("receipt-payment-method"),
    };

    const displays = {
        totalDisplay: document.getElementById("receipt-total-display"),
        balanceDisplay: document.getElementById("receipt-balance-display"),
    };

    const state = {
        // State object
        receiptId: null,
        receiptNumber: "REC-NEW",
        receiptNumberReserved: false,
        isSaving: false,
        items: [],
    };

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

    /**
     * Build payload for PDF/JPEG generation from preview HTML
     * 
     * This function prepares the receipt preview HTML for server-side
     * rendering into PDF or JPEG format.
     * 
     * PROCESS:
     * 1. Clone preview DOM to avoid modifying visible preview
     * 2. Remove interactive elements (exit buttons, etc.)
     * 3. Wrap in .pdf-export-wrapper for proper styling
     * 4. Generate safe filename from receipt number
     * 5. Return payload object for API submission
     * 
     * The backend will:
     * - Parse the HTML string
     * - Apply CSS styles (general.css + receipt.css)
     * - Use WeasyPrint to render PDF at A4 size
     * - If JPEG: convert first page of PDF to image
     * - Return binary file for download
     * 
     * @param {HTMLElement} previewEl - Preview document element to clone
     * @param {string} format - Desired format ("pdf" or "jpeg")
     * @returns {Object} Payload object with document_type, html, filename, format
     */
    function buildReceiptPayload(previewEl, format) {
        // Clone preview element to avoid modifying original
        const clone = previewEl.cloneNode(true);
        clone.removeAttribute("hidden");
        clone.setAttribute("data-pdf-clone", "true");
        clone.classList.add("pdf-export");
        
        // Remove interactive elements that shouldn't appear in PDF/JPEG
        clone.querySelectorAll("[data-exit-preview]").forEach((el) => el.remove());
        clone.querySelectorAll(".preview-actions").forEach((el) => el.remove());

        // Wrap in pdf-export-wrapper div for proper A4 sizing
        // This wrapper gets special CSS treatment for print layout
        const wrapper = document.createElement("div");
        wrapper.className = "pdf-export-wrapper";
        wrapper.appendChild(clone);

        // Normalize format and generate safe filename
        const normalizedFormat = format === "jpeg" ? "jpeg" : "pdf";
        const safeBase = String(state.receiptNumber || "receipt").trim().replace(/\s+/g, "_");
        const extension = normalizedFormat === "jpeg" ? "jpg" : "pdf";

        // Return payload for API submission
        return {
            document_type: "receipt",
            html: wrapper.outerHTML,
            filename: `${safeBase}.${extension}`,
            format: normalizedFormat,
        };
    }

    /**
     * Download receipt as PDF or JPEG file
     * 
     * This function handles the complete download workflow:
     * 1. Sync preview with latest form data
     * 2. Build HTML payload from preview
     * 3. Send to backend API for rendering
     * 4. Download resulting file
     * 
     * BACKEND RENDERING:
     * The backend /api/pdf/render/ endpoint:
     * - Receives HTML + format specification
     * - Applies CSS stylesheets (general.css + receipt.css)
     * - Uses WeasyPrint to render HTML to PDF
     * - For JPEG: Converts PDF to image using Pillow/ImageMagick
     * - Returns binary file with appropriate Content-Type
     * 
     * PDF FORMAT: application/pdf, best for printing
     * JPEG FORMAT: image/jpeg, best for sharing digitally
     * 
     * @param {string} format - Desired format ("pdf" or "jpeg")
     * @throws {Error} If preview element not found, network fails, or server errors
     */
    async function downloadReceiptDocument(format) {
        try {
            // Ensure preview is up-to-date with form data
            syncPreview();

            // Get preview element to clone
            const previewEl = document.getElementById("receipt-preview");
            if (!previewEl) {
                throw new Error("Preview element not found");
            }

            // Build payload for backend
            const payload = buildReceiptPayload(previewEl, format);
            const normalizedFormat = payload.format === "jpeg" ? "jpeg" : "pdf";

            // Log debug info for troubleshooting
            console.log("Sending render request to:", `${API_BASE}/api/pdf/render/`);
            console.log("Requested format:", normalizedFormat);
            console.log("Payload size:", JSON.stringify(payload).length, "bytes");

            // Send render request to backend
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

            // Check for server errors
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Render error response:", errorText);
                throw new Error(`Failed to generate document: ${response.status} ${response.statusText}`);
            }

            // Download file using blob URL technique
            // This works for both PDF and JPEG formats
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = payload.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); // Clean up blob URL
        } catch (error) {
            console.error("Download document error:", error);
            throw error;
        }
    }

    /**
     * Handle "Download" button click
     * 
     * This is the main entry point for the download workflow.
     * 
     * WORKFLOW:
     * 1. Show format selection dialog (PDF or JPEG)
     * 2. Reserve receipt number from server
     * 3. Sync preview with form data
     * 4. Download document in chosen format
     * 5. Show success/error message
     * 6. Reserve new number for next receipt
     * 
     * DOWNLOAD vs SAVE:
     * Note: Despite the function name, this actually downloads
     * the document rather than saving to database. The receipt
     * number is reserved to ensure uniqueness across downloads.
     * 
     * @async
     */
    async function handleSave() {
        // Prevent multiple simultaneous downloads
        if (state.isSaving) return;

        state.isSaving = true;
        elements.submitBtn?.setAttribute("disabled", "disabled");

        try {
            // Step 1: Show format selection dialog
            const chosenFormat = await chooseDownloadFormat();
            if (!chosenFormat) {
                // User cancelled, abort download
                return;
            }
            
            // Step 2: Sync preview and reserve receipt number
            syncPreview();
            const reservation = await ensureReceiptNumberReserved();
            
            // Step 3: Download document in chosen format
            const normalizedFormat = chosenFormat === "jpeg" ? "jpeg" : "pdf";
            await downloadReceiptDocument(normalizedFormat);
            
            // Step 4: Show success message
            const label = normalizedFormat === "jpeg" ? "JPEG" : "PDF";
            const successMessage = `Receipt downloaded as ${label}!`;
            
            if (reservation?.reserved) {
                showToast(successMessage);
                // Step 5: Reserve new number for next receipt
                if (!state.receiptId) {
                    state.receiptNumberReserved = false;
                    await loadNextReceiptNumber();
                }
            } else {
                // Number reservation failed, warn user
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
            // Re-enable download button
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
