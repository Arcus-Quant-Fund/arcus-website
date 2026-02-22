import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const supabase = createServiceClient();

  // Fetch summary stats
  const { data: summary } = await supabase
    .from("client_summary")
    .select("*")
    .eq("id", session.user.id)
    .single();

  // Fetch balance history (last 90 days)
  const { data: balanceHistory } = await supabase
    .from("balance_history")
    .select("balance, recorded_at")
    .eq("client_id", session.user.id)
    .order("recorded_at", { ascending: true })
    .limit(90);

  // Fetch open positions
  const { data: positions } = await supabase
    .from("positions")
    .select("*")
    .eq("client_id", session.user.id)
    .order("opened_at", { ascending: false });

  // Fetch recent trades
  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("client_id", session.user.id)
    .order("closed_at", { ascending: false })
    .limit(50);

  return (
    <DashboardClient
      session={session}
      summary={summary}
      balanceHistory={balanceHistory ?? []}
      positions={positions ?? []}
      trades={trades ?? []}
    />
  );
}
