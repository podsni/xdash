'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Activity,
    ArrowLeft,
    Copy,
    Crown,
    Database,
    Edit,
    ExternalLink,
    Eye,
    KeyRound,
    Plus,
    Search,
    Settings as SettingsIcon,
    ShieldCheck,
    Trash2,
    User,
    Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface UserData {
    id: string;
    email: string;
    role: string;
    account_count: number;
    created_at: string;
    updated_at: string;
}

interface AdminAccount {
    id: string;
    user_id: string;
    service_name: string;
    username: string;
    website: string;
    icon: string;
    has_password: boolean;
    has_otp_secret: boolean;
    created_at: string;
    updated_at: string;
}

interface AuditLog {
    id: string;
    action: string;
    metadata: Record<string, unknown>;
    created_at: string;
    actor_email: string | null;
    target_email: string | null;
    target_service_name: string | null;
}

const emptyAccountForm = {
    service_name: '',
    username: '',
    website: '',
    icon: '',
    password: '',
    otp_secret: '',
};

export default function AdminPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<UserData | null>(null);
    const [users, setUsers] = useState<UserData[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [accounts, setAccounts] = useState<AdminAccount[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [accountsLoading, setAccountsLoading] = useState(false);
    const [auditLoading, setAuditLoading] = useState(false);
    const [registrationEnabled, setRegistrationEnabled] = useState(true);
    const [query, setQuery] = useState('');
    const [userScope, setUserScope] = useState<'all' | 'superadmin' | 'users' | 'with_vault' | 'empty'>('all');
    const [auditScope, setAuditScope] = useState<'all' | 'reveal' | 'manage' | 'users' | 'settings'>('all');

    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [userForm, setUserForm] = useState({ email: '', password: '', role: 'user' });
    const [savingUser, setSavingUser] = useState(false);

    const [accountDialogOpen, setAccountDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
    const [accountForm, setAccountForm] = useState(emptyAccountForm);
    const [savingAccount, setSavingAccount] = useState(false);

    const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
    const [revealingKey, setRevealingKey] = useState('');

    const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

    const filteredUsers = useMemo(() => {
        const term = query.trim().toLowerCase();
        return users.filter((user) => {
            const matchesSearch = !term || user.email.toLowerCase().includes(term) || user.role.toLowerCase().includes(term);
            const matchesScope =
                userScope === 'all' ||
                (userScope === 'superadmin' && user.role === 'superadmin') ||
                (userScope === 'users' && user.role === 'user') ||
                (userScope === 'with_vault' && user.account_count > 0) ||
                (userScope === 'empty' && user.account_count === 0);

            return matchesSearch && matchesScope;
        });
    }, [query, userScope, users]);

    const totalAccounts = users.reduce((sum, user) => sum + user.account_count, 0);
    const revealEvents = auditLogs.filter((log) => log.action === 'admin_secret_reveal').length;
    const manageEvents = auditLogs.filter((log) => ['admin_account_update', 'admin_account_delete'].includes(log.action)).length;
    const userEvents = auditLogs.filter((log) => log.action.startsWith('admin_user_')).length;
    const latestAudit = auditLogs[0];
    const filteredAuditLogs = useMemo(() => {
        return auditLogs.filter((log) => {
            if (auditScope === 'reveal') return log.action === 'admin_secret_reveal';
            if (auditScope === 'manage') return ['admin_account_update', 'admin_account_delete'].includes(log.action);
            if (auditScope === 'users') return log.action.startsWith('admin_user_');
            if (auditScope === 'settings') return log.action === 'admin_registration_update';
            return true;
        });
    }, [auditLogs, auditScope]);

    const fetchAuditLogs = useCallback(async () => {
        setAuditLoading(true);
        try {
            const res = await fetch('/api/admin/audit-logs', { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch audit logs');
            setAuditLogs(await res.json());
        } catch {
            toast.error('Failed to load audit log');
        } finally {
            setAuditLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        const res = await fetch('/api/admin/users', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch users');
        const data: UserData[] = await res.json();
        setUsers(data);
        setSelectedUserId((current) => {
            if (current && data.some((user) => user.id === current)) return current;
            return data[0]?.id ?? '';
        });
        return data;
    }, []);

    const fetchSettings = useCallback(async () => {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            setRegistrationEnabled(data.registration_enabled !== false);
        }
    }, []);

    const fetchAccounts = useCallback(async (userId: string) => {
        if (!userId) {
            setAccounts([]);
            return;
        }

        setAccountsLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}/accounts`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch accounts');
            setAccounts(await res.json());
            setRevealedSecrets({});
        } catch {
            toast.error('Failed to load user vault');
        } finally {
            setAccountsLoading(false);
        }
    }, []);

    const checkAdminAndFetch = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me', { cache: 'no-store' });
            if (!res.ok) {
                router.push('/login');
                return;
            }

            const user = await res.json();
            if (user.role !== 'superadmin') {
                toast.error('Access denied');
                router.push('/');
                return;
            }

            setCurrentUser(user);
            await Promise.all([fetchUsers(), fetchSettings(), fetchAuditLogs()]);
        } catch {
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }, [fetchAuditLogs, fetchSettings, fetchUsers, router]);

    useEffect(() => {
        checkAdminAndFetch();
    }, [checkAdminAndFetch]);

    useEffect(() => {
        fetchAccounts(selectedUserId);
    }, [fetchAccounts, selectedUserId]);

    const refreshAdminData = async () => {
        await Promise.all([fetchUsers(), fetchAuditLogs()]);
        if (selectedUserId) await fetchAccounts(selectedUserId);
    };

    const toggleRegistration = async (enabled: boolean) => {
        setRegistrationEnabled(enabled);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registration_enabled: enabled }),
            });
            if (!res.ok) throw new Error('Failed to update settings');
            toast.success(`Registration ${enabled ? 'enabled' : 'disabled'}`);
            await fetchAuditLogs();
        } catch {
            toast.error('Failed to update settings');
            setRegistrationEnabled(!enabled);
        }
    };

    const handleOpenCreateUser = () => {
        setEditingUser(null);
        setUserForm({ email: '', password: '', role: 'user' });
        setUserDialogOpen(true);
    };

    const handleOpenEditUser = (user: UserData) => {
        setEditingUser(user);
        setUserForm({ email: user.email, password: '', role: user.role });
        setUserDialogOpen(true);
    };

    const handleUserSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSavingUser(true);

        try {
            const payload: { email: string; role: string; password?: string } = {
                email: userForm.email,
                role: userForm.role,
            };
            if (!editingUser || userForm.password) payload.password = userForm.password;

            const res = await fetch(editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users', {
                method: editingUser ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save user');

            toast.success(editingUser ? 'User updated' : 'User created');
            setUserDialogOpen(false);
            await refreshAdminData();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to save user');
        } finally {
            setSavingUser(false);
        }
    };

    const handleDeleteUser = async (user: UserData) => {
        if (user.id === currentUser?.id) {
            toast.error('Cannot delete your own account');
            return;
        }

        if (!confirm(`Delete ${user.email} and all stored vault items? This is audited and cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete user');

            toast.success('User deleted');
            await refreshAdminData();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete user');
        }
    };

    const handleOpenEditAccount = (account: AdminAccount) => {
        setEditingAccount(account);
        setAccountForm({
            service_name: account.service_name,
            username: account.username,
            website: account.website,
            icon: account.icon,
            password: '',
            otp_secret: '',
        });
        setAccountDialogOpen(true);
    };

    const handleAccountSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editingAccount) return;

        setSavingAccount(true);
        try {
            const payload: Record<string, string> = {
                service_name: accountForm.service_name,
                username: accountForm.username,
                website: accountForm.website,
                icon: accountForm.icon,
            };
            if (accountForm.password) payload.password = accountForm.password;
            if (accountForm.otp_secret) payload.otp_secret = accountForm.otp_secret.replace(/\s/g, '');

            const res = await fetch(`/api/admin/accounts/${editingAccount.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update account');

            toast.success('Vault item updated');
            setAccountDialogOpen(false);
            await refreshAdminData();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to update account');
        } finally {
            setSavingAccount(false);
        }
    };

    const handleDeleteAccount = async (account: AdminAccount) => {
        if (!confirm(`Delete ${account.service_name} from ${selectedUser?.email}? This is audited and cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/admin/accounts/${account.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete account');

            toast.success('Vault item deleted');
            await refreshAdminData();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete account');
        }
    };

    const revealSecret = async (account: AdminAccount, field: 'password' | 'otp_secret') => {
        const label = field === 'password' ? 'password' : 'OTP secret';
        if (!confirm(`Reveal ${label} for ${account.service_name}? This action will be written to the audit log.`)) return;

        const secretKey = `${account.id}:${field}`;
        setRevealingKey(secretKey);
        try {
            const res = await fetch(`/api/admin/accounts/${account.id}/reveal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reveal secret');

            setRevealedSecrets((current) => ({ ...current, [secretKey]: data.value || '' }));
            toast.success(`${label} revealed`);
            await fetchAuditLogs();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to reveal secret');
        } finally {
            setRevealingKey('');
        }
    };

    const copyToClipboard = async (value: string, label: string) => {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
    };

    if (loading) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-[#10110f]">
                <div className="h-10 w-56 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
            </div>
        );
    }

    return (
        <main className="relative min-h-[100dvh] bg-[#0a0b0a] p-4 text-zinc-100 md:p-8 lg:p-10">
            <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/10 via-transparent to-transparent" />
            <div className="relative z-10 mx-auto max-w-7xl space-y-6">
                <header className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 md:flex-row md:items-end">
                    <div className="flex items-start gap-4">
                        <Button asChild variant="ghost" size="icon" className="size-11 shrink-0 rounded-lg text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-zinc-50 active:scale-95">
                            <Link href="/" aria-label="Back to vault">
                                <ArrowLeft className="size-5" strokeWidth={2} />
                            </Link>
                        </Button>
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-medium text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                                <Crown className="size-4" strokeWidth={2} />
                                Superadmin console
                            </div>
                            <div>
                                <h1 className="text-4xl font-semibold tracking-tighter text-zinc-50 md:text-5xl">Vault oversight</h1>
                                <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
                                    Inspect users, manage stored credentials, and reveal secrets only through audited actions.
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleOpenCreateUser} className="h-11 gap-2 rounded-lg bg-emerald-400 px-5 font-medium text-zinc-950 shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_4px_12px_rgba(52,211,153,0.3)] transition-all duration-200 hover:bg-emerald-300 hover:shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_6px_16px_rgba(52,211,153,0.4)] active:scale-[0.98]">
                        <Plus className="size-4" strokeWidth={2} />
                        Add User
                    </Button>
                </header>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Metric icon={<Users className="size-4" strokeWidth={2} />} label="Users" value={users.length} />
                    <Metric icon={<Database className="size-4" strokeWidth={2} />} label="Stored items" value={totalAccounts} />
                    <Metric icon={<Activity className="size-4" strokeWidth={2} />} label="Audit events" value={auditLogs.length} />
                    <Metric icon={<Eye className="size-4" strokeWidth={2} />} label="Reveals" value={revealEvents} />
                </section>

                <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <Card className="rounded-xl border-white/[0.12] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2.5">
                                <Activity className="size-5 text-emerald-200" strokeWidth={2} />
                                <CardTitle className="text-zinc-50">Risk signal</CardTitle>
                            </div>
                            <CardDescription>Operational summary from the latest audit trail</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-lg border border-white/[0.12] bg-[#0a0b0a] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Secret reveals</p>
                                <p className="mt-3 font-mono text-3xl font-semibold text-zinc-50">{revealEvents}</p>
                            </div>
                            <div className="rounded-lg border border-white/[0.12] bg-[#0a0b0a] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Vault changes</p>
                                <p className="mt-3 font-mono text-3xl font-semibold text-zinc-50">{manageEvents}</p>
                            </div>
                            <div className="rounded-lg border border-white/[0.12] bg-[#0a0b0a] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">User changes</p>
                                <p className="mt-3 font-mono text-3xl font-semibold text-zinc-50">{userEvents}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-xl border-white/[0.12] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-zinc-50">Latest admin action</CardTitle>
                            <CardDescription>{latestAudit ? new Date(latestAudit.created_at).toLocaleString() : 'No audit events yet'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {latestAudit ? (
                                <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                                    <p className="text-sm font-semibold text-amber-100">{formatAction(latestAudit.action)}</p>
                                    <p className="mt-2 text-xs leading-relaxed text-amber-100/70">
                                        {latestAudit.actor_email ?? 'Unknown admin'} / {latestAudit.target_email ?? 'system'}{latestAudit.target_service_name ? ` / ${latestAudit.target_service_name}` : ''}
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-6 text-center text-sm text-zinc-500">Sensitive actions will appear here.</div>
                            )}
                        </CardContent>
                    </Card>
                </section>

                <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
                    <aside className="space-y-4">
                        <Card className="rounded-xl border-white/[0.12] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
                            <CardHeader>
                                <div className="flex items-center gap-2.5">
                                    <SettingsIcon className="size-5 text-emerald-200" strokeWidth={2} />
                                    <CardTitle className="text-zinc-50">Global Settings</CardTitle>
                                </div>
                                <CardDescription>Registration and access controls</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between rounded-lg border border-white/[0.12] bg-[#0a0b0a] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-medium">User Registration</Label>
                                        <p className="text-sm text-zinc-500">Allow new users to sign up</p>
                                    </div>
                                    <Switch checked={registrationEnabled} onCheckedChange={toggleRegistration} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl border-white/[0.12] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-zinc-50">Users</CardTitle>
                                        <CardDescription>Select a vault owner</CardDescription>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
                                    <Input
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Search users"
                                        className="h-11 rounded-lg border-white/[0.12] bg-white/[0.06] pl-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] focus-visible:border-emerald-300/50 focus-visible:ring-2 focus-visible:ring-emerald-300/20"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        ['all', 'All'],
                                        ['superadmin', 'Admins'],
                                        ['users', 'Users'],
                                        ['with_vault', 'With vault'],
                                        ['empty', 'Empty'],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setUserScope(value as typeof userScope)}
                                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${userScope === value
                                                ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                                                : 'border-white/[0.12] bg-white/[0.04] text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/20 hover:text-zinc-100'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {filteredUsers.map((user) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => setSelectedUserId(user.id)}
                                        className={`w-full rounded-lg border p-3 text-left transition-all duration-200 active:scale-[0.99] ${selectedUserId === user.id
                                            ? 'border-emerald-300/30 bg-emerald-300/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                                            : 'border-white/[0.12] bg-[#0a0b0a] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/20 hover:bg-white/[0.04]'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-zinc-100">{user.email}</p>
                                                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                                                    <span className={`rounded-full px-2.5 py-0.5 font-medium ${user.role === 'superadmin'
                                                        ? 'bg-amber-300/10 text-amber-200'
                                                        : 'bg-emerald-300/10 text-emerald-200'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                    <span>{user.account_count} items</span>
                                                </div>
                                            </div>
                                            {user.role === 'superadmin' ? <Crown className="size-4 shrink-0 text-amber-200" /> : <User className="size-4 shrink-0 text-zinc-500" />}
                                        </div>
                                    </button>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">No users found</div>
                                )}
                            </CardContent>
                        </Card>
                    </aside>

                    <div className="space-y-6">
                        <Card className="rounded-lg border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                            <CardHeader>
                                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="size-5 text-emerald-200" />
                                            <CardTitle className="text-zinc-50">{selectedUser?.email ?? 'No user selected'}</CardTitle>
                                        </div>
                                        <CardDescription>Stored services and audited secret access</CardDescription>
                                    </div>
                                    {selectedUser && (
                                        <div className="flex flex-wrap gap-2">
                                            <Button variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]" onClick={() => handleOpenEditUser(selectedUser)}>
                                                <Edit className="size-4" />
                                                Edit User
                                            </Button>
                                            <Button variant="outline" className="border-red-300/20 bg-red-400/5 text-red-200 hover:bg-red-400/10" onClick={() => handleDeleteUser(selectedUser)} disabled={selectedUser.id === currentUser?.id}>
                                                <Trash2 className="size-4" />
                                                Delete User
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {accountsLoading && (
                                    <div className="grid gap-3">
                                        {[1, 2, 3].map((item) => (
                                            <div key={item} className="h-28 animate-pulse rounded-lg border border-white/10 bg-white/[0.03]" />
                                        ))}
                                    </div>
                                )}

                                {!accountsLoading && accounts.map((account) => (
                                    <div key={account.id} className="rounded-lg border border-white/10 bg-[#0d0f0c] p-4">
                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                            <div className="flex min-w-0 gap-3">
                                                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-zinc-900 text-sm font-semibold text-emerald-100">
                                                    {account.icon ? (
                                                        <Image src={account.icon} alt={account.service_name} width={44} height={44} unoptimized className="size-full object-cover" />
                                                    ) : (
                                                        account.service_name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <h3 className="truncate text-base font-semibold text-zinc-50">{account.service_name}</h3>
                                                        {account.website && (
                                                            <a href={account.website} target="_blank" rel="noreferrer" className="shrink-0 text-zinc-500 hover:text-emerald-200" aria-label={`Open ${account.service_name}`}>
                                                                <ExternalLink className="size-3.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 truncate text-sm text-zinc-500">{account.username || 'No username'}</p>
                                                    <p className="mt-1 font-mono text-[11px] text-zinc-600">{new Date(account.updated_at).toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <SecretButton
                                                    disabled={!account.has_password}
                                                    loading={revealingKey === `${account.id}:password`}
                                                    revealedValue={revealedSecrets[`${account.id}:password`]}
                                                    label="Password"
                                                    onReveal={() => revealSecret(account, 'password')}
                                                    onCopy={(value) => copyToClipboard(value, 'Password')}
                                                />
                                                <SecretButton
                                                    disabled={!account.has_otp_secret}
                                                    loading={revealingKey === `${account.id}:otp_secret`}
                                                    revealedValue={revealedSecrets[`${account.id}:otp_secret`]}
                                                    label="OTP"
                                                    onReveal={() => revealSecret(account, 'otp_secret')}
                                                    onCopy={(value) => copyToClipboard(value, 'OTP secret')}
                                                />
                                                <Button variant="ghost" size="icon" className="size-9 text-zinc-400 hover:bg-white/10 hover:text-zinc-50" onClick={() => handleOpenEditAccount(account)} aria-label={`Edit ${account.service_name}`}>
                                                    <Edit className="size-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="size-9 text-red-300 hover:bg-red-400/10 hover:text-red-200" onClick={() => handleDeleteAccount(account)} aria-label={`Delete ${account.service_name}`}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {!accountsLoading && selectedUser && accounts.length === 0 && (
                                    <div className="rounded-lg border border-dashed border-white/10 p-10 text-center">
                                        <KeyRound className="mx-auto size-8 text-zinc-600" />
                                        <p className="mt-3 text-sm text-zinc-500">This user has not stored any vault items.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-lg border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                            <CardHeader>
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Activity className="size-5 text-emerald-200" />
                                            <CardTitle className="text-zinc-50">Audit Log</CardTitle>
                                        </div>
                                        <CardDescription>Latest sensitive superadmin actions</CardDescription>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            ['all', 'All'],
                                            ['reveal', 'Reveals'],
                                            ['manage', 'Vault'],
                                            ['users', 'Users'],
                                            ['settings', 'Settings'],
                                        ].map(([value, label]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setAuditScope(value as typeof auditScope)}
                                                className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${auditScope === value
                                                    ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
                                                    : 'border-white/10 bg-white/[0.03] text-zinc-500 hover:text-zinc-100'
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {auditLoading && <div className="h-20 animate-pulse rounded-lg border border-white/10 bg-white/[0.03]" />}
                                {!auditLoading && filteredAuditLogs.slice(0, 12).map((log) => (
                                    <div key={log.id} className="rounded-lg border border-white/10 bg-[#0d0f0c] p-3">
                                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                            <p className="text-sm font-medium text-zinc-200">{formatAction(log.action)}</p>
                                            <p className="font-mono text-[11px] text-zinc-600">{new Date(log.created_at).toLocaleString()}</p>
                                        </div>
                                        <p className="mt-1 text-xs text-zinc-500">
                                            {log.actor_email ?? 'Unknown admin'} / {log.target_email ?? 'system'}{log.target_service_name ? ` / ${log.target_service_name}` : ''}
                                        </p>
                                    </div>
                                ))}
                                {!auditLoading && filteredAuditLogs.length === 0 && (
                                    <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">No audit events for this filter</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </div>

            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogContent className="border-white/10 bg-[#11130f] text-zinc-100 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
                        <DialogDescription>{editingUser ? 'Update user details and role.' : 'Add a new vault user.'}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUserSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="userEmail">Email</Label>
                                <Input id="userEmail" type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} className="h-10 border-white/10 bg-white/[0.04]" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="userPassword">{editingUser ? 'New Password' : 'Password'}</Label>
                                <Input id="userPassword" type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} placeholder={editingUser ? 'Leave empty to keep current' : 'Min 6 characters'} className="h-10 border-white/10 bg-white/[0.04]" required={!editingUser} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="userRole">Role</Label>
                                <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                                    <SelectTrigger className="border-white/10 bg-white/[0.04]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="superadmin">Superadmin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setUserDialogOpen(false)} className="text-zinc-300 hover:bg-white/10 hover:text-zinc-50">Cancel</Button>
                            <Button type="submit" disabled={savingUser} className="bg-emerald-300 text-zinc-950 hover:bg-emerald-200">{savingUser ? 'Saving...' : 'Save user'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
                <DialogContent className="border-white/10 bg-[#11130f] text-zinc-100 sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Edit vault item</DialogTitle>
                        <DialogDescription>Changes to another user&apos;s vault are written to the audit log.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAccountSubmit} className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="accountService">Service</Label>
                            <Input id="accountService" value={accountForm.service_name} onChange={(event) => setAccountForm({ ...accountForm, service_name: event.target.value })} className="h-10 border-white/10 bg-white/[0.04]" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="accountUsername">Username</Label>
                            <Input id="accountUsername" value={accountForm.username} onChange={(event) => setAccountForm({ ...accountForm, username: event.target.value })} className="h-10 border-white/10 bg-white/[0.04]" />
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="accountWebsite">Website</Label>
                                <Input id="accountWebsite" value={accountForm.website} onChange={(event) => setAccountForm({ ...accountForm, website: event.target.value })} className="h-10 border-white/10 bg-white/[0.04]" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="accountIcon">Icon URL</Label>
                                <Input id="accountIcon" value={accountForm.icon} onChange={(event) => setAccountForm({ ...accountForm, icon: event.target.value })} className="h-10 border-white/10 bg-white/[0.04]" />
                            </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="accountPassword">New Password</Label>
                                <Input id="accountPassword" type="password" value={accountForm.password} onChange={(event) => setAccountForm({ ...accountForm, password: event.target.value })} placeholder="Leave empty to keep current" className="h-10 border-white/10 bg-white/[0.04]" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="accountOtp">New OTP Secret</Label>
                                <Input id="accountOtp" value={accountForm.otp_secret} onChange={(event) => setAccountForm({ ...accountForm, otp_secret: event.target.value })} placeholder="Leave empty to keep current" className="h-10 border-white/10 bg-white/[0.04] font-mono text-xs" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setAccountDialogOpen(false)} className="text-zinc-300 hover:bg-white/10 hover:text-zinc-50">Cancel</Button>
                            <Button type="submit" disabled={savingAccount} className="bg-emerald-300 text-zinc-950 hover:bg-emerald-200">{savingAccount ? 'Saving...' : 'Save item'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </main>
    );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                {icon}
                {label}
            </div>
            <p className="mt-3 font-mono text-3xl text-zinc-50">{value}</p>
        </div>
    );
}

function SecretButton({
    disabled,
    loading,
    revealedValue,
    label,
    onReveal,
    onCopy,
}: {
    disabled: boolean;
    loading: boolean;
    revealedValue?: string;
    label: string;
    onReveal: () => void;
    onCopy: (value: string) => void;
}) {
    if (revealedValue !== undefined) {
        return (
            <div className="flex max-w-full items-center gap-1 rounded-md border border-amber-300/20 bg-amber-300/10 px-2 py-1">
                <span className="max-w-[180px] truncate font-mono text-xs text-amber-100">{revealedValue || 'Empty'}</span>
                {revealedValue && (
                    <Button type="button" variant="ghost" size="icon" className="size-7 text-amber-100 hover:bg-white/10" onClick={() => onCopy(revealedValue)} aria-label={`Copy ${label}`}>
                        <Copy className="size-3.5" />
                    </Button>
                )}
            </div>
        );
    }

    return (
        <Button
            type="button"
            variant="outline"
            disabled={disabled || loading}
            onClick={onReveal}
            className="h-9 border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08] hover:text-zinc-50"
        >
            <Eye className="size-4" />
            {loading ? 'Revealing...' : label}
        </Button>
    );
}

function formatAction(action: string) {
    return action
        .replace(/^admin_/, '')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
