(function () {
    const helpers = window.BillingApp || {};
    const togglePreview = typeof helpers.togglePreview === "function" ? helpers.togglePreview : () => {};
    const moduleId = "receipt-module";
    const form = document.getElementById("receipt-form");
    if (!form) return;

    const moduleEl = document.getElementById(moduleId);
    const previewToggleBtn = document.getElementById("receipt-preview-toggle");

    if (previewToggleBtn) {
        previewToggleBtn.addEventListener("click", () => {
            togglePreview(moduleId, true);
        });
    }

    if (moduleEl) {
        moduleEl.addEventListener("click", (event) => {
            if (event.target.matches("[data-exit-preview]")) {
                event.preventDefault();
                togglePreview(moduleId, false);
            }
        });
    }
})();
