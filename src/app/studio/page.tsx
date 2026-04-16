import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { StudioClient } from "../../components/studio-client";

export default async function StudioPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const user = await currentUser();

  return <StudioClient userName={user?.fullName ?? null} userEmail={user?.primaryEmailAddress?.emailAddress ?? null} />;
}
