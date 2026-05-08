'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Share2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { generateEncryptionKey, encryptData, generateShareId } from '@/lib/encryption';
import type { Account } from '@/lib/api';

interface ShareDialogProps {
    account: Account;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type ExpirationOption = '1h' | '1d' | '7d' | 'custom';

export function ShareDialog({ account, open, onOpenChange }: ShareDialogProps) {
    const [loading, setLoading] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [sharePassword, setSharePassword] = useState('');

    const [expiration, setExpiration] = useState<ExpirationOption>('1d');
    const [customHours, setCustomHours] = useState('24');
    const [includePassword, setIncludePassword] = useState(true);
    const [includeOtp, setIncludeOtp] = useState(true);
    const [oneTimeView, setOneTimeView] = useState(true);
    const [passwordProtect, setPasswordProtect] = useState(false);
    const [password, setPassword] = useState('');

    const handleCreateShare = async () => {
        if (passwordProtect && !password) {
            toast.error('Please enter a password');
            return;
        }

        if (!includePassword && !includeOtp) {
            toast.error('Please select at least one item to share');
            return;
        }

        setLoading(true);
        try {
            // Generate encryption key
            const encryptionKey = await generateEncryptionKey();

            // Prepare data to encrypt
            const dataToShare: Record<string, string> = {};
            if (includePassword && account.password) {
                dataToShare.password = account.password;
            }
            if (includeOtp && account.otp_secret) {
                dataToShare.otp_secret = account.otp_secret;
            }

            // Encrypt data
            const encryptedData = await encryptData(JSON.stringify(dataToShare), encryptionKey);

            // Generate share ID
            const shareId = generateShareId();

            // Calculate expiration in seconds
            let expiresIn: number;
            if (expiration === '1h') {
                expiresIn = 3600;
            } else if (expiration === '1d') {
                expiresIn = 86400;
            } else if (expiration === '7d') {
                expiresIn = 604800;
            } else {
                expiresIn = parseInt(customHours) * 3600;
            }

            // Hash password if protection enabled
            let passwordHash = null;
            if (passwordProtect && password) {
                const bcrypt = await import('bcryptjs');
                passwordHash = await bcrypt.hash(password, 10);
                setSharePassword(password);
            }

            // Create share via API
            const res = await fetch('/api/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shareId,
                    accountId: account.id,
                    encryptedData,
                    passwordHash,
                    expiresIn,
                    maxViews: oneTimeView ? 1 : null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create share');
            }

            // Generate share link with encryption key in fragment
            const baseUrl = window.location.origin;
            const link = `${baseUrl}/share/${shareId}#${encryptionKey}`;
            setShareLink(link);

            toast.success('Share link created!');
        } catch (error) {
            console.error('Share creation error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create share');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const handleClose = () => {
        setShareLink('');
        setSharePassword('');
        setExpiration('1d');
        setCustomHours('24');
        setIncludePassword(true);
        setIncludeOtp(true);
        setOneTimeView(true);
        setPasswordProtect(false);
        setPassword('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md rounded-xl border-white/[0.12] bg-[#0a0b0a] text-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Share2 className="size-5 text-emerald-200" strokeWidth={2} />
                        Share: {account.service_name}
                    </DialogTitle>
                    <DialogDescription>
                        Create a secure, encrypted share link
                    </DialogDescription>
                </DialogHeader>

                {!shareLink ? (
                    <div className="space-y-5">
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-zinc-300">What to share</Label>
                            <div className="space-y-2">
                                {account.password && (
                                    <div className="flex items-center justify-between rounded-lg border border-white/[0.12] bg-white/[0.04] p-3">
                                        <Label htmlFor="include-password" className="text-sm">Password</Label>
                                        <Switch
                                            id="include-password"
                                            checked={includePassword}
                                            onCheckedChange={setIncludePassword}
                                        />
                                    </div>
                                )}
                                {account.otp_secret && (
                                    <div className="flex items-center justify-between rounded-lg border border-white/[0.12] bg-white/[0.04] p-3">
                                        <Label htmlFor="include-otp" className="text-sm">OTP Secret</Label>
                                        <Switch
                                            id="include-otp"
                                            checked={includeOtp}
                                            onCheckedChange={setIncludeOtp}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-zinc-300">Expiration</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    ['1h', '1 Hour'],
                                    ['1d', '1 Day'],
                                    ['7d', '7 Days'],
                                    ['custom', 'Custom'],
                                ].map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setExpiration(value as ExpirationOption)}
                                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 ${
                                            expiration === value
                                                ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
                                                : 'border-white/[0.12] bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:text-zinc-100'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {expiration === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        max="168"
                                        value={customHours}
                                        onChange={(e) => setCustomHours(e.target.value)}
                                        className="h-10 rounded-lg border-white/[0.12] bg-white/[0.06]"
                                    />
                                    <span className="text-sm text-zinc-400">hours</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-zinc-300">Security options</Label>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between rounded-lg border border-white/[0.12] bg-white/[0.04] p-3">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="one-time" className="text-sm">One-time view</Label>
                                        <p className="text-xs text-zinc-500">Burn after reading</p>
                                    </div>
                                    <Switch
                                        id="one-time"
                                        checked={oneTimeView}
                                        onCheckedChange={setOneTimeView}
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-white/[0.12] bg-white/[0.04] p-3">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="password-protect" className="text-sm">Password protect</Label>
                                        <p className="text-xs text-zinc-500">Extra security layer</p>
                                    </div>
                                    <Switch
                                        id="password-protect"
                                        checked={passwordProtect}
                                        onCheckedChange={setPasswordProtect}
                                    />
                                </div>
                            </div>
                            {passwordProtect && (
                                <Input
                                    type="text"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-10 rounded-lg border-white/[0.12] bg-white/[0.06]"
                                />
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                className="flex-1 rounded-lg border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08]"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateShare}
                                disabled={loading}
                                className="flex-1 rounded-lg bg-emerald-400 font-medium text-zinc-950 hover:bg-emerald-300"
                            >
                                {loading ? 'Creating...' : 'Generate Link'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-4">
                            <p className="text-sm font-semibold text-emerald-100">✓ Share link created!</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-zinc-300">Share Link</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={shareLink}
                                    readOnly
                                    className="h-10 rounded-lg border-white/[0.12] bg-white/[0.06] font-mono text-xs"
                                />
                                <Button
                                    size="icon"
                                    onClick={() => copyToClipboard(shareLink, 'Link')}
                                    className="size-10 shrink-0 rounded-lg bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                                >
                                    <Copy className="size-4" strokeWidth={2} />
                                </Button>
                            </div>
                        </div>

                        {sharePassword && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-zinc-300">Password</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={sharePassword}
                                        readOnly
                                        className="h-10 rounded-lg border-white/[0.12] bg-white/[0.06] font-mono"
                                    />
                                    <Button
                                        size="icon"
                                        onClick={() => copyToClipboard(sharePassword, 'Password')}
                                        className="size-10 shrink-0 rounded-lg bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                                    >
                                        <Copy className="size-4" strokeWidth={2} />
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
                            <p className="font-semibold">⚠️ Important:</p>
                            <ul className="mt-2 space-y-1 text-xs text-amber-100/80">
                                <li>• Link expires in {expiration === '1h' ? '1 hour' : expiration === '1d' ? '1 day' : expiration === '7d' ? '7 days' : `${customHours} hours`}</li>
                                {oneTimeView && <li>• Can only be viewed once</li>}
                                {sharePassword && <li>• Password required to access</li>}
                                <li>• End-to-end encrypted</li>
                            </ul>
                        </div>

                        <Button
                            onClick={handleClose}
                            className="w-full rounded-lg bg-white/[0.08] hover:bg-white/[0.12]"
                        >
                            Close
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
