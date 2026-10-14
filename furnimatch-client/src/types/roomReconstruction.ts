import type { TileLayoutOptions } from './tile';
import type { PlacedFurnitureItem } from './furniture';

export interface FloorPolygonPoint {
  x: number; // Percentage 0 - 100%
  y: number; // Percentage 0 - 100%
}

export interface FloorPolygon {
  topLeft: FloorPolygonPoint;
  topRight: FloorPolygonPoint;
  bottomRight: FloorPolygonPoint;
  bottomLeft: FloorPolygonPoint;
}

export interface ExtractedColors {
  primaryWallColor: string; // e.g. "#f3f0e8"
  accentWallColor: string;  // e.g. "#3b4252"
  floorColor: string;       // e.g. "#c8bca7"
  ceilingColor: string;     // e.g. "#faf9f6"
  ambientLightColor: string;// e.g. "#fff5eb"
  brightness: number;       // 0 - 1
}

export interface EstimatedRoomDimensions {
  widthMeters: number;   // e.g. 5.2
  lengthMeters: number;  // e.g. 5.8
  heightMeters: number;  // e.g. 2.8
  roomType: 'living_room' | 'bedroom' | 'studio' | 'office';
  confidenceScore: number; // 0 - 100%
  aspectRatio: number;
}

export interface DetectedOpening {
  id: string;
  type: 'window' | 'door';
  wall: 'back' | 'left' | 'right';
  positionOffsetRatio: number; // -0.8 to 0.8 along the wall
  widthMeters: number;
  heightMeters: number;
  sillHeightMeters: number; // Height from floor to bottom (0 for doors, ~0.8m for windows)
  confidence: number;       // 0 - 100%
  bbox2D: {
    x: number;      // 0 - 100%
    y: number;      // 0 - 100%
    width: number;  // 0 - 100%
    height: number; // 0 - 100%
  };
  label: string;
}

export interface DetectedCeiling {
  enabled: boolean;
  color: string;
  estimatedHeight: number;
  hasRecessedLights: boolean;
  confidence: number;
}

export interface DetectedFurnitureObject {
  id: string;
  modelId: string;
  name: string;
  category: 'bed' | 'wardrobe' | 'sofa' | 'desk' | 'decor';
  confidence: number;       // 0 - 100%
  bbox2D: {
    x: number;      // 0 - 100%
    y: number;      // 0 - 100%
    width: number;  // 0 - 100%
    height: number; // 0 - 100%
  };
  estimated3DPos: [number, number, number]; // [x, y, z] in meters on floor
  estimatedRotationY: number;
  estimatedDimensions: {
    widthM: number;
    lengthM: number;
    heightM: number;
  };
  dominantColor: string;
  source: 'detected_from_photo' | 'user_added';
  isOccluded?: boolean;
}

export interface PhotoAnalysisResult {
  photoUrl: string;
  photoFileName: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  detectedColors: ExtractedColors;
  estimatedDimensions: EstimatedRoomDimensions;
  floorPolygon: FloorPolygon;
  openings: DetectedOpening[];
  ceiling: DetectedCeiling;
  detectedFurniture: DetectedFurnitureObject[];
  analyzedAt: string;
}

export interface RoomCalibrationConfig {
  floorPolygon: FloorPolygon;
  dimensions: {
    widthMeters: number;
    lengthMeters: number;
    heightMeters: number;
  };
  wallColor: string;
  roomType: 'living_room' | 'bedroom' | 'studio' | 'office';
  photoUrl: string;
  openings: DetectedOpening[];
  ceiling: DetectedCeiling;
  detectedFurniture: DetectedFurnitureObject[];
}

export interface ReconstructedRoomDesign {
  id: string;
  name: string;
  photoUrl: string;
  photoFileName: string;
  thumbnailUrl?: string;
  calibration: RoomCalibrationConfig;
  selectedTileId: string;
  layoutOptions: TileLayoutOptions;
  placedFurniture: PlacedFurnitureItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SampleRoomPhoto {
  id: string;
  title: string;
  subtitle: string;
  roomType: 'living_room' | 'bedroom' | 'studio' | 'office';
  photoUrl: string;
  thumbnailUrl: string;
  defaultPolygon: FloorPolygon;
  defaultDimensions: {
    widthMeters: number;
    lengthMeters: number;
    heightMeters: number;
  };
  defaultWallColor: string;
  defaultOpenings: DetectedOpening[];
  defaultCeiling: DetectedCeiling;
  defaultFurniture: PlacedFurnitureItem[];
  defaultDetectedFurniture: DetectedFurnitureObject[];
}
