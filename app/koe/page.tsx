import { redirect } from "next/navigation";
import { getUserSession } from "@/utils/auth";
import KoeDashboard from "./KoeDashboard";

export default async function KoePage() {
  const session = await getUserSession();
  if (!session) redirect("/login?next=/koe");
  if (session.role !== "koe") redirect("/");
  return <KoeDashboard name={session.display_name} />;
}
