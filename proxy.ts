// Puts a simple password on the dashboard page. The webhook (/api/...) is not covered: it has its own secret token.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return new NextResponse("Dashboard password is not set (DASHBOARD_PASSWORD).", { status: 503 });

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const given = atob(header.slice(6)).split(":").slice(1).join(":"); // user name is ignored
    if (given === password) return NextResponse.next();
  }
  return new NextResponse("Password required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Aangan dashboard"' } });
}

export const config = { matcher: "/" };
