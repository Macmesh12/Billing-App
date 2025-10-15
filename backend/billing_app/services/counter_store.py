"""
============================================
COUNTER STORE SERVICE
============================================
This module manages document number generation and counters for
invoices, receipts, and waybills.

ARCHITECTURE:
- Prefers Firestore for cloud-based counters (sync across installs)
- Falls back to Django model if Firestore unavailable
- Uses atomic transactions to prevent number collisions

NUMBERING FORMAT:
- Invoice: INV-001, INV-002, ...
- Receipt: REC-001, REC-002, ...
- Waybill: WAY-001, WAY-002, ...

USAGE:
    from billing_app.services.counter_store import reserve_document_number
    
    # Reserve next invoice number (atomically increments counter)
    number = reserve_document_number("invoice")
    print(number)  # "INV-001"
    
    # Peek at next number without incrementing
    from billing_app.services.counter_store import peek_document_number
    next_num = peek_document_number("receipt")
    print(next_num)  # "REC-005"

DEPENDENCIES:
- google-cloud-firestore (optional, for cloud counters)
- invoices.DocumentCounter model (fallback)
- settings.FIREBASE_PROJECT_ID
- settings.FIREBASE_COUNTER_COLLECTION
- settings.FIREBASE_COUNTER_DOCUMENT
- settings.FIREBASE_COUNTER_PAD

THREAD SAFETY:
- Firestore: Uses atomic transactions
- Django: Uses select_for_update() in model methods
============================================
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

# ============================================
# TYPE DEFINITIONS
# ============================================
# Supported document types for counter operations
DocumentType = Literal["invoice", "receipt", "waybill"]

# ============================================
# CONFIGURATION CONSTANTS
# ============================================
# Prefix mapping for each document type
_PREFIXES: Dict[DocumentType, str] = {
    "invoice": "INV",   # Invoice numbers: INV-001, INV-002, ...
    "receipt": "REC",   # Receipt numbers: REC-001, REC-002, ...
    "waybill": "WAY",   # Waybill numbers: WAY-001, WAY-002, ...
}

# Field names in Firestore document / Django model
_FIELD_NAMES: Dict[DocumentType, str] = {
    "invoice": "invoice_counter",
    "receipt": "receipt_counter",
    "waybill": "waybill_counter",
}

# Starting counter value (first document will be 001)
_DEFAULT_START = 1


def _pad_width() -> int:
    """
    Get the number of digits for zero-padding from settings.
    Default is 3 digits (e.g., 001, 002, ..., 999).
    
    Returns:
        Integer width for zero-padding (minimum 3)
    """
    width = getattr(settings, "FIREBASE_COUNTER_PAD", 3)
    return width if isinstance(width, int) and width > 0 else 3


def _format_number(doc_type: DocumentType, value: int) -> str:
    """
    Format a document number with prefix and zero-padding.
    
    Args:
        doc_type: Type of document (invoice, receipt, waybill)
        value: Counter value (integer)
    
    Returns:
        Formatted document number string
        
    Examples:
        _format_number("invoice", 1) -> "INV-001"
        _format_number("receipt", 42) -> "REC-042"
        _format_number("waybill", 999) -> "WAY-999"
    """
    prefix = _PREFIXES[doc_type]
    return f"{prefix}-{value:0{_pad_width()}d}"


# ============================================
# BASE COUNTER STORE (ABSTRACT)
# ============================================
class BaseCounterStore:
    """
    Abstract base class for counter store implementations.
    Defines the interface that all stores must implement.
    """

    def peek(self, doc_type: DocumentType) -> str:
        """
        Return the next document number WITHOUT incrementing the counter.
        Useful for displaying placeholder numbers in the UI.
        
        Args:
            doc_type: Type of document (invoice, receipt, waybill)
        
        Returns:
            Next formatted document number (e.g., "INV-042")
        """
        raise NotImplementedError

    def reserve(self, doc_type: DocumentType) -> str:
        """
        Reserve and return the next document number (atomically increments counter).
        This is the main method for generating unique document numbers.
        
        Args:
            doc_type: Type of document (invoice, receipt, waybill)
        
        Returns:
            Reserved formatted document number (e.g., "REC-123")
        
        Note:
            This operation is atomic/transactional to prevent collisions.
        """
        raise NotImplementedError

    def counts(self) -> Dict[str, int]:
        """
        Return the count of issued documents for each type.
        Used for dashboard statistics.
        
        Returns:
            Dict with keys "invoice", "receipt", "waybill" and integer counts
            Example: {"invoice": 42, "receipt": 23, "waybill": 15}
        """
        raise NotImplementedError


# ============================================
# FIRESTORE COUNTER STORE (CLOUD-BASED)
# ============================================
@dataclass
class FirestoreCounterStore(BaseCounterStore):
    """
    Firestore-backed counter store using atomic transactions.
    Keeps counters in sync across multiple app instances.
    
    Storage Structure:
        Collection: documentCounters (configurable)
        Document: global (configurable)
        Fields: invoice_counter, receipt_counter, waybill_counter
    
    Example Firestore Document:
        {
            "invoice_counter": 42,
            "receipt_counter": 23,
            "waybill_counter": 15
        }
    
    Features:
        - Atomic transactions prevent number collisions
        - Shared across all app instances
        - Survives app restarts
        - Cloud-hosted (requires internet)
    """

    def __post_init__(self) -> None:
        """
        Initialize Firestore client and references.
        Called automatically after dataclass __init__.
        
        Raises:
            RuntimeError: If Firestore SDK not installed or project not configured
        """
        if firestore is None:  # pragma: no cover - guarded earlier
            raise RuntimeError("google-cloud-firestore not installed")
        
        # Get Firebase project ID from settings
        project_id = getattr(settings, "FIREBASE_PROJECT_ID", None)
        if not project_id:
            raise RuntimeError("FIREBASE_PROJECT_ID is not configured")
        
        # Initialize Firestore client
        self._client = firestore.Client(project=project_id)
        
        # Get collection and document names from settings
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


# ============================================
# DJANGO MODEL COUNTER STORE (LOCAL FALLBACK)
# ============================================
class DjangoModelCounterStore(BaseCounterStore):
    """
    Local database counter store using Django's DocumentCounter model.
    Used as fallback when Firestore is unavailable.
    
    Storage:
        - Single row in DocumentCounter table (SQLite/PostgreSQL)
        - Uses select_for_update() for atomic operations
        - Local to this app instance only
    
    Features:
        - No internet required
        - Fast local access
        - Survives app restarts (persisted in database)
        - Does NOT sync across multiple app instances
    """

    @staticmethod
    def _model():
        """
        Get DocumentCounter model dynamically to avoid circular imports.
        
        Returns:
            DocumentCounter model class
        """
        return apps.get_model("invoices", "DocumentCounter")

    def peek(self, doc_type: DocumentType) -> str:
        """
        Return next document number without incrementing.
        Reads current counter value from database.
        """
        model = self._model()
        instance = model.get_instance()
        field = _FIELD_NAMES[doc_type]
        value = getattr(instance, field, _DEFAULT_START)
        return _format_number(doc_type, value)

    def reserve(self, doc_type: DocumentType) -> str:
        """
        Reserve next document number (atomically increment counter).
        Delegates to model methods which use select_for_update().
        """
        model = self._model()
        # Call appropriate model method for each document type
        if doc_type == "invoice":
            return model.get_next_invoice_number()
        if doc_type == "receipt":
            return model.get_next_receipt_number()
        return model.get_next_waybill_number()

    def counts(self) -> Dict[str, int]:
        """
        Return count of issued documents.
        Reads from DocumentCounter model.
        """
        model = self._model()
        data = model.get_current_counts()
        return {
            "invoice": data.get("invoices", 0),
            "receipt": data.get("receipts", 0),
            "waybill": data.get("waybills", 0),
        }


# ============================================
# STORE INITIALIZATION WITH FALLBACK
# ============================================
def _build_store() -> BaseCounterStore:
    """
    Build and return the appropriate counter store instance.
    Tries Firestore first, falls back to Django model if unavailable.
    
    Decision Flow:
        1. Check if Firestore SDK is installed
        2. Check if FIREBASE_PROJECT_ID is configured
        3. Try to initialize FirestoreCounterStore
        4. Fall back to DjangoModelCounterStore on any error
    
    Returns:
        Counter store instance (Firestore or Django)
    """
    # Check if Firestore SDK is available
    if firestore is None:
        logger.info("Firestore SDK not available; using Django counter store")
        return DjangoModelCounterStore()
    
    # Check if Firebase project is configured
    project_id = getattr(settings, "FIREBASE_PROJECT_ID", None)
    if not project_id:
        logger.info("FIREBASE_PROJECT_ID not configured; using Django counter store")
        return DjangoModelCounterStore()
    
    # Try to initialize Firestore store
    try:
        return FirestoreCounterStore()
    except Exception as exc:  # pragma: no cover - fallback path
        # Log appropriate message based on exception type
        if firestore_exceptions and isinstance(exc, firestore_exceptions.GoogleAPICallError):
            logger.warning("Firestore unavailable, falling back to Django counter store: %s", exc)
        else:
            logger.warning("Firestore initialisation failed, using fallback: %s", exc)
        return DjangoModelCounterStore()


# Module-level singleton: initialized once at import time
_STORE: BaseCounterStore = _build_store()


# ============================================
# PUBLIC API FUNCTIONS
# ============================================
# These functions delegate to the chosen store instance
# and provide a consistent interface for the rest of the app

def peek_document_number(doc_type: DocumentType) -> str:
    """
    Return the next document number WITHOUT incrementing the counter.
    Useful for displaying placeholder numbers in forms.
    
    Args:
        doc_type: Type of document ("invoice", "receipt", or "waybill")
    
    Returns:
        Next formatted document number (e.g., "INV-042")
    
    Example:
        >>> peek_document_number("invoice")
        "INV-042"
    """
    return _STORE.peek(doc_type)


def reserve_document_number(doc_type: DocumentType) -> str:
    """
    Reserve and return the next document number (atomically increments counter).
    This is the main function for generating unique document numbers.
    
    Args:
        doc_type: Type of document ("invoice", "receipt", or "waybill")
    
    Returns:
        Reserved formatted document number (e.g., "REC-123")
    
    Example:
        >>> reserve_document_number("receipt")
        "REC-123"
    
    Note:
        This operation is atomic/transactional to prevent collisions.
    """
    return _STORE.reserve(doc_type)


def get_document_counts() -> Dict[str, int]:
    """
    Return the count of issued documents for each type.
    Used for dashboard statistics and analytics.
    
    Returns:
        Dictionary with counts for each document type
        Example: {"invoice": 42, "receipt": 23, "waybill": 15}
    
    Example:
        >>> counts = get_document_counts()
        >>> print(f"Total invoices: {counts['invoice']}")
        Total invoices: 42
    """
    return _STORE.counts()
