import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { TileProduct, TileLayoutOptions } from '../../types/tile';
import type { RoomType, PlacedFurnitureItem, FurnitureModelDef } from '../../types/furniture';
import { DEFAULT_LIVING_ROOM_LAYOUT, DEFAULT_BEDROOM_LAYOUT, FURNITURE_CATALOG } from '../../data/furnitureCatalog';
import { buildFurniture3DModel } from './furnitureBuilder';
import { createTileTexturesAsync } from '../../utils/tileTextureGenerator';

export class RoomScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private floorMesh!: THREE.Mesh;
  private floorMaterial!: THREE.MeshPhysicalMaterial;
  private currentDiffuseTexture?: THREE.CanvasTexture;
  private currentRoughnessTexture?: THREE.CanvasTexture;
  private animationFrameId?: number;
  private isDisposed = false;

  // Dynamic furniture management
  private furnitureRoot = new THREE.Group();
  private placedItems = new Map<string, { group: THREE.Group; item: PlacedFurnitureItem }>();
  private currentRoomType: RoomType = 'living_room';
  private selectedInstanceId: string | null = null;
  private selectionBoxHelper: THREE.BoxHelper | null = null;
  private isEditMode = false;

  // Drag and drop interaction
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Y = 0 plane
  private isDragging = false;
  private dragPlaneIntersect = new THREE.Vector3();
  private dragOffset = new THREE.Vector3();
  private draggedGroup: THREE.Group | null = null;

  // Camera lerp target for smooth transitions
  private isTransitioningCamera = false;
  private targetCameraPos = new THREE.Vector3();
  private targetControlsTarget = new THREE.Vector3();
  private transitionProgress = 1;

  // Lighting
  private isDayMode = true;
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private warmPendantLight!: THREE.PointLight;

  // Callbacks to React UI
  public onSelectionChange?: (instanceId: string | null) => void;
  public onFurnitureChange?: (items: PlacedFurnitureItem[]) => void;

  constructor(
    container: HTMLElement,
    initialTile: TileProduct,
    initialOptions: TileLayoutOptions,
    initialRoomType: RoomType = 'living_room'
  ) {
    this.container = container;
    this.currentRoomType = initialRoomType;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#eef2f6');
    this.scene.fog = new THREE.FogExp2('#eef2f6', 0.025);

    // 2. Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    this.camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 50);
    this.camera.position.set(2.3, 1.9, 3.1);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    container.replaceChildren(this.renderer.domElement);

    // 4. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0.55, 0);

    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 5.6;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.06;
    this.controls.minPolarAngle = 0.12;

    // 5. Environment Architecture
    this.setupLighting();
    this.buildRoomArchitecture();

    // 6. Dynamic Furniture Root
    this.scene.add(this.furnitureRoot);
    this.loadDefaultLayout(initialRoomType);

    // 7. Apply initial floor tile
    this.updateTile(initialTile, initialOptions);

    // 8. Interaction Event Listeners
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);

    // 9. Render loop
    this.animate = this.animate.bind(this);
    this.animate();

    // 10. Resize listener
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  private setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
    this.scene.add(this.ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd0c8b8, 0.42);
    hemiLight.position.set(0, 5, 0);
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff6e8, 1.6);
    this.sunLight.position.set(4.2, 3.8, 1.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 16;
    this.sunLight.shadow.camera.left = -4;
    this.sunLight.shadow.camera.right = 4;
    this.sunLight.shadow.camera.top = 4;
    this.sunLight.shadow.camera.bottom = -4;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.radius = 2.5;
    this.scene.add(this.sunLight);

    this.warmPendantLight = new THREE.PointLight(0xfff0db, 0.85, 6.5);
    this.warmPendantLight.position.set(0, 2.6, 0);
    this.warmPendantLight.castShadow = true;
    this.warmPendantLight.shadow.mapSize.width = 1024;
    this.warmPendantLight.shadow.mapSize.height = 1024;
    this.warmPendantLight.shadow.bias = -0.0003;
    this.scene.add(this.warmPendantLight);
  }

  private buildRoomArchitecture() {
    const roomWidth = 6.0;
    const roomDepth = 5.0;
    const wallHeight = 2.8;

    // The Tile Floor with MeshPhysicalMaterial
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth, 32, 32);
    this.floorMaterial = new THREE.MeshPhysicalMaterial({
      roughness: 0.15,
      metalness: 0.02,
      clearcoat: 0.85,
      clearcoatRoughness: 0.15,
      reflectivity: 0.5,
    });
    this.floorMesh = new THREE.Mesh(floorGeometry, this.floorMaterial);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.set(0, 0, 0);
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // Skirting Board
    const skirtingMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.5 });
    const skirtingH = 0.09;
    const skirtingThick = 0.02;

    const backSkirting = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, skirtingH, skirtingThick), skirtingMat);
    backSkirting.position.set(0, skirtingH / 2, -roomDepth / 2 + skirtingThick / 2);
    this.scene.add(backSkirting);

    const leftSkirting = new THREE.Mesh(new THREE.BoxGeometry(skirtingThick, skirtingH, roomDepth), skirtingMat);
    leftSkirting.position.set(-roomWidth / 2 + skirtingThick / 2, skirtingH / 2, 0);
    this.scene.add(leftSkirting);

    // Back Wall
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 0.85 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, wallHeight, 0.1), wallMat);
    backWall.position.set(0, wallHeight / 2, -roomDepth / 2 - 0.05);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Fluted Wood Slats on left Back Wall
    const slatGroup = new THREE.Group();
    const slatWoodMat = new THREE.MeshStandardMaterial({ color: 0xb58963, roughness: 0.6 });
    for (let i = 0; i < 22; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.035, wallHeight, 0.025), slatWoodMat);
      slat.position.set(-roomWidth / 2 + 0.15 + i * 0.065, wallHeight / 2, -roomDepth / 2 + 0.012);
      slat.castShadow = true;
      slatGroup.add(slat);
    }
    this.scene.add(slatGroup);

    // Left Wall & Doorway
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, wallHeight, roomDepth), wallMat);
    leftWall.position.set(-roomWidth / 2 - 0.05, wallHeight / 2, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.4 });
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.1), doorFrameMat);
    doorFrame.position.set(-roomWidth / 2 + 0.02, 1.1, 1.2);
    this.scene.add(doorFrame);

    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 2.14, 0.98),
      new THREE.MeshStandardMaterial({ color: 0xe8e2d9, roughness: 0.6 })
    );
    doorPanel.position.set(-roomWidth / 2 + 0.02, 1.1, 1.2);
    this.scene.add(doorPanel);

    // Right Wall Balcony Window
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x222224, roughness: 0.3 });
    const windowGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xeaf5ff,
      transmission: 0.88,
      opacity: 0.35,
      transparent: true,
      roughness: 0.1,
      ior: 1.5,
    });

    const windowGroup = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.02, wallHeight - 0.2, roomDepth - 0.6), windowGlassMat);
    glass.position.set(roomWidth / 2 - 0.02, wallHeight / 2, 0);
    windowGroup.add(glass);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, roomDepth - 0.5), windowFrameMat);
    frameTop.position.set(roomWidth / 2 - 0.02, wallHeight - 0.1, 0);
    windowGroup.add(frameTop);

    const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, roomDepth - 0.5), windowFrameMat);
    frameBottom.position.set(roomWidth / 2 - 0.02, 0.04, 0);
    windowGroup.add(frameBottom);

    const mullionCenter = new THREE.Mesh(new THREE.BoxGeometry(0.06, wallHeight - 0.2, 0.08), windowFrameMat);
    mullionCenter.position.set(roomWidth / 2 - 0.02, wallHeight / 2, 0);
    windowGroup.add(mullionCenter);

    // Balcony Backdrop
    const backdropCanvas = document.createElement('canvas');
    backdropCanvas.width = 512;
    backdropCanvas.height = 320;
    const bCtx = backdropCanvas.getContext('2d');
    if (bCtx) {
      const grad = bCtx.createLinearGradient(0, 0, 0, 320);
      grad.addColorStop(0, '#c7e6ff');
      grad.addColorStop(0.55, '#e4f3ff');
      grad.addColorStop(0.7, '#a5d6a7');
      grad.addColorStop(1, '#81c784');
      bCtx.fillStyle = grad;
      bCtx.fillRect(0, 0, 512, 320);
      bCtx.fillStyle = '#66bb6a';
      for (let i = 0; i < 8; i++) {
        bCtx.beginPath();
        bCtx.arc(40 + i * 65, 230 + Math.sin(i) * 15, 45, 0, Math.PI * 2);
        bCtx.fill();
      }
    }
    const backdropTex = new THREE.CanvasTexture(backdropCanvas);
    const backdropMat = new THREE.MeshBasicMaterial({ map: backdropTex });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), backdropMat);
    backdrop.rotation.y = -Math.PI / 2;
    backdrop.position.set(roomWidth / 2 + 1.2, 1.8, 0);
    windowGroup.add(backdrop);

    // Curtains
    const curtainMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.65 });
    const curtainFront = new THREE.Mesh(new THREE.BoxGeometry(0.06, wallHeight - 0.15, 0.7), curtainMat);
    curtainFront.position.set(roomWidth / 2 - 0.08, wallHeight / 2, roomDepth / 2 - 0.55);
    windowGroup.add(curtainFront);

    const curtainBack = new THREE.Mesh(new THREE.BoxGeometry(0.06, wallHeight - 0.15, 0.7), curtainMat);
    curtainBack.position.set(roomWidth / 2 - 0.08, wallHeight / 2, -roomDepth / 2 + 0.55);
    windowGroup.add(curtainBack);

    this.scene.add(windowGroup);

    // Ceiling
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xfaf9f5, roughness: 0.95 });
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(roomWidth + 0.2, 0.1, roomDepth + 0.2), ceilingMat);
    ceiling.position.set(0, wallHeight + 0.05, 0);
    this.scene.add(ceiling);
  }

  // -------------------------------------------------------------
  // DYNAMIC FURNITURE MANAGEMENT
  // -------------------------------------------------------------

  public setRoomType(roomType: RoomType) {
    if (this.currentRoomType === roomType) return;
    this.currentRoomType = roomType;
    this.loadDefaultLayout(roomType);
  }

  public getRoomType(): RoomType {
    return this.currentRoomType;
  }

  public setEditMode(isEdit: boolean) {
    this.isEditMode = isEdit;
    if (!isEdit) {
      this.selectFurniture(null);
    }
  }

  public getEditMode(): boolean {
    return this.isEditMode;
  }

  public loadDefaultLayout(roomType: RoomType) {
    this.clearAllFurniture();
    const layout = roomType === 'bedroom' ? DEFAULT_BEDROOM_LAYOUT : DEFAULT_LIVING_ROOM_LAYOUT;
    layout.forEach((item) => {
      this.spawnFurnitureItem(item);
    });
    this.notifyFurnitureChange();
  }

  public resetFurnitureLayout(roomType: RoomType) {
    this.loadDefaultLayout(roomType);
  }

  public loadCustomLayout(items: PlacedFurnitureItem[], roomType: RoomType) {
    this.currentRoomType = roomType;
    this.clearAllFurniture();
    items.forEach((item) => {
      this.spawnFurnitureItem(item);
    });
    this.notifyFurnitureChange();
  }

  private clearAllFurniture() {
    this.selectFurniture(null);
    this.placedItems.forEach(({ group }) => {
      this.furnitureRoot.remove(group);
      this.disposeObjectRecursively(group);
    });
    this.placedItems.clear();
  }

  private spawnFurnitureItem(item: PlacedFurnitureItem): THREE.Group {
    const group = buildFurniture3DModel(item.modelId, item.color);
    group.position.set(...item.position);
    group.rotation.y = item.rotationY;
    group.userData = {
      isFurniture: true,
      instanceId: item.instanceId,
      modelId: item.modelId,
    };

    this.furnitureRoot.add(group);
    this.placedItems.set(item.instanceId, { group, item });
    return group;
  }

  public addFurniture(modelDef: FurnitureModelDef): string {
    const instanceId = `furni-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Calculate spawn position near room center
    const offsetX = (Math.random() - 0.5) * 0.8;
    const offsetZ = (Math.random() - 0.5) * 0.8;

    const newItem: PlacedFurnitureItem = {
      instanceId,
      modelId: modelDef.id,
      name: modelDef.name,
      category: modelDef.category,
      position: [offsetX, 0, offsetZ],
      rotationY: 0,
      color: modelDef.defaultColor,
    };

    this.spawnFurnitureItem(newItem);
    this.selectFurniture(instanceId);
    this.notifyFurnitureChange();
    return instanceId;
  }

  public removeSelectedFurniture() {
    if (!this.selectedInstanceId) return;
    this.removeFurniture(this.selectedInstanceId);
  }

  public removeFurniture(instanceId: string) {
    const entry = this.placedItems.get(instanceId);
    if (!entry) return;

    if (this.selectedInstanceId === instanceId) {
      this.selectFurniture(null);
    }

    this.furnitureRoot.remove(entry.group);
    this.disposeObjectRecursively(entry.group);
    this.placedItems.delete(instanceId);
    this.notifyFurnitureChange();
  }

  public rotateSelectedFurniture(deltaRad = Math.PI / 4) {
    if (!this.selectedInstanceId) return;
    const entry = this.placedItems.get(this.selectedInstanceId);
    if (!entry) return;

    entry.group.rotation.y = (entry.group.rotation.y + deltaRad) % (Math.PI * 2);
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

    const modelDef = FURNITURE_CATALOG.find((m) => m.id === entry.item.modelId);
    if (!modelDef) return null;

    const newInstanceId = `furni-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newPos: [number, number, number] = [
      Math.min(2.4, Math.max(-2.4, entry.item.position[0] + 0.4)),
      0,
      Math.min(1.9, Math.max(-1.9, entry.item.position[2] + 0.4)),
    ];

    const newItem: PlacedFurnitureItem = {
      instanceId: newInstanceId,
      modelId: entry.item.modelId,
      name: `${entry.item.name} (Bản sao)`,
      category: entry.item.category,
      position: newPos,
      rotationY: entry.item.rotationY,
      color: entry.item.color,
    };

    this.spawnFurnitureItem(newItem);
    this.selectFurniture(newInstanceId);
    this.notifyFurnitureChange();
    return newInstanceId;
  }

  public selectFurniture(instanceId: string | null) {
    if (this.selectedInstanceId === instanceId) return;

    // Remove existing selection indicator
    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
      this.selectionBoxHelper = null;
    }

    this.selectedInstanceId = instanceId;

    if (instanceId) {
      const entry = this.placedItems.get(instanceId);
      if (entry) {
        // Create an elegant selection bounding box
        this.selectionBoxHelper = new THREE.BoxHelper(entry.group, 0x10b981);
        (this.selectionBoxHelper.material as THREE.LineBasicMaterial).linewidth = 2;
        this.scene.add(this.selectionBoxHelper);
      }
    }

    if (this.onSelectionChange) {
      this.onSelectionChange(this.selectedInstanceId);
    }
  }

  public getSelectedInstanceId(): string | null {
    return this.selectedInstanceId;
  }

  public getPlacedItems(): PlacedFurnitureItem[] {
    const list: PlacedFurnitureItem[] = [];
    this.placedItems.forEach(({ item }) => list.push({ ...item }));
    return list;
  }

  private notifyFurnitureChange() {
    if (this.onFurnitureChange) {
      this.onFurnitureChange(this.getPlacedItems());
    }
  }

  // -------------------------------------------------------------
  // RAYCASTING & FLOOR DRAG-AND-DROP
  // -------------------------------------------------------------

  private updateMouseCoords(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handlePointerDown(e: PointerEvent) {
    if (!this.isEditMode) return;

    this.updateMouseCoords(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.furnitureRoot.children, true);
    if (intersects.length > 0) {
      // Find top-level group inside furnitureRoot
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && obj.parent && obj.parent !== this.furnitureRoot) {
        obj = obj.parent;
      }

      if (obj && obj.userData && obj.userData.instanceId) {
        const instanceId = obj.userData.instanceId;
        this.selectFurniture(instanceId);

        // Prepare drag
        this.isDragging = true;
        this.draggedGroup = obj as THREE.Group;
        this.controls.enabled = false; // Lock camera orbit during dragging

        // Intersect with floor plane (Y = 0)
        this.raycaster.ray.intersectPlane(this.floorPlane, this.dragPlaneIntersect);
        this.dragOffset.copy(obj.position).sub(this.dragPlaneIntersect);
        e.stopPropagation();
      }
    } else {
      // Clicked on empty floor or background
      // If clicked without drag, keep camera control
    }
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isDragging || !this.draggedGroup || !this.selectedInstanceId) return;

    this.updateMouseCoords(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.raycaster.ray.intersectPlane(this.floorPlane, this.dragPlaneIntersect)) {
      const targetPos = this.dragPlaneIntersect.clone().add(this.dragOffset);

      // Room boundaries constraint: Room is 6m x 5m (X: -3 to 3, Z: -2.5 to 2.5)
      // Clamped so furniture stays strictly within the interior walls:
      const clampedX = Math.min(2.5, Math.max(-2.5, targetPos.x));
      const clampedZ = Math.min(2.0, Math.max(-2.0, targetPos.z));

      this.draggedGroup.position.set(clampedX, 0, clampedZ);

      // Update item state
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
      this.controls.enabled = true; // Re-enable camera orbit
      this.notifyFurnitureChange();
    }
  }

  // -------------------------------------------------------------
  // TILE FLOOR MATERIAL & CAMERA VIEW METHODS
  // -------------------------------------------------------------

  public async updateTile(tile: TileProduct, options: TileLayoutOptions) {
    if (this.isDisposed) return;

    // Nếu sản phẩm chưa có texture bề mặt phẳng đạt chuẩn 3D, không tự ý thay thế bằng mẫu gạch khác
    if (tile.has3DTexture === false) {
      return;
    }

    try {
      const { diffuseTexture, roughnessTexture } = await createTileTexturesAsync(tile, options, 6.0, 5.0);
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

  public setCameraView(pos: [number, number, number], target: [number, number, number]) {
    this.targetCameraPos.set(...pos);
    this.targetControlsTarget.set(...target);
    this.isTransitioningCamera = true;
    this.transitionProgress = 0;
  }

  public toggleLightingMode(): boolean {
    this.isDayMode = !this.isDayMode;
    if (this.isDayMode) {
      this.sunLight.intensity = 1.6;
      this.ambientLight.intensity = 0.72;
      this.warmPendantLight.intensity = 0.85;
      this.scene.background = new THREE.Color('#eef2f6');
      if (this.scene.fog) this.scene.fog.color = new THREE.Color('#eef2f6');
    } else {
      this.sunLight.intensity = 0.4;
      this.ambientLight.intensity = 0.45;
      this.warmPendantLight.intensity = 1.6;
      this.scene.background = new THREE.Color('#1c222b');
      if (this.scene.fog) this.scene.fog.color = new THREE.Color('#1c222b');
    }
    return this.isDayMode;
  }

  private handleResize() {
    if (this.isDisposed || !this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate() {
    if (this.isDisposed) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (this.isTransitioningCamera) {
      this.transitionProgress += 0.04;
      this.camera.position.lerp(this.targetCameraPos, 0.08);
      this.controls.target.lerp(this.targetControlsTarget, 0.08);

      if (this.transitionProgress >= 1 || this.camera.position.distanceTo(this.targetCameraPos) < 0.02) {
        this.camera.position.copy(this.targetCameraPos);
        this.controls.target.copy(this.targetControlsTarget);
        this.isTransitioningCamera = false;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public resetCamera() {
    this.setCameraView([2.3, 1.9, 3.1], [0, 0.55, 0]);
  }

  private disposeObjectRecursively(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
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

    if (this.controls) {
      this.controls.dispose();
    }

    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
    }

    this.clearAllFurniture();

    if (this.currentDiffuseTexture) this.currentDiffuseTexture.dispose();
    if (this.currentRoughnessTexture) this.currentRoughnessTexture.dispose();

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => {
              if (mat.map) mat.map.dispose();
              if (mat.roughnessMap) mat.roughnessMap.dispose();
              mat.dispose();
            });
          } else {
            if (object.material.map) object.material.map.dispose();
            if (object.material.roughnessMap) object.material.roughnessMap.dispose();
            object.material.dispose();
          }
        }
      }
    });

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
