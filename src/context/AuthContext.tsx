import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { User } from "../types";
import { AuthModal } from "../components/auth/AuthModal";

interface AuthContextType {
  currentUser: User | null;
  requireAuth: (
    action: () => void,
    message?: string,
    initialRole?: "passenger" | "driver"
  ) => boolean;
  openAuthModal: (
    message?: string,
    initialTab?: "login" | "register",
    initialRole?: "passenger" | "driver",
    onSuccessAction?: () => void
  ) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => supabase.getCurrentUser());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"login" | "register">("register");
  const [modalRole, setModalRole] = useState<"passenger" | "driver">("passenger");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Keep currentUser state synced with Supabase broadcasts
  useEffect(() => {
    const syncUser = () => {
      setCurrentUser(supabase.getCurrentUser());
    };
    syncUser();
    const unsubscribe = supabase.subscribe(syncUser);
    return unsubscribe;
  }, []);

  const openAuthModal = (
    message?: string,
    initialTab: "login" | "register" = "register",
    initialRole: "passenger" | "driver" = "passenger",
    onSuccessAction?: () => void
  ) => {
    setModalMessage(message || null);
    setModalTab(initialTab);
    setModalRole(initialRole);
    if (onSuccessAction) {
      setPendingAction(() => onSuccessAction);
    }
    setIsModalOpen(true);
  };

  /**
   * Central authorization guard.
   * If the user is authenticated, executes action immediately and returns true.
   * If not authenticated, blocks action, displays message, opens Login/Register modal,
   * and saves action to run automatically after login/registration.
   */
  const requireAuth = (
    action: () => void,
    message: string = "Para solicitar uma corrida, faça seu cadastro ou entre na sua conta.",
    initialRole: "passenger" | "driver" = "passenger"
  ): boolean => {
    const user = supabase.getCurrentUser();
    if (user) {
      action();
      return true;
    } else {
      openAuthModal(message, "register", initialRole, action);
      return false;
    }
  };

  const logout = () => {
    supabase.setCurrentUser(null);
    setCurrentUser(null);
  };

  const handleAuthSuccess = () => {
    setIsModalOpen(false);
    setModalMessage(null);

    if (pendingAction) {
      const actionToRun = pendingAction;
      setPendingAction(null);
      // Execute after modal animation closes
      setTimeout(() => {
        actionToRun();
      }, 150);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        requireAuth,
        openAuthModal,
        logout
      }}
    >
      {children}

      <AuthModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalMessage(null);
          setPendingAction(null);
        }}
        onSuccess={handleAuthSuccess}
        promptMessage={modalMessage}
        initialTab={modalTab}
        initialRole={modalRole}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
