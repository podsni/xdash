
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateAccount, Account } from '@/lib/api';
import { toast } from 'sonner';

interface EditAccountDialogProps {
    account: Account;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAccountUpdated: () => void;
}

export function EditAccountDialog({ account, open, onOpenChange, onAccountUpdated }: EditAccountDialogProps) {
    const [loading, setLoading] = useState(false);
    const [loadingMeta, setLoadingMeta] = useState(false);

    const [formData, setFormData] = useState({
        service_name: '',
        username: '',
        password: '',
        otp_secret: '',
        website: '',
        icon: ''
    });

    useEffect(() => {
        if (account && open) {
            setFormData({
                service_name: account.service_name || '',
                username: account.username || '',
                password: account.password || '',
                otp_secret: account.otp_secret || '',
                website: account.website || '',
                icon: account.icon || ''
            });
        }
    }, [account, open]);

    const handleAutoFill = async () => {
        if (!formData.website) return; // Don't error on blur, just skip
        setLoadingMeta(true);
        try {
            const res = await fetch(`/api/metadata?url=${encodeURIComponent(formData.website)}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setFormData(prev => ({
                ...prev,
                service_name: data.title || prev.service_name,
                icon: data.icon || prev.icon
            }));
            toast.success('Metadata fetched!');
        } catch {
            toast.error('Failed to fetch metadata');
        } finally {
            setLoadingMeta(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Clean secret key (remove spaces)
            const cleanSecret = formData.otp_secret.replace(/\s/g, '');
            await updateAccount(account.id, { ...formData, otp_secret: cleanSecret });
            toast.success('Account updated successfully');
            onOpenChange(false);
            onAccountUpdated();
        } catch {
            toast.error('Failed to update account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-white/10 bg-[#11130f] text-zinc-100 shadow-2xl sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Edit account</DialogTitle>
                    <DialogDescription>
                        Update service metadata, credentials, and OTP settings.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-5 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-website">Website</Label>
                        <div className="flex gap-2">
                            <Input
                                id="edit-website"
                                value={formData.website || ''}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                onBlur={handleAutoFill}
                                placeholder="https://example.com"
                                className="h-10 flex-1 border-white/10 bg-white/[0.04]"
                            />
                            <Button type="button" variant="secondary" onClick={handleAutoFill} disabled={loadingMeta} className="h-10 shrink-0 border border-white/10 bg-white/[0.06] text-xs text-zinc-100 hover:bg-white/[0.1]">
                                {loadingMeta ? 'Fetching...' : 'Auto-fill'}
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-service">Service</Label>
                        <div className="relative">
                            <Input
                                id="edit-service"
                                value={formData.service_name}
                                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                                placeholder="GitHub, Stripe, Work email"
                                className={`h-10 border-white/10 bg-white/[0.04] ${formData.icon ? "pl-10" : ""}`}
                                required
                            />
                            {formData.icon && (
                                <Image
                                    src={formData.icon}
                                    alt="icon"
                                    width={20}
                                    height={20}
                                    unoptimized
                                    className="absolute left-3 top-1/2 size-5 -translate-y-1/2 rounded-full bg-white object-cover"
                                />
                            )}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-username">Username</Label>
                        <Input
                            id="edit-username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="email@example.com"
                            className="h-10 border-white/10 bg-white/[0.04]"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-password">Password</Label>
                        <Input
                            id="edit-password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="h-10 border-white/10 bg-white/[0.04]"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-secret">OTP Secret</Label>
                        <Input
                            id="edit-secret"
                            value={formData.otp_secret}
                            onChange={(e) => setFormData({ ...formData, otp_secret: e.target.value })}
                            placeholder="JBSWY3DPEHPK3PXP"
                            className="h-10 border-white/10 bg-white/[0.04] font-mono text-xs"
                        />
                        <p className="text-xs text-zinc-500">Spaces are removed before saving.</p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-300 hover:bg-white/10 hover:text-zinc-50">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-emerald-300 text-zinc-950 hover:bg-emerald-200">
                            {loading ? 'Saving...' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
