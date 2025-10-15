"""
Invoice Calculator Service

This module provides calculation logic for invoice totals, including:
- Subtotal calculation from line items
- Tax and levy calculation based on configured rates
- Grand total calculation

All monetary calculations use Decimal for precision to avoid floating-point errors.
"""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Iterable

from django.conf import settings


@dataclass
class InvoiceTotals:
    """
    Data class representing calculated invoice totals.
    
    Attributes:
        subtotal: Sum of all line item totals (before taxes/levies)
        levies: Dictionary mapping levy name to levy amount
        grand_total: Final total including all levies and taxes
    """
    subtotal: Decimal
    levies: Dict[str, Decimal]
    grand_total: Decimal


def _to_decimal(value) -> Decimal:
    """
    Convert a value to Decimal with proper rounding.
    
    This ensures consistent decimal precision across all calculations.
    Uses ROUND_HALF_UP (round to nearest, ties away from zero).
    
    Args:
        value: Value to convert (int, float, string, or Decimal)
        
    Returns:
        Decimal: Value as Decimal with 2 decimal places
    """
    # Return Decimal values as-is
    if isinstance(value, Decimal):
        return value
        
    # Convert to Decimal via string to avoid float precision issues
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_totals(items: Iterable[dict]) -> InvoiceTotals:
    """
    Calculate invoice totals from line items.
    
    Applies tax rates from settings.TAX_SETTINGS to compute:
    1. Subtotal: Sum of (quantity × unit_price) for all items
    2. Levies: Individual taxes/levies applied to subtotal
    3. Grand Total: Subtotal + all levies
    
    Args:
        items: Iterable of item dictionaries with 'quantity' and 'unit_price' keys
        
    Returns:
        InvoiceTotals: Object containing subtotal, levies, and grand_total
        
    Example:
        >>> items = [{"quantity": 2, "unit_price": 10.50}]
        >>> totals = calculate_totals(items)
        >>> totals.subtotal
        Decimal('21.00')
    """
    # Calculate subtotal: sum of (quantity × unit_price) for all items
    subtotal = sum(
        _to_decimal(item.get("quantity", 0)) * _to_decimal(item.get("unit_price", 0))
        for item in items or []
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Calculate individual levies based on configured tax rates
    levies: Dict[str, Decimal] = {}
    levy_total = Decimal("0.00")
    
    for levy_name, rate in settings.TAX_SETTINGS.items():
        # Calculate levy as percentage of subtotal
        levy_amount = (subtotal * Decimal(str(rate))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        levies[levy_name] = levy_amount
        levy_total += levy_amount

    # Calculate grand total: subtotal + all levies
    grand_total = subtotal + levy_total
    grand_total = grand_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return InvoiceTotals(subtotal=subtotal, levies=levies, grand_total=grand_total)
