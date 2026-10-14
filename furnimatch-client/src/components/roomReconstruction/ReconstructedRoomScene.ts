import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { TileProduct, TileLayoutOptions } from '../../types/tile';
import type { PlacedFurnitureItem, FurnitureModelDef } from '../../types/furniture';
import type { DetectedOpening, DetectedCeiling, DetectedFurnitureObject } from '../../types/roomReconstruction';
import { buildFurniture3DModel } from '../room3d/furnitureBuilder';
import { createTileTexturesAsync } from '../../utils/tileTextureGenerator';

export class ReconstructedRoomScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  // Metric Room Dimensions
  public roomWidth = 5.5;
  public roomLength = 6.0;
  public wallHeight = 2.8;
  public wallColorHex = '#eceae4';

  // Architectural Mesh Groups
  private roomArchitectureGroup = new THREE.Group();
  private floorMesh!: THREE.Mesh;
  private floorMaterial!: THREE.MeshPhysicalMaterial;
  private ceilingGroup = new THREE.Group();
  private isCeilingVisible = true;
  private openingsList: DetectedOpening[] = [];

  // Photo Perspective Backdrop Mesh
  private photoBackdropMesh: THREE.Mesh | null = null;
  private isPhotoOverlayActive = false;
  private photoTexture: THREE.Texture | null = null;

  // Floor PBR Textures
  private currentDiffuseTexture?: THREE.CanvasTexture;
  private currentRoughnessTexture?: THREE.CanvasTexture;
  private currentTile: TileProduct;
  private currentOptions: TileLayoutOptions;

  // Furniture Management (Separates Detected from Photo vs User-Added)
  private furnitureRoot = new THREE.Group();
  private placedItems = new Map<
    string,
    {
      group: THREE.Group;
      item: PlacedFurnitureItem;
      isDetectedFromPhoto: boolean;
      confidence?: number;
    }
  >();
  private selectedInstanceId: string | null = null;
  private selectionBoxHelper: THREE.BoxHelper | null = null;
  private isEditMode = false;

  // Raycasting & Floor Pointer Drag
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Y = 0
  private isDragging = false;
  private dragPlaneIntersect = new THREE.Vector3();
  private dragOffset = new THREE.Vector3();
  private draggedGroup: THREE.Group | null = null;

  // Lighting
  private isDayMode = true;
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private hemiLight!: THREE.HemisphereLight;
  private ceilingPointLight!: THREE.PointLight;

  // Smooth Camera Lerping
  private isTransitioningCamera = false;
  private targetCameraPos = new THREE.Vector3();
  private targetControlsTarget = new THREE.Vector3();
  private transitionProgress = 1;

  // Lifecycle
  private animationFrameId?: number;
  private isDisposed = false;

  // Callbacks
  public onSelectionChange?: (instanceId: string | null, isDetected?: boolean) => void;
  public onFurnitureChange?: (items: PlacedFurnitureItem[]) => void;
  public onFloorClick?: () => void;

  constructor(
    container: HTMLElement,
    initialTile: TileProduct,
    initialOptions: TileLayoutOptions,
    initialDimensions: { widthMeters: number; lengthMeters: number; heightMeters: number },
    initialWallColor: string,
    initialOpenings: DetectedOpening[] = [],
    initialCeiling?: DetectedCeiling,
    photoUrl?: string
  ) {
    this.container = container;
    this.currentTile = initialTile;
    this.currentOptions = initialOptions;
    this.roomWidth = initialDimensions.widthMeters || 5.5;
    this.roomLength = initialDimensions.lengthMeters || 6.0;
    this.wallHeight = initialDimensions.heightMeters || 2.8;
    this.wallColorHex = initialWallColor || '#eceae4';
    this.openingsList = initialOpenings;
    if (initialCeiling) {
      this.isCeilingVisible = initialCeiling.enabled;
    }

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0f172a');
    this.scene.fog = new THREE.FogExp2('#0f172a', 0.015);

    // 2. Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 50);
    this.resetCamera();

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    container.replaceChildren(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0.6, 0);
    this.controls.minDistance = 1.0;
    this.controls.maxDistance = 16.0;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minPolarAngle = 0.05;

    // 5. Lighting
    this.setupLighting();

    // 6. Architecture Group (Floor, Walls, Ceiling, Windows, Doors)
    this.scene.add(this.roomArchitectureGroup);
    this.scene.add(this.ceilingGroup);
    this.buildFullRoomArchitecture();

    // 7. Load Photo Texture for Overlay
    if (photoUrl) {
      this.loadPhotoTexture(photoUrl);
    }

    // 8. Furniture Root
    this.scene.add(this.furnitureRoot);

    // 9. Initial Floor Tile
    this.updateTile(initialTile, initialOptions);

    // 10. Pointer Interactions
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);

    // 11. Resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    // 12. Loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xd0c8b8, 0.42);
    this.hemiLight.position.set(0, 7, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff8ee, 1.65);
    this.sunLight.position.set(this.roomWidth * 0.75, this.wallHeight * 1.6, this.roomLength * 0.35);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 26;
    this.sunLight.shadow.camera.left = -7;
    this.sunLight.shadow.camera.right = 7;
    this.sunLight.shadow.camera.top = 7;
    this.sunLight.shadow.camera.bottom = -7;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.radius = 2.0;
    this.scene.add(this.sunLight);

    this.ceilingPointLight = new THREE.PointLight(0xfff0dd, 0.9, 10.0);
    this.ceilingPointLight.position.set(0, this.wallHeight - 0.2, 0);
    this.ceilingPointLight.castShadow = true;
    this.ceilingPointLight.shadow.bias = -0.0003;
    this.scene.add(this.ceilingPointLight);
  }

  // -------------------------------------------------------------
  // FULL 3D ARCHITECTURE (FLOOR, WALLS, CEILING, WINDOWS, DOORS)
  // -------------------------------------------------------------

  public buildFullRoomArchitecture() {
    // Clear old architecture
    while (this.roomArchitectureGroup.children.length > 0) {
      const child = this.roomArchitectureGroup.children[0];
      this.roomArchitectureGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    }

    const rw = this.roomWidth;
    const rl = this.roomLength;
    const wh = this.wallHeight;

    // 1. FLOOR MESH
    const floorGeo = new THREE.PlaneGeometry(rw, rl, 32, 32);
    if (!this.floorMaterial) {
      this.floorMaterial = new THREE.MeshPhysicalMaterial({
        roughness: 0.15,
        metalness: 0.02,
        clearcoat: 0.85,
        clearcoatRoughness: 0.15,
        reflectivity: 0.5,
      });
    }
    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMaterial);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.set(0, 0, 0);
    this.floorMesh.receiveShadow = true;
    this.floorMesh.userData = { isFloor: true };
    this.roomArchitectureGroup.add(this.floorMesh);

    // 2. WALL MATERIAL & MESHES
    const wallColor = parseInt(this.wallColorHex.replace('#', '0x')) || 0xeceae4;
    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.88,
      metalness: 0.02,
    });

    // Back Wall
    const backWallGeo = new THREE.BoxGeometry(rw, wh, 0.12);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, wh / 2, -rl / 2 - 0.06);
    backWall.receiveShadow = true;
    this.roomArchitectureGroup.add(backWall);

    // Left Wall
    const leftWallGeo = new THREE.BoxGeometry(0.12, wh, rl);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-rw / 2 - 0.06, wh / 2, 0);
    leftWall.receiveShadow = true;
    this.roomArchitectureGroup.add(leftWall);

    // Right Wall
    const rightWallGeo = new THREE.BoxGeometry(0.12, wh, rl);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(rw / 2 + 0.06, wh / 2, 0);
    rightWall.receiveShadow = true;
    this.roomArchitectureGroup.add(rightWall);

    // 3. SKIRTING BOARDS (Chân tường toàn bộ phòng)
    const skirtingMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.5 });
    const skirtingH = 0.09;
    const skirtingThick = 0.02;

    const backSkirting = new THREE.Mesh(new THREE.BoxGeometry(rw, skirtingH, skirtingThick), skirtingMat);
    backSkirting.position.set(0, skirtingH / 2, -rl / 2 + skirtingThick / 2);
    this.roomArchitectureGroup.add(backSkirting);

    const leftSkirting = new THREE.Mesh(new THREE.BoxGeometry(skirtingThick, skirtingH, rl), skirtingMat);
    leftSkirting.position.set(-rw / 2 + skirtingThick / 2, skirtingH / 2, 0);
    this.roomArchitectureGroup.add(leftSkirting);

    const rightSkirting = new THREE.Mesh(new THREE.BoxGeometry(skirtingThick, skirtingH, rl), skirtingMat);
    rightSkirting.position.set(rw / 2 - skirtingThick / 2, skirtingH / 2, 0);
    this.roomArchitectureGroup.add(rightSkirting);

    // 4. DYNAMIC OPENINGS: WINDOWS & DOORS
    this.buildOpenings3D();

    // 5. CEILING 3D MESH
    this.buildCeiling3D();

    // 6. Photo Backdrop Mesh if texture loaded
    if (this.photoTexture) {
      this.setupPhotoBackdropMesh();
    }
  }

  private buildCeiling3D() {
    while (this.ceilingGroup.children.length > 0) {
      const child = this.ceilingGroup.children[0];
      this.ceilingGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    }

    const rw = this.roomWidth;
    const rl = this.roomLength;
    const wh = this.wallHeight;

    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xfcfbf9, roughness: 0.95 });
    const mainCeiling = new THREE.Mesh(new THREE.BoxGeometry(rw + 0.24, 0.08, rl + 0.24), ceilingMat);
    mainCeiling.position.set(0, wh + 0.04, 0);
    this.ceilingGroup.add(mainCeiling);

    // Recessed light fixtures on ceiling
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    const lampGeo = new THREE.CircleGeometry(0.08, 16);
    const ringGeo = new THREE.RingGeometry(0.08, 0.11, 16);

    const lightPositions: [number, number][] = [
      [-rw * 0.25, -rl * 0.25],
      [rw * 0.25, -rl * 0.25],
      [-rw * 0.25, rl * 0.25],
      [rw * 0.25, rl * 0.25],
      [0, 0],
    ];

    lightPositions.forEach(([lx, lz]) => {
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(lx, wh - 0.001, lz);
      this.ceilingGroup.add(lamp);

      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(lx, wh - 0.001, lz);
      this.ceilingGroup.add(ring);
    });

    this.ceilingGroup.visible = this.isCeilingVisible;
  }

  private buildOpenings3D() {
    const rw = this.roomWidth;
    const rl = this.roomLength;
    const wh = this.wallHeight;

    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xebf8ff,
      transmission: 0.88,
      opacity: 0.35,
      transparent: true,
      roughness: 0.08,
      ior: 1.5,
    });
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const doorPanelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });

    this.openingsList.forEach((op) => {
      const opGroup = new THREE.Group();

      if (op.type === 'window') {
        const winW = Math.min(op.widthMeters, (op.wall === 'back' ? rw : rl) * 0.8);
        const winH = Math.min(op.heightMeters, wh - 0.6);
        const sillY = op.sillHeightMeters || 0.7;

        // Glass pane
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.02, winH, winW), glassMat);
        opGroup.add(glass);

        // Frame Top & Bottom
        const topFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, winW + 0.1), windowFrameMat);
        topFrame.position.set(0, winH / 2, 0);
        opGroup.add(topFrame);

        const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, winW + 0.1), windowFrameMat);
        bottomFrame.position.set(0, -winH / 2, 0);
        opGroup.add(bottomFrame);

        // Frame Left & Right
        const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, winH, 0.06), windowFrameMat);
        leftFrame.position.set(0, 0, -winW / 2);
        opGroup.add(leftFrame);

        const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, winH, 0.06), windowFrameMat);
        rightFrame.position.set(0, 0, winW / 2);
        opGroup.add(rightFrame);

        // Center Mullion
        const centerMullion = new THREE.Mesh(new THREE.BoxGeometry(0.06, winH, 0.04), windowFrameMat);
        opGroup.add(centerMullion);

        // Position on specified wall
        if (op.wall === 'right') {
          opGroup.position.set(rw / 2 - 0.02, sillY + winH / 2, (op.positionOffsetRatio || 0) * (rl * 0.3));
        } else if (op.wall === 'left') {
          opGroup.position.set(-rw / 2 + 0.02, sillY + winH / 2, (op.positionOffsetRatio || 0) * (rl * 0.3));
        } else {
          // Back wall
          opGroup.rotation.y = Math.PI / 2;
          opGroup.position.set((op.positionOffsetRatio || 0) * (rw * 0.3), sillY + winH / 2, -rl / 2 + 0.02);
        }

        this.roomArchitectureGroup.add(opGroup);
      } else if (op.type === 'door') {
        const doorW = op.widthMeters || 1.0;
        const doorH = Math.min(op.heightMeters || 2.2, wh - 0.1);

        // Door frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, doorH, doorW), doorFrameMat);
        frame.position.set(0, doorH / 2, 0);
        opGroup.add(frame);

        // Door panel
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.04, doorH - 0.06, doorW - 0.08), doorPanelMat);
        panel.position.set(0, doorH / 2, 0);
        opGroup.add(panel);

        // Door handle
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.12), handleMat);
        handle.position.set(0.04, 1.0, doorW * 0.35);
        opGroup.add(handle);

        if (op.wall === 'left') {
          opGroup.position.set(-rw / 2 + 0.02, 0, (op.positionOffsetRatio || 0) * (rl * 0.3));
        } else if (op.wall === 'right') {
          opGroup.position.set(rw / 2 - 0.02, 0, (op.positionOffsetRatio || 0) * (rl * 0.3));
        } else {
          opGroup.rotation.y = Math.PI / 2;
          opGroup.position.set((op.positionOffsetRatio || 0) * (rw * 0.3), 0, -rl / 2 + 0.02);
        }

        this.roomArchitectureGroup.add(opGroup);
      }
    });
  }

  private loadPhotoTexture(photoUrl: string) {
    const loader = new THREE.TextureLoader();
    loader.load(
      photoUrl,
      (tex) => {
        if (this.isDisposed) return;
        this.photoTexture = tex;
        this.photoTexture.colorSpace = THREE.SRGBColorSpace;
        this.setupPhotoBackdropMesh();
      },
      undefined,
      (err) => {
        console.warn('Could not load room photo texture:', err);
      }
    );
  }

  private setupPhotoBackdropMesh() {
    if (!this.photoTexture) return;

    if (this.photoBackdropMesh) {
      this.roomArchitectureGroup.remove(this.photoBackdropMesh);
      this.photoBackdropMesh.geometry.dispose();
      (this.photoBackdropMesh.material as THREE.Material).dispose();
      this.photoBackdropMesh = null;
    }

    const backdropGeo = new THREE.PlaneGeometry(this.roomWidth * 1.05, this.wallHeight * 1.05);
    const backdropMat = new THREE.MeshBasicMaterial({
      map: this.photoTexture,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });

    this.photoBackdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
    this.photoBackdropMesh.position.set(0, this.wallHeight / 2, -this.roomLength / 2 - 0.02);
    this.photoBackdropMesh.visible = this.isPhotoOverlayActive;
    this.roomArchitectureGroup.add(this.photoBackdropMesh);
  }

  public setPhotoOverlayMode(enabled: boolean) {
    this.isPhotoOverlayActive = enabled;
    if (this.photoBackdropMesh) {
      this.photoBackdropMesh.visible = enabled;
    }
  }

  public toggleCeiling(): boolean {
    this.isCeilingVisible = !this.isCeilingVisible;
    this.ceilingGroup.visible = this.isCeilingVisible;
    return this.isCeilingVisible;
  }

  public setCeilingVisible(visible: boolean) {
    this.isCeilingVisible = visible;
    this.ceilingGroup.visible = visible;
  }

  public setOpenings(openings: DetectedOpening[]) {
    this.openingsList = openings;
    this.buildFullRoomArchitecture();
  }

  public updateRoomDimensions(width: number, length: number, height: number) {
    this.roomWidth = Math.max(3.0, Math.min(10.0, width));
    this.roomLength = Math.max(3.0, Math.min(10.0, length));
    this.wallHeight = Math.max(2.4, Math.min(4.5, height));

    this.buildFullRoomArchitecture();

    if (this.ceilingPointLight) {
      this.ceilingPointLight.position.set(0, this.wallHeight - 0.25, 0);
    }
    if (this.sunLight) {
      this.sunLight.position.set(this.roomWidth * 0.75, this.wallHeight * 1.6, this.roomLength * 0.35);
    }

    this.clampAllFurnitureToBounds();
    this.updateTile(this.currentTile, this.currentOptions);
  }

  public setWallColor(hexColor: string) {
    this.wallColorHex = hexColor;
    this.buildFullRoomArchitecture();
  }

  private clampAllFurnitureToBounds() {
    const maxX = this.roomWidth / 2 - 0.35;
    const maxZ = this.roomLength / 2 - 0.35;

    this.placedItems.forEach((entry) => {
      const g = entry.group;
      const x = Math.min(maxX, Math.max(-maxX, g.position.x));
      const z = Math.min(maxZ, Math.max(-maxZ, g.position.z));
      g.position.set(x, 0, z);
      entry.item.position = [x, 0, z];
    });

    if (this.selectionBoxHelper) {
      this.selectionBoxHelper.update();
    }
    this.notifyFurnitureChange();
  }

  // -------------------------------------------------------------
  // DETECTED OBJECTS & FURNITURE MANAGEMENT
  // -------------------------------------------------------------

  public loadDetectedObjects(detectedObjects: DetectedFurnitureObject[]) {
    this.clearAllFurniture();

    detectedObjects.forEach((obj) => {
      const group = buildFurniture3DModel(obj.modelId, obj.dominantColor);
      group.position.set(obj.estimated3DPos[0], 0, obj.estimated3DPos[2]);
      group.rotation.y = obj.estimatedRotationY;
      group.userData = {
        instanceId: obj.id,
        modelId: obj.modelId,
        category: obj.category,
        isDetectedFromPhoto: true,
        confidence: obj.confidence,
      };

      this.furnitureRoot.add(group);

      const item: PlacedFurnitureItem = {
        instanceId: obj.id,
        modelId: obj.modelId,
        name: obj.name,
        category: obj.category,
        position: [obj.estimated3DPos[0], 0, obj.estimated3DPos[2]],
        rotationY: obj.estimatedRotationY,
        color: obj.dominantColor,
      };

      this.placedItems.set(obj.id, {
        group,
        item,
        isDetectedFromPhoto: true,
        confidence: obj.confidence,
      });
    });

    this.notifyFurnitureChange();
  }

  public addFurniture(modelDef: FurnitureModelDef): string {
    const instanceId = `furn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const group = buildFurniture3DModel(modelDef.id, modelDef.defaultColor);

    const posX = (Math.random() - 0.5) * (this.roomWidth * 0.25);
    const posZ = (Math.random() - 0.5) * (this.roomLength * 0.25);
    group.position.set(posX, 0, posZ);

    group.userData = {
      instanceId,
      modelId: modelDef.id,
      category: modelDef.category,
      isDetectedFromPhoto: false,
    };

    this.furnitureRoot.add(group);

    const item: PlacedFurnitureItem = {
      instanceId,
      modelId: modelDef.id,
      name: modelDef.name,
      category: modelDef.category,
      position: [posX, 0, posZ],
      rotationY: 0,
      color: modelDef.defaultColor,
    };

    this.placedItems.set(instanceId, {
      group,
      item,
      isDetectedFromPhoto: false,
    });
    this.selectFurniture(instanceId);
    this.notifyFurnitureChange();

    return instanceId;
  }

  public setPlacedFurnitureList(items: PlacedFurnitureItem[]) {
    this.clearAllFurniture();

    items.forEach((item) => {
      const group = buildFurniture3DModel(item.modelId, item.color);
      group.position.set(item.position[0], 0, item.position[2]);
      group.rotation.y = item.rotationY;
      group.userData = {
        instanceId: item.instanceId,
        modelId: item.modelId,
        category: item.category,
        isDetectedFromPhoto: item.instanceId.startsWith('det_'),
      };

      this.furnitureRoot.add(group);
      this.placedItems.set(item.instanceId, {
        group,
        item,
        isDetectedFromPhoto: item.instanceId.startsWith('det_'),
      });
    });

    this.notifyFurnitureChange();
  }

  public selectFurniture(instanceId: string | null) {
    this.selectedInstanceId = instanceId;

    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
      this.selectionBoxHelper = null;
    }

    let isDetected = false;
    if (instanceId && this.placedItems.has(instanceId)) {
      const entry = this.placedItems.get(instanceId)!;
      isDetected = entry.isDetectedFromPhoto;
      // Cyan box helper for detected objects, Emerald for user-added
      const boxColor = isDetected ? 0x06b6d4 : 0x10b981;
      this.selectionBoxHelper = new THREE.BoxHelper(entry.group, boxColor);
      this.scene.add(this.selectionBoxHelper);
    }

    if (this.onSelectionChange) {
      this.onSelectionChange(instanceId, isDetected);
    }
  }

  public rotateSelectedFurniture(deltaRad = Math.PI / 4) {
    if (!this.selectedInstanceId) return;
    const entry = this.placedItems.get(this.selectedInstanceId);
    if (!entry) return;

    entry.group.rotation.y += deltaRad;
    entry.item.rotationY = entry.group.rotation.y;

    if (this.selectionBoxHelper) {
      this.selectionBoxHelper.update();
    }
    this.notifyFurnitureChange();
  }

  public duplicateSelectedFurniture(): string | null {
    if (!this.selectedInstanceId) return null;
    const entry = this.placedItems.get(this.selectedInstanceId);
    if (!entry) return null;

    const newId = `furn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const group = buildFurniture3DModel(entry.item.modelId, entry.item.color);

    const newX = Math.min(this.roomWidth / 2 - 0.4, entry.group.position.x + 0.4);
    const newZ = Math.min(this.roomLength / 2 - 0.4, entry.group.position.z + 0.4);

    group.position.set(newX, 0, newZ);
    group.rotation.y = entry.group.rotation.y;
    group.userData = {
      instanceId: newId,
      modelId: entry.item.modelId,
      category: entry.item.category,
      isDetectedFromPhoto: false,
    };

    this.furnitureRoot.add(group);

    const newItem: PlacedFurnitureItem = {
      ...entry.item,
      instanceId: newId,
      position: [newX, 0, newZ],
    };

    this.placedItems.set(newId, {
      group,
      item: newItem,
      isDetectedFromPhoto: false,
    });
    this.selectFurniture(newId);
    this.notifyFurnitureChange();

    return newId;
  }

  public removeFurniture(instanceId: string) {
    const entry = this.placedItems.get(instanceId);
    if (!entry) return;

    if (this.selectedInstanceId === instanceId) {
      this.selectFurniture(null);
    }

    this.furnitureRoot.remove(entry.group);
    this.placedItems.delete(instanceId);
    this.notifyFurnitureChange();
  }

  public clearAllFurniture() {
    this.selectFurniture(null);
    while (this.furnitureRoot.children.length > 0) {
      const child = this.furnitureRoot.children[0];
      this.furnitureRoot.remove(child);
    }
    this.placedItems.clear();
    this.notifyFurnitureChange();
  }

  public getPlacedItems(): PlacedFurnitureItem[] {
    return Array.from(this.placedItems.values()).map((v) => ({ ...v.item }));
  }

  private notifyFurnitureChange() {
    if (this.onFurnitureChange) {
      this.onFurnitureChange(this.getPlacedItems());
    }
  }

  public setEditMode(isEdit: boolean) {
    this.isEditMode = isEdit;
  }

  // -------------------------------------------------------------
  // RAYCASTING & FLOOR INTERACTIONS
  // -------------------------------------------------------------

  private updateMouseCoords(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handlePointerDown(e: PointerEvent) {
    this.updateMouseCoords(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const furnitureHits = this.raycaster.intersectObjects(this.furnitureRoot.children, true);
    if (furnitureHits.length > 0) {
      let obj: THREE.Object3D | null = furnitureHits[0].object;
      while (obj && obj.parent && obj.parent !== this.furnitureRoot) {
        obj = obj.parent;
      }

      if (obj && obj.userData && obj.userData.instanceId) {
        const id = obj.userData.instanceId;
        this.selectFurniture(id);

        if (this.isEditMode) {
          this.isDragging = true;
          this.draggedGroup = obj as THREE.Group;
          this.controls.enabled = false;

          this.raycaster.ray.intersectPlane(this.floorPlane, this.dragPlaneIntersect);
          this.dragOffset.copy(obj.position).sub(this.dragPlaneIntersect);
          e.stopPropagation();
        }
        return;
      }
    }

    const floorHits = this.raycaster.intersectObject(this.floorMesh, false);
    if (floorHits.length > 0 && this.onFloorClick) {
      this.onFloorClick();
    }
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isDragging || !this.draggedGroup || !this.selectedInstanceId) return;

    this.updateMouseCoords(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.raycaster.ray.intersectPlane(this.floorPlane, this.dragPlaneIntersect)) {
      const targetPos = this.dragPlaneIntersect.clone().add(this.dragOffset);

      const maxX = this.roomWidth / 2 - 0.35;
      const maxZ = this.roomLength / 2 - 0.35;
      const clampedX = Math.min(maxX, Math.max(-maxX, targetPos.x));
      const clampedZ = Math.min(maxZ, Math.max(-maxZ, targetPos.z));

      this.draggedGroup.position.set(clampedX, 0, clampedZ);

      const entry = this.placedItems.get(this.selectedInstanceId);
      if (entry) {
        entry.item.position = [clampedX, 0, clampedZ];
      }

      if (this.selectionBoxHelper) {
        this.selectionBoxHelper.update();
      }
    }
  }

  private handlePointerUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedGroup = null;
      this.controls.enabled = true;
      this.notifyFurnitureChange();
    }
  }

  // -------------------------------------------------------------
  // TILE TEXTURES & MATERIAL
  // -------------------------------------------------------------

  public async updateTile(tile: TileProduct, options: TileLayoutOptions) {
    if (this.isDisposed) return;
    this.currentTile = tile;
    this.currentOptions = options;

    if (tile.has3DTexture === false) {
      return;
    }

    try {
      const { diffuseTexture, roughnessTexture } = await createTileTexturesAsync(
        tile,
        options,
        this.roomWidth,
        this.roomLength
      );

      if (this.isDisposed) return;

      if (this.currentDiffuseTexture && this.currentDiffuseTexture !== diffuseTexture) {
        this.currentDiffuseTexture.dispose();
      }
      if (this.currentRoughnessTexture && this.currentRoughnessTexture !== roughnessTexture) {
        this.currentRoughnessTexture.dispose();
      }

      this.currentDiffuseTexture = diffuseTexture;
      this.currentRoughnessTexture = roughnessTexture;

      this.floorMaterial.map = diffuseTexture;
      this.floorMaterial.roughnessMap = roughnessTexture;

      const matProps = tile.materialProperties;
      let roughness = matProps.roughness;
      let clearcoat = matProps.clearcoat;
      let clearcoatRoughness = matProps.clearcoatRoughness;

      if (options.finishEnhancement === 'glossy') {
        roughness = Math.max(0.04, roughness * 0.5);
        clearcoat = Math.min(1.0, clearcoat * 1.3 + 0.15);
        clearcoatRoughness = Math.max(0.05, clearcoatRoughness * 0.7);
      } else if (options.finishEnhancement === 'extra_matte') {
        roughness = Math.min(0.95, roughness * 1.3);
        clearcoat = Math.max(0.0, clearcoat * 0.2);
        clearcoatRoughness = 0.95;
      }

      this.floorMaterial.roughness = roughness;
      this.floorMaterial.metalness = matProps.metalness;
      this.floorMaterial.clearcoat = clearcoat;
      this.floorMaterial.clearcoatRoughness = clearcoatRoughness;
      this.floorMaterial.reflectivity = matProps.reflectivity ?? 0.5;

      this.floorMaterial.needsUpdate = true;
    } catch (err) {
      console.error('Error updating floor tile:', err);
    }
  }

  // -------------------------------------------------------------
  // CAMERA PRESETS (PHOTO PERSPECTIVE, TOP-DOWN, EYE-LEVEL)
  // -------------------------------------------------------------

  public resetCamera() {
    this.setCameraView(
      [this.roomWidth * 0.42, 2.1, this.roomLength * 0.52],
      [0, 0.6, 0]
    );
  }

  public setPhotoPerspectiveView() {
    // Aligns camera to the original photo perspective viewpoint
    this.setCameraView(
      [0, 1.45, this.roomLength * 0.5],
      [0, 1.0, -this.roomLength * 0.35]
    );
  }

  public setTopDownView() {
    this.setCameraView(
      [0, Math.max(this.roomWidth, this.roomLength) * 1.5, 0.01],
      [0, 0, 0]
    );
  }

  public setEyeLevelView() {
    this.setCameraView(
      [0, 1.6, this.roomLength * 0.4],
      [0, 1.2, -this.roomLength * 0.4]
    );
  }

  public setCameraView(pos: [number, number, number], target: [number, number, number]) {
    this.targetCameraPos.set(...pos);
    this.targetControlsTarget.set(...target);
    this.isTransitioningCamera = true;
    this.transitionProgress = 0;
  }

  public toggleLightingMode(): boolean {
    this.isDayMode = !this.isDayMode;
    if (this.isDayMode) {
      this.scene.background = new THREE.Color('#0f172a');
      this.scene.fog = new THREE.FogExp2('#0f172a', 0.015);
      this.sunLight.intensity = 1.65;
      this.sunLight.color.setHex(0xfff8ee);
      this.ambientLight.intensity = 0.72;
      this.ceilingPointLight.intensity = 0.9;
    } else {
      this.scene.background = new THREE.Color('#030712');
      this.scene.fog = new THREE.FogExp2('#030712', 0.022);
      this.sunLight.intensity = 0.25;
      this.sunLight.color.setHex(0x38bdf8);
      this.ambientLight.intensity = 0.38;
      this.ceilingPointLight.intensity = 1.85;
    }
    return this.isDayMode;
  }

  public captureScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  private handleResize() {
    if (!this.container || this.isDisposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate() {
    if (this.isDisposed) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (this.isTransitioningCamera) {
      this.transitionProgress += 0.055;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioningCamera = false;
        this.camera.position.copy(this.targetCameraPos);
        this.controls.target.copy(this.targetControlsTarget);
      } else {
        const ease = 0.5 - 0.5 * Math.cos(this.transitionProgress * Math.PI);
        this.camera.position.lerpVectors(this.camera.position, this.targetCameraPos, ease * 0.25);
        this.controls.target.lerpVectors(this.controls.target, this.targetControlsTarget, ease * 0.25);
      }
    }

    this.controls.update();

    if (this.selectionBoxHelper) {
      this.selectionBoxHelper.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.isDisposed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);

    this.clearAllFurniture();

    if (this.currentDiffuseTexture) this.currentDiffuseTexture.dispose();
    if (this.currentRoughnessTexture) this.currentRoughnessTexture.dispose();
    if (this.photoTexture) this.photoTexture.dispose();

    this.controls.dispose();
    this.renderer.dispose();

    if (this.container && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
