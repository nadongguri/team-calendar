# Team Calendar

Google Calendar 스타일의 팀 일정 관리 앱입니다. Supabase Auth와 DB를 사용해서 웹에 배포한 뒤 여러 사용자가 같은 캘린더를 볼 수 있습니다.

## 기능

- 주/월/일 캘린더 보기
- 개인 일정, 프로젝트 A-D 기본 목록
- 작성자, 제목, 내용 입력
- 일정 클릭 시 상세 내용 확인
- 관리자 모드에서 목록 이름/색상 추가, 수정, 삭제
- Supabase 자동 저장
- JSON 백업 저장/불러오기
- 6개월 이전 일정 클린업

## 로컬 실행

GitHub 저장소: [nadongguri/team-calendar](https://github.com/nadongguri/team-calendar)

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

`.env.local`에는 Supabase 프로젝트 값을 넣어야 로그인과 DB 저장이 동작합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
NEXT_PUBLIC_SHARED_LOGIN_EMAIL=calendar@your-domain.com
```

## Supabase 설정

1. Supabase에서 새 프로젝트를 만듭니다.
2. Project Settings > API에서 Project URL과 publishable/anon key를 복사합니다.
3. SQL Editor에서 [supabase/schema.sql](/Users/nadongguri/Documents/New%20project%203/supabase/schema.sql)를 실행합니다.
4. Authentication > Users에서 공용 로그인 계정을 만듭니다. 예: `calendar@your-domain.com`
5. SQL Editor에서 첫 관리자 이메일을 등록합니다.

```sql
insert into public.calendar_admins(email)
values ('calendar@your-domain.com')
on conflict (email) do nothing;
```

관리자 이메일로 로그인하면 목록 관리, 백업 복원, 초기화, 6개월 클린업을 사용할 수 있습니다. 일반 로그인 사용자는 일정 조회/작성/수정/삭제가 가능합니다.

## Cloudflare Pages 배포

Cloudflare Pages에서 GitHub 저장소 `nadongguri/team-calendar`를 연결합니다.

- Repository: `nadongguri/team-calendar`
- Framework preset: `Next.js`
- Build command: `npm run build`
- Output directory: `out`
- Node.js version: 20 이상
- Deploy command: 비워 둡니다.

이 프로젝트는 `next.config.ts`에서 `output: "export"`를 사용하므로 Cloudflare Pages가 `out` 폴더를 정적 사이트로 배포해야 합니다. `npx wrangler deploy`를 deploy command에 넣거나 Output directory를 `.next`로 두면 OpenNext/Workers 배포로 전환되어 실패할 수 있습니다.

Cloudflare Pages의 Environment variables에 아래 값을 넣습니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
NEXT_PUBLIC_SHARED_LOGIN_EMAIL=calendar@your-domain.com
```

배포 후 Cloudflare Pages 도메인을 Supabase Authentication > URL Configuration에 추가합니다.

- Site URL: Cloudflare Pages 기본 도메인 또는 연결한 커스텀 도메인
- Redirect URLs: 같은 도메인과 필요한 preview 도메인

## 운영 방식

공용 계정 하나로 관리하려면 Supabase Auth에 만든 이메일/비밀번호를 팀에 공유하면 됩니다. 로그인 화면에서 `NEXT_PUBLIC_SHARED_LOGIN_EMAIL`을 설정해 두면 `calendar`라는 짧은 ID로도 로그인할 수 있습니다.

6개월 클린업 전에는 관리자 모드에서 `백업 파일 저장`을 먼저 눌러 JSON 파일을 보관하는 것을 권장합니다.
