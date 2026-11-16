import { redirect } from "next/navigation";
import { getUserSession } from "@/utils/auth";
import KoeChat from "./view";

export default async function Page() {
  const session = await getUserSession();
  if (!session) redirect("/login?next=/koe/chat");
  if (session.role !== "koe" && session.role !== "staff") redirect("/");
  return <KoeChat currentUserId={session.id} currentRole={session.role} />;
}
