import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Мастерская — учимся делать, а не смотреть",
  description: "Практические мастер-классы по вайбкодингу мобильных приложений и экономике токенов.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
