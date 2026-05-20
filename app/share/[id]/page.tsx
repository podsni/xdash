'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Copy, Clock, AlertTriangle, Shield, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { decryptData } from '@/lib/encryption';
import { OtpDisplay } from '@/components/otp-display';
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

function formatTimeRemaining(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff < 0) return 'Kedaluwarsa';
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} hari`;
    if (hours > 0) return `${hours} jam ${minutes % 60} menit`;
    return `${minutes} menit`;
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
        fetch(`/api/share/${shareId}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) setError(data.error);
                else setMetadata(data);
            })
            .catch(() => setError('Gagal memuat share'))
            .finally(() => setLoading(false));
    }, [shareId]);

    const handleUnlock = async () => {
        if (metadata?.requiresPassword && !password) {
            toast.error('Masukkan password terlebih dahulu');
            return;
        }
        setUnlocking(true);
        try {
            const encryptionKey = window.location.hash.substring(1);
            if (!encryptionKey) throw new Error('Link tidak valid — encryption key tidak ditemukan');

            const res = await fetch(`/api/share/${shareId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password || undefined }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal mengakses share');

            const decrypted = await decryptData(data.encryptedData, encryptionKey);
            setDecryptedData(JSON.parse(decrypted));
            toast.success('Share berhasil dibuka!');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal membuka share');
        } finally {
            setUnlocking(false);
        }
    };

    const copy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} disalin`);
    };

    if (loading) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0b0a]">
                <div className="h-10 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0b0a] p-6">
                <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10">
                        <AlertTriangle className="size-5 text-red-300" strokeWidth={2} />
                    </div>
                    <h1 className="text-lg font-semibold text-zinc-100">Share Tidak Tersedia</h1>
                    <p className="mt-2 text-sm text-zinc-500">{error}</p>
                </div>
            </div>
        );
    }

    if (!metadata) return null;

    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0b0a] p-4">
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(52,211,153,0.06),transparent)]" />

            <div className="relative w-full max-w-sm">
                {/* Header branding */}
                <div className="mb-4 flex items-center justify-center gap-2 text-zinc-600">
                    <Share2 className="size-4" strokeWidth={2} />
                    <span className="text-xs font-medium">Bitdash Secure Share</span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0e0d] shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
                    {/* Service header */}
                    <div className="border-b border-white/[0.06] px-6 py-5">
                        <div className="flex items-center gap-4">
                            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.10] bg-zinc-900 text-base font-semibold text-emerald-200">
                                {metadata.icon ? (
                                    <Image
                                        src={metadata.icon}
                                        alt={metadata.serviceName}
                                        width={48}
                                        height={48}
                                        unoptimized
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    metadata.serviceName.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="min-w-0">
                                <h1 className="truncate text-base font-semibold text-zinc-50">{metadata.serviceName}</h1>
                                <p className="truncate text-xs text-zinc-500">Dibagikan oleh {metadata.ownerEmail}</p>
                            </div>
                        </div>

                        {/* Meta badges */}
                        <div className="mt-4 flex flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-zinc-400">
                                <Clock className="size-3" strokeWidth={2} />
                                {formatTimeRemaining(metadata.expiresAt)}
                            </div>
                            {metadata.maxViews && (
                                <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-zinc-400">
                                    <Eye className="size-3" strokeWidth={2} />
                                    {metadata.viewCount}/{metadata.maxViews} view
                                </div>
                            )}
                            {metadata.requiresPassword && (
                                <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-zinc-400">
                                    <Shield className="size-3" strokeWidth={2} />
                                    Dilindungi password
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-5">
                        {!decryptedData ? (
                            <div className="space-y-4">
                                {metadata.maxViews === 1 && metadata.viewCount === 0 && (
                                    <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-3">
                                        <p className="text-xs font-semibold text-amber-300">⚠ Sekali lihat</p>
                                        <p className="mt-0.5 text-xs text-amber-200/70">
                                            Share ini akan dihapus permanen setelah dibuka.
                                        </p>
                                    </div>
                                )}

                                {metadata.requiresPassword && (
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-zinc-400">Password</Label>
                                        <Input
                                            type="password"
                                            placeholder="Masukkan password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                            className="h-10 rounded-xl border-white/[0.10] bg-white/[0.05] text-sm"
                                        />
                                    </div>
                                )}

                                <Button
                                    onClick={handleUnlock}
                                    disabled={unlocking}
                                    className="h-10 w-full rounded-xl bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300"
                                >
                                    {unlocking ? 'Membuka...' : 'Buka & Lihat'}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3">
                                    <div className="size-1.5 rounded-full bg-emerald-400" />
                                    <p className="text-xs font-medium text-emerald-300">Share berhasil dibuka</p>
                                </div>

                                {/* Username */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-zinc-500">Username</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={metadata.username}
                                            readOnly
                                            className="h-9 rounded-xl border-white/[0.10] bg-white/[0.05] text-sm"
                                        />
                                        <Button
                                            size="icon"
                                            onClick={() => copy(metadata.username, 'Username')}
                                            className="size-9 shrink-0 rounded-xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                                        >
                                            <Copy className="size-3.5" strokeWidth={2} />
                                        </Button>
                                    </div>
                                </div>

                                {/* Password */}
                                {decryptedData.password && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-zinc-500">Password</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                value={decryptedData.password}
                                                readOnly
                                                className="h-9 rounded-xl border-white/[0.10] bg-white/[0.05] font-mono text-sm"
                                            />
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="size-9 shrink-0 rounded-xl border-white/[0.10] bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]"
                                            >
                                                {showPassword ? <EyeOff className="size-3.5" strokeWidth={2} /> : <Eye className="size-3.5" strokeWidth={2} />}
                                            </Button>
                                            <Button
                                                size="icon"
                                                onClick={() => copy(decryptedData.password!, 'Password')}
                                                className="size-9 shrink-0 rounded-xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                                            >
                                                <Copy className="size-3.5" strokeWidth={2} />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* OTP */}
                                {decryptedData.otp_secret && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-zinc-500">OTP (TOTP)</Label>
                                        <div className="rounded-xl border border-white/[0.10] bg-white/[0.05] px-4 py-3">
                                            <OtpDisplay secret={decryptedData.otp_secret} />
                                        </div>
                                    </div>
                                )}

                                {metadata.maxViews === 1 && (
                                    <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3">
                                        <p className="text-xs font-semibold text-red-300">🔥 Share telah dihapus</p>
                                        <p className="mt-0.5 text-xs text-red-200/70">Link ini tidak bisa diakses lagi.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <p className="mt-4 text-center text-xs text-zinc-700">Terenkripsi end-to-end · Tidak perlu akun · Bitdash</p>
            </div>
        </div>
    );
}
