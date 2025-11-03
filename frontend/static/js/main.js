/* ============================================
   MAIN APPLICATION LOGIC
   ============================================
   This file provides core functionality used across all modules:
   - Navigation link activation
   - Currency and number formatting utilities
   - Preview mode toggling
   - Download format selection dialog
   - Quantity formatting helper
   
   Exported via window.BillingApp for use by other modules.
   ============================================ */

// IIFE to encapsulate main application logic
(() => {
    // ============================================
    // NAVIGATION SETUP
    // ============================================
    
    document.addEventListener("DOMContentLoaded", () => {
        // Highlight the current page in navigation
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split("/").filter(Boolean).pop() || "index.html";
        
        document.querySelectorAll(".app-nav .nav-link").forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;
            
            // Normalize href by removing leading ./
            const normalizedHref = href.replace(/^\.\//, "");
            
            // Mark active link
            if (normalizedHref === currentFile || (currentFile === "index.html" && normalizedHref === "/")) {
                link.classList.add("active");
            }
        });
    });

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    // Object containing utility helper functions exported globally
    const helpers = {
        /**
         * Format a number as currency with 2 decimal places
         * @param {number|string} value - Value to format
         * @returns {string} Formatted currency string (e.g., "1,234.56")
         */
        formatCurrency(value) {
            const number = Number(value || 0);
            return number.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        },
        
        /**
         * Parse a string to a number, handling commas
         * @param {string|number} value - Value to parse
         * @returns {number} Parsed number, or 0 if invalid
         */
        parseNumber(value) {
            const normalized = String(value || "0").replace(/,/g, "");
            const number = Number.parseFloat(normalized);
            return Number.isNaN(number) ? 0 : number;
        },
        
        /**
         * Toggle between edit and preview modes for a document module
         * @param {string} moduleId - ID of the module element
         * @param {boolean} isPreview - True to show preview, false to show edit mode
         */
        togglePreview(moduleId, isPreview) {
            const moduleEl = document.getElementById(moduleId);
            if (!moduleEl) return;
            
            const showPreview = Boolean(isPreview);
            moduleEl.classList.toggle("is-preview", showPreview);
            
            // Toggle action buttons visibility
            const previewToggleBtn = moduleEl.querySelector('[id$="-preview-toggle"]');
            const exitPreviewBtn = moduleEl.querySelector('[id$="-exit-preview"]');
            const submitBtn = moduleEl.querySelector('[id$="-submit"]');
            
            if (showPreview) {
                previewToggleBtn?.setAttribute("hidden", "hidden");
                submitBtn?.removeAttribute("hidden");
                exitPreviewBtn?.removeAttribute("hidden");
            } else {
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
    
    let downloadFormatDialog; // Cached dialog elements

    /**
     * Create or get the download format selection dialog
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
     * Show a modal dialog to choose download format (PDF or JPEG)
     * @returns {Promise<string|null>} Promise that resolves to "pdf", "jpeg", or null (cancelled)
     */
    helpers.chooseDownloadFormat = function chooseDownloadFormat() {
        const trigger = document.activeElement; // Remember element that triggered the dialog
        const dialogRefs = ensureDownloadFormatDialog();
        const { backdrop, pdfButton, jpegButton, cancelButton } = dialogRefs;

        return new Promise((resolve) => {
            /**
             * Close the dialog and resolve with result
             * @param {string|null} result - Selected format or null
             */
            function close(result) {
                // Remove all event listeners
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

            // Event handler for PDF button
            function onPdf(event) {
                event.preventDefault();
                event.stopPropagation();
                close("pdf");
            }

            // Event handler for JPEG button
            function onJpeg(event) {
                event.preventDefault();
                event.stopPropagation();
                close("jpeg");
            }

            // Event handler for cancel button
            function onCancel(event) {
                event.preventDefault();
                event.stopPropagation();
                close(null);
            }

            // Event handler for clicking backdrop (outside dialog)
            function onBackdrop(event) {
                if (event.target === backdrop) {
                    close(null);
                }
            }

            // Event handler for keyboard shortcuts
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

    window.BillingApp = helpers;
    // Expose helpers globally
})();
