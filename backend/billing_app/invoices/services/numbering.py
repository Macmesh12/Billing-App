"""
Invoice Numbering Service

Provides functions for formatting invoice numbers.
This module is used for generating human-readable invoice identifiers.
"""


def format_invoice_number(pk: int | None) -> str:
    """
    Format invoice number with standard prefix and zero-padding.
    
    Converts database primary key to a formatted invoice number.
    Format: "INV" prefix followed by 3-digit zero-padded number.
    
    Args:
        pk: Primary key of the invoice, or None for new/placeholder
        
    Returns:
        str: Formatted invoice number (e.g., "INV001", "INV042")
        
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
