"""
============================================
INVOICE CALCULATOR SERVICE
============================================
This module handles all monetary calculations for invoices.
It calculates subtotals, taxes/levies, and grand totals.

KEY FEATURES:
- Decimal-based arithmetic (no floating point errors)
- Configurable tax rates from settings.TAX_SETTINGS
- Banker's rounding (ROUND_HALF_UP) to 2 decimal places
- Type-safe calculation results via dataclass

USAGE:
    from invoices.services.calculator import calculate_totals
    
    items = [
        {"quantity": 2, "unit_price": 100.00},
        {"quantity": 1, "unit_price": 50.00}
    ]
    totals = calculate_totals(items)
    print(totals.subtotal)      # Decimal('250.00')
    print(totals.levies)        # {'NHIL': Decimal('6.25'), ...}
    print(totals.grand_total)   # Decimal('285.00')

DEPENDENCIES:
- settings.TAX_SETTINGS: Dict of tax rates (NHIL, GETFUND, COVID, VAT)
============================================
"""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Iterable

from django.conf import settings


@dataclass
class InvoiceTotals:
    """
    Data class for invoice calculation results.
    All amounts are Decimal to avoid floating point errors.
    """
    subtotal: Decimal               # Sum of all line items (qty × price)
    levies: Dict[str, Decimal]      # Individual tax amounts by name
    grand_total: Decimal            # Subtotal + all levies


def _to_decimal(value) -> Decimal:
    """
    Convert a value to Decimal with 2 decimal places.
    Uses banker's rounding (ROUND_HALF_UP).
    
    Args:
        value: Number to convert (can be int, float, str, or Decimal)
    
    Returns:
        Decimal rounded to 2 decimal places
    
    Examples:
        _to_decimal(100) -> Decimal('100.00')
        _to_decimal("123.456") -> Decimal('123.46')
        _to_decimal(None) -> Decimal('0.00')
    """
    # If already Decimal, return as-is
    if isinstance(value, Decimal):
        return value
    
    # Convert to Decimal via string (avoids float precision issues)
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_totals(items: Iterable[dict]) -> InvoiceTotals:
    """
    Calculate invoice totals including subtotal, levies, and grand total.
    
    Args:
        items: List of line item dicts with 'quantity' and 'unit_price' keys
               Example: [{"quantity": 2, "unit_price": 100.00}, ...]
    
    Returns:
        InvoiceTotals with calculated subtotal, levies, and grand_total
    
    Calculation Flow:
        1. Subtotal = sum(quantity × unit_price) for all items
        2. For each tax in settings.TAX_SETTINGS:
           levy_amount = subtotal × tax_rate
        3. Grand Total = subtotal + sum(all levies)
    
    Note:
        All calculations use Decimal for precision.
        Results are rounded to 2 decimal places using ROUND_HALF_UP.
    """
    # ============================================
    # Calculate subtotal from line items
    # ============================================
    # Sum of (quantity × unit_price) for each item
    subtotal = sum(
        _to_decimal(item.get("quantity", 0)) * _to_decimal(item.get("unit_price", 0))
        for item in items or []
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # ============================================
    # Calculate levies (taxes) from subtotal
    # ============================================
    levies: Dict[str, Decimal] = {}
    levy_total = Decimal("0.00")
    
    # Iterate through each tax defined in settings
    for levy_name, rate in settings.TAX_SETTINGS.items():
        # Calculate tax amount: subtotal × rate
        levy_amount = (subtotal * Decimal(str(rate))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        levies[levy_name] = levy_amount
        levy_total += levy_amount

    # ============================================
    # Calculate grand total
    # ============================================
    grand_total = subtotal + levy_total
    grand_total = grand_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return InvoiceTotals(subtotal=subtotal, levies=levies, grand_total=grand_total)
