import { create } from 'zustand';
import { VisibilityLevel } from '@easysociety/shared';
import { useAuthStore } from './authStore';
import { apiClient } from '../api/client';

interface LocationState {
  activeLocationId: string | null;
  activeLocationName: string;
  visibilityLevel: VisibilityLevel;
  setActiveLocation: (id: string, name: string) => void;
  setVisibilityLevel: (level: VisibilityLevel) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  activeLocationId: useAuthStore.getState().user?.location_id ?? null,
  activeLocationName: '',
  visibilityLevel: VisibilityLevel.AREA,
  setActiveLocation: (id, name) => set({ activeLocationId: id, activeLocationName: name }),
  setVisibilityLevel: (level) => set({ visibilityLevel: level }),
}));

async function fetchLocationName(id: string) {
  try {
    const { data } = await apiClient.get(`/locations/${id}`);
    useLocationStore.setState({ activeLocationName: data.location.name });
  } catch {}
}

// Reset to user's home area on login / logout / hydrate; fetch the name from API
useAuthStore.subscribe((state, prev) => {
  if (state.user?.location_id !== prev.user?.location_id) {
    const newId = state.user?.location_id ?? null;
    useLocationStore.setState({
      activeLocationId: newId,
      activeLocationName: '',
      visibilityLevel: VisibilityLevel.AREA,
    });
    if (newId) fetchLocationName(newId);
  }
});
