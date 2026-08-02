import { NextResponse } from "next/server";
import { GUIDE_SESSION_COOKIE } from "@/lib/guide-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/guide/access-required", request.url), 303);
  response.cookies.set(GUIDE_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    priority: "high",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
