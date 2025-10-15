/* ============================================
   HOME PAGE MODULE
   ============================================
   This file handles the home/dashboard page functionality:
   - Action card hover effects
   - Loading and displaying document counts
   - Animated counter display
   ============================================ */

// IIFE to encapsulate home page logic
(() => {
    document.addEventListener("DOMContentLoaded", () => {
        // ============================================
        // ACTION CARD HOVER EFFECTS
        // ============================================
        
        // Add visual feedback when action cards are focused
        const actionCards = document.querySelectorAll(".action-card");
        actionCards.forEach((card) => {
            const link = card.querySelector("a");
            if (!link) return;
            // Lift card on focus for better UX
            link.addEventListener("focus", () => card.style.transform = "translateY(-4px)");
            link.addEventListener("blur", () => card.style.transform = "");
        });

        // ============================================
        // DOCUMENT COUNTER DISPLAY
        // ============================================
        
        const config = window.BILLING_APP_CONFIG || {};
        const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";

        // Element references for counter displays
        const elements = {
            invoicesCount: document.getElementById('invoice-count'),
            receiptsCount: document.getElementById('receipt-count'),
            waybillsCount: document.getElementById('waybill-count'),
        };

        /**
         * Load document counts from the API
         * Fetches current counts for invoices, receipts, and waybills
         */
        async function loadCounts() {
            try {
                const response = await fetch(`${API_BASE}/api/counter/counts/`);
                if (response.ok) {
                    const counts = await response.json();
                    // Handle different possible response formats
                    const invoiceTotal = counts.invoice ?? counts.invoices ?? 0;
                    const receiptTotal = counts.receipt ?? counts.receipts ?? 0;
                    const waybillTotal = counts.waybill ?? counts.waybills ?? 0;
                    // Animate counters for visual appeal
                    animateCount(elements.invoicesCount, invoiceTotal);
                    animateCount(elements.receiptsCount, receiptTotal);
                    animateCount(elements.waybillsCount, waybillTotal);
                }
            } catch (error) {
                console.warn('Failed to load document counts', error);
                // Fallback to 0 on error
                if (elements.invoicesCount) elements.invoicesCount.textContent = '0';
                if (elements.receiptsCount) elements.receiptsCount.textContent = '0';
                if (elements.waybillsCount) elements.waybillsCount.textContent = '0';
            }
        }

        /**
         * Animate a counter from 0 to target value
         * @param {HTMLElement} element - Element to update with count
         * @param {number} target - Target count value
         */
        function animateCount(element, target) {
            if (!element) return;
            const duration = 800; // Animation duration in milliseconds
            const start = 0;
            const increment = target / (duration / 16); // Calculate increment for 60fps
            let current = start;

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    // Animation complete, set final value
                    element.textContent = target.toLocaleString();
                    clearInterval(timer);
                } else {
                    // Update with current animated value
                    element.textContent = Math.floor(current).toLocaleString();
                }
            }, 16); // ~60fps (16ms per frame)
        }

        // Initialize: load counts on page load
        loadCounts();
    });
})();
