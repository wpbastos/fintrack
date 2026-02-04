"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSchema, updateSchema } from "./actions";
import type { DocumentSchema, SchemaFormData } from "./types";
import { DOCUMENT_TYPES } from "./types";

interface SchemaDialogProps {
  schema?: DocumentSchema;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

function generateCodeFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function formatJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function SchemaDialog({ schema, trigger, onSuccess }: SchemaDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [documentType, setDocumentType] = useState<string>("");
  const [institutionName, setInstitutionName] = useState("");
  const [version, setVersion] = useState("1.0");
  const [sampleDataJson, setSampleDataJson] = useState("");
  const [extractionNotes, setExtractionNotes] = useState("");
  const [notes, setNotes] = useState("");

  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormKey((k) => k + 1);
      if (schema) {
        setName(schema.name);
        setCode(schema.code);
        setDocumentType(schema.documentType);
        setInstitutionName(schema.institutionName || "");
        setVersion(schema.version);
        setSampleDataJson(formatJson(schema.sampleData));
        setExtractionNotes(schema.extractionNotes || "");
        setNotes(schema.notes || "");
        setCodeManuallyEdited(true); // Don't auto-generate for existing
      } else {
        setName("");
        setCode("");
        setDocumentType("");
        setInstitutionName("");
        setVersion("1.0");
        setSampleDataJson("");
        setExtractionNotes("");
        setNotes("");
        setCodeManuallyEdited(false);
      }
    }
    setOpen(newOpen);
  };

  // Auto-generate code from name
  useEffect(() => {
    if (!codeManuallyEdited && name) {
      setCode(generateCodeFromName(name));
    }
  }, [name, codeManuallyEdited]);

  const handleNameChange = (value: string) => {
    setName(value);
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    setCodeManuallyEdited(true);
  };

  const handleFormatJson = () => {
    setSampleDataJson(formatJson(sampleDataJson));
  };

  const validateJson = (value: string): boolean => {
    if (!value.trim()) return true;
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!name.trim() || !code.trim() || !documentType) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate JSON
    if (!validateJson(sampleDataJson)) {
      toast.error("Sample Data JSON is invalid");
      return;
    }

    const data: SchemaFormData = {
      name: name.trim(),
      code: code.trim(),
      documentType,
      institutionName: institutionName.trim() || undefined,
      version: version.trim() || "1.0",
      sampleData: sampleDataJson.trim() || "{}",
      extractionNotes: extractionNotes.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    startTransition(async () => {
      const result = schema
        ? await updateSchema(schema.id, data)
        : await createSchema(data);

      if (result.success) {
        toast.success(schema ? "Schema updated" : "Schema created");
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Operation failed");
      }
    });
  };

  const isEditing = !!schema;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm">Add Schema</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Schema" : "Add Schema"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the document schema configuration"
              : "Create a new document extraction schema"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto" key={formKey}>
          <div className="space-y-6 py-4 pr-2">
            {/* Basic Info Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Triangle Mastercard Statement"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">
                  Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="e.g., triangle-mastercard"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier (auto-generated from name)
                </p>
              </div>
            </div>

            {/* Type and Institution Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentType">
                  Document Type <span className="text-rose-500">*</span>
                </Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g., Canadian Tire Bank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0"
                />
              </div>
            </div>

            {/* Sample Data JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sampleData">Sample Data JSON</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleFormatJson}
                >
                  Format JSON
                </Button>
              </div>
              <Textarea
                id="sampleData"
                value={sampleDataJson}
                onChange={(e) => setSampleDataJson(e.target.value)}
                placeholder='{"detectedSchema": "...", "statement": {...}, "transactions": [...]}'
                className="font-mono text-xs h-64 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Example of what the extracted output should look like
              </p>
            </div>

            {/* Extraction Notes */}
            <div className="space-y-2">
              <Label htmlFor="extractionNotes">Extraction Notes</Label>
              <Textarea
                id="extractionNotes"
                value={extractionNotes}
                onChange={(e) => setExtractionNotes(e.target.value)}
                placeholder="Special instructions for AI extraction..."
                className="h-24 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Instructions for the AI when extracting this document type
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes..."
              />
            </div>
          </div>
        </form>

        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
