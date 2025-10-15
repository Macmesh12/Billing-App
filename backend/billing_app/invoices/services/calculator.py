"""
Invoice calculation service.

This module handles all monetary calculations for invoices including:
- Subtotal calculation from line items
- Tax/levy calculations (NHIL, GETFUND, COVID, VAT)
- Grand total calculation

IMPORTANT: All monetary calculations use Decimal arithmetic to avoid
floating-point precision errors. Values are always rounded to 2 decimal
places using ROUND_HALF_UP (banker's rounding).

TAX CONFIGURATION:
Taxes and levies are configured in settings.TAX_SETTINGS and typically include:
- NHIL: National Health Insurance Levy (2.5%)
- GETFUND: Ghana Education Trust Fund levy (2.5%)
- COVID: COVID-19 levy (1%)
- VAT: Value Added Tax (15%)
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
        subtotal: Sum of all line items (before taxes)
        levies: Dictionary mapping levy names to amounts (e.g., {"VAT": Decimal("30.00")})
        grand_total: Final total including all levies and taxes
    """
    subtotal: Decimal
    levies: Dict[str, Decimal]
    grand_total: Decimal


def _to_decimal(value) -> Decimal:
    """
    Convert a value to Decimal with proper precision.
    
    Ensures consistent decimal handling across the system. All values
    are quantized to 2 decimal places using ROUND_HALF_UP.
    
    Args:
        value: Value to convert (int, float, str, or Decimal)
        
    Returns:
        Decimal value rounded to 2 decimal places
    """
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_totals(items: Iterable[dict]) -> InvoiceTotals:
    """
    Calculate invoice totals from line items.
    
    This is the main calculation function used by both the form and API.
    It computes:
    1. Subtotal: sum of (quantity × unit_price) for all items
    2. Levies: each tax/levy as percentage of subtotal
    3. Grand total: subtotal + sum of all levies
    
    All calculations use Decimal arithmetic for precision.
    
    Args:
        items: Iterable of item dictionaries with keys:
            - quantity: Item quantity (number)
            - unit_price: Price per unit (number)
            
    Returns:
        InvoiceTotals object with calculated values
        
    Example:
        >>> items = [
        ...     {"quantity": 2, "unit_price": 50},
        ...     {"quantity": 1, "unit_price": 100}
        ... ]
        >>> totals = calculate_totals(items)
        >>> print(totals.subtotal)
        200.00
    """
    # Calculate subtotal: sum of all line item totals
    subtotal = sum(
        _to_decimal(item.get("quantity", 0)) * _to_decimal(item.get("unit_price", 0))
        for item in items or []
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Calculate each levy/tax as percentage of subtotal
    levies: Dict[str, Decimal] = {}
    levy_total = Decimal("0.00")
    for levy_name, rate in settings.TAX_SETTINGS.items():
        levy_amount = (subtotal * Decimal(str(rate))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        levies[levy_name] = levy_amount
        levy_total += levy_amount

    # Calculate grand total: subtotal + all levies
    grand_total = subtotal + levy_total
    grand_total = grand_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return InvoiceTotals(subtotal=subtotal, levies=levies, grand_total=grand_total)
