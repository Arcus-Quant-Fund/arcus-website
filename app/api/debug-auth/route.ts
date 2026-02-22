import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({
      step: "env_missing",
      supabase_url: !!supabaseUrl,
      anon_key: !!anonKey,
    });
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "shehzadahmed@arcusquantfund.com",
          password: "shehzad",
        }),
      }
    );

    const raw = await res.text();
    let data: unknown;
    try { data = JSON.parse(raw); } catch { data = raw; }

    return NextResponse.json({
      step: "fetch_done",
      status: res.status,
      ok: res.ok,
      url_prefix: supabaseUrl.slice(0, 35),
      key_prefix: anonKey.slice(0, 20),
      key_length: anonKey.length,
      key_full: anonKey,
      response: data,
    });
  } catch (e: unknown) {
    return NextResponse.json({ step: "fetch_threw", error: String(e) });
  }
}
