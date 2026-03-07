import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import ApplicationsList from "./ApplicationsList";

const ADMIN_DOMAIN = "@arcusquantfund.com";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email?.endsWith(ADMIN_DOMAIN)) redirect("/login");

  const db = createServiceClient();
  const { data: apps, error } = await db
    .from("client_applications")
    .select("id, full_name, email, phone, country, fiat_currency, starting_capital, binance_uid, api_key, status, notes, bot_id, client_uuid, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <p className="text-red-400">Failed to load applications: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#f8ac07]">Client Applications</h1>
            <p className="text-gray-400 text-sm mt-1">
              {apps?.length ?? 0} total · review and approve to provision bots
            </p>
          </div>
          <a
            href="/admin"
            className="text-sm text-gray-400 hover:text-[#f8ac07] transition-colors"
          >
            ← Back to Admin
          </a>
        </div>

        <ApplicationsList applications={apps ?? []} />
      </div>
    </div>
  );
}
