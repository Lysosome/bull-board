import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  pollingInterval: number;
  jobsPerPage: number;
  confirmQueueActions: boolean;
  confirmJobActions: boolean;
  collapseSameNameJobs: boolean;
  collapseJobData: boolean;
  collapseJobOptions: boolean;
  collapseJobError: boolean;
  filterJobName: string | null;
  setSettings: (settings: Partial<Omit<SettingsState, 'setSettings'>>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      pollingInterval: 5,
      jobsPerPage: 10,
      confirmJobActions: true,
      confirmQueueActions: true,
      collapseSameNameJobs: true,
      collapseJobData: false,
      collapseJobOptions: false,
      collapseJobError: false,
      filterJobName: null,
      setSettings: (settings) => set(() => settings),
    }),
    {
      name: 'board-settings',
    }
  )
);
