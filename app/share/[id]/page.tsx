'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, Copy, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { decryptData } from '@/lib/encryption';
import Image from 'next/image';

interface ShareMetadata {
    id: string;
    serviceName: string;
    username: string;
    icon: string;
    ownerEmail: string;
    expiresAt: string;
    maxViews: number | null;
    viewCount: number;
    requiresPassword: boolean;
}

interface DecryptedData {
    password?: string;
    otp_secret?: string;
}

export default function ViewSharedPage() {
    const params = useParams();
    const shareId = params.id as string;
    const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [unlocking, setUnlocking] = useState(false);
    const [decryptedData, setDecryptedData] = useState<DecryptedData | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        loadMetadata();
    }, [shareId]);

    const loadMetadata = async () => {
        try {
            const res = await fetch(`/api/share/${shareId}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to load share');
                return;
            }

            setMetadata(data);
        } catch (err) {
            setError('Failed to load share');
        } finally {
            setLoading(false);
        }
    };

    const handleUnlock = async () => {
        if (metadata?.requiresPassword && !password) {
            toast.error('Please enter the password');
            return;
        }

        setUnlocking(true);
        try {
            // Get encryption key from URL fragment
            const encryptionKey = window.location.hash.substring(1);
            if (!encryptionKey) {
                throw new Error('Invalid share link - encryption key missing');
            }

            // Access the share
            const res = await fetch(`/api/share/${shareId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password || undefined }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to access share');
            }

            // Decrypt the data
            const decrypted = await decryptData(data.encryptedData, encryptionKey);
            const parsedData = JSON.parse(decrypted);
            setDecryptedData(parsedData);

            toast.success('Share unlocked successfully!');
        } catch (err) {
            console.error('Unlock error:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to unlock share');
        } finally {
            setUnlocking(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const formatTimeRemaining = (expiresAt: string) => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires.getTime() - now.getTime();

        if (diff < 0) return 'Expired';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days} day${days > 1 ? 's' : ''}`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    };

    if (loading) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0b0a]">
                <div className="h-12 w-64 animate-pulse rounded-xl border border-white/[0.12] bg-white/[0.04]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#0a0b0a] p-6">
                <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/10 via-transparent to-transparent" />
                <Card className="relative z-10 w-full max-w-md rounded-xl border-white/[0.12] bg-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-red-300/25 bg-red-400/10 text-red-200">
                            <AlertTriangle className="size-6" strokeWidth={2} />
                        </div>
                        <CardTitle className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50">
                            Share Not Available
                        </CardTitle>
                        <CardDescription className="text-base text-zinc-400">
                            {error}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (!metadata) return null;

    return (
        <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#0a0b0a] p-6">
            <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/10 via-transparent to-transparent" />

            <Card className="relative z-10 w-full max-w-md rounded-xl border-white/[0.12] bg-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.12] bg-zinc-900 text-lg font-semibold text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            {metadata.icon ? (
                                <Image
                                    src={metadata.icon}
                                    alt={metadata.serviceName}
                                    width={56}
                                    height={56}
                                    unoptimized
                                    className="size-full object-cover"
                                />
                            ) : (
                                metadata.serviceName.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <CardTitle className="text-xl font-semibold tracking-tight text-zinc-50">
                                {metadata.serviceName}
                            </CardTitle>
                            <CardDescription className="mt-1 text-sm text-zinc-400">
                                Shared by {metadata.ownerEmail}
                            </CardDescription>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1.5">
                            <Clock className="size-3.5" strokeWidth={2} />
                            <span>Expires in {formatTimeRemaining(metadata.expiresAt)}</span>
                        </div>
                        {metadata.maxViews && (
                            <div className="flex items-center gap-1.5">
                                <Eye className="size-3.5" strokeWidth={2} />
                                <span>{metadata.viewCount}/{metadata.maxViews} views</span>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    {!decryptedData ? (
                        <div className="space-y-4">
                            {metadata.requiresPassword && (
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                                        Password Required
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Enter password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                        className="h-11 rounded-lg border-white/[0.12] bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                                    />
                                </div>
                            )}

                            {metadata.maxViews === 1 && (
                                <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
                                    <p className="font-semibold">⚠️ One-time view</p>
                                    <p className="mt-1 text-xs text-amber-100/80">
                                        This share will be permanently destroyed after viewing.
                                    </p>
                                </div>
                            )}

                            <Button
                                onClick={handleUnlock}
                                disabled={unlocking}
                                className="h-11 w-full rounded-lg bg-emerald-400 font-medium text-zinc-950 shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_4px_12px_rgba(52,211,153,0.3)] transition-all duration-200 hover:bg-emerald-300 active:scale-[0.98]"
                            >
                                {unlocking ? 'Unlocking...' : 'Unlock & View'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-4">
                                <p className="text-sm font-semibold text-emerald-100">✓ Share unlocked successfully!</p>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-zinc-300">Username</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={metadata.username}
                                        readOnly
                                        className="h-10 rounded-lg border-white/[0.12] bg-white/[0.06]"
                                    />
                                    <Button
                                        size="icon"
                                        onClick={() => copyToClipboard(metadata.username, 'Username')}
                                        className="size-10 shrink-0 rounded-lg bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                                    >
                                        <Copy className="size-4" strokeWidth={2} />
                                    </Button>
                                </div>
                            </div>

                            {decryptedData.password && (
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-zinc-300">Password</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            value={decryptedData.password}
                                            readOnly
                                            className="h-10 rounded-lg border-white/[0.12] bg-white/[0.06] font-mono"
                                        />
                                        <Button
                                            size="icon"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="size-10 shrink-0 rounded-lg border-white/[0.12] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                                            variant="outline"
                                        >
                                            {showPassword ? <Eye className="size-4" strokeWidth={2} /> : <Lock className="size-4" strokeWidth={2} />}
                                        </Button>
                                        <Button
                                            size="icon"
                                            onClick={() => copyToClipboard(decryptedData.password!, 'Password')}
                                            className="size-10 shrink-0 rounded-lg bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                                        >
                                            <Copy className="size-4" strokeWidth={2} />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {decryptedData.otp_secret && (
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-zinc-300">OTP Secret</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={decryptedData.otp_secret}
                                            readOnly
                                            className="h-10 rounded-lg border-white/[0.12] bg-white/[0.06] font-mono text-xs"
                                        />
                                        <Button
                                            size="icon"
                                            onClick={() => copyToClipboard(decryptedData.otp_secret!, 'OTP Secret')}
                                            className="size-10 shrink-0 rounded-lg bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                                        >
                                            <Copy className="size-4" strokeWidth={2} />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {metadata.maxViews === 1 && (
                                <div className="rounded-lg border border-red-300/25 bg-red-400/10 p-4 text-sm text-red-100">
                                    <p className="font-semibold">🔥 This share has been destroyed</p>
                                    <p className="mt-1 text-xs text-red-100/80">
                                        The link is no longer valid and cannot be accessed again.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
