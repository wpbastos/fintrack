"use client";

import { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ImportResult {
  success: boolean;
  message?: string;
  importId?: number;
  transactionCount?: number;
  reimported?: boolean;
}

interface DuplicateInfo {
  id: number;
  importedAt: string;
  transactionCount: number;
}

export default function ImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const pendingDataRef = useRef<object | null>(null);

  const doImport = async (data: object, force = false) => {
    setIsLoading(true);
    setResult(null);
    setDuplicate(null);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, force }),
      });

      const result = await response.json();

      if (result.duplicate) {
        // Duplicate detected - show confirmation
        setDuplicate(result.existingImport);
        pendingDataRef.current = data;
        return;
      }

      if (response.ok) {
        setResult({ success: true, ...result });
        const action = result.reimported ? "Re-imported" : "Imported";
        toast.success(`${action} ${result.transactionCount} transactions`);
        pendingDataRef.current = null;
      } else {
        setResult({ success: false, message: result.error });
        toast.error(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse JSON";
      setResult({ success: false, message });
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".json")) {
      toast.error("Please upload a JSON file");
      return;
    }

    try {
      const content = await file.text();
      const data = JSON.parse(content);
      await doImport(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse JSON";
      setResult({ success: false, message });
      toast.error(message);
    }
  };

  const handleReimport = () => {
    if (pendingDataRef.current) {
      doImport(pendingDataRef.current, true);
    }
  };

  const handleCancel = () => {
    setDuplicate(null);
    pendingDataRef.current = null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Statements</h1>
        <p className="text-muted-foreground">
          Upload JSON files to import transactions into staging.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload JSON</CardTitle>
            <CardDescription>
              Drag and drop or click to upload a statement JSON file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".json"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
                disabled={isLoading}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                ) : (
                  <Upload className="h-10 w-10 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {isLoading ? "Processing..." : "Drop JSON file here or click to browse"}
                </span>
              </label>
            </div>

            {/* Duplicate Detection - Ask to Re-import */}
            {duplicate && (
              <div className="mt-4 p-4 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Statement Already Imported</p>
                    <p className="text-sm opacity-90 mt-1">
                      This statement was imported on {formatDate(duplicate.importedAt)} with {duplicate.transactionCount} transactions.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleReimport}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Re-import
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 rounded-md"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success/Error Result */}
            {result && (
              <div
                className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                  result.success
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                }`}
              >
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">
                    {result.success
                      ? (result.reimported ? "Re-import Successful" : "Import Successful")
                      : "Import Failed"}
                  </p>
                  <p className="text-sm opacity-90">
                    {result.success
                      ? `${result.transactionCount} transactions added to staging (Import #${result.importId})`
                      : result.message}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>JSON Format</CardTitle>
            <CardDescription>
              Expected structure for import files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Option A: Use existing account ID
              </p>
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto">
{`"statement": {
  "accountId": 1,
  ...
}`}
              </pre>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Option B: Auto-create account
              </p>
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto">
{`"statement": {
  "account": {
    "accountName": "TD Chequing",
    "accountNumber": "1234",
    "institutionName": "TD Bank",
    "accountType": "Chequing",
    "currency": "CAD"
  },
  ...
}`}
              </pre>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Full example
              </p>
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-72">
{`{
  "statement": {
    "account": {
      "accountName": "TD Chequing",
      "accountNumber": "1234",
      "institutionName": "TD Bank",
      "accountType": "Chequing",
      "currency": "CAD"
    },
    "periodStart": "2024-01-01",
    "periodEnd": "2024-01-31",
    "openingBalance": 1500.00,
    "closingBalance": 2234.56,
    "sourceFile": "2024-01_TD.pdf",
    "sourceType": "Statement"
  },
  "transactions": [
    {
      "date": "2024-01-05",
      "description": "AMAZON.CA*123ABC",
      "amount": -45.99
    },
    {
      "date": "2024-01-10",
      "description": "ACME PAYROLL DIRECT DEP",
      "amount": 2500.00
    },
    {
      "date": "2024-01-15",
      "description": "CRA DIRECT DEP TAX REFUND",
      "amount": 350.00
    },
    {
      "date": "2024-01-20",
      "description": "NETFLIX.COM",
      "amount": -22.99
    }
  ]
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
