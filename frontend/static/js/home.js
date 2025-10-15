/* ============================================
   HOME/DASHBOARD MODULE - MAIN JAVASCRIPT
   ============================================
   This file handles the dashboard page functionality including:
   - Loading and displaying document counts
   - Animated counter transitions
   - Action card hover effects for better UX
   - API integration for real-time statistics
   ============================================ */

// IIFE (Immediately Invoked Function Expression) to encapsulate module logic
// This prevents polluting the global namespace
(() => {
    document.addEventListener("DOMContentLoaded", () => {
        // ============================================
        // INTERACTIVE CARD EFFECTS
        // ============================================

        // Setup action card hover effects for better visual feedback
        const actionCards = document.querySelectorAll(".action-card");
        actionCards.forEach((card) => {
            const link = card.querySelector("a");
            if (!link) return;
            // Lift card slightly when link receives focus
            link.addEventListener("focus", () => card.style.transform = "translateY(-4px)");
            // Reset card position when focus is lost
            link.addEventListener("blur", () => card.style.transform = "");
        });

        // ============================================
        // CONFIGURATION AND SETUP
        // ============================================

        // Get API configuration from global config object
        const config = window.BILLING_APP_CONFIG || {};
        const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";

        // References to dashboard counter display elements
        const elements = {
            invoicesCount: document.getElementById('invoices-count'),
            receiptsCount: document.getElementById('receipts-count'),
            waybillsCount: document.getElementById('waybills-count'),
        };

        // ============================================
        // DATA LOADING
        // ============================================

        /**
         * Load document counts from the server
         * Fetches current counts for all document types and animates them
         */
        async function loadCounts() {
            try {
                const response = await fetch(`${API_BASE}/api/counter/counts/`);
                if (response.ok) {
                    const counts = await response.json();
                    const invoiceTotal = counts.invoice ?? counts.invoices ?? 0;
                    const receiptTotal = counts.receipt ?? counts.receipts ?? 0;
                    const waybillTotal = counts.waybill ?? counts.waybills ?? 0;
                    animateCount(elements.invoicesCount, invoiceTotal);
                    animateCount(elements.receiptsCount, receiptTotal);
                    animateCount(elements.waybillsCount, waybillTotal);
                }
            } catch (error) {
                console.warn('Failed to load document counts', error);
                // Set to 0 if failed
                if (elements.invoicesCount) elements.invoicesCount.textContent = '0';
                if (elements.receiptsCount) elements.receiptsCount.textContent = '0';
                if (elements.waybillsCount) elements.waybillsCount.textContent = '0';
            }
        }

        // ============================================
        // ANIMATION FUNCTIONS
        // ============================================

        /**
         * Animate counter from 0 to target value
         * Creates a smooth counting animation for visual appeal
         * @param {HTMLElement} element - Element to animate
         * @param {number} target - Target count value
         */
        function animateCount(element, target) {
            if (!element) return;
            const duration = 800; // Animation duration in milliseconds
            const start = 0;
            const increment = target / (duration / 16); // Increment per frame (60fps)
            let current = start;

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    // Animation complete - show final value
                    element.textContent = target.toLocaleString();
                    clearInterval(timer);
                } else {
                    // Animation in progress - show current value
                    element.textContent = Math.floor(current).toLocaleString();
                }
            }, 16); // ~60fps (16ms per frame)
        }

        // ============================================
        // INITIALIZATION
        // ============================================

        // Load counts when page is ready
        loadCounts();
    });
})();
