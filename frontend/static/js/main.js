/* ============================================
   MAIN APPLICATION MODULE
   ============================================
   This file provides global utilities and helpers used across
   all document modules (invoice, receipt, waybill).
   
   KEY FEATURES:
   - Navigation active state management
   - Currency and number formatting utilities
   - Preview mode toggle functionality
   - Download format selection dialog
   - Shared helper functions for all modules
   
   USAGE:
   All helpers are exposed via window.BillingApp and can be
   accessed by any module that needs them.
   ============================================ */

// IIFE (Immediately Invoked Function Expression) to encapsulate module logic
// This prevents polluting the global namespace except for BillingApp
(() => {
    // ============================================
    // NAVIGATION ACTIVE STATE
    // ============================================

    // Highlight the current page's navigation link
    document.addEventListener("DOMContentLoaded", () => {
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split("/").filter(Boolean).pop() || "index.html";
        
        // Mark the active navigation link
        document.querySelectorAll(".app-nav .nav-link").forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;
            
            const normalizedHref = href.replace(/^\.\//, "");
            if (normalizedHref === currentFile || (currentFile === "index.html" && normalizedHref === "/")) {
                link.classList.add("active");
            }
        });
    });

    // ============================================
    // GLOBAL HELPER FUNCTIONS
    // ============================================

    // Object containing utility helper functions used by all modules
    const helpers = {
        /**
         * Format a number as currency with 2 decimal places
         * Uses locale-aware formatting with thousands separators
         * @param {number|string} value - Value to format
         * @returns {string} Formatted currency string (e.g., "1,234.56")
         */
        formatCurrency(value) {
            const number = Number(value || 0);
            // Convert to number
            return number.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
            // Return formatted string
        },
        /**
         * Parse a value to a number safely
         * Removes commas and converts to number, defaulting to 0 on failure
         * @param {any} value - Value to parse
         * @returns {number} Parsed number or 0
         */
        parseNumber(value) {
            const normalized = String(value || "0").replace(/,/g, "");
            const number = Number.parseFloat(normalized);
            return Number.isNaN(number) ? 0 : number;
        },

        /**
         * Toggle between edit and preview modes for a module
         * Controls visibility of form and preview elements
         * @param {string} moduleId - ID of the module element
         * @param {boolean} isPreview - True to show preview, false to show edit
         */
        togglePreview(moduleId, isPreview) {
            const moduleEl = document.getElementById(moduleId);
            if (!moduleEl) return;
            
            const showPreview = Boolean(isPreview);
            moduleEl.classList.toggle("is-preview", showPreview);
            
            // Toggle action buttons visibility based on mode
            const previewToggleBtn = moduleEl.querySelector('[id$="-preview-toggle"]');
            const exitPreviewBtn = moduleEl.querySelector('[id$="-exit-preview"]');
            const submitBtn = moduleEl.querySelector('[id$="-submit"]');
            
            if (showPreview) {
                // Preview mode: Hide preview button, show download and exit
                previewToggleBtn?.setAttribute("hidden", "hidden");
                submitBtn?.removeAttribute("hidden");
                exitPreviewBtn?.removeAttribute("hidden");
            } else {
                // Edit mode: Show preview button, hide exit
                previewToggleBtn?.removeAttribute("hidden");
                submitBtn?.removeAttribute("hidden");
                exitPreviewBtn?.setAttribute("hidden", "hidden");
            }
            
            // Toggle form visibility
            const form = moduleEl.querySelector("form.document-editable");
            if (form) {
                if (showPreview) {
                    form.setAttribute("hidden", "hidden"); // Hide form in preview
                } else {
                    form.removeAttribute("hidden"); // Show form in edit
                }
            }
            
            // Toggle preview document visibility
            moduleEl.querySelectorAll(".document").forEach((doc) => {
                if (!doc.classList.contains("document-editable")) {
                    if (showPreview) {
                        doc.removeAttribute("hidden"); // Show preview documents
                    } else {
                        doc.setAttribute("hidden", "hidden"); // Hide preview documents
                    }
                }
            });
        },
    };

    // ============================================
    // DOWNLOAD FORMAT DIALOG
    // ============================================

    // Singleton reference to the format selection dialog
    let downloadFormatDialog;

    /**
     * Create or return the download format dialog
     * Lazy-loads the dialog on first use
     * @returns {Object} Object with dialog element references
     */
    function ensureDownloadFormatDialog() {
        if (downloadFormatDialog) {
            return downloadFormatDialog;
        }

        const backdrop = document.createElement("div");
        backdrop.className = "download-format-backdrop is-hidden";
    backdrop.setAttribute("role", "presentation");
    backdrop.setAttribute("aria-hidden", "true");

        const dialog = document.createElement("div");
        dialog.className = "download-format-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "download-format-title");

        const title = document.createElement("h3");
        title.id = "download-format-title";
        title.className = "download-format-title";
        title.textContent = "Choose download format";

        const description = document.createElement("p");
        description.className = "download-format-description";
        description.textContent = "Select PDF for printing or JPEG for sharing.";

        const actions = document.createElement("div");
        actions.className = "download-format-actions";

        const pdfButton = document.createElement("button");
        pdfButton.type = "button";
        pdfButton.className = "button download-format-button";
        pdfButton.textContent = "Download PDF";

        const jpegButton = document.createElement("button");
        jpegButton.type = "button";
        jpegButton.className = "button button-secondary download-format-button";
        jpegButton.textContent = "Download JPEG";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "download-format-cancel";
        cancelButton.textContent = "Cancel";

        actions.append(pdfButton, jpegButton);
        dialog.append(title, description, actions, cancelButton);
        backdrop.append(dialog);
        document.body.appendChild(backdrop);

        downloadFormatDialog = {
            backdrop,
            pdfButton,
            jpegButton,
            cancelButton,
        };
        return downloadFormatDialog;
    }

    /**
     * Show format selection dialog and wait for user choice
     * Returns a promise that resolves with chosen format or null on cancel
     * @returns {Promise<string|null>} "pdf", "jpeg", or null if cancelled
     */
    helpers.chooseDownloadFormat = function chooseDownloadFormat() {
        const trigger = document.activeElement;
        const dialogRefs = ensureDownloadFormatDialog();
        const { backdrop, pdfButton, jpegButton, cancelButton } = dialogRefs;

        return new Promise((resolve) => {
            function close(result) {
                pdfButton.removeEventListener("click", onPdf);
                jpegButton.removeEventListener("click", onJpeg);
                cancelButton.removeEventListener("click", onCancel);
                backdrop.removeEventListener("click", onBackdrop);
                document.removeEventListener("keydown", onKeydown);
                backdrop.classList.add("is-hidden");
                backdrop.setAttribute("aria-hidden", "true");
                if (trigger && typeof trigger.focus === "function") {
                    setTimeout(() => trigger.focus(), 0);
                }
                resolve(result);
            }

            function onPdf(event) {
                event.preventDefault();
                event.stopPropagation();
                close("pdf");
            }

            function onJpeg(event) {
                event.preventDefault();
                event.stopPropagation();
                close("jpeg");
            }

            function onCancel(event) {
                event.preventDefault();
                event.stopPropagation();
                close(null);
            }

            function onBackdrop(event) {
                if (event.target === backdrop) {
                    close(null);
                }
            }

            function onKeydown(event) {
                if (event.key === "Escape") {
                    event.preventDefault();
                    close(null);
                }
            }

            pdfButton.addEventListener("click", onPdf);
            jpegButton.addEventListener("click", onJpeg);
            cancelButton.addEventListener("click", onCancel);
            backdrop.addEventListener("click", onBackdrop);
            document.addEventListener("keydown", onKeydown);

            backdrop.classList.remove("is-hidden");
            backdrop.setAttribute("aria-hidden", "false");
            pdfButton.focus({ preventScroll: true });
        });
    };

    // ============================================
    // GLOBAL EXPORT
    // ============================================

    // Expose helpers globally so all modules can access them
    window.BillingApp = helpers;
})();
