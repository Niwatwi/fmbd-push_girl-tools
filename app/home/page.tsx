import { redirect } from "next/navigation";
import PghMainHubClient from "../PghMainHubClient";
import { getUserSession } from "@/utils/auth";

export default async function AppHomePage() {
  const user = await getUserSession();
  if (!user) redirect("/login?next=/home");
  if (user.role === "admin") redirect("/admin");
  if (
    String(user.company_tag || "")
      .trim()
      .toUpperCase() === "CUSTOMER"
  )
    redirect("/customer-portal");

  return <PghMainHubClient user={user} />;
}
