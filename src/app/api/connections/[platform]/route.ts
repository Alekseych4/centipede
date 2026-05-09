import { NextResponse } from "next/server";
import { requireUserId } from "../../../../lib/auth";
import { disconnectPlatform, saveTelegramConnection } from "../../../../lib/connections";
import { isPlatformKey } from "../../../../lib/platforms";
import { validateTelegramConnection } from "../../../../lib/telegram";
import { TelegramConnectionRequest } from "../../../../lib/types";

export async function POST(request: Request, context: { params: Promise<{ platform: string }> }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    return userId;
  }

  const { platform } = await context.params;
  if (platform !== "telegram") {
    return NextResponse.json({ error: "Only Telegram uses direct connection POST." }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as TelegramConnectionRequest;
    if (!payload.botToken?.trim() || !payload.chatId?.trim()) {
      return NextResponse.json({ error: "botToken and chatId are required." }, { status: 400 });
    }

    const botToken = payload.botToken.trim();
    const chatId = payload.chatId.trim();
    const validation = await validateTelegramConnection(botToken, chatId);
    await saveTelegramConnection(userId, {
      botToken,
      chatId: validation.chatId
    }, validation.accountLabel);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save Telegram connection." },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ platform: string }> }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    return userId;
  }

  const { platform } = await context.params;
  if (!isPlatformKey(platform)) {
    return NextResponse.json({ error: "Unsupported platform." }, { status: 404 });
  }

  await disconnectPlatform(userId, platform);
  return NextResponse.json({ ok: true });
}
