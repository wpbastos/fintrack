"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { searchInstitutions } from "./actions";
import { Building, Check, X } from "lucide-react";

interface Institution {
  id: number;
  name: string;
  type: string;
  isActive: boolean;
}

interface InstitutionLookupProps {
  initialInstitution?: Institution | null;
  onSelect: (institution: Institution | null) => void;
}

export function InstitutionLookup({
  initialInstitution,
  onSelect,
}: InstitutionLookupProps) {
  const [search, setSearch] = useState(initialInstitution?.name || "");
  const [options, setOptions] = useState<Institution[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Institution | null>(initialInstitution || null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle search - filter from first character
  const handleSearch = useCallback(async (query: string) => {
    if (query.length > 0) {
      setIsLoading(true);
      const results = await searchInstitutions(query);
      setOptions(results);
      setIsLoading(false);
      setIsOpen(true);
    } else {
      setOptions([]);
      setIsOpen(false);
    }
  }, []);

  const handleSelect = (institution: Institution) => {
    setSelected(institution);
    setSearch(institution.name);
    setIsOpen(false);
    onSelect(institution);
  };

  const handleClear = () => {
    setSelected(null);
    setSearch("");
    setOptions([]);
    onSelect(null);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    if (selected) {
      setSelected(null);
      onSelect(null);
    }
    handleSearch(newValue);
  };

  const handleBlur = () => {
    // Delay closing to allow click on dropdown items
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 150);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search institutions..."
          value={search}
          onChange={handleInputChange}
          onFocus={() => {
            if (options.length > 0 && !selected) {
              setIsOpen(true);
            }
          }}
          onBlur={handleBlur}
          className="pl-9 pr-8"
        />
        {selected && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No institutions found
            </div>
          ) : (
            <ul className="max-h-60 overflow-auto py-1">
              {options.map((institution) => (
                <li key={institution.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between"
                    onClick={() => handleSelect(institution)}
                  >
                    <div>
                      <span className="font-medium">{institution.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {institution.type}
                      </span>
                    </div>
                    {institution.isActive && (
                      <Check className="h-4 w-4 text-emerald-500" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

    </div>
  );
}
