import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getDB } from "@/db";
import { ensureSuperAdmin, isSeeded, seedDemoSchool } from "@/db/seed";
import type { Organization, Role, User } from "@/db/types";
import { audit } from "@/services";
import { can, type Permission } from "./permissions";

interface SessionUser extends Omit<User, "password"> {}

interface AuthContextValue {
  user: SessionUser | null;
  org: Organization | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  has: (permission: Permission) => boolean;
  refreshOrg: () => Promise<void>;
  seeded: boolean;
  loadDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "scholareer.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);

  const loadOrg = useCallback(async (orgId: string | null) => {
    // Super admins have no home school; they operate on the first school in the system.
    const resolved = orgId
      ? await getDB().organizations.get(orgId)
      : await getDB().organizations.toCollection().first();
    setOrg(resolved ?? null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await ensureSuperAdmin();
        setSeeded(await isSeeded());
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { id: string };
          const found = await getDB().users.get(parsed.id);
          if (found && found.status === "ACTIVE") {
            const { password: _pw, ...safe } = found;
            setUser(safe);
            await loadOrg(found.organizationId);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadOrg]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const found = await getDB()
        .users.where("email")
        .equals(email.trim().toLowerCase())
        .first();
      if (!found || found.password !== password) {
        throw new Error("Invalid email or password.");
      }
      if (found.status !== "ACTIVE") throw new Error("This account has been suspended.");
      const { password: _pw, ...safe } = found;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: safe.id }));
      setUser(safe);
      await loadOrg(found.organizationId);
      if (found.organizationId) {
        await audit(found.organizationId, safe.name, "LOGIN", "User", safe.id, "User signed in");
      }
    },
    [loadOrg],
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setOrg(null);
  }, []);

  const loadDemo = useCallback(async () => {
    await seedDemoSchool();
    setSeeded(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      org,
      loading,
      signIn,
      signOut,
      seeded,
      loadDemo,
      refreshOrg: () => loadOrg(user?.organizationId ?? null),
      has: (permission: Permission) => can(user?.role as Role | undefined, permission),
    }),
    [user, org, loading, signIn, signOut, seeded, loadDemo, loadOrg],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Organization id of the signed-in user (super admins operate on the demo school). */
export function useOrgId() {
  const { user, org } = useAuth();
  return org?.id ?? user?.organizationId ?? null;
}
