/* ============================================
   HOME PAGE JAVASCRIPT - BILLING APP
   ============================================
   This file handles all functionality for the dashboard/home page.
   
   KEY FEATURES:
   - Document count loading from backend API
   - Animated counter display (counts up from 0 to actual value)
   - Action card hover effects for better UX
   - Error handling with graceful fallback
   
   DEPENDENCIES:
   - Backend API: /api/counter/counts/ endpoint
   - DOM elements: invoice-count, receipt-count, waybill-count
   
   ARCHITECTURE:
   - IIFE pattern to avoid global namespace pollution
   - Async/await for API calls
   - Smooth animation using setInterval
   ============================================ */

// IIFE (Immediately Invoked Function Expression) to encapsulate code
(() => {
    // Wait for DOM to be fully loaded before executing
    document.addEventListener("DOMContentLoaded", () => {
        
        // ============================================
        // ACTION CARD HOVER EFFECTS
        // ============================================
        // Add visual feedback when user focuses on action card links
        const actionCards = document.querySelectorAll(".action-card");
        actionCards.forEach((card) => {
            const link = card.querySelector("a");
            if (!link) return; // Skip if no link found
            
            // Lift card slightly on focus for visual feedback
            link.addEventListener("focus", () => card.style.transform = "translateY(-4px)");
            // Reset position on blur
            link.addEventListener("blur", () => card.style.transform = "");
        });

        // ============================================
        // API CONFIGURATION
        // ============================================
        // Get API base URL from global config or use default
        const config = window.BILLING_APP_CONFIG || {};
        const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";

        // ============================================
        // DOM ELEMENT REFERENCES
        // ============================================
        // Get references to counter display elements
        const elements = {
            invoicesCount: document.getElementById('invoice-count'),
            receiptsCount: document.getElementById('receipt-count'),
            waybillsCount: document.getElementById('waybill-count'),
        };

        /**
         * Load document counts from backend API
         * Fetches counts for invoices, receipts, and waybills
         * and triggers animation for each counter
         */
        async function loadCounts() {
            try {
                // Fetch counts from backend API
                const response = await fetch(`${API_BASE}/api/counter/counts/`);
                
                if (response.ok) {
                    const counts = await response.json();
                    
                    // Extract counts with fallback to 0
                    // API may return singular or plural keys
                    const invoiceTotal = counts.invoice ?? counts.invoices ?? 0;
                    const receiptTotal = counts.receipt ?? counts.receipts ?? 0;
                    const waybillTotal = counts.waybill ?? counts.waybills ?? 0;
                    
                    // Animate each counter from 0 to actual value
                    animateCount(elements.invoicesCount, invoiceTotal);
                    animateCount(elements.receiptsCount, receiptTotal);
                    animateCount(elements.waybillsCount, waybillTotal);
                }
            } catch (error) {
                // Log error but don't break the UI
                console.warn('Failed to load document counts', error);
                
                // Set to 0 if API call failed (graceful degradation)
                if (elements.invoicesCount) elements.invoicesCount.textContent = '0';
                if (elements.receiptsCount) elements.receiptsCount.textContent = '0';
                if (elements.waybillsCount) elements.waybillsCount.textContent = '0';
            }
        }

        /**
         * Animate a counter from 0 to target value
         * Creates smooth counting animation for visual appeal
         * 
         * @param {HTMLElement} element - The element to animate
         * @param {number} target - The final count value
         */
        function animateCount(element, target) {
            if (!element) return; // Skip if element not found
            
            // Animation parameters
            const duration = 800; // Total animation duration in milliseconds
            const start = 0; // Start counting from 0
            const increment = target / (duration / 16); // Increment per frame (60fps)
            let current = start;

            // Use setInterval for smooth animation
            const timer = setInterval(() => {
                current += increment;
                
                // Check if we've reached or exceeded target
                if (current >= target) {
                    // Set final value and stop animation
                    element.textContent = target.toLocaleString();
                    clearInterval(timer);
                } else {
                    // Update with current value (rounded down)
                    element.textContent = Math.floor(current).toLocaleString();
                }
            }, 16); // ~60fps (1000ms / 60 ≈ 16ms)
        }

        // ============================================
        // INITIALIZATION
        // ============================================
        // Load and animate counts when page loads
        loadCounts();
    });
})();
