# Thailand Guide 배포 가이드 (Vercel)

## 1) 필수 환경변수
Vercel Project Settings > Environment Variables에 아래 키를 등록합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SECRET` (강력한 랜덤 문자열)
- `NEXT_PUBLIC_MAPTILER_KEY` (지도를 MapTiler로 사용할 경우)

선택:
- `NEXT_PUBLIC_NIGHTLIFE_PLATFORM_URL`
- `NIGHTLIFE_PLATFORM_URL`
- `ADMIN_WRITE_TOKEN`

## 2) 로컬 사전 점검
```powershell
./scripts/prelaunch-check.ps1 -BaseUrl "http://localhost:3000"
```

## 3) Vercel 배포
CLI가 없다면:
```powershell
npm i -g vercel
```

배포:
```powershell
vercel
vercel --prod
```

## 4) 커스텀 도메인 연결
Vercel 프로젝트에 도메인을 추가한 뒤, DNS 제공업체에서 레코드 설정:

- Apex(root) 도메인: `A` 레코드 `@ -> 76.76.21.21`
- `www` 서브도메인: `CNAME` 레코드 `www -> cname.vercel-dns-0.com`

주의:
- 프로젝트별로 Vercel이 제시하는 값이 다를 수 있으므로 최종값은 Vercel Domain 화면의 안내값 우선.
- DNS 전파에는 시간이 걸릴 수 있습니다.

## 5) 운영 점검
- `/api/health` 응답 확인
- `/admin` 비로그인 접근 시 로그인 리다이렉트 확인
- 장소 등록/동선 등록/리뷰 작성 후 관리자 승인 플로우 확인
