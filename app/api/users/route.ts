
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireSuperAdmin, writeAdminAuditLog } from '@/lib/admin';

export async function GET() {
    try {
        const admin = await requireSuperAdmin();
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await pool.query<{ id: string; email: string; role: string; created_at: string }>(
            'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC'
        );

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Get Users Error:', error);
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

        // Check if email exists
        const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const result = await pool.query<{ id: string; email: string; role: string; created_at: string }>(
            'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
            [email, passwordHash, role]
        );

        await writeAdminAuditLog({
            actorUserId: admin.userId,
            targetUserId: result.rows[0].id,
            action: 'admin_user_create',
            metadata: { email: result.rows[0].email, role: result.rows[0].role },
        });

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Create User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
