import { NextRequest, NextResponse } from "next/server";
import { draftBrief } from "@/lib/ai/briefDrafter";
import { checkRateLimit } from "@/lib/ai/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idea: string = body?.idea;

    if (!idea || typeof idea !== "string" || idea.trim().length < 5) {
      return NextResponse.json({ error: "idea field is required (min 5 chars)" }, { status: 400 });
    }

    // Extract userId from session cookie
    let userId = 'anonymous';
    try {
      const sessionCookie = req.cookies.get('cinegen_session')?.value;
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie);
        userId = session.userId || 'anonymous';
      }
    } catch (e) {
      // If parsing fails, use anonymous
    }

    // Rate limit check: 10 requests per minute
    const rateCheck = checkRateLimit(userId, 'brief-draft', 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later.", retryAfterMs: rateCheck.retryAfterMs },
        { status: 429 }
      );
    }

    // Draft the brief using the new service
    const result = await draftBrief(idea);

    return NextResponse.json({
      brief: result.brief,
      source: result.source,
      aiLabeled: result.aiLabeled,
      preservedIdea: result.preservedIdea,
    });
  } catch (err) {
    console.error('Brief API error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
