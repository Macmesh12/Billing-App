from django.test import SimpleTestCase

from .services import numbering


class NumberingTests(SimpleTestCase):
    def test_formats_receipt_number(self):
        self.assertEqual(numbering.format_receipt_number(None), "REC-NEW")
        self.assertEqual(numbering.format_receipt_number(42), "REC-00042")
