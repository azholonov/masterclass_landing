import { NextResponse } from "next/server";
import { CRM_SESSION_COOKIE } from "@/lib/crm-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/crm/login", request.url), 303);
  response.cookies.set(CRM_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
    priority: "high",
  });
  return response;
}
