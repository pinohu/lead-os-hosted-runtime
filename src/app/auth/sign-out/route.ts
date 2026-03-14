import { NextResponse } from "next/server";
import { clearOperatorSession } from "@/lib/operator-auth";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/auth/sign-in", request.url));
  clearOperatorSession(response);
  return response;
}
