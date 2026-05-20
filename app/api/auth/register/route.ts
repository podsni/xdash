import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, confirmPassword } = body;

        // Check if registration is enabled
        try {
            const settingsRes = await pool!.query("SELECT value FROM settings WHERE key = 'registration_enabled'");
            if (settingsRes.rows.length > 0 && settingsRes.rows[0].value === 'false') {
                return NextResponse.json({ error: 'Registration is currently disabled.' }, { status: 403 });
            }
        } catch (error) {
            console.error('Registration check failed:', error);
            return NextResponse.json({ error: 'Registration check failed. Please try again.' }, { status: 500 });
        }

        if (!email || !password || !confirmPassword) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        if (password !== confirmPassword) {
            return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // Check if email already exists
        const existingUser = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
        }

        // Hash password and create user
        const passwordHash = bcrypt.hashSync(password, 10);
        const result = await pool.query<{ id: string; email: string; role: string; created_at: string }>(
            'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
            [email, passwordHash, 'user']
        );

        return NextResponse.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Registration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
