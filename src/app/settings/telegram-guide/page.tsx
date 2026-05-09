import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TelegramGuideClient } from "../../../components/telegram-guide-client";

export default async function TelegramGuidePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  return <TelegramGuideClient />;
}
