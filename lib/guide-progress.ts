export const guideChecklistItemIds = [
  "laptop",
  "space",
  "ai",
  "phone",
  "accounts",
  "doctor",
  "device",
  "hello",
] as const;

export type GuideChecklistItemId = (typeof guideChecklistItemIds)[number];

export function isGuideChecklistItemId(value: unknown): value is GuideChecklistItemId {
  return typeof value === "string" && guideChecklistItemIds.includes(value as GuideChecklistItemId);
}
