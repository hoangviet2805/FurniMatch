import * as THREE from 'three';

/**
 * Builds a 3D Three.js Group for any furniture model in the catalog
 */
export function buildFurniture3DModel(modelId: string, customColor?: string): THREE.Group {
  const group = new THREE.Group();

  switch (modelId) {
    // 1. GIƯỜNG ĐÔI MASTER
    case 'bed-queen': {
      const frameColor = customColor ? parseInt(customColor.replace('#', '0x')) : 0x334155;
      const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.7 });
      const mattressMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
      const duvetMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
      const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
      const woodLegMat = new THREE.MeshStandardMaterial({ color: 0x271e16, roughness: 0.5 });

      // Bed Base Frame (1.8m wide, 2.0m long, 0.25m high, elevated 0.1m)
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.22, 2.06), frameMat);
      baseMesh.position.set(0, 0.21, 0);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      group.add(baseMesh);

      // 4 Bed legs
      const legGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.12, 12);
      for (const [lx, lz] of [[-0.88, -0.98], [0.88, -0.98], [-0.88, 0.98], [0.88, 0.98]]) {
        const leg = new THREE.Mesh(legGeo, woodLegMat);
        leg.position.set(lx, 0.06, lz);
        leg.castShadow = true;
        group.add(leg);
      }

      // Plush Headboard (at back: Z = -1.0)
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.85, 0.14), frameMat);
      headboard.position.set(0, 0.65, -0.98);
      headboard.castShadow = true;
      headboard.receiveShadow = true;
      group.add(headboard);

      // Mattress
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 1.95), mattressMat);
      mattress.position.set(0, 0.43, 0.03);
      mattress.castShadow = true;
      mattress.receiveShadow = true;
      group.add(mattress);

      // Duvet / Blanket (covering bottom 2/3 of bed)
      const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.06, 1.35), duvetMat);
      duvet.position.set(0, 0.56, 0.35);
      duvet.castShadow = true;
      group.add(duvet);

      // 2 Pillows
      const pillowGeo = new THREE.BoxGeometry(0.65, 0.12, 0.42);
      for (const px of [-0.48, 0.48]) {
        const pillow = new THREE.Mesh(pillowGeo, pillowMat);
        pillow.position.set(px, 0.58, -0.62);
        pillow.rotation.x = -0.15;
        pillow.castShadow = true;
        group.add(pillow);
      }
      break;
    }

    // 2. GIƯỜNG ĐƠN NORDIC
    case 'bed-single': {
      const woodMat = new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.5 });
      const mattressMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
      const duvetMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.8 });
      const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });

      // Bed frame
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.2, 2.04), woodMat);
      baseMesh.position.set(0, 0.2, 0);
      baseMesh.castShadow = true;
      group.add(baseMesh);

      // Headboard
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.7, 0.08), woodMat);
      headboard.position.set(0, 0.55, -0.98);
      headboard.castShadow = true;
      group.add(headboard);

      // Mattress
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.2, 1.95), mattressMat);
      mattress.position.set(0, 0.4, 0.02);
      mattress.castShadow = true;
      group.add(mattress);

      // Duvet
      const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 1.3), duvetMat);
      duvet.position.set(0, 0.52, 0.35);
      duvet.castShadow = true;
      group.add(duvet);

      // Pillow
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.4), pillowMat);
      pillow.position.set(0, 0.54, -0.65);
      pillow.rotation.x = -0.15;
      pillow.castShadow = true;
      group.add(pillow);
      break;
    }

    // 3. TỦ QUẦN ÁO 3 CÁNH
    case 'wardrobe-3door': {
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });

      // Wardrobe Main Box (1.8m wide, 0.6m deep, 2.1m high)
      const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.1, 0.6), bodyMat);
      wardrobe.position.set(0, 1.05, 0);
      wardrobe.castShadow = true;
      wardrobe.receiveShadow = true;
      group.add(wardrobe);

      // 3 Door lines
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
      for (const lx of [-0.3, 0.3]) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.01, 2.05, 0.01), lineMat);
        line.position.set(lx, 1.05, 0.305);
        group.add(line);
      }

      // Vertical handles
      for (const hx of [-0.35, -0.25, 0.25]) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.025), handleMat);
        handle.position.set(hx, 1.1, 0.315);
        handle.castShadow = true;
        group.add(handle);
      }
      break;
    }

    // 4. TAB ĐẦU GIƯỜNG
    case 'nightstand-pair': {
      const woodMat = new THREE.MeshStandardMaterial({ color: 0xad8259, roughness: 0.5 });
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.44, 0.42), woodMat);
      body.position.set(0, 0.26, 0);
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // Drawer handles
      for (const dy of [0.18, 0.34]) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), handleMat);
        handle.position.set(0, dy, 0.22);
        handle.castShadow = true;
        group.add(handle);
      }
      break;
    }

    // 5. TỦ THẤP SIDEBOARD
    case 'sideboard-credenza': {
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a7b56, roughness: 0.5 });
      const topStoneMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.25 });
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });

      // Body (1.6m wide, 0.45m deep, 0.6m high, elevated 0.18m)
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.45), woodMat);
      body.position.set(0, 0.48, 0);
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // Stone Top
      const topStone = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.03, 0.47), topStoneMat);
      topStone.position.set(0, 0.79, 0);
      topStone.castShadow = true;
      group.add(topStone);

      // 4 Metal legs
      for (const [lx, lz] of [[-0.72, -0.18], [0.72, -0.18], [-0.72, 0.18], [0.72, 0.18]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.18, 12), legMat);
        leg.position.set(lx, 0.09, lz);
        leg.castShadow = true;
        group.add(leg);
      }
      break;
    }

    // 6. SOFA 3 CHỖ CHARCOAL
    case 'sofa-3seat': {
      const fabricColor = customColor ? parseInt(customColor.replace('#', '0x')) : 0x4a4f56;
      const fabricMat = new THREE.MeshStandardMaterial({ color: fabricColor, roughness: 0.85 });
      const cushionMat = new THREE.MeshStandardMaterial({ color: 0x565c63, roughness: 0.88 });
      const woodLegMat = new THREE.MeshStandardMaterial({ color: 0x221c16, roughness: 0.5 });

      // Base Platform
      const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 0.92), fabricMat);
      sofaBase.position.set(0, 0.22, 0);
      sofaBase.castShadow = true;
      sofaBase.receiveShadow = true;
      group.add(sofaBase);

      // 4 Legs
      for (const [x, z] of [[-1.05, -0.38], [1.05, -0.38], [-1.05, 0.38], [1.05, 0.38]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.15, 12), woodLegMat);
        leg.position.set(x, 0.075, z);
        leg.castShadow = true;
        group.add(leg);
      }

      // 3 Cushions
      for (let i = -1; i <= 1; i++) {
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.78), cushionMat);
        cushion.position.set(i * 0.74, 0.38, 0.01);
        cushion.castShadow = true;
        cushion.receiveShadow = true;
        group.add(cushion);
      }

      // Backrest
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.52, 0.18), fabricMat);
      backrest.position.set(0, 0.57, 0.38);
      backrest.castShadow = true;
      group.add(backrest);

      // Armrests
      for (const ax of [-1.18, 1.18]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.94), fabricMat);
        arm.position.set(ax, 0.44, 0);
        arm.castShadow = true;
        group.add(arm);
      }
      break;
    }

    // 7. SOFA GÓC L
    case 'sofa-sectional': {
      const fabricMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
      const woodLegMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });

      // Main Sofa section (2.6m wide, 0.95m deep)
      const mainBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 0.95), fabricMat);
      mainBase.position.set(0, 0.2, 0);
      mainBase.castShadow = true;
      group.add(mainBase);

      // L-Chaise Extension (0.95m wide, 1.6m long) on left
      const chaise = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.85), fabricMat);
      chaise.position.set(-0.82, 0.2, -0.85);
      chaise.castShadow = true;
      group.add(chaise);

      // Backrest
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.18), fabricMat);
      backrest.position.set(0, 0.55, 0.4);
      backrest.castShadow = true;
      group.add(backrest);

      // Armrests
      for (const ax of [-1.32, 1.32]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.95), fabricMat);
        arm.position.set(ax, 0.44, 0);
        arm.castShadow = true;
        group.add(arm);
      }

      // 4 Sofa legs
      for (const [lx, lz] of [[-1.2, -0.35], [1.2, -0.35], [-1.2, 0.35], [1.2, 0.35]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.12, 12), woodLegMat);
        leg.position.set(lx, 0.06, lz);
        leg.castShadow = true;
        group.add(leg);
      }
      break;
    }

    // 8. BÀN TRÀ TRÒN
    case 'coffee-table-round': {
      const tableTopMat = new THREE.MeshStandardMaterial({ color: 0xe5dfd6, roughness: 0.4 });
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.3 });

      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 32), tableTopMat);
      top.position.set(0, 0.36, 0);
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(top);

      for (let a = 0; a < 3; a++) {
        const angle = (a * 2 * Math.PI) / 3;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.34, 12), legMat);
        leg.position.set(Math.cos(angle) * 0.32, 0.17, Math.sin(angle) * 0.32);
        leg.castShadow = true;
        group.add(leg);
      }
      break;
    }

    // 9. BÀN TRÀ CHỮ NHẬT
    case 'coffee-table-rect': {
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.25 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0xad8259, roughness: 0.6 });
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.3 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.6), woodMat);
      body.position.set(0, 0.28, 0);
      body.castShadow = true;
      group.add(body);

      const stoneTop = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.03, 0.62), stoneMat);
      stoneTop.position.set(0, 0.4, 0);
      stoneTop.castShadow = true;
      group.add(stoneTop);

      for (const [lx, lz] of [[-0.52, -0.24], [0.52, -0.24], [-0.52, 0.24], [0.52, 0.24]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.17, 12), legMat);
        leg.position.set(lx, 0.085, lz);
        leg.castShadow = true;
        group.add(leg);
      }
      break;
    }

    // 10. BÀN LÀM VIỆC & GHẾ
    case 'work-desk-wood': {
      const woodMat = new THREE.MeshStandardMaterial({ color: 0xb48b67, roughness: 0.45 });
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });

      // Desk Top (1.4m × 0.65m × 0.04m at height 0.75m)
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.65), woodMat);
      top.position.set(0, 0.73, 0);
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(top);

      // 4 Desk Legs
      for (const [lx, lz] of [[-0.65, -0.28], [0.65, -0.28], [-0.65, 0.28], [0.65, 0.28]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.71, 0.04), metalMat);
        leg.position.set(lx, 0.355, lz);
        leg.castShadow = true;
        group.add(leg);
      }

      // Laptop decor on desk
      const laptop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.22), metalMat);
      laptop.position.set(-0.15, 0.755, 0);
      laptop.castShadow = true;
      group.add(laptop);

      // Ergonomic Chair (behind desk: Z = 0.5)
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.48), chairMat);
      seat.position.set(0, 0.46, 0.5);
      seat.castShadow = true;
      group.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.06), chairMat);
      back.position.set(0, 0.72, 0.72);
      back.castShadow = true;
      group.add(back);

      const chairLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 12), metalMat);
      chairLeg.position.set(0, 0.21, 0.5);
      chairLeg.castShadow = true;
      group.add(chairLeg);
      break;
    }

    // 11. KỆ TV KÈM MÀN HÌNH 65"
    case 'tv-console-modern': {
      const woodMat = new THREE.MeshStandardMaterial({ color: 0xad8259, roughness: 0.5 });
      const tvBezelMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.2, metalness: 0.8 });
      const tvScreenMat = new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 0.1, metalness: 0.9 });
      const tableLegMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.3 });

      // Floating Credenza
      const credenza = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.32, 0.42), woodMat);
      credenza.position.set(0, 0.35, 0);
      credenza.castShadow = true;
      credenza.receiveShadow = true;
      group.add(credenza);

      for (const [cx, cz] of [[-1.05, -0.16], [1.05, -0.16], [-1.05, 0.16], [1.05, 0.16]]) {
        const cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.2, 12), tableLegMat);
        cLeg.position.set(cx, 0.1, cz);
        cLeg.castShadow = true;
        group.add(cLeg);
      }

      // TV Frame
      const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.86, 0.03), tvBezelMat);
      tvFrame.position.set(0, 1.35, -0.1);
      tvFrame.castShadow = true;
      group.add(tvFrame);

      // TV Screen
      const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.82, 0.005), tvScreenMat);
      tvScreen.position.set(0, 1.35, -0.08);
      group.add(tvScreen);

      // Soundbar
      const soundbar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.055, 0.08), tvBezelMat);
      soundbar.position.set(0, 0.54, 0.02);
      soundbar.castShadow = true;
      group.add(soundbar);
      break;
    }

    // 12. GHẾ BÀNH ARMCHAIR
    case 'accent-chair': {
      const chairMat = new THREE.MeshStandardMaterial({ color: 0xd4a359, roughness: 0.85 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x271e16, roughness: 0.5 });

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.72), chairMat);
      seat.position.set(0, 0.38, 0);
      seat.castShadow = true;
      group.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.52, 0.16), chairMat);
      back.position.set(0, 0.66, 0.3);
      back.rotation.x = -0.15;
      back.castShadow = true;
      group.add(back);

      for (const [lx, lz] of [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.3, 12), woodMat);
        leg.position.set(lx, 0.15, lz);
        leg.castShadow = true;
        group.add(leg);
      }
      break;
    }

    // 13. CHẬU CÂY MONSTERA
    case 'indoor-plant-tall': {
      const potMat = new THREE.MeshStandardMaterial({ color: 0xf4f0ea, roughness: 0.4 });
      const soilMat = new THREE.MeshStandardMaterial({ color: 0x2b1e15, roughness: 0.95 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.4, side: THREE.DoubleSide });

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.48, 24), potMat);
      pot.position.set(0, 0.24, 0);
      pot.castShadow = true;
      pot.receiveShadow = true;
      group.add(pot);

      const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), soilMat);
      soil.position.set(0, 0.46, 0);
      group.add(soil);

      for (let l = 0; l < 8; l++) {
        const leafAngle = (l * Math.PI) / 4;
        const leafStem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.6, 8), leafMat);
        leafStem.position.set(Math.cos(leafAngle) * 0.08, 0.7, Math.sin(leafAngle) * 0.08);
        leafStem.rotation.z = Math.sin(leafAngle) * 0.4;
        leafStem.rotation.x = Math.cos(leafAngle) * 0.4;
        group.add(leafStem);

        const leafBlade = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), leafMat);
        leafBlade.scale.set(0.8, 1.5, 0.1);
        leafBlade.position.set(Math.cos(leafAngle) * 0.25, 0.95 + l * 0.06, Math.sin(leafAngle) * 0.25);
        leafBlade.rotation.y = leafAngle;
        leafBlade.castShadow = true;
        group.add(leafBlade);
      }
      break;
    }

    // 14. ĐÈN SÀN ARC
    case 'floor-lamp-arc': {
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xc49f53, metalness: 0.85, roughness: 0.25 });
      const shadeMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.3 });

      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 24), brassMat);
      lampBase.position.set(0, 0.015, 0);
      lampBase.castShadow = true;
      group.add(lampBase);

      const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.8, 12), brassMat);
      lampPole.position.set(0, 0.9, 0);
      lampPole.castShadow = true;
      group.add(lampPole);

      const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 12), brassMat);
      lampArm.rotation.z = Math.PI / 3;
      lampArm.position.set(0.24, 1.9, 0);
      lampArm.castShadow = true;
      group.add(lampArm);

      const shade = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), shadeMat);
      shade.rotation.x = Math.PI;
      shade.position.set(0.5, 1.85, 0);
      shade.castShadow = true;
      group.add(shade);
      break;
    }

    // 15. THẢM TRẢI SÀN
    case 'floor-rug-cozy': {
      const rugMat = new THREE.MeshStandardMaterial({ color: 0xe2d8cd, roughness: 0.95 });
      const rug = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.012, 1.6), rugMat);
      rug.position.set(0, 0.006, 0);
      rug.receiveShadow = true;
      group.add(rug);
      break;
    }

    default: {
      // Generic modern furniture block
      const defMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.8), defMat);
      box.position.set(0, 0.4, 0);
      box.castShadow = true;
      box.receiveShadow = true;
      group.add(box);
    }
  }

  // Set userData
  group.userData = {
    isFurniture: true,
    modelId,
  };

  return group;
}
