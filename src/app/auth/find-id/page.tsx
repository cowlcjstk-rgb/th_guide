"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "@/components/language-provider";

export default function FindIdPage() {
  const { lang } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState("");
  const [pending, setPending] = useState(false);

  const t =
    lang === "ko"
      ? {
          title: "아이디 찾기",
          desc: "이름 + 전화번호로 가입 이메일을 찾습니다.",
          submit: "아이디 찾기",
          pending: "조회 중...",
          fail: "일치하는 정보가 없습니다.",
        }
      : {
          title: "Find ID",
          desc: "Find your registered email by name and phone.",
          submit: "Find ID",
          pending: "Searching...",
          fail: "No matching account found.",
        };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setResult("");
    const res = await fetch("/api/auth/find-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setResult(t.fail);
      return;
    }
    setResult(`ID: ${data.email}`);
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.desc}</p>
      </header>
      <form onSubmit={onSubmit} className="panel grid gap-3 p-5">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "ko" ? "이름" : "Name"} required />
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={lang === "ko" ? "전화번호" : "Phone"} required />
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? t.pending : t.submit}
        </button>
      </form>
      {result ? <p className="text-sm text-slate-700">{result}</p> : null}
    </section>
  );
}

