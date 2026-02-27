"""
Safe Pickle Loading Utility
============================

Provides a restricted unpickler that only allows loading objects from
trusted scientific computing modules. This prevents arbitrary code
execution when loading pickle files.

Usage:
    from core.utils.safe_pickle import safe_pickle_load

    # For file objects:
    with open('model.pkl', 'rb') as f:
        model = safe_pickle_load(f)

    # For bytes (replace pickle.loads):
    import io
    model = safe_pickle_load(io.BytesIO(model_bytes))

Author: StickForStats Development Team
"""

import pickle


class SafeUnpickler(pickle.Unpickler):
    """Restricted unpickler that only allows safe types from trusted modules."""

    SAFE_MODULES = {
        "numpy",
        "numpy.core",
        "numpy.core.multiarray",
        "scipy",
        "scipy.stats",
        "scipy.special",
        "sklearn",
        "statsmodels",
        "pandas",
        "collections",
        "builtins",
        "datetime",
        "copyreg",
        "_codecs",
        "codecs",
    }

    def find_class(self, module, name):
        # Allow any submodule of a safe top-level package
        top_level = module.split(".")[0]
        if top_level in self.SAFE_MODULES or module in self.SAFE_MODULES:
            return super().find_class(module, name)
        raise pickle.UnpicklingError(
            f"Forbidden class: {module}.{name}. " f"Only classes from trusted scientific modules are allowed."
        )


def safe_pickle_load(file_obj):
    """
    Safely load pickle data with restricted class access.

    Args:
        file_obj: A file-like object (e.g., open file or io.BytesIO)
                  opened in binary mode.

    Returns:
        The deserialized Python object.

    Raises:
        pickle.UnpicklingError: If the pickle data references forbidden classes.
    """
    return SafeUnpickler(file_obj).load()
