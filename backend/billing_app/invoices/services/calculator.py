"""
Invoice calculation service for computing totals, taxes, and levies.

This module provides precise decimal-based calculations for invoice totals,
including subtotals, tax/levy amounts, and grand totals. All calculations
use Python's Decimal type to avoid floating-point precision issues common
in financial calculations.
"""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Iterable

from django.conf import settings


@dataclass
class InvoiceTotals:
    """
    Data class holding calculated invoice totals.
    
    Attributes:
        subtotal: Sum of all line items (before taxes/levies)
        levies: Dictionary mapping levy name to calculated amount
        grand_total: Final total including subtotal and all levies
    """
    subtotal: Decimal
    levies: Dict[str, Decimal]
    grand_total: Decimal


def _to_decimal(value) -> Decimal:
    """
    Convert numeric value to Decimal with 2 decimal places.
    
    Safely converts various numeric types (int, float, str, Decimal)
    to Decimal with proper rounding. Uses ROUND_HALF_UP to round
    values like 0.125 to 0.13 (traditional rounding).
    
    Args:
        value: Numeric value to convert (int, float, str, or Decimal)
    
    Returns:
        Decimal: Value converted to Decimal with 2 decimal places
    """
    # If already Decimal, return as-is
    if isinstance(value, Decimal):
        return value
    # Convert to string first to avoid float precision issues, then to Decimal
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_totals(items: Iterable[dict]) -> InvoiceTotals:
    """
    Calculate invoice subtotal, levies, and grand total from line items.
    
    Computes:
    1. Subtotal: Sum of (quantity × unit_price) for all items
    2. Levies: Tax amounts calculated as percentages of subtotal
    3. Grand Total: Subtotal plus all levies
    
    Tax/levy rates are read from settings.TAX_SETTINGS, which should be
    a dictionary mapping levy names to rates (e.g., {"VAT": 0.15} for 15%).
    
    Args:
        items: Iterable of item dictionaries, each with keys:
               - quantity: Item quantity (numeric)
               - unit_price: Price per unit (numeric)
    
    Returns:
        InvoiceTotals: Object containing subtotal, levies dict, and grand_total
    
    Example:
        >>> items = [{"quantity": 2, "unit_price": 10.50}]
        >>> totals = calculate_totals(items)
        >>> print(totals.subtotal)  # Decimal('21.00')
    """
    # Calculate subtotal: sum of (quantity × unit_price) for all items
    subtotal = sum(
        _to_decimal(item.get("quantity", 0)) * _to_decimal(item.get("unit_price", 0))
        for item in items or []
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Calculate each levy/tax as percentage of subtotal
    levies: Dict[str, Decimal] = {}
    levy_total = Decimal("0.00")
    for levy_name, rate in settings.TAX_SETTINGS.items():
        # Calculate levy amount: subtotal × rate (e.g., subtotal × 0.15 for 15% VAT)
        levy_amount = (subtotal * Decimal(str(rate))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        levies[levy_name] = levy_amount
        levy_total += levy_amount

    # Calculate grand total: subtotal + all levies
    grand_total = subtotal + levy_total
    grand_total = grand_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return InvoiceTotals(subtotal=subtotal, levies=levies, grand_total=grand_total)
