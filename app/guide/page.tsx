import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CRM_SESSION_COOKIE, verifyCrmSession } from "@/lib/crm-auth";
import { activeGuideStatuses, GUIDE_SESSION_COOKIE, verifyGuideSession } from "@/lib/guide-auth";
import { isGuideChecklistItemId } from "@/lib/guide-progress";
import { createSupabaseAdmin } from "@/lib/supabase";
import { GuideApp } from "./GuideApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Полевой гид по мобильной разработке — Мастерская",
  description:
    "Подготовка к мастер-классу по Flutter: установка инструментов, основы мобильных приложений, архитектура, разработка и публикация.",
  robots: { index: false, follow: false },
};

export default async function GuidePage() {
  const cookieStore = await cookies();
  const isAdmin = verifyCrmSession(cookieStore.get(CRM_SESSION_COOKIE)?.value);
  if (isAdmin) {
    return <GuideApp viewer={{ role: "admin", name: "Организатор" }} initialCompletedItems={[]} />;
  }

  const guideSession = verifyGuideSession(cookieStore.get(GUIDE_SESSION_COOKIE)?.value);
  if (!guideSession) redirect("/guide/access-required");

  const supabase = createSupabaseAdmin();
  if (!supabase) redirect("/guide/access-required?reason=unavailable");

  const { data: participant, error } = await supabase
    .from("workshop_registrations")
    .select("name,status,guide_access_token_hash,guide_completed_items")
    .eq("id", guideSession.participantId)
    .maybeSingle();

  if (error) {
    console.error("Guide participant load error:", error.code);
    redirect("/guide/access-required?reason=unavailable");
  }
  if (
    !participant ||
    participant.guide_access_token_hash !== guideSession.accessTokenHash ||
    !activeGuideStatuses.includes(participant.status as (typeof activeGuideStatuses)[number])
  ) {
    redirect("/guide/access-required?reason=invalid");
  }

  const completedItems = Array.isArray(participant.guide_completed_items)
    ? participant.guide_completed_items.filter(isGuideChecklistItemId)
    : [];

  return (
    <GuideApp
      viewer={{ role: "participant", name: participant.name }}
      initialCompletedItems={completedItems}
    />
  );
}
