import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const ALLOWED_PATHS = new Set([
  "auth/me",
  "providers/kling/credits",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path.join("/");
  if (!ALLOWED_PATHS.has(path)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("videoagent_session")?.value;
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    cache: "no-store",
    headers: sessionToken
      ? { cookie: `videoagent_session=${sessionToken}` }
      : undefined,
  });
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
