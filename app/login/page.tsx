
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [registrationEnabled, setRegistrationEnabled] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/settings', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => setRegistrationEnabled(data.registration_enabled !== false))
            .catch(() => { });
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) throw new Error('Invalid credentials');

            router.push('/');
            toast.success('Welcome back!');
        } catch {
            toast.error('Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="relative grid min-h-[100dvh] bg-[#0a0b0a] text-zinc-100 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-950/20 via-transparent to-transparent" />

            <section className="relative z-10 flex min-h-[42dvh] flex-col justify-between border-b border-white/[0.08] p-6 md:p-12 lg:min-h-[100dvh] lg:border-b-0 lg:border-r lg:p-16">
                <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-xs font-medium tracking-wide text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition-all duration-300 hover:border-emerald-300/30 hover:bg-white/[0.06]">
                    <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-300/10 text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]">
                        <ShieldCheck className="size-4" strokeWidth={2} />
                    </span>
                    Bitdash Vault
                </div>

                <div className="max-w-2xl space-y-6">
                    <h1 className="text-5xl font-semibold leading-[1.05] tracking-tighter text-zinc-50 md:text-7xl">
                        Credentials stay encrypted until you need them.
                    </h1>
                    <p className="max-w-xl text-lg leading-relaxed text-zinc-400">
                        Sign in to manage OTP secrets, passwords, and service metadata from one private workspace.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-white/[0.15] to-transparent" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                        AES-256 storage / httpOnly sessions
                    </p>
                    <div className="h-px flex-1 bg-gradient-to-l from-white/[0.15] to-transparent" />
                </div>
            </section>

            <section className="relative z-10 flex items-center justify-center p-6 md:p-10">
                <Card className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-white/[0.04] py-8 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                    <CardHeader className="space-y-4 px-8">
                        <div className="flex size-14 items-center justify-center rounded-xl border border-white/[0.12] bg-gradient-to-br from-emerald-400/15 to-emerald-300/5 text-emerald-200 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]">
                            <ShieldCheck className="size-6" strokeWidth={2} />
                        </div>
                        <div className="space-y-1.5">
                            <CardTitle className="text-3xl font-semibold tracking-tight text-zinc-50">
                                Sign in
                            </CardTitle>
                            <CardDescription className="text-base text-zinc-400">
                                Access your secure vault.
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="px-8">
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2.5">
                                <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
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
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11 rounded-lg border-white/[0.12] bg-white/[0.06] text-zinc-100 focus-visible:border-emerald-300/50 focus-visible:ring-2 focus-visible:ring-emerald-300/20"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-11 w-full rounded-lg bg-emerald-400 font-medium text-zinc-950 shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_4px_12px_rgba(52,211,153,0.3)] transition-all duration-200 hover:bg-emerald-300 hover:shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_6px_16px_rgba(52,211,153,0.4)] active:scale-[0.98] active:shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_2px_8px_rgba(52,211,153,0.2)] disabled:opacity-60 disabled:hover:bg-emerald-400 disabled:active:scale-100"
                                disabled={loading}
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </Button>
                        </form>

                        {registrationEnabled && (
                            <div className="mt-8 text-center">
                                <Link
                                    href="/register"
                                    className="group inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-100"
                                >
                                    Don&apos;t have an account? Create one
                                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}
