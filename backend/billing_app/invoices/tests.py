from decimal import Decimal

from django.test import SimpleTestCase, override_settings

from .services import calculator, numbering


class NumberingTests(SimpleTestCase):
    def test_formats_invoice_number(self):
        self.assertEqual(numbering.format_invoice_number(None), "INV-NEW")
        self.assertEqual(numbering.format_invoice_number(12), "INV-00012")


@override_settings(TAX_SETTINGS={"NHIL": 0.025, "GETFUND": 0.025, "COVID": 0.01, "VAT": 0.15})
class CalculatorTests(SimpleTestCase):
    def test_calculates_totals(self):
        items = [
            {"description": "Item A", "quantity": 2, "unit_price": 50},
            {"description": "Item B", "quantity": 1, "unit_price": 100},
        ]
        totals = calculator.calculate_totals(items)
        self.assertEqual(totals.subtotal, Decimal("200.00"))
        self.assertEqual(totals.levies["NHIL"], Decimal("5.00"))
        self.assertEqual(totals.levies["GETFUND"], Decimal("5.00"))
        self.assertEqual(totals.levies["COVID"], Decimal("2.00"))
        self.assertEqual(totals.levies["VAT"], Decimal("30.00"))
        # Total: 200 + 5 + 5 + 2 + 30 = 242.00
        self.assertEqual(totals.grand_total, Decimal("242.00"))
