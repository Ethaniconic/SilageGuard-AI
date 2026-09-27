import re


def is_valid_phone(phone: str) -> bool:
    return bool(re.fullmatch(r"\+?[0-9]{10,15}", phone))
