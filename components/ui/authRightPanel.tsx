"use client";

import { useState, useEffect } from "react";

export default function AuthRightPanel() {
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        // Defer the 3rd-party iframe until the browser is genuinely idle so it
        // never blocks FCP/LCP or inflates Speed Index. Falls back to a 2 s
        // timeout on browsers that don't support requestIdleCallback.
        let id: ReturnType<typeof setTimeout> | number;
        if (typeof window.requestIdleCallback === "function") {
            id = window.requestIdleCallback(() => setShouldLoad(true), { timeout: 2000 });
        } else {
            id = setTimeout(() => setShouldLoad(true), 2000);
        }
        return () => {
            if (typeof window.cancelIdleCallback === "function") {
                window.cancelIdleCallback(id as number);
            } else {
                clearTimeout(id as ReturnType<typeof setTimeout>);
            }
        };
    }, []);

    return (
        <div className="relative flex flex-1 py-4 pr-4 max-md:hidden">
            <div className="relative flex flex-1 flex-col overflow-hidden rounded-[20px] bg-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.07),0_32px_80px_rgba(0,0,0,0.4),-8px_0_40px_rgba(0,0,0,0.2)]">

                <div style={{
                    position: 'absolute',
                    top: '60%',
                    left: '60%',
                    transform: 'translate(-60%, -50%)',
                    width: '50%',
                    height: '50%',
                    zIndex: 0,
                    scale:1.5
                }}>
                    {shouldLoad ? (
                        <iframe
                            src="https://yutaabe.com/"
                            loading="lazy"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                border: 'none',
                            }}
                            title="Interactive Background"
                        />
                    ) : (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: '#000000',
                        }} />
                    )}
                    {/* Fade overlays to hide the iframe's UI text at the edges while keeping the cat visible */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: `
              linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 40%),
              linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 40%),
              linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 30%),
              linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 30%)
            `,
                        pointerEvents: 'none'
                    }} />
                </div>
                {/* Subtle overlay to ensure the text remains legible over the interactive background */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0) 70%, rgba(0, 0, 0, 0.95) 100%)',
                    zIndex: 0,
                    pointerEvents: 'none'
                }} />

                <div className="relative z-10 flex flex-1 min-h-0 flex-col overflow-y-auto px-11 pt-11 pb-10">
                    <div className="shrink-0" style={{ position: "relative", zIndex: 1, marginBottom: "auto" }}>
                        <div style={{ marginBottom: 18 }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fafafa" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 9H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4ZM9 9v6M9 15h6M15 15h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-4ZM15 15V9M15 9H9M15 9V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2" />
                            </svg>
                        </div>
                        <h2 style={{ fontFamily: "var(--font-geist), system-ui, sans-serif", fontSize: 30, fontWeight: 800, color: "#fafafa", letterSpacing: "-0.035em", marginBottom: 8, lineHeight: 1.15 }}>
                            TSK India Buildcon
                        </h2>
                        <p style={{ fontFamily: "var(--font-geist), system-ui, sans-serif", fontSize: 13.5, color: "#a1a1aa", letterSpacing: "0.005em", lineHeight: 1.5, maxWidth: 280 }}>
                            Our AI calling agent — one and only solution for all business.
                        </p>
                    </div>

                    <div style={{ flex: 1, minHeight: 40 }} />

                    <div className="shrink-0" style={{ position: "relative", zIndex: 1, display: "flex", gap: 14 }}>
                        <div className="flex-1 rounded-xl bg-transparent px-5 py-[22px]">
                            <div className="mb-3 flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-white/10">
                                <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="#fafafa" strokeWidth={1.7}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                </svg>
                            </div>
                            <p style={{ fontFamily: "var(--font-geist), system-ui, sans-serif", fontSize: 14, fontWeight: 700, color: "#fafafa", marginBottom: 7, letterSpacing: "-0.01em" }}>
                                Welcome! Ready to expand?
                            </p>
                            <p style={{ fontFamily: "var(--font-geist), system-ui, sans-serif", fontSize: 12.5, color: "#a1a1aa", lineHeight: 1.6 }}>
                                Ready to expand your business with us? Let our AI handle every call while you focus on growth.
                            </p>
                        </div>

                        <div className="flex-1 rounded-xl bg-transparent px-5 py-[22px]">
                            <div className="mb-3 flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-white/10">
                                <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="#fafafa" strokeWidth={1.7}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                </svg>
                            </div>
                            <p style={{ fontFamily: "var(--font-geist), system-ui, sans-serif", fontSize: 14, fontWeight: 700, color: "#fafafa", marginBottom: 7, letterSpacing: "-0.01em" }}>
                                Multi-Tenant & Call Tracking
                            </p>
                            <p style={{ fontFamily: "var(--font-geist), system-ui, sans-serif", fontSize: 12.5, color: "#a1a1aa", lineHeight: 1.6 }}>
                                Expert in handling multi-tenants and track all your call records and leads — all in one dashboard.
                            </p>
                        </div>
                    </div>
                    {/* Spacer to guarantee padding at bottom of scroll */}
                    <div className="shrink-0 h-10" />
                </div>
            </div>
        </div>
    );
}
