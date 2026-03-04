"""Token count estimation utility."""


def estimate_tokens(text: str) -> int:
    """Estimate token count using ~4 chars/token heuristic, minimum 1."""
    return max(1, len(text) // 4)
