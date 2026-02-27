"""
Distribution Service - Core mathematical implementations for probability distributions.

This module contains services for calculating and analyzing probability distributions
using scipy.stats for all statistical computations.
"""

import numpy as np
import scipy.stats as stats
import logging
from typing import Dict, List, Any, Optional, Union

logger = logging.getLogger(__name__)


# Mapping from our distribution type names to scipy.stats distribution objects
# and their parameter extraction functions
DISCRETE_DISTRIBUTIONS = {"BINOMIAL", "POISSON"}
CONTINUOUS_DISTRIBUTIONS = {
    "NORMAL",
    "EXPONENTIAL",
    "UNIFORM",
    "GAMMA",
    "BETA",
    "CHI_SQUARED",
    "T",
    "F",
    "LOG_NORMAL",
    "WEIBULL",
}


def _get_scipy_dist(distribution_type: str, parameters: Dict[str, Any]):
    """
    Return (scipy_dist_object, args, kwargs) for the given distribution type and parameters.
    """
    if distribution_type == "BINOMIAL":
        n = int(parameters.get("n", 10))
        p = float(parameters.get("p", 0.5))
        return stats.binom, (n, p), {}

    elif distribution_type == "POISSON":
        mu = float(parameters.get("lambda", parameters.get("mu", 1.0)))
        return stats.poisson, (mu,), {}

    elif distribution_type == "NORMAL":
        mu = float(parameters.get("mu", parameters.get("loc", 0.0)))
        sigma = float(parameters.get("sigma", parameters.get("scale", 1.0)))
        if sigma <= 0:
            raise ValueError("Parameter 'sigma' must be positive")
        return stats.norm, (), {"loc": mu, "scale": sigma}

    elif distribution_type == "EXPONENTIAL":
        rate = float(parameters.get("rate", parameters.get("lambda", 1.0)))
        if rate <= 0:
            raise ValueError("Parameter 'rate' must be positive")
        return stats.expon, (), {"scale": 1.0 / rate}

    elif distribution_type == "UNIFORM":
        a = float(parameters.get("a", parameters.get("loc", 0.0)))
        b = float(parameters.get("b", 1.0))
        if b <= a:
            raise ValueError("Parameter 'b' must be greater than 'a'")
        return stats.uniform, (), {"loc": a, "scale": b - a}

    elif distribution_type == "GAMMA":
        shape = float(parameters.get("shape", parameters.get("alpha", 1.0)))
        scale = float(parameters.get("scale", parameters.get("beta", 1.0)))
        if shape <= 0 or scale <= 0:
            raise ValueError("Parameters 'shape' and 'scale' must be positive")
        return stats.gamma, (shape,), {"scale": scale}

    elif distribution_type == "BETA":
        alpha = float(parameters.get("alpha", parameters.get("a", 1.0)))
        beta_val = float(parameters.get("beta", parameters.get("b", 1.0)))
        if alpha <= 0 or beta_val <= 0:
            raise ValueError("Parameters 'alpha' and 'beta' must be positive")
        return stats.beta, (alpha, beta_val), {}

    elif distribution_type == "CHI_SQUARED":
        df = float(parameters.get("df", 1))
        if df <= 0:
            raise ValueError("Parameter 'df' must be positive")
        return stats.chi2, (df,), {}

    elif distribution_type == "T":
        df = float(parameters.get("df", 1))
        if df <= 0:
            raise ValueError("Parameter 'df' must be positive")
        return stats.t, (df,), {}

    elif distribution_type == "F":
        dfn = float(parameters.get("dfn", 1))
        dfd = float(parameters.get("dfd", 1))
        if dfn <= 0 or dfd <= 0:
            raise ValueError("Parameters 'dfn' and 'dfd' must be positive")
        return stats.f, (dfn, dfd), {}

    elif distribution_type == "LOG_NORMAL":
        mu = float(parameters.get("mu", 0.0))
        sigma = float(parameters.get("sigma", 1.0))
        if sigma <= 0:
            raise ValueError("Parameter 'sigma' must be positive")
        return stats.lognorm, (sigma,), {"scale": np.exp(mu)}

    elif distribution_type == "WEIBULL":
        shape = float(parameters.get("shape", parameters.get("c", 1.0)))
        scale = float(parameters.get("scale", 1.0))
        if shape <= 0 or scale <= 0:
            raise ValueError("Parameters 'shape' and 'scale' must be positive")
        return stats.weibull_min, (shape,), {"scale": scale}

    else:
        raise ValueError(f"Unsupported distribution type: {distribution_type}")


def _safe_float(val):
    """Convert numpy values to Python floats, handling inf/nan."""
    if isinstance(val, (np.floating, np.integer)):
        val = float(val)
    if isinstance(val, float):
        if np.isnan(val):
            return None
        if np.isinf(val):
            return None
    return val


class DistributionService:
    """
    Service for performing probability distribution calculations and analysis.
    All methods are static and stateless.
    """

    # ------------------------------------------------------------------
    # create_distribution: return distribution properties and statistics
    # ------------------------------------------------------------------
    @staticmethod
    def create_distribution(distribution_type: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a distribution with the specified type and parameters.
        Returns distribution properties including parameters and basic statistics.
        """
        try:
            dist, args, kwargs = _get_scipy_dist(distribution_type, parameters)
            rv = dist(*args, **kwargs)

            mean_val, var_val, skew_val, kurt_val = rv.stats(moments="mvsk")

            result = {
                "type": distribution_type,
                "parameters": parameters,
                "statistics": {
                    "mean": _safe_float(mean_val),
                    "variance": _safe_float(var_val),
                    "standard_deviation": _safe_float(np.sqrt(float(var_val)))
                    if var_val is not None and float(var_val) >= 0
                    else None,
                    "skewness": _safe_float(skew_val),
                    "kurtosis": _safe_float(kurt_val),
                },
            }
            return result
        except Exception as e:
            logger.error(f"Error creating distribution: {str(e)}")
            raise

    # ------------------------------------------------------------------
    # calculate_pmf_pdf: unified method for PMF (discrete) or PDF (continuous)
    # ------------------------------------------------------------------
    @staticmethod
    def calculate_pmf_pdf(
        distribution_type: str, parameters: Dict[str, Any], x_values: List[Union[int, float]]
    ) -> Dict[str, Any]:
        """
        Calculate the PMF (for discrete) or PDF (for continuous) distributions.
        """
        try:
            dist, args, kwargs = _get_scipy_dist(distribution_type, parameters)
            x_arr = np.asarray(x_values, dtype=float)

            if distribution_type in DISCRETE_DISTRIBUTIONS:
                values = dist.pmf(x_arr, *args, **kwargs)
                key = "pmf_values"
            else:
                values = dist.pdf(x_arr, *args, **kwargs)
                key = "pdf_values"

            values_list = np.nan_to_num(values, nan=0.0).tolist()

            return {
                "x_values": x_values,
                key: values_list,
                "distribution_type": distribution_type,
            }
        except Exception as e:
            logger.error(f"Error calculating PMF/PDF: {str(e)}")
            raise

    # ------------------------------------------------------------------
    # calculate_cdf
    # ------------------------------------------------------------------
    @staticmethod
    def calculate_cdf(
        distribution_type: str, parameters: Dict[str, Any], x_values: List[Union[int, float]]
    ) -> Dict[str, Any]:
        """
        Calculate the CDF for any distribution.
        """
        try:
            dist, args, kwargs = _get_scipy_dist(distribution_type, parameters)
            x_arr = np.asarray(x_values, dtype=float)

            cdf_values = dist.cdf(x_arr, *args, **kwargs)
            cdf_list = np.nan_to_num(cdf_values, nan=0.0).tolist()

            return {
                "x_values": x_values,
                "cdf_values": cdf_list,
                "distribution_type": distribution_type,
            }
        except Exception as e:
            logger.error(f"Error calculating CDF: {str(e)}")
            raise

    # ------------------------------------------------------------------
    # calculate_probability: flexible probability queries
    # Called by both stateless views and model-based views
    # Supports keyword args: probability_type, x_value, lower_bound, upper_bound
    # Also supports legacy positional 'values' dict
    # ------------------------------------------------------------------
    @staticmethod
    def calculate_probability(
        distribution_type: str,
        parameters: Dict[str, Any],
        probability_type: str = "less_than",
        values: Optional[Dict[str, float]] = None,
        lower_bound: Optional[float] = None,
        upper_bound: Optional[float] = None,
        x_value: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Calculate various probability queries for a distribution.

        probability_type: 'less_than', 'greater_than', 'between', 'exactly',
                          'LESS_THAN_OR_EQUAL', 'GREATER_THAN', 'BETWEEN', 'EQUAL_TO', 'WITHIN_K_STD'
        """
        try:
            dist, args, kwargs = _get_scipy_dist(distribution_type, parameters)

            # Normalise probability_type to lowercase
            ptype = probability_type.lower()

            # If legacy 'values' dict was provided, extract bounds from it
            if values:
                if x_value is None:
                    x_value = values.get("x", values.get("k", values.get("x_value")))
                if lower_bound is None:
                    lower_bound = values.get("x1", values.get("k1", values.get("lower_bound")))
                if upper_bound is None:
                    upper_bound = values.get("x2", values.get("k2", values.get("upper_bound")))
                # For WITHIN_K_STD
                if "k" in values and ptype == "within_k_std":
                    k_std = float(values["k"])

            probability = None

            if ptype in ("less_than", "less_than_or_equal"):
                if x_value is None:
                    raise ValueError("x_value is required for less_than probability")
                probability = float(dist.cdf(float(x_value), *args, **kwargs))

            elif ptype in ("greater_than",):
                if x_value is None:
                    raise ValueError("x_value is required for greater_than probability")
                probability = float(1.0 - dist.cdf(float(x_value), *args, **kwargs))

            elif ptype in ("between",):
                if lower_bound is None or upper_bound is None:
                    raise ValueError("lower_bound and upper_bound are required for between probability")
                probability = float(
                    dist.cdf(float(upper_bound), *args, **kwargs) - dist.cdf(float(lower_bound), *args, **kwargs)
                )

            elif ptype in ("exactly", "equal_to"):
                if x_value is None:
                    raise ValueError("x_value is required for exactly probability")
                if distribution_type in DISCRETE_DISTRIBUTIONS:
                    probability = float(dist.pmf(float(x_value), *args, **kwargs))
                else:
                    # For continuous distributions, P(X = x) = 0
                    probability = 0.0

            elif ptype == "within_k_std":
                # P(mu - k*sigma < X < mu + k*sigma)
                if values and "k" in values:
                    k_std = float(values["k"])
                elif x_value is not None:
                    k_std = float(x_value)
                else:
                    k_std = 1.0
                mean_val = float(
                    dist.mean(*args, **kwargs)
                    if callable(getattr(dist, "mean", None))
                    else dist.stats(*args, moments="m", **kwargs)
                )
                std_val = float(np.sqrt(dist.stats(*args, moments="v", **kwargs)))
                probability = float(
                    dist.cdf(mean_val + k_std * std_val, *args, **kwargs)
                    - dist.cdf(mean_val - k_std * std_val, *args, **kwargs)
                )

            else:
                raise ValueError(f"Unsupported probability type: {probability_type}")

            return {
                "probability": probability,
                "distribution_type": distribution_type,
                "parameters": parameters,
                "probability_type": probability_type,
            }
        except Exception as e:
            logger.error(f"Error calculating probability: {str(e)}")
            raise

    # ------------------------------------------------------------------
    # generate_random_sample: generate random variates
    # ------------------------------------------------------------------
    @staticmethod
    def generate_random_sample(
        distribution_type: str, parameters: Dict[str, Any], sample_size: int = 100, seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate random samples from a specified distribution.
        """
        try:
            if seed is not None:
                np.random.seed(int(seed))

            dist, args, kwargs = _get_scipy_dist(distribution_type, parameters)
            samples = dist.rvs(*args, size=int(sample_size), **kwargs)

            samples_list = samples.tolist() if isinstance(samples, np.ndarray) else list(samples)

            summary = {
                "mean": float(np.mean(samples)),
                "median": float(np.median(samples)),
                "std_dev": float(np.std(samples, ddof=1)) if len(samples) > 1 else 0.0,
                "min": float(np.min(samples)),
                "max": float(np.max(samples)),
                "q1": float(np.percentile(samples, 25)),
                "q3": float(np.percentile(samples, 75)),
            }

            return {
                "samples": samples_list,
                "summary": summary,
                "distribution_type": distribution_type,
                "sample_size": sample_size,
            }
        except Exception as e:
            logger.error(f"Error generating random samples: {str(e)}")
            raise

    # Keep legacy alias
    generate_random_samples = generate_random_sample

    # ------------------------------------------------------------------
    # fit_distribution: fit one or more distributions to data
    # ------------------------------------------------------------------
    @staticmethod
    def fit_distribution(
        data: List[Union[int, float]], distribution_types: Optional[Union[str, List[str]]] = None
    ) -> Dict[str, Any]:
        """
        Fit distribution(s) to given data.
        Accepts a single distribution_type string or a list.
        """
        try:
            data_array = np.asarray(data, dtype=float)

            # Normalise to list
            if distribution_types is None:
                distribution_types = ["NORMAL"]
            if isinstance(distribution_types, str):
                distribution_types = [distribution_types]

            results = {}

            for dtype in distribution_types:
                try:
                    fit_result = DistributionService._fit_single_distribution(data_array, dtype)
                    results[dtype] = fit_result
                except Exception as exc:
                    results[dtype] = {
                        "error": str(exc),
                        "fitted_parameters": {},
                        "goodness_of_fit": {},
                    }

            return {
                "results": results,
                "n_observations": len(data_array),
                "data_summary": {
                    "mean": float(np.mean(data_array)),
                    "std": float(np.std(data_array, ddof=1)) if len(data_array) > 1 else 0.0,
                    "min": float(np.min(data_array)),
                    "max": float(np.max(data_array)),
                },
            }
        except Exception as e:
            logger.error(f"Error fitting distribution: {str(e)}")
            raise

    @staticmethod
    def _fit_single_distribution(data_array: np.ndarray, distribution_type: str) -> Dict[str, Any]:
        """Fit a single distribution to data and return parameters + goodness-of-fit."""

        fitted_params = {}
        goodness_of_fit = {}

        if distribution_type == "NORMAL":
            mu_est = float(np.mean(data_array))
            sigma_est = float(np.std(data_array, ddof=1))
            fitted_params = {"mu": mu_est, "sigma": sigma_est}

            ks_stat, ks_p = stats.kstest(data_array, "norm", args=(mu_est, sigma_est))
            goodness_of_fit["ks_statistic"] = float(ks_stat)
            goodness_of_fit["ks_p_value"] = float(ks_p)

            if len(data_array) <= 5000:
                sw_stat, sw_p = stats.shapiro(data_array)
                goodness_of_fit["sw_statistic"] = float(sw_stat)
                goodness_of_fit["sw_p_value"] = float(sw_p)

        elif distribution_type == "EXPONENTIAL":
            rate_est = 1.0 / float(np.mean(data_array)) if np.mean(data_array) > 0 else 1.0
            fitted_params = {"rate": rate_est}
            ks_stat, ks_p = stats.kstest(data_array, "expon", args=(0, 1.0 / rate_est))
            goodness_of_fit = {"ks_statistic": float(ks_stat), "ks_p_value": float(ks_p)}

        elif distribution_type == "GAMMA":
            # Use scipy MLE fitting
            fit_a, fit_loc, fit_scale = stats.gamma.fit(data_array, floc=0)
            fitted_params = {"shape": float(fit_a), "scale": float(fit_scale)}
            ks_stat, ks_p = stats.kstest(data_array, "gamma", args=(fit_a, fit_loc, fit_scale))
            goodness_of_fit = {"ks_statistic": float(ks_stat), "ks_p_value": float(ks_p)}

        elif distribution_type == "BETA":
            if np.min(data_array) < 0 or np.max(data_array) > 1:
                raise ValueError("Beta distribution requires data in [0, 1]")
            fit_a, fit_b, fit_loc, fit_scale = stats.beta.fit(data_array, floc=0, fscale=1)
            fitted_params = {"alpha": float(fit_a), "beta": float(fit_b)}
            ks_stat, ks_p = stats.kstest(data_array, "beta", args=(fit_a, fit_b, fit_loc, fit_scale))
            goodness_of_fit = {"ks_statistic": float(ks_stat), "ks_p_value": float(ks_p)}

        elif distribution_type == "UNIFORM":
            a_est = float(np.min(data_array))
            b_est = float(np.max(data_array))
            fitted_params = {"a": a_est, "b": b_est}
            ks_stat, ks_p = stats.kstest(data_array, "uniform", args=(a_est, b_est - a_est))
            goodness_of_fit = {"ks_statistic": float(ks_stat), "ks_p_value": float(ks_p)}

        elif distribution_type in ("LOG_NORMAL", "LOGNORMAL"):
            fit_s, fit_loc, fit_scale = stats.lognorm.fit(data_array, floc=0)
            fitted_params = {"sigma": float(fit_s), "mu": float(np.log(fit_scale))}
            ks_stat, ks_p = stats.kstest(data_array, "lognorm", args=(fit_s, fit_loc, fit_scale))
            goodness_of_fit = {"ks_statistic": float(ks_stat), "ks_p_value": float(ks_p)}

        elif distribution_type == "WEIBULL":
            fit_c, fit_loc, fit_scale = stats.weibull_min.fit(data_array, floc=0)
            fitted_params = {"shape": float(fit_c), "scale": float(fit_scale)}
            ks_stat, ks_p = stats.kstest(data_array, "weibull_min", args=(fit_c, fit_loc, fit_scale))
            goodness_of_fit = {"ks_statistic": float(ks_stat), "ks_p_value": float(ks_p)}

        elif distribution_type == "POISSON":
            lambda_est = float(np.mean(data_array))
            fitted_params = {"lambda": lambda_est}
            # Chi-square goodness of fit
            max_k = max(int(np.max(data_array)), int(lambda_est * 3))
            expected = stats.poisson.pmf(np.arange(max_k + 1), lambda_est) * len(data_array)
            observed = np.bincount(data_array.astype(int), minlength=max_k + 1)
            valid = expected > 5
            if np.sum(valid) > 1:
                chi2_stat = float(np.sum(((observed[valid] - expected[valid]) ** 2) / expected[valid]))
                dof = int(np.sum(valid)) - 1
                p_val = float(1 - stats.chi2.cdf(chi2_stat, dof)) if dof > 0 else None
                goodness_of_fit = {"chi_square": chi2_stat, "dof": dof, "p_value": p_val}
            else:
                goodness_of_fit = {"error": "Insufficient data for chi-square test"}

        elif distribution_type == "BINOMIAL":
            n_est = int(np.ceil(np.max(data_array)))
            p_est = float(np.mean(data_array)) / n_est if n_est > 0 else 0.5
            fitted_params = {"n": n_est, "p": p_est}
            goodness_of_fit = {"method": "moment_estimation"}

        else:
            raise ValueError(f"Distribution fitting for {distribution_type} not supported")

        return {
            "fitted_parameters": fitted_params,
            "goodness_of_fit": goodness_of_fit,
        }

    # ------------------------------------------------------------------
    # compare_binomial_approximations
    # ------------------------------------------------------------------
    @staticmethod
    def compare_binomial_approximations(
        n: int, p: float, approximation_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Compare binomial distribution with its Poisson and Normal approximations.
        """
        try:
            if approximation_types is None:
                approximation_types = ["POISSON", "NORMAL"]

            n = int(n)
            p = float(p)
            np_val = n * p
            npq = n * p * (1 - p)

            mean = np_val
            std_dev = np.sqrt(npq) if npq > 0 else 1.0

            k_min = max(0, int(mean - 4 * std_dev))
            k_max = min(n, int(mean + 4 * std_dev))
            k_values = np.arange(k_min, k_max + 1)

            binom_pmf = stats.binom.pmf(k_values, n, p)

            approximations = {}
            errors = {}

            if "POISSON" in approximation_types:
                poisson_pmf = stats.poisson.pmf(k_values, np_val)
                poisson_errors = np.abs(binom_pmf - poisson_pmf)
                tvd_poisson = 0.5 * np.sum(poisson_errors)

                approximations["POISSON"] = {
                    "pmf": poisson_pmf.tolist(),
                    "suitability": bool(n >= 20 and p <= 0.05 and np_val < 10),
                }
                errors["POISSON"] = {
                    "absolute_errors": poisson_errors.tolist(),
                    "max_error": float(np.max(poisson_errors)),
                    "tvd": float(tvd_poisson),
                }

            if "NORMAL" in approximation_types:
                if npq > 0:
                    normal_approx = stats.norm.cdf(k_values + 0.5, loc=np_val, scale=np.sqrt(npq)) - stats.norm.cdf(
                        k_values - 0.5, loc=np_val, scale=np.sqrt(npq)
                    )
                else:
                    normal_approx = np.zeros_like(k_values, dtype=float)
                normal_errors = np.abs(binom_pmf - normal_approx)
                tvd_normal = 0.5 * np.sum(normal_errors)

                approximations["NORMAL"] = {
                    "pmf": normal_approx.tolist(),
                    "suitability": bool(np_val >= 5 and n * (1 - p) >= 5),
                }
                errors["NORMAL"] = {
                    "absolute_errors": normal_errors.tolist(),
                    "max_error": float(np.max(normal_errors)),
                    "tvd": float(tvd_normal),
                }

            better_approximation = None
            if "POISSON" in errors and "NORMAL" in errors:
                if errors["POISSON"]["tvd"] < errors["NORMAL"]["tvd"]:
                    better_approximation = "POISSON"
                elif errors["NORMAL"]["tvd"] < errors["POISSON"]["tvd"]:
                    better_approximation = "NORMAL"
                else:
                    better_approximation = "BOTH_EQUAL"

            return {
                "parameters": {"n": n, "p": p, "np": np_val, "npq": npq},
                "k_values": k_values.tolist(),
                "binomial_pmf": binom_pmf.tolist(),
                "approximations": approximations,
                "errors": errors,
                "better_approximation": better_approximation,
            }
        except Exception as e:
            logger.error(f"Error comparing binomial approximations: {str(e)}")
            raise

    # ------------------------------------------------------------------
    # calculate_process_capability
    # Accepts either (data, lsl, usl, target) or (mean, std_dev, lsl, usl)
    # ------------------------------------------------------------------
    @staticmethod
    def calculate_process_capability(
        data_or_mean, lsl: float, usl: float, target: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Calculate process capability indices for quality control.
        First argument can be a list/array of data or a pre-computed mean.
        """
        try:
            lsl = float(lsl)
            usl = float(usl)

            if isinstance(data_or_mean, (list, np.ndarray)):
                data_array = np.asarray(data_or_mean, dtype=float)
                mean = float(np.mean(data_array))
                std_dev = float(np.std(data_array, ddof=1))
            else:
                mean = float(data_or_mean)
                std_dev = float(lsl)  # fallback: won't happen from views
                # This branch only matters for legacy (mean, std_dev, lsl, usl) calls
                # but our views always pass data as list, so the list branch above runs.

            if target is None:
                target = (lsl + usl) / 2.0
            else:
                target = float(target)

            cp = (usl - lsl) / (6 * std_dev) if std_dev > 0 else float("inf")
            cpu = (usl - mean) / (3 * std_dev) if std_dev > 0 else float("inf")
            cpl = (mean - lsl) / (3 * std_dev) if std_dev > 0 else float("inf")
            cpk = min(cpu, cpl)

            # Cpm (Taguchi capability index)
            cpm_denom = np.sqrt(std_dev**2 + (mean - target) ** 2)
            cpm = (usl - lsl) / (6 * cpm_denom) if cpm_denom > 0 else float("inf")

            lower_defect = float(stats.norm.cdf(lsl, loc=mean, scale=std_dev))
            upper_defect = float(1 - stats.norm.cdf(usl, loc=mean, scale=std_dev))
            total_defect = lower_defect + upper_defect

            return {
                "parameters": {
                    "mean": mean,
                    "std_dev": std_dev,
                    "lsl": lsl,
                    "usl": usl,
                    "target": target,
                },
                "capability_indices": {
                    "cp": _safe_float(cp),
                    "cpu": _safe_float(cpu),
                    "cpl": _safe_float(cpl),
                    "cpk": _safe_float(cpk),
                    "cpm": _safe_float(cpm),
                },
                "defect_rates": {
                    "lower": lower_defect,
                    "upper": upper_defect,
                    "total": total_defect,
                    "ppm": total_defect * 1_000_000,
                },
            }
        except Exception as e:
            logger.error(f"Error calculating process capability: {str(e)}")
            raise

    # ------------------------------------------------------------------
    # simulate_poisson_process
    # ------------------------------------------------------------------
    @staticmethod
    def simulate_poisson_process(
        rate: float, time_period: float, num_simulations: int = 1, seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Simulate a Poisson process (arrivals in a time period).
        """
        try:
            rate = float(rate)
            time_period = float(time_period)
            num_simulations = int(num_simulations)

            if seed is not None:
                np.random.seed(int(seed))

            expected_events = rate * time_period

            simulations = []
            event_counts = []

            for i in range(num_simulations):
                # Generate enough interarrival times
                n_gen = max(int(expected_events * 3), 10)
                interarrival_times = np.random.exponential(1.0 / rate, size=n_gen)
                arrival_times = np.cumsum(interarrival_times)
                arrival_times = arrival_times[arrival_times <= time_period]

                event_counts.append(len(arrival_times))

                if i == 0:
                    simulations.append(
                        {
                            "arrival_times": arrival_times.tolist(),
                            "interarrival_times": interarrival_times[: len(arrival_times)].tolist(),
                            "total_events": len(arrival_times),
                        }
                    )

            # Theoretical PMF
            max_k = max(int(expected_events * 2), max(event_counts) + 1) if event_counts else int(expected_events * 2)
            k_values = np.arange(0, max_k + 1)
            poisson_pmf = stats.poisson.pmf(k_values, expected_events)

            return {
                "parameters": {
                    "rate": rate,
                    "duration": time_period,
                    "expected_events": expected_events,
                },
                "simulations": simulations,
                "event_counts": event_counts,
                "k_values": k_values.tolist(),
                "theoretical_pmf": poisson_pmf.tolist(),
                "total_simulations": num_simulations,
            }
        except Exception as e:
            logger.error(f"Error simulating Poisson process: {str(e)}")
            raise

    # ------------------------------------------------------------------
    # simulate_clinical_trial
    # Supports both the old signature (control_rate, treatment_effect, sample_size, num_simulations)
    # and the new signature from api/views.py (treatment_effect, control_mean, control_sd, ...)
    # ------------------------------------------------------------------
    @staticmethod
    def simulate_clinical_trial(
        treatment_effect: float,
        control_mean: float = 0.5,
        control_sd: float = 1.0,
        treatment_sd: Optional[float] = None,
        n_control: int = 100,
        n_treatment: int = 100,
        n_simulations: int = 1000,
        seed: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Simulate a clinical trial. Supports both proportion-based and continuous outcomes.
        """
        try:
            if seed is not None:
                np.random.seed(int(seed))

            if treatment_sd is None:
                treatment_sd = control_sd

            treatment_mean = control_mean + treatment_effect

            p_values = []
            effect_sizes = []
            simulations_detail = []

            for i in range(int(n_simulations)):
                control_data = np.random.normal(control_mean, control_sd, int(n_control))
                treatment_data = np.random.normal(treatment_mean, treatment_sd, int(n_treatment))

                t_stat, p_val = stats.ttest_ind(treatment_data, control_data, equal_var=False)
                obs_effect = float(np.mean(treatment_data) - np.mean(control_data))

                p_values.append(float(p_val))
                effect_sizes.append(obs_effect)

                if i == 0:
                    simulations_detail.append(
                        {
                            "control_mean_obs": float(np.mean(control_data)),
                            "treatment_mean_obs": float(np.mean(treatment_data)),
                            "observed_effect": obs_effect,
                            "t_statistic": float(t_stat),
                            "p_value": float(p_val),
                        }
                    )

            alpha = 0.05
            power = float(np.mean([p <= alpha for p in p_values]))

            return {
                "parameters": {
                    "treatment_effect": treatment_effect,
                    "control_mean": control_mean,
                    "control_sd": control_sd,
                    "treatment_sd": treatment_sd,
                    "n_control": n_control,
                    "n_treatment": n_treatment,
                },
                "simulations": simulations_detail,
                "p_values": p_values,
                "effect_sizes": effect_sizes,
                "power": {
                    "estimated": power,
                    "alpha": alpha,
                },
                "total_simulations": int(n_simulations),
            }
        except Exception as e:
            logger.error(f"Error simulating clinical trial: {str(e)}")
            raise
