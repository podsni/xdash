import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifySession } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await verifySession(req.cookies.get('session')?.value || '');
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            shareId,
            accountId,
            encryptedData,
            passwordHash,
            expiresIn,
            maxViews
        } = body;

        if (!shareId || !accountId || !encryptedData || !expiresIn) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify account belongs to user
        const accountCheck = await pool.query(
            'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
            [accountId, session.userId]
        );

        if (accountCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        // Calculate expiration timestamp
        const expiresAt = new Date(Date.now() + expiresIn * 1000);

        // Create shared item
        await pool.query(
            `INSERT INTO shared_items
            (id, user_id, account_id, encrypted_data, password_hash, expires_at, max_views, view_count, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW())`,
            [shareId, session.userId, accountId, encryptedData, passwordHash, expiresAt, maxViews]
        );

        return NextResponse.json({
            success: true,
            shareId,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error('Share creation error:', error);
        return NextResponse.json({ error: 'Failed to create share' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await verifySession(req.cookies.get('session')?.value || '');
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's active shares
        const result = await pool.query(
            `SELECT
                s.id,
                s.account_id,
                s.expires_at,
                s.max_views,
                s.view_count,
                s.created_at,
                s.last_accessed_at,
                a.service_name,
                a.username,
                a.icon
            FROM shared_items s
            JOIN accounts a ON s.account_id = a.id
            WHERE s.user_id = $1 AND s.expires_at > NOW()
            ORDER BY s.created_at DESC`,
            [session.userId]
        );

        return NextResponse.json({ shares: result.rows });
    } catch (error) {
        console.error('Get shares error:', error);
        return NextResponse.json({ error: 'Failed to get shares' }, { status: 500 });
    }
}
