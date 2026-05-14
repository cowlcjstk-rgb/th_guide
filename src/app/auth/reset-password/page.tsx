"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "@/components/language-provider";

export default function ResetPasswordPage() {
  const { lang } = useLanguage();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [result, setResult] = useState("");
  const [pending, setPending] = useState(false);

  const t =
    lang === "ko"
      ? {
          title: "비밀번호 찾기",
          desc: "가입한 이메일이 확인되면 새 비밀번호로 변경됩니다.",
          submit: "비밀번호 변경",
          pending: "변경 중...",
          ok: "비밀번호가 변경되었습니다.",
          fail: "변경 실패",
        }
      : {
          title: "Reset Password",
          desc: "If the email is registered, password will be changed.",
          submit: "Change Password",
          pending: "Updating...",
          ok: "Password updated.",
          fail: "Update failed",
        };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setResult("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, new_password: newPassword }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setResult(`${t.fail}: ${data?.error ?? "unknown error"}`);
      return;
    }
    setResult(t.ok);
    setNewPassword("");
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.desc}</p>
      </header>
      <form onSubmit={onSubmit} className="panel grid gap-3 p-5">
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={lang === "ko" ? "새 비밀번호 (6자 이상)" : "New password (min 6 chars)"} required />
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? t.pending : t.submit}
        </button>
      </form>
      {result ? <p className="text-sm text-slate-700">{result}</p> : null}
    </section>
  );
}

