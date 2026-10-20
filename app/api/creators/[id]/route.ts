import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createClient();

    const { data, error } = await supabase
      .from("creator_profiles")
      .select("*, user:users(email, name)")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    return NextResponse.json({ creator: data });
  } catch (error: any) {
    console.error("Error fetching creator:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch creator" },
      { status: 500 }
    );
  }
}
