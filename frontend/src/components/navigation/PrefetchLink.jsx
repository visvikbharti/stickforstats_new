import React, { useEffect, useRef, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { prefetch } from '../../utils/prefetchManager';

/**
 * PrefetchLink component
 * 
 * Enhanced Link component that adds intelligent prefetching capabilities.
 * When the link becomes visible or is hovered, it prefetches the linked resource.
 * 
 * @param {Object} props - Component props
 * @param {string} props.to - Path to link to
 * @param {string} props.prefetchStrategy - When to prefetch: 'hover', 'visible', 'eager', or 'none'
 * @param {Node} props.children - Child elements
 * @param {Object} props.rest - Additional props to pass to Link component
 */
const PrefetchLink = forwardRef(({ 
  to, 
  prefetchStrategy = 'hover', 
  children,
  ...rest 
}, ref) => {
  const internalRef = useRef(null);
  const linkRef = ref || internalRef;
  const prefetched = useRef(false);
  
  // Set up listeners based on prefetch strategy
  useEffect(() => {
    const link = linkRef.current;
    
    // Skip if no link or already prefetched
    if (!link || prefetched.current) return;
    
    // For eager strategy, prefetch immediately
    if (prefetchStrategy === 'eager') {
      prefetchResource();
      return;
    }
    
    // For hover strategy, prefetch on hover
    if (prefetchStrategy === 'hover') {
      const handleMouseEnter = () => {
        prefetchResource();
      };
      
      link.addEventListener('mouseenter', handleMouseEnter, { once: true });
      
      return () => {
        link.removeEventListener('mouseenter', handleMouseEnter);
      };
    }
    
    // For visible strategy, use IntersectionObserver
    if (prefetchStrategy === 'visible' && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            prefetchResource();
            observer.disconnect();
          }
        });
      }, {
        rootMargin: '200px', // Start prefetching when within 200px
        threshold: 0.1,      // When 10% of the link is visible
      });
      
      observer.observe(link);
      
      return () => {
        observer.disconnect();
      };
    }
  }, [to, prefetchStrategy]);
  
  // Prefetch the resource
  const prefetchResource = () => {
    if (!prefetched.current && to && to.startsWith('/')) {
      prefetch(to);
      prefetched.current = true;
    }
  };
  
  // Use a span wrapper to attach ref since Link doesn't accept refs directly
  return (
    <span ref={linkRef} style={{ display: 'inline' }}>
      <Link 
        to={to}
        {...rest}
      >
        {children}
      </Link>
    </span>
  );
});

PrefetchLink.displayName = 'PrefetchLink';

PrefetchLink.propTypes = {
  to: PropTypes.string.isRequired,
  prefetchStrategy: PropTypes.oneOf(['none', 'hover', 'visible', 'eager']),
  children: PropTypes.node.isRequired
};

export default PrefetchLink;