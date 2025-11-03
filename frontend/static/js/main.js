(() => {
    // IIFE for main application logic
    document.addEventListener("DOMContentLoaded", () => {
        // Event listener for DOM content loaded
        const currentPath = window.location.pathname;
        // Get current URL path
        const currentFile = currentPath.split("/").filter(Boolean).pop() || "index.html";
        // Extract current file name from path
        document.querySelectorAll(".app-nav .nav-link").forEach((link) => {
            // Loop through navigation links
            const href = link.getAttribute("href");
            // Get href attribute
            if (!href) return;
            const normalizedHref = href.replace(/^\.\//, "");
            // Normalize href by removing leading ./
            if (normalizedHref === currentFile || (currentFile === "index.html" && normalizedHref === "/")) {
                // Check if link matches current page
                link.classList.add("active");
                // Add active class to current page link
            }
        });
    });

    const helpers = {
        // Object containing utility helper functions
        formatCurrency(value) {
            // Function to format number as currency string
            const number = Number(value || 0);
            // Convert to number
            return number.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
            // Return formatted string
        },
        parseNumber(value) {
            // Function to parse string to number safely
            const normalized = String(value || "0").replace(/,/g, "");
            // Remove commas from string
            const number = Number.parseFloat(normalized);
            // Parse to float
            return Number.isNaN(number) ? 0 : number;
            // Return number or 0 if NaN
        },
        togglePreview(moduleId, isPreview) {
            // Function to toggle between edit and preview modes
            const moduleEl = document.getElementById(moduleId);
            // Get module element
            if (!moduleEl) return;
            const showPreview = Boolean(isPreview);
            // Convert to boolean
            moduleEl.classList.toggle("is-preview", showPreview);
            // Toggle CSS class
            
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
            
            const form = moduleEl.querySelector("form.document-editable");
            // Find editable form
            if (form) {
                if (showPreview) {
                    form.setAttribute("hidden", "hidden");
                    // Hide form in preview
                } else {
                    form.removeAttribute("hidden");
                    // Show form in edit
                }
            }
            moduleEl.querySelectorAll(".document").forEach((doc) => {
                // Loop through document elements
                if (!doc.classList.contains("document-editable")) {
                    // If not editable form
                    if (showPreview) {
                        doc.removeAttribute("hidden");
                        // Show preview documents
                    } else {
                        doc.setAttribute("hidden", "hidden");
                        // Hide preview documents
                    }
                }
            });
        },
    };

    // ============================================
    // PDF/JPEG DOWNLOAD FORMAT CHOOSER
    // ============================================
    // This section creates and manages a modal dialog that allows
    // users to choose between PDF and JPEG formats when downloading
    // documents (invoices, receipts, waybills).
    
    // Cache reference to dialog elements to avoid recreating them
    let downloadFormatDialog;

    /**
     * Creates or returns cached download format dialog
     * 
     * This function lazily creates a modal dialog on first call,
     * then returns the cached version on subsequent calls.
     * The dialog is a full-screen backdrop with a centered modal.
     * 
     * @returns {Object} Dialog element references
     */
    function ensureDownloadFormatDialog() {
        // Return cached dialog if already created
        if (downloadFormatDialog) {
            return downloadFormatDialog;
        }

        // Create full-screen backdrop overlay
        const backdrop = document.createElement("div");
        backdrop.className = "download-format-backdrop is-hidden";
        backdrop.setAttribute("role", "presentation");
        backdrop.setAttribute("aria-hidden", "true");

        // Create modal dialog container
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

        // Dialog description/help text
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

        // Cache element references for future use
        downloadFormatDialog = {
            backdrop,
            pdfButton,
            jpegButton,
            cancelButton,
        };
        return downloadFormatDialog;
    }

    /**
     * Display download format selection dialog and return user's choice
     * 
     * USAGE:
     * Called by document modules (invoice.js, receipt.js, waybill.js)
     * when the user clicks the "Download" button.
     * 
     * WORKFLOW:
     * 1. Shows modal dialog with PDF/JPEG options
     * 2. User selects format or cancels
     * 3. Returns Promise resolving to:
     *    - "pdf" if PDF button clicked
     *    - "jpeg" if JPEG button clicked
     *    - null if dialog cancelled (Cancel button, Escape key, or backdrop click)
     * 
     * PDF FORMAT: Best for printing, maintains exact layout, works with all printers
     * JPEG FORMAT: Best for sharing digitally, smaller file size, works everywhere
     * 
     * @returns {Promise<string|null>} Selected format ("pdf", "jpeg") or null if cancelled
     */
    helpers.chooseDownloadFormat = function chooseDownloadFormat() {
        // Remember which element had focus before opening dialog
        // We'll restore focus after dialog closes for accessibility
        const trigger = document.activeElement;
        
        // Get or create dialog elements
        const dialogRefs = ensureDownloadFormatDialog();
        const { backdrop, pdfButton, jpegButton, cancelButton } = dialogRefs;

        // Return promise that resolves when user makes a choice
        return new Promise((resolve) => {
            /**
             * Close dialog and clean up event listeners
             * @param {string|null} result - User's choice ("pdf", "jpeg", or null)
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
                
                // Restore focus to trigger button (accessibility)
                if (trigger && typeof trigger.focus === "function") {
                    setTimeout(() => trigger.focus(), 0);
                }
                
                // Resolve promise with user's choice
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

            // Event handler: Backdrop (outside dialog) clicked
            function onBackdrop(event) {
                if (event.target === backdrop) {
                    close(null);
                }
            }

            // Event handler: Escape key pressed (accessibility)
            function onKeydown(event) {
                if (event.key === "Escape") {
                    event.preventDefault();
                    close(null);
                }
            }

            // Attach all event listeners
            pdfButton.addEventListener("click", onPdf);
            jpegButton.addEventListener("click", onJpeg);
            cancelButton.addEventListener("click", onCancel);
            backdrop.addEventListener("click", onBackdrop);
            document.addEventListener("keydown", onKeydown);

            // Show dialog and focus PDF button (default choice)
            backdrop.classList.remove("is-hidden");
            backdrop.setAttribute("aria-hidden", "false");
            pdfButton.focus({ preventScroll: true });
        });
    };

    window.BillingApp = helpers;
    // Expose helpers globally
})();
