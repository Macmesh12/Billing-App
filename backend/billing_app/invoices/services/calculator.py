"""
Invoice calculation service module.

This module handles all monetary calculations for invoices, including:
- Subtotal calculation from line items
- Tax and levy calculations based on configured rates
- Grand total computation

All calculations use Decimal for precision to avoid floating-point errors.
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
        subtotal: Sum of all line item totals (quantity * unit_price)
        levies: Dictionary mapping levy/tax names to their calculated amounts
        grand_total: Final total including subtotal and all levies
    """
    subtotal: Decimal
    levies: Dict[str, Decimal]
    grand_total: Decimal


def _to_decimal(value) -> Decimal:
    """
    Convert a value to Decimal with 2 decimal places.
    
    Args:
        value: Number to convert (int, float, string, or Decimal)
        
    Returns:
        Decimal value rounded to 2 decimal places using ROUND_HALF_UP
        
    Note:
        Returns Decimal("0.00") if value is None or empty
    """
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_totals(items: Iterable[dict]) -> InvoiceTotals:
    """
    Calculate invoice totals from line items using configured tax settings.
    
    This function:
    1. Calculates subtotal from all line items
    2. Applies each tax/levy from TAX_SETTINGS to the subtotal
    3. Sums all levies and adds to subtotal for grand total
    
    Args:
        items: Iterable of item dictionaries with 'quantity' and 'unit_price' keys
        
    Returns:
        InvoiceTotals object with subtotal, levies dict, and grand_total
        
    Example:
        items = [
            {"description": "Item 1", "quantity": 2, "unit_price": 10.50},
            {"description": "Item 2", "quantity": 1, "unit_price": 5.00}
        ]
        totals = calculate_totals(items)
        # totals.subtotal = Decimal("26.00")
        # totals.levies = {"NHIL": Decimal("0.65"), "VAT": Decimal("3.90"), ...}
        # totals.grand_total = Decimal("30.55")
    """
    # Calculate subtotal: sum of (quantity * unit_price) for all items
    subtotal = sum(
        _to_decimal(item.get("quantity", 0)) * _to_decimal(item.get("unit_price", 0))
        for item in items or []
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Calculate each levy/tax based on configured rates
    levies: Dict[str, Decimal] = {}
    levy_total = Decimal("0.00")
    for levy_name, rate in settings.TAX_SETTINGS.items():
        # Apply tax rate to subtotal
        levy_amount = (subtotal * Decimal(str(rate))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        levies[levy_name] = levy_amount
        levy_total += levy_amount

    # Calculate grand total: subtotal + all levies
    grand_total = subtotal + levy_total
    grand_total = grand_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return InvoiceTotals(subtotal=subtotal, levies=levies, grand_total=grand_total)
