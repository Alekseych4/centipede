import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "../../components/settings-client";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const user = await currentUser();

  return <SettingsClient userName={user?.fullName ?? null} userEmail={user?.primaryEmailAddress?.emailAddress ?? null} />;
}
