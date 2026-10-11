def split_duration(total_seconds: int) -> list[int]:
    hours = total_seconds // 3600
    remaining = total_seconds % 3600
    return [hours, remaining // 60, remaining % 60]
