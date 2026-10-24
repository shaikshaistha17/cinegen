import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeDemoMode } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import { createNotification, getNotificationTitle, getNotificationMessage } from '@/lib/notifications';

// Disable body parsing for webhook signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    if (isStripeDemoMode()) {
      return NextResponse.json({ received: true, demo: true });
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS
    const supabase = createServiceClient();

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        
        // Update payment status
        const { data: payment, error: updateError } = await supabase
          .from("payment_intents")
          .update({ 
            status: "succeeded",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .select("*, creator_id")
          .single();

        if (updateError) {
          console.error("Error updating payment intent:", updateError);
          break;
        }

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
            getNotificationTitle('payment_received'),
            getNotificationMessage('payment_received', { 
              amount: `₹${(payment.amount / 100).toLocaleString('en-IN')}` 
            }),
            `/projects/${payment.agreement_id}`
          );
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        
        await supabase
          .from("payment_intents")
          .update({ 
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        
        // Update payment status to refunded
        await supabase
          .from("payment_intents")
          .update({ 
            status: "refunded",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_payment_intent_id", charge.payment_intent);

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}
