"use client";

import { FormEvent, useState } from "react";

export default function SignupPage() {
  const [loginId, setLoginId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kakaoId, setKakaoId] = useState("");
  const [lineId, setLineId] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setResult("");

    const res = await fetch("/api/members/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login_id: loginId,
        name,
        phone,
        email,
        password,
        kakao_id: kakaoId,
        line_id: lineId,
        telegram_id: telegramId,
      }),
    });
    const data = await res.json();
    setPending(false);

    if (!res.ok) {
      if (data?.error === "duplicate login_id") {
        setResult("이미 사용 중인 로그인 아이디입니다.");
        return;
      }
      if (data?.error === "duplicate phone") {
        setResult("이미 등록된 전화번호입니다.");
        return;
      }
      if (data?.error === "duplicate email") {
        setResult("이미 등록된 이메일입니다.");
        return;
      }
      setResult(`가입 실패: ${data?.error ?? "unknown error"}`);
      return;
    }

    setLoginId("");
    setName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setKakaoId("");
    setLineId("");
    setTelegramId("");
    setResult("회원가입이 완료되었습니다.");
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">회원가입</h1>
        <p className="mt-2 text-sm text-slate-600">필수 정보를 입력해 계정을 생성하세요.</p>
      </header>

      <form onSubmit={onSubmit} className="panel grid gap-3 p-5 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-slate-500">로그인 아이디 (필수)</p>
          <input className="input" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="예) travel_user01" required minLength={4} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">이름 (필수)</p>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 홍길동" required />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">전화번호 (필수)</p>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="예) 010-1234-5678" required />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">이메일 (필수)</p>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="예) hello@example.com" required />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">비밀번호 (필수, 6자 이상)</p>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">카카오톡 아이디 (선택)</p>
          <input className="input" value={kakaoId} onChange={(e) => setKakaoId(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">라인 아이디 (선택)</p>
          <input className="input" value={lineId} onChange={(e) => setLineId(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-slate-500">텔레그램 아이디 (선택)</p>
          <input className="input" value={telegramId} onChange={(e) => setTelegramId(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary md:col-span-2" disabled={pending}>
          {pending ? "가입 처리 중..." : "가입하기"}
        </button>
      </form>

      {result ? <p className="text-sm text-slate-700">{result}</p> : null}
    </section>
  );
}

