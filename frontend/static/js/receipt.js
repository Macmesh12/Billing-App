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
    // IIFE for receipt module
    const helpers = window.BillingApp || {};
    // Get global helpers
    const togglePreview = typeof helpers.togglePreview === "function" ? helpers.togglePreview : () => {};
    // Fallback for togglePreview
    const formatCurrency = typeof helpers.formatCurrency === "function" ? helpers.formatCurrency : (value) => Number(value || 0).toFixed(2);
    // Fallback for formatCurrency

    console.log('[Receipt] receipt.js loaded and DOM ready');
    const moduleId = "receipt-module";
    // Module ID
    const moduleEl = document.getElementById(moduleId);
    console.log('[Receipt] moduleEl:', moduleEl);
    // Module element
    const form = document.getElementById("receipt-form");
    console.log('[Receipt] form:', form);
    // Form element
    if (!moduleEl || !form) {
        console.error('[Receipt] Missing required elements! moduleEl:', moduleEl, 'form:', form);
        return;
    }
    console.log('[Receipt] All required elements found, continuing initialization...');
    // Exit if elements not found

    const config = window.BILLING_APP_CONFIG || {};
    // Global config
    const API_BASE = config.apiBaseUrl || (window.location ? window.location.origin : "http://127.0.0.1:8765");
    // API base URL

    const elements = {
        // DOM elements object
        previewToggleBtn: document.getElementById("receipt-preview-toggle"),
        previewBackBtn: document.getElementById("receipt-back-to-edit"),
        
        submitBtn: document.getElementById("receipt-submit"),
    saveBtn: document.getElementById("receipt-save"),
    saveDraftBtn: document.getElementById("receipt-save-draft"),
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
        previewIssuedByEls: document.querySelectorAll(".js-receipt-preview-issued-by"),
        previewApprovedByEls: document.querySelectorAll(".js-receipt-preview-approved-by"),
        previewTotalAmountEls: document.querySelectorAll(".js-receipt-preview-total-amount"),
        previewBalanceEls: document.querySelectorAll(".js-receipt-preview-balance"),
    };

    const inputs = {
        // Input elements object
        receivedFrom: document.getElementById("receipt-received-from"),
        customerName: document.getElementById("receipt-customer-name"),
        issuedBy: document.getElementById("receipt-issued-by"),
        approvedBy: document.getElementById("receipt-approved-by"),
        issueDate: document.getElementById("receipt-issue-date"),
        amountPaid: document.getElementById("receipt-amount-paid"),
        paymentMethod: document.getElementById("receipt-payment-method"),
    };

    const displays = {
        totalDisplay: document.getElementById("receipt-total-display"),
        balanceDisplay: document.getElementById("receipt-balance-display"),
    };

    // Helper function to generate SPQ + 2 uppercase letters + 4 digits
    function generateSPQNumber() {
        const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
        const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
        return `SPQ${letters}${digits}`;
    }

    const state = {
        // State object
        receiptId: null,
        receiptNumber: generateSPQNumber(),
        draftId: null,
        isSaving: false,
        items: [
            { description: "", quantity: 0, unit_price: 0, total: 0, enabled: true },
            { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
            { description: "", quantity: 0, unit_price: 0, total: 0, enabled: false },
        ],
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
        // Only include enabled items (placeholders have enabled === false)
        const total = (state.items || [])
            .filter((item) => item && item.enabled !== false)
            .reduce((sum, item) => sum + (Number(item.total) || 0), 0);
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
        // Render only the actual items in the table; don't show placeholder rows by default.
        const tbody = elements.itemsTable?.querySelector("tbody");
        if (!tbody) return;

        tbody.innerHTML = "";

        // Render one row per item in state.items
        state.items.forEach((item, index) => {
            if (item && item.enabled === false) {
                const placeholder = document.createElement('tr');
                placeholder.className = 'item-placeholder';
                placeholder.innerHTML = `
                    <td class="placeholder-cell">&nbsp;</td>
                    <td class="placeholder-cell">&nbsp;</td>
                    <td class="placeholder-cell">&nbsp;</td>
                    <td class="total-cell">&nbsp;</td>
                    <td></td>
                `;
                tbody.appendChild(placeholder);
                return;
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><input type="text" value="${item.description || ""}" data-index="${index}" data-field="description" placeholder="Item description"></td>
                <td><input type="number" value="${item.quantity || 0}" data-index="${index}" data-field="quantity" min="0" step="1"></td>
                <td><input type="number" value="${item.unit_price || 0}" data-index="${index}" data-field="unit_price" min="0" step="0.01"></td>
                <td class="total-cell">${formatCurrency(item.total || 0)}</td>
                <td><button type="button" class="button-icon" data-remove="${index}" title="Remove item">×</button></td>
            `;
            tbody.appendChild(row);
        });

        calculateTotals();
        renderPreviewItems();
    }

    function renderPreviewItems() {
        // Render only existing (enabled) items in preview
        if (!elements.previewRows) return;

        elements.previewRows.innerHTML = "";
        state.items.forEach((item) => {
            if (!item || item.enabled === false) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                `;
                elements.previewRows.appendChild(row);
                return;
            }
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.description || "—"}</td>
                <td>${item.quantity || 0}</td>
                <td>${formatCurrency(item.unit_price || 0)}</td>
                <td>${formatCurrency(item.total || 0)}</td>
            `;
            elements.previewRows.appendChild(row);
        });
    }

    function serializeReceiptItems() {
        return (state.items || [])
            .filter((item) => item && item.enabled !== false)
            .filter((item) => {
                const description = (item.description || "").trim();
                const quantity = Number(item.quantity) || 0;
                const price = Number(item.unit_price) || 0;
                const total = Number(item.total) || 0;
                return description || quantity || price || total;
            })
            .map((item) => ({
                description: item.description || "",
                quantity: Number(item.quantity) || 0,
                unit_price: Number(item.unit_price) || 0,
                total: Number(item.total) || 0,
            }));
    }

    function buildReceiptDocumentPayload(totals) {
        const safeTotals = totals || calculateTotals();
        return {
            receipt_number: state.receiptNumber,
            issue_date: inputs.issueDate?.value || "",
            received_from: inputs.receivedFrom?.value || "",
            customer_name: inputs.customerName?.value || "",
            approved_by: inputs.approvedBy?.value || "",
            payment_method: inputs.paymentMethod?.value || "",
            amount_paid: Number(inputs.amountPaid?.value || 0),
            items: serializeReceiptItems(),
            totals: {
                total_amount: Number(safeTotals.total || 0),
                amount_paid: Number(safeTotals.amountPaid || 0),
                balance: Number(safeTotals.balance || 0),
            },
        };
    }

    function syncPreview() {
        // Sync preview with form data
        setText(elements.previewNumberEls, state.receiptNumber);
        const prettyDate = formatDisplayDate(inputs.issueDate?.value || "");
        setText(elements.previewDateEls, prettyDate);
        setText(elements.previewReceivedFromEls, inputs.receivedFrom?.value || "—");
        setText(elements.previewCustomerNameEls, inputs.customerName?.value || "—");
        setText(elements.previewIssuedByEls, inputs.issuedBy?.value || "—");
        setText(elements.previewApprovedByEls, inputs.approvedBy?.value || "—");
        
        const amountPaid = Number(inputs.amountPaid?.value) || 0;
        const paymentMethod = inputs.paymentMethod?.value || "—";
        setText(elements.previewAmountEls, `GH₵ ${formatCurrency(amountPaid)}`);
        setText(elements.previewPaymentMethodEls, paymentMethod);
        
        const totals = calculateTotals();
        setText(elements.previewTotalAmountEls, `GH₵ ${formatCurrency(totals.total)}`);
        setText(elements.previewBalanceEls, `GH₵ ${formatCurrency(totals.balance)}`);
        
        renderPreviewItems();
        return totals;
    }

    async function handlePreview() {
        // Handle preview toggle
        syncPreview();
        // Use in-place preview (togglePreview). The module has already synced the preview
        try {
            togglePreview(moduleId, true);
            return;
        } catch (err) {
            console.error('Failed to toggle in-place preview', err);
        }
    }

    async function downloadReceiptPdf() {
        // Download receipt as PDF
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
        const docEl = (moduleEl && moduleEl.querySelector('.module-preview')) || moduleEl.querySelector('.document') || document.getElementById("receipt-form");
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

        let filename = state.receiptNumber || "receipt";
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
        if (state.isSaving) return;
        state.isSaving = true;
        elements.submitBtn?.setAttribute("disabled", "disabled");

        try {
            await downloadReceiptPdf();
            // Increment the counter after successful PDF download
            await incrementReceiptNumber();
        } finally {
            state.isSaving = false;
            elements.submitBtn?.removeAttribute("disabled");
        }
    }

    async function saveReceiptFile() {
        if (state.isSaving) return;
        if (typeof helpers.saveDocument !== "function") {
            showToast("Save helper unavailable.", "error");
            return;
        }
        state.isSaving = true;
        elements.saveBtn?.setAttribute("disabled", "disabled");
        elements.submitBtn?.setAttribute("disabled", "disabled");

        try {
            showToast("Saving receipt…", "info");
            const totals = syncPreview() || calculateTotals();
            const payload = buildReceiptDocumentPayload(totals);
            const metadata = {
                number: state.receiptNumber,
                customer: inputs.customerName?.value || "",
                amount_paid: Number(totals?.amountPaid || 0),
                issue_date: inputs.issueDate?.value || "",
            };
            const result = await helpers.saveDocument({
                type: "receipt",
                defaultName: state.receiptNumber || "receipt",
                data: payload,
                metadata,
            });
            if (result?.cancelled) {
                showToast("Receipt save cancelled.", "info");
                return;
            }
            showToast("Receipt saved.", "success");
            try {
                if (window.Customers && typeof window.Customers.add === 'function') {
                    window.Customers.add(inputs.customerName?.value || '');
                }
            } catch (e) { /* ignore */ }
            // Increment the counter after successful save
            await incrementReceiptNumber();
        } catch (error) {
            console.error(error);
            showToast("Failed to save receipt.", "error");
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

    async function loadExistingReceipt() {
        // Load existing receipt if ID in URL or if an openDocument was placed in sessionStorage
        try {
            const openDocJson = window.sessionStorage?.getItem('billingapp.openDocument');
            if (openDocJson) {
                window.sessionStorage?.removeItem('billingapp.openDocument');
                const openDoc = JSON.parse(openDocJson);
                if (openDoc.type === 'receipt' && openDoc.data) {
                    const data = openDoc.data;
                    state.receiptNumber = data.receipt_number || state.receiptNumber;
                    elements.number && (elements.number.textContent = state.receiptNumber);
                    setText(elements.previewNumberEls, state.receiptNumber);
                    if (inputs.receivedFrom) inputs.receivedFrom.value = data.received_from || "";
                    if (inputs.amountPaid) inputs.amountPaid.value = data.amount_paid || 0;
                    if (inputs.paymentMethod) inputs.paymentMethod.value = data.payment_method || "";
                    if (inputs.approvedBy) inputs.approvedBy.value = data.approved_by || "";
                    if (inputs.issueDate && data.issue_date) inputs.issueDate.value = data.issue_date;
                    if (inputs.customerName) inputs.customerName.value = data.customer_name || "";
                    state.items = Array.isArray(data.items) ? data.items : [];
                    renderItems();
                    syncPreview();
                    if (openDoc.preview) togglePreview(moduleId, true);
                    return;
                }
            }
        } catch (e) { /* ignore */ }
        // Load existing receipt if ID in URL
        const id = getQueryParam("id");
        if (!id) {
            // default to three rows: first enabled, next two placeholders
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
            const data = await callApi(`/receipts/api/${id}/`);
            state.receiptId = data.id;
            state.receiptNumber = data.receipt_number || state.receiptNumber;
            elements.number && (elements.number.textContent = state.receiptNumber);
            setText(elements.previewNumberEls, state.receiptNumber);
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

        elements.previewBackBtn?.addEventListener("click", () => {
            togglePreview(moduleId, false);
        });

        // Save receipt as .rec document
        elements.saveBtn?.addEventListener("click", () => {
            saveReceiptFile();
        });

        // Save draft to localStorage using Drafts API
        elements.saveDraftBtn?.addEventListener('click', async () => {
            try {
                showToast('Saving draft…', 'info');
                const totals = syncPreview() || calculateTotals();
                const payload = buildReceiptDocumentPayload(totals);
                const metadata = {
                    bill_number: state.receiptNumber,
                    customer: inputs.customerName?.value || '',
                    issue_date: inputs.issueDate?.value || '',
                };
                if (!window.Drafts || typeof window.Drafts.saveDraft !== 'function') {
                    showToast('Draft API not available', 'error');
                    return;
                }
                const res = await window.Drafts.saveDraft('receipt', payload, metadata, state.draftId);
                if (res && res.id) {
                    state.draftId = res.id;
                    showToast('Draft saved', 'success');
                } else {
                    showToast('Draft saved', 'success');
                }
                try {
                    if (window.Customers && typeof window.Customers.add === 'function') {
                        window.Customers.add(inputs.customerName?.value || '');
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

        // Preview button removed from markup; no-op

        // Exit preview button removed from markup; no-op

        elements.addItemBtn?.addEventListener("click", () => {
            // Enable the first placeholder row if present; otherwise append a new enabled row.
            const placeholderIndex = (state.items || []).findIndex((it) => it && it.enabled === false);
            if (placeholderIndex !== -1) {
                state.items[placeholderIndex] = { description: "", quantity: 0, unit_price: 0, total: 0, enabled: true };
            } else {
                state.items.push({ description: "", quantity: 0, unit_price: 0, total: 0, enabled: true });
            }
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

                // Calculate total for this row
                const qty = Number(state.items[index].quantity) || 0;
                const price = Number(state.items[index].unit_price) || 0;
                state.items[index].total = qty * price;

                // Update the total cell in-place to avoid re-rendering the whole table
                const rowEl = input.closest('tr');
                if (rowEl) {
                    const totalCell = rowEl.querySelector('.total-cell');
                    if (totalCell) totalCell.textContent = formatCurrency(state.items[index].total || 0);
                }

                // Recalculate totals and update preview rows without rebuilding input elements
                calculateTotals();
                renderPreviewItems();
            }
        });

        elements.itemsTable?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-remove]");
            if (!button) return;
            const index = Number(button.getAttribute("data-remove"));
            state.items.splice(index, 1);
            renderItems();
        });

        // Exit preview removed (no preview button in markup)

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
        // Generate a new SPQ receipt number for unsaved receipts
        console.log('[Receipt] Generating new SPQ receipt number');
        state.receiptNumber = generateSPQNumber();
        console.log('[Receipt] Generated receipt number:', state.receiptNumber);
        if (elements.number) {
            elements.number.textContent = state.receiptNumber;
            console.log('[Receipt] Set textContent on element');
        }
        setText(elements.previewNumberEls, state.receiptNumber);
    }

    async function incrementReceiptNumber() {
        // Generate a new SPQ receipt number after successful PDF download
        state.receiptNumber = generateSPQNumber();
        elements.number && (elements.number.textContent = state.receiptNumber);
        setText(elements.previewNumberEls, state.receiptNumber);
        console.log('[Receipt] Generated new receipt number for next document:', state.receiptNumber);
    }

    (async function init() {
        // Init function
        attachEventListeners();
        await loadNextReceiptNumber();  // Load the next number on page load
        await loadExistingReceipt();
        syncPreview();
    })();
    });
})();
