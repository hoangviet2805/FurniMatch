import * as THREE from 'three';
import type { TileProduct, TileLayoutOptions } from '../types/tile';

// In-memory cache for loaded images and generated textures
const imageCache = new Map<string, HTMLImageElement>();
const textureCache = new Map<string, { diffuse: THREE.CanvasTexture; roughness: THREE.CanvasTexture }>();

/**
 * Loads an image from a URL with caching
 */
export function loadTileImage(url: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) {
    return Promise.resolve(imageCache.get(url)!);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = (err) => {
      console.warn(`Could not load tile texture from ${url}, falling back to procedural pattern.`, err);
      reject(err);
    };
    img.src = url;
  });
}

function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function drawVein(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  length: number,
  angle: number,
  baseWidth: number,
  color: string,
  rand: () => number,
  branchProbability = 0.35,
  depth = 0
) {
  if (depth > 2 || baseWidth < 0.5) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let curX = startX;
  let curY = startY;
  let curAngle = angle;
  let curWidth = baseWidth;

  const steps = Math.floor(length / 15);
  for (let i = 0; i < steps; i++) {
    const nextX = curX + Math.cos(curAngle) * 15;
    const nextY = curY + Math.sin(curAngle) * 15;

    ctx.beginPath();
    ctx.lineWidth = curWidth;
    ctx.moveTo(curX, curY);
    ctx.lineTo(nextX, nextY);
    ctx.stroke();

    if (rand() < branchProbability && depth < 2) {
      const branchAngle = curAngle + (rand() - 0.5) * 1.2;
      drawVein(ctx, curX, curY, length * 0.5, branchAngle, curWidth * 0.6, color, rand, 0.2, depth + 1);
    }

    curX = nextX;
    curY = nextY;
    curAngle += (rand() - 0.5) * 0.4;
    curWidth = Math.max(0.4, curWidth * (0.95 + (rand() - 0.5) * 0.1));
  }

  ctx.restore();
}

/**
 * Procedurally draws a single tile face into a canvas context
 */
export function drawTileFace(
  ctx: CanvasRenderingContext2D,
  tile: TileProduct,
  x: number,
  y: number,
  w: number,
  h: number,
  tileSeed: number,
  baseImg?: HTMLImageElement
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // If a real base texture image is available, draw it with subtle randomized orientation
  if (baseImg && baseImg.complete && baseImg.naturalWidth > 0) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);

    // Subtle 90/180/270 deg flip per tile to break visible pattern repetition!
    const rotSteps = Math.floor(tileSeed % 4);
    if (tile.category !== 'wood') {
      ctx.rotate((rotSteps * Math.PI) / 2);
    }
    // Subtle brightness / contrast tint per tile for natural batch variation
    ctx.drawImage(baseImg, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.restore();
    return;
  }

  // Fallback: Rich procedural rendering
  const rand = createSeededRandom(tileSeed);
  const style = tile.visual.style;

  if (style === 'calacatta') {
    ctx.fillStyle = '#fafaf8';
    ctx.fillRect(x, y, w, h);

    // Soft warm grey wash clouds
    for (let i = 0; i < 4; i++) {
      const grad = ctx.createRadialGradient(
        x + rand() * w, y + rand() * h, 15,
        x + rand() * w, y + rand() * h, Math.max(w, h) * 0.6
      );
      grad.addColorStop(0, 'rgba(225, 227, 230, 0.45)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
    }

    // Bold organic grey veining with golden ochre touches
    for (let v = 0; v < 3; v++) {
      const startX = x + rand() * w * 0.5;
      const startY = y + (rand() < 0.5 ? 0 : rand() * h);
      const mainAngle = (Math.PI / 4) + (rand() - 0.5) * 0.5;
      drawVein(ctx, startX, startY, Math.max(w, h) * 1.2, mainAngle, 3.8, 'rgba(110, 118, 128, 0.7)', rand);
      drawVein(ctx, startX + 4, startY + 4, Math.max(w, h) * 0.8, mainAngle, 1.5, 'rgba(178, 145, 95, 0.35)', rand);
    }
  } else if (style === 'travertine') {
    const bgGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    bgGrad.addColorStop(0, '#f5efe4');
    bgGrad.addColorStop(0.5, '#ede3d1');
    bgGrad.addColorStop(1, '#f7f2e8');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(x, y, w, h);

    for (let i = 0; i < 14; i++) {
      ctx.save();
      ctx.fillStyle = `rgba(${195 + Math.floor(rand() * 20)}, ${170 + Math.floor(rand() * 20)}, ${135 + Math.floor(rand() * 20)}, 0.22)`;
      ctx.beginPath();
      const yBase = y + (i / 14) * h;
      ctx.moveTo(x, yBase);
      for (let curX = x; curX <= x + w; curX += 30) {
        ctx.lineTo(curX, yBase + (rand() - 0.5) * 18);
      }
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (style === 'concrete') {
    ctx.fillStyle = '#b0b5b8';
    ctx.fillRect(x, y, w, h);

    for (let c = 0; c < 8; c++) {
      ctx.beginPath();
      ctx.arc(x + rand() * w, y + rand() * h, 20 + rand() * 50, 0, Math.PI * 2);
      ctx.fillStyle = rand() > 0.5 ? 'rgba(150, 155, 160, 0.15)' : 'rgba(195, 200, 205, 0.15)';
      ctx.fill();
    }
  } else if (style === 'sandstone') {
    ctx.fillStyle = '#e4d8c5';
    ctx.fillRect(x, y, w, h);

    for (let i = 0; i < 5; i++) {
      const grad = ctx.createRadialGradient(x + rand() * w, y + rand() * h, 10, x + rand() * w, y + rand() * h, Math.max(w, h) * 0.5);
      grad.addColorStop(0, 'rgba(215, 195, 165, 0.25)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
    }
  } else if (style === 'wood_plank') {
    const toneOffset = (rand() - 0.5) * 16;
    ctx.fillStyle = `rgb(${202 + toneOffset}, ${162 + toneOffset * 0.8}, ${120 + toneOffset * 0.7})`;
    ctx.fillRect(x, y, w, h);

    for (let gIdx = 0; gIdx < 20; gIdx++) {
      const gy = y + (gIdx / 20) * h + (rand() - 0.5) * 4;
      ctx.strokeStyle = `rgba(130, 95, 60, ${0.12 + rand() * 0.2})`;
      ctx.lineWidth = 0.8 + rand() * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy + (rand() - 0.5) * 4);
      ctx.stroke();
    }
  } else if (style === 'nero_marquina') {
    ctx.fillStyle = '#111215';
    ctx.fillRect(x, y, w, h);

    for (let v = 0; v < 3; v++) {
      const startX = x + rand() * w;
      const startY = y;
      const angle = (Math.PI / 3) + (rand() - 0.5) * 0.6;
      drawVein(ctx, startX, startY, Math.max(w, h) * 1.3, angle, 3.2, 'rgba(255, 255, 255, 0.95)', rand);
    }
  }

  ctx.restore();
}

/**
 * Renders a full multi-tile composite layout with laying pattern, grout lines, and bevels
 */
export function renderCompositeTileCanvas(
  canvas: HTMLCanvasElement,
  roughnessCanvas: HTMLCanvasElement,
  tile: TileProduct,
  options: TileLayoutOptions,
  baseImg?: HTMLImageElement
): {
  tilesInX: number;
  tilesInY: number;
  effectiveTileWidthCm: number;
  effectiveTileHeightCm: number;
} {
  const size = canvas.width;
  const ctx = canvas.getContext('2d')!;
  const rCtx = roughnessCanvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  rCtx.clearRect(0, 0, size, size);

  // 1. Determine tile dimensions considering horizontal/vertical orientation
  let tileWidthCm = tile.width;
  let tileHeightCm = tile.height;

  // Handle rectangular tile direction
  if (tile.width !== tile.height) {
    if (options.direction === 'horizontal') {
      tileWidthCm = Math.max(tile.width, tile.height);
      tileHeightCm = Math.min(tile.width, tile.height);
    } else {
      tileWidthCm = Math.min(tile.width, tile.height);
      tileHeightCm = Math.max(tile.width, tile.height);
    }
  }

  // Determine grid repeats inside the 1024x1024 composite block
  // Square tiles: 2x2 grid
  // Rectangular tiles: 2x4 or 4x2 grid to provide seamless staggered repeats
  let tilesInX = 2;
  let tilesInY = 2;

  if (tileWidthCm < tileHeightCm) {
    tilesInX = 3;
    tilesInY = 2;
  } else if (tileWidthCm > tileHeightCm) {
    tilesInX = 2;
    tilesInY = 3;
  }

  // For plank tiles (15x80):
  if (tile.category === 'wood') {
    if (tileWidthCm > tileHeightCm) {
      tilesInX = 2;
      tilesInY = 4;
    } else {
      tilesInX = 4;
      tilesInY = 2;
    }
  }

  const tileW = size / tilesInX;
  const tileH = size / tilesInY;

  // Calculate pixel grout width from mm
  // Assume composite block represents tilesInX * tileWidthCm in world
  const blockWidthCm = tilesInX * tileWidthCm;
  const pxPerCm = size / blockWidthCm;
  const groutPx = Math.max(2, Math.round((options.groutWidthMm / 10) * pxPerCm * 2.5));

  // Grout background
  ctx.fillStyle = options.groutColor;
  ctx.fillRect(0, 0, size, size);

  // Roughness background for grout: Grout is rough matte cement (high roughness)
  rCtx.fillStyle = '#f0f0f0';
  rCtx.fillRect(0, 0, size, size);

  // Base roughness for the glazed tile body
  let tileRoughnessHex = Math.round(tile.materialProperties.roughness * 255).toString(16).padStart(2, '0');
  if (options.finishEnhancement === 'glossy') {
    tileRoughnessHex = Math.round(Math.max(0.04, tile.materialProperties.roughness * 0.5) * 255).toString(16).padStart(2, '0');
  } else if (options.finishEnhancement === 'extra_matte') {
    tileRoughnessHex = Math.round(Math.min(0.95, tile.materialProperties.roughness * 1.3) * 255).toString(16).padStart(2, '0');
  }
  const tileRoughnessFill = `#${tileRoughnessHex}${tileRoughnessHex}${tileRoughnessHex}`;

  // 2. Draw each tile according to laying pattern
  const pattern = options.pattern;
  const extraRows = 2; // Extra rows/cols for staggered edge wrapping
  const extraCols = 2;

  for (let row = -1; row <= tilesInY + extraRows; row++) {
    // Calculate row offset based on pattern
    let offsetX = 0;
    if (pattern === 'staggered_50') {
      offsetX = (Math.abs(row) % 2) * (tileW * 0.5);
    } else if (pattern === 'staggered_33') {
      offsetX = (Math.abs(row) % 3) * (tileW * 0.3333);
    }

    for (let col = -1; col <= tilesInX + extraCols; col++) {
      const tileX = col * tileW + offsetX;
      const tileY = row * tileH;

      // Check if tile intersects the composite block
      if (tileX + tileW < 0 || tileX > size || tileY + tileH < 0 || tileY > size) {
        continue;
      }

      // Inset tile bounds by half grout width
      const innerX = tileX + groutPx / 2;
      const innerY = tileY + groutPx / 2;
      const innerW = tileW - groutPx;
      const innerH = tileH - groutPx;

      if (innerW <= 1 || innerH <= 1) continue;

      // Unique seed per tile position to prevent pattern repetition!
      const tileSeed = 1000 + (row * 37) + (col * 17) + (tile.code.charCodeAt(0) || 1);

      // Draw tile face
      drawTileFace(ctx, tile, innerX, innerY, innerW, innerH, tileSeed, baseImg);

      // Draw roughness for tile body
      rCtx.fillStyle = tileRoughnessFill;
      rCtx.fillRect(innerX, innerY, innerW, innerH);

      // 3. Physical 3D Edge Beveling for tile edges
      ctx.save();
      // Top & Left highlight reflection
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(innerX + 1, innerY + innerH - 1);
      ctx.lineTo(innerX + 1, innerY + 1);
      ctx.lineTo(innerX + innerW - 1, innerY + 1);
      ctx.stroke();

      // Bottom & Right shadow depth
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(innerX + 1, innerY + innerH - 1);
      ctx.lineTo(innerX + innerW - 1, innerY + innerH - 1);
      ctx.lineTo(innerX + innerW - 1, innerY + 1);
      ctx.stroke();
      ctx.restore();
    }
  }

  return {
    tilesInX,
    tilesInY,
    effectiveTileWidthCm: tileWidthCm,
    effectiveTileHeightCm: tileHeightCm,
  };
}

/**
 * Creates high quality Three.js CanvasTextures with PBR roughness map & accurate physical repeat
 */
export async function createTileTexturesAsync(
  tile: TileProduct,
  options: TileLayoutOptions,
  roomWidthM = 6.0,
  roomDepthM = 5.0
): Promise<{
  diffuseTexture: THREE.CanvasTexture;
  roughnessTexture: THREE.CanvasTexture;
  thumbnailUrl: string;
}> {
  const cacheKey = `${tile.id}_${options.pattern}_${options.direction}_${options.groutColor}_${options.groutWidthMm}_${options.orientation}_${options.finishEnhancement}`;

  // Try to load real texture image if textureUrl is present
  let baseImg: HTMLImageElement | undefined;
  if (tile.textureUrl) {
    try {
      baseImg = await loadTileImage(tile.textureUrl);
    } catch {
      // Fallback to procedural
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;

  const roughnessCanvas = document.createElement('canvas');
  roughnessCanvas.width = 1024;
  roughnessCanvas.height = 1024;

  const layoutInfo = renderCompositeTileCanvas(canvas, roughnessCanvas, tile, options, baseImg);

  const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);

  const diffuseTexture = new THREE.CanvasTexture(canvas);
  diffuseTexture.wrapS = THREE.RepeatWrapping;
  diffuseTexture.wrapT = THREE.RepeatWrapping;

  const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
  roughnessTexture.wrapS = THREE.RepeatWrapping;
  roughnessTexture.wrapT = THREE.RepeatWrapping;

  // Calculate repeat factors based on room dimension and composite block size
  const blockWidthM = Math.max(0.2, (layoutInfo.tilesInX * layoutInfo.effectiveTileWidthCm) / 100);
  const blockHeightM = Math.max(0.2, (layoutInfo.tilesInY * layoutInfo.effectiveTileHeightCm) / 100);

  let repeatX = roomWidthM / blockWidthM;
  let repeatY = roomDepthM / blockHeightM;

  const orientation = options.orientation;
  if (orientation === 45) {
    diffuseTexture.rotation = Math.PI / 4;
    roughnessTexture.rotation = Math.PI / 4;
    repeatX *= 1.414;
    repeatY *= 1.414;
  } else if (orientation === 90) {
    diffuseTexture.rotation = Math.PI / 2;
    roughnessTexture.rotation = Math.PI / 2;
    const temp = repeatX;
    repeatX = repeatY;
    repeatY = temp;
  } else {
    diffuseTexture.rotation = 0;
    roughnessTexture.rotation = 0;
  }

  diffuseTexture.repeat.set(repeatX, repeatY);
  diffuseTexture.colorSpace = THREE.SRGBColorSpace;
  diffuseTexture.generateMipmaps = true;
  diffuseTexture.minFilter = THREE.LinearMipmapLinearFilter;
  diffuseTexture.magFilter = THREE.LinearFilter;
  diffuseTexture.needsUpdate = true;

  roughnessTexture.repeat.set(repeatX, repeatY);
  roughnessTexture.generateMipmaps = true;
  roughnessTexture.minFilter = THREE.LinearMipmapLinearFilter;
  roughnessTexture.magFilter = THREE.LinearFilter;
  roughnessTexture.needsUpdate = true;

  textureCache.set(cacheKey, { diffuse: diffuseTexture, roughness: roughnessTexture });

  return { diffuseTexture, roughnessTexture, thumbnailUrl };
}

/**
 * Synchronous tile thumbnail generator for UI cards
 */
export function renderTileThumbnail(
  canvas: HTMLCanvasElement,
  tile: TileProduct
) {
  const dummyOptions: TileLayoutOptions = {
    pattern: tile.defaultPattern || 'grid',
    direction: 'horizontal',
    orientation: 0,
    groutColor: tile.groutColor || '#cfcfcf',
    groutWidthMm: 2.0,
    finishEnhancement: 'normal',
  };

  const dummyRoughness = document.createElement('canvas');
  dummyRoughness.width = canvas.width;
  dummyRoughness.height = canvas.height;

  // Use cached base image if available
  const baseImg = tile.textureUrl && imageCache.has(tile.textureUrl) ? imageCache.get(tile.textureUrl) : undefined;
  renderCompositeTileCanvas(canvas, dummyRoughness, tile, dummyOptions, baseImg);
}
