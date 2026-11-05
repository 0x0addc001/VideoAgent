import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const ALLOWED_GET_PATHS = new Set([
  "auth/me",
  "credits",
  "providers/pippit/credits",
  "skills",
  "assets",
  "hots",
  "workspace",
]);
const ALLOWED_POST_PATHS = new Set([
  "auth/logout",
  "projects",
  "skills",
  "skills/optimize",
  "hots",
  "workspace/folders",
]);

function allowed(path: string, method: "GET" | "POST" | "PATCH" | "DELETE") {
  if (path === "admin" || path.startsWith("admin/")) return true;
  if (method === "GET") {
    return (
      ALLOWED_GET_PATHS.has(path) ||
      (path.startsWith("hots/") && path.endsWith("/video")) ||
      (path.startsWith("assets/") && path.endsWith("/content"))
    );
  }
  if (method === "POST") return ALLOWED_POST_PATHS.has(path);
  return false;
}

async function sessionHeaders() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("videoagent_session")?.value;
  return sessionToken
    ? { cookie: `videoagent_session=${sessionToken}` }
    : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path.join("/");
  if (!allowed(path, "GET")) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const response = await fetch(`${API_BASE_URL}/${path}${new URL(request.url).search}`, {
    cache: "no-store",
    headers: await sessionHeaders(),
  });
  return proxyResponse(response);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path.join("/");
  if (!allowed(path, "POST")) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const multipart = contentType.startsWith("multipart/form-data");
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      ...(await sessionHeaders()),
      ...(multipart ? {} : { "content-type": contentType || "application/json" }),
    },
    body: multipart ? await request.formData() : await request.text(),
  });
  return proxyResponse(response);
}

async function mutation(
  request: Request,
  params: Promise<{ path: string[] }>,
  method: "PATCH" | "DELETE",
) {
  const path = (await params).path.join("/");
  if (!allowed(path, method)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method,
    cache: "no-store",
    headers: {
      ...(await sessionHeaders()),
      "content-type": request.headers.get("content-type") ?? "application/json",
      origin: request.headers.get("origin") ?? "",
    },
    body: method === "PATCH" ? await request.text() : undefined,
  });
  return proxyResponse(response);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return mutation(request, params, "PATCH");
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return mutation(request, params, "DELETE");
}

async function proxyResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "application/json";
  const textual =
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("xml");
  const body = textual ? await response.text() : await response.arrayBuffer();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": contentType,
      ...(response.headers.get("content-disposition")
        ? { "content-disposition": response.headers.get("content-disposition")! }
        : {}),
    },
  });
}
