# This file is loaded first (alphabetically) to define internal operators
# used across the package.

# Null-coalescing operator (internal, not exported)
`%||%` <- function(x, y) if (is.null(x)) y else x
