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
        const config = window.BILLING_APP_CONFIG || {};
        const API_BASE = config.apiBaseUrl || helpers.apiBaseUrl || helpers.API_BASE || window.location.origin;
        const togglePreview = typeof helpers.togglePreview === "function" ? helpers.togglePreview : () => {};

        const moduleId = "invoice-module"; // ID of the invoice module element
        const moduleEl = document.getElementById(moduleId); // Reference to module DOM element
        const form = document.getElementById("invoice-form"); // Reference to invoice form

        // Exit early if required elements are not found
        if (!moduleEl || !form) return;

        const elements = {
            module: moduleEl,
            form,
            toast: document.getElementById("invoice-toast"),
            previewToggleBtn: document.getElementById("invoice-preview-toggle"),
            exitPreviewBtn: document.querySelector("#invoice-preview [data-exit-preview]") || document.getElementById("invoice-exit-preview"),
            submitBtn: document.getElementById("invoice-submit"),
            invoiceNumber: document.getElementById("invoice-number"),
            previewNumber: document.getElementById("invoice-preview-number"),
            documentNumberInput: document.getElementById("invoice-document-number"),
            itemsTable: document.getElementById("invoice-items-table"),
            itemsTableBody: document.querySelector("#invoice-items-table tbody"),
            itemsPayload: document.getElementById("invoice-items-payload"),
            previewRows: document.getElementById("invoice-preview-rows"),
            levyContainer: document.getElementById("invoice-levies"),
            previewLevyContainer: document.getElementById("invoice-preview-levies"),
            subtotal: document.getElementById("invoice-subtotal"),
            previewSubtotal: document.getElementById("invoice-preview-subtotal"),
            levyTotal: document.getElementById("invoice-levy-total"),
            previewLevyTotal: document.getElementById("invoice-preview-levy-total"),
            vat: document.getElementById("invoice-vat"),
            previewVat: document.getElementById("invoice-preview-vat"),
            grandTotal: document.getElementById("invoice-grand-total"),
            previewGrand: document.getElementById("invoice-preview-grand"),
            previewCustomer: document.getElementById("invoice-preview-customer"),
            previewClassification: document.getElementById("invoice-preview-classification"),
            previewDate: document.getElementById("invoice-preview-date"),
            previewCompanyInfo: document.getElementById("invoice-preview-company-info"),
            previewClientRef: document.getElementById("invoice-preview-client-ref"),
            previewIntro: document.getElementById("invoice-preview-intro"),
            previewNotesList: document.getElementById("invoice-preview-notes"),
            addItemBtn: document.getElementById("invoice-add-item"),
        };

        const findField = (name, fallbackId) => {
            const field = form.elements.namedItem(name);
            if (field) return field;
            return fallbackId ? document.getElementById(fallbackId) : null;
        };

        const inputs = {
            customer: findField("customer_name", "invoice-customer-name"),
            classification: findField("classification", "invoice-classification"),
            issueDate: findField("issue_date", "invoice-issue-date"),
            companyName: findField("company_name", "invoice-company-name"),
            companyInfo: findField("company_info", "invoice-company-info"),
            clientRef: findField("client_ref", "invoice-client-ref"),
            intro: findField("intro", "invoice-intro"),
            notes: findField("notes", "invoice-notes"),
            signatory: findField("signatory", "invoice-signatory"),
            contact: findField("contact", "invoice-contact"),
        };
        
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

        async function ensureInvoiceNumberReserved() {
            if (state.invoiceNumberReserved && state.invoiceNumber) {
                return state.invoiceNumber;
            }
            const response = await fetch(`${API_BASE}/api/counter/invoice/next/`, { method: "POST" });
            if (!response.ok) {
                throw new Error(`Failed to reserve invoice number (${response.status})`);
            }
            const data = await response.json().catch(() => ({}));
            if (data?.next_number) {
                setInvoiceNumber(data.next_number, { reserved: true });
            }
            return state.invoiceNumber;
        }

        async function saveInvoice() {
            const payload = buildPayload();
            const isUpdate = Boolean(state.invoiceId);
            const path = isUpdate ? `/invoices/api/${state.invoiceId}/` : `/invoices/api/create/`;
            const method = isUpdate ? "PUT" : "POST";
            const result = await callApi(path, {
                method,
                body: JSON.stringify(payload),
            });
            if (result?.id) {
                state.invoiceId = result.id;
            }
            if (result?.document_number) {
                setInvoiceNumber(result.document_number, { reserved: true });
            }
            return result;
        }
        const state = {
            // Application state object
            items: [],
            levies: [],
            invoiceId: null,
            invoiceNumber: "INV000",
            invoiceNumberReserved: false,
            isSaving: false,
        };

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
            items_payload: JSON.stringify(state.items),
            document_number: elements.documentNumberInput?.value || state.invoiceNumber || "",
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

    function setInvoiceNumber(value, { reserved = false } = {}) {
        const numberValue = value || state.invoiceNumber || "";
        if (!numberValue) {
            return;
        }
        state.invoiceNumber = numberValue;
        state.invoiceNumberReserved = reserved;
        if (elements.invoiceNumber) {
            elements.invoiceNumber.textContent = state.invoiceNumber;
        }
        if (elements.previewNumber) {
            elements.previewNumber.textContent = state.invoiceNumber;
        }
        if (elements.documentNumberInput) {
            elements.documentNumberInput.value = state.invoiceNumber;
        }
    }

    function renderLevyPlaceholders() {
        // Function to render levy placeholders in edit and preview sections
        if (!elements.levyContainer || !elements.previewLevyContainer) return;
        elements.levyContainer.innerHTML = "";
        elements.previewLevyContainer.innerHTML = "";
        levyValueMap.clear();
        previewLevyValueMap.clear();

        state.levies
            .filter(({ isVat }) => !isVat)
            .forEach(({ name, rate }) => {
            const line = document.createElement("p");
            line.innerHTML = `<span>${name} (${(rate * 100).toFixed(2)}%):</span> <span data-levy="${name}">0.00</span>`;
            elements.levyContainer.appendChild(line);
            const valueEl = line.querySelector("[data-levy]");
            levyValueMap.set(name, valueEl);

            const previewLine = document.createElement("p");
            previewLine.innerHTML = `<span>${name} (${(rate * 100).toFixed(2)}%):</span> <span data-preview-levy="${name}">0.00</span>`;
            elements.previewLevyContainer.appendChild(previewLine);
            const previewVal = previewLine.querySelector("[data-preview-levy]");
            previewLevyValueMap.set(name, previewVal);
            });
    }

    function renderItems() {
        // Function to render invoice items in table and preview - always show 10 rows
        const tableBody = elements.itemsTableBody;
        const previewBody = elements.previewRows;
        if (tableBody) tableBody.innerHTML = "";
        if (previewBody) previewBody.innerHTML = "";

        // Render exactly 10 rows
        for (let index = 0; index < 10; index++) {
            const item = state.items[index];
            
            // Edit mode row
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

            // Preview mode row
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
            previewBody?.appendChild(previewRow);
        }

        if (elements.itemsPayload) {
            elements.itemsPayload.value = JSON.stringify(state.items);
        }

        recalcTotals();
    }

    function recalcTotals() {
        // Function to recalculate and update totals display
        const subtotal = state.items.reduce((sum, item) => sum + parseNumber(item.total), 0);
        elements.subtotal && (elements.subtotal.textContent = formatCurrency(subtotal));
        elements.previewSubtotal && (elements.previewSubtotal.textContent = formatCurrency(subtotal));

        let levyTotal = 0;
        let vatAmount = 0;

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

    const totalLeviesAndValue = subtotal + levyTotal;
    elements.levyTotal && (elements.levyTotal.textContent = formatCurrency(totalLeviesAndValue));
    elements.previewLevyTotal && (elements.previewLevyTotal.textContent = formatCurrency(totalLeviesAndValue));
        elements.vat && (elements.vat.textContent = formatCurrency(vatAmount));
        elements.previewVat && (elements.previewVat.textContent = formatCurrency(vatAmount));

        const grandTotal = subtotal + levyTotal + vatAmount;
        elements.grandTotal && (elements.grandTotal.textContent = formatCurrency(grandTotal));
        elements.previewGrand && (elements.previewGrand.textContent = formatCurrency(grandTotal));
    }

    function syncPreviewFromForm() {
        // Function to sync preview fields with form inputs
        elements.previewCustomer && (elements.previewCustomer.textContent = inputs.customer?.value || "—");
        elements.previewClassification && (elements.previewClassification.textContent = inputs.classification?.value || "—");
        elements.previewDate && (elements.previewDate.textContent = inputs.issueDate?.value || "—");
        const currentNumber = state.invoiceNumber || elements.invoiceNumber?.textContent || "—";
        if (elements.previewNumber) {
            elements.previewNumber.textContent = currentNumber;
        }
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
            if (!result) return;
            elements.subtotal && (elements.subtotal.textContent = formatCurrency(result.subtotal));
            elements.previewSubtotal && (elements.previewSubtotal.textContent = formatCurrency(result.subtotal));

            let levySum = 0;
            let vatAmount = 0;
            Object.entries(result.levies || {}).forEach(([name, amount]) => {
                const formattedAmount = formatCurrency(amount);
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
            elements.levyTotal && (elements.levyTotal.textContent = formatCurrency(totalLeviesAndValue));
            elements.previewLevyTotal && (elements.previewLevyTotal.textContent = formatCurrency(totalLeviesAndValue));

            const grandTotal = Number(result.grand_total ?? (subtotalNumber + levySum + vatAmount));
            elements.grandTotal && (elements.grandTotal.textContent = formatCurrency(grandTotal));
            elements.previewGrand && (elements.previewGrand.textContent = formatCurrency(grandTotal));
        } catch (error) {
            console.warn("Failed to calculate preview totals", error);
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

    async function handlePreviewToggle() {
        // Function to handle preview toggle button click
        // Ensure preview table reflects latest items before switching view
        renderItems();
        syncPreviewFromForm();
        await calculateServerTotals();
        togglePreview(moduleId, true);
    }

    async function preparePreviewSnapshot() {
        renderItems();
        syncPreviewFromForm();
        await calculateServerTotals();
    }

    function buildPdfPayload(docType, previewEl) {
        const clone = previewEl.cloneNode(true);
        clone.removeAttribute("hidden");
        clone.setAttribute("data-pdf-clone", "true");
        clone.classList.add("pdf-export");
        clone.querySelectorAll("[data-exit-preview]").forEach((el) => el.remove());
        clone.querySelectorAll(".preview-actions").forEach((el) => el.remove());
        return {
            document_type: docType,
            html: clone.outerHTML,
            filename: `${state.invoiceNumber || "invoice"}.pdf`,
        };
    }

    async function downloadInvoicePdf() {
        try {
            await preparePreviewSnapshot();

            const previewEl = document.getElementById("invoice-preview");
            if (!previewEl) {
                throw new Error("Preview element not found");
            }

            const payload = buildPdfPayload("invoice", previewEl);
            
            console.log("Sending PDF request to:", `${API_BASE}/api/pdf/render/`);
            console.log("Payload size:", JSON.stringify(payload).length, "bytes");

            const response = await fetch(`${API_BASE}/api/pdf/render/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/pdf",
                },
                body: JSON.stringify(payload),
            }).catch(err => {
                console.error("Fetch failed:", err);
                throw new Error(`Network error: ${err.message}. Make sure Django server is running on ${API_BASE}`);
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("PDF render error response:", errorText);
                throw new Error(`Failed to generate PDF: ${response.status} ${response.statusText}`);
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
            console.error("Download PDF error:", error);
            throw error;
        }
    }

    async function handleSave() {
        // Handle PDF download
        if (state.isSaving) return;
        state.isSaving = true;
        elements.submitBtn?.setAttribute("disabled", "disabled");

        try {
            syncPreviewFromForm();
            await ensureInvoiceNumberReserved();
            await saveInvoice();
            await downloadInvoicePdf();
            showToast("Invoice saved and downloaded successfully!");
        } catch (error) {
            console.error("Failed to save invoice", error);
            showToast(error.message || "Failed to save invoice", "error");
        } finally {
            state.isSaving = false;
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
        // Function to load existing invoice data if ID in URL
        const id = getQueryParam("id");
        if (!id) {
            state.items = [{ description: "", quantity: 0, unit_price: 0, total: 0 }];
            renderItems();
            return;
        }
        try {
            const data = await callApi(`/invoices/api/${id}/`);
            state.invoiceId = data.id;
            setInvoiceNumber(data.document_number || data.invoice_number || state.invoiceNumber, { reserved: true });
            if (inputs.customer) inputs.customer.value = data.customer_name || "";
            if (inputs.classification) inputs.classification.value = data.classification || "";
            if (inputs.issueDate && data.issue_date) inputs.issueDate.value = data.issue_date;
            const receivedItems = Array.isArray(data.items) ? data.items : [];
            state.items = receivedItems.length ? receivedItems : [{ description: "", quantity: 0, unit_price: 0, total: 0 }];
            renderItems();
        } catch (error) {
            console.error("Failed to load invoice", error);
            state.items = [{ description: "", quantity: 0, unit_price: 0, total: 0 }];
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
            if (state.items.length >= 10) {
                showToast("Maximum 10 items allowed", "error");
                return;
            }
            state.items.push({ description: "", quantity: 0, unit_price: 0, total: 0 });
            renderItems();
            debouncedServerTotals();
        });

        elements.previewToggleBtn?.addEventListener("click", () => {
            handlePreviewToggle();
        });

        elements.submitBtn?.addEventListener("click", () => {
            handleSave();
        });

        elements.exitPreviewBtn?.addEventListener("click", () => {
            togglePreview(moduleId, false);
        });

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
        inputs.issueDate?.addEventListener("change", syncPreviewFromForm);
    }

    async function loadNextInvoiceNumber() {
        // Load the next invoice number from the counter API
        if (state.invoiceNumberReserved || state.invoiceId) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE}/api/counter/invoice/next/`);
            if (response.ok) {
                const data = await response.json();
                setInvoiceNumber(data.next_number || state.invoiceNumber, { reserved: false });
            }
        } catch (error) {
            console.warn("Failed to load next invoice number", error);
        }
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
