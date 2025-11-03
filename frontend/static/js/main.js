/* ============================================
   MAIN JAVASCRIPT - BILLING APP
   ============================================
   This file contains shared utilities and helpers used across
   all document modules (invoice, receipt, waybill).
   
   KEY FEATURES:
   - Active navigation link highlighting
   - Currency formatting utilities
   - Preview mode toggling for all document types
   - Download format selection dialog (PDF/JPEG)
   
   EXPOSED API:
   - window.BillingApp.formatCurrency(value)
   - window.BillingApp.parseNumber(value)
   - window.BillingApp.togglePreview(moduleId, isPreview)
   - window.BillingApp.chooseDownloadFormat()
   
   ARCHITECTURE:
   - IIFE pattern to avoid global namespace pollution
   - Exposes helpers via window.BillingApp for module access
   - Lazy initialization of download dialog
   ============================================ */

// IIFE (Immediately Invoked Function Expression) to encapsulate code
(() => {
    // ============================================
    // ACTIVE NAVIGATION LINK HIGHLIGHTING
    // ============================================
    // Automatically marks the current page's nav link as active
    document.addEventListener("DOMContentLoaded", () => {
        // Get current URL path
        const currentPath = window.location.pathname;
        
        // Extract file name from path (e.g., "/invoice.html" -> "invoice.html")
        const currentFile = currentPath.split("/").filter(Boolean).pop() || "index.html";
        
        // Loop through all navigation links
        document.querySelectorAll(".app-nav .nav-link").forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return; // Skip if no href
            
            // Normalize href by removing leading ./
            const normalizedHref = href.replace(/^\.\//, "");
            
            // Check if link matches current page (or root matches index.html)
            if (normalizedHref === currentFile || (currentFile === "index.html" && normalizedHref === "/")) {
                link.classList.add("active");
            }
        });
    });

    // ============================================
    // UTILITY HELPER FUNCTIONS
    // ============================================
    // Collection of reusable helper functions
    const helpers = {
        /**
         * Format a number as currency string with 2 decimal places
         * Example: 1234.5 -> "1,234.50"
         * 
         * @param {number|string} value - The value to format
         * @returns {string} Formatted currency string
         */
        formatCurrency(value) {
            const number = Number(value || 0);
            return number.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        },

        /**
         * Safely parse a string to number, removing commas
         * Example: "1,234.50" -> 1234.5
         * 
         * @param {string|number} value - The value to parse
         * @returns {number} Parsed number or 0 if invalid
         */
        parseNumber(value) {
            // Remove commas and convert to string
            const normalized = String(value || "0").replace(/,/g, "");
            const number = Number.parseFloat(normalized);
            // Return 0 if result is NaN
            return Number.isNaN(number) ? 0 : number;
        },

        /**
         * Toggle between edit mode and preview mode for a document module
         * Manages visibility of form, preview, and action buttons
         * 
         * @param {string} moduleId - ID of the module element (e.g., "invoice-module")
         * @param {boolean} isPreview - True to show preview, false to show edit form
         */
        togglePreview(moduleId, isPreview) {
            const moduleEl = document.getElementById(moduleId);
            if (!moduleEl) return; // Module not found
            
            const showPreview = Boolean(isPreview);
            
            // Add/remove CSS class for styling
            moduleEl.classList.toggle("is-preview", showPreview);
            
            // ============================================
            // Toggle action buttons visibility
            // ============================================
            // Find buttons using ID suffix pattern
            const previewToggleBtn = moduleEl.querySelector('[id$="-preview-toggle"]');
            const exitPreviewBtn = moduleEl.querySelector('[id$="-exit-preview"]');
            const submitBtn = moduleEl.querySelector('[id$="-submit"]');
            
            if (showPreview) {
                // In preview mode: hide "Preview" button, show "Back" and "Download"
                previewToggleBtn?.setAttribute("hidden", "hidden");
                submitBtn?.removeAttribute("hidden");
                exitPreviewBtn?.removeAttribute("hidden");
            } else {
                // In edit mode: show "Preview" and "Download", hide "Back"
                previewToggleBtn?.removeAttribute("hidden");
                submitBtn?.removeAttribute("hidden");
                exitPreviewBtn?.setAttribute("hidden", "hidden");
            }
            
            // ============================================
            // Toggle form visibility
            // ============================================
            const form = moduleEl.querySelector("form.document-editable");
            if (form) {
                if (showPreview) {
                    form.setAttribute("hidden", "hidden"); // Hide edit form
                } else {
                    form.removeAttribute("hidden"); // Show edit form
                }
            }
            
            // ============================================
            // Toggle preview document visibility
            // ============================================
            moduleEl.querySelectorAll(".document").forEach((doc) => {
                // Skip the editable form (already handled above)
                if (!doc.classList.contains("document-editable")) {
                    if (showPreview) {
                        doc.removeAttribute("hidden"); // Show preview
                    } else {
                        doc.setAttribute("hidden", "hidden"); // Hide preview
                    }
                }
            });
        },
    };

    // ============================================
    // DOWNLOAD FORMAT DIALOG
    // ============================================
    // Cached reference to dialog elements (lazy initialization)
    let downloadFormatDialog;

    /**
     * Ensure download format dialog is created and return references
     * Uses lazy initialization - dialog is only created when first needed
     * 
     * @returns {Object} Dialog element references (backdrop, buttons)
     */
    function ensureDownloadFormatDialog() {
        // Return cached dialog if already created
        if (downloadFormatDialog) {
            return downloadFormatDialog;
        }

        // ============================================
        // Create dialog backdrop (darkened overlay)
        // ============================================
        const backdrop = document.createElement("div");
        backdrop.className = "download-format-backdrop is-hidden";
        backdrop.setAttribute("role", "presentation");
        backdrop.setAttribute("aria-hidden", "true");

        // ============================================
        // Create dialog container
        // ============================================
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

        // ============================================
        // Create action buttons container
        // ============================================
        const actions = document.createElement("div");
        actions.className = "download-format-actions";

        // PDF download button (primary action)
        const pdfButton = document.createElement("button");
        pdfButton.type = "button";
        pdfButton.className = "button download-format-button";
        pdfButton.textContent = "Download PDF";

        // JPEG download button (secondary action)
        const jpegButton = document.createElement("button");
        jpegButton.type = "button";
        jpegButton.className = "button button-secondary download-format-button";
        jpegButton.textContent = "Download JPEG";

        // Cancel button
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "download-format-cancel";
        cancelButton.textContent = "Cancel";

        // ============================================
        // Assemble and append to DOM
        // ============================================
        actions.append(pdfButton, jpegButton);
        dialog.append(title, description, actions, cancelButton);
        backdrop.append(dialog);
        document.body.appendChild(backdrop);

        // Cache references for reuse
        downloadFormatDialog = {
            backdrop,
            pdfButton,
            jpegButton,
            cancelButton,
        };
        return downloadFormatDialog;
    }

    /**
     * Show download format dialog and wait for user selection
     * Returns a Promise that resolves with user choice
     * 
     * @returns {Promise<string|null>} "pdf", "jpeg", or null (cancelled)
     */
    helpers.chooseDownloadFormat = function chooseDownloadFormat() {
        // Remember which element had focus (for accessibility)
        const trigger = document.activeElement;
        
        // Ensure dialog exists and get references
        const dialogRefs = ensureDownloadFormatDialog();
        const { backdrop, pdfButton, jpegButton, cancelButton } = dialogRefs;

        // Return a Promise that resolves when user makes a choice
        return new Promise((resolve) => {
            /**
             * Close dialog and clean up event listeners
             * @param {string|null} result - User's choice or null if cancelled
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
                
                // Restore focus to trigger element (accessibility)
                if (trigger && typeof trigger.focus === "function") {
                    setTimeout(() => trigger.focus(), 0);
                }
                
                // Resolve promise with result
                resolve(result);
            }

            // Event handler: PDF button clicked
            function onPdf(event) {
                event.preventDefault();
                event.stopPropagation();
                close("pdf");
            }

            // Event handler: JPEG button clicked
            function onJpeg(event) {
                event.preventDefault();
                event.stopPropagation();
                close("jpeg");
            }

            // Event handler: Cancel button clicked
            function onCancel(event) {
                event.preventDefault();
                event.stopPropagation();
                close(null);
            }

            // Event handler: Backdrop clicked (close dialog)
            function onBackdrop(event) {
                if (event.target === backdrop) {
                    close(null);
                }
            }

            // Event handler: Escape key pressed (close dialog)
            function onKeydown(event) {
                if (event.key === "Escape") {
                    event.preventDefault();
                    close(null);
                }
            }

            // ============================================
            // Attach event listeners
            // ============================================
            pdfButton.addEventListener("click", onPdf);
            jpegButton.addEventListener("click", onJpeg);
            cancelButton.addEventListener("click", onCancel);
            backdrop.addEventListener("click", onBackdrop);
            document.addEventListener("keydown", onKeydown);

            // ============================================
            // Show dialog and focus first button
            // ============================================
            backdrop.classList.remove("is-hidden");
            backdrop.setAttribute("aria-hidden", "false");
            pdfButton.focus({ preventScroll: true });
        });
    };

    // ============================================
    // EXPOSE HELPERS GLOBALLY
    // ============================================
    // Make helpers available to all document modules
    window.BillingApp = helpers;
})();
