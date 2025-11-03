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

    window.BillingApp = helpers;
    // Expose helpers globally
})();
