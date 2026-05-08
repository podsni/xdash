
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { getSession } from '@/lib/auth';

type AccountRow = {
    id: string;
    service_name: string;
    username: string;
    encrypted_password: string;
    encrypted_otp_secret: string;
    website: string;
    icon: string;
    created_at: string;
    updated_at: string;
};

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await pool.query<AccountRow>(
            `SELECT id, service_name, username, encrypted_password, encrypted_otp_secret, website, icon, created_at, updated_at
             FROM accounts
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [session.userId]
        );

        const accounts = result.rows.map((row) => ({
            id: row.id,
            service_name: row.service_name,
            username: row.username,
            password: decrypt(row.encrypted_password),
            otp_secret: decrypt(row.encrypted_otp_secret),
            website: row.website,
            icon: row.icon,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));

        return NextResponse.json(accounts);
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { service_name, username, password, otp_secret, website, icon } = body;

        if (!service_name) {
            return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
        }

        const encrypted_password = password ? encrypt(password) : '';
        const encrypted_otp_secret = otp_secret ? encrypt(otp_secret) : '';

        const query = `
      INSERT INTO accounts (service_name, username, encrypted_password, encrypted_otp_secret, website, icon, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const values = [service_name, username || '', encrypted_password, encrypted_otp_secret, website || '', icon || '', session.userId];

        const result = await pool.query<AccountRow>(query, values);

        const row = result.rows[0];
        return NextResponse.json({
            id: row.id,
            service_name: row.service_name,
            username: row.username,
            password: password || '',
            otp_secret: otp_secret || '',
            website: row.website,
            icon: row.icon,
            created_at: row.created_at,
            updated_at: row.updated_at
        });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
