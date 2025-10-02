/**
 * Animation Utilities for PCA Education
 *
 * Helpers for smooth animations, easing functions, and frame management.
 * All functions use requestAnimationFrame for optimal performance.
 */

/**
 * Easing functions
 * All functions map [0,1] → [0,1] with different acceleration curves
 */
export const easing = {
  linear: (t) => t,

  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - --t * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),

  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t) => Math.sqrt(1 - --t * t),
  easeInOutCirc: (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
      : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2,

  easeInElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },

  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  easeInOutElastic: (t) => {
    const c5 = (2 * Math.PI) / 4.5;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  }
};

/**
 * Interpolate between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Time parameter [0,1]
 * @param {Function} easingFn - Easing function (default: linear)
 * @returns {number} Interpolated value
 */
export const lerp = (start, end, t, easingFn = easing.linear) => {
  const easedT = easingFn(Math.max(0, Math.min(1, t)));
  return start + (end - start) * easedT;
};

/**
 * Interpolate between two 2D points
 * @param {{x: number, y: number}} start - Start point
 * @param {{x: number, y: number}} end - End point
 * @param {number} t - Time parameter [0,1]
 * @param {Function} easingFn - Easing function
 * @returns {{x: number, y: number}} Interpolated point
 */
export const lerpPoint = (start, end, t, easingFn = easing.linear) => ({
  x: lerp(start.x, end.x, t, easingFn),
  y: lerp(start.y, end.y, t, easingFn)
});

/**
 * Animate a value from start to end over duration
 * @param {Object} params
 * @param {number} params.from - Start value
 * @param {number} params.to - End value
 * @param {number} params.duration - Duration in ms
 * @param {Function} params.onUpdate - Callback with current value
 * @param {Function} params.onComplete - Callback on completion
 * @param {Function} params.easingFn - Easing function
 * @returns {Function} Cancel function
 */
export const animate = ({
  from,
  to,
  duration,
  onUpdate,
  onComplete,
  easingFn = easing.easeInOutQuad
}) => {
  const startTime = performance.now();
  let animationId = null;
  let cancelled = false;

  const step = (currentTime) => {
    if (cancelled) return;

    const elapsed = currentTime - startTime;
    const t = Math.min(elapsed / duration, 1);

    const value = lerp(from, to, t, easingFn);
    onUpdate(value);

    if (t < 1) {
      animationId = requestAnimationFrame(step);
    } else {
      if (onComplete) onComplete();
    }
  };

  animationId = requestAnimationFrame(step);

  // Return cancel function
  return () => {
    cancelled = true;
    if (animationId) cancelAnimationFrame(animationId);
  };
};

/**
 * Animate angle sweep for variance search
 * @param {Object} params
 * @param {number} params.fromAngle - Start angle (radians)
 * @param {number} params.toAngle - End angle (radians)
 * @param {number} params.duration - Duration in ms
 * @param {Function} params.onUpdate - Callback with angle and variance
 * @param {Function} params.calculateVariance - Function to calculate variance at angle
 * @param {Function} params.onComplete - Callback on completion
 * @returns {Function} Cancel function
 */
export const animateVarianceSearch = ({
  fromAngle,
  toAngle,
  duration,
  onUpdate,
  calculateVariance,
  onComplete
}) => {
  let maxVariance = -Infinity;
  let maxAngle = fromAngle;

  return animate({
    from: fromAngle,
    to: toAngle,
    duration,
    easingFn: easing.linear,
    onUpdate: (angle) => {
      const variance = calculateVariance(angle);

      if (variance > maxVariance) {
        maxVariance = variance;
        maxAngle = angle;
      }

      onUpdate(angle, variance, maxAngle, maxVariance);
    },
    onComplete: () => {
      if (onComplete) onComplete(maxAngle, maxVariance);
    }
  });
};

/**
 * Pulse animation (for highlighting)
 * @param {Object} params
 * @param {number} params.baseValue - Base value
 * @param {number} params.amplitude - Pulse amplitude
 * @param {number} params.frequency - Frequency (Hz)
 * @param {Function} params.onUpdate - Callback with current value
 * @returns {Function} Stop function
 */
export const pulseAnimation = ({ baseValue, amplitude, frequency, onUpdate }) => {
  const startTime = performance.now();
  let animationId = null;
  let stopped = false;

  const step = (currentTime) => {
    if (stopped) return;

    const elapsed = (currentTime - startTime) / 1000; // seconds
    const value = baseValue + amplitude * Math.sin(2 * Math.PI * frequency * elapsed);
    onUpdate(value);

    animationId = requestAnimationFrame(step);
  };

  animationId = requestAnimationFrame(step);

  return () => {
    stopped = true;
    if (animationId) cancelAnimationFrame(animationId);
  };
};

/**
 * Spring animation (physics-based)
 * @param {Object} params
 * @param {number} params.from - Start value
 * @param {number} params.to - Target value
 * @param {number} params.stiffness - Spring stiffness (default: 100)
 * @param {number} params.damping - Damping coefficient (default: 10)
 * @param {number} params.mass - Mass (default: 1)
 * @param {Function} params.onUpdate - Callback with current value
 * @param {Function} params.onComplete - Callback on completion
 * @returns {Function} Cancel function
 */
export const springAnimation = ({
  from,
  to,
  stiffness = 100,
  damping = 10,
  mass = 1,
  onUpdate,
  onComplete
}) => {
  let position = from;
  let velocity = 0;
  const target = to;

  let lastTime = performance.now();
  let animationId = null;
  let cancelled = false;

  const threshold = 0.001; // Stop when close enough

  const step = (currentTime) => {
    if (cancelled) return;

    const dt = (currentTime - lastTime) / 1000; // seconds
    lastTime = currentTime;

    // Spring force: F = -k * (x - target)
    // Damping force: F = -c * v
    // F = ma => a = F / m
    const springForce = -stiffness * (position - target);
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;

    velocity += acceleration * dt;
    position += velocity * dt;

    onUpdate(position);

    // Check if settled
    if (Math.abs(position - target) < threshold && Math.abs(velocity) < threshold) {
      onUpdate(target);
      if (onComplete) onComplete();
      return;
    }

    animationId = requestAnimationFrame(step);
  };

  animationId = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    if (animationId) cancelAnimationFrame(animationId);
  };
};

/**
 * Sequence multiple animations
 * @param {Array<Function>} animations - Array of animation creator functions
 * @returns {Function} Cancel function
 */
export const sequence = (animations) => {
  let currentIndex = 0;
  let currentCancel = null;

  const runNext = () => {
    if (currentIndex >= animations.length) return;

    const animConfig = animations[currentIndex];
    currentIndex++;

    const originalOnComplete = animConfig.onComplete;
    animConfig.onComplete = () => {
      if (originalOnComplete) originalOnComplete();
      runNext();
    };

    currentCancel = animate(animConfig);
  };

  runNext();

  return () => {
    if (currentCancel) currentCancel();
  };
};

/**
 * Run multiple animations in parallel
 * @param {Array<Function>} animations - Array of animation creator functions
 * @returns {Function} Cancel all function
 */
export const parallel = (animations) => {
  const cancels = animations.map(animConfig => animate(animConfig));

  return () => {
    cancels.forEach(cancel => cancel());
  };
};

/**
 * Delay execution
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise<void>}
 */
export const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * FPS counter utility
 * @returns {{start: Function, stop: Function, getFPS: Function}}
 */
export const fpsCounter = () => {
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 60;
  let animationId = null;

  const update = () => {
    frameCount++;
    const currentTime = performance.now();

    if (currentTime >= lastTime + 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      frameCount = 0;
      lastTime = currentTime;
    }

    animationId = requestAnimationFrame(update);
  };

  return {
    start: () => {
      lastTime = performance.now();
      frameCount = 0;
      animationId = requestAnimationFrame(update);
    },
    stop: () => {
      if (animationId) cancelAnimationFrame(animationId);
    },
    getFPS: () => fps
  };
};
