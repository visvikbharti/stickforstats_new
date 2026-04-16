"""
StickForStats Jupyter Extension
================================

Provides magic commands and rich display for StickForStats
in Jupyter notebooks.

Usage::

    %load_ext stickforstats_jupyter

    %%sfs_analyze
    Run a t-test on columns A and B

    %sfs_describe df

    %sfs_guardian df
"""

__version__ = "0.2.0"


def load_ipython_extension(ipython):  # type: ignore[no-untyped-def]
    """Entry point called by ``%load_ext stickforstats_jupyter``."""
    from stickforstats_jupyter.magics import load_ipython_extension as _load
    _load(ipython)
