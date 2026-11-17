import { redirect } from "next/navigation";
import { getUserSession } from "@/utils/auth";
import KoeStoreManagement from "./view";

export default async function KoeStoresPage() {
  const session = await getUserSession();
  if (!session) redirect("/login?next=/koe/stores");
  if (session.role !== "koe") redirect("/");
  return <KoeStoreManagement />;
}
