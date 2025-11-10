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
    const API_BASE = config.apiBaseUrl || (window.location ? window.location.origin : "http://127.0.0.1:8765");
        // Base URL for API calls

    const elements = {
        // Object containing references to key DOM elements
        itemsPayload: document.getElementById("invoice-items-payload"),
        itemsTableBody: document.querySelector("#invoice-items-table tbody"),
        previewRows: document.getElementById("invoice-preview-rows"),
        subtotal: document.getElementById("invoice-subtotal"),
        levyTotal: document.getElementById("invoice-levy-total"),
        vat: document.getElementById("invoice-vat"),
        grandTotal: document.getElementById("invoice-grand-total"),
        previewSubtotal: document.getElementById("invoice-preview-subtotal"),
        previewLevyTotal: document.getElementById("invoice-preview-levy-total"),
        previewVat: document.getElementById("invoice-preview-vat"),
        previewGrand: document.getElementById("invoice-preview-grand"),
        levyContainer: document.getElementById("invoice-levies"),
        previewLevyContainer: document.getElementById("invoice-preview-levies"),
        addItemBtn: document.getElementById("invoice-add-item"),
        previewToggleBtn: document.getElementById("invoice-preview-toggle"),
        exitPreviewBtn: document.getElementById("invoice-exit-preview"),
    submitBtn: document.getElementById("invoice-submit"),
    saveBtn: document.getElementById("invoice-save"),
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

    function computeLocalTotals() {
        const subtotal = state.items.reduce((sum, item) => sum + parseNumber(item.total), 0);
        const levyBreakdown = {};
        let levySum = 0;
        let vatAmount = 0;

        state.levies.forEach(({ name, rate, isVat }) => {
            const amount = subtotal * Number(rate || 0);
            levyBreakdown[name] = amount;
            if (isVat) {
                vatAmount = amount;
            } else {
                levySum += amount;
            }
        });

        return {
            subtotal,
            levyTotal: levySum,
            vat: vatAmount,
            grandTotal: subtotal + levySum + vatAmount,
            levies: levyBreakdown,
        };
    }

    function serializeItems() {
        return state.items
            .filter((item) => {
                if (!item) return false;
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
        const totals = await calculateServerTotals();
        return totals || computeLocalTotals();
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
        
        const previewEl = document.getElementById("invoice-preview");
        if (!previewEl) {
            showToast("Preview element not found", "error");
            return;
        }

        // Create a wrapper for PDF export with exact preview styling
        const exportWrapper = document.createElement("div");
        exportWrapper.className = "module is-preview pdf-export-wrapper";
        exportWrapper.setAttribute("aria-hidden", "true");
        exportWrapper.style.cssText = "position: fixed; left: -9999px; top: 0; width: 210mm;";
        
        const clone = previewEl.cloneNode(true);
        clone.removeAttribute("hidden");
        clone.setAttribute("data-pdf-clone", "true");
        
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

            const A4_PX_WIDTH = 794; // 210mm at ~96 DPI
            const A4_PX_HEIGHT = 1122; // 297mm at ~96 DPI
            clone.style.width = A4_PX_WIDTH + "px";
            clone.style.maxWidth = A4_PX_WIDTH + "px";

            const canvas = await window.html2canvas(clone, {
                scale: 2,
                useCORS: true,
                allowTaint: true, // Allow cross-origin images
                backgroundColor: "#ffffff",
                logging: false,
                width: A4_PX_WIDTH,
                height: Math.max(A4_PX_HEIGHT, clone.scrollHeight),
            });

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
                compress: true,
            });

            const imgData = canvas.toDataURL("image/png");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
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
            pdf.save(filename);
            showToast("PDF downloaded successfully!");
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
            await downloadInvoicePdf();
            // Increment the counter after successful PDF download
            await incrementInvoiceNumber();
        } finally {
            state.isSaving = false;
            elements.submitBtn?.removeAttribute("disabled");
        }
    }

    async function saveInvoiceFile() {
        if (state.isSaving) return;
        if (typeof helpers.saveDocument !== "function") {
            showToast("Save helper unavailable.", "error");
            return;
        }
        state.isSaving = true;
        elements.saveBtn?.setAttribute("disabled", "disabled");
        elements.submitBtn?.setAttribute("disabled", "disabled");

        try {
            showToast("Saving invoice…", "info");
            const totals = await preparePreviewSnapshot();
            const payload = buildInvoiceDocumentPayload(totals);
            const metadata = {
                number: state.invoiceNumber,
                customer: inputs.customer?.value || "",
                issue_date: inputs.issueDate?.value || "",
                grand_total: Number(payload?.totals?.grand_total || 0),
            };
            const result = await helpers.saveDocument({
                type: "invoice",
                defaultName: state.invoiceNumber || "invoice",
                data: payload,
                metadata,
            });
            if (result?.cancelled) {
                showToast("Invoice save cancelled.", "info");
                return;
            }
            showToast("Invoice saved.", "success");
            // Increment the counter after successful save
            await incrementInvoiceNumber();
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
                    state.items = receivedItems.length ? receivedItems : [{ description: "", quantity: 0, unit_price: 0, total: 0 }];
                    renderItems();
                    syncPreviewFromForm();
                    return;
                }
            }
        } catch (error) {
            console.warn("Failed to load opened document", error);
        }
        
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

        // Save invoice as .inv document
        elements.saveBtn?.addEventListener("click", () => {
            saveInvoiceFile();
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
        console.log('[Invoice] Loading next invoice number from:', `${API_BASE}/api/counter/invoice/next/`);
        console.log('[Invoice] elements.invoiceNumber element:', elements.invoiceNumber);
        try {
            const response = await fetch(`${API_BASE}/api/counter/invoice/next/`);
            console.log('[Invoice] API response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('[Invoice] API response data:', data);
                state.invoiceNumber = data.next_number;
                console.log('[Invoice] Setting invoice number to:', state.invoiceNumber);
                if (elements.invoiceNumber) {
                    elements.invoiceNumber.textContent = state.invoiceNumber;
                    console.log('[Invoice] Set textContent on invoiceNumber element');
                } else {
                    console.warn('[Invoice] elements.invoiceNumber is null or undefined');
                }
                if (elements.previewNumber) {
                    elements.previewNumber.textContent = state.invoiceNumber;
                    console.log('[Invoice] Set textContent on previewNumber element');
                }
            } else {
                console.warn('[Invoice] API response not ok:', response.status, response.statusText);
            }
        } catch (error) {
            console.warn("Failed to load next invoice number", error);
        }
    }

    async function incrementInvoiceNumber() {
        // Increment the invoice number counter after successful PDF download
        try {
            const response = await fetch(`${API_BASE}/api/counter/invoice/next/`, { method: "POST" });
            if (response.ok) {
                const data = await response.json();
                state.invoiceNumber = data.next_number;
                elements.invoiceNumber && (elements.invoiceNumber.textContent = state.invoiceNumber);
                elements.previewNumber && (elements.previewNumber.textContent = state.invoiceNumber);
            }
        } catch (error) {
            console.warn("Failed to increment invoice number", error);
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
