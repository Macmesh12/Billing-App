"""Counter service for coordinating document numbers.

The store prefers Firestore so numbers stay in sync across installs.
If Firestore is unavailable, we fall back to the local Django model.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, Literal

from django.apps import apps
from django.conf import settings

try:  # pragma: no cover - optional dependency
    from google.cloud import firestore  # type: ignore
    from google.api_core import exceptions as firestore_exceptions  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    firestore = None
    firestore_exceptions = None

logger = logging.getLogger(__name__)

DocumentType = Literal["invoice", "receipt", "waybill"]

_PREFIXES: Dict[DocumentType, str] = {
    "invoice": "INV",
    "receipt": "REC",
    "waybill": "WAY",
}

_FIELD_NAMES: Dict[DocumentType, str] = {
    "invoice": "invoice_counter",
    "receipt": "receipt_counter",
    "waybill": "waybill_counter",
}

_DEFAULT_START = 1


def _pad_width() -> int:
    width = getattr(settings, "FIREBASE_COUNTER_PAD", 3)
    return width if isinstance(width, int) and width > 0 else 3


def _format_number(doc_type: DocumentType, value: int) -> str:
    prefix = _PREFIXES[doc_type]
    return f"{prefix}-{value:0{_pad_width()}d}"


class BaseCounterStore:
    """Common helper behaviour for counter stores."""

    def peek(self, doc_type: DocumentType) -> str:
        raise NotImplementedError

    def reserve(self, doc_type: DocumentType) -> str:
        raise NotImplementedError

    def counts(self) -> Dict[str, int]:
        raise NotImplementedError


@dataclass
class FirestoreCounterStore(BaseCounterStore):
    """Firestore-backed counter store using a single document."""

    def __post_init__(self) -> None:
        if firestore is None:  # pragma: no cover - guarded earlier
            raise RuntimeError("google-cloud-firestore not installed")
        project_id = getattr(settings, "FIREBASE_PROJECT_ID", None)
        if not project_id:
            raise RuntimeError("FIREBASE_PROJECT_ID is not configured")
        self._client = firestore.Client(project=project_id)
        self._collection = getattr(settings, "FIREBASE_COUNTER_COLLECTION", "documentCounters")
        self._document = getattr(settings, "FIREBASE_COUNTER_DOCUMENT", "global")

    def _doc_ref(self):
        return self._client.collection(self._collection).document(self._document)

    def _default_state(self) -> Dict[str, int]:
        return {field: _DEFAULT_START for field in _FIELD_NAMES.values()}

    def _ensure_document(self) -> Dict[str, int]:
        doc_ref = self._doc_ref()
        snapshot = doc_ref.get()
        if snapshot.exists:
            data = snapshot.to_dict() or {}
        else:
            data = self._default_state()
            doc_ref.set(data)
        return {field: int(data.get(field, _DEFAULT_START)) for field in _FIELD_NAMES.values()}

    def peek(self, doc_type: DocumentType) -> str:
        data = self._ensure_document()
        field = _FIELD_NAMES[doc_type]
        return _format_number(doc_type, data[field])

    def reserve(self, doc_type: DocumentType) -> str:
        field = _FIELD_NAMES[doc_type]
        doc_ref = self._doc_ref()
        transaction = self._client.transaction()

        @firestore.transactional  # type: ignore[misc]
        def _transaction_body(transaction, field_name: str) -> int:
            snapshot = doc_ref.get(transaction=transaction)
            if snapshot.exists:
                data = snapshot.to_dict() or {}
            else:
                data = self._default_state()
                transaction.set(doc_ref, data)
            current = int(data.get(field_name, _DEFAULT_START))
            transaction.set(doc_ref, {field_name: current + 1}, merge=True)
            return current

        try:
            value = _transaction_body(transaction, field)
        except Exception as exc:  # pragma: no cover - network failure path
            raise RuntimeError(f"Firestore counter transaction failed: {exc}") from exc
        return _format_number(doc_type, value)

    def counts(self) -> Dict[str, int]:
        data = self._ensure_document()
        return {
            "invoice": data[_FIELD_NAMES["invoice"]] - 1,
            "receipt": data[_FIELD_NAMES["receipt"]] - 1,
            "waybill": data[_FIELD_NAMES["waybill"]] - 1,
        }


class DjangoModelCounterStore(BaseCounterStore):
    """Fallback counter store using the local DocumentCounter model."""

    @staticmethod
    def _model():
        return apps.get_model("invoices", "DocumentCounter")

    def peek(self, doc_type: DocumentType) -> str:
        model = self._model()
        instance = model.get_instance()
        field = _FIELD_NAMES[doc_type]
        value = getattr(instance, field, _DEFAULT_START)
        return _format_number(doc_type, value)

    def reserve(self, doc_type: DocumentType) -> str:
        model = self._model()
        if doc_type == "invoice":
            return model.get_next_invoice_number()
        if doc_type == "receipt":
            return model.get_next_receipt_number()
        return model.get_next_waybill_number()

    def counts(self) -> Dict[str, int]:
        model = self._model()
        data = model.get_current_counts()
        return {
            "invoice": data.get("invoices", 0),
            "receipt": data.get("receipts", 0),
            "waybill": data.get("waybills", 0),
        }


def _build_store() -> BaseCounterStore:
    if firestore is None:
        logger.info("Firestore SDK not available; using Django counter store")
        return DjangoModelCounterStore()
    project_id = getattr(settings, "FIREBASE_PROJECT_ID", None)
    if not project_id:
        logger.info("FIREBASE_PROJECT_ID not configured; using Django counter store")
        return DjangoModelCounterStore()
    # Skip Firestore in development if credentials aren't configured
    # This prevents blocking during local development
    try:
        # Quick check without blocking - use Django store if no credentials
        import os
        if not os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'):
            logger.info("No Firestore credentials found; using Django counter store")
            return DjangoModelCounterStore()
        return FirestoreCounterStore()
    except Exception as exc:  # pragma: no cover - fallback path
        if firestore_exceptions and isinstance(exc, firestore_exceptions.GoogleAPICallError):
            logger.warning("Firestore unavailable, falling back to Django counter store: %s", exc)
        else:
            logger.warning("Firestore initialisation failed, using fallback: %s", exc)
        return DjangoModelCounterStore()


_STORE: BaseCounterStore = _build_store()


def peek_document_number(doc_type: DocumentType) -> str:
    """Return the next number without incrementing."""
    return _STORE.peek(doc_type)


def reserve_document_number(doc_type: DocumentType) -> str:
    """Reserve and return the next document number."""
    return _STORE.reserve(doc_type)


def get_document_counts() -> Dict[str, int]:
    """Return the count of issued documents per type."""
    return _STORE.counts()
