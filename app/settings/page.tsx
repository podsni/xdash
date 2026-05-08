
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Settings, Key, Trash2, ArrowLeft, Shield, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface User {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Change Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    // Delete Account State
    const [deletePassword, setDeletePassword] = useState('');
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (!res.ok) throw new Error('Failed to fetch user');
            const data = await res.json();
            setUser(data);
        } catch {
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setChangingPassword(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to change password');

            toast.success('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            toast.error('Password is required');
            return;
        }

        setDeletingAccount(true);
        try {
            const res = await fetch('/api/auth/delete-account', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: deletePassword }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete account');

            toast.success('Account deleted successfully');
            router.push('/login');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete account');
        } finally {
            setDeletingAccount(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-[#10110f]">
                <div className="h-10 w-56 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
            </div>
        );
    }

    return (
        <main className="min-h-[100dvh] bg-[#10110f] p-4 text-zinc-100 md:p-8 lg:p-10">
            <div className="mx-auto max-w-3xl space-y-6">
                <header className="flex items-center gap-4 border-b border-white/10 pb-6">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="shrink-0 text-zinc-400 hover:bg-white/10 hover:text-zinc-50">
                            <ArrowLeft className="size-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-emerald-200">
                            <Settings className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Settings</h1>
                            <p className="text-sm text-zinc-500">{user?.email}</p>
                        </div>
                    </div>
                </header>

                {/* Profile Info */}
                <Card className="rounded-lg border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="size-5 text-emerald-200" />
                            <CardTitle className="text-zinc-50">Profile</CardTitle>
                        </div>
                        <CardDescription>Your account information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs text-zinc-500">Email</Label>
                                <p className="mt-1 font-mono text-sm text-zinc-200">{user?.email}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-zinc-500">Role</Label>
                                <p className="mt-1 text-sm capitalize">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user?.role === 'superadmin'
                                            ? 'border border-amber-300/20 bg-amber-300/10 text-amber-200'
                                            : 'border border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                                        }`}>
                                        {user?.role}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Change Password */}
                <Card className="rounded-lg border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Key className="size-5 text-emerald-200" />
                            <CardTitle className="text-zinc-50">Change Password</CardTitle>
                        </div>
                        <CardDescription>Update your account password</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="h-10 border-white/10 bg-white/[0.04]"
                                    required
                                />
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        placeholder="Min 6 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="h-10 border-white/10 bg-white/[0.04]"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                                    <Input
                                        id="confirmNewPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="h-10 border-white/10 bg-white/[0.04]"
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={changingPassword} className="bg-emerald-300 text-zinc-950 hover:bg-emerald-200">
                                {changingPassword ? 'Changing...' : 'Change Password'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="rounded-lg border-red-300/25 bg-red-400/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="size-5 text-red-300" />
                            <CardTitle className="text-red-200">Danger Zone</CardTitle>
                        </div>
                        <CardDescription>Irreversible and destructive actions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="destructive" className="gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Delete Account
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="border-white/10 bg-[#11130f] text-zinc-100 sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-red-500">Delete Account</DialogTitle>
                                    <DialogDescription>
                                        This action cannot be undone. This will permanently delete your account and all your stored credentials.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="deletePassword">Enter your password to confirm</Label>
                                        <Input
                                            id="deletePassword"
                                            type="password"
                                            value={deletePassword}
                                            onChange={(e) => setDeletePassword(e.target.value)}
                                            placeholder="Your current password"
                                            className="h-10 border-white/10 bg-white/[0.04]"
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0">
                                    <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeleteAccount}
                                        disabled={deletingAccount || !deletePassword}
                                    >
                                        {deletingAccount ? 'Deleting...' : 'Delete My Account'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
