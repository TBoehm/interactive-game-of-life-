import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Unmount React trees between tests.
afterEach(() => cleanup())

// jsdom implements neither the canvas 2D context nor Path2D, and computes no
// layout. The app's rendering is exercised by the engine/topology unit tests;
// here we only need the component logic (effects, events, prop wiring) to run,
// so we provide minimal stubs.

class FakeContext {
  setTransform() {}
  scale() {}
  translate() {}
  save() {}
  restore() {}
  clearRect() {}
  fillRect() {}
  drawImage() {}
  putImageData() {}
  fill() {}
  stroke() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  closePath() {}
  createImageData(w, h) {
    return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }
  }
}

HTMLCanvasElement.prototype.getContext = function getContext() {
  return new FakeContext()
}

globalThis.Path2D = class Path2D {
  moveTo() {}
  lineTo() {}
  closePath() {}
}

// Give elements a real, non-zero box so click coordinate math is meaningful.
Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
  return {
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON() {},
  }
}

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16)
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
}
