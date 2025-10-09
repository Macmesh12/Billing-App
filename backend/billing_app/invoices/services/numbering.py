def format_invoice_number(pk: int | None) -> str:
    if pk is None:
        return "INV-NEW"
    return f"INV-{pk:05d}"
