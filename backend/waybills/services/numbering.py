"""Waybill number formatting utilities.

This module provides helper functions for formatting waybill numbers
consistently throughout the application.
"""


def format_waybill_number(pk: int | None) -> str:
    """Format a waybill number from a primary key.
    
    Args:
        pk: Primary key of the waybill, or None for default number.
        
    Returns:
        Formatted waybill number string (e.g., "WAY001", "WAY042").
        Returns "WAY000" if pk is None.
        
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
