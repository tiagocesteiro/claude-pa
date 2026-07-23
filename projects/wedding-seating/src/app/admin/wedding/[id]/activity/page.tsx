"use client";

import { useParams } from "next/navigation";
import ActivityFeed from "@/components/activity/ActivityFeed";

export default function WeddingActivityPage() {
  const params = useParams<{ id: string }>();
  return <ActivityFeed weddingId={params.id} />;
}
