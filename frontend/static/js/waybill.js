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
        exitPreviewBtn: document.getElementById("waybill-exit-preview"),
    submitBtn: document.getElementById("waybill-submit"),
    saveBtn: document.getElementById("waybill-save"),
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
        waybillNumber: "",
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

    function computeWaybillTotals() {
        let totalQuantity = 0;
        let subtotal = 0;
        state.items.forEach((item) => {
            if (!item) return;
            totalQuantity += parseNumber(item.quantity);
            subtotal += parseNumber(item.total);
        });
        return {
            total_quantity: totalQuantity,
            subtotal,
        };
    }

    function serializeWaybillItems() {
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
        return computeWaybillTotals();
    }

    async function handlePreview() {
        // Handle preview toggle
        console.log('[Waybill] handlePreview() called');
        syncPreview();
        togglePreview(moduleId, true);
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
        
        const previewEl = document.getElementById("waybill-preview");
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

            const A4_PX_WIDTH = 794;
            const A4_PX_HEIGHT = 1122;
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
                
                // Get PDF as Uint8Array and write to file
                const pdfData = pdf.output("arraybuffer");
                const uint8Array = new Uint8Array(pdfData);
                await fs.writeBinaryFile({ path: savePath, contents: uint8Array });
                showToast("PDF saved successfully!");
            } else {
                // Browser: Direct download
                pdf.save(filename);
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
        console.log('[Waybill] Attaching event listeners...');
        console.log('[Waybill] Elements:', {
            itemsTableBody: elements.itemsTableBody,
            addItemBtn: elements.addItemBtn,
            previewToggleBtn: elements.previewToggleBtn,
            saveBtn: elements.saveBtn,
            submitBtn: elements.submitBtn,
            exitPreviewBtn: elements.exitPreviewBtn
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
            console.log('[Waybill] Add Item button clicked');
            if (state.items.length >= 10) {
                showToast("Maximum 10 items allowed", "error");
                return;
            }
            state.items.push({ description: "", quantity: 0, unit_price: 0, total: 0 });
            renderItems();
        });

        elements.previewToggleBtn?.addEventListener("click", () => {
            console.log('[Waybill] Preview Toggle button clicked');
            handlePreview();
        });
        // Save waybill as .way document
        elements.saveBtn?.addEventListener("click", () => {
            console.log('[Waybill] Save button clicked');
            saveWaybillFile();
        });

        elements.submitBtn?.addEventListener("click", () => {
            console.log('[Waybill] Submit (Download PDF) button clicked');
            handleSave();
        });

        elements.exitPreviewBtn?.addEventListener("click", () => {
            console.log('[Waybill] Exit Preview button clicked');
            togglePreview(moduleId, false);
        });

        // Live preview sync on form input
        form.addEventListener("input", () => {
            syncPreview();
        });
    }

    async function loadNextWaybillNumber() {
        // Load the next waybill number from the counter API
        console.log('[Waybill] Loading next waybill number from:', `${API_BASE}/api/counter/waybill/next/`);
        console.log('[Waybill] elements.number element:', elements.number);
        try {
            const response = await fetch(`${API_BASE}/api/counter/waybill/next/`);
            console.log('[Waybill] API response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('[Waybill] API response data:', data);
                state.waybillNumber = data.next_number;
                console.log('[Waybill] Setting waybill number to:', state.waybillNumber);
                if (elements.number) {
                    elements.number.textContent = state.waybillNumber;
                    console.log('[Waybill] Set textContent on element');
                } else {
                    console.warn('[Waybill] elements.number is null or undefined');
                }
                setText(elements.previewNumberEls, state.waybillNumber);
            } else {
                console.warn('[Waybill] API response not ok:', response.status, response.statusText);
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
    });
})();
