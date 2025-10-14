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
        
        const moduleId = "invoice-module"; // ID of the invoice module element
        const moduleEl = document.getElementById(moduleId); // Reference to module DOM element
        const form = document.getElementById("invoice-form"); // Reference to invoice form
        
        // Exit early if required elements are not found
        if (!moduleEl || !form) return;

        function toggleModulePreview(isPreview) {
            // Local fallback toggle for preview mode
            const showPreview = Boolean(isPreview);
            moduleEl.classList.toggle("is-preview", showPreview);
            if (showPreview) {
                form.setAttribute("hidden", "hidden");
            } else {
                form.removeAttribute("hidden");
            }
            moduleEl.querySelectorAll(".document").forEach((doc) => {
                if (!doc.classList.contains("document-editable")) {
                    if (showPreview) {
                        doc.removeAttribute("hidden");
                    } else {
                        doc.setAttribute("hidden", "hidden");
                    }
                }
            });
            const exitBtn = document.getElementById("invoice-exit-preview");
            if (exitBtn) {
                if (showPreview) exitBtn.removeAttribute("hidden");
                else exitBtn.setAttribute("hidden", "hidden");
            }
        }

        const togglePreview = typeof helpers.togglePreview === "function"
            ? (moduleIdentifier, isPreview) => helpers.togglePreview(moduleIdentifier, isPreview)
            : (moduleIdentifier, isPreview) => {
                if (moduleIdentifier === moduleId) {
                    toggleModulePreview(isPreview);
                }
            };
        // Function to toggle between edit and preview modes with fallback

        const config = window.BILLING_APP_CONFIG || {};
        // Global config object from window
        const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";
        // Base URL for API calls

    const elements = {
        // Object containing references to key DOM elements
        itemsPayload: document.getElementById("invoice-items-payload"),
        itemsTableBody: document.querySelector("#invoice-items-table tbody"),
        previewRows: document.getElementById("invoice-preview-rows"),
        subtotal: document.getElementById("invoice-subtotal"),
        grandTotal: document.getElementById("invoice-grand-total"),
        previewSubtotal: document.getElementById("invoice-preview-subtotal"),
        previewGrand: document.getElementById("invoice-preview-grand"),
        levyContainer: document.getElementById("invoice-levies"),
        previewLevyContainer: document.getElementById("invoice-preview-levies"),
        addItemBtn: document.getElementById("invoice-add-item"),
        previewToggleBtn: document.getElementById("invoice-preview-toggle"),
        submitBtn: document.getElementById("invoice-submit"),
        toast: document.getElementById("invoice-toast"),
        invoiceNumber: document.getElementById("invoice-number"),
        previewNumber: document.getElementById("invoice-preview-number"),
        previewCustomer: document.getElementById("invoice-preview-customer"),
        previewClassification: document.getElementById("invoice-preview-classification"),
        previewDate: document.getElementById("invoice-preview-date"),
        previewCompanyName: document.getElementById("invoice-preview-company-name"),
        previewCompanyInfo: document.getElementById("invoice-preview-company-info"),
        previewClientRef: document.getElementById("invoice-preview-client-ref"),
        previewIntro: document.getElementById("invoice-preview-intro"),
        previewNotesList: document.getElementById("invoice-preview-notes"),
        previewSignatory: document.getElementById("invoice-preview-signatory"),
        previewContact: document.getElementById("invoice-preview-contact"),
    };

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

    const state = {
        // Application state object
        items: [],
        levies: [],
        invoiceId: null,
        invoiceNumber: "INV-001",
        isSaving: false,
    };

    const levyValueMap = new Map();
    // Map to store levy value elements for quick updates
    const previewLevyValueMap = new Map();
    // Map for preview levy elements

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
        // Function to render levy placeholders in edit and preview sections
        if (!elements.levyContainer || !elements.previewLevyContainer) return;
        elements.levyContainer.innerHTML = "";
        elements.previewLevyContainer.innerHTML = "";
        levyValueMap.clear();
        previewLevyValueMap.clear();

        state.levies.forEach(({ name, rate }) => {
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
        // Function to render invoice items in table and preview
        const tableBody = elements.itemsTableBody;
        const previewBody = elements.previewRows;
        if (tableBody) tableBody.innerHTML = "";
        if (previewBody) previewBody.innerHTML = "";

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
                <td>${formatQuantity(item.quantity || 0)}</td>
                <td>${formatCurrency(item.unit_price || 0)}</td>
                <td>${formatCurrency(item.total || 0)}</td>
            `;
            previewBody?.appendChild(previewRow);
        });

        if (state.items.length === 0) {
            const placeholderRow = document.createElement("tr");
            placeholderRow.innerHTML = `<td colspan="5" class="empty-state">No line items yet. Add one to begin.</td>`;
            tableBody?.appendChild(placeholderRow);
            if (previewBody) {
                const previewPlaceholder = document.createElement("tr");
                previewPlaceholder.innerHTML = `<td colspan="4" class="empty-state">No line items yet.</td>`;
                previewBody.appendChild(previewPlaceholder);
            }
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
        state.levies.forEach(({ name, rate }) => {
            const amount = subtotal * rate;
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

        const grandTotal = subtotal + levyTotal;
        elements.grandTotal && (elements.grandTotal.textContent = formatCurrency(grandTotal));
        elements.previewGrand && (elements.previewGrand.textContent = formatCurrency(grandTotal));
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
            if (!result) return;
            elements.subtotal && (elements.subtotal.textContent = formatCurrency(result.subtotal));
            elements.previewSubtotal && (elements.previewSubtotal.textContent = formatCurrency(result.subtotal));
            Object.entries(result.levies || {}).forEach(([name, amount]) => {
                const levyEl = levyValueMap.get(name);
                if (levyEl) {
                    levyEl.textContent = formatCurrency(amount);
                }
                const previewEl = previewLevyValueMap.get(name);
                if (previewEl) {
                    previewEl.textContent = formatCurrency(amount);
                }
            });
            elements.grandTotal && (elements.grandTotal.textContent = formatCurrency(result.grand_total));
            elements.previewGrand && (elements.previewGrand.textContent = formatCurrency(result.grand_total));
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

    async function downloadInvoicePdf(prepared = false) {
        if (typeof window.html2pdf !== "function") {
            throw new Error("PDF generator unavailable");
        }
        if (!prepared) {
            await preparePreviewSnapshot();
        }
        const previewEl = document.getElementById("invoice-preview");
        if (!previewEl) {
            throw new Error("Preview element not found");
        }

        const exportWrapper = document.createElement("div");
        exportWrapper.className = "module is-preview pdf-export-wrapper";
        exportWrapper.setAttribute("aria-hidden", "true");
        const clone = previewEl.cloneNode(true);
        clone.removeAttribute("hidden");
        clone.id = "";
        clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
        exportWrapper.appendChild(clone);
        document.body.appendChild(exportWrapper);

        let filename = state.invoiceNumber || "invoice";
        if (!filename.toLowerCase().endsWith(".pdf")) {
            filename = `${filename}.pdf`;
        }

        try {
            await window.html2pdf()
                .set({
                    margin: [10, 10, 10, 10],
                    filename,
                    pagebreak: { mode: ["css", "legacy"] },
                    image: { type: "jpeg", quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                })
                .from(exportWrapper)
                .save();
        } finally {
            document.body.removeChild(exportWrapper);
        }
    }

    async function handleSave() {
        // Function to handle save/submit button click
        if (state.isSaving) return;
        state.isSaving = true;
        elements.submitBtn?.setAttribute("disabled", "disabled");
        showToast("Saving invoice...", "info");

        let saveSucceeded = false;
        let pdfError = null;

        try {
            await preparePreviewSnapshot();
            const payload = buildPayload();
            const method = state.invoiceId ? "PUT" : "POST";
            const path = state.invoiceId
                ? `/invoices/api/${state.invoiceId}/`
                : `/invoices/api/create/`;
            const result = await callApi(path, {
                method,
                body: JSON.stringify(payload),
            });
            if (result && result.invoice_number) {
                state.invoiceNumber = result.invoice_number;
                elements.invoiceNumber && (elements.invoiceNumber.textContent = result.invoice_number);
                elements.previewNumber && (elements.previewNumber.textContent = result.invoice_number);
            }
            if (result && result.id) {
                state.invoiceId = result.id;
            }
            saveSucceeded = true;
            try {
                showToast("Preparing PDF download...", "info");
                await downloadInvoicePdf(true);
                showToast("Invoice saved and downloaded.");
            } catch (error) {
                pdfError = error;
                console.error("Failed to generate PDF", error);
            }
        } catch (error) {
            console.error(error);
            showToast(`Failed to save invoice: ${error.message}`, "error");
        } finally {
            state.isSaving = false;
            elements.submitBtn?.removeAttribute("disabled");
            if (saveSucceeded && pdfError) {
                showToast(`Invoice saved but PDF failed: ${pdfError.message}`, "error");
            }
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
            const taxSettings = data?.tax_settings || {};
            state.levies = Object.entries(taxSettings).map(([name, rate]) => ({
                name,
                rate: Number(rate) || 0,
            }));
            if (!state.levies.length) {
                state.levies = [
                    { name: "NHIL", rate: 0.025 },
                    { name: "GETFund Levy", rate: 0.025 },
                    { name: "COVID", rate: 0.01 },
                    { name: "VAT", rate: 0.15 },
                ];
            }
        } catch (error) {
            console.warn("Failed to load invoice config", error);
            state.levies = [
                { name: "NHIL", rate: 0.025 },
                { name: "GETFund Levy", rate: 0.025 },
                { name: "COVID", rate: 0.01 },
                { name: "VAT", rate: 0.15 },
            ];
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
            state.invoiceNumber = data.invoice_number || state.invoiceNumber;
            elements.invoiceNumber && (elements.invoiceNumber.textContent = state.invoiceNumber);
            elements.previewNumber && (elements.previewNumber.textContent = state.invoiceNumber);
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

        moduleEl.addEventListener("click", (event) => {
            if (event.target.matches("[data-exit-preview]")) {
                event.preventDefault();
                togglePreview(moduleId, false);
            }
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

    (async function init() {
        // Initialization function, runs on load
        attachEventListeners();
        await loadConfig();
        await loadExistingInvoice();
        syncPreviewFromForm();
        debouncedServerTotals();
    })();
    });
})();
