import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireSuperAdmin } from '@/lib/admin';

type AdminAccountRow = {
    id: string;
    user_id: string;
    service_name: string;
    username: string;
    website: string;
    icon: string;
    has_password: boolean;
    has_otp_secret: boolean;
    created_at: string;
    updated_at: string;
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireSuperAdmin();
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const user = await pool.query<{ id: string }>('SELECT id FROM users WHERE id = $1', [id]);
        if (user.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const result = await pool.query<AdminAccountRow>(
            `SELECT id, user_id, service_name, username, website, icon,
                    (encrypted_password <> '') AS has_password,
                    (encrypted_otp_secret <> '') AS has_otp_secret,
                    created_at, updated_at
             FROM accounts
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [id]
        );

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Admin User Accounts GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
