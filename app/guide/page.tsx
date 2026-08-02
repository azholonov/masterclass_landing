import type { Metadata } from "next";
import { GuideApp } from "./GuideApp";

export const metadata: Metadata = {
  title: "Полевой гид по мобильной разработке — Мастерская",
  description:
    "Подготовка к мастер-классу по Flutter: установка инструментов, основы мобильных приложений, архитектура, разработка и публикация.",
};

export default function GuidePage() {
  return <GuideApp />;
}
