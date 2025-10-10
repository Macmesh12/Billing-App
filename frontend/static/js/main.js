(() => {
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

    const helpers = {
        formatCurrency(value) {
            const number = Number(value || 0);
            return number.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        },
        parseNumber(value) {
            const normalized = String(value || "0").replace(/,/g, "");
            const number = Number.parseFloat(normalized);
            return Number.isNaN(number) ? 0 : number;
        },
        togglePreview(moduleId, isPreview) {
            const moduleEl = document.getElementById(moduleId);
            if (!moduleEl) return;
            const showPreview = Boolean(isPreview);
            moduleEl.classList.toggle("is-preview", showPreview);
            const form = moduleEl.querySelector("form.document-editable");
            if (form) {
                if (showPreview) {
                    form.setAttribute("hidden", "hidden");
                } else {
                    form.removeAttribute("hidden");
                }
            }
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

    window.BillingApp = helpers;
})();
