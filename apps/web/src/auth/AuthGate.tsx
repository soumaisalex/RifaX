import { ReactNode, useEffect, useState } from "react";

export type AuthSession = { userId: string; organizationId: string | null; role: "SUPER_ADMIN" | "ORGANIZATION_ADMIN" | "COLLABORATOR"; expiresAt: number };

export default function AuthGate({ children, roles, loginPath }: { children: ReactNode; roles: AuthSession["role"][]; loginPath: string }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (response) => response.ok ? await response.json() as AuthSession : null)
      .then((value) => {
        if (!value) {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.assign(`${loginPath}?next=${next}`);
          return;
        }
        setSession(value);
      })
      .finally(() => setLoading(false));
  }, [loginPath]);

  if (loading || !session) return <main><p>Verificando acesso…</p></main>;
  if (!roles.includes(session.role)) return <main><h1>Acesso negado</h1><p>Seu usuário não possui permissão para esta área.</p></main>;
  return <>{children}</>;
}
