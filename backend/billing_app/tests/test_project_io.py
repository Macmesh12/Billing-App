from __future__ import annotations

import json
import shutil
import tempfile
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from django.test import TestCase
from django.utils import timezone

from billing_app.invoices.models import DocumentCounter, Invoice
from billing_app.services.project_io import (
    ProjectImportError,
    export_project_archive,
    import_project_archive,
)
from receipts.models import Receipt
from waybills.models import Waybill


class ProjectIOTestCase(TestCase):
    def setUp(self) -> None:
        super().setUp()
        self.assets_dir = Path(tempfile.mkdtemp(prefix="billproj-assets-"))
        self.addCleanup(lambda: shutil.rmtree(self.assets_dir, ignore_errors=True))
        settings_context = self.settings(PROJECT_ASSETS_DIR=self.assets_dir)
        settings_context.enable()
        self.addCleanup(settings_context.disable)

    def _create_sample_data(self) -> None:
        counter = DocumentCounter.get_instance()
        counter.invoice_counter = 5
        counter.receipt_counter = 3
        counter.waybill_counter = 4
        counter.save()

        Invoice.objects.create(
            id=10,
            customer_name="ACME Corp",
            classification="Standard",
            items=[{"description": "Widget", "quantity": 2, "unit_price": "15.00"}],
        )

        Receipt.objects.create(
            id=11,
            received_from="John Doe",
            amount=Decimal("120.00"),
            description="Payment",
        )

        Waybill.objects.create(
            id=12,
            customer_name="Logistics Ltd",
            destination="Accra",
            items=[{"description": "Crate", "quantity": 1}],
        )

        (self.assets_dir / "logo.png").write_bytes(b"fake-logo")

    def test_export_import_roundtrip(self) -> None:
        self._create_sample_data()

        archive_bytes = export_project_archive()
        self.assertGreater(len(archive_bytes), 0)

        Invoice.objects.all().delete()
        Receipt.objects.all().delete()
        Waybill.objects.all().delete()
        DocumentCounter.objects.all().delete()
        for child in self.assets_dir.iterdir():
            if child.is_file():
                child.unlink()

        summary = import_project_archive(BytesIO(archive_bytes))

        self.assertEqual(summary.invoices, 1)
        self.assertEqual(summary.receipts, 1)
        self.assertEqual(summary.waybills, 1)
        self.assertEqual(summary.assets, 1)

        counter = DocumentCounter.get_instance()
        self.assertEqual(counter.invoice_counter, 5)
        self.assertEqual(counter.receipt_counter, 3)
        self.assertEqual(counter.waybill_counter, 4)

        invoice = Invoice.objects.get(pk=10)
        self.assertEqual(invoice.customer_name, "ACME Corp")
        self.assertEqual(invoice.items[0]["description"], "Widget")

        receipt = Receipt.objects.get(pk=11)
        self.assertEqual(receipt.amount, Decimal("120.00"))

        waybill = Waybill.objects.get(pk=12)
        self.assertEqual(waybill.destination, "Accra")

        self.assertTrue((self.assets_dir / "logo.png").exists())
        self.assertEqual((self.assets_dir / "logo.png").read_bytes(), b"fake-logo")

    def test_import_rejects_unsupported_schema(self) -> None:
        buffer = BytesIO()
        with ZipFile(buffer, "w") as archive:
            archive.writestr("metadata.json", json.dumps({"schema_version": 99}))
            archive.writestr(
                "project.json",
                json.dumps({
                    "counters": {},
                    "invoices": [],
                    "receipts": [],
                    "waybills": [],
                }),
            )
        buffer.seek(0)

        with self.assertRaises(ProjectImportError):
            import_project_archive(buffer)
