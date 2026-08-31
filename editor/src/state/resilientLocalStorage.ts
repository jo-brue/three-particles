// A dropped image (TextureField) is downscaled before it's stored, but a config with several
// of them - or a browser origin that's already near its localStorage quota for other reasons -
// can still push a save over the limit. zustand's default storage lets that setItem exception
// propagate straight out of the next state update (any of them, not just the one that grew the
// payload), which crashes the whole app. Swallow it instead: the edit still works for the rest
// of the session, it just won't survive a reload.
export const resilientLocalStorage = {
  getItem: (name: string) => localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch (err) {
      console.warn(`[particle-editor] Could not save to localStorage (${(err as Error).message}) - your changes still work this session but won't survive a reload.`);
    }
  },
  removeItem: (name: string) => localStorage.removeItem(name),
};
