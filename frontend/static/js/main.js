/* ============================================
   MAIN APPLICATION SCRIPT
   ============================================
   This file provides shared utilities and global helpers
   used across all document modules (invoice, receipt, waybill).
   
   Key Features:
   - Navigation active state management
   - Currency and number formatting utilities
   - Preview mode toggle functionality
   - Format chooser dialog for PDF/JPEG downloads
   
   All functions are exposed via window.BillingApp global object
   for use by individual module scripts.
   ============================================ */

// IIFE (Immediately Invoked Function Expression) to encapsulate module logic
(() => {
    // ============================================
    // NAVIGATION INITIALIZATION
    // ============================================
    
    document.addEventListener("DOMContentLoaded", () => {
        // Highlight active navigation link based on current page
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split("/").filter(Boolean).pop() || "index.html";
        
        // Loop through all navigation links
        document.querySelectorAll(".app-nav .nav-link").forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;
            
            // Normalize href by removing leading ./
            const normalizedHref = href.replace(/^\.\//, "");
            
            // Check if link matches current page
            if (normalizedHref === currentFile || (currentFile === "index.html" && normalizedHref === "/")) {
                link.classList.add("active");
            }
        });
    });

    // ============================================
    // SHARED UTILITY FUNCTIONS
    // ============================================
    
    const helpers = {
        /**
         * Format a number as currency string with thousands separators
         * @param {number|string} value - Number to format
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
         * Safely parse a string to a number, removing commas
         * @param {string|number} value - Value to parse
         * @returns {number} Parsed number, or 0 if invalid
         */
        parseNumber(value) {
            const normalized = String(value || "0").replace(/,/g, "");
            const number = Number.parseFloat(normalized);
            return Number.isNaN(number) ? 0 : number;
        },
        /**
         * Toggle between edit mode and preview mode for a document module
         * @param {string} moduleId - ID of the module element to toggle
         * @param {boolean} isPreview - True to show preview, false to show edit mode
         */
        togglePreview(moduleId, isPreview) {
            const moduleEl = document.getElementById(moduleId);
            if (!moduleEl) return;
            
            const showPreview = Boolean(isPreview);
            
            // Toggle CSS class for styling
            moduleEl.classList.toggle("is-preview", showPreview);
            
            // Toggle action buttons visibility based on mode
            const previewToggleBtn = moduleEl.querySelector('[id$="-preview-toggle"]');
            const exitPreviewBtn = moduleEl.querySelector('[id$="-exit-preview"]');
            const submitBtn = moduleEl.querySelector('[id$="-submit"]');
            
            if (showPreview) {
                // Preview mode: hide preview button, show exit and submit
                previewToggleBtn?.setAttribute("hidden", "hidden");
                submitBtn?.removeAttribute("hidden");
                exitPreviewBtn?.removeAttribute("hidden");
            } else {
                // Edit mode: show preview button, hide exit
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
                // Only affect non-editable preview documents
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
    // DOWNLOAD FORMAT CHOOSER DIALOG
    // ============================================
    
    // Singleton reference to the dialog elements
    let downloadFormatDialog;

    /**
     * Create or get the download format chooser dialog
     * @returns {Object} Dialog elements object with backdrop, buttons, etc.
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

        // Create dialog container with ARIA attributes for accessibility
        const dialog = document.createElement("div");
        dialog.className = "download-format-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "download-format-title");

        // Create dialog title
        const title = document.createElement("h3");
        title.id = "download-format-title";
        title.className = "download-format-title";
        title.textContent = "Choose download format";

        // Create dialog description
        const description = document.createElement("p");
        description.className = "download-format-description";
        description.textContent = "Select PDF for printing or JPEG for sharing.";

        // Create action buttons container
        const actions = document.createElement("div");
        actions.className = "download-format-actions";

        // Create PDF download button
        const pdfButton = document.createElement("button");
        pdfButton.type = "button";
        pdfButton.className = "button download-format-button";
        pdfButton.textContent = "Download PDF";

        // Create JPEG download button
        const jpegButton = document.createElement("button");
        jpegButton.type = "button";
        jpegButton.className = "button button-secondary download-format-button";
        jpegButton.textContent = "Download JPEG";

        // Create cancel button
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "download-format-cancel";
        cancelButton.textContent = "Cancel";

        // Assemble dialog structure
        actions.append(pdfButton, jpegButton);
        dialog.append(title, description, actions, cancelButton);
        backdrop.append(dialog);
        document.body.appendChild(backdrop);

        // Cache dialog elements for reuse
        downloadFormatDialog = {
            backdrop,
            pdfButton,
            jpegButton,
            cancelButton,
        };
        return downloadFormatDialog;
    }

    /**
     * Show format chooser dialog and wait for user selection
     * @returns {Promise<string|null>} Resolves to "pdf", "jpeg", or null if cancelled
     */
    helpers.chooseDownloadFormat = function chooseDownloadFormat() {
        // Remember element that triggered the dialog for focus restoration
        const trigger = document.activeElement;
        const dialogRefs = ensureDownloadFormatDialog();
        const { backdrop, pdfButton, jpegButton, cancelButton } = dialogRefs;

        return new Promise((resolve) => {
            /**
             * Close dialog and clean up event listeners
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
                
                // Resolve promise with result
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

            // Event handler for clicking backdrop (closes dialog)
            function onBackdrop(event) {
                if (event.target === backdrop) {
                    close(null);
                }
            }

            // Event handler for Escape key (closes dialog)
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

            // Show dialog and focus first button
            backdrop.classList.remove("is-hidden");
            backdrop.setAttribute("aria-hidden", "false");
            pdfButton.focus({ preventScroll: true });
        });
    };

    // ============================================
    // GLOBAL EXPORTS
    // ============================================
    
    // Expose helpers to global scope for use by document modules
    window.BillingApp = helpers;
})();
