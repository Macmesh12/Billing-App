"""
Invoice numbering service.

This module provides utilities for generating and formatting invoice numbers.
Invoice numbers follow the pattern: INV-XXXXX where XXXXX is a zero-padded
sequential number.

EXAMPLES:
- First invoice: INV-00001
- Tenth invoice: INV-00010
- Hundredth invoice: INV-00100
- New/unsaved invoice: INV-NEW (displayed as INV000 in some contexts)
"""


def format_invoice_number(pk: int | None) -> str:
    """
    Format an invoice number from a primary key.
    
    Converts a database primary key into a human-readable invoice number
    with zero-padding for consistent formatting.
    
    Args:
        pk: Invoice primary key (None for new/unsaved invoices)
        
    Returns:
        Formatted invoice number string
        
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
