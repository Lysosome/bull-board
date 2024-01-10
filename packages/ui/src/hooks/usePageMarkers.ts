import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/*
Mapping of page number to the index of the first job on that page.
This is for use with collapsibleJobNames, which will collapse jobs with the same name, so each
page may have a varying amount of jobs.
*/

interface PageMarkersState {
  pageMarkers: Record<number, number>;
  setPageMarker: (page: number, marker: number) => void;
}

export const usePageMarkersStore = create<PageMarkersState>()(
  persist(
    (set) => ({
      pageMarkers: {},
      setPageMarker: (page, marker) =>
        set((state) => ({ pageMarkers: { ...state.pageMarkers, [page]: marker } })),
    }),
    {
      name: 'page-markers',
    }
  )
);
