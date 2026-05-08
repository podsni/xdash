import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { requireSuperAdmin, writeAdminAuditLog } from '@/lib/admin';

type AccountRow = {
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

function serializeAccount(row: AccountRow) {
    return {
        id: row.id,
        user_id: row.user_id,
        service_name: row.service_name,
        username: row.username,
        website: row.website,
        icon: row.icon,
        has_password: row.has_password,
        has_otp_secret: row.has_otp_secret,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
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

        const { id } = await params;
        const body = await request.json();
        const { service_name, username, website, icon, password, otp_secret } = body;

        if (!service_name) {
            return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
        }

        let query = `UPDATE accounts
                     SET service_name = $1, username = $2, website = $3, icon = $4, updated_at = now()`;
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

        query += ` WHERE id = $${idx}
                   RETURNING id, user_id, service_name, username, website, icon,
                             (encrypted_password <> '') AS has_password,
                             (encrypted_otp_secret <> '') AS has_otp_secret,
                             created_at, updated_at`;
        values.push(id);

        const result = await pool.query<AccountRow>(query, values);
        const account = result.rows[0];
        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        await writeAdminAuditLog({
            actorUserId: admin.userId,
            targetUserId: account.user_id,
            targetAccountId: account.id,
            action: 'admin_account_update',
            metadata: {
                service_name: account.service_name,
                changed_secret_fields: {
                    password: password !== undefined,
                    otp_secret: otp_secret !== undefined,
                },
            },
        });

        return NextResponse.json(serializeAccount(account));
    } catch (error) {
        console.error('Admin Account PUT Error:', error);
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
        const result = await pool.query<{ id: string; user_id: string; service_name: string }>(
            'DELETE FROM accounts WHERE id = $1 RETURNING id, user_id, service_name',
            [id]
        );

        const account = result.rows[0];
        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        await writeAdminAuditLog({
            actorUserId: admin.userId,
            targetUserId: account.user_id,
            targetAccountId: account.id,
            action: 'admin_account_delete',
            metadata: { service_name: account.service_name },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin Account DELETE Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
