"""
P-Curve Input Parser
====================

Parses various test statistics and converts them to p-values
for p-curve analysis.

Supports:
- t-tests (one-sample, two-sample, paired)
- F-tests (ANOVA)
- Chi-square tests
- Z-tests
- Correlation (r)
- Direct p-value input

Created: December 26, 2025
"""

from typing import Dict, Any, List, Optional, Tuple, Union
from dataclasses import dataclass, asdict
import re
import numpy as np
from scipy import stats


@dataclass
class PCurveInput:
    """Parsed input for p-curve analysis."""

    study_id: str
    test_type: str  # t, F, chi2, z, r, p
    statistic: float
    df1: Optional[float] = None  # degrees of freedom 1
    df2: Optional[float] = None  # degrees of freedom 2 (for F-test)
    n: Optional[int] = None  # sample size (for r)
    p_value: Optional[float] = None  # computed or provided
    original_string: str = ""
    is_valid: bool = True
    error_message: str = ""
    is_bound: bool = False  # True if input was an inequality (e.g. "p < .05")

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def parse_test_statistic(input_string: str, study_id: str = "") -> PCurveInput:
    """
    Parse a test statistic string and convert to p-value.

    Supports formats:
    - t(df) = value or t(df)=value
    - F(df1, df2) = value
    - chi2(df) = value or X2(df) = value
    - z = value
    - r(n) = value or r(df) = value
    - p = value

    Args:
        input_string: String containing test statistic
        study_id: Optional study identifier

    Returns:
        PCurveInput object with parsed values and computed p-value

    Examples:
        >>> parse_test_statistic("t(24) = 2.45")
        PCurveInput(test_type='t', statistic=2.45, df1=24, p_value=0.022)

        >>> parse_test_statistic("F(2, 45) = 4.56")
        PCurveInput(test_type='F', statistic=4.56, df1=2, df2=45, p_value=0.016)
    """
    input_string = input_string.strip()
    original = input_string

    # Normalize input
    input_string = input_string.replace(" ", "").lower()

    # Pattern for t-test: t(df) = value
    t_pattern = r"t\((\d+\.?\d*)\)\s*=\s*(-?\d+\.?\d*)"
    t_match = re.search(t_pattern, input_string)
    if t_match:
        df = float(t_match.group(1))
        t_stat = float(t_match.group(2))
        p_value = 2 * (stats.t.sf(abs(t_stat), df))  # Two-tailed
        return PCurveInput(
            study_id=study_id, test_type="t", statistic=t_stat, df1=df, p_value=float(p_value), original_string=original
        )

    # Pattern for F-test: F(df1, df2) = value
    f_pattern = r"f\((\d+\.?\d*)\s*,\s*(\d+\.?\d*)\)\s*=\s*(\d+\.?\d*)"
    f_match = re.search(f_pattern, input_string)
    if f_match:
        df1 = float(f_match.group(1))
        df2 = float(f_match.group(2))
        f_stat = float(f_match.group(3))
        p_value = stats.f.sf(f_stat, df1, df2)
        return PCurveInput(
            study_id=study_id,
            test_type="F",
            statistic=f_stat,
            df1=df1,
            df2=df2,
            p_value=float(p_value),
            original_string=original,
        )

    # Pattern for chi-square: chi2(df) = value or x2(df) = value
    chi2_pattern = r"(?:chi2|x2|χ2)\((\d+\.?\d*)\)\s*=\s*(\d+\.?\d*)"
    chi2_match = re.search(chi2_pattern, input_string)
    if chi2_match:
        df = float(chi2_match.group(1))
        chi2_stat = float(chi2_match.group(2))
        p_value = stats.chi2.sf(chi2_stat, df)
        return PCurveInput(
            study_id=study_id,
            test_type="chi2",
            statistic=chi2_stat,
            df1=df,
            p_value=float(p_value),
            original_string=original,
        )

    # Pattern for z-test: z = value
    z_pattern = r"z\s*=\s*(-?\d+\.?\d*)"
    z_match = re.search(z_pattern, input_string)
    if z_match:
        z_stat = float(z_match.group(1))
        p_value = 2 * (stats.norm.sf(abs(z_stat)))  # Two-tailed
        return PCurveInput(
            study_id=study_id, test_type="z", statistic=z_stat, p_value=float(p_value), original_string=original
        )

    # Pattern for correlation: r(n) = value or r(df) = value
    r_pattern = r"r\((\d+)\)\s*=\s*(-?\d*\.?\d+)"
    r_match = re.search(r_pattern, input_string)
    if r_match:
        # APA convention: r(df) with df = n - 2, so the captured number is df.
        # (The previous code applied a discontinuous "+2 if <=10 else n" heuristic
        # that made df non-monotonic and mis-derived the p-value.)
        df = int(r_match.group(1))
        r_stat = float(r_match.group(2))
        n = df + 2
        t_stat = r_stat * np.sqrt(df / (1 - r_stat**2)) if abs(r_stat) < 1 else 0.0
        p_value = 2 * stats.t.sf(abs(t_stat), df)
        return PCurveInput(
            study_id=study_id,
            test_type="r",
            statistic=r_stat,
            df1=df,
            n=n,
            p_value=float(p_value),
            original_string=original,
        )

    # Pattern for direct p-value: p = value  (or a bound  p < value)
    p_pattern = r"p\s*([=<])\s*(\d*\.?\d+)"
    p_match = re.search(p_pattern, input_string)
    if p_match:
        op = p_match.group(1)
        p_value = float(p_match.group(2))
        if op == "<":
            # A bound (e.g. "p < .05") cannot be placed in a p-curve bin and is
            # excluded per the p-curve protocol (the old code silently treated it
            # as an exact p = value, which biases bin placement and pp-values).
            # The user should supply the exact p-value or the test statistic.
            return PCurveInput(
                study_id=study_id,
                test_type="p",
                statistic=p_value,
                p_value=None,
                is_bound=True,
                is_valid=False,
                error_message=(
                    f"'{original}' is a bound (inequality). Provide an exact p-value "
                    "or the test statistic (e.g. t(48)=2.10) for p-curve analysis."
                ),
                original_string=original,
            )
        return PCurveInput(
            study_id=study_id, test_type="p", statistic=p_value, p_value=float(p_value), original_string=original
        )

    # Could not parse
    return PCurveInput(
        study_id=study_id,
        test_type="unknown",
        statistic=0,
        p_value=None,
        original_string=original,
        is_valid=False,
        error_message=f"Could not parse: {original}",
    )


def convert_to_pvalue(
    test_type: str,
    statistic: float,
    df1: float = None,
    df2: float = None,
    n: int = None,
    alternative: str = "two-sided",
) -> float:
    """
    Convert a test statistic to a p-value.

    Args:
        test_type: Type of test ('t', 'F', 'chi2', 'z', 'r')
        statistic: Test statistic value
        df1: Degrees of freedom 1
        df2: Degrees of freedom 2 (for F-test)
        n: Sample size (for correlation)
        alternative: 'two-sided', 'greater', or 'less'

    Returns:
        P-value
    """
    if test_type.lower() == "t":
        if df1 is None:
            raise ValueError("df1 required for t-test")
        if alternative == "two-sided":
            p = 2 * (stats.t.sf(abs(statistic), df1))
        elif alternative == "greater":
            p = stats.t.sf(statistic, df1)
        else:
            p = stats.t.cdf(statistic, df1)
        return float(p)

    elif test_type.lower() == "f":
        if df1 is None or df2 is None:
            raise ValueError("df1 and df2 required for F-test")
        return float(stats.f.sf(statistic, df1, df2))

    elif test_type.lower() in ["chi2", "x2"]:
        if df1 is None:
            raise ValueError("df required for chi-square test")
        return float(stats.chi2.sf(statistic, df1))

    elif test_type.lower() == "z":
        if alternative == "two-sided":
            p = 2 * (stats.norm.sf(abs(statistic)))
        elif alternative == "greater":
            p = stats.norm.sf(statistic)
        else:
            p = stats.norm.cdf(statistic)
        return float(p)

    elif test_type.lower() == "r":
        if n is None and df1 is None:
            raise ValueError("n or df required for correlation")
        df = df1 if df1 is not None else n - 2
        # Convert r to t
        if abs(statistic) < 1:
            t_stat = statistic * np.sqrt(df / (1 - statistic**2))
            if alternative == "two-sided":
                p = 2 * (stats.t.sf(abs(t_stat), df))
            elif alternative == "greater":
                p = stats.t.sf(t_stat, df)
            else:
                p = stats.t.cdf(t_stat, df)
            return float(p)
        else:
            return 0.0  # r = +/- 1

    else:
        raise ValueError(f"Unknown test type: {test_type}")


def parse_multiple_studies(inputs: List[Union[str, Dict[str, Any]]]) -> Tuple[List[PCurveInput], List[str]]:
    """
    Parse multiple study inputs for p-curve analysis.

    Args:
        inputs: List of input strings or dictionaries with test statistics

    Returns:
        Tuple of (parsed_inputs, errors)

    Example:
        >>> inputs = [
        ...     "t(24) = 2.45",
        ...     "F(2, 45) = 4.56",
        ...     {"test_type": "t", "statistic": 3.12, "df1": 30}
        ... ]
        >>> parsed, errors = parse_multiple_studies(inputs)
    """
    parsed = []
    errors = []

    for i, inp in enumerate(inputs):
        study_id = f"Study_{i+1}"

        if isinstance(inp, str):
            result = parse_test_statistic(inp, study_id)
        elif isinstance(inp, dict):
            # Direct specification
            try:
                if "p_value" in inp:
                    p_val = inp["p_value"]
                else:
                    p_val = convert_to_pvalue(
                        test_type=inp["test_type"],
                        statistic=inp["statistic"],
                        df1=inp.get("df1"),
                        df2=inp.get("df2"),
                        n=inp.get("n"),
                        alternative=inp.get("alternative", "two-sided"),
                    )
                result = PCurveInput(
                    study_id=inp.get("study_id", study_id),
                    test_type=inp["test_type"],
                    statistic=inp["statistic"],
                    df1=inp.get("df1"),
                    df2=inp.get("df2"),
                    n=inp.get("n"),
                    p_value=p_val,
                    original_string=str(inp),
                )
            except Exception as e:
                result = PCurveInput(
                    study_id=study_id,
                    test_type="error",
                    statistic=0,
                    is_valid=False,
                    error_message=str(e),
                    original_string=str(inp),
                )
        else:
            result = PCurveInput(
                study_id=study_id,
                test_type="error",
                statistic=0,
                is_valid=False,
                error_message=f"Invalid input type: {type(inp)}",
                original_string=str(inp),
            )

        if result.is_valid and result.p_value is not None:
            parsed.append(result)
        else:
            errors.append(result.error_message or f"Failed to parse: {inp}")

    return parsed, errors
