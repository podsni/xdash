'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Eye, EyeOff, Trash2, Edit, Copy, ExternalLink, Share2 } from 'lucide-react';
import { OtpDisplay } from './otp-display';
import { Account, deleteAccount } from '@/lib/api';
import { toast } from 'sonner';
import { EditAccountDialog } from './edit-account-dialog';
import { ShareDialog } from './share-dialog';

interface OtpCardProps {
    account: Account;
    onRefresh: () => void;
}

export const OtpCard = memo(function OtpCard({ account, onRefresh }: OtpCardProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this account?')) return;
        setIsDeleting(true);
        try {
            await deleteAccount(account.id);
            toast.success('Account deleted');
            onRefresh();
        } catch {
            toast.error('Failed to delete');
        } finally {
            setIsDeleting(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    };

    const hostname = account.website ? account.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';

    return (
        <>
            <Card className="group relative w-full overflow-hidden rounded-xl border-white/[0.12] bg-white/[0.04] py-0 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition-all duration-300 hover:border-emerald-300/30 hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.3)]">
                <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg text-zinc-500 transition-all duration-200 hover:bg-white/10 hover:text-zinc-100 active:scale-95" onClick={() => setShareDialogOpen(true)} aria-label={`Share ${account.service_name}`}>
                        <Share2 className="size-3.5" strokeWidth={2} />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg text-zinc-500 transition-all duration-200 hover:bg-white/10 hover:text-zinc-100 active:scale-95" onClick={() => setEditDialogOpen(true)} aria-label={`Edit ${account.service_name}`}>
                        <Edit className="size-3.5" strokeWidth={2} />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg text-zinc-500 transition-all duration-200 hover:bg-red-400/10 hover:text-red-200 active:scale-95" onClick={handleDelete} disabled={isDeleting} aria-label={`Delete ${account.service_name}`}>
                        <Trash2 className="size-3.5" strokeWidth={2} />
                    </Button>
                </div>

                <div className="flex flex-col gap-4 p-5">
                    <div className="flex items-start gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.12] bg-zinc-900 text-base font-semibold text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            {account.icon ? (
                                <Image
                                    src={account.icon}
                                    alt={account.service_name}
                                    width={48}
                                    height={48}
                                    unoptimized
                                    className="size-full object-cover"
                                />
                            ) : (
                                account.service_name.charAt(0).toUpperCase()
                            )}
                        </div>

                        <div className="min-w-0 flex-1 pr-16">
                            <div className="flex min-w-0 items-center gap-2">
                                <h3 className="truncate text-lg font-semibold leading-tight tracking-tight text-zinc-50">
                                    {account.service_name}
                                </h3>
                                {account.website && (
                                    <a
                                        href={account.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 text-zinc-500 transition-colors hover:text-emerald-200"
                                        aria-label={`Open ${account.service_name}`}
                                    >
                                        <ExternalLink className="size-3.5" strokeWidth={2} />
                                    </a>
                                )}
                            </div>
                            <div
                                className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                                onClick={() => copyToClipboard(account.username, 'Username')}
                            >
                                <p className="truncate font-medium">
                                    {account.username}
                                </p>
                                <Copy className="size-3 opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={2} />
                            </div>
                            {hostname && (
                                <p className="mt-1 truncate font-mono text-[11px] text-zinc-600">{hostname}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        {account.otp_secret && <OtpDisplay secret={account.otp_secret} />}
                    </div>
                </div>

                {account.password && (
                    <div className="px-5 pb-5">
                        <div className="group/pass flex items-center justify-between rounded-lg border border-white/[0.12] bg-[#0a0b0a] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 hover:border-white/20">
                            <div className="mr-2 truncate select-all font-mono text-xs text-zinc-600 transition-colors group-hover/pass:text-zinc-400">
                                {showPassword ? account.password : '••••••••••••'}
                            </div>
                            <div className="flex gap-1 opacity-60 transition-opacity group-hover/pass:opacity-100">
                                <Button variant="ghost" size="icon" className="size-7 rounded-lg text-zinc-500 transition-all duration-200 hover:bg-white/10 hover:text-zinc-100 active:scale-95" onClick={() => copyToClipboard(account.password!, 'Password')} aria-label="Copy password">
                                    <Copy className="size-3" strokeWidth={2} />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-7 rounded-lg text-zinc-500 transition-all duration-200 hover:bg-white/10 hover:text-zinc-100 active:scale-95" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                    {showPassword ? <EyeOff className="size-3" strokeWidth={2} /> : <Eye className="size-3" strokeWidth={2} />}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
            <ShareDialog
                account={account}
                open={shareDialogOpen}
                onOpenChange={setShareDialogOpen}
            />
            <EditAccountDialog
                account={account}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onAccountUpdated={onRefresh}
            />
        </>
    );
}, (prev: Readonly<OtpCardProps>, next: Readonly<OtpCardProps>) => {
    // Custom comparison for memo
    return prev.account.id === next.account.id &&
        prev.account.service_name === next.account.service_name &&
        prev.account.username === next.account.username &&
        prev.account.password === next.account.password &&
        prev.account.otp_secret === next.account.otp_secret &&
        prev.account.website === next.account.website &&
        prev.account.icon === next.account.icon;
});
