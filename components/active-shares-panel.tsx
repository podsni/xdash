'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Share2, Copy, Trash2, Clock, Eye, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
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
}

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.shares ?? []);

function timeRemaining(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff < 0) return 'Kedaluwarsa';
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}h lagi`;
    if (h > 0) return `${h}j ${m % 60}m lagi`;
    return `${m}m lagi`;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d} hari lalu`;
    if (h > 0) return `${h} jam lalu`;
    if (m > 0) return `${m} menit lalu`;
    return 'Baru saja';
}

export function ActiveSharesPanel() {
    const { data: shares, mutate } = useSWR<ActiveShare[]>('/api/share', fetcher, { refreshInterval: 10000 });
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    const count = shares?.length ?? 0;

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus share ini? Link tidak bisa diakses lagi.')) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/share/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            toast.success('Share dihapus');
            mutate();
        } catch {
            toast.error('Gagal menghapus share');
        } finally {
            setDeleting(null);
        }
    };

    const copyLink = (id: string) => {
        // Link tanpa encryption key — user harus punya link aslinya
        // Kita copy URL share page saja sebagai referensi
        navigator.clipboard.writeText(`${window.location.origin}/share/${id}`);
        toast.success('URL share disalin (tanpa encryption key)');
    };

    const openLink = (id: string) => {
        window.open(`${window.location.origin}/share/${id}`, '_blank');
    };

    if (!shares || count === 0) return null;

    return (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            {/* Header toggle */}
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
            >
                <div className="flex items-center gap-3">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-400/10">
                        <Share2 className="size-3.5 text-emerald-300" strokeWidth={2} />
                    </div>
                    <span className="text-sm font-medium text-zinc-300">Share Aktif</span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                        {count}
                    </span>
                </div>
                {open ? (
                    <ChevronUp className="size-4 text-zinc-500" strokeWidth={2} />
                ) : (
                    <ChevronDown className="size-4 text-zinc-500" strokeWidth={2} />
                )}
            </button>

            {/* Share list */}
            {open && (
                <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
                    {shares.map((share) => {
                        const isExpiringSoon = new Date(share.expires_at).getTime() - Date.now() < 3600000;
                        const isMaxed = share.max_views !== null && share.view_count >= share.max_views;

                        return (
                            <div key={share.id} className="flex items-center gap-4 px-5 py-3.5">
                                {/* Icon */}
                                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-zinc-900 text-xs font-semibold text-emerald-200">
                                    {share.icon ? (
                                        <Image src={share.icon} alt={share.service_name} width={36} height={36} unoptimized className="size-full object-cover" />
                                    ) : (
                                        share.service_name.charAt(0).toUpperCase()
                                    )}
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-zinc-200 truncate">{share.service_name}</span>
                                        <span className="text-xs text-zinc-600 truncate">{share.username}</span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                                        {/* Expiry badge */}
                                        <span className={`flex items-center gap-1 text-xs ${isExpiringSoon ? 'text-amber-400' : 'text-zinc-500'}`}>
                                            <Clock className="size-3" strokeWidth={2} />
                                            {timeRemaining(share.expires_at)}
                                        </span>
                                        {/* Views badge */}
                                        {share.max_views !== null && (
                                            <span className={`flex items-center gap-1 text-xs ${isMaxed ? 'text-red-400' : 'text-zinc-500'}`}>
                                                <Eye className="size-3" strokeWidth={2} />
                                                {share.view_count}/{share.max_views}
                                            </span>
                                        )}
                                        {share.max_views === null && share.view_count > 0 && (
                                            <span className="flex items-center gap-1 text-xs text-zinc-500">
                                                <Eye className="size-3" strokeWidth={2} />
                                                {share.view_count}x dilihat
                                            </span>
                                        )}
                                        {/* Last accessed */}
                                        {share.last_accessed_at && (
                                            <span className="text-xs text-zinc-600">
                                                · Terakhir {timeAgo(share.last_accessed_at)}
                                            </span>
                                        )}
                                        {/* Created */}
                                        {!share.last_accessed_at && (
                                            <span className="text-xs text-zinc-600">
                                                · Dibuat {timeAgo(share.created_at)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openLink(share.id)}
                                        className="size-8 rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
                                        title="Buka link share"
                                    >
                                        <ExternalLink className="size-3.5" strokeWidth={2} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copyLink(share.id)}
                                        className="size-8 rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
                                        title="Salin URL"
                                    >
                                        <Copy className="size-3.5" strokeWidth={2} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(share.id)}
                                        disabled={deleting === share.id}
                                        className="size-8 rounded-lg text-zinc-500 hover:bg-red-400/10 hover:text-red-300"
                                        title="Hapus share"
                                    >
                                        <Trash2 className="size-3.5" strokeWidth={2} />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
