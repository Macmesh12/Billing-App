def format_invoice_number(pk: int | None) -> str:
    if pk is None:
        return "INV000"
    return f"INV{pk:03d}"
