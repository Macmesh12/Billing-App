"""Receipt number formatting utilities.

This module provides helper functions for formatting receipt numbers
consistently throughout the application.
"""


def format_receipt_number(pk: int | None) -> str:
    """Format a receipt number from a primary key.
    
    Args:
        pk: Primary key of the receipt, or None for default number.
        
    Returns:
        Formatted receipt number string (e.g., "REC001", "REC042").
        Returns "REC000" if pk is None.
        
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
