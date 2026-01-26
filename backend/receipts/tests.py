from django.test import SimpleTestCase

from .services import numbering


class NumberingTests(SimpleTestCase):
    def test_formats_receipt_number(self):
        self.assertEqual(numbering.format_receipt_number(None), "SPQ-NEW")
        import re
        val = numbering.format_receipt_number(42)
        self.assertRegex(val, r"^SPQ[A-Z]{2}\d{4}$")
