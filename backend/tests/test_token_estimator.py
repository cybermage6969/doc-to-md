"""Tests for token estimator utility."""
from utils.token_estimator import estimate_tokens


class TestEstimateTokens:
    def test_empty_string_returns_minimum(self):
        assert estimate_tokens("") == 1

    def test_400_chars_returns_100(self):
        assert estimate_tokens("a" * 400) == 100

    def test_returns_int(self):
        result = estimate_tokens("hello world")
        assert isinstance(result, int)

    def test_short_string_returns_minimum(self):
        assert estimate_tokens("hi") == 1

    def test_1000_chars(self):
        assert estimate_tokens("x" * 1000) == 250
