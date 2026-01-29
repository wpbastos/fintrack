"use client";

import { useState } from "react";
import { Upload, FileJson, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ImportResult {
  success: boolean;
  message: string;
  importId?: number;
  transactionCount?: number;
}

export default function ImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".json")) {
      toast.error("Please upload a JSON file");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const content = await file.text();
      const data = JSON.parse(content);

      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setResult({ success: true, ...result });
        toast.success(`Imported ${result.transactionCount} transactions`);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
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
                    {result.success ? "Import Successful" : "Import Failed"}
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
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
{`{
  "statement": {
    "accountId": 1,
    "periodStart": "2024-01-01",
    "periodEnd": "2024-01-31",
    "openingBalance": 1500.00,
    "closingBalance": 1234.56,
    "sourceFile": "2024-01_Bank.pdf",
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
      "description": "PAYROLL DEPOSIT",
      "amount": 2500.00
    }
  ]
}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
