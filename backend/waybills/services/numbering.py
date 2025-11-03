"""
Waybill Numbering Service

Provides functions for formatting waybill numbers.
This module is used for generating human-readable waybill identifiers.
"""


def format_waybill_number(pk: int | None) -> str:
    """
    Format waybill number with standard prefix and zero-padding.
    
    Converts database primary key to a formatted waybill number.
    Format: "WAY" prefix followed by 3-digit zero-padded number.
    
    Args:
        pk: Primary key of the waybill, or None for new/placeholder
        
    Returns:
        str: Formatted waybill number (e.g., "WAY001", "WAY042")
        
    Examples:
        >>> format_waybill_number(1)
        'WAY001'
        >>> format_waybill_number(42)
        'WAY042'
        >>> format_waybill_number(None)
        'WAY000'
    """
    if pk is None:
        return "WAY000"
    return f"WAY{pk:03d}"
