import { NextResponse, type NextRequest } from "next/server";
import { EXPERIENCE_ASSIGNMENT_COOKIE, EXPERIENCE_ASSIGNMENT_HEADER } from "@/lib/experiments";

export function middleware(request: NextRequest) {
  const assignmentId = request.cookies.get(EXPERIENCE_ASSIGNMENT_COOKIE)?.value ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(EXPERIENCE_ASSIGNMENT_HEADER, assignmentId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (!request.cookies.get(EXPERIENCE_ASSIGNMENT_COOKIE)?.value) {
    response.cookies.set({
      name: EXPERIENCE_ASSIGNMENT_COOKIE,
      value: assignmentId,
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|embed/lead-os-embed.js).*)",
  ],
};
