import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let email: string;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Call Supabase password recovery — always returns 200 (don't leak email existence)
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: {
      "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      redirect_to: "https://arcusquantfund.com/reset-password",
    }),
  });

  // Always success — prevents email enumeration
  return NextResponse.json({ success: true });
}
