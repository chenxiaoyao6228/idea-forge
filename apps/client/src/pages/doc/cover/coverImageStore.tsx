import { create } from "zustand";

type CoverImageStore = {
  isPickerOpen: boolean;
  setIsPickerOpen: (isPickerOpen: boolean) => void;
};

export const useCoverImageStore = create<CoverImageStore>((set) => ({
  isPickerOpen: false,
  setIsPickerOpen: (isPickerOpen) => set({ isPickerOpen }),
}));
