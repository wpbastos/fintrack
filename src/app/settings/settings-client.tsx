"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sun,
  Moon,
  Monitor,
  RefreshCw,
  Trash2,
  Database,
  DollarSign,
  Calendar,
  Cpu,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { updateSetting, clearStagingData } from "./actions";

interface SettingsClientProps {
  initialSettings: Record<string, string>;
  dbStats: {
    transactions: number;
    imports: number;
    staging: number;
    merchants: number;
  };
  budgetStatus: {
    openPeriods: number;
    closedPeriods: number;
    categoriesWithBudget: number;
  };
  extractConcurrency: string;
}

export function SettingsClient({
  initialSettings,
  dbStats,
  budgetStatus,
  extractConcurrency,
}: SettingsClientProps) {
  const { theme, setTheme } = useTheme();
  const [currency, setCurrency] = useState(
    initialSettings.currency ?? "CAD"
  );
  const [dateFormat, setDateFormat] = useState(
    initialSettings.dateFormat ?? "YYYY-MM-DD"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [stats, setStats] = useState(dbStats);

  async function handleCurrencyChange(value: string) {
    setCurrency(value);
    setIsSaving(true);
    try {
      await updateSetting("currency", value);
      toast.success("Currency updated");
    } catch {
      toast.error("Failed to update currency");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDateFormatChange(value: string) {
    setDateFormat(value);
    setIsSaving(true);
    try {
      await updateSetting("dateFormat", value);
      toast.success("Date format updated");
    } catch {
      toast.error("Failed to update date format");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBudgetReset() {
    setIsResetting(true);
    try {
      const res = await fetch("/api/cron/budget-reset", { method: "GET" });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Budget status: ${data.stats.openPeriods} open, ${data.stats.closedPeriods} closed`
        );
      } else {
        toast.error(data.error ?? "Failed to check budget status");
      }
    } catch {
      toast.error("Failed to connect to budget endpoint");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleClearStaging() {
    if (
      !confirm(
        "This will delete all staging transactions that have not been imported. Continue?"
      )
    ) {
      return;
    }
    setIsClearing(true);
    try {
      const result = await clearStagingData();
      setStats((prev) => ({
        ...prev,
        staging: prev.staging - result.deleted,
      }));
      toast.success(`Cleared ${result.deleted} staging records`);
    } catch {
      toast.error("Failed to clear staging data");
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              General
            </CardTitle>
            <CardDescription>
              Currency, date format, and appearance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency Display</Label>
              <Select
                value={currency}
                onValueChange={handleCurrencyChange}
                disabled={isSaving}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={dateFormat}
                onValueChange={handleDateFormatChange}
                disabled={isSaving}
              >
                <SelectTrigger id="dateFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MMM DD, YYYY">MMM DD, YYYY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="flex-1"
                >
                  <Sun className="mr-1.5 h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="flex-1"
                >
                  <Moon className="mr-1.5 h-4 w-4" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="flex-1"
                >
                  <Monitor className="mr-1.5 h-4 w-4" />
                  System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Import Settings
            </CardTitle>
            <CardDescription>
              PDF extraction and import configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>PDF Extract Concurrency</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {extractConcurrency}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  concurrent extraction{extractConcurrency !== "1" ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Set via EXTRACT_CONCURRENCY environment variable.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Budget Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Budget Settings
            </CardTitle>
            <CardDescription>
              Budget period management and cron status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {budgetStatus.openPeriods}
                </div>
                <div className="text-xs text-muted-foreground">Open</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {budgetStatus.closedPeriods}
                </div>
                <div className="text-xs text-muted-foreground">Closed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {budgetStatus.categoriesWithBudget}
                </div>
                <div className="text-xs text-muted-foreground">
                  With Budget
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleBudgetReset}
              disabled={isResetting}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isResetting ? "animate-spin" : ""}`}
              />
              {isResetting ? "Checking..." : "Check Budget Status"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Budget reset runs daily at midnight via cron. Use the button
              above to check current status.
            </p>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Database statistics and data cleanup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">
                    {stats.transactions.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Transactions
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">
                    {stats.imports.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Imports</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">
                    {stats.staging.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Staging
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">
                    {stats.merchants.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Merchants
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleClearStaging}
              disabled={isClearing || stats.staging === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isClearing
                ? "Clearing..."
                : `Clear Staging Data (${stats.staging})`}
            </Button>
            <p className="text-xs text-muted-foreground">
              Removes all staging transactions except those already imported.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
