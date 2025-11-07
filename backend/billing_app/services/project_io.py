from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from typing import Any, BinaryIO, Dict, Iterable
from zipfile import ZIP_DEFLATED, ZipFile

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from billing_app.invoices.models import DocumentCounter, Invoice
from receipts.models import Receipt
from waybills.models import Waybill


def _get_schema_version() -> int:
    return getattr(settings, "PROJECT_EXPORT_SCHEMA_VERSION", 1)


def _get_assets_dir() -> Path:
    default_root = Path(getattr(settings, "BASE_DIR", ".")).resolve().parent / "assets"
    return Path(getattr(settings, "PROJECT_ASSETS_DIR", default_root))


class ProjectImportError(Exception):
    """Raised when a .billproj archive cannot be imported."""


@dataclass(frozen=True)
class ProjectSummary:
    invoices: int
    receipts: int
    waybills: int
    assets: int

    def as_dict(self) -> Dict[str, int]:
        return {
            "invoices": self.invoices,
            "receipts": self.receipts,
            "waybills": self.waybills,
            "assets": self.assets,
        }


def export_project_archive() -> bytes:
    """Serialize the full application state into a .billproj archive."""
    counters = DocumentCounter.get_instance()

    invoices_payload = [_serialize_invoice(invoice) for invoice in Invoice.objects.all().order_by("id")]
    receipts_payload = [_serialize_receipt(receipt) for receipt in Receipt.objects.all().order_by("id")]
    waybills_payload = [_serialize_waybill(waybill) for waybill in Waybill.objects.all().order_by("id")]

    metadata = {
        "schema_version": _get_schema_version(),
        "exported_at": timezone.now().isoformat(),
        "app_version": getattr(settings, "PROJECT_APP_VERSION", "0.1.0"),
    }

    project_payload = {
        "counters": {
            "invoice_counter": counters.invoice_counter,
            "receipt_counter": counters.receipt_counter,
            "waybill_counter": counters.waybill_counter,
        },
        "invoices": invoices_payload,
        "receipts": receipts_payload,
        "waybills": waybills_payload,
    }

    buffer = BytesIO()
    with ZipFile(buffer, mode="w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("metadata.json", json.dumps(metadata, indent=2))
        archive.writestr("project.json", json.dumps(project_payload, indent=2))

        assets_dir = _get_assets_dir()
        if assets_dir.exists():
            for asset in _iter_asset_files(assets_dir):
                archive.write(asset, f"assets/{asset.relative_to(assets_dir)}")

    return buffer.getvalue()


def import_project_archive(archive_file: BinaryIO) -> ProjectSummary:
    """Load a .billproj archive into the current database."""
    try:
        with ZipFile(archive_file) as archive:
            metadata = json.loads(archive.read("metadata.json"))
            project_payload = json.loads(archive.read("project.json"))
            asset_members = [name for name in archive.namelist() if name.startswith("assets/")]

            _validate_schema_version(metadata.get("schema_version"))

            counters_data = project_payload.get("counters") or {}
            invoices_data = project_payload.get("invoices") or []
            receipts_data = project_payload.get("receipts") or []
            waybills_data = project_payload.get("waybills") or []

            with transaction.atomic():
                _replace_documents(invoices_data, receipts_data, waybills_data)
                _replace_counters(counters_data)
                assets_count = _replace_assets(archive, asset_members)

            return ProjectSummary(
                invoices=len(invoices_data),
                receipts=len(receipts_data),
                waybills=len(waybills_data),
                assets=assets_count,
            )
    except KeyError as exc:  # missing archive member
        raise ProjectImportError(f"Archive missing required file: {exc!s}") from exc
    except (json.JSONDecodeError, ValueError) as exc:
        raise ProjectImportError("Archive content is not valid JSON") from exc
    except ProjectImportError:
        raise
    except Exception as exc:  # pragma: no cover - defensive guard
        raise ProjectImportError("Failed to import archive") from exc


def _serialize_invoice(invoice: Invoice) -> Dict[str, Any]:
    return {
        "id": invoice.pk,
        "customer_name": invoice.customer_name,
        "issue_date": invoice.issue_date.isoformat() if invoice.issue_date else None,
        "classification": invoice.classification,
        "items": invoice.items,
        "subtotal": _decimal_to_str(invoice.subtotal),
        "levies": invoice.levies,
        "grand_total": _decimal_to_str(invoice.grand_total),
        "created_at": _dt_to_iso(invoice.created_at),
        "updated_at": _dt_to_iso(invoice.updated_at),
    }


def _serialize_receipt(receipt: Receipt) -> Dict[str, Any]:
    return {
        "id": receipt.pk,
        "received_from": receipt.received_from,
        "issue_date": receipt.issue_date.isoformat() if receipt.issue_date else None,
        "amount": _decimal_to_str(receipt.amount),
        "description": receipt.description,
        "payment_method": receipt.payment_method,
        "approved_by": receipt.approved_by,
        "created_at": _dt_to_iso(receipt.created_at),
        "updated_at": _dt_to_iso(receipt.updated_at),
    }


def _serialize_waybill(waybill: Waybill) -> Dict[str, Any]:
    return {
        "id": waybill.pk,
        "customer_name": waybill.customer_name,
        "issue_date": waybill.issue_date.isoformat() if waybill.issue_date else None,
        "destination": waybill.destination,
        "driver_name": waybill.driver_name,
        "receiver_name": waybill.receiver_name,
        "items": waybill.items,
        "created_at": _dt_to_iso(waybill.created_at),
        "updated_at": _dt_to_iso(waybill.updated_at),
    }


def _decimal_to_str(value: Decimal) -> str:
    return format(value, "f")


def _dt_to_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if timezone.is_naive(value):
        value = timezone.make_aware(value)
    return value.isoformat()


def _parse_date(value: str | None):
    if not value:
        return None
    return datetime.fromisoformat(value).date()


def _parse_datetime(value: str | None):
    if not value:
        return None
    dt = datetime.fromisoformat(value)
    if timezone.is_naive(dt):
        return timezone.make_aware(dt)
    return dt


def _parse_decimal(value: str | int | float | None) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _replace_documents(invoices: Iterable[Dict[str, Any]], receipts: Iterable[Dict[str, Any]], waybills: Iterable[Dict[str, Any]]) -> None:
    Invoice.objects.all().delete()
    Receipt.objects.all().delete()
    Waybill.objects.all().delete()

    invoice_objects = [
        Invoice(
            id=data["id"],
            customer_name=data.get("customer_name", ""),
            issue_date=_parse_date(data.get("issue_date")) or timezone.localdate(),
            classification=data.get("classification", ""),
            items=data.get("items", []),
            subtotal=_parse_decimal(data.get("subtotal")),
            levies=data.get("levies", {}),
            grand_total=_parse_decimal(data.get("grand_total")),
            created_at=_parse_datetime(data.get("created_at")) or timezone.now(),
            updated_at=_parse_datetime(data.get("updated_at")) or timezone.now(),
        )
        for data in invoices
    ]

    receipt_objects = [
        Receipt(
            id=data["id"],
            received_from=data.get("received_from", ""),
            issue_date=_parse_date(data.get("issue_date")) or timezone.localdate(),
            amount=_parse_decimal(data.get("amount")),
            description=data.get("description", ""),
            payment_method=data.get("payment_method", ""),
            approved_by=data.get("approved_by", ""),
            created_at=_parse_datetime(data.get("created_at")) or timezone.now(),
            updated_at=_parse_datetime(data.get("updated_at")) or timezone.now(),
        )
        for data in receipts
    ]

    waybill_objects = [
        Waybill(
            id=data["id"],
            customer_name=data.get("customer_name", ""),
            issue_date=_parse_date(data.get("issue_date")) or timezone.localdate(),
            destination=data.get("destination", ""),
            driver_name=data.get("driver_name", ""),
            receiver_name=data.get("receiver_name", ""),
            items=data.get("items", []),
            created_at=_parse_datetime(data.get("created_at")) or timezone.now(),
            updated_at=_parse_datetime(data.get("updated_at")) or timezone.now(),
        )
        for data in waybills
    ]

    if invoice_objects:
        Invoice.objects.bulk_create(invoice_objects)
    if receipt_objects:
        Receipt.objects.bulk_create(receipt_objects)
    if waybill_objects:
        Waybill.objects.bulk_create(waybill_objects)


def _replace_counters(data: Dict[str, Any]) -> None:
    defaults = {
        "invoice_counter": int(data.get("invoice_counter", 1)),
        "receipt_counter": int(data.get("receipt_counter", 1)),
        "waybill_counter": int(data.get("waybill_counter", 1)),
    }
    DocumentCounter.objects.update_or_create(pk=1, defaults=defaults)


def _replace_assets(archive: ZipFile, members: Iterable[str]) -> int:
    assets_dir = _get_assets_dir()

    if not assets_dir.exists():
        assets_dir.mkdir(parents=True, exist_ok=True)
    else:
        for child in assets_dir.iterdir():
            if child.is_file() or child.is_symlink():
                child.unlink(missing_ok=True)  # type: ignore[arg-type]
            else:
                shutil.rmtree(child)

    count = 0
    for member in members:
        if member.endswith("/"):
            continue
        try:
            relative = Path(member).relative_to("assets")
        except ValueError:
            continue  # Skip anything outside assets/
        if any(part == ".." for part in relative.parts):
            continue
        target_path = assets_dir / relative
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(member) as source, target_path.open("wb") as destination:
            shutil.copyfileobj(source, destination)
        count += 1
    return count


def _iter_asset_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if path.is_file():
            yield path


def _validate_schema_version(version: Any) -> None:
    expected = _get_schema_version()
    if version != expected:
        raise ProjectImportError(
            f"Unsupported project schema version: {version!r}. Expected {expected}."
        )
