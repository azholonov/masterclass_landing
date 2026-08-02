import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  activeGuideStatuses,
  createGuideSession,
  GUIDE_SESSION_COOKIE,
  GUIDE_SESSION_MAX_AGE,
} from "@/lib/guide-auth";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return NextResponse.redirect(new URL("/guide/access-required?reason=invalid", request.url), 303);
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.redirect(new URL("/guide/access-required?reason=unavailable", request.url), 303);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: participant, error } = await supabase
    .from("workshop_registrations")
    .select("id,status")
    .eq("guide_access_token_hash", tokenHash)
    .maybeSingle();

  if (
    error ||
    !participant ||
    !activeGuideStatuses.includes(participant.status as (typeof activeGuideStatuses)[number])
  ) {
    if (error) console.error("Guide access lookup error:", error.code);
    return NextResponse.redirect(new URL("/guide/access-required?reason=invalid", request.url), 303);
  }

  const session = createGuideSession(participant.id, tokenHash);
  if (!session) {
    return NextResponse.redirect(new URL("/guide/access-required?reason=unavailable", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/guide", request.url), 303);
  response.cookies.set(GUIDE_SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUIDE_SESSION_MAX_AGE,
    priority: "high",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
