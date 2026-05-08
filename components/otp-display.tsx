
'use client';

import { useEffect, useState } from 'react';
import { authenticator } from 'otplib';
import { toast } from 'sonner';

export function OtpDisplay({ secret }: { secret: string }) {
    const [token, setToken] = useState('');
    const [nextToken, setNextToken] = useState('');
    const [timeLeft, setTimeLeft] = useState(30);

    useEffect(() => {
        if (!secret) return;

        // Create independent instance for next token by inheriting from global authenticator
        const nextAuth = Object.create(authenticator);
        // Shift epoch by -30 seconds to simulate "future" time relative to standard epoch
        nextAuth.options = { ...authenticator.allOptions(), epoch: -30 };

        const update = () => {
            try {
                const current = authenticator.generate(secret);
                setToken(current);

                const next = nextAuth.generate(secret);
                setNextToken(next);

                setTimeLeft(authenticator.timeRemaining());
            } catch (e) {
                console.error("Invalid secret", e);
                setToken('INVALID');
            }
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [secret]);

    const copyToClipboard = (text: string) => {
        if (!text || text === 'INVALID') return;
        navigator.clipboard.writeText(text);
        toast.success('OTP copied');
    };

    if (!secret) return <div className="text-sm text-zinc-500">No OTP secret</div>;

    // Radius for SVG circle
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (timeLeft / 30) * circumference;

    return (
        <div className="relative flex h-[72px] w-full">
            <div className="flex flex-1 items-end pb-1">
                <div
                    className="group/main-token cursor-pointer"
                    onClick={() => copyToClipboard(token)}
                >
                    <div className="select-none whitespace-nowrap font-mono text-3xl font-semibold tracking-wider text-zinc-50 tabular-nums md:text-4xl">
                        {token === 'INVALID' ? 'INVALID' : `${token.substring(0, 3)} ${token.substring(3)}`}
                    </div>
                </div>
            </div>

            <div className="flex h-full min-w-[80px] flex-col items-end justify-between">
                <div className="relative flex size-10 shrink-0 items-center justify-center">
                    <svg className="transform -rotate-90 w-full h-full">
                        <circle
                            className="text-white/10"
                            strokeWidth="3"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="20"
                            cy="20"
                        />
                        <circle
                            className={`${timeLeft < 5 ? 'text-red-300' : 'text-emerald-300'} transition-colors duration-300`}
                            strokeWidth="3"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="20"
                            cy="20"
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                    </svg>
                    <span className="absolute select-none font-mono text-[10px] font-semibold text-zinc-400">
                        {timeLeft}
                    </span>
                </div>

                <div className="flex cursor-pointer flex-col items-end opacity-60 transition-opacity hover:opacity-100" onClick={() => copyToClipboard(nextToken)}>
                    <span className="mb-[-2px] text-[9px] uppercase tracking-[0.18em] text-zinc-500">Next</span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-zinc-300">
                        {nextToken.substring(0, 3)} {nextToken.substring(3)}
                    </span>
                </div>
            </div>
        </div>
    );
}
