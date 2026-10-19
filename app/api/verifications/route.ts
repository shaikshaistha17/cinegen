import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError) throw userError;

    if (userRecord.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // Get pending verifications
    const { data, error } = await supabase
      .from("verifications")
      .select("*, creator:creator_profiles(handle, user:users(name, email))")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ verifications: data || [] });
  } catch (error: any) {
    console.error("Error fetching verifications:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch verifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { creatorId, verificationType, evidenceUrl } = body;

    if (!creatorId || !verificationType || !evidenceUrl) {
      return NextResponse.json(
        { error: "creatorId, verificationType, and evidenceUrl are required" },
        { status: 400 }
      );
    }

    // Verify user owns this creator profile
    const { data: creatorProfile, error: profileError } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .eq("id", creatorId)
      .single();

    if (profileError || creatorProfile.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: You can only request verification for your own profile" },
        { status: 403 }
      );
    }

    // Check for existing pending request
    const { data: existing, error: existingError } = await supabase
      .from("verifications")
      .select("id")
      .eq("creator_id", creatorId)
      .eq("verification_type", verificationType)
      .eq("status", "pending")
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `You already have a pending ${verificationType} verification request` },
        { status: 409 }
      );
    }

    // Create verification request
    const { data, error } = await supabase
      .from("verifications")
      .insert({
        creator_id: creatorId,
        verification_type: verificationType,
        evidence_url: evidenceUrl,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ verification: data }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating verification request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create verification request" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError) throw userError;

    if (userRecord.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, action, notes } = body;

    if (!id || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "id and action (approve/reject) are required" },
        { status: 400 }
      );
    }

    const status = action === "approve" ? "approved" : "rejected";

    // Update verification
    const { data, error } = await supabase
      .from("verifications")
      .update({
        status,
        admin_notes: notes || "",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // If approved, update creator profile verification state
    if (action === "approve") {
      const { data: verification } = await supabase
        .from("verifications")
        .select("creator_id, verification_type")
        .eq("id", id)
        .single();

      if (verification) {
        const { data: profile } = await supabase
          .from("creator_profiles")
          .select("verification")
          .eq("id", verification.creator_id)
          .single();

        if (profile) {
          const verificationField = `${verification.verification_type}Verified`.replace(
            "_",
            ""
          );
          const updatedVerification = {
            ...profile.verification,
            [verificationField]: true,
          };

          // Update badge based on verification level
          let badge = "Unverified";
          if (
            updatedVerification.toolsVerified &&
            updatedVerification.workflowVerified &&
            updatedVerification.pastWorkVerified
          ) {
            badge = "Studio";
          } else if (
            updatedVerification.toolsVerified &&
            updatedVerification.workflowVerified
          ) {
            badge = "Verified";
          } else if (updatedVerification.toolsVerified) {
            badge = "Rising";
          }

          updatedVerification.badge = badge;

          await supabase
            .from("creator_profiles")
            .update({ verification: updatedVerification })
            .eq("id", verification.creator_id);
        }
      }
    }

    return NextResponse.json({ verification: data });
  } catch (error: any) {
    console.error("Error updating verification:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update verification" },
      { status: 500 }
    );
  }
}
