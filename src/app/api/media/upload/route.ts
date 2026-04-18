import { NextResponse } from "next/server";
import { requireUserId } from "../../../../lib/auth";
import { uploadMediaAsset } from "../../../../lib/media";
import { UploadMediaRequest } from "../../../../lib/types";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    return userId;
  }

  try {
    const payload = (await request.json()) as UploadMediaRequest;
    const asset = await uploadMediaAsset(userId, payload);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Media upload failed." },
      { status: 400 }
    );
  }
}
