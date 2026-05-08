import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireSuperAdmin, writeAdminAuditLog } from '@/lib/admin';

type AdminUserRow = {
    id: string;
    email: string;
    role: string;
    created_at: string;
    updated_at: string;
    account_count: number;
};

export async function GET() {
    try {
        const admin = await requireSuperAdmin();
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await pool.query<AdminUserRow>(
            `SELECT u.id, u.email, u.role, u.created_at, u.updated_at, COUNT(a.id)::int AS account_count
             FROM users u
             LEFT JOIN accounts a ON a.user_id = u.id
             GROUP BY u.id, u.email, u.role, u.created_at, u.updated_at
             ORDER BY u.created_at DESC`
        );

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Admin Users GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const admin = await requireSuperAdmin();
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { email, password, role = 'user' } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        if (!['user', 'superadmin'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const result = await pool.query<AdminUserRow>(
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, $3)
             RETURNING id, email, role, created_at, updated_at, 0::int AS account_count`,
            [email, passwordHash, role]
        );

        const user = result.rows[0];
        await writeAdminAuditLog({
            actorUserId: admin.userId,
            targetUserId: user.id,
            action: 'admin_user_create',
            metadata: { email: user.email, role: user.role },
        });

        return NextResponse.json(user);
    } catch (error: unknown) {
        console.error('Admin Users POST Error:', error);
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
