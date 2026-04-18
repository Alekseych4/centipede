import { NextResponse } from "next/server";
import { getBaseUrl } from "../../../../../lib/env";
import { completeOAuth } from "../../../../../lib/platform-oauth";

export async function GET(request: Request, context: { params: Promise<{ platform: string }> }) {
  const { platform } = await context.params;
  if (platform !== "x" && platform !== "reddit" && platform !== "linkedin") {
    return NextResponse.json({ error: "Unsupported OAuth platform." }, { status: 404 });
  }

  try {
    await completeOAuth(platform, request);
    return NextResponse.redirect(new URL("/studio?connected=1", getBaseUrl(request.url)));
  } catch (error) {
    const destination = new URL("/studio?connection_error=1", getBaseUrl(request.url));
    destination.searchParams.set("message", error instanceof Error ? error.message : "Connection failed.");
    return NextResponse.redirect(destination);
  }
}
