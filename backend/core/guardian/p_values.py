"""p-values in Guardian's messages and PDF report, written the way the site writes them.

Mirrors frontend/src/utils/formatStats.js (formatPValue / formatPClause): three significant
figures below 0.001 ("3.20e-9"), four decimals above ("0.0312"), and "< 2.2e-16" for a p-value of
exactly 0, which a double-precision calculation returns only once the tail has underflowed or
rounded to 0. Writing them with a fixed four decimals printed 3.2e-9 as "0.0000".
"""

BELOW_EPSILON = "< 2.2e-16"


def format_p(p) -> str:
    """The p-value alone: "3.20e-9", "0.0312", "< 2.2e-16"; an em dash when there is none."""
    if p is None:
        return "—"
    p = float(p)
    if p != p:  # NaN
        return "—"
    if p == 0:
        return BELOW_EPSILON
    if p < 0.001:
        mantissa, exponent = f"{p:.2e}".split("e")
        return f"{mantissa}e{int(exponent)}"
    return f"{p:.4f}"


def p_clause(p) -> str:
    """The p-value as a clause: "p = 3.20e-9", or "p < 2.2e-16" where "p = < 2.2e-16" would not read."""
    text = format_p(p)
    return f"p {text}" if text.startswith("<") else f"p = {text}"
