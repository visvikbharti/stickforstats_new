/**
 * This module provides a patched version of the Three.js library
 * with a stub BatchedMesh to fix compatibility issues with react-three-fiber.
 */
import * as THREE from 'three';

// Create a stub BatchedMesh class that extends Object3D
class BatchedMesh extends THREE.Object3D {
  constructor(maxInstanceCount, maxVertexCount, maxIndexCount = maxVertexCount * 3) {
    super();
    this.isBatchedMesh = true;
    this.maxInstanceCount = maxInstanceCount;
    this.maxVertexCount = maxVertexCount;
    this.maxIndexCount = maxIndexCount;
    this._geometryCount = 0;
    this._vertexCount = 0;
    this._indexCount = 0;
    this._geometryInitialized = false;
    this._geometries = [];
    this._matricesTexture = null;
    this._colorsTexture = null;
    this.boundingBox = null;
    this.boundingSphere = null;
  }
  
  dispose() {
    // Cleanup textures and geometries
    if (this._matricesTexture) this._matricesTexture.dispose();
    if (this._colorsTexture) this._colorsTexture.dispose();
  }
  
  setDrawRange(start, count) {
    this._drawRange = { start, count };
  }
  
  getDrawRange() {
    return this._drawRange || { start: 0, count: 0 };
  }
  
  addGeometry(geometry, vertexCount = -1, indexCount = -1) {
    // Stub implementation
    this._geometries.push(geometry);
    this._geometryCount++;
    return this._geometryCount - 1;
  }
  
  setMatrixAt(id, matrix) {
    // Stub implementation
  }
  
  setColorAt(id, color) {
    // Stub implementation
  }
  
  setVisibleAt(id, visible) {
    // Stub implementation
  }
  
  getMatrixAt(id, matrix) {
    // Stub implementation
    return matrix.identity();
  }
  
  getColorAt(id, color) {
    // Stub implementation
    return color.set(1, 1, 1);
  }
  
  getVisibleAt(id) {
    // Stub implementation
    return true;
  }
}

// Create a patched version of THREE with a stub BatchedMesh
const patchedTHREE = { 
  ...THREE,
  BatchedMesh
};

// Re-export all THREE exports but override BatchedMesh
export * from 'three';

// Override the BatchedMesh export
export { BatchedMesh };

// Also ensure it's available on the default export
export default patchedTHREE;