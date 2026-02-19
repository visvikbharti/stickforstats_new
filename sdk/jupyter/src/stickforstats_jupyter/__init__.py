"""StickForStats Jupyter Extension — magic commands and rich display."""
__version__ = "0.1.0"


def load_ipython_extension(ipython):
    """Called by %load_ext stickforstats_jupyter"""
    from .magics import StickForStatsMagics
    ipython.register_magics(StickForStatsMagics)
