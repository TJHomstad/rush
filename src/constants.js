// Glaze Rush — Game Constants

export const DIFFICULTIES = ["Glazed", "Frosted", "Sprinkled", "Double Chocolate"];

export const SIZES_BY_DIFFICULTY = {
  "Glazed": [5, 7],
  "Frosted": [7, 10],
  "Sprinkled": [15, 20],
  "Double Chocolate": [25]
};

export const STORAGE_PREFIX = "glazerush.v1";
export const MAX_STORED_TIMES = 50;

export const TILE_TYPES = {
  TERMINAL: "terminal",
  STRAIGHT: "straight",
  ELBOW: "elbow",
  TEE: "tee",
  CROSS: "cross"
};

export const DONUT_STYLES = [
  "glazed",
  "chocolate",
  "pink_sprinkle",
  "maple",
  "boston_cream",
  "powdered"
];

// Colors
export const SPRINKLE_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#FF8C42"
];

export const PIPE_COLOR = "#5C3317";
export const PIPE_FLOW_COLOR = "#D2691E";
export const GAME_BG = "#FFF8F0";

// Donut terminal colors by style
export const DONUT_COLORS = {
  glazed: "#F4C430",
  chocolate: "#5C3317",
  pink_sprinkle: "#FF69B4",
  maple: "#C68E17",
  boston_cream: "#FDEBD0",
  powdered: "#FFFAFA"
};

// Richer palette for 3D rendering
export const DONUT_BASE = '#E8B960';
export const DONUT_BASE_SHADOW = '#C4943D';
export const FROSTING_COLORS = {
  glazed: { main: '#F4D03F', highlight: '#F9E97A' },
  chocolate: { main: '#5C3317', highlight: '#7B4B2A' },
  pink_sprinkle: { main: '#FF85C0', highlight: '#FFB3D9' },
  maple: { main: '#C68E17', highlight: '#D9A84A' },
  boston_cream: { main: '#FDEBD0', highlight: '#FFF5E6', cap: '#5C3317' },
  powdered: { main: '#FFFAFA', highlight: '#FFFFFF' }
};
export const PIPE_OUTLINE = '#2A1506';
export const PIPE_HIGHLIGHT = '#8B6040';
export const PIPE_FLOW_HIGHLIGHT = '#E8943A';

// Connection directions: 0=top, 1=right, 2=bottom, 3=left
export const DIR = { TOP: 0, RIGHT: 1, BOTTOM: 2, LEFT: 3 };

// Direction offsets: [dRow, dCol] for each direction
export const DIR_OFFSET = {
  0: [-1, 0],  // top
  1: [0, 1],   // right
  2: [1, 0],   // bottom
  3: [0, -1]   // left
};

// Opposite direction mapping
export const OPPOSITE = { 0: 2, 1: 3, 2: 0, 3: 1 };

// Base connections for each tile type at rotation=0
export const BASE_CONNECTIONS = {
  terminal: [0],
  straight: [0, 2],
  elbow: [0, 1],
  tee: [0, 1, 2],
  cross: [0, 1, 2, 3]
};
