"use client";

import { useState } from "react";
import { Member } from "@/lib/types";

export default function AdminMembersPage() {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function searchMembers() {
    setLoading(true);
    setMessage("");
    const url = new URL("/api/admin/members", window.location.origin);
    if (query.trim()) url.searchParams.set("q", query.trim());

    const res = await fetch(url.toString());
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data?.error ?? "Failed to load members");
      return;
    }
    setMembers(data.members ?? []);
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">회원 관리</h1>
        <p className="mt-2 text-sm text-slate-600">
          이름, 전화번호, 이메일, 카카오/라인/텔레그램 아이디로 회원을 검색할 수 있습니다.
        </p>
      </header>

      <div className="panel p-5">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input
            className="input"
            placeholder="검색어 (이름/전화/이메일/아이디)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn-primary" onClick={searchMembers} disabled={loading}>
            {loading ? "Searching..." : "회원 검색"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-rose-600">{message}</p> : null}
      </div>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          검색 결과 ({members.length})
        </h2>
        <div className="mt-3 space-y-2">
          {members.map((member) => (
            <article key={member.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">{member.name}</p>
              <p className="mt-1 text-xs text-slate-500">아이디: {member.login_id || "-"}</p>
              <p className="mt-1 text-xs text-slate-600">
                {member.phone} · {member.email}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Kakao: {member.kakao_id || "-"} · LINE: {member.line_id || "-"} · Telegram: {member.telegram_id || "-"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                가입일: {new Date(member.created_at).toLocaleString()}
              </p>
            </article>
          ))}
          {!members.length ? <p className="text-sm text-slate-500">조회된 회원이 없습니다.</p> : null}
        </div>
      </section>
    </section>
  );
}
