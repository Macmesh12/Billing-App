"""
============================================
INVOICE NUMBERING SERVICE
============================================
This module handles invoice number formatting.
It generates human-readable invoice numbers from database IDs.

NUMBERING FORMAT:
- Prefix: "INV"
- Number: Zero-padded to 3 digits (001, 002, ..., 999)
- Example: INV001, INV042, INV123

USAGE:
    from invoices.services.numbering import format_invoice_number
    
    number = format_invoice_number(42)
    print(number)  # "INV042"

DEPENDENCIES:
- None (pure Python function)
============================================
"""


def format_invoice_number(pk: int | None) -> str:
    """
    Format an invoice number from a database primary key.
    
    Args:
        pk: Primary key (ID) from database, or None for placeholder
    
    Returns:
        Formatted invoice number string
        - If pk is None: "INV000" (placeholder)
        - Otherwise: "INV{pk:03d}" (e.g., INV001, INV042)
    
    Examples:
        format_invoice_number(None) -> "INV000"
        format_invoice_number(1) -> "INV001"
        format_invoice_number(42) -> "INV042"
        format_invoice_number(999) -> "INV999"
    
    Note:
        Numbers beyond 999 will not be zero-padded (e.g., 1000 -> "INV1000")
    """
    # Return placeholder if no ID provided
    if pk is None:
        return "INV000"
    
    # Format with "INV" prefix and 3-digit zero padding
    return f"INV{pk:03d}"
