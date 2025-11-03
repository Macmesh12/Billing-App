/**
 * HOME PAGE MODULE
 * 
 * This module handles the dashboard/home page functionality including:
 * - Document count statistics display
 * - Animated counter updates
 * - Action card hover effects
 */

// IIFE to encapsulate module logic
(() => {
    document.addEventListener("DOMContentLoaded", () => {
        // ============================================
        // ACTION CARD HOVER EFFECTS
        // ============================================
        
        /**
         * Setup keyboard navigation hover effects for action cards
         * When a card's link receives focus, lift the card visually
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
        // DOCUMENT COUNT STATISTICS
        // ============================================
        
        /**
         * API Configuration
         * Base URL for backend API calls
         */
        const config = window.BILLING_APP_CONFIG || {};
        const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";

        /**
         * DOM Element References
         * Elements that display document counts
         */
        const elements = {
            invoicesCount: document.getElementById('invoice-count'),
            receiptsCount: document.getElementById('receipt-count'),
            waybillsCount: document.getElementById('waybill-count'),
        };

        /**
         * Load Document Counts from API
         * Fetches current document counts and animates the display
         */
        async function loadCounts() {
            try {
                // Fetch counts from backend API
                const response = await fetch(`${API_BASE}/api/counter/counts/`);
                if (response.ok) {
                    const counts = await response.json();
                    
                    // Handle different response formats (invoice/invoices, etc.)
                    const invoiceTotal = counts.invoice ?? counts.invoices ?? 0;
                    const receiptTotal = counts.receipt ?? counts.receipts ?? 0;
                    const waybillTotal = counts.waybill ?? counts.waybills ?? 0;
                    
                    // Animate the count displays
                    animateCount(elements.invoicesCount, invoiceTotal);
                    animateCount(elements.receiptsCount, receiptTotal);
                    animateCount(elements.waybillsCount, waybillTotal);
                }
            } catch (error) {
                console.warn('Failed to load document counts', error);
                
                // Fallback: Set counts to 0 on error
                if (elements.invoicesCount) elements.invoicesCount.textContent = '0';
                if (elements.receiptsCount) elements.receiptsCount.textContent = '0';
                if (elements.waybillsCount) elements.waybillsCount.textContent = '0';
            }
        }

        /**
         * Animate Count Display
         * Smoothly animates a counter from 0 to target value
         * 
         * @param {HTMLElement} element - Element to update
         * @param {number} target - Target count value
         */
        function animateCount(element, target) {
            if (!element) return;
            
            const duration = 800; // Animation duration in milliseconds
            const start = 0;
            const increment = target / (duration / 16); // 60fps = 16ms per frame
            let current = start;

            // Update counter every frame
            const timer = setInterval(() => {
                current += increment;
                
                if (current >= target) {
                    // Animation complete: show final value
                    element.textContent = target.toLocaleString();
                    clearInterval(timer);
                } else {
                    // Animation in progress: show current value
                    element.textContent = Math.floor(current).toLocaleString();
                }
            }, 16); // 60fps
        }

        // Initialize: Load counts when page loads
        loadCounts();
    });
})();
