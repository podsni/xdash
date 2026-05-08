
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createAccount } from '@/lib/api';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export function AddAccountDialog({ onAccountAdded }: { onAccountAdded: () => void }) {
    const [open, setOpen] = useState(false);
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

    const handleAutoFill = async () => {
        if (!formData.website) return toast.error('Please enter a website URL');
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
            await createAccount({ ...formData, otp_secret: cleanSecret });
            toast.success('Account added successfully');
            setFormData({ service_name: '', username: '', password: '', otp_secret: '', website: '', icon: '' });
            setOpen(false);
            onAccountAdded();
        } catch {
            toast.error('Failed to add account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 rounded-md bg-emerald-300 px-5 font-medium text-zinc-950 shadow-none hover:bg-emerald-200 active:scale-[0.98]">
                    <Plus className="size-4" /> New
                </Button>
            </DialogTrigger>
            <DialogContent className="border-white/10 bg-[#11130f] text-zinc-100 shadow-2xl sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Add account</DialogTitle>
                    <DialogDescription>
                        Store credentials and an optional OTP secret for this service.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-5 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="website">Website</Label>
                        <div className="flex gap-2">
                            <Input
                                id="website"
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
                        <p className="text-xs text-zinc-500">Used to fetch a title and service icon.</p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="service">Service</Label>
                        <div className="relative">
                            <Input
                                id="service"
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
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full object-cover bg-white"
                                />
                            )}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="email@example.com"
                            className="h-10 border-white/10 bg-white/[0.04]"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="h-10 border-white/10 bg-white/[0.04]"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="secret">OTP Secret</Label>
                        <Input
                            id="secret"
                            value={formData.otp_secret}
                            onChange={(e) => setFormData({ ...formData, otp_secret: e.target.value })}
                            placeholder="JBSWY3DPEHPK3PXP"
                            className="h-10 border-white/10 bg-white/[0.04] font-mono text-xs"
                        />
                        <p className="text-xs text-zinc-500">Spaces are removed before saving.</p>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="bg-emerald-300 text-zinc-950 hover:bg-emerald-200">
                            {loading ? 'Saving...' : 'Save account'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
