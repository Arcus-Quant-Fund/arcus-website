import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { name, email, accountSize, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await resend.emails.send({
    from: "Arcus Quant Fund <onboarding@resend.dev>",
    to: "contact@arcusquantfund.com",
    replyTo: email,
    subject: `New Inquiry from ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e7eb;padding:32px;border-radius:12px;">
        <h2 style="color:#f8ac07;margin-top:0;">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#9ca3af;width:140px;">Name</td><td style="padding:8px 0;color:#fff;font-weight:600;">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#9ca3af;">Email</td><td style="padding:8px 0;color:#fff;">${email}</td></tr>
          <tr><td style="padding:8px 0;color:#9ca3af;">Account Size</td><td style="padding:8px 0;color:#fff;">${accountSize || "Not specified"}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #1f2937;margin:20px 0;" />
        <p style="color:#9ca3af;margin-bottom:8px;">Message:</p>
        <p style="color:#fff;background:#111827;padding:16px;border-radius:8px;line-height:1.6;">${message.replace(/\n/g, "<br/>")}</p>
        <p style="color:#4b5563;font-size:12px;margin-top:24px;">Reply directly to this email to respond to ${name}.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
