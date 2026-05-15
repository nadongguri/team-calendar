import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team Calendar",
  description: "개인 일정과 프로젝트 일정을 관리하는 팀 캘린더"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
