import type { ReconstructedRoomDesign } from '../types/roomReconstruction';

const STORAGE_KEY = 'furnimatch_reconstructed_rooms';
const CURRENT_ACTIVE_KEY = 'furnimatch_active_reconstructed_room';

/**
 * Cleanly abstracted storage service for 3D reconstructed room designs.
 * Prepares the architecture for future backend API synchronization
 * while guaranteeing instant client-side offline persistence.
 */
export function getSavedReconstructedDesigns(): ReconstructedRoomDesign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load reconstructed room designs from localStorage', err);
    return [];
  }
}

export function saveReconstructedDesign(design: ReconstructedRoomDesign): void {
  try {
    const existing = getSavedReconstructedDesigns();
    const index = existing.findIndex((d) => d.id === design.id);
    let updated: ReconstructedRoomDesign[];

    if (index >= 0) {
      updated = [...existing];
      updated[index] = { ...design, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...design, updatedAt: new Date().toISOString() }, ...existing];
    }

    // Limit to 20 designs to prevent localStorage quota issues with base64 images
    if (updated.length > 20) {
      updated = updated.slice(0, 20);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(CURRENT_ACTIVE_KEY, JSON.stringify(design));
  } catch (err) {
    console.error('Failed to save reconstructed room design to localStorage', err);
    throw new Error('Bộ nhớ trình duyệt đầy hoặc không thể lưu thiết kế.');
  }
}

export function getReconstructedDesignById(id: string): ReconstructedRoomDesign | null {
  const all = getSavedReconstructedDesigns();
  return all.find((d) => d.id === id) || null;
}

export function deleteReconstructedDesign(id: string): void {
  try {
    const existing = getSavedReconstructedDesigns();
    const filtered = existing.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Failed to delete design', err);
  }
}

export function getActiveReconstructedDesign(): ReconstructedRoomDesign | null {
  try {
    const raw = localStorage.getItem(CURRENT_ACTIVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
