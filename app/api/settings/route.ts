import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { requireSuperAdmin, writeAdminAuditLog } from '@/lib/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Table initialization is now handled via migrations
// See migrations/002_create_settings_table.sql

type SettingsRow = { key: string; value: string };

export async function GET() {
    try {
        const session = await getSession();
        const isSuperAdmin = session?.role === 'superadmin';

        const query = isSuperAdmin
            ? 'SELECT key, value FROM settings'
            : "SELECT key, value FROM settings WHERE key = 'registration_enabled'";

        const result = await pool.query<SettingsRow>(query);
        const settings: Record<string, string | boolean> = {};

        result.rows.forEach((row) => {
            if (row.value === 'true') settings[row.key] = true;
            else if (row.value === 'false') settings[row.key] = false;
            else settings[row.key] = row.value;
        });

        if (settings.registration_enabled === undefined) settings.registration_enabled = true;

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Settings GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const admin = await requireSuperAdmin();
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { registration_enabled } = body;

        if (registration_enabled !== undefined) {
            await pool.query(
                'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
                ['registration_enabled', String(registration_enabled)]
            );
            await writeAdminAuditLog({
                actorUserId: admin.userId,
                action: 'admin_registration_update',
                metadata: { registration_enabled: Boolean(registration_enabled) },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settings POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
