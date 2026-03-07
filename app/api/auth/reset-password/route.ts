import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let accessToken: string, newPassword: string;
  try {
    ({ accessToken, newPassword } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!accessToken || !newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "accessToken and newPassword (min 8 chars) required" }, { status: 400 });
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: {
      "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: newPassword }),
  });

  if (!res.ok) {
    const d = await res.json();
    return NextResponse.json(
      { error: d.msg ?? d.error_description ?? "Password update failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
