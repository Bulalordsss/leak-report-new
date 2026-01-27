import { create } from 'zustand';

export type LeakType = 'Unidentified' | 'Serviceline' | 'Mainline' | 'Others' | null;
export type LocationType = 'Surface' | 'Non-Surface' | null;

type ReportFormState = {
  leakType: LeakType;
  location: LocationType;
  contactPerson: string;
  contactNumber: string;
  landmark: string;
  leakPhotos: string[];
  landmarkPhotos: string[];
  // setters
  setLeakType: (v: LeakType) => void;
  setLocation: (v: LocationType) => void;
  setContactPerson: (v: string) => void;
  setContactNumber: (v: string) => void;
  setLandmark: (v: string) => void;
  setLeakPhotos: (v: string[]) => void;
  setLandmarkPhotos: (v: string[]) => void;
  reset: () => void;
};

const initialState: Omit<ReportFormState,
  'setLeakType' | 'setLocation' | 'setContactPerson' | 'setContactNumber' |
  'setLandmark' | 'setLeakPhotos' | 'setLandmarkPhotos' | 'reset'
> = {
  leakType: null,
  location: null,
  contactPerson: '',
  contactNumber: '',
  landmark: '',
  leakPhotos: [],
  landmarkPhotos: [],
};

export const useReportForm = create<ReportFormState>()((set) => ({
  ...initialState,
  setLeakType: (v: LeakType) => set({ leakType: v }),
  setLocation: (v: LocationType) => set({ location: v }),
  setContactPerson: (v: string) => set({ contactPerson: v }),
  setContactNumber: (v: string) => set({ contactNumber: v }),
  setLandmark: (v: string) => set({ landmark: v }),
  setLeakPhotos: (v: string[]) => set({ leakPhotos: v }),
  setLandmarkPhotos: (v: string[]) => set({ landmarkPhotos: v }),
  reset: () => set({ ...initialState }),
}));
