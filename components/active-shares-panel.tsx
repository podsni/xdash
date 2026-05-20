'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Share2, Copy, Trash2, Clock, Eye, ChevronDown, ChevronUp, ExternalLink, Lock, Key, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Image from 'next/image';

interface ActiveShare {
    id: string;
    account_id: string;
    service_name: string;
    username: string;
    icon: string;
    expires_at: string;
    max_views: number | null;
    view_count: number;
    created_at: string;
    last_accessed_at: string | null;
    password_protected: boolean;
    has_password: boolean;
    has_otp: boolean;
}

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.shares ?? []);

function timeRemaining(expiresAt: string): { label: string; pct: number; urgent: boolean } {
    const total = 30 * 24 * 3600 * 1000; // assume max 30d for pct calc
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { label: 'Kedaluwarsa', pct: 0, urgent: true };
    const pct = Math.min(100, (diff / total) * 100);
    const urgent = diff < 3600000; // < 1 hour
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    const label = d > 0 ? `${d}h lagi` : h > 0 ? `${h}j ${m % 60}m lagi` : `${m}m lagi`;
    return { label, pct, urgent };
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}h lalu`;
    if (h > 0) return `${h}j lalu`;
    if (m > 0) return `${m}m lalu`;
    return 'Baru saja';
}

export function ActiveSharesPanel() {
    const { data: shares, mutate, isLoading } = useSWR<ActiveShare[]>('/api/share', fetcher, { refreshInterval: 15000 });
    const [open, setOpen] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    const count = shares?.length ?? 0;

    const getFullLink = (id: string): string => {
        try {
            const stored = JSON.parse(localStorage.getItem('share_links') || '{}');
            return stored[id] || `${window.location.origin}/share/${id}`;
        } catch {
            return `${window.location.origin}/share/${id}`;
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus share "${name}"? Link tidak bisa diakses lagi.`)) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/share/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            // Hapus dari localStorage
            try {
                const stored = JSON.parse(localStorage.getItem('share_links') || '{}');
                delete stored[id];
                localStorage.setItem('share_links', JSON.stringify(stored));
            } catch { /* ignore */ }
            toast.success('Share dihapus');
            mutate();
        } catch {
            toast.error('Gagal menghapus share');
        } finally {
            setDeleting(null);
        }
    };

    const copyLink = (id: string) => {
        const link = getFullLink(id);
        const hasKey = link.includes('#');
        navigator.clipboard.writeText(link);
        toast.success(hasKey ? 'Link share disalin' : 'URL disalin (buka ulang dari browser yang sama untuk link lengkap)');
    };

    if (!isLoading && count === 0) return null;

    return (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
            {/* Header */}
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
            >
                <div className="flex items-center gap-2.5">
                    <div className="flex size-6 items-center justify-center rounded-md bg-emerald-400/10">
                        <Share2 className="size-3 text-emerald-300" strokeWidth={2} />
                    </div>
                    <span className="text-sm font-medium text-zinc-300">Share Aktif</span>
                    {count > 0 && (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                            {count}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); mutate(); }}
                        className="rounded-md p-1 text-zinc-600 transition-colors hover:text-zinc-400"
                        title="Refresh"
                    >
                        <RefreshCw className="size-3" strokeWidth={2} />
                    </button>
                    {open ? <ChevronUp className="size-4 text-zinc-600" strokeWidth={2} /> : <ChevronDown className="size-4 text-zinc-600" strokeWidth={2} />}
                </div>
            </button>

            {/* List */}
            {open && (
                <div className="divide-y divide-white/[0.04] border-t border-white/[0.06]">
                    {isLoading && (
                        <div className="px-5 py-4">
                            <div className="h-4 w-32 animate-pulse rounded bg-white/[0.06]" />
                        </div>
                    )}
                    {shares?.map((share) => {
                        const expiry = timeRemaining(share.expires_at);
                        const isMaxed = share.max_views !== null && share.view_count >= share.max_views;

                        return (
                            <div key={share.id} className="px-5 py-4">
                                <div className="flex items-start gap-3">
                                    {/* Icon */}
                                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-zinc-900 text-xs font-semibold text-emerald-200">
                                        {share.icon ? (
                                            <Image src={share.icon} alt={share.service_name} width={36} height={36} unoptimized className="size-full object-cover" />
                                        ) : (
                                            share.service_name.charAt(0).toUpperCase()
                                        )}
                                    </div>

                                    {/* Main info */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <span className="text-sm font-medium text-zinc-200">{share.service_name}</span>
                                                <span className="ml-2 text-xs text-zinc-600">{share.username}</span>
                                            </div>
                                            {/* Actions */}
                                            <div className="flex shrink-0 items-center gap-0.5">
                                                <Button variant="ghost" size="icon" onClick={() => window.open(getFullLink(share.id), '_blank')} className="size-7 rounded-lg text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300" title="Buka">
                                                    <ExternalLink className="size-3" strokeWidth={2} />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => copyLink(share.id)} className="size-7 rounded-lg text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300" title="Salin URL">
                                                    <Copy className="size-3" strokeWidth={2} />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(share.id, share.service_name)} disabled={deleting === share.id} className="size-7 rounded-lg text-zinc-600 hover:bg-red-400/10 hover:text-red-400" title="Hapus">
                                                    <Trash2 className="size-3" strokeWidth={2} />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Content & security badges */}
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {share.has_password && (
                                                <span className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-400">
                                                    <Key className="size-2.5" strokeWidth={2} /> Password
                                                </span>
                                            )}
                                            {share.has_otp && (
                                                <span className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-400">
                                                    <RefreshCw className="size-2.5" strokeWidth={2} /> OTP
                                                </span>
                                            )}
                                            {share.password_protected && (
                                                <span className="flex items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/8 px-2 py-0.5 text-[11px] text-amber-400">
                                                    <Lock className="size-2.5" strokeWidth={2} /> Dilindungi
                                                </span>
                                            )}
                                            {share.max_views !== null && (
                                                <span className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${isMaxed ? 'border-red-400/20 bg-red-400/8 text-red-400' : 'border-white/[0.08] bg-white/[0.04] text-zinc-400'}`}>
                                                    <Eye className="size-2.5" strokeWidth={2} /> {share.view_count}/{share.max_views}
                                                </span>
                                            )}
                                            {share.max_views === null && share.view_count > 0 && (
                                                <span className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-400">
                                                    <Eye className="size-2.5" strokeWidth={2} /> {share.view_count}x dilihat
                                                </span>
                                            )}
                                        </div>

                                        {/* Expiry bar */}
                                        <div className="mt-2.5 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className={`flex items-center gap-1 text-[11px] ${expiry.urgent ? 'text-amber-400' : 'text-zinc-600'}`}>
                                                    <Clock className="size-2.5" strokeWidth={2} />
                                                    {expiry.label}
                                                </span>
                                                {share.last_accessed_at && (
                                                    <span className="text-[11px] text-zinc-700">Dibuka {timeAgo(share.last_accessed_at)}</span>
                                                )}
                                            </div>
                                            <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                                                <div
                                                    className={`h-full rounded-full transition-all ${expiry.urgent ? 'bg-amber-400/60' : 'bg-emerald-400/40'}`}
                                                    style={{ width: `${expiry.pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
