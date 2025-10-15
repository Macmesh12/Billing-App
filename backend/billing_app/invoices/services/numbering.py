"""Invoice number formatting utilities.

This module provides helper functions for formatting invoice numbers
consistently throughout the application.
"""


def format_invoice_number(pk: int | None) -> str:
    """Format an invoice number from a primary key.
    
    Args:
        pk: Primary key of the invoice, or None for default number.
        
    Returns:
        Formatted invoice number string (e.g., "INV001", "INV042").
        Returns "INV000" if pk is None.
        
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
