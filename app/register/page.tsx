
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserPlus, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/settings', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => setRegistrationEnabled(data.registration_enabled !== false))
            .catch(() => setRegistrationEnabled(true));
    }, []);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, confirmPassword }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Registration failed');

            toast.success('Account created successfully! Please login.');
            router.push('/login');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    if (registrationEnabled === false) {
        return (
            <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#0a0b0a] p-6 text-zinc-100">
                <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-transparent to-transparent" />
                <Card className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.12] bg-white/[0.04] py-8 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                    <CardHeader className="space-y-4 px-8 text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.06] text-zinc-400">
                            <Lock className="size-6" strokeWidth={2} />
                        </div>
                        <div className="space-y-1.5">
                            <CardTitle className="text-2xl font-semibold tracking-tight text-zinc-50">
                                Registration Closed
                            </CardTitle>
                            <CardDescription className="text-base text-zinc-400">
                                New user registration is currently disabled.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 text-center">
                        <Link href="/login">
                            <Button className="h-11 w-full rounded-lg border-white/[0.12] bg-white/[0.06] font-medium text-zinc-100 transition-all duration-200 hover:bg-white/[0.1] active:scale-[0.98]" variant="outline">
                                Back to Login
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (registrationEnabled === null) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0b0a]">
                <div className="h-12 w-64 animate-pulse rounded-xl border border-white/[0.12] bg-white/[0.04]" />
            </div>
        );
    }

    return (
        <main className="relative grid min-h-[100dvh] bg-[#0a0b0a] text-zinc-100 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-950/20 via-transparent to-transparent" />

            <section className="relative z-10 flex items-center justify-center p-6 md:p-10">
                <Card className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-white/[0.04] py-8 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                    <CardHeader className="space-y-4 px-8">
                        <div className="flex size-14 items-center justify-center rounded-xl border border-white/[0.12] bg-gradient-to-br from-emerald-400/15 to-emerald-300/5 text-emerald-200 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]">
                            <UserPlus className="size-6" strokeWidth={2} />
                        </div>
                        <div className="space-y-1.5">
                            <CardTitle className="text-3xl font-semibold tracking-tight text-zinc-50">
                                Create account
                            </CardTitle>
                            <CardDescription className="text-base text-zinc-400">
                                Start a private Bitdash vault.
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="px-8">
                        <form onSubmit={handleRegister} className="space-y-5">
                            <div className="space-y-2.5">
                                <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11 rounded-lg border-white/[0.12] bg-white/[0.06] text-zinc-100 placeholder:text-zinc-600 focus-visible:border-emerald-300/50 focus-visible:ring-2 focus-visible:ring-emerald-300/20"
                                    required
                                />
                            </div>

                            <div className="space-y-2.5">
                                <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Min 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11 rounded-lg border-white/[0.12] bg-white/[0.06] text-zinc-100 placeholder:text-zinc-600 focus-visible:border-emerald-300/50 focus-visible:ring-2 focus-visible:ring-emerald-300/20"
                                    required
                                />
                            </div>

                            <div className="space-y-2.5">
                                <Label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
                                    Confirm Password
                                </Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Repeat password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="h-11 rounded-lg border-white/[0.12] bg-white/[0.06] text-zinc-100 placeholder:text-zinc-600 focus-visible:border-emerald-300/50 focus-visible:ring-2 focus-visible:ring-emerald-300/20"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-11 w-full rounded-lg bg-emerald-400 font-medium text-zinc-950 shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_4px_12px_rgba(52,211,153,0.3)] transition-all duration-200 hover:bg-emerald-300 hover:shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_6px_16px_rgba(52,211,153,0.4)] active:scale-[0.98] active:shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_2px_8px_rgba(52,211,153,0.2)] disabled:opacity-60 disabled:hover:bg-emerald-400 disabled:active:scale-100"
                                disabled={loading}
                            >
                                {loading ? 'Creating account...' : 'Create account'}
                            </Button>
                        </form>

                        <div className="mt-8 text-center">
                            <Link
                                href="/login"
                                className="group inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-100"
                            >
                                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                                Already have an account? Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className="relative z-10 hidden flex-col justify-between border-l border-white/[0.08] p-12 lg:flex lg:p-16">
                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.15]" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                        First setup keeps registration open
                    </p>
                </div>

                <div className="max-w-2xl self-end space-y-6 text-right">
                    <h1 className="text-5xl font-semibold leading-[1.05] tracking-tighter text-zinc-50 md:text-6xl">
                        Register first, then promote your admin in Neon.
                    </h1>
                    <p className="ml-auto max-w-xl text-lg leading-relaxed text-zinc-400">
                        Once the first operator is promoted to superadmin, registration can be disabled from the admin panel.
                    </p>
                </div>
            </section>
        </main>
    );
}
