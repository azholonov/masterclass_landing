export const workshops = {
  "vibecoding-kg": {
    title: "Вайбкодинг менен мобилдик тиркеме жасайбыз",
    date: "2026-жылдын 14-августу",
    format: "кыргыз тилинде, Бишкекте офлайн",
    capacity: 12,
    registrationOpen: false,
  },
  vibecoding: {
    title: "Вайбкодим мобильное приложение",
    date: "15 августа 2026",
    format: "на русском языке, офлайн в Бишкеке",
    capacity: 12,
    registrationOpen: false,
  },
  "token-economics": {
    title: "Экономика токенов",
    date: "16 августа 2026",
    format: "онлайн",
    capacity: 16,
    registrationOpen: false,
  },
} as const;

export type WorkshopId = keyof typeof workshops;
export type RegistrationStatus = "new" | "next_run";

export function isWorkshopId(value: string): value is WorkshopId {
  return value in workshops;
}
