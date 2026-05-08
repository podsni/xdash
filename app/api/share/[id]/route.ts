import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const shareId = params.id;

        // Get share metadata (without encrypted data)
        const result = await pool.query(
            `SELECT
                s.id,
                s.expires_at,
                s.max_views,
                s.view_count,
                s.password_hash,
                s.created_at,
                a.service_name,
                a.username,
                a.icon,
                u.email as owner_email
            FROM shared_items s
            JOIN accounts a ON s.account_id = a.id
            JOIN users u ON s.user_id = u.id
            WHERE s.id = $1`,
            [shareId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Share not found' }, { status: 404 });
        }

        const share = result.rows[0];

        // Check if expired
        if (new Date(share.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
        }

        // Check if max views reached
        if (share.max_views && share.view_count >= share.max_views) {
            return NextResponse.json({ error: 'Share has reached maximum views' }, { status: 410 });
        }

        return NextResponse.json({
            id: share.id,
            serviceName: share.service_name,
            username: share.username,
            icon: share.icon,
            ownerEmail: share.owner_email,
            expiresAt: share.expires_at,
            maxViews: share.max_views,
            viewCount: share.view_count,
            requiresPassword: !!share.password_hash,
        });
    } catch (error) {
        console.error('Get share error:', error);
        return NextResponse.json({ error: 'Failed to get share' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const shareId = params.id;
        const body = await req.json();
        const { password } = body;

        // Get share with encrypted data
        const result = await pool.query(
            `SELECT
                s.id,
                s.encrypted_data,
                s.password_hash,
                s.expires_at,
                s.max_views,
                s.view_count,
                a.service_name
            FROM shared_items s
            JOIN accounts a ON s.account_id = a.id
            WHERE s.id = $1`,
            [shareId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Share not found' }, { status: 404 });
        }

        const share = result.rows[0];

        // Check if expired
        if (new Date(share.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
        }

        // Check if max views reached
        if (share.max_views && share.view_count >= share.max_views) {
            return NextResponse.json({ error: 'Share has reached maximum views' }, { status: 410 });
        }

        // Verify password if required
        if (share.password_hash) {
            if (!password) {
                return NextResponse.json({ error: 'Password required' }, { status: 401 });
            }

            const valid = await bcrypt.compare(password, share.password_hash);
            if (!valid) {
                // Log failed attempt
                await pool.query(
                    `INSERT INTO share_access_logs (share_id, accessed_at, ip_address, user_agent, success)
                    VALUES ($1, NOW(), $2, $3, false)`,
                    [shareId, req.headers.get('x-forwarded-for') || 'unknown', req.headers.get('user-agent') || 'unknown']
                );
                return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
            }
        }

        // Increment view count
        await pool.query(
            'UPDATE shared_items SET view_count = view_count + 1, last_accessed_at = NOW() WHERE id = $1',
            [shareId]
        );

        // Log successful access
        await pool.query(
            `INSERT INTO share_access_logs (share_id, accessed_at, ip_address, user_agent, success)
            VALUES ($1, NOW(), $2, $3, true)`,
            [shareId, req.headers.get('x-forwarded-for') || 'unknown', req.headers.get('user-agent') || 'unknown']
        );

        return NextResponse.json({
            success: true,
            encryptedData: share.encrypted_data,
        });
    } catch (error) {
        console.error('Access share error:', error);
        return NextResponse.json({ error: 'Failed to access share' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const shareId = params.id;

        // Delete share (will cascade to access logs)
        const result = await pool.query(
            'DELETE FROM shared_items WHERE id = $1 RETURNING id',
            [shareId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Share not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete share error:', error);
        return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 });
    }
}
