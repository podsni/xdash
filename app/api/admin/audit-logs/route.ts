import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireSuperAdmin } from '@/lib/admin';

type AuditLogRow = {
    id: string;
    action: string;
    metadata: Record<string, unknown>;
    created_at: string;
    actor_email: string | null;
    target_email: string | null;
    target_service_name: string | null;
};

export async function GET() {
    try {
        const admin = await requireSuperAdmin();
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await pool.query<AuditLogRow>(
            `SELECT logs.id, logs.action, logs.metadata, logs.created_at,
                    actor.email AS actor_email,
                    target.email AS target_email,
                    accounts.service_name AS target_service_name
             FROM admin_audit_logs logs
             LEFT JOIN users actor ON actor.id = logs.actor_user_id
             LEFT JOIN users target ON target.id = logs.target_user_id
             LEFT JOIN accounts ON accounts.id = logs.target_account_id
             ORDER BY logs.created_at DESC
             LIMIT 100`
        );

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Admin Audit Logs GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
