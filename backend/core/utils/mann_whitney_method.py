"""Which method of scipy.stats.mannwhitneyu a call asks for.

Left to SciPy, the test is counted exactly whenever one group has at most 8 values and no value
occurs twice, whatever the size of the other group. Against a very large group that count runs
for longer than the web server waits for an answer: 8 values against 100,000 take more than half
a minute for the bare call.

Above LARGEST_GROUP_LEFT_TO_SCIPY values in the larger group the normal approximation is asked
for by name. Up to that size nothing changes: the method is left to SciPy, as before.
"""

LARGEST_GROUP_LEFT_TO_SCIPY = 1000


def mann_whitney_method(n1: int, n2: int) -> str:
    """The `method` argument for two groups of these sizes."""
    return "asymptotic" if max(n1, n2) > LARGEST_GROUP_LEFT_TO_SCIPY else "auto"
