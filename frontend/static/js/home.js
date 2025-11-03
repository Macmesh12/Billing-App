/* ============================================
   DASHBOARD (HOME) MODULE
   ============================================
   Handles the main dashboard page functionality:
   - Loading and displaying document counts
   - Animating counter values
   - Action card hover effects
   ============================================ */

(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        // ============================================
        // UI ENHANCEMENTS
        // ============================================
        
        /**
         * Setup action card hover effects
         * Adds subtle lift animation when action buttons receive focus
         */
        const actionCards = document.querySelectorAll(".action-card");
        actionCards.forEach((card) => {
            const link = card.querySelector("a");
            if (!link) return;
            
            // Lift card on focus
            link.addEventListener("focus", () => card.style.transform = "translateY(-4px)");
            
            // Reset on blur
            link.addEventListener("blur", () => card.style.transform = "");
        });

        // ============================================
        // DOCUMENT COUNTERS
        // ============================================
        
        // Get API configuration
        const config = window.BILLING_APP_CONFIG || {};
        const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";

        // Cache counter element references
        const elements = {
            invoicesCount: document.getElementById('invoice-count'),
            receiptsCount: document.getElementById('receipt-count'),
            waybillsCount: document.getElementById('waybill-count'),
        };

        /**
         * Fetches document counts from the API and animates the counters
         * Handles both success and failure states gracefully
         * @async
         */
        async function loadCounts() {
            try {
                const response = await fetch(`${API_BASE}/api/counter/counts/`);
                
                if (response.ok) {
                    const counts = await response.json();
                    
                    // Extract counts with fallback for different property names
                    const invoiceTotal = counts.invoice ?? counts.invoices ?? 0;
                    const receiptTotal = counts.receipt ?? counts.receipts ?? 0;
                    const waybillTotal = counts.waybill ?? counts.waybills ?? 0;
                    
                    // Animate each counter from 0 to target value
                    animateCount(elements.invoicesCount, invoiceTotal);
                    animateCount(elements.receiptsCount, receiptTotal);
                    animateCount(elements.waybillsCount, waybillTotal);
                }
            } catch (error) {
                console.warn('Failed to load document counts', error);
                
                // Display 0 for all counters on error
                if (elements.invoicesCount) elements.invoicesCount.textContent = '0';
                if (elements.receiptsCount) elements.receiptsCount.textContent = '0';
                if (elements.waybillsCount) elements.waybillsCount.textContent = '0';
            }
        }

        /**
         * Animates a counter from 0 to target value with smooth increments
         * Uses requestAnimationFrame-style timing for 60fps animation
         * @param {HTMLElement} element - The element to update
         * @param {number} target - The target count value
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
            }, 16); // ~60fps
        }

        // Initialize dashboard counters on page load
        loadCounts();
    });
})();
