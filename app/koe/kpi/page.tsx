import { redirect } from "next/navigation";
import { getUserSession } from "@/utils/auth";
import KoeKpiPage from "./view";

export default async function Page() {
  const session = await getUserSession();
  if (!session) redirect("/login?next=/koe/kpi");
  if (session.role !== "koe") redirect("/");
  return <KoeKpiPage />;
}
