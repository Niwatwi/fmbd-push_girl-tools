import { redirect } from "next/navigation";
import PghMainHubClient from "./PghMainHubClient";
import { getUserSession } from "@/utils/auth";

export default async function HomePage() {
  const user = await getUserSession();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");
  if (user.role === "koe") redirect("/koe");
  if (
    String(user.company_tag || "")
      .trim()
      .toUpperCase() === "CUSTOMER"
  )
    redirect("/customer-portal");

  return <PghMainHubClient user={user} />;
}
