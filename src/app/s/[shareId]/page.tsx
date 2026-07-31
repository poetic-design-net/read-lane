import { redirect } from "next/navigation";

/**
 * Canonical share path /s/{shareId} → reuses /d/[publicId] implementation.
 * publicId is the shareId (cryptographically random, non-sequential).
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  redirect(`/d/${shareId}`);
}
