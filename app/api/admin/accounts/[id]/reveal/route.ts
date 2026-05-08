import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { requireSuperAdmin, writeAdminAuditLog } from '@/lib/admin';

type SecretField = 'password' | 'otp_secret';

type AccountSecretRow = {
    id: string;
    user_id: string;
    service_name: string;
    encrypted_password: string;
    encrypted_otp_secret: string;
};

export async function POST(
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
        const field = body.field as SecretField;

        if (!['password', 'otp_secret'].includes(field)) {
            return NextResponse.json({ error: 'Invalid secret field' }, { status: 400 });
        }

        const result = await pool.query<AccountSecretRow>(
            `SELECT id, user_id, service_name, encrypted_password, encrypted_otp_secret
             FROM accounts
             WHERE id = $1`,
            [id]
        );

        const account = result.rows[0];
        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        const encryptedValue = field === 'password'
            ? account.encrypted_password
            : account.encrypted_otp_secret;

        await writeAdminAuditLog({
            actorUserId: admin.userId,
            targetUserId: account.user_id,
            targetAccountId: account.id,
            action: 'admin_secret_reveal',
            metadata: { field, service_name: account.service_name },
        });

        return NextResponse.json({
            field,
            value: decrypt(encryptedValue),
        });
    } catch (error) {
        console.error('Admin Account Reveal Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
