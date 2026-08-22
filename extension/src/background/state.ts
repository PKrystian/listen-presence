const STORAGE_KEY = 'sharingEnabled';

export const getSharingEnabled = async (): Promise<boolean> => {
  const stored = await chrome.storage.local.get({ [STORAGE_KEY]: true });
  return stored[STORAGE_KEY] !== false;
};

export const setSharingEnabled = async (enabled: boolean): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
};
