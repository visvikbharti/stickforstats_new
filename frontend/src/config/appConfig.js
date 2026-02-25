// MathJax configuration
export const mathJaxConfig = {
  loader: { load: ["[tex]/html"] },
  tex: {
    packages: { "[+]": ["html"] },
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"]
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"]
    ]
  }
};

// Prefetch manager configuration
export const prefetchOptions = {
  // Navigation pattern tracking
  maxPathLength: 10,
  maxPathsToStore: 100,
  minimumVisitThreshold: 2,

  // Prefetching behavior
  prefetchThreshold: 0.25,
  maxPrefetchResources: 5,
  prefetchDocuments: true,
  prefetchAssets: true,

  // Prefetching constraints
  respectDataSaver: true,
  onlyFastConnections: true,

  // Debug
  debug: process.env.NODE_ENV === 'development'
};
