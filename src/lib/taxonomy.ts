import { useEffect, useMemo, useState } from "react";
import type { Interest, TrackName } from "./mock-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface TaxonomySubcategory {
  id: string;
  name: string;
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  program: string;
  subcategories: TaxonomySubcategory[];
}

interface PaginatedResponse<T> {
  results?: T[];
}

function hasResults<T>(payload: unknown): payload is PaginatedResponse<T> {
  return payload !== null && typeof payload === "object" && "results" in payload;
}

function buildApiUrl(endpoint: string) {
  return `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

export function usePlatformTaxonomy() {
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch(buildApiUrl("/api/categories/"));
        const payload = (await response.json()) as
          | TaxonomyCategory[]
          | PaginatedResponse<TaxonomyCategory>
          | { detail?: string };
        const categoryList = Array.isArray(payload)
          ? payload
          : hasResults<TaxonomyCategory>(payload) && Array.isArray(payload.results)
            ? payload.results
            : null;

        if (!response.ok || !categoryList) {
          throw new Error(
            !Array.isArray(payload) && typeof (payload as { detail?: string })?.detail === "string"
              ? (payload as { detail?: string }).detail!
              : "Unable to load academy paths.",
          );
        }

        if (active) {
          setCategories(
            categoryList.map((category: TaxonomyCategory) => ({
              id: category.id,
              name: category.name,
              program: category.program || category.name,
              subcategories: Array.isArray(category.subcategories) ? category.subcategories : [],
            })),
          );
        }
      } catch (loadError) {
        if (active) {
          setCategories([]);
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load academy paths.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const interests = useMemo(
    () => categories.map((category) => category.name as Interest),
    [categories],
  );

  const trackOptionsByInterest = useMemo(
    () =>
      Object.fromEntries(
        categories.map((category) => [
          category.name,
          category.subcategories.map((subcategory) => subcategory.name as TrackName),
        ]),
      ) as Record<string, TrackName[]>,
    [categories],
  );

  return {
    categories,
    interests,
    trackOptionsByInterest,
    isLoading,
    error,
  };
}
