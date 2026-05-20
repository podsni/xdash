'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Share2, Copy, Clock, Eye, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { generateEncryptionKey, encryptData, generateShareId } from '@/lib/encryption';
import type { Account } from '@/lib/api';

interface ShareDialogProps {
    account: Account;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type ExpirationUnit = 'hours' | 'days' | 'months';

const EXPIRATION_PRESETS: { label: string; value: number; unit: ExpirationUnit }[] = [
    { label: '1 Jam', value: 1, unit: 'hours' },
    { label: '6 Jam', value: 6, unit: 'hours' },
    { label: '1 Hari', value: 1, unit: 'days' },
    { label: '7 Hari', value: 7, unit: 'days' },
    { label: '1 Bulan', value: 1, unit: 'months' },
    { label: 'Custom', value: 0, unit: 'hours' },
];

function toSeconds(value: number, unit: ExpirationUnit): number {
    if (unit === 'hours') return value * 3600;
    if (unit === 'days') return value * 86400;
    return value * 30 * 86400; // months
}

function formatExpiration(value: number, unit: ExpirationUnit): string {
    if (unit === 'hours') return `${value} jam`;
    if (unit === 'days') return `${value} hari`;
    return `${value} bulan`;
}

export function ShareDialog({ account, open, onOpenChange }: ShareDialogProps) {
    const [loading, setLoading] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [sharePassword, setSharePassword] = useState('');

    // Expiration
    const [presetIndex, setPresetIndex] = useState(2); // default: 1 Hari
    const [customValue, setCustomValue] = useState('24');
    const [customUnit, setCustomUnit] = useState<ExpirationUnit>('hours');

    // Content
    const [includePassword, setIncludePassword] = useState(true);
    const [includeOtp, setIncludeOtp] = useState(true);

    // Security
    const [limitViews, setLimitViews] = useState(false);
    const [maxViews, setMaxViews] = useState('1');
    const [passwordProtect, setPasswordProtect] = useState(false);
    const [password, setPassword] = useState('');

    const isCustom = presetIndex === EXPIRATION_PRESETS.length - 1;

    const getExpiresIn = (): number => {
        if (isCustom) {
            const v = parseInt(customValue) || 1;
            return toSeconds(v, customUnit);
        }
        const p = EXPIRATION_PRESETS[presetIndex];
        return toSeconds(p.value, p.unit);
    };

    const getExpirationLabel = (): string => {
        if (isCustom) {
            const v = parseInt(customValue) || 1;
            return formatExpiration(v, customUnit);
        }
        return EXPIRATION_PRESETS[presetIndex].label;
    };

    const handleCreateShare = async () => {
        if (passwordProtect && !password) {
            toast.error('Masukkan password terlebih dahulu');
            return;
        }
        if (!includePassword && !includeOtp) {
            toast.error('Pilih minimal satu item untuk dibagikan');
            return;
        }
        if (limitViews && (parseInt(maxViews) < 1 || isNaN(parseInt(maxViews)))) {
            toast.error('Jumlah maksimal view harus minimal 1');
            return;
        }

        setLoading(true);
        try {
            const encryptionKey = await generateEncryptionKey();
            const dataToShare: Record<string, string> = {};
            if (includePassword && account.password) dataToShare.password = account.password;
            if (includeOtp && account.otp_secret) dataToShare.otp_secret = account.otp_secret;

            const encryptedData = await encryptData(JSON.stringify(dataToShare), encryptionKey);
            const shareId = generateShareId();
            const expiresIn = getExpiresIn();

            let passwordHash = null;
            if (passwordProtect && password) {
                const bcrypt = await import('bcryptjs');
                passwordHash = await bcrypt.hash(password, 10);
                setSharePassword(password);
            }

            const res = await fetch('/api/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shareId,
                    accountId: account.id,
                    encryptedData,
                    passwordHash,
                    expiresIn,
                    maxViews: limitViews ? parseInt(maxViews) : null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Gagal membuat share');
            }

            const link = `${window.location.origin}/share/${shareId}#${encryptionKey}`;
            setShareLink(link);
            // Simpan full link (dengan key) ke localStorage agar bisa dicopy dari panel
            try {
                const stored = JSON.parse(localStorage.getItem('share_links') || '{}');
                stored[shareId] = link;
                localStorage.setItem('share_links', JSON.stringify(stored));
            } catch { /* ignore */ }
            toast.success('Link share berhasil dibuat!');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal membuat share');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} disalin`);
    };

    const handleClose = () => {
        setShareLink('');
        setSharePassword('');
        setPresetIndex(2);
        setCustomValue('24');
        setCustomUnit('hours');
        setIncludePassword(true);
        setIncludeOtp(true);
        setLimitViews(false);
        setMaxViews('1');
        setPasswordProtect(false);
        setPassword('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md rounded-2xl border-white/[0.10] bg-[#0d0e0d] p-0 text-zinc-100 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                <DialogHeader className="border-b border-white/[0.08] px-6 py-5">
                    <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-400/10">
                            <Share2 className="size-4 text-emerald-300" strokeWidth={2} />
                        </div>
                        Bagikan: {account.service_name}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-zinc-500">
                        Buat link terenkripsi untuk berbagi kredensial
                    </DialogDescription>
                </DialogHeader>

                {!shareLink ? (
                    <div className="space-y-0 divide-y divide-white/[0.06]">
                        {/* What to share */}
                        {(account.password || account.otp_secret) && (
                            <div className="px-6 py-4">
                                <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                                    <Eye className="size-3.5" /> Apa yang dibagikan
                                </p>
                                <div className="space-y-2">
                                    {account.password && (
                                        <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                                            <span className="text-sm text-zinc-300">Password</span>
                                            <Switch checked={includePassword} onCheckedChange={setIncludePassword} />
                                        </div>
                                    )}
                                    {account.otp_secret && (
                                        <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                                            <span className="text-sm text-zinc-300">OTP Secret</span>
                                            <Switch checked={includeOtp} onCheckedChange={setIncludeOtp} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Expiration */}
                        <div className="px-6 py-4">
                            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                                <Clock className="size-3.5" /> Kedaluwarsa
                            </p>
                            <div className="grid grid-cols-3 gap-1.5">
                                {EXPIRATION_PRESETS.map((preset, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setPresetIndex(i)}
                                        className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                                            presetIndex === i
                                                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                                                : 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            {isCustom && (
                                <div className="mt-3 flex gap-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        value={customValue}
                                        onChange={(e) => setCustomValue(e.target.value)}
                                        className="h-9 rounded-lg border-white/[0.10] bg-white/[0.05] text-sm"
                                    />
                                    <Select value={customUnit} onValueChange={(v) => setCustomUnit(v as ExpirationUnit)}>
                                        <SelectTrigger className="h-9 w-32 rounded-lg border-white/[0.10] bg-white/[0.05] text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-white/[0.10] bg-[#141514]">
                                            <SelectItem value="hours">Jam</SelectItem>
                                            <SelectItem value="days">Hari</SelectItem>
                                            <SelectItem value="months">Bulan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Security */}
                        <div className="px-6 py-4">
                            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                                <Shield className="size-3.5" /> Keamanan
                            </p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                                    <div>
                                        <p className="text-sm text-zinc-300">Batasi jumlah view</p>
                                        <p className="text-xs text-zinc-600">Nonaktif = tidak terbatas</p>
                                    </div>
                                    <Switch checked={limitViews} onCheckedChange={setLimitViews} />
                                </div>
                                {limitViews && (
                                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                                        <span className="flex-1 text-sm text-zinc-400">Maksimal view</span>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={maxViews}
                                            onChange={(e) => setMaxViews(e.target.value)}
                                            className="h-8 w-20 rounded-lg border-white/[0.10] bg-white/[0.06] text-center text-sm"
                                        />
                                    </div>
                                )}
                                <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                                    <div>
                                        <p className="text-sm text-zinc-300">Proteksi password</p>
                                        <p className="text-xs text-zinc-600">Lapisan keamanan tambahan</p>
                                    </div>
                                    <Switch checked={passwordProtect} onCheckedChange={setPasswordProtect} />
                                </div>
                                {passwordProtect && (
                                    <Input
                                        type="text"
                                        placeholder="Masukkan password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-9 rounded-xl border-white/[0.10] bg-white/[0.05] text-sm"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 px-6 py-4">
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                className="flex-1 rounded-xl border-white/[0.10] bg-white/[0.04] text-sm hover:bg-white/[0.08]"
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleCreateShare}
                                disabled={loading}
                                className="flex-1 rounded-xl bg-emerald-400 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"
                            >
                                {loading ? 'Membuat...' : 'Buat Link'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-0 divide-y divide-white/[0.06]">
                        <div className="px-6 py-4">
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3">
                                <div className="size-2 rounded-full bg-emerald-400" />
                                <p className="text-sm font-medium text-emerald-200">Link share berhasil dibuat</p>
                            </div>
                            <p className="mt-2 text-xs text-zinc-500">
                                Penerima <span className="text-zinc-400 font-medium">tidak perlu akun</span> — cukup buka link dan masukkan password (jika ada).
                            </p>
                        </div>

                        <div className="space-y-2 px-6 py-4">
                            <Label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Link Share</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={shareLink}
                                    readOnly
                                    className="h-9 rounded-xl border-white/[0.10] bg-white/[0.05] font-mono text-xs"
                                />
                                <Button
                                    size="icon"
                                    onClick={() => copyToClipboard(shareLink, 'Link')}
                                    className="size-9 shrink-0 rounded-xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                                    title="Salin link"
                                >
                                    <Copy className="size-3.5" strokeWidth={2} />
                                </Button>
                            </div>
                            {/* Native share / WhatsApp */}
                            <div className="flex gap-2 pt-1">
                                {typeof navigator !== 'undefined' && 'share' in navigator && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const text = sharePassword
                                                ? `Link: ${shareLink}\nPassword: ${sharePassword}`
                                                : shareLink;
                                            navigator.share({ title: `Kredensial ${account.service_name}`, text });
                                        }}
                                        className="flex-1 h-8 rounded-lg border-white/[0.10] bg-white/[0.04] text-xs hover:bg-white/[0.08]"
                                    >
                                        Kirim via...
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const text = sharePassword
                                            ? `${shareLink}\n\nPassword: ${sharePassword}`
                                            : shareLink;
                                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                    }}
                                    className="flex-1 h-8 rounded-lg border-white/[0.10] bg-white/[0.04] text-xs hover:bg-white/[0.08]"
                                >
                                    WhatsApp
                                </Button>
                            </div>
                        </div>

                        {sharePassword && (
                            <div className="space-y-3 px-6 py-4">
                                <Label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Password</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={sharePassword}
                                        readOnly
                                        className="h-9 rounded-xl border-white/[0.10] bg-white/[0.05] font-mono text-sm"
                                    />
                                    <Button
                                        size="icon"
                                        onClick={() => copyToClipboard(sharePassword, 'Password')}
                                        className="size-9 shrink-0 rounded-xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                                    >
                                        <Copy className="size-3.5" strokeWidth={2} />
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="px-6 py-4">
                            <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 p-4 text-xs text-amber-200/80">
                                <p className="mb-2 font-semibold text-amber-200">Informasi Share</p>
                                <ul className="space-y-1">
                                    <li>• Kedaluwarsa dalam {getExpirationLabel()}</li>
                                    {limitViews && <li>• Maksimal {maxViews} kali dilihat</li>}
                                    {sharePassword && <li>• Dilindungi password</li>}
                                    <li>• Terenkripsi end-to-end</li>
                                </ul>
                            </div>
                        </div>

                        <div className="px-6 py-4">
                            <Button
                                onClick={handleClose}
                                className="w-full rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.10]"
                            >
                                Tutup
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
