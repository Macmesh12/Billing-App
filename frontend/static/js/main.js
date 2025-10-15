/* ============================================
   MAIN APPLICATION JAVASCRIPT
   ============================================
   This file contains core utilities and helpers used across
   all document modules (invoice, receipt, waybill).
   
   FEATURES:
   - Navigation active state management
   - Currency and number formatting utilities
   - Preview/edit mode toggling
   - Download format selection dialog
   - Global BillingApp namespace for shared functions
   
   EXPORTS:
   - window.BillingApp: Global object with helper functions
   ============================================ */

// IIFE (Immediately Invoked Function Expression) to encapsulate main app logic
(() => {
    // ============================================
    // NAVIGATION ACTIVE STATE MANAGEMENT
    // ============================================
    // Automatically highlight the current page in the navigation menu
    document.addEventListener("DOMContentLoaded", () => {
        // Get current URL path
        const currentPath = window.location.pathname;
        // Extract filename from path (e.g., "/invoice.html" -> "invoice.html")
        const currentFile = currentPath.split("/").filter(Boolean).pop() || "index.html";
        
        // Loop through all navigation links
        document.querySelectorAll(".app-nav .nav-link").forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;
            
            // Normalize href by removing leading ./ if present
            const normalizedHref = href.replace(/^\.\//, "");
            
            // Check if this link matches the current page
            if (normalizedHref === currentFile || (currentFile === "index.html" && normalizedHref === "/")) {
                link.classList.add("active"); // Highlight active link
            }
        });
    });

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    // Collection of utility functions used by all document modules
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
         * Parse a string to a number, handling commas and invalid input
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
         * Handles visibility of form, preview, and action buttons
         * @param {string} moduleId - ID of the module element
         * @param {boolean} isPreview - Whether to show preview mode
         */
        togglePreview(moduleId, isPreview) {
            const moduleEl = document.getElementById(moduleId);
            if (!moduleEl) return;
            
            const showPreview = Boolean(isPreview);
            // Add/remove CSS class for styling
            moduleEl.classList.toggle("is-preview", showPreview);
            
            // Get action button references
            const previewToggleBtn = moduleEl.querySelector('[id$="-preview-toggle"]');
            const exitPreviewBtn = moduleEl.querySelector('[id$="-exit-preview"]');
            const submitBtn = moduleEl.querySelector('[id$="-submit"]');
            
            // Update button visibility based on mode
            if (showPreview) {
                // Preview mode: hide preview button, show back and download
                previewToggleBtn?.setAttribute("hidden", "hidden");
                submitBtn?.removeAttribute("hidden");
                exitPreviewBtn?.removeAttribute("hidden");
            } else {
                // Edit mode: show preview button, hide back button
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

    // Reference to the download format dialog (created on demand)
    // Reference to the download format dialog (created on demand)
    let downloadFormatDialog;

    /**
     * Create or return existing download format selection dialog
     * This dialog allows users to choose between PDF and JPEG formats
     * @returns {Object} Dialog elements (backdrop, buttons)
     */
    function ensureDownloadFormatDialog() {
        // Return existing dialog if already created
        if (downloadFormatDialog) {
            return downloadFormatDialog;
        }

        // Create modal backdrop (dark overlay)
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

        // Action buttons container
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

        // Assemble dialog structure
        actions.append(pdfButton, jpegButton);
        dialog.append(title, description, actions, cancelButton);
        backdrop.append(dialog);
        document.body.appendChild(backdrop);

        // Cache references for future use
        downloadFormatDialog = {
            backdrop,
            pdfButton,
            jpegButton,
            cancelButton,
        };
        return downloadFormatDialog;
    }

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

    window.BillingApp = helpers;
    // Expose helpers globally
})();
