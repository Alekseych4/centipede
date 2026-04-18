import { NextResponse } from "next/server";
import { requireUserId } from "../../../../../lib/auth";
import { getAuthorizationUrl } from "../../../../../lib/platform-oauth";

export async function GET(request: Request, context: { params: Promise<{ platform: string }> }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    return userId;
  }

  const { platform } = await context.params;
  if (platform !== "x" && platform !== "reddit" && platform !== "linkedin") {
    return NextResponse.json({ error: "Unsupported OAuth platform." }, { status: 404 });
  }

  const authorizationUrl = await getAuthorizationUrl(platform, userId, request.url);
  return NextResponse.redirect(authorizationUrl);
}
