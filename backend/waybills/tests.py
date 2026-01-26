from django.test import SimpleTestCase

from .services import numbering


class NumberingTests(SimpleTestCase):
    def test_formats_waybill_number(self):
        self.assertEqual(numbering.format_waybill_number(None), "SPQ-NEW")
        import re
        val = numbering.format_waybill_number(7)
        self.assertRegex(val, r"^SPQ[A-Z]{2}\d{4}$")
