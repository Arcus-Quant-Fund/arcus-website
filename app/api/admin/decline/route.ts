import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

const ADMIN_DOMAIN = "@arcusquantfund.com";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email?.endsWith(ADMIN_DOMAIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { applicationId } = (await req.json()) as { applicationId: string };
  if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });

  const db = createServiceClient();

  // Fetch current status first so we can return a meaningful error if it can't be declined
  const { data: app } = await db
    .from("client_applications")
    .select("id, status")
    .eq("id", applicationId)
    .single();

  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (!["api_validated", "pending"].includes(app.status)) {
    return NextResponse.json(
      { error: `Cannot decline — application status is '${app.status}'` },
      { status: 409 }
    );
  }

  const { error } = await db
    .from("client_applications")
    .update({ status: "rejected", notes: `Declined by ${session.user.email}` })
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
