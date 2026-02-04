"use client";

import { useState } from "react";
import { FileCode2, Building2, CreditCard, FileText, Receipt, FileSpreadsheet } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SchemaPanel } from "./schema-panel";
import type { DocumentSchema } from "./types";

type TabId = "all" | "credit_card_statement" | "bank_statement" | "payslip" | "other";
type StatusFilter = "active" | "inactive";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All", icon: FileCode2 },
  { id: "credit_card_statement", label: "Credit Cards", icon: CreditCard },
  { id: "bank_statement", label: "Bank Statements", icon: Building2 },
  { id: "payslip", label: "Payslips", icon: FileSpreadsheet },
  { id: "other", label: "Other", icon: FileText },
];

function StatusFilter({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border p-1 bg-muted/50">
      <button
        onClick={() => onChange("active")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          value === "active"
            ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Active
      </button>
      <button
        onClick={() => onChange("inactive")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          value === "inactive"
            ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Inactive
      </button>
    </div>
  );
}

interface SchemaTabsProps {
  schemas: DocumentSchema[];
}

export function SchemaTabs({ schemas }: SchemaTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  // Filter by status
  const statusFiltered = schemas.filter((s) =>
    statusFilter === "active" ? s.isActive : !s.isActive
  );

  // Filter by document type
  const filteredSchemas = statusFiltered.filter((s) => {
    if (activeTab === "all") return true;
    if (activeTab === "other") {
      return !["credit_card_statement", "bank_statement", "payslip"].includes(s.documentType);
    }
    return s.documentType === activeTab;
  });

  // Calculate counts for tabs
  const getTabCount = (tabId: TabId) => {
    const filtered = statusFiltered;
    if (tabId === "all") return filtered.length;
    if (tabId === "other") {
      return filtered.filter(
        (s) => !["credit_card_statement", "bank_statement", "payslip"].includes(s.documentType)
      ).length;
    }
    return filtered.filter((s) => s.documentType === tabId).length;
  };

  // Stats
  const totalSchemas = schemas.length;
  const activeSchemas = schemas.filter((s) => s.isActive).length;
  const institutions = new Set(schemas.filter((s) => s.institutionName).map((s) => s.institutionName)).size;
  const creditCardSchemas = schemas.filter((s) => s.documentType === "credit_card_statement").length;
  const bankSchemas = schemas.filter((s) => s.documentType === "bank_statement").length;

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Schemas</CardDescription>
            <CardTitle className="text-2xl">{totalSchemas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{activeSchemas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Institutions</CardDescription>
            <CardTitle className="text-2xl text-violet-600">{institutions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Credit Cards</CardDescription>
            <CardTitle className="text-2xl text-sky-600">{creditCardSchemas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bank Statements</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{bankSchemas}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-between">
        <div className="border-b">
          <nav className="-mb-px flex gap-4">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = getTabCount(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-violet-600 text-violet-600"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-slate-300"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Panel Content */}
      <SchemaPanel schemas={filteredSchemas} statusFilter={statusFilter} />
    </>
  );
}
