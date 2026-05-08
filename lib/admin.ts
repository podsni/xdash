import pool from '@/lib/db';
import { getSession, type SessionPayload } from '@/lib/auth';

export type SuperAdminSession = SessionPayload & {
    email: string;
};

export type AdminAuditAction =
    | 'admin_secret_reveal'
    | 'admin_account_update'
    | 'admin_account_delete'
    | 'admin_user_create'
    | 'admin_user_update'
    | 'admin_user_delete'
    | 'admin_registration_update';

export async function requireSuperAdmin(): Promise<SuperAdminSession | null> {
    const session = await getSession();
    if (!session) return null;

    const result = await pool.query<{ email: string; role: string }>(
        'SELECT email, role FROM users WHERE id = $1',
        [session.userId]
    );

    const user = result.rows[0];
    if (!user || user.role !== 'superadmin') return null;

    return {
        ...session,
        email: user.email,
    };
}

export async function writeAdminAuditLog({
    actorUserId,
    targetUserId = null,
    targetAccountId = null,
    action,
    metadata = {},
}: {
    actorUserId: string;
    targetUserId?: string | null;
    targetAccountId?: string | null;
    action: AdminAuditAction;
    metadata?: Record<string, unknown>;
}) {
    await pool.query(
        `INSERT INTO admin_audit_logs (actor_user_id, target_user_id, target_account_id, action, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [actorUserId, targetUserId, targetAccountId, action, JSON.stringify(metadata)]
    );
}
