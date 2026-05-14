"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const { refresh } = useAuth();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_id: loginId, password }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setMessage(`로그인 실패: ${data?.error ?? "unknown error"}`);
      return;
    }
    await refresh();
    router.push("/");
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">로그인</h1>
      </header>

      <form onSubmit={onSubmit} className="panel grid gap-3 p-5">
        <input
          className="input"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          placeholder="로그인 아이디"
          required
        />
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          required
        />
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "로그인 중..." : "로그인"}
        </button>
      </form>

      {message ? <p className="text-sm text-rose-600">{message}</p> : null}
    </section>
  );
}

