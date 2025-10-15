/* ============================================
   HOME/DASHBOARD MODULE - MAIN JAVASCRIPT
   ============================================
   This file handles all dashboard functionality including:
   - Loading and displaying document counts from the API
   - Animating counter values on page load
   - Managing action card hover effects
   
   FEATURES:
   - Fetches document counts from backend API
   - Smooth animation for counter displays (0 to target)
   - Hover effects for quick action cards
   - Error handling with graceful fallback to 0
   ============================================ */

// IIFE (Immediately Invoked Function Expression) to encapsulate logic
// This prevents polluting the global namespace
(() => {
    // Wait for DOM to be fully loaded before running code
    document.addEventListener("DOMContentLoaded", () => {
        
        // ============================================
        // ACTION CARD HOVER EFFECTS
        // ============================================
        // Add visual feedback when users focus on action cards
        const actionCards = document.querySelectorAll(".action-card");
        actionCards.forEach((card) => {
            const link = card.querySelector("a");
            if (!link) return;
            // Lift card slightly on focus
            link.addEventListener("focus", () => card.style.transform = "translateY(-4px)");
            // Return card to normal position on blur
            link.addEventListener("blur", () => card.style.transform = "");
        });

        // ============================================
        // API CONFIGURATION AND DOM ELEMENTS
        // ============================================
        // Get API base URL from global config or use default
        const config = window.BILLING_APP_CONFIG || {};
        const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";

        // Cache DOM element references for counter displays
        const elements = {
            invoicesCount: document.getElementById('invoice-count'),
            receiptsCount: document.getElementById('receipt-count'),
            waybillsCount: document.getElementById('waybill-count'),
        };

        /**
         * Load document counts from backend API
         * Fetches current totals for invoices, receipts, and waybills
         * and animates the counter displays
         */
        async function loadCounts() {
            try {
                // Fetch counts from counter API endpoint
                const response = await fetch(`${API_BASE}/api/counter/counts/`);
                if (response.ok) {
                    const counts = await response.json();
                    // Handle different possible response formats
                    const invoiceTotal = counts.invoice ?? counts.invoices ?? 0;
                    const receiptTotal = counts.receipt ?? counts.receipts ?? 0;
                    const waybillTotal = counts.waybill ?? counts.waybills ?? 0;
                    
                    // Animate each counter from 0 to target value
                    animateCount(elements.invoicesCount, invoiceTotal);
                    animateCount(elements.receiptsCount, receiptTotal);
                    animateCount(elements.waybillsCount, waybillTotal);
                }
            } catch (error) {
                // Log error but don't crash the app
                console.warn('Failed to load document counts', error);
                // Set to 0 if API call failed
                if (elements.invoicesCount) elements.invoicesCount.textContent = '0';
                if (elements.receiptsCount) elements.receiptsCount.textContent = '0';
                if (elements.waybillsCount) elements.waybillsCount.textContent = '0';
            }
        }

        /**
         * Animate counter from 0 to target value
         * Creates a smooth counting animation for visual appeal
         * @param {HTMLElement} element - DOM element to update
         * @param {number} target - Final value to count to
         */
        function animateCount(element, target) {
            if (!element) return;
            
            const duration = 800; // Animation duration in milliseconds
            const start = 0; // Always start from 0
            const increment = target / (duration / 16); // 60fps (16ms per frame)
            let current = start;

            // Run animation every frame (approximately 60fps)
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    // Animation complete - set final value and stop
                    element.textContent = target.toLocaleString();
                    clearInterval(timer);
                } else {
                    // Animation in progress - update with current value
                    element.textContent = Math.floor(current).toLocaleString();
                }
            }, 16);
        }

        // ============================================
        // INITIALIZATION
        // ============================================
        // Load counts when page is ready
        loadCounts();
    });
})();
