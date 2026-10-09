import { useQuery } from '@tanstack/react-query';
import { fetchBootstrap, fetchSession, type BootstrapData, type SessionData, type SessionMembership, type SessionUnit } from './api';
import { BOOTSTRAP_KEY, SESSION_KEY } from './queryKeys';

const EXECUTIVE_ROLES = ['admin', 'vice_admin'];
const LEADERSHIP_ROLES = ['leader', 'vice_leader'];

export interface Capabilities {
  role: string | null;
  unit: SessionUnit | null;
  unitRole: string | null;
  memberships: SessionMembership[];
  isExec: boolean;
  isManager: boolean;
  canCreateActivity: boolean;
  canCreateAccount: boolean;
  canManageTeam: (teamId: number) => boolean;
}

/** Bắt chước `isExecutive`/`isLeadership` của Core (core/src/middleware/auth.js). Server vẫn là nơi chặn cuối. */
export function deriveCapabilities(session?: SessionData | null, bootstrap?: BootstrapData | null): Capabilities {
  const role = session?.user?.role ?? null;
  const unit = session?.units?.current ?? null;
  const memberships = session?.units?.memberships ?? [];
  const unitRole = unit ? memberships.find((m) => m.unit_id === unit.id)?.role ?? null : null;
  const roles = [role, unitRole];
  const isExec = roles.some((r) => r !== null && EXECUTIVE_ROLES.includes(r));
  const isManager = isExec || roles.some((r) => r !== null && LEADERSHIP_ROLES.includes(r));
  const managedTeams = new Set((bootstrap?.teams ?? []).filter((t) => Boolean(t.can_manage)).map((t) => t.id));
  return {
    role,
    unit,
    unitRole,
    memberships,
    isExec,
    isManager,
    canCreateActivity: Boolean(bootstrap?.capabilities?.canCreateActivity),
    canCreateAccount: Boolean(bootstrap?.capabilities?.canCreateAccount),
    canManageTeam: (teamId: number) => isExec || managedTeams.has(teamId),
  };
}

export function useCapabilities(): Capabilities {
  const { data: session } = useQuery({ queryKey: SESSION_KEY, queryFn: fetchSession });
  const signedIn = Boolean(session?.user) && !session?.user?.onboarding?.required;
  const { data: bootstrap } = useQuery({ queryKey: BOOTSTRAP_KEY, queryFn: fetchBootstrap, enabled: signedIn });
  return deriveCapabilities(session, bootstrap);
}
