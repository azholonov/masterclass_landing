import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Мастерская — учимся делать, а не смотреть",
  description: "Практический мастер-класс по вайбкодингу мобильных приложений на кыргызском и русском языках в Бишкеке.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
