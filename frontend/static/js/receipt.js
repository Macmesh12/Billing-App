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
        previewNumber: document.getElementById("receipt-preview-number"),
        previewDate: document.getElementById("receipt-preview-date"),
        previewReceivedFrom: document.getElementById("receipt-preview-received-from"),
        previewAmount: document.getElementById("receipt-preview-amount"),
        previewPaymentMethod: document.getElementById("receipt-preview-payment-method"),
        previewDescription: document.getElementById("receipt-preview-description"),
        previewApprovedBy: document.getElementById("receipt-preview-approved-by"),
    };

    const inputs = {
        // Input elements object
        receivedFrom: document.getElementById("receipt-received-from"),
        amount: document.getElementById("receipt-amount"),
        paymentMethod: document.getElementById("receipt-payment-method"),
        description: document.getElementById("receipt-description"),
        approvedBy: document.getElementById("receipt-approved-by"),
        issueDate: document.getElementById("receipt-issue-date"),
    };

    const state = {
        // State object
        receiptId: null,
        receiptNumber: "REC-NEW",
        isSaving: false,
    };

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
        elements.previewNumber && (elements.previewNumber.textContent = state.receiptNumber);
        elements.previewDate && (elements.previewDate.textContent = inputs.issueDate?.value || "—");
        elements.previewReceivedFrom && (elements.previewReceivedFrom.textContent = inputs.receivedFrom?.value || "—");
        elements.previewAmount && (elements.previewAmount.textContent = formatCurrency(inputs.amount?.value || 0));
        elements.previewPaymentMethod && (elements.previewPaymentMethod.textContent = inputs.paymentMethod?.value || "—");
        elements.previewDescription && (elements.previewDescription.textContent = inputs.description?.value || "—");
        elements.previewApprovedBy && (elements.previewApprovedBy.textContent = inputs.approvedBy?.value || "—");
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
                elements.previewNumber && (elements.previewNumber.textContent = state.receiptNumber);
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
            elements.previewNumber && (elements.previewNumber.textContent = state.receiptNumber);
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
    }

    (async function init() {
        // Init function
        attachEventListeners();
        await loadExistingReceipt();
        syncPreview();
    })();
})();
