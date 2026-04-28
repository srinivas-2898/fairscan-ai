import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

const STORAGE_KEY = "fairscan_admin_unlocked";
export const ADMIN_KEY = "1234";

type Ctx = {
  unlocked: boolean;
  unlock: (key: string) => boolean;
  lock: () => void;
  promptOpen: boolean;
  openPrompt: (onSuccess?: () => void) => void;
  closePrompt: () => void;
  onSuccess?: () => void;
};

const AdminGateCtx = createContext<Ctx | undefined>(undefined);

export const AdminGateProvider = ({ children }: { children: ReactNode }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [onSuccess, setOnSuccess] = useState<(() => void) | undefined>();

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const unlock = useCallback((key: string) => {
    if (key === ADMIN_KEY) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      return true;
    }
    return false;
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUnlocked(false);
  }, []);

  const openPrompt = useCallback((cb?: () => void) => {
    setOnSuccess(() => cb);
    setPromptOpen(true);
  }, []);

  const closePrompt = useCallback(() => setPromptOpen(false), []);

  return (
    <AdminGateCtx.Provider value={{ unlocked, unlock, lock, promptOpen, openPrompt, closePrompt, onSuccess }}>
      {children}
    </AdminGateCtx.Provider>
  );
};

export const useAdminGate = () => {
  const c = useContext(AdminGateCtx);
  if (!c) {
    return {
      unlocked: false,
      unlock: () => false,
      lock: () => {},
      promptOpen: false,
      openPrompt: () => {},
      closePrompt: () => {},
      onSuccess: undefined,
    } as Ctx;
  }
  return c;
};
