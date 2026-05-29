"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, useParams } from "next/navigation";
import ResourceForm from "@/components/resources/ResourceForm";
import {
  ResourceFormData,
  ResourceFlyer,
} from "@/lib/types/resource";

export default function EditResourcePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams();
  const resourceId = params.id as string;

  const [initial, setInitial] = useState<ResourceFormData | null>(null);
  const [flyers, setFlyers] = useState<ResourceFlyer[]>([]);
  const [wasListed, setWasListed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
      return;
    }
    if (session) {
      fetch(`/api/user/resources/${resourceId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.error) {
            setError(d.error);
            return;
          }
          setInitial(d.form);
          setFlyers(Array.isArray(d.flyers) ? d.flyers : []);
          setWasListed(d.status === "listed");
        })
        .catch(() => setError("Failed to load resource"))
        .finally(() => setLoading(false));
    }
  }, [session, isPending, resourceId]);

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-black
          rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !initial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen
        px-4 text-center">
        <p className="text-red-500 text-sm mb-4">
          {error || "Resource not found"}
        </p>
        <button
          onClick={() => router.push("/my-resources")}
          className="text-black underline text-sm"
        >
          Back to My Resources
        </button>
      </div>
    );
  }

  return (
    <ResourceForm
      mode="edit"
      resourceId={resourceId}
      initial={initial}
      initialFlyers={flyers}
      wasListed={wasListed}
    />
  );
}
