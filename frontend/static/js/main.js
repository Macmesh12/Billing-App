/* ============================================
   MAIN APPLICATION MODULE
   ============================================
   Core utilities and shared functionality for the Billing App.
   This module provides:
   - Navigation state management
   - Currency formatting utilities
   - Number parsing and validation
   - Preview/Edit mode toggling
   - Download format selection dialog
   ============================================ */

(() => {
    "use strict";

    // ============================================
    // NAVIGATION HIGHLIGHTING
    // ============================================
    // Automatically highlights the active navigation link based on current page
    document.addEventListener("DOMContentLoaded", () => {
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split("/").filter(Boolean).pop() || "index.html";
        
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
    // UTILITY HELPER FUNCTIONS
    // ============================================
    
    const helpers = {
        /**
         * Formats a numeric value as currency with proper locale formatting
         * @param {number|string} value - The value to format
         * @returns {string} Formatted currency string (e.g., "1,234.56")
         * @example
         * formatCurrency(1234.5) // Returns "1,234.50"
         */
        formatCurrency(value) {
            const number = Number(value || 0);
            return number.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        },

        /**
         * Safely parses a string or number value into a valid number
         * Handles comma-separated thousands and invalid inputs
         * @param {number|string} value - The value to parse
         * @returns {number} Parsed number or 0 if invalid
         * @example
         * parseNumber("1,234.56") // Returns 1234.56
         * parseNumber("invalid") // Returns 0
         */
        parseNumber(value) {
            const normalized = String(value || "0").replace(/,/g, "");
            const number = Number.parseFloat(normalized);
            return Number.isNaN(number) ? 0 : number;
        },

        /**
         * Toggles between edit and preview modes for a document module
         * Manages visibility of forms, preview sections, and action buttons
         * @param {string} moduleId - The ID of the module element to toggle
         * @param {boolean} isPreview - True to show preview, false to show edit mode
         * @example
         * togglePreview("invoice-module", true) // Shows preview mode
         */
        togglePreview(moduleId, isPreview) {
            const moduleEl = document.getElementById(moduleId);
            if (!moduleEl) return;
            
            const showPreview = Boolean(isPreview);
            moduleEl.classList.toggle("is-preview", showPreview);
            
            // Manage button visibility based on current mode
            const previewToggleBtn = moduleEl.querySelector('[id$="-preview-toggle"]');
            const exitPreviewBtn = moduleEl.querySelector('[id$="-exit-preview"]');
            const submitBtn = moduleEl.querySelector('[id$="-submit"]');
            
            if (showPreview) {
                // In preview mode: hide "Preview" button, show "Exit" and "Submit"
                previewToggleBtn?.setAttribute("hidden", "hidden");
                submitBtn?.removeAttribute("hidden");
                exitPreviewBtn?.removeAttribute("hidden");
            } else {
                // In edit mode: show "Preview" and "Submit", hide "Exit"
                previewToggleBtn?.removeAttribute("hidden");
                submitBtn?.removeAttribute("hidden");
                exitPreviewBtn?.setAttribute("hidden", "hidden");
            }
            
            // Toggle form visibility
            const form = moduleEl.querySelector("form.document-editable");
            if (form) {
                if (showPreview) {
                    form.setAttribute("hidden", "hidden");
                } else {
                    form.removeAttribute("hidden");
                }
            }
            
            // Toggle preview document visibility
            moduleEl.querySelectorAll(".document").forEach((doc) => {
                if (!doc.classList.contains("document-editable")) {
                    if (showPreview) {
                        doc.removeAttribute("hidden");
                    } else {
                        doc.setAttribute("hidden", "hidden");
                    }
                }
            });
        },
    };

    // ============================================
    // DOWNLOAD FORMAT DIALOG
    // ============================================
    // Singleton instance of the download format dialog
    let downloadFormatDialog;

    /**
     * Creates or returns the download format selection dialog
     * This dialog is created once and reused for all download operations
     * @returns {Object} Dialog element references (backdrop, buttons)
     * @private
     */
    function ensureDownloadFormatDialog() {
        // Return cached dialog if already created
        if (downloadFormatDialog) {
            return downloadFormatDialog;
        }

        // Create backdrop overlay
        const backdrop = document.createElement("div");
        backdrop.className = "download-format-backdrop is-hidden";
        backdrop.setAttribute("role", "presentation");
        backdrop.setAttribute("aria-hidden", "true");

        // Create dialog container
        const dialog = document.createElement("div");
        dialog.className = "download-format-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "download-format-title");

        // Dialog title
        const title = document.createElement("h3");
        title.id = "download-format-title";
        title.className = "download-format-title";
        title.textContent = "Choose download format";

        // Dialog description
        const description = document.createElement("p");
        description.className = "download-format-description";
        description.textContent = "Select PDF for printing or JPEG for sharing.";

        // Actions container
        const actions = document.createElement("div");
        actions.className = "download-format-actions";

        // PDF download button
        const pdfButton = document.createElement("button");
        pdfButton.type = "button";
        pdfButton.className = "button download-format-button";
        pdfButton.textContent = "Download PDF";

        // JPEG download button
        const jpegButton = document.createElement("button");
        jpegButton.type = "button";
        jpegButton.className = "button button-secondary download-format-button";
        jpegButton.textContent = "Download JPEG";

        // Cancel button
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "download-format-cancel";
        cancelButton.textContent = "Cancel";

        // Assemble dialog structure
        actions.append(pdfButton, jpegButton);
        dialog.append(title, description, actions, cancelButton);
        backdrop.append(dialog);
        document.body.appendChild(backdrop);

        // Cache dialog references
        downloadFormatDialog = {
            backdrop,
            pdfButton,
            jpegButton,
            cancelButton,
        };
        return downloadFormatDialog;
    }

    /**
     * Displays a modal dialog for selecting download format (PDF or JPEG)
     * Returns a promise that resolves with the selected format or null if cancelled
     * @returns {Promise<string|null>} "pdf", "jpeg", or null if cancelled
     * @example
     * const format = await chooseDownloadFormat();
     * if (format) {
     *   // User selected a format
     *   downloadDocument(format);
     * } else {
     *   // User cancelled
     * }
     */
    helpers.chooseDownloadFormat = function chooseDownloadFormat() {
        // Remember the element that triggered the dialog for focus restoration
        const trigger = document.activeElement;
        const dialogRefs = ensureDownloadFormatDialog();
        const { backdrop, pdfButton, jpegButton, cancelButton } = dialogRefs;

        return new Promise((resolve) => {
            /**
             * Closes the dialog and resolves the promise
             * @param {string|null} result - Selected format or null
             */
            function close(result) {
                // Clean up event listeners
                pdfButton.removeEventListener("click", onPdf);
                jpegButton.removeEventListener("click", onJpeg);
                cancelButton.removeEventListener("click", onCancel);
                backdrop.removeEventListener("click", onBackdrop);
                document.removeEventListener("keydown", onKeydown);
                
                // Hide dialog
                backdrop.classList.add("is-hidden");
                backdrop.setAttribute("aria-hidden", "true");
                
                // Restore focus to trigger element
                if (trigger && typeof trigger.focus === "function") {
                    setTimeout(() => trigger.focus(), 0);
                }
                
                resolve(result);
            }

            /**
             * Handler for PDF button click
             */
            function onPdf(event) {
                event.preventDefault();
                event.stopPropagation();
                close("pdf");
            }

            /**
             * Handler for JPEG button click
             */
            function onJpeg(event) {
                event.preventDefault();
                event.stopPropagation();
                close("jpeg");
            }

            /**
             * Handler for Cancel button click
             */
            function onCancel(event) {
                event.preventDefault();
                event.stopPropagation();
                close(null);
            }

            /**
             * Handler for backdrop click (closes dialog)
             */
            function onBackdrop(event) {
                if (event.target === backdrop) {
                    close(null);
                }
            }

            /**
             * Handler for Escape key press
             */
            function onKeydown(event) {
                if (event.key === "Escape") {
                    event.preventDefault();
                    close(null);
                }
            }

            // Attach event listeners
            pdfButton.addEventListener("click", onPdf);
            jpegButton.addEventListener("click", onJpeg);
            cancelButton.addEventListener("click", onCancel);
            backdrop.addEventListener("click", onBackdrop);
            document.addEventListener("keydown", onKeydown);

            // Show dialog and focus PDF button
            backdrop.classList.remove("is-hidden");
            backdrop.setAttribute("aria-hidden", "false");
            pdfButton.focus({ preventScroll: true });
        });
    };

    // ============================================
    // GLOBAL EXPORT
    // ============================================
    // Expose helper functions globally for use by other modules
    window.BillingApp = helpers;
})();
