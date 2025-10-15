/* ============================================
   INVOICE MODULE
   ============================================
   Comprehensive invoice management system for creating, editing,
   and exporting invoices with automatic calculations.
   
   Features:
   - Line item management (add, edit, remove up to 10 items)
   - Real-time calculations (subtotal, taxes, levies, grand total)
   - Preview mode with live synchronization
   - Form validation and data persistence
   - PDF and JPEG export with WeasyPrint rendering
   - Document number reservation and management
   - API integration for saving and loading invoices
   
   Architecture:
   - Uses IIFE pattern to prevent global namespace pollution
   - State management through centralized state object
   - Event-driven updates with debounced server calculations
   - Separation of concerns: UI, calculations, API, rendering
   ============================================ */

(function () {
    "use strict";

    // ============================================
    // DOM READY HELPER
    // ============================================
    
    /**
     * Ensures code executes only after DOM is fully loaded
     * Handles both pre-loaded and loading states
     * @param {Function} callback - Function to execute when DOM is ready
     */
    function onReady(callback) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback, { once: true });
        } else {
            callback();
        }
    }

    onReady(() => {
        // ============================================
        // CONFIGURATION AND GLOBALS
        // ============================================
        
        // Import helper functions from global BillingApp namespace (main.js)
        const helpers = window.BillingApp || {};
        const config = window.BILLING_APP_CONFIG || {};
        
        // API base URL with multiple fallback strategies
        const API_BASE = config.apiBaseUrl || helpers.apiBaseUrl || helpers.API_BASE || window.location.origin;
        
        // Import shared utility functions with fallbacks
        const togglePreview = typeof helpers.togglePreview === "function" ? helpers.togglePreview : () => {};
        const chooseDownloadFormat = typeof helpers.chooseDownloadFormat === "function" ? helpers.chooseDownloadFormat : async () => "pdf";

        // Module identifiers
        const moduleId = "invoice-module";
        const moduleEl = document.getElementById(moduleId);
        const form = document.getElementById("invoice-form");

        // Early exit if required elements are missing
        if (!moduleEl || !form) return;

        // ============================================
        // DOM ELEMENT REFERENCES
        // ============================================
        
        /**
         * Cached references to DOM elements for performance
         * Organized by function: controls, display, preview, tables
         */
        const elements = {
            // Core elements
            module: moduleEl,
            form,
            
            // UI controls
            toast: document.getElementById("invoice-toast"),
            previewToggleBtn: document.getElementById("invoice-preview-toggle"),
            exitPreviewBtn: document.querySelector("#invoice-preview [data-exit-preview]") || document.getElementById("invoice-exit-preview"),
            submitBtn: document.getElementById("invoice-submit"),
            addItemBtn: document.getElementById("invoice-add-item"),
            
            // Document number elements
            invoiceNumber: document.getElementById("invoice-number"),
            previewNumber: document.getElementById("invoice-preview-number"),
            documentNumberInput: document.getElementById("invoice-document-number"),
            
            // Items table (edit mode)
            itemsTable: document.getElementById("invoice-items-table"),
            itemsTableBody: document.querySelector("#invoice-items-table tbody"),
            itemsPayload: document.getElementById("invoice-items-payload"),
            
            // Preview table
            previewRows: document.getElementById("invoice-preview-rows"),
            
            // Levy/tax containers
            levyContainer: document.getElementById("invoice-levies"),
            previewLevyContainer: document.getElementById("invoice-preview-levies"),
            
            // Financial totals (edit mode)
            subtotal: document.getElementById("invoice-subtotal"),
            levyTotal: document.getElementById("invoice-levy-total"),
            vat: document.getElementById("invoice-vat"),
            grandTotal: document.getElementById("invoice-grand-total"),
            
            // Financial totals (preview mode)
            previewSubtotal: document.getElementById("invoice-preview-subtotal"),
            previewLevyTotal: document.getElementById("invoice-preview-levy-total"),
            previewVat: document.getElementById("invoice-preview-vat"),
            previewGrand: document.getElementById("invoice-preview-grand"),
            
            // Preview metadata
            previewCustomer: document.getElementById("invoice-preview-customer"),
            previewClassification: document.getElementById("invoice-preview-classification"),
            previewDate: document.getElementById("invoice-preview-date"),
            previewCompanyInfo: document.getElementById("invoice-preview-company-info"),
            previewClientRef: document.getElementById("invoice-preview-client-ref"),
            previewIntro: document.getElementById("invoice-preview-intro"),
            previewNotesList: document.getElementById("invoice-preview-notes"),
        };

        /**
         * Helper to find form fields by name with fallback to ID
         * @param {string} name - Form field name attribute
         * @param {string} fallbackId - Element ID to use if name not found
         * @returns {HTMLElement|null} The form field element
         */
        const findField = (name, fallbackId) => {
            const field = form.elements.namedItem(name);
            if (field) return field;
            return fallbackId ? document.getElementById(fallbackId) : null;
        };

        /**
         * Cached references to form input elements
         */
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
        
        // ============================================
        // UTILITY FUNCTIONS
        // ============================================
        
        /**
         * Formats a numeric value as currency (e.g., 1234.5 -> "1,234.50")
         * Imports from global helpers or provides fallback
         * @param {number|string} value - Value to format
         * @returns {string} Formatted currency string
         */
        const formatCurrency = typeof helpers.formatCurrency === "function"
            ? helpers.formatCurrency
            : (value) => Number(value || 0).toFixed(2);
        
        /**
         * Formats quantity values, showing decimals only when necessary
         * Whole numbers display without decimal point (e.g., 5 not 5.00)
         * @param {number|string} value - Quantity to format
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
         * Safely parses strings to numbers with graceful error handling
         * Returns 0 for invalid inputs instead of NaN
         * @param {string|number} value - Value to parse
         * @returns {number} Parsed number or 0 if invalid
         */
        const parseNumber = typeof helpers.parseNumber === "function"
            ? helpers.parseNumber
            : (value) => Number.parseFloat(value || 0) || 0;

        // ============================================
        // APPLICATION STATE
        // ============================================
        
        /**
         * Central state object managing invoice data and UI state
         * @property {Array} items - Line items array (max 10 items)
         * @property {Array} levies - Tax/levy configuration from server
         * @property {number|null} invoiceId - Database ID for existing invoices
         * @property {string} invoiceNumber - Current invoice number
         * @property {boolean} invoiceNumberReserved - Whether number is reserved in backend
         * @property {boolean} isSaving - Flag to prevent double-submission
         */
        const state = {
            items: [],
            levies: [],
            invoiceId: null,
            invoiceNumber: "INV000",
            invoiceNumberReserved: false,
            isSaving: false,
        };

        /**
         * Map storing references to levy value display elements for quick updates
         * Key: levy name, Value: DOM element
         */
        const levyValueMap = new Map();
        
        /**
         * Map storing references to preview levy value elements
         * Key: levy name, Value: DOM element
         */
        const previewLevyValueMap = new Map();

        /**
         * Default tax settings used when server config fails to load
         * Based on Ghana's tax structure (NHIL, GETFund, COVID levy, VAT)
         */
        const DEFAULT_TAX_SETTINGS = [
            { name: "NHIL", rate: 0.025, isVat: false },
            { name: "GETFund Levy", rate: 0.025, isVat: false },
            { name: "COVID", rate: 0.01, isVat: false },
            { name: "VAT", rate: 0.15, isVat: true },
        ];

        // ============================================
        // DOCUMENT NUMBER MANAGEMENT
        // ============================================

        /**
         * Ensures invoice number is reserved in the backend
         * Prevents duplicate invoice numbers across sessions
         * @async
         * @returns {Promise<Object>} Object with number, reserved status, and optional error
         */
        async function ensureInvoiceNumberReserved() {
            // Return early if already reserved
            if (state.invoiceNumberReserved && state.invoiceNumber) {
                return { number: state.invoiceNumber, reserved: true };
            }
            
            try {
                const response = await fetch(`${API_BASE}/api/counter/invoice/next/`, { method: "POST" });
                if (!response.ok) {
                    throw new Error(`Failed to reserve invoice number (${response.status})`);
                }
                
                const data = await response.json().catch(() => ({}));
                if (data?.next_number) {
                    setInvoiceNumber(data.next_number, { reserved: true });
                }
                
                return { number: state.invoiceNumber, reserved: true };
            } catch (error) {
                console.warn("Could not reserve invoice number", error);
                state.invoiceNumberReserved = false;
                
                // Fallback to loading next number without reservation
                if (!state.invoiceNumber) {
                    await loadNextInvoiceNumber();
                }
                
                return { number: state.invoiceNumber, reserved: false, error };
            }
        }

        /**
         * Loads the next available invoice number without reserving it
         * Used on page load and when reservation fails
         * @async
         */
        async function loadNextInvoiceNumber() {
            // Don't load if already reserved or editing existing invoice
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

        /**
         * Updates invoice number in state and all UI elements
         * @param {string} value - New invoice number
         * @param {Object} options - Configuration options
         * @param {boolean} options.reserved - Whether number is reserved in backend
         */
        function setInvoiceNumber(value, { reserved = false } = {}) {
            const numberValue = value || state.invoiceNumber || "";
            if (!numberValue) {
                return;
            }
            
            state.invoiceNumber = numberValue;
            state.invoiceNumberReserved = reserved;
            
            // Update all display elements
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

        // ============================================
        // API INTEGRATION
        // ============================================

        /**
         * Saves invoice to backend (create or update)
         * @async
         * @returns {Promise<Object>} API response with invoice data
         */
        async function saveInvoice() {
            const payload = buildPayload();
            const isUpdate = Boolean(state.invoiceId);
            const path = isUpdate ? `/invoices/api/${state.invoiceId}/` : `/invoices/api/create/`;
            const method = isUpdate ? "PUT" : "POST";
            
            const result = await callApi(path, {
                method,
                body: JSON.stringify(payload),
            });
            
            // Update state with response data
            if (result?.id) {
                state.invoiceId = result.id;
            }
            if (result?.document_number) {
                setInvoiceNumber(result.document_number, { reserved: true });
            }
            
            return result;
        }

        /**
         * Normalizes tax settings from server response to consistent format
         * Handles both object and array formats, identifies VAT by name
         * @param {Object|Array} taxSettings - Tax configuration from server
         * @returns {Array} Normalized array of tax objects
         */
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

        /**
         * Makes API calls with standardized error handling
         * Automatically sets JSON content type and parses responses
         * @async
         * @param {string} path - API endpoint path (relative to API_BASE)
         * @param {Object} options - Fetch options (method, body, headers)
         * @returns {Promise<Object|null>} Parsed JSON response or null for 204
         * @throws {Error} On non-OK responses with detailed error message
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
                let errorDetail = await response.json().catch(() => ({}));
                const message = errorDetail.errors 
                    ? JSON.stringify(errorDetail.errors) 
                    : `${response.status} ${response.statusText}`;
                throw new Error(message);
            }
            
            // Handle no-content responses
            if (response.status === 204) {
                return null;
            }
            
            return response.json();
        }

        /**
         * Builds API payload from current form state
         * Packages all invoice data for server submission
         * @returns {Object} Invoice payload for API
         */
        function buildPayload() {
            return {
                customer_name: inputs.customer?.value || "",
                classification: inputs.classification?.value || "",
                issue_date: inputs.issueDate?.value || "",
                items_payload: JSON.stringify(state.items),
                document_number: elements.documentNumberInput?.value || state.invoiceNumber || "",
            };
        }

        // ============================================
        // UI FEEDBACK
        // ============================================

        /**
         * Displays a temporary toast notification
         * Auto-hides after 4 seconds
         * @param {string} message - Message to display
         * @param {string} tone - Visual tone: "success", "error", "warning"
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
         * Returns field value or placeholder/fallback text
         * Useful for preview mode where empty fields need placeholder display
         * @param {HTMLElement} field - Form field element
         * @param {string} fallback - Default text if field is empty
         * @returns {string} Field value, placeholder, or fallback
         */
        function valueOrPlaceholder(field, fallback = "—") {
            if (!field) return fallback;
            
            const value = (field.value || "").trim();
            if (value) return value;
            
            return field.placeholder ? field.placeholder.trim() : fallback;
        }

        // ============================================
        // PREVIEW RENDERING
        // ============================================

        /**
         * Renders notes/terms as a formatted list in preview mode
         * Parses newline-separated text, strips bullet points, shows placeholder if empty
         * @param {string} notesText - Raw notes text from textarea
         */
        function renderPreviewNotes(notesText) {
            if (!elements.previewNotesList) return;
            
            elements.previewNotesList.innerHTML = "";
            
            // Parse and clean notes text
            const lines = (notesText || "")
                .split(/\r?\n/)
                .map((line) => line.replace(/^[-•\s]+/, "").trim())
                .filter(Boolean);

            // Show placeholder for empty notes
            if (lines.length === 0) {
                const placeholderItem = document.createElement("li");
                placeholderItem.className = "empty-state";
                placeholderItem.textContent = "Add notes to display terms.";
                elements.previewNotesList.appendChild(placeholderItem);
                return;
            }

            // Render each note as a list item
            lines.forEach((line) => {
                const item = document.createElement("li");
                item.textContent = line;
                elements.previewNotesList.appendChild(item);
            });
        }

        /**
         * Creates levy/tax display rows in both edit and preview sections
         * Excludes VAT (shown separately), creates cached element references
         */
        function renderLevyPlaceholders() {
            if (!elements.levyContainer || !elements.previewLevyContainer) return;
            
            // Clear existing content
            elements.levyContainer.innerHTML = "";
            elements.previewLevyContainer.innerHTML = "";
            levyValueMap.clear();
            previewLevyValueMap.clear();

            // Render non-VAT levies
            state.levies
                .filter(({ isVat }) => !isVat)
                .forEach(({ name, rate }) => {
                    // Edit mode levy row
                    const line = document.createElement("p");
                    line.innerHTML = `<span>${name} (${(rate * 100).toFixed(2)}%):</span> <span data-levy="${name}">0.00</span>`;
                    elements.levyContainer.appendChild(line);
                    const valueEl = line.querySelector("[data-levy]");
                    levyValueMap.set(name, valueEl);

                    // Preview mode levy row
                    const previewLine = document.createElement("p");
                    previewLine.innerHTML = `<span>${name} (${(rate * 100).toFixed(2)}%):</span> <span data-preview-levy="${name}">0.00</span>`;
                    elements.previewLevyContainer.appendChild(previewLine);
                    const previewVal = previewLine.querySelector("[data-preview-levy]");
                    previewLevyValueMap.set(name, previewVal);
                });
        }

        // ============================================
        // ITEMS TABLE RENDERING
        // ============================================

        /**
         * Renders invoice line items in both edit and preview tables
         * Always displays exactly 10 rows (filled or empty) for consistent layout
         * Updates hidden payload field and triggers calculation
         */
        function renderItems() {
            const tableBody = elements.itemsTableBody;
            const previewBody = elements.previewRows;
            
            if (tableBody) tableBody.innerHTML = "";
            if (previewBody) previewBody.innerHTML = "";

            // Always render exactly 10 rows for consistent document layout
            for (let index = 0; index < 10; index++) {
                const item = state.items[index];
                
                // ========== EDIT MODE ROW ==========
                const row = document.createElement("tr");
                
                if (item) {
                    // Row with actual data and input fields
                    row.innerHTML = `
                        <td><input type="text" data-field="description" data-index="${index}" value="${item.description || ""}" /></td>
                        <td><input type="number" step="0.01" data-field="quantity" data-index="${index}" value="${item.quantity || 0}" /></td>
                        <td><input type="number" step="0.01" data-field="unit_price" data-index="${index}" value="${item.unit_price || 0}" /></td>
                        <td class="row-total">${formatCurrency(item.total || 0)}</td>
                        <td><button type="button" class="btn-remove-row" data-remove="${index}" aria-label="Remove row" title="Remove this item">×</button></td>
                    `;
                } else {
                    // Empty placeholder row
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

                // ========== PREVIEW MODE ROW ==========
                const previewRow = document.createElement("tr");
                
                if (item) {
                    // Row with formatted display values
                    previewRow.innerHTML = `
                        <td>${item.description || ""}</td>
                        <td>${formatQuantity(item.quantity || 0)}</td>
                        <td>${formatCurrency(item.unit_price || 0)}</td>
                        <td>${formatCurrency(item.total || 0)}</td>
                    `;
                } else {
                    // Empty placeholder row
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

            // Update hidden field with serialized items data
            if (elements.itemsPayload) {
                elements.itemsPayload.value = JSON.stringify(state.items);
            }

            // Recalculate all totals after rendering
            recalcTotals();
        }

        // ============================================
        // FINANCIAL CALCULATIONS
        // ============================================

        /**
         * Recalculates and updates all financial totals (client-side)
         * Computes subtotal, levies, VAT, and grand total
         * Updates both edit and preview display elements
         * 
         * Calculation flow:
         * 1. Subtotal = sum of all line item totals
         * 2. Levies = subtotal * levy rates (NHIL, GETFund, COVID)
         * 3. Levy Total = subtotal + sum of levies
         * 4. VAT = subtotal * VAT rate
         * 5. Grand Total = subtotal + levies + VAT
         */
        function recalcTotals() {
            // Calculate subtotal from line items
            const subtotal = state.items.reduce((sum, item) => sum + parseNumber(item.total), 0);
            
            // Update subtotal displays
            elements.subtotal && (elements.subtotal.textContent = formatCurrency(subtotal));
            elements.previewSubtotal && (elements.previewSubtotal.textContent = formatCurrency(subtotal));

            let levyTotal = 0;
            let vatAmount = 0;

            // Calculate and display each levy/tax
            state.levies.forEach(({ name, rate, isVat }) => {
                const amount = subtotal * rate;
                
                if (isVat) {
                    // VAT is handled separately
                    vatAmount = amount;
                    return;
                }
                
                // Update levy display elements
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

            // Levy Total = Subtotal + Levies (not including VAT)
            const totalLeviesAndValue = subtotal + levyTotal;
            elements.levyTotal && (elements.levyTotal.textContent = formatCurrency(totalLeviesAndValue));
            elements.previewLevyTotal && (elements.previewLevyTotal.textContent = formatCurrency(totalLeviesAndValue));
            
            // Update VAT displays
            elements.vat && (elements.vat.textContent = formatCurrency(vatAmount));
            elements.previewVat && (elements.previewVat.textContent = formatCurrency(vatAmount));

            // Grand Total = Subtotal + Levies + VAT
            const grandTotal = subtotal + levyTotal + vatAmount;
            elements.grandTotal && (elements.grandTotal.textContent = formatCurrency(grandTotal));
            elements.previewGrand && (elements.previewGrand.textContent = formatCurrency(grandTotal));
        }

        /**
         * Synchronizes preview display with current form values
         * Updates all preview text fields, dates, and notes
         * Called on form input changes and before toggling to preview mode
         */
        function syncPreviewFromForm() {
            // Sync basic fields
            elements.previewCustomer && (elements.previewCustomer.textContent = inputs.customer?.value || "—");
            elements.previewClassification && (elements.previewClassification.textContent = inputs.classification?.value || "—");
            elements.previewDate && (elements.previewDate.textContent = inputs.issueDate?.value || "—");
            
            // Sync invoice number
            const currentNumber = state.invoiceNumber || elements.invoiceNumber?.textContent || "—";
            if (elements.previewNumber) {
                elements.previewNumber.textContent = currentNumber;
            }
            
            // Sync fields with placeholders
            elements.previewCompanyInfo && (elements.previewCompanyInfo.textContent = valueOrPlaceholder(inputs.companyInfo, "Creative Designs | Logo Creation | Branding | Printing"));
            elements.previewClientRef && (elements.previewClientRef.textContent = valueOrPlaceholder(inputs.clientRef, ""));
            elements.previewIntro && (elements.previewIntro.textContent = valueOrPlaceholder(inputs.intro, "Please find below for your appraisal and detailed pro-forma invoice."));
            
            // Render notes as formatted list
            renderPreviewNotes(inputs.notes?.value || "");
        }

        /**
         * Calculates totals using server-side API for accuracy
         * Server calculation ensures consistency with saved invoices
         * Updates all financial displays on success, fails silently
         * @async
         */
        async function calculateServerTotals() {
            try {
                const payload = buildPayload();
                const result = await callApi("/invoices/api/calculate-preview/", {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                
                if (!result) return;
                
                // Update subtotals
                elements.subtotal && (elements.subtotal.textContent = formatCurrency(result.subtotal));
                elements.previewSubtotal && (elements.previewSubtotal.textContent = formatCurrency(result.subtotal));

                let levySum = 0;
                let vatAmount = 0;
                
                // Process each levy from server response
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
                
                // Ensure VAT is displayed even if server omits it
                const vatFormatted = formatCurrency(vatAmount);
                elements.vat && (elements.vat.textContent = vatFormatted);
                elements.previewVat && (elements.previewVat.textContent = vatFormatted);
                
                // Calculate and display levy total
                const subtotalNumber = Number(result.subtotal || 0);
                const totalLeviesAndValue = subtotalNumber + levySum;
                elements.levyTotal && (elements.levyTotal.textContent = formatCurrency(totalLeviesAndValue));
                elements.previewLevyTotal && (elements.previewLevyTotal.textContent = formatCurrency(totalLeviesAndValue));

                // Calculate and display grand total
                const grandTotal = Number(result.grand_total ?? (subtotalNumber + levySum + vatAmount));
                elements.grandTotal && (elements.grandTotal.textContent = formatCurrency(grandTotal));
                elements.previewGrand && (elements.previewGrand.textContent = formatCurrency(grandTotal));
            } catch (error) {
                console.warn("Failed to calculate preview totals", error);
            }
        }

        /**
         * Creates a debounced version of a function
         * Delays execution until after calls have stopped for specified time
         * @param {Function} fn - Function to debounce
         * @param {number} delay - Delay in milliseconds
         * @returns {Function} Debounced function
         */
        function debounce(fn, delay = 250) {
            let t;
            return function (...args) {
                clearTimeout(t);
                t = setTimeout(() => fn.apply(this, args), delay);
            };
        }

        // Debounced server calculation to avoid excessive API calls during typing
        const debouncedServerTotals = debounce(calculateServerTotals, 300);

        // ============================================
        // PREVIEW MODE MANAGEMENT
        // ============================================

        /**
         * Handles preview toggle button click
         * Ensures preview is fully synchronized before displaying
         * @async
         */
        async function handlePreviewToggle() {
            // Refresh all preview content
            renderItems();
            syncPreviewFromForm();
            await calculateServerTotals();
            
            // Switch to preview mode
            togglePreview(moduleId, true);
        }

        /**
         * Prepares preview for PDF/JPEG generation
         * Ensures all data is rendered and calculated before export
         * @async
         */
        async function preparePreviewSnapshot() {
            renderItems();
            syncPreviewFromForm();
            await calculateServerTotals();
        }

        // ============================================
        // PDF/JPEG EXPORT
        // ============================================

        /**
         * Builds HTML payload for PDF/JPEG rendering
         * Clones preview DOM, removes interactive elements, wraps for styling
         * @param {string} docType - Document type identifier ("invoice")
         * @param {HTMLElement} previewEl - Preview DOM element to clone
         * @param {string} format - Export format ("pdf" or "jpeg")
         * @returns {Object} Payload for server rendering API
         */
        function buildDocumentPayload(docType, previewEl, format) {
            // Deep clone preview element
            const clone = previewEl.cloneNode(true);
            clone.removeAttribute("hidden");
            clone.setAttribute("data-pdf-clone", "true");
            clone.classList.add("pdf-export");
            
            // Remove interactive elements not needed in export
            clone.querySelectorAll("[data-exit-preview]").forEach((el) => el.remove());
            clone.querySelectorAll(".preview-actions").forEach((el) => el.remove());
            
            // Wrap in container div for proper PDF styling (matches preview exactly)
            const wrapper = document.createElement("div");
            wrapper.className = "pdf-export-wrapper";
            wrapper.appendChild(clone);
            
            // Normalize format and generate filename
            const normalizedFormat = format === "jpeg" ? "jpeg" : "pdf";
            const safeBase = String(state.invoiceNumber || "invoice").trim().replace(/\s+/g, "_");
            const extension = normalizedFormat === "jpeg" ? "jpg" : "pdf";
            
            return {
                document_type: docType,
                html: wrapper.outerHTML,
                filename: `${safeBase}.${extension}`,
                format: normalizedFormat,
            };
        }

        /**
         * Downloads invoice as PDF or JPEG using server-side rendering
         * Prepares preview, sends HTML to backend, triggers browser download
         * @async
         * @param {string} format - Export format ("pdf" or "jpeg")
         * @throws {Error} On network errors or render failures
         */
        async function downloadInvoiceDocument(format) {
            try {
                // Ensure preview is fully rendered and calculated
                await preparePreviewSnapshot();

                // Get preview element for cloning
                const previewEl = document.getElementById("invoice-preview");
                if (!previewEl) {
                    throw new Error("Preview element not found");
                }

                // Build payload with HTML and metadata
                const payload = buildDocumentPayload("invoice", previewEl, format);
                const normalizedFormat = payload.format === "jpeg" ? "jpeg" : "pdf";

                // Log request details for debugging
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

                // Check for render errors
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("PDF render error response:", errorText);
                    throw new Error(`Failed to generate PDF: ${response.status} ${response.statusText}`);
                }

                // Download rendered document
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

        // ============================================
        // SAVE/DOWNLOAD HANDLER
        // ============================================

        /**
         * Handles the submit button click - prompts for format and downloads document
         * Flow: choose format → reserve number → download → show toast → load next number
         * Prevents double-submission with state.isSaving flag
         * @async
         */
        async function handleSave() {
            // Prevent double-submission
            if (state.isSaving) return;
            
            state.isSaving = true;
            elements.submitBtn?.setAttribute("disabled", "disabled");

            try {
                // Prompt user to choose PDF or JPEG
                const chosenFormat = await chooseDownloadFormat();
                if (!chosenFormat) {
                    // User cancelled
                    return;
                }
                
                // Sync preview data
                syncPreviewFromForm();
                
                // Reserve invoice number in backend
                const reservation = await ensureInvoiceNumberReserved();
                
                // Download document
                const normalizedFormat = chosenFormat === "jpeg" ? "jpeg" : "pdf";
                await downloadInvoiceDocument(normalizedFormat);
                
                // Show success message
                const label = normalizedFormat === "jpeg" ? "JPEG" : "PDF";
                const successMessage = `Invoice downloaded as ${label}!`;
                
                if (reservation?.reserved) {
                    showToast(successMessage);
                    // Load next number for new invoice (only if not editing existing)
                    if (!state.invoiceId) {
                        state.invoiceNumberReserved = false;
                        await loadNextInvoiceNumber();
                    }
                } else {
                    // Number reservation failed but download succeeded
                    showToast(`${successMessage} However, a new number could not be reserved.`, "warning");
                    if (!state.invoiceId) {
                        state.invoiceNumberReserved = false;
                        await loadNextInvoiceNumber();
                    }
                }
            } catch (error) {
                console.error("Failed to download invoice", error);
                showToast(error.message || "Failed to download invoice", "error");
            } finally {
                // Re-enable button
                state.isSaving = false;
                elements.submitBtn?.removeAttribute("disabled");
            }
        }

        // ============================================
        // DATA LOADING
        // ============================================

        /**
         * Extracts query parameter from current URL
         * @param {string} name - Parameter name
         * @returns {string|null} Parameter value or null
         */
        function getQueryParam(name) {
            const params = new URLSearchParams(window.location.search);
            return params.get(name);
        }

        /**
         * Loads tax/levy configuration from server
         * Falls back to DEFAULT_TAX_SETTINGS on error
         * @async
         */
        async function loadConfig() {
            try {
                const data = await callApi("/invoices/api/config/");
                state.levies = normalizeTaxSettings(data?.tax_settings);
                
                // Fallback to defaults if server returns empty
                if (!state.levies.length) {
                    state.levies = normalizeTaxSettings();
                }
            } catch (error) {
                console.warn("Failed to load invoice config", error);
                state.levies = normalizeTaxSettings();
            }
            
            // Render levy rows and calculate initial totals
            renderLevyPlaceholders();
            recalcTotals();
        }

        /**
         * Loads existing invoice data when editing (ID in URL)
         * Populates form fields and items from API response
         * @async
         */
        async function loadExistingInvoice() {
            const id = getQueryParam("id");
            
            // No ID means creating new invoice
            if (!id) {
                state.items = [{ description: "", quantity: 0, unit_price: 0, total: 0 }];
                renderItems();
                return;
            }
            
            try {
                // Fetch invoice data from API
                const data = await callApi(`/invoices/api/${id}/`);
                
                // Update state
                state.invoiceId = data.id;
                setInvoiceNumber(data.document_number || data.invoice_number || state.invoiceNumber, { reserved: true });
                
                // Populate form fields
                if (inputs.customer) inputs.customer.value = data.customer_name || "";
                if (inputs.classification) inputs.classification.value = data.classification || "";
                if (inputs.issueDate && data.issue_date) inputs.issueDate.value = data.issue_date;
                
                // Load items (with fallback to empty item)
                const receivedItems = Array.isArray(data.items) ? data.items : [];
                state.items = receivedItems.length ? receivedItems : [{ description: "", quantity: 0, unit_price: 0, total: 0 }];
                
                renderItems();
            } catch (error) {
                console.error("Failed to load invoice", error);
                // Fallback to empty state
                state.items = [{ description: "", quantity: 0, unit_price: 0, total: 0 }];
                renderItems();
            }
            
            // Sync preview with loaded data
            syncPreviewFromForm();
        }

        // ============================================
        // EVENT LISTENERS
        // ============================================

        /**
         * Attaches all event listeners for user interactions
         * Handles item editing, buttons, and live preview sync
         */
        function attachEventListeners() {
            // ========== ITEM TABLE INPUT HANDLER ==========
            // Handles real-time editing of line items
            elements.itemsTableBody?.addEventListener("input", (event) => {
                const target = event.target;
                const field = target.getAttribute("data-field");
                const index = Number(target.getAttribute("data-index"));
                
                // Validate we have a valid item index
                if (Number.isNaN(index) || !field) return;
                
                // Get or create item
                const item = state.items[index] || {};
                
                // Update field value
                if (field === "description") {
                    item.description = target.value;
                } else {
                    item[field] = parseNumber(target.value);
                }
                
                // Recalculate item total
                item.total = parseNumber(item.quantity) * parseNumber(item.unit_price);
                state.items[index] = item;
                
                // Update only the total cell to preserve input focus
                const rowEl = target.closest("tr");
                const totalEl = rowEl ? rowEl.querySelector(".row-total") : null;
                if (totalEl) totalEl.textContent = formatCurrency(item.total || 0);
                
                // Update hidden payload
                if (elements.itemsPayload) {
                    elements.itemsPayload.value = JSON.stringify(state.items);
                }
                
                // Recalculate totals
                recalcTotals();
                debouncedServerTotals();
            });

            // ========== REMOVE ITEM BUTTON HANDLER ==========
            elements.itemsTableBody?.addEventListener("click", (event) => {
                const button = event.target.closest("button[data-remove]");
                if (!button) return;
                
                const index = Number(button.getAttribute("data-remove"));
                state.items.splice(index, 1);
                renderItems();
            });

            // ========== ADD ITEM BUTTON HANDLER ==========
            elements.addItemBtn?.addEventListener("click", () => {
                // Enforce 10-item maximum
                if (state.items.length >= 10) {
                    showToast("Maximum 10 items allowed", "error");
                    return;
                }
                
                state.items.push({ description: "", quantity: 0, unit_price: 0, total: 0 });
                renderItems();
                debouncedServerTotals();
            });

            // ========== PREVIEW TOGGLE BUTTON ==========
            elements.previewToggleBtn?.addEventListener("click", () => {
                handlePreviewToggle();
            });

            // ========== SUBMIT/DOWNLOAD BUTTON ==========
            elements.submitBtn?.addEventListener("click", () => {
                handleSave();
            });

            // ========== EXIT PREVIEW BUTTON ==========
            elements.exitPreviewBtn?.addEventListener("click", () => {
                togglePreview(moduleId, false);
            });

            // ========== LIVE PREVIEW SYNC ==========
            // Auto-sync preview when form fields change
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
            
            // Date field uses 'change' event instead of 'input'
            inputs.issueDate?.addEventListener("change", syncPreviewFromForm);
        }

        // ============================================
        // MODULE INITIALIZATION
        // ============================================

        /**
         * Asynchronous initialization function
         * Runs when DOM is ready, sets up the invoice module
         * @async
         */
        (async function init() {
            // 1. Attach all event listeners
            attachEventListeners();
            
            // 2. Load tax configuration from server
            await loadConfig();
            
            // 3. Load next invoice number for new invoices
            await loadNextInvoiceNumber();
            
            // 4. Load existing invoice if editing (ID in URL)
            await loadExistingInvoice();
            
            // 5. Sync preview with initial form state
            syncPreviewFromForm();
            
            // 6. Perform initial calculation
            debouncedServerTotals();
        })();
    });
})();
