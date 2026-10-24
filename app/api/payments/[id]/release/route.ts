import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createNotification, getNotificationTitle, getNotificationMessage } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get brand profile
    const { data: brandProfile, error: brandError } = await supabase
      .from("brand_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (brandError || !brandProfile) {
      return NextResponse.json(
        { error: "Only brands can release payments" },
        { status: 403 }
      );
    }

    // Get payment intent
    const { data: payment, error: paymentError } = await supabase
      .from("payment_intents")
      .select("*, agreements!inner(id, brand_id)")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Verify brand owns the agreement
    if (payment.agreements.brand_id !== brandProfile.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if payment is succeeded
    if (payment.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment must be succeeded before release" },
        { status: 400 }
      );
    }

    // Check if already released
    if (payment.metadata?.released) {
      return NextResponse.json(
        { error: "Payment has already been released" },
        { status: 400 }
      );
    }

    // Check if delivery is approved
    const { data: delivery } = await supabase
      .from("deliveries")
      .select("brand_approved_at")
      .eq("agreement_id", payment.agreement_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!delivery || !delivery.brand_approved_at) {
      return NextResponse.json(
        { error: "Delivery must be approved before releasing payment" },
        { status: 400 }
      );
    }

    // Update payment metadata to mark as released
    const { error: updateError } = await supabase
      .from("payment_intents")
      .update({
        metadata: {
          ...payment.metadata,
          released: true,
          released_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (updateError) throw updateError;

    // Get creator user_id for notification
    const { data: creatorProfile } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .eq("id", payment.creator_id)
      .single();

    if (creatorProfile) {
      // Send notification to creator
      await createNotification(
        creatorProfile.user_id,
        'payment_received',
        'Payment Released',
        `Your payment of ₹${(payment.amount / 100).toLocaleString('en-IN')} has been released`,
        `/projects/${payment.agreement_id}`
      );
    }

    // Note: In production, this would trigger Stripe Transfer or Payout
    // to send funds to creator's connected account
    // Example:
    // if (stripe && payment.stripe_payment_intent_id) {
    //   await stripe.transfers.create({
    //     amount: payment.amount,
    //     currency: payment.currency.toLowerCase(),
    //     destination: creatorStripeAccountId,
    //   });
    // }

    return NextResponse.json({
      success: true,
      message: "Payment released successfully",
    });
  } catch (error: any) {
    console.error("Error releasing payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to release payment" },
      { status: 500 }
    );
  }
}
