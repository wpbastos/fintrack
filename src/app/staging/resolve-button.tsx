"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resolveUnresolved } from "./actions";

export function ResolveButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    total: number;
    merchantsResolved: number;
  } | null>(null);

  const handleResolve = () => {
    setResult(null);
    startTransition(async () => {
      const res = await resolveUnresolved();
      setResult({ total: res.total, merchantsResolved: res.merchantsResolved });
    });
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-sm text-muted-foreground">
          {result.merchantsResolved}/{result.total} matched
        </span>
      )}
      <Button onClick={handleResolve} disabled={isPending} size="sm">
        {isPending ? "Resolving..." : "Resolve"}
      </Button>
    </div>
  );
}
