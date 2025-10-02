import React from 'react';
import { styled } from '@mui/material/styles';
import { Box, Paper, Typography, Fade } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * Enhanced tooltip component with rich content and animations
 */
const TooltipContent = styled(Paper)(({ theme }) => ({
  maxWidth: 320,
  padding: theme.spacing(1.5),
  backgroundColor: 'rgba(15, 17, 26, 0.95)',
  color: '#fff',
  borderRadius: theme.shape.borderRadius * 1.5,
  boxShadow: '0 8px 15px rgba(0, 0, 0, 0.2)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage: 'radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent 70%)',
    pointerEvents: 'none',
  }
}));

/**
 * EnhancedTooltip component for displaying rich educational content
 * 
 * @param {Object} props
 * @param {string} props.title - Title of the tooltip content
 * @param {React.ReactNode} props.content - Main content of the tooltip
 * @param {React.ReactNode} props.image - Optional image or visualization to include
 * @param {string} props.formula - Optional mathematical formula to display
 * @param {Object} props.customStyles - Additional styles to apply to the tooltip
 */
const EnhancedTooltip = ({ title, content, image, formula, customStyles = {} }) => {
  return (
    <Fade in={true} timeout={300}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <TooltipContent elevation={6} sx={{ ...customStyles }}>
          {title && (
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#fff' }}>
              {title}
            </Typography>
          )}
          
          {content && (
            <Typography variant="body2" sx={{ fontSize: '0.8rem', opacity: 0.9, mb: 1 }}>
              {content}
            </Typography>
          )}
          
          {image && (
            <Box sx={{ my: 1, textAlign: 'center' }}>
              {image}
            </Box>
          )}
          
          {formula && (
            <Box 
              sx={{ 
                p: 1, 
                my: 1, 
                borderRadius: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
                fontStyle: 'italic'
              }}
            >
              {formula}
            </Box>
          )}
        </TooltipContent>
      </motion.div>
    </Fade>
  );
};

export default EnhancedTooltip;