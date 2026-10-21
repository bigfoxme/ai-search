import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    mock: process.env.MOCK_SEARCH === "1",
    time: new Date().toISOString(),
  });
}
