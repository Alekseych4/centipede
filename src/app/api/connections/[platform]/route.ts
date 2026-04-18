import { NextResponse } from "next/server";
import { requireUserId } from "../../../../lib/auth";
import { disconnectPlatform, saveTelegramConnection } from "../../../../lib/connections";
import { isPlatformKey } from "../../../../lib/platforms";
import { TelegramConnectionRequest } from "../../../../lib/types";

async function validateTelegramConnection(botToken: string, chatId: string) {
  const meResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const meData = await meResponse.json().catch(() => null);
  if (!meResponse.ok || !meData?.ok) {
    throw new Error("Invalid Telegram bot token.");
  }

  const chatResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(chatId)}`
  );
  const chatData = await chatResponse.json().catch(() => null);
  if (!chatResponse.ok || !chatData?.ok) {
    throw new Error("Telegram bot cannot access the specified chat.");
  }
}

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

    await validateTelegramConnection(payload.botToken.trim(), payload.chatId.trim());
    await saveTelegramConnection(userId, {
      botToken: payload.botToken.trim(),
      chatId: payload.chatId.trim()
    });

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
