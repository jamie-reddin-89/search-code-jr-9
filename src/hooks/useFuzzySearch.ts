import { useMemo } from "react";
import Fuse from "fuse.js";

interface ErrorCode {
  code: string;
  meaning: string;
  solution: string;
}

interface SearchableItem extends ErrorCode {
  systemName: string;
}

export function useFuzzySearch(
  errorCodes: Record<string, ErrorCode>,
  systemName: string,
  searchQuery: string
) {
  const searchableItems = useMemo(() => {
    return Object.entries(errorCodes).map(([code, details]) => ({
      code,
      systemName,
      ...details,
    }));
  }, [errorCodes, systemName]);

  const fuse = useMemo(() => {
    return new Fuse(searchableItems, {
      keys: [
        { name: "code", weight: 2 },
        { name: "meaning", weight: 1.5 },
        { name: "solution", weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }, [searchableItems]);

  const results = useMemo(() => {
    if (!searchQuery.trim()) {
      return searchableItems;
    }

    const fuseResults = fuse.search(searchQuery);
    return fuseResults.map((result) => result.item);
  }, [searchQuery, fuse, searchableItems]);

  return results;
}