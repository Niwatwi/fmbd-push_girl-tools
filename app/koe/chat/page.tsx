import { redirect } from "next/navigation";
import { getUserSession } from "@/utils/auth";
import KoeChat from "./view";

export default async function Page() {
  const session = await getUserSession();
  if (!session) redirect("/login?next=/koe/chat");
  if (
    session.role !== "admin" &&
    session.role !== "koe" &&
    session.company_tag.trim().toUpperCase() !== "CUSTOMER" &&
    session.role !== "staff"
  )
    redirect("/");
  return (
    <KoeChat
      currentUserId={session.id}
      currentRole={session.role}
      currentCompanyTag={session.company_tag}
    />
  );
}
