
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword, confirmPassword } = body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // Get current user
        const result = await pool.query<{ password_hash: string }>('SELECT * FROM users WHERE id = $1', [session.userId]);
        const user = result.rows[0];

        if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }

        // Update password
        const newPasswordHash = bcrypt.hashSync(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [newPasswordHash, session.userId]);

        return NextResponse.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change Password Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
