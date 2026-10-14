import type { SampleRoomPhoto } from '../types/roomReconstruction';

/**
 * Creates SVG Data URLs representing realistic room interiors for instant demo testing
 */
function createSampleRoomSvg(theme: 'modern_living' | 'master_bedroom' | 'empty_room'): string {
  if (theme === 'modern_living') {
    return `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#bae6fd"/>
            <stop offset="100%" stop-color="#e0f2fe"/>
          </linearGradient>
          <linearGradient id="backWallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#eceae4"/>
            <stop offset="100%" stop-color="#dedad0"/>
          </linearGradient>
          <linearGradient id="leftWallGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#c9c4b7"/>
            <stop offset="100%" stop-color="#dedad0"/>
          </linearGradient>
          <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#c7bba8"/>
            <stop offset="100%" stop-color="#9d8f7a"/>
          </linearGradient>
          <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" flood-opacity="0.25"/>
          </filter>
        </defs>
        
        <!-- Ceiling with Recessed Lights -->
        <polygon points="0,0 1200,0 1000,120 200,120" fill="#f8f7f4"/>
        <circle cx="400" cy="60" r="14" fill="#ffffff" opacity="0.9"/>
        <circle cx="600" cy="60" r="14" fill="#ffffff" opacity="0.9"/>
        <circle cx="800" cy="60" r="14" fill="#ffffff" opacity="0.9"/>
        
        <!-- Back Wall -->
        <polygon points="200,120 1000,120 1000,440 200,440" fill="url(#backWallGrad)"/>
        
        <!-- Left Wall & Doorway -->
        <polygon points="0,0 200,120 200,440 0,680" fill="url(#leftWallGrad)"/>
        <!-- Door on Left Wall -->
        <polygon points="40,320 160,240 160,510 40,620" fill="#475569"/>
        
        <!-- Right Wall & Large Balcony Window -->
        <polygon points="1200,0 1000,120 1000,440 1200,680" fill="#dedad0"/>
        <!-- Window opening with outdoor sky -->
        <polygon points="1040,160 1180,70 1180,590 1040,410" fill="url(#skyGrad)"/>
        <line x1="1110" y1="115" x2="1110" y2="500" stroke="#ffffff" stroke-width="6"/>
        <line x1="1040" y1="285" x2="1180" y2="285" stroke="#ffffff" stroke-width="6"/>
        
        <!-- Baseboards (Skirting) -->
        <polygon points="200,432 1000,432 1000,440 200,440" fill="#4a4238"/>
        <polygon points="0,668 200,432 200,440 0,680" fill="#3a3228"/>
        <polygon points="1000,432 1200,668 1200,680 1000,440" fill="#3a3228"/>
        
        <!-- Floor -->
        <polygon points="0,680 200,440 1000,440 1200,680 1200,800 0,800" fill="url(#floorGrad)"/>
        
        <!-- TV Console & Wall Art Frame -->
        <rect x="420" y="160" width="360" height="190" rx="4" fill="#ffffff" stroke="#1e293b" stroke-width="6" filter="url(#softShadow)"/>
        <rect x="340" y="380" width="520" height="48" rx="4" fill="#5c4331" filter="url(#softShadow)"/>
        
        <!-- Sofa in room center -->
        <rect x="360" y="470" width="480" height="110" rx="16" fill="#334155" filter="url(#softShadow)"/>
        <!-- Coffee Table -->
        <ellipse cx="600" cy="620" rx="90" ry="32" fill="#d4c5b3" filter="url(#softShadow)"/>
        
        <!-- Badge -->
        <rect x="40" y="40" width="300" height="48" rx="24" fill="#0f172a" fill-opacity="0.85"/>
        <text x="190" y="70" fill="#34d399" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="middle">
          Phòng Khách Có Sofa &amp; Cửa Sổ
        </text>
      </svg>
    `)}`;
  }

  if (theme === 'master_bedroom') {
    return `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
        <defs>
          <linearGradient id="bWall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e8e4dc"/>
            <stop offset="100%" stop-color="#dad4c8"/>
          </linearGradient>
          <linearGradient id="bFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#b39f86"/>
            <stop offset="100%" stop-color="#826e57"/>
          </linearGradient>
          <filter id="bedShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="16" stdDeviation="20" flood-opacity="0.3"/>
          </filter>
        </defs>
        
        <!-- Ceiling -->
        <polygon points="0,0 1200,0 960,110 240,110" fill="#faf9f6"/>
        
        <!-- Back Wall with Wood Slats -->
        <polygon points="240,110 960,110 960,430 240,430" fill="url(#bWall)"/>
        <rect x="420" y="110" width="360" height="320" fill="#785c44"/>
        
        <!-- Left Wall with Window -->
        <polygon points="0,0 240,110 240,430 0,690" fill="#d0c9bc"/>
        <polygon points="30,140 180,200 180,480 30,570" fill="#bae6fd"/>
        
        <!-- Right Wall with Wardrobe -->
        <polygon points="1200,0 960,110 960,430 1200,690" fill="#c4bcae"/>
        <!-- Wardrobe along right wall -->
        <polygon points="1020,160 1160,230 1160,610 1020,470" fill="#cbd5e1" stroke="#94a3b8" stroke-width="4"/>
        
        <!-- Skirting -->
        <polygon points="240,422 960,422 960,430 240,430" fill="#3d352b"/>
        
        <!-- Floor -->
        <polygon points="0,690 240,430 960,430 1200,690 1200,800 0,800" fill="url(#bFloor)"/>
        
        <!-- Master Bed -->
        <rect x="420" y="320" width="360" height="220" rx="12" fill="#334155" filter="url(#bedShadow)"/>
        <!-- Mattress & Pillows -->
        <rect x="440" y="350" width="320" height="180" rx="6" fill="#f8fafc"/>
        <rect x="460" y="360" width="120" height="50" rx="4" fill="#ffffff" stroke="#e2e8f0"/>
        <rect x="620" y="360" width="120" height="50" rx="4" fill="#ffffff" stroke="#e2e8f0"/>
        <!-- Nightstands -->
        <rect x="320" y="390" width="75" height="70" rx="4" fill="#8a6b4d"/>
        <rect x="805" y="390" width="75" height="70" rx="4" fill="#8a6b4d"/>
        
        <!-- Badge -->
        <rect x="40" y="40" width="300" height="48" rx="24" fill="#0f172a" fill-opacity="0.85"/>
        <text x="190" y="70" fill="#38bdf8" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="middle">
          Phòng Ngủ Có Giường &amp; Tủ
        </text>
      </svg>
    `)}`;
  }

  // empty_room
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
      <defs>
        <linearGradient id="eWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f4f4f5"/>
          <stop offset="100%" stop-color="#e4e4e7"/>
        </linearGradient>
        <linearGradient id="eFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d4d4d8"/>
          <stop offset="100%" stop-color="#a1a1aa"/>
        </linearGradient>
      </defs>
      
      <!-- Ceiling -->
      <polygon points="0,0 1200,0 980,120 220,120" fill="#ffffff"/>
      <circle cx="600" cy="60" r="16" fill="#fef08a" opacity="0.8"/>
      
      <!-- Back Wall -->
      <polygon points="220,120 980,120 980,450 220,450" fill="url(#eWall)"/>
      
      <!-- Left Wall -->
      <polygon points="0,0 220,120 220,450 0,680" fill="#e4e4e7"/>
      <!-- Door on left wall -->
      <polygon points="50,310 170,240 170,500 50,600" fill="#cbd5e1" stroke="#94a3b8" stroke-width="4"/>
      
      <!-- Right Wall with Clear Balcony Window -->
      <polygon points="1200,0 980,120 980,450 1200,680" fill="#d4d4d8"/>
      <polygon points="1020,180 1160,95 1160,590 1020,460" fill="#bae6fd"/>
      <line x1="1090" y1="135" x2="1090" y2="525" stroke="#ffffff" stroke-width="5"/>
      
      <!-- Skirting -->
      <polygon points="220,442 980,442 980,450 220,450" fill="#27272a"/>
      <polygon points="0,670 220,442 220,450 0,680" fill="#27272a"/>
      <polygon points="980,442 1200,670 1200,680 980,450" fill="#27272a"/>
      
      <!-- Clean, Visible Floor -->
      <polygon points="0,680 220,450 980,450 1200,680 1200,800 0,800" fill="url(#eFloor)"/>
      
      <!-- Badge -->
      <rect x="40" y="40" width="310" height="48" rx="24" fill="#0f172a" fill-opacity="0.85"/>
      <text x="195" y="70" fill="#fbbf24" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="middle">
        Phòng Trống (Rõ Sàn &amp; Tường)
      </text>
    </svg>
  `)}`;
}

export const SAMPLE_ROOMS: SampleRoomPhoto[] = [
  // 1. PHÒNG KHÁCH CÓ SOFA VÀ CỬA SỔ
  {
    id: 'sample-living-room',
    title: 'Phòng Khách Có Sofa & Cửa Sổ',
    subtitle: 'Không gian mở 33m² có sofa văng nỉ, bàn trà và cửa sổ kính lớn đón sáng',
    roomType: 'living_room',
    photoUrl: createSampleRoomSvg('modern_living'),
    thumbnailUrl: createSampleRoomSvg('modern_living'),
    defaultPolygon: {
      topLeft: { x: 17, y: 55 },
      topRight: { x: 83, y: 55 },
      bottomRight: { x: 96, y: 95 },
      bottomLeft: { x: 4, y: 95 },
    },
    defaultDimensions: {
      widthMeters: 5.6,
      lengthMeters: 6.0,
      heightMeters: 2.8,
    },
    defaultWallColor: '#eceae4',
    defaultCeiling: {
      enabled: true,
      color: '#f8f7f4',
      estimatedHeight: 2.8,
      hasRecessedLights: true,
      confidence: 92,
    },
    defaultOpenings: [
      {
        id: 'win-right-living',
        type: 'window',
        wall: 'right',
        positionOffsetRatio: 0,
        widthMeters: 3.2,
        heightMeters: 2.0,
        sillHeightMeters: 0.6,
        confidence: 94,
        bbox2D: { x: 74, y: 15, width: 22, height: 50 },
        label: 'Cửa sổ ban công lớn',
      },
      {
        id: 'door-left-living',
        type: 'door',
        wall: 'left',
        positionOffsetRatio: 0.4,
        widthMeters: 1.1,
        heightMeters: 2.2,
        sillHeightMeters: 0,
        confidence: 86,
        bbox2D: { x: 5, y: 35, width: 14, height: 45 },
        label: 'Cửa ra vào sảnh',
      },
    ],
    defaultDetectedFurniture: [
      {
        id: 'det-sofa-living',
        modelId: 'sofa-3seat',
        name: 'Sofa Văng 3 Chỗ Charcoal (Nhận diện từ ảnh)',
        category: 'sofa',
        confidence: 93,
        bbox2D: { x: 30, y: 52, width: 40, height: 20 },
        estimated3DPos: [0, 0, -1.0],
        estimatedRotationY: 0,
        estimatedDimensions: { widthM: 2.3, lengthM: 0.92, heightM: 0.82 },
        dominantColor: '#334155',
        source: 'detected_from_photo',
      },
      {
        id: 'det-table-living',
        modelId: 'coffee-table-round',
        name: 'Bàn Trà Tròn (Nhận diện từ ảnh)',
        category: 'sofa',
        confidence: 88,
        bbox2D: { x: 42, y: 68, width: 16, height: 12 },
        estimated3DPos: [0, 0, 0.4],
        estimatedRotationY: 0,
        estimatedDimensions: { widthM: 0.8, lengthM: 0.8, heightM: 0.38 },
        dominantColor: '#d4c5b3',
        source: 'detected_from_photo',
      },
      {
        id: 'det-tv-living',
        modelId: 'tv-console-modern',
        name: 'Kệ TV & Màn Hình (Nhận diện trên tường)',
        category: 'desk',
        confidence: 90,
        bbox2D: { x: 28, y: 25, width: 44, height: 18 },
        estimated3DPos: [0, 0, -2.6],
        estimatedRotationY: 0,
        estimatedDimensions: { widthM: 2.4, lengthM: 0.42, heightM: 1.5 },
        dominantColor: '#5c4331',
        source: 'detected_from_photo',
      },
    ],
    defaultFurniture: [
      {
        instanceId: 'sample-sofa',
        modelId: 'sofa-3seat',
        name: 'Sofa Văng 3 Chỗ Bọc Nỉ Charcoal',
        category: 'sofa',
        position: [0, 0, -1.0],
        rotationY: 0,
        color: '#334155',
      },
      {
        instanceId: 'sample-table',
        modelId: 'coffee-table-round',
        name: 'Bàn Trà Tròn Scandinavian',
        category: 'sofa',
        position: [0, 0, 0.4],
        rotationY: 0,
        color: '#d4c5b3',
      },
      {
        instanceId: 'sample-chair',
        modelId: 'accent-chair',
        name: 'Ghế Bành Thư Giãn Armchair',
        category: 'desk',
        position: [1.7, 0, 0.2],
        rotationY: -0.6,
        color: '#d97706',
      },
      {
        instanceId: 'sample-tv',
        modelId: 'tv-console-modern',
        name: 'Kệ TV Hiện Đại Kèm Màn Hình 65"',
        category: 'desk',
        position: [0, 0, -2.6],
        rotationY: 0,
        color: '#5c4331',
      },
    ],
  },

  // 2. PHÒNG NGỦ CÓ GIƯỜNG VÀ TỦ
  {
    id: 'sample-master-bedroom',
    title: 'Phòng Ngủ Có Giường & Tủ',
    subtitle: 'Diện tích 24m² có giường đôi bọc nệm, tab đầu giường và tủ quần áo sát tường',
    roomType: 'bedroom',
    photoUrl: createSampleRoomSvg('master_bedroom'),
    thumbnailUrl: createSampleRoomSvg('master_bedroom'),
    defaultPolygon: {
      topLeft: { x: 20, y: 54 },
      topRight: { x: 80, y: 54 },
      bottomRight: { x: 95, y: 95 },
      bottomLeft: { x: 5, y: 95 },
    },
    defaultDimensions: {
      widthMeters: 4.8,
      lengthMeters: 5.2,
      heightMeters: 2.8,
    },
    defaultWallColor: '#e8e4dc',
    defaultCeiling: {
      enabled: true,
      color: '#faf9f6',
      estimatedHeight: 2.8,
      hasRecessedLights: true,
      confidence: 90,
    },
    defaultOpenings: [
      {
        id: 'win-left-bed',
        type: 'window',
        wall: 'left',
        positionOffsetRatio: -0.2,
        widthMeters: 2.2,
        heightMeters: 1.6,
        sillHeightMeters: 0.8,
        confidence: 92,
        bbox2D: { x: 5, y: 20, width: 18, height: 40 },
        label: 'Cửa sổ bên trái giường',
      },
    ],
    defaultDetectedFurniture: [
      {
        id: 'det-bed-master',
        modelId: 'bed-queen',
        name: 'Giường Đôi Master (Nhận diện từ ảnh)',
        category: 'bed',
        confidence: 95,
        bbox2D: { x: 35, y: 40, width: 30, height: 35 },
        estimated3DPos: [0, 0, -0.9],
        estimatedRotationY: 0,
        estimatedDimensions: { widthM: 1.86, lengthM: 2.06, heightM: 0.95 },
        dominantColor: '#334155',
        source: 'detected_from_photo',
      },
      {
        id: 'det-wardrobe-master',
        modelId: 'wardrobe-3door',
        name: 'Tủ Quần Áo Sát Tường (Nhận diện từ ảnh)',
        category: 'wardrobe',
        confidence: 91,
        bbox2D: { x: 75, y: 30, width: 18, height: 50 },
        estimated3DPos: [1.8, 0, -0.6],
        estimatedRotationY: -Math.PI / 2,
        estimatedDimensions: { widthM: 1.8, lengthM: 0.6, heightM: 2.1 },
        dominantColor: '#cbd5e1',
        source: 'detected_from_photo',
      },
      {
        id: 'det-nightstand-master',
        modelId: 'nightstand-pair',
        name: 'Tab Đầu Giường (Nhận diện từ ảnh)',
        category: 'wardrobe',
        confidence: 84,
        bbox2D: { x: 26, y: 50, width: 8, height: 16 },
        estimated3DPos: [-1.45, 0, -1.5],
        estimatedRotationY: 0,
        estimatedDimensions: { widthM: 0.5, lengthM: 0.42, heightM: 0.48 },
        dominantColor: '#8a6b4d',
        source: 'detected_from_photo',
      },
    ],
    defaultFurniture: [
      {
        instanceId: 'sample-bed',
        modelId: 'bed-queen',
        name: 'Giường Đôi Master Bọc Nệm',
        category: 'bed',
        position: [0, 0, -0.9],
        rotationY: 0,
        color: '#334155',
      },
      {
        instanceId: 'sample-nightstand-left',
        modelId: 'nightstand-pair',
        name: 'Tab Đầu Giường Tối Giản',
        category: 'wardrobe',
        position: [-1.45, 0, -1.5],
        rotationY: 0,
        color: '#8a6b4d',
      },
      {
        instanceId: 'sample-wardrobe',
        modelId: 'wardrobe-3door',
        name: 'Tủ Quần Áo 3 Cánh Hiện Đại',
        category: 'wardrobe',
        position: [1.8, 0, -0.6],
        rotationY: -Math.PI / 2,
        color: '#cbd5e1',
      },
    ],
  },

  // 3. PHÒNG TƯƠNG ĐỐI TRỐNG, NHÌN RÕ SÀN VÀ TƯỜNG
  {
    id: 'sample-empty-room',
    title: 'Phòng Trống (Rõ Sàn & Tường)',
    subtitle: 'Không gian mở 25m² bàn giao thô, mặt sàn và các diện tường rõ ràng, sẵn sàng thiết kế',
    roomType: 'studio',
    photoUrl: createSampleRoomSvg('empty_room'),
    thumbnailUrl: createSampleRoomSvg('empty_room'),
    defaultPolygon: {
      topLeft: { x: 18, y: 56 },
      topRight: { x: 82, y: 56 },
      bottomRight: { x: 96, y: 96 },
      bottomLeft: { x: 4, y: 96 },
    },
    defaultDimensions: {
      widthMeters: 4.8,
      lengthMeters: 5.2,
      heightMeters: 2.8,
    },
    defaultWallColor: '#f4f4f5',
    defaultCeiling: {
      enabled: true,
      color: '#ffffff',
      estimatedHeight: 2.8,
      hasRecessedLights: true,
      confidence: 96,
    },
    defaultOpenings: [
      {
        id: 'win-empty-right',
        type: 'window',
        wall: 'right',
        positionOffsetRatio: 0,
        widthMeters: 2.6,
        heightMeters: 2.0,
        sillHeightMeters: 0.6,
        confidence: 95,
        bbox2D: { x: 75, y: 18, width: 20, height: 48 },
        label: 'Cửa sổ kính lớn',
      },
      {
        id: 'door-empty-left',
        type: 'door',
        wall: 'left',
        positionOffsetRatio: 0.3,
        widthMeters: 1.0,
        heightMeters: 2.2,
        sillHeightMeters: 0,
        confidence: 91,
        bbox2D: { x: 6, y: 35, width: 14, height: 42 },
        label: 'Cửa ra vào',
      },
    ],
    defaultDetectedFurniture: [], // Không có đồ nội thất -> phòng trống
    defaultFurniture: [],        // Phòng trống sẵn sàng cho người dùng thêm gạch và nội thất
  },
];
