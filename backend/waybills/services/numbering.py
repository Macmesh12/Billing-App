def format_waybill_number(pk: int | None) -> str:
    if pk is None:
        return "WB-NEW"
    return f"WB-{pk:05d}"
