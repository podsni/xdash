
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { getSession } from '@/lib/auth';

type AccountRow = {
    id: string;
    user_id: string;
    service_name: string;
    username: string;
    encrypted_password: string;
    encrypted_otp_secret: string;
    website: string;
    icon: string;
    created_at: string;
    updated_at: string;
};

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const p = await params;
        const { id } = p;
        const result = await pool.query<{ id: string }>(
            'DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, session.userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const p = await params;
        const { id } = p;
        const body = await request.json();
        const { service_name, username, password, otp_secret, website, icon } = body;

        if (!service_name) {
            return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
        }

        // Dynamic query update is safer but let's be explicit for now
        let query = 'UPDATE accounts SET service_name = $1, username = $2, website = $3, icon = $4, updated_at = now()';
        const values: string[] = [service_name, username || '', website || '', icon || ''];
        let idx = 5;

        if (password !== undefined) {
            query += `, encrypted_password = $${idx}`;
            values.push(password ? encrypt(password) : '');
            idx++;
        }

        if (otp_secret !== undefined) {
            query += `, encrypted_otp_secret = $${idx}`;
            values.push(otp_secret ? encrypt(otp_secret) : '');
            idx++;
        }

        query += ` WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`;
        values.push(id);
        values.push(session.userId);

        const result = await pool.query<AccountRow>(query, values);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const row = result.rows[0];
        return NextResponse.json({
            id: row.id,
            service_name: row.service_name,
            username: row.username,
            password: decrypt(row.encrypted_password),
            otp_secret: decrypt(row.encrypted_otp_secret),
            website: row.website,
            icon: row.icon,
            created_at: row.created_at,
            updated_at: row.updated_at
        });
    } catch (error) {
        console.error('Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
