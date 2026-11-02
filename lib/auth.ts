import { cookies, headers } from 'next/headers';
import { UserRole, resolveUserRole } from './permissions';

export interface AuthContext {
  role: UserRole;
  isOfficer: boolean;
  isCitizen: boolean;
}

/**
 * Server-side authentication and authorization context helper.
 * Reads user identity and role from incoming HTTP cookies, headers, or authorization tokens.
 *
 * @returns AuthContext indicating resolved role and permission booleans
 */
export async function getAuthContext(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const roleCookie = cookieStore.get('nagarsetu_role')?.value;
  const roleHeader = headerStore.get('x-user-role');
  const authHeader = headerStore.get('authorization');

  let role = resolveUserRole(roleHeader, roleCookie, null);

  // Support Bearer officer-token or officer credentials in authorization header
  if (authHeader && authHeader.toLowerCase().includes('officer')) {
    role = 'officer';
  }

  return {
    role,
    isOfficer: role === 'officer',
    isCitizen: role === 'citizen',
  };
}
