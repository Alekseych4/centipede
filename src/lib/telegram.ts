interface TelegramApiResponse<T> {
  ok?: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramChatMember {
  status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked";
  can_post_messages?: boolean;
  can_send_messages?: boolean;
}

export interface TelegramConnectionValidation {
  botId: number;
  botUsername?: string;
  chatId: string;
  accountLabel: string;
}

export interface TelegramPublishFailure {
  message: string;
  retryable: boolean;
  requiresReconnect: boolean;
}

export function normalizeTelegramChatTarget(input: string): string {
  const value = input.trim();
  if (!value) {
    return "";
  }

  const withoutQuery = value.split(/[?#]/)[0];
  const linkMatch = withoutQuery.match(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]+)\/?$/i);
  if (linkMatch?.[1]) {
    return `@${linkMatch[1]}`;
  }

  if (/^[A-Za-z0-9_]{5,32}$/.test(value)) {
    return `@${value}`;
  }

  return value;
}

function getTelegramUrl(botToken: string, method: string): string {
  return `https://api.telegram.org/bot${botToken}/${method}`;
}

function getTelegramError(data: TelegramApiResponse<unknown> | null, fallback: string): string {
  return data?.description || fallback;
}

function isTelegramAuthFailure(status: number, data: TelegramApiResponse<unknown> | null): boolean {
  const description = data?.description?.toLowerCase() || "";
  return (
    status === 401 ||
    status === 403 ||
    description.includes("bot was blocked") ||
    description.includes("bot is not a member") ||
    description.includes("not enough rights") ||
    description.includes("chat not found")
  );
}

async function callTelegram<T>(
  botToken: string,
  method: string,
  init?: RequestInit
): Promise<{ response: Response; data: TelegramApiResponse<T> | null }> {
  const response = await fetch(getTelegramUrl(botToken, method), init);
  const data = (await response.json().catch(() => null)) as TelegramApiResponse<T> | null;
  return { response, data };
}

function getChatLabel(chat: TelegramChat, fallback: string): string {
  if (chat.username) {
    return `@${chat.username}`;
  }

  const fullName = [chat.first_name, chat.last_name].filter(Boolean).join(" ").trim();
  return chat.title || fullName || String(chat.id || fallback);
}

function canPublishToChat(chat: TelegramChat, member?: TelegramChatMember): boolean {
  if (!member) {
    return false;
  }

  if (member.status === "creator") {
    return true;
  }

  if (member.status === "administrator") {
    return chat.type === "channel" ? member.can_post_messages === true : true;
  }

  if (chat.type === "channel") {
    return false;
  }

  if (member.status === "member") {
    return true;
  }

  if (member.status === "restricted") {
    return member.can_send_messages === true;
  }

  return false;
}

export async function validateTelegramConnection(
  botToken: string,
  chatId: string
): Promise<TelegramConnectionValidation> {
  const normalizedChatId = normalizeTelegramChatTarget(chatId);
  const meResult = await callTelegram<TelegramUser>(botToken, "getMe");
  if (!meResult.response.ok || !meResult.data?.ok || !meResult.data.result?.id) {
    throw new Error("Invalid Telegram bot token.");
  }

  const bot = meResult.data.result;
  const chatResult = await callTelegram<TelegramChat>(
    botToken,
    `getChat?chat_id=${encodeURIComponent(normalizedChatId)}`
  );
  if (!chatResult.response.ok || !chatResult.data?.ok || !chatResult.data.result?.id) {
    throw new Error("Telegram bot cannot access the specified chat.");
  }

  const chat = chatResult.data.result;
  const memberResult = await callTelegram<TelegramChatMember>(
    botToken,
    `getChatMember?chat_id=${encodeURIComponent(String(chat.id))}&user_id=${bot.id}`
  );
  if (!memberResult.response.ok || !memberResult.data?.ok || !canPublishToChat(chat, memberResult.data.result)) {
    throw new Error("Telegram bot does not have permission to publish to this chat or channel.");
  }

  return {
    botId: bot.id,
    botUsername: bot.username,
    chatId: normalizedChatId,
    accountLabel: getChatLabel(chat, normalizedChatId)
  };
}

export function classifyTelegramPublishFailure(
  response: Response,
  data: TelegramApiResponse<unknown> | null
): TelegramPublishFailure {
  const requiresReconnect = isTelegramAuthFailure(response.status, data);
  return {
    message: getTelegramError(data, "Telegram publish failed."),
    retryable: requiresReconnect ? false : response.status >= 500,
    requiresReconnect
  };
}
