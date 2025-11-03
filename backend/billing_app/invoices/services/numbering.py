"""Invoice numbering service.

This module provides utilities for formatting invoice numbers with consistent
padding and prefixes.
"""


def format_invoice_number(pk: int | None) -> str:
    """Format an invoice primary key as a human-readable invoice number.
    
    Invoice numbers follow the format: INV{number:03d}
    - Prefix: "INV"
    - Number: Zero-padded to 3 digits
    
    Args:
        pk: Primary key of the invoice (None for default)
        
    Returns:
        Formatted invoice number string (e.g., "INV001", "INV042", "INV123")
        
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
