(function () {
    // IIFE for receipt module
    const helpers = window.BillingApp || {};
    // Get global helpers
    const togglePreview = typeof helpers.togglePreview === "function" ? helpers.togglePreview : () => {};
    // Fallback for togglePreview
    const formatCurrency = typeof helpers.formatCurrency === "function" ? helpers.formatCurrency : (value) => Number(value || 0).toFixed(2);
    // Fallback for formatCurrency

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
        submitBtn: document.getElementById("receipt-submit"),
        toast: document.getElementById("receipt-toast"),
        number: document.getElementById("receipt-number"),
        previewNumberEls: document.querySelectorAll(".js-receipt-preview-number"),
        previewDateEls: document.querySelectorAll(".js-receipt-preview-date"),
        previewLocationEls: document.querySelectorAll(".js-receipt-preview-location"),
        previewCompanyNameEls: document.querySelectorAll(".js-receipt-preview-company-name"),
        previewCompanyTaglineEls: document.querySelectorAll(".js-receipt-preview-company-tagline"),
        previewReceivedFromEls: document.querySelectorAll(".js-receipt-preview-received-from"),
        previewAmountEls: document.querySelectorAll(".js-receipt-preview-amount"),
        previewPaymentMethodEls: document.querySelectorAll(".js-receipt-preview-payment-method"),
        previewDescriptionEls: document.querySelectorAll(".js-receipt-preview-description"),
        previewApprovedByEls: document.querySelectorAll(".js-receipt-preview-approved-by"),
        previewContactEls: document.querySelectorAll(".js-receipt-preview-contact"),
        previewTotalAmountEls: document.querySelectorAll(".js-receipt-preview-total-amount"),
        previewBalanceEls: document.querySelectorAll(".js-receipt-preview-balance"),
    };

    const inputs = {
        // Input elements object
        receivedFrom: document.getElementById("receipt-received-from"),
        amount: document.getElementById("receipt-amount"),
        paymentMethod: document.getElementById("receipt-payment-method"),
        description: document.getElementById("receipt-description"),
        approvedBy: document.getElementById("receipt-approved-by"),
        issueDate: document.getElementById("receipt-issue-date"),
        companyName: document.getElementById("receipt-company-name"),
        companyTagline: document.getElementById("receipt-company-tagline"),
        location: document.getElementById("receipt-location"),
        totalAmount: document.getElementById("receipt-total-amount"),
        balance: document.getElementById("receipt-balance"),
        contact: document.getElementById("receipt-contact"),
    };

    const state = {
        // State object
        receiptId: null,
        receiptNumber: "REC-NEW",
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

    function buildPayload() {
        // Build payload from inputs
        return {
            received_from: inputs.receivedFrom?.value || "",
            amount: inputs.amount?.value || "",
            payment_method: inputs.paymentMethod?.value || "",
            description: inputs.description?.value || "",
            approved_by: inputs.approvedBy?.value || "",
            issue_date: inputs.issueDate?.value || "",
        };
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

    function syncPreview() {
        // Sync preview with form data
        setText(elements.previewNumberEls, state.receiptNumber);
        const prettyDate = formatDisplayDate(inputs.issueDate?.value || "");
        setText(elements.previewDateEls, prettyDate);
        setText(elements.previewLocationEls, valueOrPlaceholder(inputs.location, "Accra, Ghana"));
        setText(elements.previewReceivedFromEls, inputs.receivedFrom?.value || "—");
        setText(elements.previewDescriptionEls, valueOrPlaceholder(inputs.description, "—"));
        const formattedAmount = `GH¢ ${formatCurrency(inputs.amount?.value || 0)}`;
        setText(elements.previewAmountEls, formattedAmount);
        setText(elements.previewPaymentMethodEls, valueOrPlaceholder(inputs.paymentMethod, "—"));
        setText(elements.previewCompanyNameEls, valueOrPlaceholder(inputs.companyName, "MULTIMEDI@"));
        setText(elements.previewCompanyTaglineEls, valueOrPlaceholder(inputs.companyTagline, "Creative Digital Studio"));
        setText(elements.previewApprovedByEls, valueOrPlaceholder(inputs.approvedBy, "—"));
        setText(elements.previewContactEls, valueOrPlaceholder(inputs.contact, "CONTACT: 0540 673202 | 050 532 1475 | 030 273 8719   WWW.SPAQUELSMULTIMEDIA.ORG   SPAQUELS@GMAIL.COM"));
        setText(elements.previewTotalAmountEls, valueOrPlaceholder(inputs.totalAmount, "GH¢ 31,000"));
        setText(elements.previewBalanceEls, valueOrPlaceholder(inputs.balance, "GH¢ 21,000"));
    }

    async function handlePreview() {
        // Handle preview toggle
        syncPreview();
        togglePreview(moduleId, true);
    }

    async function handleSave() {
        // Handle save/submit
        if (state.isSaving) return;
        state.isSaving = true;
        elements.submitBtn?.setAttribute("disabled", "disabled");
        try {
            const payload = buildPayload();
            const method = state.receiptId ? "PUT" : "POST";
            const path = state.receiptId ? `/receipts/api/${state.receiptId}/` : `/receipts/api/create/`;
            const result = await callApi(path, {
                method,
                body: JSON.stringify(payload),
            });
            if (result?.receipt_number) {
                state.receiptNumber = result.receipt_number;
                elements.number && (elements.number.textContent = state.receiptNumber);
                setText(elements.previewNumberEls, state.receiptNumber);
            }
            if (result?.id) {
                state.receiptId = result.id;
            }
            showToast("Receipt saved successfully.");
        } catch (error) {
            console.error(error);
            showToast(`Failed to save receipt: ${error.message}`, "error");
        } finally {
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

        elements.submitBtn?.addEventListener("click", () => {
            handleSave();
        });

        moduleEl.addEventListener("click", (event) => {
            if (event.target.matches("[data-exit-preview]")) {
                event.preventDefault();
                togglePreview(moduleId, false);
            }
        });

        // Live preview sync for a responsive feel
        form.addEventListener("input", () => {
            syncPreview();
        });
    }

    (async function init() {
        // Init function
        attachEventListeners();
        await loadExistingReceipt();
        syncPreview();
    })();
})();
