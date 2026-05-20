
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/auth';

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const isPublicPath = path === '/login' || path === '/register' || path.startsWith('/share/');
    const isApi = path.startsWith('/api/');
    const isPublicApi = (path === '/api/settings' && request.method === 'GET') ||
        (path.startsWith('/api/share/') && (request.method === 'GET' || request.method === 'POST'));

    const cookie = request.cookies.get('session')?.value;
    const session = cookie ? await verifySession(cookie) : null;

    if (isPublicPath && session) {
        return NextResponse.redirect(new URL('/', request.nextUrl));
    }

    if (isPublicApi) {
        return NextResponse.next();
    }

    if (!isPublicPath && !session && isApi && !path.startsWith('/api/auth')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPublicPath && !session && !isApi && !path.startsWith('/_next') && !path.includes('favicon')) {
        return NextResponse.redirect(new URL('/login', request.nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
