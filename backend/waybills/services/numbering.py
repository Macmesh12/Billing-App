"""Waybill numbering service.

This module provides utilities for formatting waybill numbers with consistent
padding and prefixes.
"""


def format_waybill_number(pk: int | None) -> str:
    """Format a waybill primary key as a human-readable waybill number.
    
    Waybill numbers follow the format: WAY{number:03d}
    - Prefix: "WAY"
    - Number: Zero-padded to 3 digits
    
    Args:
        pk: Primary key of the waybill (None for default)
        
    Returns:
        Formatted waybill number string (e.g., "WAY001", "WAY042", "WAY123")
        
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
