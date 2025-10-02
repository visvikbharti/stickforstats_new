/**
 * animationUtils.js
 * 
 * This module provides lightweight animation utilities to reduce dependencies on 
 * heavy animation libraries like framer-motion when simple animations are needed.
 */

import React, { useState, useEffect } from 'react';
import { keyframes, css } from '@emotion/react';
import { styled } from '@mui/material/styles';

// CSS Keyframe Animations
export const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

export const slideInUp = keyframes`
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

export const slideInDown = keyframes`
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

export const slideInLeft = keyframes`
  from {
    transform: translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

export const slideInRight = keyframes`
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

export const zoomIn = keyframes`
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
`;

export const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

// Styled components for common animations
export const FadeIn = styled('div')(
  ({ duration = 0.5, delay = 0, easing = 'ease' }) => css`
    animation: ${fadeIn} ${duration}s ${easing} ${delay}s forwards;
  `
);

export const SlideInUp = styled('div')(
  ({ duration = 0.5, delay = 0, easing = 'ease' }) => css`
    animation: ${slideInUp} ${duration}s ${easing} ${delay}s forwards;
  `
);

export const ZoomIn = styled('div')(
  ({ duration = 0.5, delay = 0, easing = 'ease' }) => css`
    animation: ${zoomIn} ${duration}s ${easing} ${delay}s forwards;
  `
);

export const Pulse = styled('div')(
  ({ duration = 2, delay = 0, easing = 'ease', infinite = true }) => css`
    animation: ${pulse} ${duration}s ${easing} ${delay}s ${infinite ? 'infinite' : '1'};
  `
);

// React Hooks for Animation

// Hook for fade in effect
export const useFadeIn = (inView = true, config = {}) => {
  const { duration = 0.5, delay = 0 } = config;
  
  return {
    style: {
      opacity: 0,
      animation: inView ? `${fadeIn} ${duration}s ease-in-out ${delay}s forwards` : 'none'
    }
  };
};

// Hook for slide in effect
export const useSlideIn = (inView = true, direction = 'up', config = {}) => {
  const { duration = 0.5, delay = 0 } = config;
  let animation;
  
  switch(direction) {
    case 'down':
      animation = slideInDown;
      break;
    case 'left':
      animation = slideInLeft;
      break;
    case 'right':
      animation = slideInRight;
      break;
    default:
      animation = slideInUp;
  }
  
  return {
    style: {
      opacity: 0,
      animation: inView ? `${animation} ${duration}s ease-out ${delay}s forwards` : 'none'
    }
  };
};

// Hook for sequential animation of multiple elements
export const useSequentialAnimation = (items = [], config = {}) => {
  const { delay = 0.1, initialDelay = 0, duration = 0.5, animation = fadeIn } = config;
  
  return items.map((item, index) => ({
    ...item,
    style: {
      opacity: 0,
      animation: `${animation} ${duration}s ease-out ${initialDelay + (delay * index)}s forwards`
    }
  }));
};

// Simple component for sequential item animation
export const SequentialFadeIn = ({ children, itemDelay = 0.1, initialDelay = 0, duration = 0.5 }) => {
  const childArray = React.Children.toArray(children);
  
  return (
    <>
      {childArray.map((child, index) => (
        <div
          key={index}
          style={{
            opacity: 0,
            animation: `${fadeIn} ${duration}s ease-out ${initialDelay + (itemDelay * index)}s forwards`
          }}
        >
          {child}
        </div>
      ))}
    </>
  );
};

// Hook for animating in based on scroll position
export const useScrollAnimation = (ref, threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold }
    );
    
    observer.observe(ref.current);
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, threshold]);
  
  return isVisible;
};

// Lazy load framer-motion for complex animations
export const MotionComponents = {
  motion: React.lazy(() => import('framer-motion').then(module => ({ default: module.motion }))),
  AnimatePresence: React.lazy(() => 
    import('framer-motion').then(module => ({ default: module.AnimatePresence }))
  ),
  useAnimation: React.lazy(() => 
    import('framer-motion').then(module => ({ default: module.useAnimation }))
  ),
};