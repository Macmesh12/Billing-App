"""Receipt numbering service.

This module provides utilities for formatting receipt numbers with consistent
padding and prefixes.
"""


def format_receipt_number(pk: int | None) -> str:
    """Format a receipt primary key as a human-readable receipt number.
    
    Receipt numbers follow the format: REC{number:03d}
    - Prefix: "REC"
    - Number: Zero-padded to 3 digits
    
    Args:
        pk: Primary key of the receipt (None for default)
        
    Returns:
        Formatted receipt number string (e.g., "REC001", "REC042", "REC123")
        
    Examples:
        >>> format_receipt_number(1)
        'REC001'
        >>> format_receipt_number(42)
        'REC042'
        >>> format_receipt_number(None)
        'REC000'
    """
    if pk is None:
        return "REC000"
    return f"REC{pk:03d}"
