import { alpha } from '@mui/material/styles';

/**
 * Responsive styles for DOE module components
 * These styles can be used across components to maintain consistency
 */

// Create responsive spacing based on viewport size
export const responsiveSpacing = (theme, multiplier = 1) => ({
  xs: theme.spacing(1 * multiplier),
  sm: theme.spacing(1.5 * multiplier),
  md: theme.spacing(2 * multiplier),
  lg: theme.spacing(2.5 * multiplier),
  xl: theme.spacing(3 * multiplier),
});

// Create responsive padding that varies with screen size
export const responsivePadding = (theme) => ({
  p: {
    xs: theme.spacing(1.5),
    sm: theme.spacing(2),
    md: theme.spacing(3)
  }
});

// Create responsive typography sizing
export const responsiveTypography = (theme) => ({
  h1: {
    fontSize: {
      xs: '1.75rem',
      sm: '2rem',
      md: '2.25rem',
      lg: '2.5rem'
    }
  },
  h2: {
    fontSize: {
      xs: '1.5rem',
      sm: '1.75rem',
      md: '2rem',
      lg: '2.25rem'
    }
  },
  h3: {
    fontSize: {
      xs: '1.25rem',
      sm: '1.5rem',
      md: '1.75rem',
      lg: '2rem'
    }
  },
  h4: {
    fontSize: {
      xs: '1.125rem',
      sm: '1.25rem',
      md: '1.5rem',
      lg: '1.75rem'
    }
  },
  h5: {
    fontSize: {
      xs: '1rem',
      sm: '1.125rem',
      md: '1.25rem',
      lg: '1.5rem'
    }
  },
  h6: {
    fontSize: {
      xs: '0.875rem',
      sm: '1rem',
      md: '1.125rem',
      lg: '1.25rem'
    }
  },
  body1: {
    fontSize: {
      xs: '0.875rem',
      sm: '0.9rem',
      md: '1rem'
    }
  },
  body2: {
    fontSize: {
      xs: '0.8125rem',
      sm: '0.825rem',
      md: '0.875rem'
    }
  }
});

// Card styles with responsive adjustments
export const responsiveCard = (theme) => ({
  card: {
    p: {
      xs: 1.5,
      sm: 2,
      md: 3
    },
    boxShadow: {
      xs: 1,
      md: 2
    },
    transition: 'box-shadow 0.3s ease-in-out, transform 0.2s ease',
    '&:hover': {
      boxShadow: 3,
      transform: {
        xs: 'none',
        md: 'translateY(-4px)'
      }
    }
  },
  cardHeader: {
    p: {
      xs: 1.5,
      sm: 2
    }
  },
  cardContent: {
    p: {
      xs: 1.5,
      sm: 2
    },
    '&:last-child': {
      pb: {
        xs: 1.5,
        sm: 2
      }
    }
  },
  cardFooter: {
    p: {
      xs: 1,
      sm: 1.5
    }
  }
});

// Create responsive table styles
export const responsiveTable = (theme) => ({
  tableContainer: {
    overflow: 'auto',
    maxWidth: '100%'
  },
  table: {
    // On mobile, let cells stack instead of wrapping
    [theme.breakpoints.down('sm')]: {
      '& .MuiTableCell-root': {
        whiteSpace: 'nowrap'
      }
    }
  },
  tableCell: {
    p: {
      xs: 1,
      sm: 1.5,
      md: 2
    }
  },
  tableHeader: {
    bgcolor: theme.palette.grey[100],
    fontWeight: 'bold'
  }
});

// Create responsive dialog styles
export const responsiveDialog = (theme) => ({
  dialog: {
    // Full-width on mobile
    [theme.breakpoints.down('sm')]: {
      '& .MuiDialog-paper': {
        margin: theme.spacing(1),
        maxWidth: 'calc(100% - 16px)'
      }
    },
    // Adjust width for larger screens
    [theme.breakpoints.up('sm')]: {
      '& .MuiDialog-paper': {
        maxWidth: theme.breakpoints.values.sm
      }
    },
    [theme.breakpoints.up('md')]: {
      '& .MuiDialog-paper': {
        maxWidth: theme.breakpoints.values.md * 0.8
      }
    }
  },
  dialogTitle: {
    p: {
      xs: 2,
      sm: 3
    }
  },
  dialogContent: {
    p: {
      xs: 2,
      sm: 3
    }
  },
  dialogActions: {
    p: {
      xs: 1.5,
      sm: 2
    }
  }
});

// Create responsive form styles
export const responsiveForm = (theme) => ({
  formControl: {
    mb: {
      xs: 1.5,
      sm: 2
    }
  },
  formGroup: {
    mb: {
      xs: 2,
      sm: 3
    }
  },
  formLabel: {
    mb: {
      xs: 0.5,
      sm: 1
    }
  },
  inputLabel: {
    transform: {
      xs: 'translate(14px, 12px) scale(1)',
      sm: 'translate(14px, 14px) scale(1)'
    }
  },
  formHelperText: {
    mt: {
      xs: 0.5,
      sm: 0.75
    }
  }
});

// Create paper styles with responsive adjustments
export const responsivePaper = (theme) => ({
  paper: {
    p: {
      xs: 1.5,
      sm: 2,
      md: 3
    },
    boxShadow: {
      xs: 1,
      md: 2
    }
  }
});

// Create elevation shadow with alpha overlay for better visibility
export const getOverlayElevation = (theme, elevation = 1, color = 'black') => {
  const overlayAlpha = elevation * 0.01;
  return `0px ${elevation}px ${elevation * 2}px rgba(0, 0, 0, 0.1), 0px ${elevation / 2}px ${elevation}px ${alpha(theme.palette.augmentColor({color}).main, overlayAlpha)}`;
};

export default {
  responsiveSpacing,
  responsivePadding,
  responsiveTypography,
  responsiveCard,
  responsiveTable,
  responsiveDialog,
  responsiveForm,
  responsivePaper,
  getOverlayElevation
};