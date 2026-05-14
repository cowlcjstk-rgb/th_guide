import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at 20% 20%, #dbeafe 0, #e2e8f0 45%, #f8fafc 100%)",
          padding: "64px",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            border: "1px solid #94a3b8",
            borderRadius: 9999,
            padding: "10px 20px",
            width: "auto",
            display: "flex",
            background: "#ffffffcc",
            alignSelf: "flex-start",
          }}
        >
          Thailand Traveler Community
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.1 }}>
            태국 여행자 커뮤니티
          </div>
          <div style={{ marginTop: 20, fontSize: 32, color: "#334155" }}>
            장소 탐색 · 지도 동선 · 커뮤니티 리뷰
          </div>
        </div>
      </div>
    ),
    size
  );
}
