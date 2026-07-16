import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { appendCorsHeaders, corsHeadersForOrigin } from "@/lib/http/cors";

const isAdminPage = createRouteMatcher(["/admin(.*)"]);
const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

const authenticatedProxy = clerkMiddleware(async (auth, request) => {
  if (isAdminPage(request)) await auth.protect();
});

const baseProxy = clerkConfigured ? authenticatedProxy : function baseProxy() {
  return NextResponse.next();
};

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");
  const origin = request.headers.get("origin");
  const corsHeaders = isApiRequest ? corsHeadersForOrigin(origin) : null;

  if (isApiRequest && request.method === "OPTIONS") {
    if (origin && !corsHeaders) {
      return NextResponse.json({ ok: false, error: "cors_origin_denied" }, { status: 403 });
    }
    return new NextResponse(null, { status: 204, headers: corsHeaders ?? undefined });
  }

  const response = (await baseProxy(request, event)) ?? NextResponse.next();
  return appendCorsHeaders(response, corsHeaders) as NextResponse;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
