'use client';

import type { TMapBounds, TMapPosition, TUserPosition } from '@kws/types/search';

import { userPositionSchema } from '@kws/types/search';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MapStoreState {
  timestamp: number;
  positionUpdated: boolean;
  bounds: TMapBounds | null;
  zoom: number;
  mapPosition: TMapPosition;
  userPosition: TUserPosition | null;
}

interface MapStoreActions {
  setPositionUpdated: (updated: boolean) => void;
  setBounds: (bounds: TMapBounds | null) => void;
  setMapPosition: (position: TMapPosition) => void;
  setZoom: (zoom: number) => void;
  setUserPosition: (userPosition: Partial<TUserPosition> | null) => void;
  reset: () => void;
  update: (payload: Partial<MapStoreState>) => void;
}

type MapStore = MapStoreState & {
  actions: MapStoreActions;
};

const initialState: MapStoreState = {
  timestamp: 0,
  positionUpdated: false,
  bounds: {
    northEast: {
      lat: -90,
      lng: -180,
    },
    southWest: {
      lat: 90,
      lng: 180,
    },
  },
  zoom: 12,
  mapPosition: {
    lat: 47.6062,
    lng: -122.3321,
  },
  userPosition: null,
} as const;

const withTimestamp = <T extends object>(payload: T): T & { timestamp: number } => ({
  ...payload,
  timestamp: Date.now(),
});

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      ...initialState,
      actions: {
        setPositionUpdated: (updated) => set(withTimestamp({ positionUpdated: updated })),
        setBounds: (bounds) => set(withTimestamp({ bounds })),
        setMapPosition: (position) => set(withTimestamp({ mapPosition: position })),
        setZoom: (zoom) => set(withTimestamp({ zoom })),
        setUserPosition: (userPosition) =>
          set((state) => {
            if (userPosition === null) {
              return withTimestamp({ userPosition: null });
            }

            const candidate = {
              ...(state.userPosition ?? {}),
              ...userPosition,
            };

            const parsed = userPositionSchema.safeParse(candidate);

            return withTimestamp({
              userPosition: parsed.success ? parsed.data : state.userPosition,
            });
          }),
        reset: () => set(initialState),
        update: (payload) => set(withTimestamp(payload)),
      },
    }),
    {
      name: 'map-store',
      partialize: ({ actions: _actions, ...state }) => state,
    },
  ),
);

export const useMapActions = () => useMapStore((state) => state.actions);
