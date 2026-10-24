import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agreementId = searchParams.get("agreementId");

    if (!agreementId) {
      return NextResponse.json(
        { error: "agreementId is required" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is participant in the agreement
    const { data: agreement, error: agreementError } = await supabase
      .from("agreements")
      .select("id, brand_id, creator_id")
      .eq("id", agreementId)
      .single();

    if (agreementError || !agreement) {
      return NextResponse.json(
        { error: "Agreement not found" },
        { status: 404 }
      );
    }

    // Check if user is brand or creator
    const { data: brandProfile } = await supabase
      .from("brand_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const { data: creatorProfile } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const isParticipant =
      (brandProfile && brandProfile.id === agreement.brand_id) ||
      (creatorProfile && creatorProfile.id === agreement.creator_id);

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Fetch payment intents for this agreement
    const { data: payments, error: paymentsError } = await supabase
      .from("payment_intents")
      .select("*")
      .eq("agreement_id", agreementId)
      .order("created_at", { ascending: false });

    if (paymentsError) throw paymentsError;

    return NextResponse.json({ payments: payments || [] });
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
