export const workshops = {
  vibecoding: {
    title: "Вайбкодим мобильное приложение",
    date: "15 августа 2026",
    format: "офлайн в Бишкеке",
    capacity: 12,
  },
  "token-economics": {
    title: "Экономика токенов",
    date: "16 августа 2026",
    format: "онлайн",
    capacity: 16,
  },
} as const;

export type WorkshopId = keyof typeof workshops;
export type RegistrationStatus = "new" | "next_run";

export function isWorkshopId(value: string): value is WorkshopId {
  return value in workshops;
}
