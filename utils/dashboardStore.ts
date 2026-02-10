import { create } from 'zustand';
import { fetchLeakReports, LeakReportCounts, LeakReport } from '@/services/leakReportsService';

interface DashboardState {
  // Data
  counts: LeakReportCounts;
  reports: LeakReport[];

  // Loading
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchDashboard: (empId: string) => Promise<void>;
}

const DEFAULT_COUNTS: LeakReportCounts = {
  reportedCount: 0,
  dispatchedCount: 0,
  repairedCount: 0,
  scheduledCount: 0,
  turnoverCount: 0,
  afterCount: 0,
  notFoundCount: 0,
  alreadyRepaired: 0,
  totalCount: 0,
};

export const useDashboardStore = create<DashboardState>((set) => ({
  counts: DEFAULT_COUNTS,
  reports: [],
  isLoading: false,
  error: null,

  fetchDashboard: async (empId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetchLeakReports(empId);
      if (res.statusCode === 200 && res.data) {
        const { reports, ...counts } = res.data;
        set({ counts, reports, isLoading: false });
      } else {
        set({ error: res.message || 'Failed to fetch reports', isLoading: false });
      }
    } catch (error: any) {
      console.error('[Dashboard] fetch error:', error);
      set({
        error: error?.response?.data?.message || error?.message || 'Network error',
        isLoading: false,
      });
    }
  },
}));
