def format_receipt_number(pk: int | None) -> str:
    if pk is None:
        return "REC000"
    return f"REC{pk:03d}"
