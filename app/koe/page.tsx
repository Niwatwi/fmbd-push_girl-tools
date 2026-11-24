import { redirect } from "next/navigation";
import { getUserSession } from "@/utils/auth";
import KoeDashboard from "./KoeDashboard";

export default async function KoePage() {
  const session = await getUserSession();
  if (!session) redirect("/login?next=/koe");
  const isBaSupervisor = ["BA_SUPERVISOR", "SUPERVISOR"].includes(
    String(session.company_tag || "")
      .trim()
      .toUpperCase(),
  );
  if (session.role !== "koe" && !isBaSupervisor) redirect("/");
  return <KoeDashboard name={session.display_name} readOnly={isBaSupervisor} />;
}
