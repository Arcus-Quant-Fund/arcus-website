import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "env vars missing", url: !!url, key: !!key });
  }

  const client = createClient(url, key);
  const { data, error } = await client.auth.signInWithPassword({
    email: "shehzadahmed@arcusquantfund.com",
    password: "shehzad",
  });

  return NextResponse.json({
    url_set: url.slice(0, 30),
    key_set: key.slice(0, 20),
    error: error ? { message: error.message, status: error.status } : null,
    user: data?.user?.email ?? null,
  });
}
