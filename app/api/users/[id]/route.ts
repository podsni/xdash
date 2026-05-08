
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireSuperAdmin, writeAdminAuditLog } from '@/lib/admin';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireSuperAdmin();
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const p = await params;
        const { id } = p;

        const result = await pool.query<{ id: string; email: string; role: string; created_at: string }>(
            'SELECT id, email, role, created_at FROM users WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Get User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireSuperAdmin();
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const p = await params;
        const { id } = p;
        const body = await request.json();
        const { email, password, role } = body;

        // Build dynamic query
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

        if (role && ['user', 'superadmin'].includes(role)) {
            updates.push(`role = $${idx}`);
            values.push(role);
            idx++;
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        values.push(id);
        updates.push('updated_at = now()');
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, role, created_at`;

        const result = await pool.query<{ id: string; email: string; role: string; created_at: string }>(query, values);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await writeAdminAuditLog({
            actorUserId: admin.userId,
            targetUserId: result.rows[0].id,
            action: 'admin_user_update',
            metadata: {
                email: result.rows[0].email,
                role: result.rows[0].role,
                password_changed: Boolean(password),
            },
        });

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Update User Error:', error);
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

        const p = await params;
        const { id } = p;

        // Prevent self-deletion
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

        // Delete user's accounts first
        await pool.query('DELETE FROM accounts WHERE user_id = $1', [id]);

        // Delete user
        const result = await pool.query<{ id: string }>('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
