# Bangkok Place MVP (0원 시작)

방콕 장소 큐레이션 플랫폼의 최소 기능(MVP) 프로젝트입니다.

## 포함 기능

- 장소 리스트: `/places`
- 장소 상세: `/place/[slug]`
- 지도 탐색: `/map` (MapLibre + OSM)
- 관리자 등록: `/admin/places`

## 1) 로컬 실행

`.env.local` 파일을 만들고 아래 값을 채우세요.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_WRITE_TOKEN=
```

실행:

```bash
npm run dev
```

## 2) Supabase DB 생성

Supabase SQL Editor에서 아래 파일 내용을 실행하세요.

- `supabase/schema.sql`

## 3) 관리자 등록 방식

- `/admin/places`에서 관리자 토큰 + 장소 정보를 입력
- 토큰은 `ADMIN_WRITE_TOKEN`과 일치해야 저장됩니다.

## 4) Vercel 배포

1. GitHub에 push
2. Vercel에서 해당 저장소 import
3. Vercel 환경변수에 `.env.local`과 같은 값 등록
4. 배포 완료 후 URL 확인

## 5) 0원 유지 팁

- 지도는 MapLibre 유지 (Google Places API 미사용)
- 좌표는 초기엔 수동 입력
- 이미지는 압축(WebP/JPG) 후 업로드
- 장소 데이터 20~50개로 시작 후 확장