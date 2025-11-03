"""Invoice calculation service.

This module handles all monetary calculations for invoices using Decimal arithmetic
to ensure accurate financial computations. All monetary values are rounded to 2 decimal
places using ROUND_HALF_UP (standard banking rounding).
"""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Iterable

from django.conf import settings


@dataclass
class InvoiceTotals:
    """Data class representing calculated invoice totals.
    
    Attributes:
        subtotal: Sum of all line item totals before taxes/levies
        levies: Dictionary mapping levy names to their calculated amounts
        grand_total: Final total including all taxes and levies
    """
    subtotal: Decimal
    levies: Dict[str, Decimal]
    grand_total: Decimal


def _to_decimal(value) -> Decimal:
    """Convert a value to Decimal with 2-decimal precision.
    
    Args:
        value: Number or string to convert (None becomes 0)
        
    Returns:
        Decimal value rounded to 2 decimal places using banker's rounding
    """
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_totals(items: Iterable[dict]) -> InvoiceTotals:
    """Calculate invoice totals from line items.
    
    This function:
    1. Calculates subtotal from all items (quantity × unit_price)
    2. Applies all taxes/levies from settings.TAX_SETTINGS
    3. Computes grand total
    
    All calculations use Decimal arithmetic to avoid floating-point errors.
    
    Args:
        items: Iterable of dicts with 'quantity' and 'unit_price' keys
        
    Returns:
        InvoiceTotals object with all calculated values
        
    Example:
        items = [{"quantity": 2, "unit_price": 10.50}]
        totals = calculate_totals(items)
        # totals.subtotal = Decimal("21.00")
    """
    # Calculate subtotal: sum of (quantity × unit_price) for all items
    subtotal = sum(
        _to_decimal(item.get("quantity", 0)) * _to_decimal(item.get("unit_price", 0))
        for item in items or []
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Apply all taxes and levies from configuration
    levies: Dict[str, Decimal] = {}
    levy_total = Decimal("0.00")
    for levy_name, rate in settings.TAX_SETTINGS.items():
        # Calculate levy amount: subtotal × rate
        levy_amount = (subtotal * Decimal(str(rate))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        levies[levy_name] = levy_amount
        levy_total += levy_amount

    # Calculate grand total: subtotal + all levies
    grand_total = subtotal + levy_total
    grand_total = grand_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return InvoiceTotals(subtotal=subtotal, levies=levies, grand_total=grand_total)
