from django.test import SimpleTestCase

from .services import numbering


class NumberingTests(SimpleTestCase):
    def test_formats_waybill_number(self):
        self.assertEqual(numbering.format_waybill_number(None), "WB-NEW")
        self.assertEqual(numbering.format_waybill_number(7), "WB-00007")
