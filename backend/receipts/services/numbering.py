def format_receipt_number(pk: int | None) -> str:
    if pk is None:
        return "REC-NEW"
    return f"REC-{pk:05d}"
