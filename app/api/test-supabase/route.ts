import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return Response.json({ error: "Missing env vars", url: !!url, key: !!key }, { status: 500 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("users").select("id").limit(1);

  if (error) {
    return Response.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return Response.json({ ok: true, rowCount: data.length });
}
