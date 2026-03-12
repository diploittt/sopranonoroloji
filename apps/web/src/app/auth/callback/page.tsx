"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthUser } from "@/lib/auth";

const AUTH_TOKEN_KEY = "soprano_auth_token";

function CallbackHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get("token");
        const userStr = searchParams.get("user");

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                // Store JWT
                localStorage.setItem(AUTH_TOKEN_KEY, token);
                // Store user for local auth system
                setAuthUser({
                    userId: user.sub,
                    username: user.displayName || user.username,
                    avatar: user.avatar || `/avatars/neutral_1.png`,
                    isMember: user.isMember ?? true,
                    role: user.role || "member",
                });
                // Redirect to homepage
                router.push("/");
            } catch (e) {
                console.error("Auth callback error:", e);
                router.push("/?error=auth_failed");
            }
        } else {
            router.push("/?error=no_token");
        }
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white font-bold text-lg">Giriş yapılıyor...</p>
                <p className="text-gray-500 text-sm mt-1">Yönlendiriliyorsunuz</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            }
        >
            <CallbackHandler />
        </Suspense>
    );
}
