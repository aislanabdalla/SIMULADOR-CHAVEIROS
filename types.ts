
export enum ShapeType {
  ROUND = 'Round',
  SQUARE = 'Square',
  RECT = 'Rect',
  CONTOUR = 'Contour'
}

export interface PrintSettings {
  shape: ShapeType;
  size: number; // in cm
  baseColor: string;
  palette: string[];
  maxColors: number;
  holePosition: { x: number; y: number }; // X/Y coordinates relative to center
  colorMapping: Record<string, string>; // Maps detected original hex -> new user hex
  erasedColors: string[]; // List of hex colors from the original palette to be made transparent
}

export interface AppState {
  logo: string | null; // Data URL (Original)
  settings: PrintSettings;
  generatedImage: string | null; // Base64 or URL
  isGenerating: boolean;
  error: string | null;
  approvedReferences: string[]; // List of approved render base64s for style consistency
}
