import { redirect } from "next/navigation";
import PghMainHubClient from "./PghMainHubClient";
import { getUserSession } from "@/utils/auth";

export default async function HomePage() {
  const user = await getUserSession();
  if (!user) redirect("/login");

  return <PghMainHubClient user={user} />;
}
