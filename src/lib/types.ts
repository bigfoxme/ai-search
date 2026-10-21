export const SORT_MODES = ["relevance", "newest", "authority"] as const;
export type SortMode = (typeof SORT_MODES)[number];

export interface SearchFilters {
  keywords: string;
  phrase: string;
  excludeTerms: string;
  sites: string;
  excludeSites: string;
  langs: string;
  after: string;
  before: string;
}

export interface SearchState extends SearchFilters {
  count: number;
  sort: SortMode;
}

export interface SearchResult {
  rerank_score: number;
  title: string;
  url: string;
  snippet: string;
  summary: string;
  site_name: string | null;
  site_icon: string | null;
  date: string | null;
  authority: number;
}

export interface SearchMeta {
  query: string;
  elapsedMs: number;
  cached: boolean;
}

export interface SearchApiResponse extends SearchMeta {
  results: SearchResult[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export const DEFAULT_SEARCH_STATE: SearchState = {
  keywords: "",
  phrase: "",
  excludeTerms: "",
  sites: "",
  excludeSites: "",
  langs: "",
  after: "",
  before: "",
  count: 10,
  sort: "relevance",
};
