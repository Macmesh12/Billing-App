"""
Invoice numbering service module.

This module provides utilities for formatting invoice numbers
from primary keys or other identifiers.

Note: This is a legacy formatting function. New invoices use
the counter_store module for automatic number generation.
"""


def format_invoice_number(pk: int | None) -> str:
    """
    Format an invoice number from a primary key.
    
    This function creates a human-readable invoice number by
    prefixing the pk with "INV" and padding to 3 digits.
    
    Args:
        pk: Primary key of the invoice, or None for new invoices
        
    Returns:
        Formatted invoice number string (e.g., "INV001", "INV042")
        Returns "INV000" if pk is None
        
    Examples:
        >>> format_invoice_number(1)
        'INV001'
        >>> format_invoice_number(42)
        'INV042'
        >>> format_invoice_number(None)
        'INV000'
    """
    if pk is None:
        return "INV000"
    return f"INV{pk:03d}"
