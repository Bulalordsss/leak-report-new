import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFTS_KEY = '@leak_reports_drafts';

export type DraftReport = {
  id: string;
  meterNumber: string;
  accountNumber: string;
  address: string;
  dma: string;
  wss: number;
  coordinates: string;
  leakType: 'Serviceline' | 'Mainline' | 'Others' | 'Blow-off' | 'Fire Hydrant' | 'Air Release' | 'Valve' | null;
  location: 'Surface' | 'Non-Surface' | null;
  contactPerson: string;
  contactNumber: string;
  landmark: string;
  leakPhotos: string[];
  landmarkPhotos: string[];
  savedAt: string;
  empId: string;
};

type DraftReportsState = {
  drafts: DraftReport[];
  isLoading: boolean;
  
  // Actions
  loadDrafts: () => Promise<void>;
  saveDraft: (draft: Omit<DraftReport, 'id' | 'savedAt'>) => Promise<void>;
  updateDraft: (id: string, draft: Omit<DraftReport, 'id' | 'savedAt'>) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  getDraftById: (id: string) => DraftReport | undefined;
  getDraftsCount: () => number;
};

export const useDraftReportsStore = create<DraftReportsState>((set, get) => ({
  drafts: [],
  isLoading: false,

  loadDrafts: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(DRAFTS_KEY);
      const drafts = stored ? JSON.parse(stored) : [];
      set({ drafts, isLoading: false });
    } catch (error) {
      console.error('Error loading drafts:', error);
      set({ isLoading: false });
    }
  },

  saveDraft: async (draft) => {
    try {
      const newDraft: DraftReport = {
        ...draft,
        id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        savedAt: new Date().toISOString(),
      };

      const currentDrafts = get().drafts;
      const updatedDrafts = [...currentDrafts, newDraft];
      
      await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(updatedDrafts));
      set({ drafts: updatedDrafts });
    } catch (error) {
      console.error('Error saving draft:', error);
      throw error;
    }
  },

  updateDraft: async (id, draft) => {
    try {
      const currentDrafts = get().drafts;
      const existingDraft = currentDrafts.find(d => d.id === id);
      
      if (!existingDraft) {
        throw new Error('Draft not found');
      }

      const updatedDraft: DraftReport = {
        ...draft,
        id: existingDraft.id,
        savedAt: new Date().toISOString(),
      };

      const updatedDrafts = currentDrafts.map(d => 
        d.id === id ? updatedDraft : d
      );
      
      await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(updatedDrafts));
      set({ drafts: updatedDrafts });
    } catch (error) {
      console.error('Error updating draft:', error);
      throw error;
    }
  },

  deleteDraft: async (id) => {
    try {
      const currentDrafts = get().drafts;
      const updatedDrafts = currentDrafts.filter(d => d.id !== id);
      
      await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(updatedDrafts));
      set({ drafts: updatedDrafts });
    } catch (error) {
      console.error('Error deleting draft:', error);
      throw error;
    }
  },

  getDraftById: (id) => {
    return get().drafts.find(d => d.id === id);
  },

  getDraftsCount: () => {
    return get().drafts.length;
  },
}));
