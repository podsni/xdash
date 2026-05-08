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

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireSuperAdmin();
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { email, password, role } = body;

        const updates: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        if (email) {
            updates.push(`email = $${idx}`);
            values.push(email);
            idx++;
        }

        if (password) {
            updates.push(`password_hash = $${idx}`);
            values.push(bcrypt.hashSync(password, 10));
            idx++;
        }

        if (role) {
            if (!['user', 'superadmin'].includes(role)) {
                return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
            }
            updates.push(`role = $${idx}`);
            values.push(role);
            idx++;
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        updates.push('updated_at = now()');
        values.push(id);

        const result = await pool.query<AdminUserRow>(
            `UPDATE users
             SET ${updates.join(', ')}
             WHERE id = $${idx}
             RETURNING id, email, role, created_at, updated_at,
                       (SELECT COUNT(*)::int FROM accounts WHERE user_id = users.id) AS account_count`,
            values
        );

        const user = result.rows[0];
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await writeAdminAuditLog({
            actorUserId: admin.userId,
            targetUserId: user.id,
            action: 'admin_user_update',
            metadata: {
                email: user.email,
                role: user.role,
                password_changed: Boolean(password),
            },
        });

        return NextResponse.json(user);
    } catch (error: unknown) {
        console.error('Admin User PUT Error:', error);
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireSuperAdmin();
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        if (id === admin.userId) {
            return NextResponse.json({ error: 'Cannot delete your own account from admin panel' }, { status: 400 });
        }

        const existing = await pool.query<{ id: string; email: string; role: string }>(
            'SELECT id, email, role FROM users WHERE id = $1',
            [id]
        );
        const user = existing.rows[0];
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await writeAdminAuditLog({
            actorUserId: admin.userId,
            targetUserId: user.id,
            action: 'admin_user_delete',
            metadata: { email: user.email, role: user.role },
        });

        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin User DELETE Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
