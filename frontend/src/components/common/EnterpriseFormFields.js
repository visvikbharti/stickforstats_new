import React from 'react';
import {
  TextField,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  FormHelperText,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  Slider,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Info as InfoIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

// Styled components for enterprise-grade form fields
const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
  },
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
  },
}));

// Enterprise TextField with enhanced features
export const EnterpriseTextField = ({
  tooltip,
  clearable = false,
  showCharCount = false,
  maxLength,
  type = 'text',
  endIcon,
  startIcon,
  onClear,
  value,
  onChange,
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === 'password';

  const handleClear = () => {
    if (onChange) {
      onChange({ target: { value: '' } });
    }
    if (onClear) {
      onClear();
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <StyledTextField
      value={value}
      onChange={onChange}
      type={isPassword && !showPassword ? 'password' : 'text'}
      InputProps={{
        startAdornment: startIcon && (
          <InputAdornment position="start">{startIcon}</InputAdornment>
        ),
        endAdornment: (
          <>
            {clearable && value && (
              <InputAdornment position="end">
                <IconButton
                  aria-label="clear"
                  onClick={handleClear}
                  edge="end"
                  size="small"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )}
            {isPassword && (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleTogglePassword}
                  edge="end"
                  size="small"
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            )}
            {tooltip && (
              <InputAdornment position="end">
                <Tooltip title={tooltip} arrow>
                  <InfoIcon color="action" fontSize="small" />
                </Tooltip>
              </InputAdornment>
            )}
            {endIcon && <InputAdornment position="end">{endIcon}</InputAdornment>}
          </>
        ),
      }}
      helperText={
        showCharCount && maxLength
          ? `${value?.length || 0}/${maxLength} characters`
          : props.helperText
      }
      inputProps={{
        maxLength: maxLength,
        ...props.inputProps,
      }}
      {...props}
    />
  );
};

// Enterprise Select with enhanced features
export const EnterpriseSelect = ({
  options = [],
  tooltip,
  multiple = false,
  searchable = false,
  groupBy,
  renderOption,
  value,
  onChange,
  label,
  error,
  helperText,
  required,
  disabled,
  ...props
}) => {
  if (searchable || groupBy || renderOption) {
    // Use Autocomplete for advanced features
    return (
      <Autocomplete
        value={value}
        onChange={(event, newValue) => {
          onChange({ target: { value: newValue } });
        }}
        options={options}
        multiple={multiple}
        disabled={disabled}
        groupBy={groupBy}
        renderOption={renderOption}
        renderInput={(params) => (
          <StyledTextField
            {...params}
            label={label}
            error={error}
            helperText={helperText}
            required={required}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {params.InputProps.endAdornment}
                  {tooltip && (
                    <InputAdornment position="end">
                      <Tooltip title={tooltip} arrow>
                        <InfoIcon color="action" fontSize="small" />
                      </Tooltip>
                    </InputAdornment>
                  )}
                </>
              ),
            }}
          />
        )}
        {...props}
      />
    );
  }

  // Standard Select for simple cases
  return (
    <StyledFormControl fullWidth error={error} disabled={disabled} required={required}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={onChange}
        label={label}
        multiple={multiple}
        endAdornment={
          tooltip && (
            <InputAdornment position="end" sx={{ mr: 3 }}>
              <Tooltip title={tooltip} arrow>
                <InfoIcon color="action" fontSize="small" />
              </Tooltip>
            </InputAdornment>
          )
        }
        {...props}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value || option}
            value={option.value || option}
          >
            {option.label || option}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </StyledFormControl>
  );
};

// Enterprise Checkbox with enhanced features
export const EnterpriseCheckbox = ({
  label,
  tooltip,
  size = 'medium',
  ...props
}) => {
  return (
    <FormControlLabel
      control={
        <Checkbox
          size={size}
          {...props}
        />
      }
      label={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          {tooltip && (
            <Tooltip title={tooltip} arrow>
              <InfoIcon color="action" fontSize="small" />
            </Tooltip>
          )}
        </div>
      }
    />
  );
};

// Enterprise Switch with enhanced features
export const EnterpriseSwitch = ({
  label,
  tooltip,
  size = 'medium',
  ...props
}) => {
  return (
    <FormControlLabel
      control={
        <Switch
          size={size}
          {...props}
        />
      }
      label={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          {tooltip && (
            <Tooltip title={tooltip} arrow>
              <InfoIcon color="action" fontSize="small" />
            </Tooltip>
          )}
        </div>
      }
    />
  );
};

// Enterprise Radio Group with enhanced features
export const EnterpriseRadioGroup = ({
  label,
  options = [],
  tooltip,
  row = false,
  ...props
}) => {
  return (
    <FormControl component="fieldset">
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        {label && <InputLabel component="legend">{label}</InputLabel>}
        {tooltip && (
          <Tooltip title={tooltip} arrow>
            <InfoIcon color="action" fontSize="small" />
          </Tooltip>
        )}
      </div>
      <RadioGroup row={row} {...props}>
        {options.map((option) => (
          <FormControlLabel
            key={option.value || option}
            value={option.value || option}
            control={<Radio />}
            label={option.label || option}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};

// Enterprise Slider with enhanced features
export const EnterpriseSlider = ({
  label,
  tooltip,
  showValue = true,
  unit = '',
  ...props
}) => {
  return (
    <FormControl fullWidth>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        {label && <InputLabel>{label}</InputLabel>}
        {tooltip && (
          <Tooltip title={tooltip} arrow>
            <InfoIcon color="action" fontSize="small" />
          </Tooltip>
        )}
      </div>
      <Slider
        valueLabelDisplay={showValue ? 'auto' : 'off'}
        valueLabelFormat={(value) => `${value}${unit}`}
        {...props}
      />
    </FormControl>
  );
};