interface OffsetConfig {
  offsetX: number;
  offsetY: number;
}

// Map of grid sizes (rows × cols) to their respective offsets
const gridOffsets: Record<number, OffsetConfig> = {
  3: {
    offsetX: 0.2,
    offsetY: 0.01
  },
  6: {
    offsetX: 0.5,
    offsetY: 0.07
  },
  9: {
    offsetX: 0.7,
    offsetY: 0.11
  },
  12: {
    offsetX: 1.0,
    offsetY: 0.26
  },
  15: {
    offsetX: 1.3,
    offsetY: 0.35
  }
};

/**
 * Gets offset configuration for a specific grid size
 * @param rows Number of rows
 * @param cols Number of columns
 * @returns Offset configuration for the grid size
 */
export const getGridOffset = (rows: number, cols: number): OffsetConfig => {
  const gridSize = rows * cols
  
  // Return the matching offset config or a default if no match is found
  return gridOffsets[rows];
};

export default gridOffsets;