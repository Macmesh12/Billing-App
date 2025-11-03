def format_waybill_number(pk: int | None) -> str:
    if pk is None:
        return "WAY000"
    return f"WAY{pk:03d}"
