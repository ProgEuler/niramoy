"use client";

/**
 * /admin/reviews is superseded by /admin/updates which hits the real API.
 * This page redirects there so any bookmarked links still work.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReviewsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/updates");
  }, [router]);
  return null;
}
