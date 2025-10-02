import React, { useState } from 'react';
import {
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Box,
} from '@mui/material';
import {
  Help as HelpIcon,
  Tour as TourIcon,
  MenuBook as DocsIcon,
  Support as SupportIcon,
  Feedback as FeedbackIcon,
  Keyboard as KeyboardIcon,
  VideoLibrary as VideoIcon,
} from '@mui/icons-material';
import { useTour } from './TourProvider';
import { useNavigate } from 'react-router-dom';

const HelpButton = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { startTour } = useTour();
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleStartTour = () => {
    handleClose();
    startTour();
  };

  const handleNavigate = (path) => {
    handleClose();
    navigate(path);
  };

  const menuItems = [
    {
      icon: <TourIcon />,
      label: 'Take a Tour',
      onClick: handleStartTour,
      divider: false,
    },
    {
      icon: <DocsIcon />,
      label: 'Documentation',
      onClick: () => window.open('/docs', '_blank'),
      divider: false,
    },
    {
      icon: <VideoIcon />,
      label: 'Video Tutorials',
      onClick: () => window.open('/tutorials', '_blank'),
      divider: true,
    },
    {
      icon: <KeyboardIcon />,
      label: 'Keyboard Shortcuts',
      onClick: () => handleNavigate('/keyboard-shortcuts'),
      divider: false,
    },
    {
      icon: <SupportIcon />,
      label: 'Support Center',
      onClick: () => window.open('/support', '_blank'),
      divider: false,
    },
    {
      icon: <FeedbackIcon />,
      label: 'Send Feedback',
      onClick: () => handleNavigate('/feedback'),
      divider: false,
    },
  ];

  return (
    <>
      <Tooltip title="Help & Resources" placement="left">
        <Fab
          color="primary"
          size="medium"
          onClick={handleClick}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1100,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            '&:hover': {
              transform: 'scale(1.05)',
              transition: 'transform 0.2s',
            },
          }}
        >
          <HelpIcon />
        </Fab>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            minWidth: 220,
            mt: -2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, mb: 1 }}>
          <ListItemText
            primary="Need Help?"
            secondary="Choose an option below"
            primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </Box>
        
        {menuItems.map((item, index) => (
          <React.Fragment key={index}>
            <MenuItem onClick={item.onClick}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
            {item.divider && <Divider sx={{ my: 0.5 }} />}
          </React.Fragment>
        ))}
      </Menu>
    </>
  );
};

export default HelpButton;