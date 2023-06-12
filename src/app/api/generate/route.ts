import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  return NextResponse.json(
    {
      message: "Success",
      data: payload,
    },
    {
      status: 200,
    }
  );
}
