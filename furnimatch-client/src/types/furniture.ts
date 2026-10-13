export type RoomType = 'living_room' | 'bedroom';

export type FurnitureCategory = 'bed' | 'wardrobe' | 'sofa' | 'desk' | 'decor';

export interface FurnitureModelDef {
  id: string;
  name: string;
  category: FurnitureCategory;
  categoryLabel: string;
  dimensions: {
    lengthCm: number; // Chiều dài (cm)
    widthCm: number;  // Chiều rộng / sâu (cm)
    heightCm: number; // Chiều cao (cm)
  };
  sizeLabel: string;
  description: string;
  defaultColor?: string;
  supportedRooms: RoomType[];
  thumbnailIcon: string;
}

export interface PlacedFurnitureItem {
  instanceId: string;
  modelId: string;
  name: string;
  category: FurnitureCategory;
  position: [number, number, number]; // [x, y, z] in meters
  rotationY: number;                  // Góc xoay trục Y (radians)
  color?: string;
}

export interface RoomDesignConfig {
  roomType: RoomType;
  selectedTileId: string;
  layoutOptions: any;
  furnitureItems: PlacedFurnitureItem[];
  savedAt: string;
}
