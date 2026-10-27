// Small worlds have equal margins; larger worlds retain edge-clamped following.
export function cameraAxisPosition(position, worldSize, viewportSize) {
  if (worldSize < viewportSize) return (worldSize - viewportSize) / 2;
  return Math.max(0, Math.min(worldSize - viewportSize, position));
}
