/* ============================================
   WAYBILL MODULE - MAIN JAVASCRIPT
   ============================================
   This file handles all waybill functionality including:
   - Line item management (add, edit, remove)
   - Delivery and receiver information
   - Preview mode toggling
   - Form validation
   - PDF and JPEG export functionality
   - API integration for document numbering
   
   EDIT MODE:
   - Users fill out form with line items, delivery info
   - Line items table with dynamic add/remove
   - "Preview" button switches to preview mode
   
   PREVIEW MODE:
   - Read-only view matching final document output
   - "Download" button triggers format selection
   - "Back to Edit" returns to edit mode
   
   PDF/JPEG DOWNLOAD PROCESS:
   1. User clicks "Download" button
   2. chooseDownloadFormat() shows modal dialog
   3. User selects PDF or JPEG format
   4. syncPreview() updates preview with form data
   5. buildWaybillPayload() clones preview HTML
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
    const parseNumber = typeof helpers.parseNumber === "function" ? helpers.parseNumber : (value) => Number.parseFloat(value || 0) || 0;
    const formatCurrency = typeof helpers.formatCurrency === "function" ? helpers.formatCurrency : (value) => Number(value || 0).toFixed(2);
    const formatQuantity = typeof helpers.formatQuantity === "function"
        ? helpers.formatQuantity
        : (value) => {
            const numeric = Number.parseFloat(value || 0);
            if (!Number.isFinite(numeric)) return "0";
            return Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(2);
        };

    const moduleId = "waybill-module";
    // Module ID
    const moduleEl = document.getElementById(moduleId);
    // Module element
    const form = document.getElementById("waybill-form");
    // Form element
    if (!moduleEl || !form) return;
    // Exit if elements not found

    const config = window.BILLING_APP_CONFIG || {};
    // Global config
    const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";
    // API base URL

    const elements = {
        // DOM elements object
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

    const inputs = {
        // Input elements object
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

    const state = {
        // State object
        items: [],
        waybillId: null,
        waybillNumber: "WB-NEW",
        isSaving: false,
    };

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

    /**
     * Build payload for PDF/JPEG generation from preview HTML
     * 
     * This function prepares the waybill preview HTML for server-side
     * rendering into PDF or JPEG format.
     * 
     * PROCESS:
     * 1. Clone preview DOM to avoid modifying visible preview
     * 2. Remove interactive elements (exit buttons, etc.)
     * 3. Wrap in .pdf-export-wrapper for proper styling
     * 4. Generate safe filename from waybill number
     * 5. Return payload object for API submission
     * 
     * The backend will:
     * - Parse the HTML string
     * - Apply CSS styles (general.css + waybill.css)
     * - Use WeasyPrint to render PDF at A4 size
     * - If JPEG: convert first page of PDF to image
     * - Return binary file for download
     * 
     * @param {HTMLElement} previewEl - Preview document element to clone
     * @param {string} format - Desired format ("pdf" or "jpeg")
     * @returns {Object} Payload object with document_type, html, filename, format
     */
    function buildWaybillPayload(previewEl, format) {
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
        const safeBase = String(state.waybillNumber || "waybill").trim().replace(/\s+/g, "_");
        const extension = normalizedFormat === "jpeg" ? "jpg" : "pdf";

        // Return payload for API submission
        return {
            document_type: "waybill",
            html: wrapper.outerHTML,
            filename: `${safeBase}.${extension}`,
            format: normalizedFormat,
        };
    }

    /**
     * Download waybill as PDF or JPEG file
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
     * - Applies CSS stylesheets (general.css + waybill.css)
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
    async function downloadWaybillDocument(format) {
        try {
            // Ensure preview is up-to-date with form data
            syncPreview();

            // Get preview element to clone
            const previewEl = document.getElementById("waybill-preview");
            if (!previewEl) {
                throw new Error("Preview element not found");
            }

            // Build payload for backend
            const payload = buildWaybillPayload(previewEl, format);
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
     * 2. Download waybill in chosen format
     * 3. Show success/error message
     * 
     * DOWNLOAD vs SAVE:
     * Note: Despite the function name, this actually downloads
     * the document rather than saving to database. Waybills are
     * ephemeral documents for delivery tracking.
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
            
            // Step 2: Download waybill in chosen format
            const normalizedFormat = chosenFormat === "jpeg" ? "jpeg" : "pdf";
            await downloadWaybillDocument(normalizedFormat);
            
            // Step 3: Show success message
            const label = normalizedFormat === "jpeg" ? "JPEG" : "PDF";
            showToast(`Waybill downloaded as ${label}!`);
        } catch (error) {
            console.error("Failed to download waybill", error);
            showToast(error.message || "Failed to download waybill", "error");
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
