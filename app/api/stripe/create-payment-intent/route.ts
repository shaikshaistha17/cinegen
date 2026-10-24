import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { stripe, isStripeDemoMode } from "@/lib/stripe";
import { checkRateLimit, getRateLimitResetTime } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: max 5 payment attempts per user per hour
    const rateLimitKey = `payment:${user.id}`;
    const isAllowed = checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000);

    if (!isAllowed) {
      const resetTime = getRateLimitResetTime(rateLimitKey);
      const minutes = Math.ceil(resetTime / 60);
      
      return NextResponse.json(
        { 
          error: `Too many payment attempts. Please contact support or try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
          retryAfter: resetTime,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { agreementId, milestoneNumber, amount, currency = 'INR' } = body;

    if (!agreementId || !amount) {
      return NextResponse.json(
        { error: "agreementId and amount are required" },
        { status: 400 }
      );
    }

    // Get brand profile
    const { data: brandProfile, error: brandError } = await supabase
      .from("brand_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (brandError || !brandProfile) {
      return NextResponse.json(
        { error: "Brand profile not found" },
        { status: 403 }
      );
    }

    // Verify brand owns this agreement
    const { data: agreement, error: agreementError } = await supabase
      .from("agreements")
      .select("id, brand_id, creator_id, price")
      .eq("id", agreementId)
      .eq("brand_id", brandProfile.id)
      .single();

    if (agreementError || !agreement) {
      return NextResponse.json(
        { error: "Agreement not found or access denied" },
        { status: 404 }
      );
    }

    // Check if payment already exists for this milestone
    const { data: existingPayment } = await supabase
      .from("payment_intents")
      .select("id, status")
      .eq("agreement_id", agreementId)
      .eq("milestone_number", milestoneNumber || 1)
      .single();

    if (existingPayment && existingPayment.status === 'succeeded') {
      return NextResponse.json(
        { error: "This milestone has already been paid" },
        { status: 400 }
      );
    }

    // Demo mode handling
    if (isStripeDemoMode()) {
      // Create mock payment record
      const { data: mockPayment, error: mockError } = await supabase
        .from("payment_intents")
        .insert({
          agreement_id: agreementId,
          brand_id: agreement.brand_id,
          creator_id: agreement.creator_id,
          stripe_payment_intent_id: `demo_pi_${Date.now()}`,
          amount,
          currency,
          milestone_number: milestoneNumber || 1,
          status: 'succeeded',
          metadata: { demo: true, demo_completed_at: new Date().toISOString() },
        })
        .select()
        .single();

      if (mockError) throw mockError;

      return NextResponse.json({
        demo: true,
        paymentIntentId: mockPayment.id,
        message: "Demo mode: Payment simulated successfully",
      });
    }

    // Real Stripe integration
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Amount in smallest currency unit (paise for INR)
      currency: currency.toLowerCase(),
      metadata: {
        agreementId,
        milestoneNumber: String(milestoneNumber || 1),
        brandId: agreement.brand_id,
        creatorId: agreement.creator_id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Insert payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payment_intents")
      .insert({
        agreement_id: agreementId,
        brand_id: agreement.brand_id,
        creator_id: agreement.creator_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount,
        currency,
        milestone_number: milestoneNumber || 1,
        status: 'pending',
        metadata: {},
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: payment.id,
    });
  } catch (error: any) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
