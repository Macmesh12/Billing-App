import secrets
import string


def _random_suffix() -> str:
    letters = ''.join(secrets.choice(string.ascii_uppercase) for _ in range(2))
    digits = ''.join(secrets.choice(string.digits) for _ in range(4))
    return f"{letters}{digits}"


def format_waybill_number(pk: int | None) -> str:
    if pk is None:
        return "SPQ-NEW"
    return f"SPQ{_random_suffix()}"
