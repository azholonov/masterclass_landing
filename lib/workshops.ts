export const workshops = {
  vibecoding: {
    title: "Вайбкодим мобильное приложение",
    date: "15 августа 2026",
    format: "офлайн в Бишкеке",
  },
  "token-economics": {
    title: "Экономика токенов",
    date: "16 августа 2026",
    format: "онлайн",
  },
} as const;

export type WorkshopId = keyof typeof workshops;

export function isWorkshopId(value: string): value is WorkshopId {
  return value in workshops;
}
