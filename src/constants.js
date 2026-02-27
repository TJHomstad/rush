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

// Colors — Shikaku block palette for sprinkles
export const SPRINKLE_COLORS = [
  "#FF4444", // Bright Red
  "#4488FF", // Royal Blue
  "#44DD44", // Lime Green
  "#FFDD44", // Sunny Yellow
  "#FF8844", // Vivid Orange
  "#AA44FF", // Bright Purple
  "#FF44AA", // Hot Pink
  "#44DDDD", // Teal
];

export const PIPE_COLOR = "#4A3728";       // empty: muted dark gray-brown
export const PIPE_FLOW_COLOR = "#FF1493";  // flowing: hot pink
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

// Happy donut frosting — vibrant spring palette (when filled/in flow)
export const HAPPY_FROSTING = {
  glazed:        { main: '#FECA57', highlight: '#FFF3A3' },
  chocolate:     { main: '#FF6B6B', highlight: '#FF9B9B' },
  pink_sprinkle: { main: '#FF6B9D', highlight: '#FF9DBF' },
  maple:         { main: '#A29BFE', highlight: '#C4BFFF' },
  boston_cream:   { main: '#54A0FF', highlight: '#85BFFF', cap: '#7BED9F' },
  powdered:      { main: '#7BED9F', highlight: '#A8F5C0' }
};

// Sad donut colors (unfilled — desaturated gray)
export const SAD_DONUT_BASE = '#A0A0A0';
export const SAD_DONUT_SHADOW = '#808080';
export const SAD_FROSTING = '#909090';

export const PIPE_OUTLINE = '#2A1506';
export const PIPE_FLOW_OUTLINE = '#3D0522';  // flowing: very dark magenta
export const PIPE_HIGHLIGHT = '#8B6040';
export const PIPE_FLOW_HIGHLIGHT = '#FF69B4'; // flowing: bright pink

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
