(() => {
    document.addEventListener("DOMContentLoaded", () => {
        const currentPath = window.location.pathname;
        document.querySelectorAll(".app-nav .nav-link").forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;
            if (href === "/" && currentPath === "/") {
                link.classList.add("active");
            } else if (href !== "/" && currentPath.startsWith(href)) {
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
            const form = moduleEl.querySelector("form");
            if (form) {
                if (showPreview) {
                    form.setAttribute("hidden", "hidden");
                } else {
                    form.removeAttribute("hidden");
                }
            }
            const previewEl = moduleEl.querySelector(".document");
            if (previewEl) {
                if (showPreview) {
                    previewEl.removeAttribute("hidden");
                } else {
                    previewEl.setAttribute("hidden", "hidden");
                }
            }
        },
    };

    window.BillingApp = helpers;
})();
