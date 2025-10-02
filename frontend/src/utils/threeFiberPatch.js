/**
 * Patch file to modify THREE imports for react-three-fiber
 * 
 * This fixes issues with BatchedMesh which is not available in Three.js 0.155.0
 */

import * as THREE from 'three';

// Create a proxy of THREE that removes BatchedMesh references
const patchedTHREE = new Proxy(THREE, {
  get: (target, prop) => {
    // Skip BatchedMesh property
    if (prop === 'BatchedMesh') {
      return undefined;
    }
    return target[prop];
  }
});

export default patchedTHREE;