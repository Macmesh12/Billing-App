"""
Receipt Numbering Service

Provides functions for formatting receipt numbers.
This module is used for generating human-readable receipt identifiers.
"""


def format_receipt_number(pk: int | None) -> str:
    """
    Format receipt number with standard prefix and zero-padding.
    
    Converts database primary key to a formatted receipt number.
    Format: "REC" prefix followed by 3-digit zero-padded number.
    
    Args:
        pk: Primary key of the receipt, or None for new/placeholder
        
    Returns:
        str: Formatted receipt number (e.g., "REC001", "REC042")
        
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
