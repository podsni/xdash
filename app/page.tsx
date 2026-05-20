
'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetchAccounts, type Account } from '@/lib/api';
import { OtpCard } from '@/components/otp-card';
import { AddAccountDialog } from '@/components/add-account-dialog';
import { ActiveSharesPanel } from '@/components/active-shares-panel';
import { ShieldCheck, LogOut, Settings, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  role: string;
}

export default function Home() {
  const { data: accounts, error, mutate } = useSWR<Account[]>('accounts', fetchAccounts, { refreshInterval: 5000 });
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setUser(data);
      })
      .catch(() => { });
  }, []);

  return (
    <main className="relative min-h-[100dvh] bg-[#0a0b0a] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/10 via-transparent to-transparent" />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-7xl flex-col gap-8 px-4 py-6 md:px-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-white/[0.08] pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-xs font-medium tracking-wide text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
              <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-300/10 text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]">
                <ShieldCheck className="size-4" strokeWidth={2} />
              </span>
              Bitdash Vault
            </div>
            <div>
              <h1 className="text-4xl font-semibold leading-tight tracking-tighter text-zinc-50 md:text-5xl">
                Encrypted credential vault
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
                Store service logins and OTP secrets securely.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AddAccountDialog onAccountAdded={() => mutate()} />
            {user?.role === 'superadmin' && (
              <Link href="/admin">
                <Button variant="outline" size="icon" className="size-11 rounded-lg border-white/[0.12] bg-white/[0.04] text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 hover:border-amber-300/30 hover:bg-white/[0.08] active:scale-[0.98]">
                  <Crown className="size-4" strokeWidth={2} />
                </Button>
              </Link>
            )}
            <Link href="/settings">
              <Button variant="outline" size="icon" className="size-11 rounded-lg border-white/[0.12] bg-white/[0.04] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.98]">
                <Settings className="size-4" strokeWidth={2} />
              </Button>
            </Link>
            <Button variant="outline" size="icon" className="size-11 rounded-lg border-white/[0.12] bg-white/[0.04] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.98]" onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}>
              <LogOut className="size-4" strokeWidth={2} />
            </Button>
          </div>
        </header>

        {user && (
          <div className="flex flex-wrap items-center gap-2.5 text-sm text-zinc-500">
            <span>Signed in as</span>
            <span className="rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 font-mono text-xs text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              {user.email}
            </span>
            {user.role === 'superadmin' && (
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                Superadmin
              </span>
            )}
          </div>
        )}

        <ActiveSharesPanel />

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-300/25 bg-red-400/10 p-4 text-sm text-red-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div>
              <p className="font-medium">Failed to load accounts.</p>
              <p className="mt-1.5 text-red-100/70">Check the database connection and schema, then refresh the vault.</p>
            </div>
          </div>
        )}

        {!accounts && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-52 animate-pulse rounded-xl border border-white/[0.12] bg-white/[0.04]" />
            ))}
          </div>
        )}

        {accounts && accounts.length === 0 && (
          <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/15 to-emerald-300/5 text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]">
                <ShieldCheck className="size-6" strokeWidth={2} />
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-50">Your vault is empty</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                Add a service login, attach an OTP secret, and Bitdash will keep the token ready for quick copy.
              </p>
              <div className="mt-6">
                <AddAccountDialog onAccountAdded={() => mutate()} />
              </div>
            </div>
          </div>
        )}

        {accounts && accounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {accounts.map((account) => (
              <OtpCard key={account.id} account={account} onRefresh={() => mutate()} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
