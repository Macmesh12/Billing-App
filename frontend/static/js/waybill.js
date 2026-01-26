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
    // IIFE for waybill module
    const helpers = window.BillingApp || {};
    // Get global helpers
    const togglePreview = typeof helpers.togglePreview === "function" ? helpers.togglePreview : () => {};
    // Fallback for togglePreview
    const parseNumber = typeof helpers.parseNumber === "function" ? helpers.parseNumber : (value) => Number.parseFloat(value || 0) || 0;
    // Fallback for parseNumber
    const formatCurrency = typeof helpers.formatCurrency === "function" ? helpers.formatCurrency : (value) => Number(value || 0).toFixed(2);
    // Fallback for formatCurrency
    const formatQuantity = typeof helpers.formatQuantity === "function"
        ? helpers.formatQuantity
        : (value) => {
            const numeric = Number.parseFloat(value || 0);
            if (!Number.isFinite(numeric)) return "0";
            return Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(2);
        };

    console.log('[Waybill] waybill.js loaded and DOM ready');
    const moduleId = "waybill-module";
    // Module ID
    const moduleEl = document.getElementById(moduleId);
    console.log('[Waybill] moduleEl:', moduleEl);
    // Module element
    const form = document.getElementById("waybill-form");
    console.log('[Waybill] form:', form);
    // Form element
    if (!moduleEl || !form) {
        console.error('[Waybill] Missing required elements! moduleEl:', moduleEl, 'form:', form);
        return;
    }
    console.log('[Waybill] All required elements found, continuing initialization...');
    // Exit if elements not found

    const config = window.BILLING_APP_CONFIG || {};
    // Global config
    const API_BASE = config.apiBaseUrl || (window.location ? window.location.origin : "http://127.0.0.1:8765");
    // API base URL

    const elements = {
        // DOM elements object
        itemsPayload: document.getElementById("waybill-items-payload"),
        itemsTableBody: document.querySelector("#waybill-items-table tbody"),
        previewRowsContainers: document.querySelectorAll(".js-waybill-preview-rows"),
        previewToggleBtn: document.getElementById("waybill-preview-toggle"),
        previewBackBtn: document.getElementById("waybill-back-to-edit"),
        
    submitBtn: document.getElementById("waybill-submit"),
    saveBtn: document.getElementById("waybill-save"),
        saveDraftBtn: document.getElementById("waybill-save-draft"),
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

    // Helper function to generate SPQ + 2 uppercase letters + 4 digits
    function generateSPQNumber() {
        const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
        const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
        return `SPQ${letters}${digits}`;
    }

    const state = {
        // State object
        items: [
            { description: "", quantity: 0, unit_price: 0, total: 0, enabled: true },
            { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
            { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
        ],
        waybillId: null,
        waybillNumber: generateSPQNumber(),
        draftId: null,
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

            // Render items and placeholders (only enabled items contribute values)
            state.items.forEach((item) => {
                if (item && item.enabled === false) {
                    const placeholderRow = document.createElement("tr");
                    placeholderRow.innerHTML = `
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                    `;
                    container.appendChild(placeholderRow);
                    return;
                }
                const previewRow = document.createElement("tr");
                previewRow.innerHTML = `
                    <td>${item.description || ""}</td>
                    <td>${formatQuantity(item.quantity || 0)}</td>
                    <td>${formatCurrency(item.unit_price || 0)}</td>
                    <td>${formatCurrency(item.total || 0)}</td>
                `;
                container.appendChild(previewRow);
            });
        });
    }

    function computeWaybillTotals() {
        // Only include enabled items in totals
        let totalQuantity = 0;
        let subtotal = 0;
        (state.items || []).forEach((item) => {
            if (!item || item.enabled === false) return;
            totalQuantity += parseNumber(item.quantity);
            subtotal += parseNumber(item.total);
        });
        return {
            total_quantity: totalQuantity,
            subtotal,
        };
    }

    function serializeWaybillItems() {
        return (state.items || [])
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

    function buildWaybillDocumentPayload(totals) {
        const safeTotals = totals || computeWaybillTotals();
        return {
            waybill_number: state.waybillNumber,
            issue_date: inputs.issueDate?.value || "",
            customer_name: inputs.customer?.value || "",
            destination: inputs.destination?.value || "",
            driver_name: inputs.driver?.value || "",
            receiver_name: inputs.receiver?.value || "",
            note: inputs.note?.value || "",
            delivery_date: inputs.deliveryDate?.value || "",
            received_date: inputs.receivedDateText?.value || "",
            contact: inputs.contact?.value || "",
            items: serializeWaybillItems(),
            totals: {
                total_quantity: Number(safeTotals.total_quantity || 0),
                subtotal: Number(safeTotals.subtotal || 0),
            },
        };
    }

    function renderItems() {
        // Render only actual items in the table (no placeholder rows)
        const tableBody = elements.itemsTableBody;
        if (tableBody) tableBody.innerHTML = "";

        state.items.forEach((item, index) => {
            if (item && item.enabled === false) {
                const placeholder = document.createElement('tr');
                placeholder.className = 'item-placeholder';
                placeholder.innerHTML = `
                    <td class="placeholder-cell">&nbsp;</td>
                    <td class="placeholder-cell">&nbsp;</td>
                    <td class="placeholder-cell">&nbsp;</td>
                    <td class="row-total">&nbsp;</td>
                    <td></td>
                `;
                tableBody?.appendChild(placeholder);
                return;
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><input type="text" data-field="description" data-index="${index}" value="${item.description || ""}" /></td>
                <td><input type="number" step="0.01" data-field="quantity" data-index="${index}" value="${item.quantity || 0}" /></td>
                <td><input type="number" step="0.01" data-field="unit_price" data-index="${index}" value="${item.unit_price || 0}" /></td>
                <td class="row-total">${formatCurrency(item.total || 0)}</td>
                <td><button type="button" class="btn-remove-row" data-remove="${index}" aria-label="Remove row" title="Remove this item">×</button></td>
            `;
            tableBody?.appendChild(row);
        });

        if (elements.itemsPayload) {
            elements.itemsPayload.value = JSON.stringify(serializeWaybillItems());
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
        return computeWaybillTotals();
    }

    async function handlePreview() {
        // Handle preview toggle
        console.log('[Waybill] handlePreview() called');
        syncPreview();
        try {
            togglePreview(moduleId, true);
            return;
        } catch (err) {
            console.error('Failed to toggle in-place preview', err);
        }
    }

    async function downloadWaybillPdf() {
        // Download waybill as PDF
        if (
            typeof window.jspdf === "undefined" ||
            typeof window.jspdf.jsPDF === "undefined" ||
            typeof window.html2canvas !== "function"
        ) {
            showToast("PDF generator not available", "error");
            return;
        }
        
        syncPreview();

        const moduleEl = document.getElementById(moduleId);
        const docEl = (moduleEl && moduleEl.querySelector('.module-preview')) || moduleEl.querySelector('.document') || document.getElementById("waybill-form");
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

        let filename = state.waybillNumber || "waybill";
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

            const rect = clone.getBoundingClientRect();
            const widthPx = Math.max(rect.width || clone.offsetWidth || 794, 1);
            const heightPx = Math.max(rect.height || clone.scrollHeight || 1122, 1);
            clone.style.width = widthPx + 'px';
            clone.style.maxWidth = widthPx + 'px';

            const canvas = await window.html2canvas(clone, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#ffffff",
                logging: false,
                width: Math.ceil(widthPx),
                height: Math.ceil(heightPx),
                foreignObjectRendering: false,
                removeContainer: true,
            });

            const { jsPDF } = window.jspdf;

            const imgData = canvas.toDataURL("image/png");
            const pxPerMm = 96 / 25.4;
            const widthMm = Math.max(1, Math.round((widthPx / pxPerMm) * 100) / 100);
            const heightMm = Math.max(1, Math.round((heightPx / pxPerMm) * 100) / 100);
            const pdfWidth = widthMm;
            const pdfHeight = heightMm;
            const pdf = new jsPDF({ orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait', unit: 'mm', format: [pdfWidth, pdfHeight], compress: true });
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
            if (window.__TAURI__?.dialog?.save && window.__TAURI__?.fs?.writeBinaryFile) {
                // Tauri: Show save dialog and write PDF
                const { dialog, fs } = window.__TAURI__;
                let savePath = await dialog.save({
                    defaultPath: filename,
                    filters: [{ name: "PDF Document", extensions: ["pdf"] }],
                });
                
                if (!savePath) {
                    showToast("PDF save cancelled", "info");
                    return;
                }
                
                if (!savePath.toLowerCase().endsWith(".pdf")) {
                    savePath = `${savePath}.pdf`;
                }
                
                // Get PDF as ArrayBuffer and inspect header before writing
                const pdfData = pdf.output("arraybuffer");
                const uint8Array = new Uint8Array(pdfData);
                const header = (typeof TextDecoder !== 'undefined') ? new TextDecoder().decode(uint8Array.slice(0, 5)) : null;
                if (!header || !header.startsWith('%PDF')) {
                    console.error('Generated PDF header invalid (Tauri save):', header, uint8Array.slice(0, 20));
                    showToast('Failed to generate valid PDF (header mismatch)', 'error');
                    return;
                }
                // Convert to plain array for IPC
                const bytes = Array.from(uint8Array);
                await fs.writeBinaryFile({ path: savePath, contents: bytes });
                // Attempt to open the saved file (desktop only). Ignore errors.
                try { if (window.__TAURI__?.shell?.open) await window.__TAURI__.shell.open(savePath); } catch (e) { /* ignore */ }
                showToast("PDF saved successfully!");
            } else {
                // Browser: Direct download using blob to ensure binary format
                const pdfBlob = pdf.output('blob');
                // Validate PDF header before triggering download
                try {
                    const ab = await pdfBlob.arrayBuffer();
                    const u8 = new Uint8Array(ab);
                    const headerB = (typeof TextDecoder !== 'undefined') ? new TextDecoder().decode(u8.slice(0, 5)) : null;
                    if (!headerB || !headerB.startsWith('%PDF')) {
                        console.error('Generated PDF header invalid (browser):', headerB, u8.slice(0, 20));
                        showToast('Failed to generate valid PDF (header mismatch)', 'error');
                        return;
                    }
                } catch (e) {
                    console.warn('Failed to validate PDF blob header', e);
                }
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                showToast("PDF downloaded successfully!");
            }
        } catch (error) {
            console.error("PDF generation error:", error);
            showToast("Failed to generate PDF: " + error.message, "error");
        } finally {
            document.body.removeChild(exportWrapper);
        }
    }

    async function handleSave() {
        // Handle PDF download
        console.log('[Waybill] handleSave() called, isSaving:', state.isSaving);
        if (state.isSaving) return;
        state.isSaving = true;
        elements.submitBtn?.setAttribute("disabled", "disabled");

        try {
            console.log('[Waybill] Calling downloadWaybillPdf()...');
            await downloadWaybillPdf();
            // Increment the counter after successful PDF download
            console.log('[Waybill] PDF download complete, incrementing counter...');
            await incrementWaybillNumber();
        } catch (error) {
            console.error('[Waybill] Error in handleSave:', error);
        } finally {
            state.isSaving = false;
            elements.submitBtn?.removeAttribute("disabled");
        }
    }

    async function saveWaybillFile() {
        console.log('[Waybill] saveWaybillFile() called, isSaving:', state.isSaving);
        if (state.isSaving) return;
        if (typeof helpers.saveDocument !== "function") {
            console.error('[Waybill] saveDocument helper not available');
            showToast("Save helper unavailable.", "error");
            return;
        }
        state.isSaving = true;
        elements.saveBtn?.setAttribute("disabled", "disabled");
        elements.submitBtn?.setAttribute("disabled", "disabled");

        try {
            showToast("Saving waybill…", "info");
            console.log('[Waybill] Building waybill payload...');
            const totals = syncPreview() || computeWaybillTotals();
            const payload = buildWaybillDocumentPayload(totals);
            const metadata = {
                number: state.waybillNumber,
                customer: inputs.customer?.value || "",
                destination: inputs.destination?.value || "",
            };
            const result = await helpers.saveDocument({
                type: "waybill",
                defaultName: state.waybillNumber || "waybill",
                data: payload,
                metadata,
            });
            if (result?.cancelled) {
                showToast("Waybill save cancelled.", "info");
                return;
            }
            showToast("Waybill saved.", "success");
            try {
                if (window.Customers && typeof window.Customers.add === 'function') {
                    window.Customers.add(inputs.customer?.value || '');
                }
            } catch (e) { /* ignore */ }
            // Increment the counter after successful save
            await incrementWaybillNumber();
        } catch (error) {
            console.error(error);
            showToast("Failed to save waybill.", "error");
        } finally {
            state.isSaving = false;
            elements.saveBtn?.removeAttribute("disabled");
            elements.submitBtn?.removeAttribute("disabled");
        }
    }

    function getQueryParam(name) {
        // Get URL query param
        return new URLSearchParams(window.location.search).get(name);
    }

    async function loadExistingWaybill() {
        // Load existing waybill if ID in URL or if an openDocument was placed in sessionStorage
        try {
            const openDocJson = window.sessionStorage?.getItem('billingapp.openDocument');
            if (openDocJson) {
                window.sessionStorage?.removeItem('billingapp.openDocument');
                const openDoc = JSON.parse(openDocJson);
                if (openDoc.type === 'waybill' && openDoc.data) {
                    const data = openDoc.data;
                    state.waybillNumber = data.waybill_number || state.waybillNumber;
                    elements.number && (elements.number.textContent = state.waybillNumber);
                    setText(elements.previewNumberEls, state.waybillNumber);
                    if (inputs.issueDate && data.issue_date) inputs.issueDate.value = data.issue_date;
                    if (inputs.customer) inputs.customer.value = data.customer_name || "";
                    if (inputs.destination) inputs.destination.value = data.destination || "";
                    if (inputs.driver) inputs.driver.value = data.driver_name || "";
                    if (inputs.receiver) inputs.receiver.value = data.receiver_name || "";
                    const receivedItems = Array.isArray(data.items) ? data.items : [];
                    // If opened document has no items, provide three placeholder rows
                    state.items = receivedItems.length ? receivedItems : [
                        { description: "", quantity: 0, unit_price: 0, total: 0, enabled: true },
                        { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
                        { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
                    ];
                    renderItems();
                    syncPreview();
                    if (openDoc.preview) togglePreview(moduleId, true);
                    return;
                }
            }
        } catch (e) { /* ignore */ }
        // Load existing waybill if ID in URL
        const id = getQueryParam("id");
        if (!id) {
            // Start with three rows: first enabled, next two are placeholders
            state.items = [
                { description: "", quantity: 0, unit_price: 0, total: 0, enabled: true },
                { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
                { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
            ];
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
            state.items = receivedItems.length ? receivedItems : [];
            renderItems();
            syncPreview();
        } catch (error) {
            console.error("Failed to load waybill", error);
            showToast("Could not load waybill details", "error");
            // Fallback to three placeholders
            state.items = [
                { description: "", quantity: 0, unit_price: 0, total: 0, enabled: true },
                { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
                { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
            ];
            renderItems();
            syncPreview();
        }
    }

    function attachEventListeners() {
        // Attach event listeners
        console.log('[Waybill] Attaching event listeners...');
        console.log('[Waybill] Elements:', {
            itemsTableBody: elements.itemsTableBody,
            addItemBtn: elements.addItemBtn,
            saveBtn: elements.saveBtn,
            submitBtn: elements.submitBtn,
        });
        
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
                elements.itemsPayload.value = JSON.stringify(serializeWaybillItems());
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
            console.log('[Waybill] Add Item button clicked');
            // Enable the first placeholder row if present; otherwise append a new enabled row
            const placeholderIndex = (state.items || []).findIndex((it) => it && it.enabled === false);
            if (placeholderIndex !== -1) {
                state.items[placeholderIndex] = { description: "", quantity: 0, unit_price: 0, total: 0, enabled: true };
            } else {
                state.items.push({ description: "", quantity: 0, unit_price: 0, total: 0, enabled: true });
            }
            renderItems();
        });

        elements.previewToggleBtn?.addEventListener("click", () => {
            handlePreview();
        });

        elements.previewBackBtn?.addEventListener("click", () => {
            togglePreview(moduleId, false);
        });
        // Save waybill as .way document
        elements.saveBtn?.addEventListener("click", () => {
            console.log('[Waybill] Save button clicked');
            saveWaybillFile();
        });

        // Save draft to localStorage using Drafts API
        elements.saveDraftBtn?.addEventListener('click', async () => {
            try {
                showToast('Saving draft…', 'info');
                const totals = syncPreview() || computeWaybillTotals();
                const payload = buildWaybillDocumentPayload(totals);
                const metadata = {
                    bill_number: state.waybillNumber,
                    customer: inputs.customer?.value || '',
                    destination: inputs.destination?.value || '',
                };
                if (!window.Drafts || typeof window.Drafts.saveDraft !== 'function') {
                    showToast('Draft API not available', 'error');
                    return;
                }
                const res = await window.Drafts.saveDraft('waybill', payload, metadata, state.draftId);
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
            console.log('[Waybill] Submit (Download PDF) button clicked');
            handleSave();
        });

        // Preview buttons removed from markup; preview toggle disabled

        // Exit preview removed (no preview button in markup)

        // Live preview sync on form input
        form.addEventListener("input", () => {
            syncPreview();
        });
    }

    async function loadNextWaybillNumber() {
        // Generate a new SPQ waybill number for unsaved waybills
        console.log('[Waybill] Generating new SPQ waybill number');
        state.waybillNumber = generateSPQNumber();
        console.log('[Waybill] Generated waybill number:', state.waybillNumber);
        if (elements.number) {
            elements.number.textContent = state.waybillNumber;
            console.log('[Waybill] Set textContent on element');
        }
        setText(elements.previewNumberEls, state.waybillNumber);
    }

    async function incrementWaybillNumber() {
        // Generate a new SPQ waybill number after successful PDF download
        state.waybillNumber = generateSPQNumber();
        elements.number && (elements.number.textContent = state.waybillNumber);
        setText(elements.previewNumberEls, state.waybillNumber);
        console.log('[Waybill] Generated new waybill number for next document:', state.waybillNumber);
    }

    (async function init() {
        // Init function
        attachEventListeners();
        await loadNextWaybillNumber();  // Load the next number on page load
        await loadExistingWaybill();
    })();
    });
})();
