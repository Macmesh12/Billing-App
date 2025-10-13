(() => {
    document.addEventListener("DOMContentLoaded", () => {
        const cards = document.querySelectorAll(".module-card");
        cards.forEach((card) => {
            const link = card.querySelector("a");
            if (!link) return;
            card.addEventListener("mouseenter", () => card.classList.add("is-active"));
            card.addEventListener("mouseleave", () => card.classList.remove("is-active"));
            link.addEventListener("focus", () => card.classList.add("is-active"));
            link.addEventListener("blur", () => card.classList.remove("is-active"));
        });

        // Load counts into dashboard stats
        const config = window.BILLING_APP_CONFIG || {};
        const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";

        async function callApi(path) {
            try {
                const r = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json' } });
                if (!r.ok) return null;
                return r.json();
            } catch (e) {
                console.warn('Dashboard counts fetch failed', e);
                return null;
            }
        }

        async function loadCounts() {
            // Try a single summary endpoint
            const summary = await callApi('/dashboard/summary/');
            if (summary) {
                document.querySelectorAll('.module-card')[0].querySelector('.count').textContent = summary.invoices ?? 0;
                document.querySelectorAll('.module-card')[1].querySelector('.count').textContent = summary.receipts ?? 0;
                document.querySelectorAll('.module-card')[2].querySelector('.count').textContent = summary.waybills ?? 0;
                return;
            }

            // Fallback single endpoints
            const inv = await callApi('/invoices/api/list-count/');
            const rec = await callApi('/receipts/api/list-count/');
            const wb = await callApi('/waybills/api/list-count/');
            if (inv && inv.count != null) document.querySelectorAll('.module-card')[0].querySelector('.count').textContent = inv.count;
            if (rec && rec.count != null) document.querySelectorAll('.module-card')[1].querySelector('.count').textContent = rec.count;
            if (wb && wb.count != null) document.querySelectorAll('.module-card')[2].querySelector('.count').textContent = wb.count;
        }

        loadCounts();
    });
})();
