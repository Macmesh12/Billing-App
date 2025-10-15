/**
 * HOME/DASHBOARD MODULE - BILLING APP
 * ==========================================
 * This module handles the dashboard/home page functionality including:
 * - Loading and displaying document counts (invoices, receipts, waybills)
 * - Animating count-up effects on the counters
 * - Managing action card hover effects
 * 
 * The dashboard provides an overview of document statistics and
 * quick access links to the document editors.
 * ==========================================
 */

(() => {
    // IIFE to avoid polluting global scope
    document.addEventListener("DOMContentLoaded", () => {
        
        // ==========================================
        // ACTION CARD HOVER EFFECTS
        // ==========================================
        // Add visual feedback when action cards receive focus
        const actionCards = document.querySelectorAll(".action-card");
        actionCards.forEach((card) => {
            const link = card.querySelector("a");
            if (!link) return;
            
            // Lift card slightly on focus for visual feedback
            link.addEventListener("focus", () => card.style.transform = "translateY(-4px)");
            // Reset card position when focus is lost
            link.addEventListener("blur", () => card.style.transform = "");
        });

        // ==========================================
        // DOCUMENT COUNT LOADING AND DISPLAY
        // ==========================================
        
        // Get API base URL from global config or use default
        const config = window.BILLING_APP_CONFIG || {};
        const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8765";

        // Cache references to counter display elements
        const elements = {
            invoicesCount: document.getElementById('invoice-count'),
            receiptsCount: document.getElementById('receipt-count'),
            waybillsCount: document.getElementById('waybill-count'),
        };

        /**
         * Load document counts from the backend API.
         * 
         * This function:
         * 1. Fetches counts from the counter API endpoint
         * 2. Extracts invoice, receipt, and waybill counts
         * 3. Animates the counters from 0 to the target value
         * 4. Handles errors gracefully by displaying 0
         */
        async function loadCounts() {
            try {
                const response = await fetch(`${API_BASE}/api/counter/counts/`);
                if (response.ok) {
                    const counts = await response.json();
                    
                    // Extract counts with fallback values
                    // API may return different key names
                    const invoiceTotal = counts.invoice ?? counts.invoices ?? 0;
                    const receiptTotal = counts.receipt ?? counts.receipts ?? 0;
                    const waybillTotal = counts.waybill ?? counts.waybills ?? 0;
                    
                    // Animate each counter
                    animateCount(elements.invoicesCount, invoiceTotal);
                    animateCount(elements.receiptsCount, receiptTotal);
                    animateCount(elements.waybillsCount, waybillTotal);
                }
            } catch (error) {
                console.warn('Failed to load document counts', error);
                
                // Display 0 for all counts if loading fails
                if (elements.invoicesCount) elements.invoicesCount.textContent = '0';
                if (elements.receiptsCount) elements.receiptsCount.textContent = '0';
                if (elements.waybillsCount) elements.waybillsCount.textContent = '0';
            }
        }

        /**
         * Animate a counter from 0 to target value.
         * 
         * Creates a smooth count-up animation by incrementing the
         * displayed value at 60fps until it reaches the target.
         * 
         * @param {HTMLElement} element - The element to update
         * @param {number} target - The final count to display
         */
        function animateCount(element, target) {
            if (!element) return;
            
            const duration = 800; // Animation duration in milliseconds
            const start = 0;
            const increment = target / (duration / 16); // Increment per frame (60fps)
            let current = start;

            // Use setInterval for smooth animation at ~60fps
            const timer = setInterval(() => {
                current += increment;
                
                if (current >= target) {
                    // Animation complete - display final value
                    element.textContent = target.toLocaleString();
                    clearInterval(timer);
                } else {
                    // Still animating - display current value
                    element.textContent = Math.floor(current).toLocaleString();
                }
            }, 16); // ~60fps (1000ms / 60 ≈ 16ms)
        }

        // ==========================================
        // INITIALIZATION
        // ==========================================
        // Load counts when page loads
        loadCounts();
    });
})();
