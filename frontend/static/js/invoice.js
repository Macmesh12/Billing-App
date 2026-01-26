/* ============================================
   INVOICE MODULE - MAIN JAVASCRIPT
   ============================================
   This file handles all invoice functionality including:
   - Line item management (add, edit, remove)
   - Real-time calculations (subtotal, taxes, total)
   - Preview mode toggling
   - Form validation and submission
   - PDF export functionality
   - API integration for saving invoices
   ============================================ */

// IIFE (Immediately Invoked Function Expression) to encapsulate module logic
// This prevents polluting the global namespace
(function () {
    /**
     * DOM Ready Helper Function
     * Ensures code runs only after the DOM is fully loaded
     * @param {Function} callback - Function to execute when DOM is ready
     */
    function onReady(callback) {
        if (document.readyState === "loading") {
            // DOM still loading, wait for DOMContentLoaded event
            document.addEventListener("DOMContentLoaded", callback, { once: true });
        } else {
            // DOM already loaded, execute immediately
            callback();
        }
    }

    // Execute when DOM is ready
    onReady(() => {
        // ============================================
        // HELPER FUNCTIONS AND UTILITIES
        // ============================================
        
        // Get helper functions from global BillingApp object (defined in main.js)
        const helpers = window.BillingApp || {};
        
        /**
         * Format Currency Helper
         * Converts numbers to currency strings (e.g., 1234.5 -> "1234.50")
         * @param {number} value - Number to format
         * @returns {string} Formatted currency string
         */
        const formatCurrency = typeof helpers.formatCurrency === "function"
            ? helpers.formatCurrency
            : (value) => Number(value || 0).toFixed(2);
        
        /**
         * Format Quantity Helper
         * Formats quantities, showing decimals only when needed
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
        
        /**
         * Parse Number Helper
         * Safely converts strings to numbers, defaulting to 0 on failure
         * @param {string|number} value - Value to parse
         * @returns {number} Parsed number
         */
        const parseNumber = typeof helpers.parseNumber === "function"
            ? helpers.parseNumber
            : (value) => Number.parseFloat(value || 0) || 0;

        // ============================================
        // MODULE INITIALIZATION
        // ============================================
        console.log('[Invoice] invoice.js loaded and DOM ready');
        
        const moduleId = "invoice-module"; // ID of the invoice module element
        const moduleEl = document.getElementById(moduleId); // Reference to module DOM element
        console.log('[Invoice] moduleEl:', moduleEl);
        const form = document.getElementById("invoice-form"); // Reference to invoice form
        console.log('[Invoice] form:', form);
        
        // Exit early if required elements are not found
        if (!moduleEl || !form) {
            console.error('[Invoice] Missing required elements! moduleEl:', moduleEl, 'form:', form);
            return;
        }
        console.log('[Invoice] All required elements found, continuing initialization...');

        // Preview mode removed: no-op fallback retained for compatibility
        const togglePreview = typeof helpers.togglePreview === "function"
            ? (moduleIdentifier, isPreview) => helpers.togglePreview(moduleIdentifier, isPreview)
            : () => {};
        // Function to toggle between edit and preview modes with fallback

        const config = window.BILLING_APP_CONFIG || {};
        // Global config object from window
    const API_BASE = config.apiBaseUrl || (window.location ? window.location.origin : "http://127.0.0.1:8765");
        // Base URL for API calls

    const elements = {
        // Object containing references to key DOM elements
        itemsPayload: document.getElementById("invoice-items-payload"),
        itemsTableBody: document.querySelector("#invoice-items-table tbody"),
        subtotal: document.getElementById("invoice-subtotal"),
        levyTotal: document.getElementById("invoice-levy-total"),
        vat: document.getElementById("invoice-vat"),
        grandTotal: document.getElementById("invoice-grand-total"),
        levyContainer: document.getElementById("invoice-levies"),
        discountPct: document.getElementById("invoice-discount-pct"),
        discountAmount: document.getElementById("invoice-discount-amount"),
        totalWithoutVatAfterDiscount: document.getElementById("invoice-total-without-vat-after-discount"),
        addItemBtn: document.getElementById("invoice-add-item"),
        leviesToggleBtn: document.getElementById("invoice-levies-toggle"),
        leviesToggleLabel: document.getElementById("invoice-levies-toggle-label"),
        previewToggleBtn: document.getElementById("invoice-preview-toggle"),
        previewBackBtn: document.getElementById("invoice-back-to-edit"),
        
    submitBtn: document.getElementById("invoice-submit"),
    saveBtn: document.getElementById("invoice-save"),
    saveDraftBtn: document.getElementById("invoice-save-draft"),
        toast: document.getElementById("invoice-toast"),
        invoiceNumber: document.getElementById("invoice-number"),
        // preview elements intentionally omitted (preview UI removed)
    };

    // Subtotal label and rows
    const subtotalLabelEl = document.getElementById("invoice-subtotal-label");
    const levyTotalRowEl = document.getElementById("invoice-levy-total-row");
    const vatRowEl = document.getElementById("invoice-vat-row");
    const grandTotalRowEl = document.getElementById("invoice-grand-total-row");

    const inputs = {
        // Object containing references to form input elements
        customer: document.getElementById("invoice-customer"),
        classification: document.getElementById("invoice-classification"),
        issueDate: document.getElementById("invoice-issue-date"),
        companyName: document.getElementById("invoice-company-name"),
        companyInfo: document.getElementById("invoice-company-info"),
        clientRef: document.getElementById("invoice-client-ref"),
        intro: document.getElementById("invoice-intro"),
        notes: document.getElementById("invoice-notes"),
        signatory: document.getElementById("invoice-signatory"),
        contact: document.getElementById("invoice-contact"),
    };

        // Helper function to generate SPQ + 2 uppercase letters + 4 digits
        function generateSPQNumber() {
            const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
            const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
            return `SPQ${letters}${digits}`;
        }

    const state = {
        // Application state object
        items: [
            { description: "", quantity: 0, unit_price: 0, total: 0, enabled: true },
            { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
            { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
        ],
        levies: [],
        invoiceId: null,
        invoiceNumber: generateSPQNumber(),
        draftId: null,
        isSaving: false,
        showLevies: true,
    };

    // Increment document number helper: preserves prefix and zero-padding
    function incrementDocumentNumber(numStr) {
        if (!numStr || typeof numStr !== 'string') return numStr;
        const m = numStr.match(/^(.*?)(\d+)$/);
        if (!m) return numStr;
        const prefix = m[1] || '';
        const digits = m[2] || '0';
        const n = parseInt(digits, 10) + 1;
        const padded = n.toString().padStart(digits.length, '0');
        return prefix + padded;
    }

    const levyValueMap = new Map();
    // Map to store levy value elements for quick updates
    const previewLevyValueMap = new Map();
    // Map for preview levy elements

    const DEFAULT_TAX_SETTINGS = [
        { name: "NHIL", rate: 0.025, isVat: false },
        { name: "GETFund Levy", rate: 0.025, isVat: false },
        { name: "COVID", rate: 0.01, isVat: false },
        { name: "VAT", rate: 0.15, isVat: true },
    ];

    function normalizeTaxSettings(taxSettings) {
        if (!taxSettings || typeof taxSettings !== "object") {
            return DEFAULT_TAX_SETTINGS.map((entry) => ({ ...entry }));
        }
        return Object.entries(taxSettings).map(([name, rate]) => ({
            name,
            rate: Number(rate) || 0,
            isVat: name.trim().toUpperCase() === "VAT",
        }));
    }

    function showToast(message, tone = "success") {
        // Function to display toast notifications
        const el = elements.toast;
        if (!el) return;
        el.textContent = message;
        el.className = `module-toast is-${tone}`;
        el.hidden = false;
        setTimeout(() => {
            el.hidden = true;
        }, 4000);
    }

    function buildPayload() {
        // Function to build JSON payload from form data
        return {
            customer_name: inputs.customer?.value || "",
            classification: inputs.classification?.value || "",
            issue_date: inputs.issueDate?.value || "",
            // Only include enabled (non-placeholder) items in the payload
            items_payload: JSON.stringify(serializeItems()),
            // Discount percentage (client-side preview)
            discount_pct: Number(document.getElementById('invoice-discount-pct')?.value || 0),
        };
    }

    async function callApi(path, options = {}) {
        // Function to make API calls with error handling
        const url = `${API_BASE}${path}`;
        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
            ...options,
        });
        if (!response.ok) {
            let errorDetail = await response.json().catch(() => ({}));
            const message = errorDetail.errors ? JSON.stringify(errorDetail.errors) : `${response.status} ${response.statusText}`;
            throw new Error(message);
        }
        if (response.status === 204) {
            return null;
        }
        return response.json();
    }

    function valueOrPlaceholder(field, fallback = "—") {
        if (!field) return fallback;
        const value = (field.value || "").trim();
        if (value) return value;
        return field.placeholder ? field.placeholder.trim() : fallback;
    }

    function renderPreviewNotes(notesText) {
        if (!elements.previewNotesList) return;
        elements.previewNotesList.innerHTML = "";
        const lines = (notesText || "").split(/\r?\n/)
            .map((line) => line.replace(/^[-•\s]+/, "").trim())
            .filter(Boolean);

        if (lines.length === 0) {
            const placeholderItem = document.createElement("li");
            placeholderItem.className = "empty-state";
            placeholderItem.textContent = "Add notes to display terms.";
            elements.previewNotesList.appendChild(placeholderItem);
            return;
        }

        lines.forEach((line) => {
            const item = document.createElement("li");
            item.textContent = line;
            elements.previewNotesList.appendChild(item);
        });
    }

    function renderLevyPlaceholders() {
        // Function to render levy placeholders in edit section and optionally preview
        if (!elements.levyContainer) return;
        elements.levyContainer.innerHTML = "";
        levyValueMap.clear();

        const previewContainer = document.getElementById("invoice-preview-levies");
        const hasPreview = Boolean(previewContainer);
        if (hasPreview) {
            previewContainer.innerHTML = "";
            previewLevyValueMap.clear();
        }

        state.levies
            .filter(({ isVat }) => !isVat)
            .forEach(({ name, rate }) => {
            const line = document.createElement("p");
            line.innerHTML = `<span>${name} (${(rate * 100).toFixed(2)}%):</span> <span data-levy="${name}">0.00</span>`;
            elements.levyContainer.appendChild(line);
            const valueEl = line.querySelector("[data-levy]");
            levyValueMap.set(name, valueEl);

            if (hasPreview) {
                const previewLine = document.createElement("p");
                previewLine.innerHTML = `<span>${name} (${(rate * 100).toFixed(2)}%):</span> <span data-preview-levy="${name}">0.00</span>`;
                previewContainer.appendChild(previewLine);
                const previewVal = previewLine.querySelector("[data-preview-levy]");
                previewLevyValueMap.set(name, previewVal);
            }
            });

            // show/hide the levy area based on state.showLevies
            try {
                if (!state.showLevies) {
                    if (elements.levyContainer) elements.levyContainer.style.display = 'none';
                    if (levyTotalRowEl) levyTotalRowEl.style.display = 'none';
                    if (vatRowEl) vatRowEl.style.display = 'none';
                    if (grandTotalRowEl) grandTotalRowEl.style.display = 'none';
                    if (subtotalLabelEl) subtotalLabelEl.textContent = 'Total';
                    // emphasize the total value in edit
                    if (elements.subtotal) elements.subtotal.classList.add('invoice-total-large');
                    // emphasize preview subtotal only if it exists
                    const previewSubtotalEl = document.getElementById('invoice-preview-subtotal');
                    if (previewSubtotalEl) previewSubtotalEl.classList.add('invoice-total-large');
                } else {
                    if (elements.levyContainer) elements.levyContainer.style.display = '';
                    if (levyTotalRowEl) levyTotalRowEl.style.display = '';
                    if (vatRowEl) vatRowEl.style.display = '';
                    if (grandTotalRowEl) grandTotalRowEl.style.display = '';
                    if (subtotalLabelEl) subtotalLabelEl.textContent = 'Sub Total (Without VAT)';
                    if (elements.subtotal) elements.subtotal.classList.remove('invoice-total-large');
                    const previewSubtotalEl = document.getElementById('invoice-preview-subtotal');
                    if (previewSubtotalEl) previewSubtotalEl.classList.remove('invoice-total-large');
                }
            } catch (e) { /* ignore */ }
    }

    function renderItems() {
        // Render only the actual items in the table and preview; don't show placeholder rows by default.
        const tableBody = elements.itemsTableBody;
        const previewBody = elements.previewRows;
        if (tableBody) tableBody.innerHTML = "";
        if (previewBody) previewBody.innerHTML = "";

        // Render one row per item in state.items (no fixed limit)
        state.items.forEach((item, index) => {
            if (item && item.enabled === false) {
                // Placeholder row: not active until Add Item enables it
                const placeholder = document.createElement("tr");
                placeholder.className = 'item-placeholder';
                placeholder.innerHTML = `
                    <td class="placeholder-cell">&nbsp;</td>
                    <td class="placeholder-cell">&nbsp;</td>
                    <td class="placeholder-cell">&nbsp;</td>
                    <td class="row-total">&nbsp;</td>
                    <td></td>
                `;
                tableBody?.appendChild(placeholder);

                const previewRow = document.createElement("tr");
                previewRow.innerHTML = `
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                `;
                previewBody?.appendChild(previewRow);
                return;
            }

            // Active edit row
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><input type="text" data-field="description" data-index="${index}" value="${item.description || ""}" /></td>
                <td><input type="number" step="0.01" data-field="quantity" data-index="${index}" value="${item.quantity || 0}" /></td>
                <td><input type="number" step="0.01" data-field="unit_price" data-index="${index}" value="${item.unit_price || 0}" /></td>
                <td class="row-total">${formatCurrency(item.total || 0)}</td>
                <td><button type="button" class="btn-remove-row" data-remove="${index}" aria-label="Remove row" title="Remove this item">×</button></td>
            `;
            tableBody?.appendChild(row);

            // Preview mode row
            const previewRow = document.createElement("tr");
            previewRow.innerHTML = `
                <td>${item.description || ""}</td>
                <td>${formatQuantity(item.quantity || 0)}</td>
                <td>${formatCurrency(item.unit_price || 0)}</td>
                <td>${formatCurrency(item.total || 0)}</td>
            `;
            previewBody?.appendChild(previewRow);
        });

        if (elements.itemsPayload) {
            // Only include enabled rows in the payload
            const payloadItems = state.items.filter(i => i && i.enabled !== false).map((it) => ({
                description: it.description || "",
                quantity: parseNumber(it.quantity || 0),
                unit_price: parseNumber(it.unit_price || 0),
                total: parseNumber(it.total || 0),
            }));
            elements.itemsPayload.value = JSON.stringify(payloadItems);
        }

        recalcTotals();
    }

    function recalcTotals() {
        // Function to recalculate and update totals display
        const subtotal = state.items.reduce((sum, item) => {
            if (!item || item.enabled === false) return sum;
            return sum + parseNumber(item.total);
        }, 0);
        elements.subtotal && (elements.subtotal.textContent = formatCurrency(subtotal));
        elements.previewSubtotal && (elements.previewSubtotal.textContent = formatCurrency(subtotal));
        // Read discount percentage (apply after levies/VAT)
        const discountPct = parseNumber(elements.discountPct?.value) || 0;
        let levyTotal = 0;
        let vatAmount = 0;

        if (state.showLevies) {
            // Levies/VAT are calculated on the subtotal (before discount)
            state.levies.forEach(({ name, rate, isVat }) => {
                const amount = subtotal * rate;
                if (isVat) {
                    vatAmount = amount;
                    return;
                }
                const levyEl = levyValueMap.get(name);
                if (levyEl) {
                    levyEl.textContent = formatCurrency(amount);
                }
                const previewEl = previewLevyValueMap.get(name);
                if (previewEl) {
                    previewEl.textContent = formatCurrency(amount);
                }
                levyTotal += amount;
            });
        } else {
            // zero out displayed levy values
            levyValueMap.forEach((el) => { if (el) el.textContent = formatCurrency(0); });
            previewLevyValueMap.forEach((el) => { if (el) el.textContent = formatCurrency(0); });
            if (elements.levyTotal) elements.levyTotal.textContent = formatCurrency(0);
            if (elements.previewLevyTotal) elements.previewLevyTotal.textContent = formatCurrency(0);
            if (elements.vat) elements.vat.textContent = formatCurrency(0);
            if (elements.previewVat) elements.previewVat.textContent = formatCurrency(0);
        }
        // Update levy and VAT displays
        const totalLeviesAndValue = subtotal + levyTotal;
        elements.levyTotal && (elements.levyTotal.textContent = formatCurrency(totalLeviesAndValue));
        elements.previewLevyTotal && (elements.previewLevyTotal.textContent = formatCurrency(totalLeviesAndValue));
        elements.vat && (elements.vat.textContent = formatCurrency(vatAmount));
        elements.previewVat && (elements.previewVat.textContent = formatCurrency(vatAmount));

        // Pre-discount total (subtotal + levies + VAT)
        const preDiscountTotal = state.showLevies ? (subtotal + levyTotal + vatAmount) : subtotal;
        const discountAmount = parseNumber(preDiscountTotal * (discountPct / 100) || 0);
        elements.discountAmount && (elements.discountAmount.textContent = formatCurrency(discountAmount));

        // Total without VAT (subtotal + non-VAT levies)
        const totalWithoutVat = subtotal + levyTotal;
        const totalWithoutVatAfterDiscount = Math.max(0, totalWithoutVat - discountAmount);
        elements.totalWithoutVatAfterDiscount && (elements.totalWithoutVatAfterDiscount.textContent = formatCurrency(totalWithoutVatAfterDiscount));

        const grandTotal = Math.max(0, preDiscountTotal - discountAmount);
        elements.grandTotal && (elements.grandTotal.textContent = formatCurrency(grandTotal));
        elements.previewGrand && (elements.previewGrand.textContent = formatCurrency(grandTotal));
        // totalAfterDiscount element removed from markup
    }

    function computeLocalTotals() {
        // Only include enabled items when computing local totals
        const subtotal = (state.items || [])
            .filter((item) => item && item.enabled !== false)
            .reduce((sum, item) => sum + parseNumber(item.total), 0);
        // Read discount percentage (applied after levies/VAT)
        const discountPct = parseNumber(document.getElementById('invoice-discount-pct')?.value) || 0;

        const levyBreakdown = {};
        let levySum = 0;
        let vatAmount = 0;

        // Levies/VAT are calculated on the subtotal (before discount)
        state.levies.forEach(({ name, rate, isVat }) => {
            const amount = subtotal * Number(rate || 0);
            levyBreakdown[name] = amount;
            if (isVat) {
                vatAmount = amount;
            } else {
                levySum += amount;
            }
        });

        const preDiscountTotal = subtotal + levySum + vatAmount;
        const discountAmount = parseNumber(preDiscountTotal * (discountPct / 100) || 0);
        const totalWithoutVat = subtotal + levySum;
        const totalWithoutVatAfterDiscount = Math.max(0, totalWithoutVat - discountAmount);
        const grandTotal = Math.max(0, preDiscountTotal - discountAmount);

        return {
            subtotal,
            discount_pct: discountPct,
            discount_amount: discountAmount,
            pre_discount_total: preDiscountTotal,
            total_without_vat: totalWithoutVat,
            total_without_vat_after_discount: totalWithoutVatAfterDiscount,
            levyTotal: levySum,
            vat: vatAmount,
            grandTotal,
            levies: levyBreakdown,
        };
    }

    function serializeItems() {
        return state.items
            .filter((item) => item && item.enabled !== false)
            .filter((item) => {
                const desc = (item.description || "").trim();
                const quantity = parseNumber(item.quantity);
                const price = parseNumber(item.unit_price);
                const total = parseNumber(item.total);
                return desc || quantity || price || total;
            })
            .map((item) => ({
                description: item.description || "",
                quantity: parseNumber(item.quantity),
                unit_price: parseNumber(item.unit_price),
                total: parseNumber(item.total),
            }));
    }

    function buildInvoiceDocumentPayload(totals) {
        const safeTotals = totals || computeLocalTotals();
        return {
            invoice_number: state.invoiceNumber,
            issue_date: inputs.issueDate?.value || "",
            customer_name: inputs.customer?.value || "",
            classification: inputs.classification?.value || "",
            company_name: inputs.companyName?.value || "",
            company_info: inputs.companyInfo?.value || "",
            client_reference: inputs.clientRef?.value || "",
            intro: inputs.intro?.value || "",
            notes: inputs.notes?.value || "",
            signatory: inputs.signatory?.value || "",
            contact: inputs.contact?.value || "",
            items: serializeItems(),
            levies: state.levies.map((entry) => ({
                name: entry.name,
                rate: Number(entry.rate || 0),
                isVat: Boolean(entry.isVat),
            })),
            totals: {
                subtotal: Number(safeTotals.subtotal || 0),
                discount_pct: Number(safeTotals.discount_pct || 0),
                discount_amount: Number(safeTotals.discount_amount || 0),
                pre_discount_total: Number(safeTotals.pre_discount_total || 0),
                total_without_vat: Number(safeTotals.total_without_vat || 0),
                total_without_vat_after_discount: Number(safeTotals.total_without_vat_after_discount || 0),
                levy_total: Number(safeTotals.levyTotal || 0),
                vat: Number(safeTotals.vat || 0),
                grand_total: Number(safeTotals.grandTotal || 0),
            },
            levy_breakdown: safeTotals.levies || {},
        };
    }

    function syncPreviewFromForm() {
        // Function to sync preview fields with form inputs
        elements.previewCustomer && (elements.previewCustomer.textContent = inputs.customer?.value || "—");
        elements.previewClassification && (elements.previewClassification.textContent = inputs.classification?.value || "—");
        elements.previewDate && (elements.previewDate.textContent = inputs.issueDate?.value || "—");
        elements.previewNumber && (elements.previewNumber.textContent = state.invoiceNumber);
        elements.previewCompanyInfo && (elements.previewCompanyInfo.textContent = valueOrPlaceholder(inputs.companyInfo, "Creative Designs | Logo Creation | Branding | Printing"));
        elements.previewClientRef && (elements.previewClientRef.textContent = valueOrPlaceholder(inputs.clientRef, ""));
        elements.previewIntro && (elements.previewIntro.textContent = valueOrPlaceholder(inputs.intro, "Please find below for your appraisal and detailed pro-forma invoice."));
        // Sync notes into preview list
        renderPreviewNotes(inputs.notes?.value || "");
    }

    async function calculateServerTotals() {
        // Function to calculate totals using server API
        try {
            const payload = buildPayload();
            const result = await callApi("/invoices/api/calculate-preview/", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            if (!result) return null;
            elements.subtotal && (elements.subtotal.textContent = formatCurrency(result.subtotal));
            elements.previewSubtotal && (elements.previewSubtotal.textContent = formatCurrency(result.subtotal));

            let levySum = 0;
            let vatAmount = 0;
            const levyBreakdown = {};
            Object.entries(result.levies || {}).forEach(([name, amount]) => {
                const formattedAmount = formatCurrency(amount);
                levyBreakdown[name] = amount;
                if (name.trim().toUpperCase() === "VAT") {
                    vatAmount = amount;
                    elements.vat && (elements.vat.textContent = formattedAmount);
                    elements.previewVat && (elements.previewVat.textContent = formattedAmount);
                    return;
                }
                levySum += amount;
                const levyEl = levyValueMap.get(name);
                if (levyEl) {
                    levyEl.textContent = formattedAmount;
                }
                const previewEl = previewLevyValueMap.get(name);
                if (previewEl) {
                    previewEl.textContent = formattedAmount;
                }
            });
            // Ensure VAT fields are refreshed even if the server omits the entry
            const vatFormatted = formatCurrency(vatAmount);
            elements.vat && (elements.vat.textContent = vatFormatted);
            elements.previewVat && (elements.previewVat.textContent = vatFormatted);
            const subtotalNumber = Number(result.subtotal || 0);
            const totalLeviesAndValue = subtotalNumber + levySum;
            // If levies are hidden, zero them out locally
            if (!state.showLevies) {
                elements.levyTotal && (elements.levyTotal.textContent = formatCurrency(0));
                elements.previewLevyTotal && (elements.previewLevyTotal.textContent = formatCurrency(0));
                elements.vat && (elements.vat.textContent = formatCurrency(0));
                elements.previewVat && (elements.previewVat.textContent = formatCurrency(0));
                const grandTotal = subtotalNumber;
                elements.grandTotal && (elements.grandTotal.textContent = formatCurrency(grandTotal));
                elements.previewGrand && (elements.previewGrand.textContent = formatCurrency(grandTotal));
                return {
                    subtotal: subtotalNumber,
                    levyTotal: 0,
                    vat: 0,
                    grandTotal: subtotalNumber,
                    levies: {},
                };
            }

            elements.levyTotal && (elements.levyTotal.textContent = formatCurrency(totalLeviesAndValue));
            elements.previewLevyTotal && (elements.previewLevyTotal.textContent = formatCurrency(totalLeviesAndValue));

            const grandTotal = Number(result.grand_total ?? (subtotalNumber + levySum + vatAmount));
            elements.grandTotal && (elements.grandTotal.textContent = formatCurrency(grandTotal));
            elements.previewGrand && (elements.previewGrand.textContent = formatCurrency(grandTotal));

            return {
                subtotal: subtotalNumber,
                levyTotal: levySum,
                vat: vatAmount,
                grandTotal,
                levies: levyBreakdown,
            };
        } catch (error) {
            console.warn("Failed to calculate preview totals", error);
            return null;
        }
    }

    // Simple debounce helper
    function debounce(fn, delay = 250) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    const debouncedServerTotals = debounce(calculateServerTotals, 300);

    // Preview UI removed — handler deleted

    async function preparePreviewSnapshot() {
        renderItems();
        syncPreviewFromForm();
        const totals = await calculateServerTotals();
        return totals || computeLocalTotals();
    }

    async function openPreview() {
        // Prepare preview contents first
        await preparePreviewSnapshot();
        // Prefer the dedicated preview element if present, otherwise the editable form
        const docEl = moduleEl.querySelector('.module-preview') || moduleEl.querySelector('.document') || document.getElementById('invoice-form');
        if (!docEl) {
            showToast('Document not found for preview', 'error');
            return;
        }
        // Use global helper to show overlay preview; if not available, fallback to download preview
        // Use in-place preview if available
        try {
            togglePreview(moduleId, true);
            return;
        } catch (err) {
            console.error('Failed to toggle in-place preview', err);
        }
        showToast('Preview unavailable', 'error');
    }

    async function downloadInvoicePdf() {
        if (
            typeof window.jspdf === "undefined" ||
            typeof window.jspdf.jsPDF === "undefined" ||
            typeof window.html2canvas !== "function"
        ) {
            showToast("PDF generator not available", "error");
            return;
        }
        
        await preparePreviewSnapshot();
        
        // Prefer the dedicated preview element created by togglePreview, fall back to the editable form
        const moduleEl = document.getElementById(moduleId);
        const docEl = (moduleEl && (moduleEl.querySelector('.module-preview') || moduleEl.querySelector('.document'))) || document.getElementById("invoice-form");
        if (!docEl) {
            showToast("Document element not found for PDF export", "error");
            return;
        }

        // Create a wrapper for PDF export
        const exportWrapper = document.createElement("div");
        exportWrapper.className = "module pdf-export-wrapper";
        exportWrapper.setAttribute("aria-hidden", "true");
        exportWrapper.style.cssText = "position: fixed; left: -9999px; top: 0; width: 210mm;";
        
        const clone = docEl.cloneNode(true);
        clone.removeAttribute("hidden");
        clone.setAttribute("data-pdf-clone", "true");
        
        // Force visibility on summary elements with inline styles AND background
        const levyTotalRow = clone.querySelector('.levy-total-row');
        const vatRow = clone.querySelector('.vat-row');
        const grandTotal = clone.querySelector('.grand-total');
        
        if (levyTotalRow) {
            levyTotalRow.style.cssText = 'display: flex !important; justify-content: space-between !important; color: #000000 !important; background-color: transparent !important; font-weight: 900 !important; opacity: 1 !important; padding: 0.5rem 0 !important;';
            levyTotalRow.querySelectorAll('span').forEach(span => {
                span.style.cssText = 'color: #000000 !important; font-weight: 900 !important; opacity: 1 !important; background: none !important;';
            });
        }
        if (vatRow) {
            vatRow.style.cssText = 'display: flex !important; justify-content: space-between !important; color: #000000 !important; background-color: transparent !important; font-weight: 900 !important; opacity: 1 !important; padding: 0.5rem 0 !important;';
            vatRow.querySelectorAll('span').forEach(span => {
                span.style.cssText = 'color: #000000 !important; font-weight: 900 !important; opacity: 1 !important; background: none !important;';
            });
        }
        if (grandTotal) {
            grandTotal.style.cssText = 'display: flex !important; justify-content: space-between !important; color: #000000 !important; background-color: transparent !important; font-weight: 900 !important; opacity: 1 !important; font-size: 1.2rem !important; padding: 0.75rem 0 !important;';
            grandTotal.querySelectorAll('span').forEach(span => {
                span.style.cssText = 'color: #000000 !important; font-weight: 900 !important; opacity: 1 !important; font-size: 1.2rem !important; background: none !important;';
            });
        }
        
        // Convert image paths to absolute URLs for proper loading
        const images = clone.querySelectorAll("img");
        images.forEach((img) => {
            if (img.src && !img.src.startsWith("data:")) {
                // Ensure the image has an absolute URL
                const absoluteUrl = new URL(img.getAttribute("src"), window.location.href).href;
                img.setAttribute("src", absoluteUrl);
                // Add crossorigin attribute to allow CORS
                img.setAttribute("crossorigin", "anonymous");
            }
        });
        
        // The preview element itself is the document
        exportWrapper.appendChild(clone);
        document.body.appendChild(exportWrapper);

        let filename = state.invoiceNumber || "invoice";
        if (!filename.toLowerCase().endsWith(".pdf")) {
            filename = `${filename}.pdf`;
        }

        try {
            showToast("Generating PDF...", "info");

            // Wait for images to load
            const imageElements = Array.from(exportWrapper.querySelectorAll("img"));
            await Promise.all(
                imageElements.map((img) => {
                    return new Promise((resolve) => {
                        if (img.complete) {
                            resolve();
                        } else {
                            img.onload = resolve;
                            img.onerror = resolve; // Continue even if image fails
                        }
                    });
                })
            );

            // Respect the preview's actual document size, not a fixed A4 size
            const rect = clone.getBoundingClientRect();
            const widthPx = Math.max(rect.width || clone.offsetWidth || 794, 1);
            const heightPx = Math.max(rect.height || clone.scrollHeight || 1122, 1);
            // set width to computed px so the canvas rendering matches layout
            clone.style.width = widthPx + 'px';
            clone.style.maxWidth = widthPx + 'px';

            const canvas = await window.html2canvas(clone, {
                scale: 2,
                useCORS: true,
                allowTaint: true, // Allow cross-origin images
                backgroundColor: "#ffffff",
                logging: false,
                width: Math.ceil(widthPx),
                height: Math.ceil(heightPx),
                foreignObjectRendering: false,
                removeContainer: true,
            });

            const { jsPDF } = window.jspdf;

            const imgData = canvas.toDataURL("image/png");
            // Compute PDF dimensions in mm based on element px size
            const pxPerMm = 96 / 25.4; // ~3.7795 px per mm at 96DPI
            const widthMm = Math.max(1, Math.round((widthPx / pxPerMm) * 100) / 100);
            const heightMm = Math.max(1, Math.round((heightPx / pxPerMm) * 100) / 100);
            const pdf = new jsPDF({ orientation: widthMm > heightMm ? 'landscape' : 'portrait', unit: 'mm', format: [widthMm, heightMm], compress: true });
            const pdfWidth = widthMm;
            const pdfHeight = heightMm;
            let renderWidth = pdfWidth;
            let renderHeight = (canvas.height * renderWidth) / canvas.width;

            if (renderHeight > pdfHeight) {
                const ratio = pdfHeight / renderHeight;
                renderHeight = pdfHeight;
                renderWidth = renderWidth * ratio;
            }

            const offsetX = (pdfWidth - renderWidth) / 2;
            const offsetY = (pdfHeight - renderHeight) / 2;

            pdf.addImage(imgData, "PNG", offsetX, offsetY, renderWidth, renderHeight, undefined, "FAST");
            
            // Check if running in Tauri desktop app
            console.log('[Invoice] Checking Tauri availability:', {
                hasTauri: !!window.__TAURI__,
                hasDialog: !!window.__TAURI__?.dialog,
                hasSave: !!window.__TAURI__?.dialog?.save,
                hasFs: !!window.__TAURI__?.fs,
                hasWriteBinaryFile: !!window.__TAURI__?.fs?.writeBinaryFile
            });
            
            const result = { cancelled: false, path: null, name: filename };
            if (window.__TAURI__?.dialog?.save && window.__TAURI__?.fs?.writeBinaryFile) {
                const { dialog, fs } = window.__TAURI__;
                let savePath = await dialog.save({ defaultPath: filename, filters: [{ name: "PDF Document", extensions: ["pdf"] }] });
                if (!savePath) { showToast("PDF save cancelled", "info"); return { cancelled: true }; }
                if (!savePath.toLowerCase().endsWith(".pdf")) savePath = `${savePath}.pdf`;
                const pdfData = pdf.output("arraybuffer");
                const uint8Array = new Uint8Array(pdfData);
                await fs.writeBinaryFile({ path: savePath, contents: uint8Array });
                result.path = savePath;
                result.name = (savePath && savePath.split(/[\\/]/).pop()) || filename;
                showToast("PDF saved successfully!", "success");
            } else {
                pdf.save(filename);
                showToast("PDF downloaded successfully!", "success");
            }

            // Record recent
            try {
                if (typeof helpers.recordRecent === "function" && !result.cancelled) {
                    helpers.recordRecent({
                        name: result.name,
                        path: result.path,
                        type: "invoice",
                        extension: "pdf",
                        lastAction: "save",
                        timestamp: Date.now(),
                        metadata: {
                            number: state.invoiceNumber,
                            customer: inputs.customer?.value || "",
                            issue_date: inputs.issueDate?.value || "",
                            grand_total: Number((await preparePreviewSnapshot())?.grandTotal || 0),
                        },
                    });
                }
            } catch (e) { /* ignore */ }
            return result;
        } catch (error) {
            console.error("PDF generation error:", error);
            showToast("Failed to generate PDF: " + error.message, "error");
        } finally {
            document.body.removeChild(exportWrapper);
        }
    }

    async function handleSave() {
        // Handle PDF download
        if (state.isSaving) return;
        state.isSaving = true;
        elements.submitBtn?.setAttribute("disabled", "disabled");

        try {
            const result = await downloadInvoicePdf();
            if (!result?.cancelled) await incrementInvoiceNumber();
        } finally {
            state.isSaving = false;
            elements.submitBtn?.removeAttribute("disabled");
        }
    }

    async function saveInvoiceFile() {
        if (state.isSaving) return;
        // Use PDF workflow for save
        if (state.isSaving) return;
        state.isSaving = true;
        elements.saveBtn?.setAttribute("disabled", "disabled");
        elements.submitBtn?.setAttribute("disabled", "disabled");
        try {
            showToast("Saving invoice…", "info");
            const result = await downloadInvoicePdf();
            if (result?.cancelled) {
                showToast("Invoice save cancelled.", "info");
                return;
            }
            showToast("Invoice saved.", "success");
            try {
                if (window.Customers && typeof window.Customers.add === 'function') {
                    window.Customers.add(inputs.customer?.value || '');
                }
            } catch (e) { /* ignore */ }
            if (!result?.cancelled) await incrementInvoiceNumber();
        } catch (error) {
            console.error(error);
            showToast("Failed to save invoice.", "error");
        } finally {
            state.isSaving = false;
            elements.saveBtn?.removeAttribute("disabled");
            elements.submitBtn?.removeAttribute("disabled");
        }
    }

    function getQueryParam(name) {
        // Function to get URL query parameter
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    async function loadConfig() {
        // Function to load tax configuration from API
        try {
            const data = await callApi("/invoices/api/config/");
            state.levies = normalizeTaxSettings(data?.tax_settings);
            if (!state.levies.length) {
                state.levies = normalizeTaxSettings();
            }
        } catch (error) {
            console.warn("Failed to load invoice config", error);
            state.levies = normalizeTaxSettings();
        }
        renderLevyPlaceholders();
        recalcTotals();
    }

    async function loadExistingInvoice() {
        // First, check if there's a document in sessionStorage (from loadDocument)
        try {
            const openDocJson = window.sessionStorage?.getItem("billingapp.openDocument");
            if (openDocJson) {
                window.sessionStorage?.removeItem("billingapp.openDocument");
                const openDoc = JSON.parse(openDocJson);
                if (openDoc.type === "invoice" && openDoc.data) {
                    const data = openDoc.data;
                    
                    // Load invoice data from the opened file
                    state.invoiceNumber = data.invoice_number || state.invoiceNumber;
                    elements.invoiceNumber && (elements.invoiceNumber.textContent = state.invoiceNumber);
                    elements.previewNumber && (elements.previewNumber.textContent = state.invoiceNumber);
                    
                    if (inputs.customer) inputs.customer.value = data.customer_name || "";
                    if (inputs.classification) inputs.classification.value = data.classification || "";
                    if (inputs.issueDate && data.issue_date) inputs.issueDate.value = data.issue_date;
                    if (inputs.companyName) inputs.companyName.value = data.company_name || "";
                    if (inputs.companyInfo) inputs.companyInfo.value = data.company_info || "";
                    if (inputs.clientRef) inputs.clientRef.value = data.client_reference || "";
                    if (inputs.intro) inputs.intro.value = data.intro || "";
                    if (inputs.notes) inputs.notes.value = data.notes || "";
                    if (inputs.signatory) inputs.signatory.value = data.signatory || "";
                    if (inputs.contact) inputs.contact.value = data.contact || "";
                    
                    const receivedItems = Array.isArray(data.items) ? data.items : [];
                    state.items = receivedItems.length ? receivedItems : [];
                    renderItems();
                    syncPreviewFromForm();
                    // If we were asked to open directly in preview mode, toggle preview
                    if (openDoc.preview) togglePreview(moduleId, true);
                    return;
                }
            }
        } catch (error) {
            console.warn("Failed to load opened document", error);
        }
        
        // Function to load existing invoice data if ID in URL
        const id = getQueryParam("id");
        if (!id) {
            // Start with three rows: first enabled, next two are placeholders
            state.items = [
                { description: "", quantity: 0, unit_price: 0, total: 0, enabled: true },
                { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
                { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
            ];
            renderItems();
            return;
        }
        try {
            const data = await callApi(`/invoices/api/${id}/`);
            state.invoiceId = data.id;
            state.invoiceNumber = data.invoice_number || state.invoiceNumber;
            elements.invoiceNumber && (elements.invoiceNumber.textContent = state.invoiceNumber);
            elements.previewNumber && (elements.previewNumber.textContent = state.invoiceNumber);
            if (inputs.customer) inputs.customer.value = data.customer_name || "";
            if (inputs.classification) inputs.classification.value = data.classification || "";
            if (inputs.issueDate && data.issue_date) inputs.issueDate.value = data.issue_date;
            const receivedItems = Array.isArray(data.items) ? data.items : [];
            state.items = receivedItems.length ? receivedItems : [];
            renderItems();
        } catch (error) {
            console.error("Failed to load invoice", error);
            // Fallback to three rows with placeholders
            state.items = [
                { description: "", quantity: 0, unit_price: 0, total: 0, enabled: true },
                { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
                { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
            ];
            renderItems();
        }
        syncPreviewFromForm();
    }

    function attachEventListeners() {
        // Function to attach all event listeners
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
            // Update only what's needed to avoid breaking typing focus
            const rowEl = target.closest("tr");
            const totalEl = rowEl ? rowEl.querySelector(".row-total") : null;
            if (totalEl) totalEl.textContent = formatCurrency(item.total || 0);
            if (elements.itemsPayload) {
                elements.itemsPayload.value = JSON.stringify(state.items);
            }
            recalcTotals();
            debouncedServerTotals();
        });

        elements.itemsTableBody?.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-remove]");
            if (!button) return;
            const index = Number(button.getAttribute("data-remove"));
            state.items.splice(index, 1);
            renderItems();
        });

        elements.addItemBtn?.addEventListener("click", () => {
            // If there are placeholder rows (enabled === false), enable the first one
            const placeholderIndex = state.items.findIndex(it => it && it.enabled === false);
            if (placeholderIndex !== -1) {
                state.items[placeholderIndex] = { description: "", quantity: 0, unit_price: 0, total: 0, enabled: true };
            } else {
                // Append a single empty row when Add Item is clicked. No artificial limit.
                state.items.push({ description: "", quantity: 0, unit_price: 0, total: 0, enabled: true });
            }
            renderItems();
            debouncedServerTotals();
        });

        elements.previewToggleBtn?.addEventListener("click", () => {
            openPreview();
        });

        elements.previewBackBtn?.addEventListener("click", () => {
            togglePreview(moduleId, false);
        });

        // Save invoice as .inv document
        elements.saveBtn?.addEventListener("click", () => {
            saveInvoiceFile();
        });

        // Save draft to localStorage using Drafts API
        elements.saveDraftBtn?.addEventListener('click', async () => {
            try {
                showToast('Saving draft…', 'info');
                const totals = await preparePreviewSnapshot();
                const payload = buildInvoiceDocumentPayload(totals);
                const metadata = {
                    bill_number: state.invoiceNumber,
                    customer: inputs.customer?.value || '',
                    issue_date: inputs.issueDate?.value || '',
                    grand_total: (totals && totals.grandTotal) || null,
                };
                if (!window.Drafts || typeof window.Drafts.saveDraft !== 'function') {
                    showToast('Draft API not available', 'error');
                    return;
                }
                const res = await window.Drafts.saveDraft('invoice', payload, metadata, state.draftId);
                if (res && res.id) {
                    state.draftId = res.id;
                    showToast('Draft saved', 'success');
                } else {
                    showToast('Draft saved', 'success');
                }
                try {
                    if (window.Customers && typeof window.Customers.add === 'function') {
                        window.Customers.add(inputs.customer?.value || '');
                    }
                } catch (e) { /* ignore */ }
            } catch (e) {
                console.error(e);
                showToast('Failed to save draft', 'error');
            }
        });

        elements.submitBtn?.addEventListener("click", () => {
            handleSave();
        });

        // Preview button removed from markup; preview toggle no-op

        // Levies toggle: show/hide levies & VAT from display and calculations
        elements.leviesToggleBtn?.addEventListener('click', (ev) => {
            try {
                state.showLevies = !state.showLevies;
                if (elements.leviesToggleBtn) {
                    elements.leviesToggleBtn.setAttribute('aria-pressed', state.showLevies ? 'true' : 'false');
                }
                // Re-render levy placeholders and totals
                renderLevyPlaceholders();
                recalcTotals();
            } catch (e) { console.warn(e); }
        });

        // Ensure aria state reflects default on load
        try {
            if (elements.leviesToggleBtn) elements.leviesToggleBtn.setAttribute('aria-pressed', state.showLevies ? 'true' : 'false');
        } catch (e) { /* ignore */ }

        // Wire the exit preview button
        // Exit preview button removed from markup; no-op

        // Exit preview button removed (no preview button in markup)

        const liveSyncFields = [
            inputs.customer,
            inputs.classification,
            inputs.companyName,
            inputs.companyInfo,
            inputs.clientRef,
            inputs.intro,
            inputs.notes,
            inputs.signatory,
            inputs.contact,
        ];
        liveSyncFields.forEach((field) => {
            field?.addEventListener("input", () => {
                syncPreviewFromForm();
            });
        });
        // Recalculate totals when discount percentage changes
        elements.discountPct?.addEventListener('input', () => {
            recalcTotals();
            debouncedServerTotals();
            syncPreviewFromForm();
        });
        inputs.issueDate?.addEventListener("change", syncPreviewFromForm);
    }

    async function loadNextInvoiceNumber() {
        // Generate a new random 6-digit invoice number
        console.log('[Invoice] Generating new SPQ invoice number');
        state.invoiceNumber = generateSPQNumber();
        console.log('[Invoice] Generated invoice number:', state.invoiceNumber);
        if (elements.invoiceNumber) {
            elements.invoiceNumber.textContent = state.invoiceNumber;
            console.log('[Invoice] Set textContent on invoiceNumber element');
        }
        if (elements.previewNumber) {
            elements.previewNumber.textContent = state.invoiceNumber;
            console.log('[Invoice] Set textContent on previewNumber element');
        }
    }

    async function incrementInvoiceNumber() {
        // Generate a new random 6-digit invoice number after successful PDF download
        state.invoiceNumber = generateSPQNumber();
        elements.invoiceNumber && (elements.invoiceNumber.textContent = state.invoiceNumber);
        elements.previewNumber && (elements.previewNumber.textContent = state.invoiceNumber);
        console.log('[Invoice] Generated new invoice number for next document:', state.invoiceNumber);
    }

    (async function init() {
        // Initialization function, runs on load
        attachEventListeners();
        await loadConfig();
        await loadNextInvoiceNumber();  // Load the next number on page load
        await loadExistingInvoice();
        syncPreviewFromForm();
        debouncedServerTotals();
    })();
    });
})();
