import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import TopRightControls from "@/components/TopRightControls";
import { useErrorCodes } from "@/hooks/useErrorCodes";
import { useDbErrorCodes } from "@/hooks/useDbErrorCodes";
import { Input } from "./ui/input";
import { auth } from "@/services/supabase/auth";
import { EnhancedErrorCard } from "./EnhancedErrorCard";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Settings } from "./Settings";
import { ServiceHistory } from "./ServiceHistory";
import { EquipmentScanner } from "./EquipmentScanner";
import { TroubleshootingWizard } from "./TroubleshootingWizard";
import { PhotoDiagnosis } from "./PhotoDiagnosis";
import { CostEstimator } from "./CostEstimator";
import Fuse from "fuse.js";

interface ButtonPageProps {
  title: string;
}

interface ErrorCode {
  id: string;
  code: string;
  system_name: string;
  meaning: string;
  solution: string;
  difficulty?: string | null;
  estimated_time?: string | null;
  manual_url?: string | null;
  video_url?: string | null;
  related_codes?: string[] | null;
  troubleshooting_steps?: any;
}

const ButtonPage = ({ title }: ButtonPageProps) => {
  const location = useLocation();
  const routeName = location.pathname.slice(1);
  
  // Try to load from database first
  const { errorCodes: dbErrorCodes, loading: dbLoading, error: dbError } = useDbErrorCodes(routeName);
  
  // Fallback to JSON files if database is empty
  const { errorCodes: jsonErrorCodes, loading: jsonLoading, error: jsonError } = useErrorCodes(routeName);
  
  const [searchCode, setSearchCode] = useState("");
  const [userId, setUserId] = useState<string | undefined>();
  const { trackSearch } = useAnalytics();

  useEffect(() => {
    auth.getCurrentUser().then((user) => {
      setUserId(user?.id);
    });
  }, []);
  
  // Use database codes if available, otherwise fall back to JSON
  const errorCodes: ErrorCode[] = dbErrorCodes.length > 0 ? dbErrorCodes : Object.entries(jsonErrorCodes).map(([code, details]) => ({
    id: code,
    code,
    system_name: routeName,
    meaning: details.meaning,
    solution: details.solution,
    difficulty: null,
    estimated_time: null,
    manual_url: null,
    video_url: null,
    related_codes: null,
    troubleshooting_steps: null,
  }));
  
  const loading = dbLoading || jsonLoading;
  const error = dbError || jsonError;

  // Fuzzy search
  const fuse = new Fuse(errorCodes, {
    keys: [
      { name: "code", weight: 2 },
      { name: "meaning", weight: 1.5 },
      { name: "solution", weight: 1 },
    ],
    threshold: 0.4,
    includeScore: true,
  });

  const searchResults = searchCode.trim()
    ? fuse.search(searchCode).slice(0, 3).map((result) => result.item)
    : [];

  // Track analytics when searching
  useEffect(() => {
    if (searchCode.trim() && searchResults.length > 0) {
      trackSearch(routeName, searchResults[0].code, userId);
    }
  }, [searchCode, searchResults, routeName, userId, trackSearch]);

  return (
    <div className="page-container">
      <TopRightControls />

      <main>
        <h1 className="header">{title}</h1>

        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <ServiceHistory />
          <EquipmentScanner />
          <TroubleshootingWizard />
          <PhotoDiagnosis />
          <CostEstimator />
        </div>

        <nav className="w-full max-w-md space-y-4">
          <Link to="/" className="nav-button block">
            Home
          </Link>
        </nav>

        <div className="w-full max-w-md space-y-4 mt-4">
          <Input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Search error code..."
            className="nav-button text-2xl font-bold text-center h-16"
            disabled={loading}
          />

          {loading && (
            <div className="text-center text-muted-foreground">
              Loading error codes...
            </div>
          )}

          {error && (
            <div className="text-center text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && searchCode.trim() === "" && (
            <div className="text-center text-muted-foreground py-8 animate-fade-in">
              <p className="text-lg">Start typing to search error codes...</p>
            </div>
          )}

          {!loading && !error && searchCode.trim() !== "" && searchResults.length === 0 && (
            <div className="text-center text-muted-foreground py-8 animate-fade-in">
              <p className="text-lg">No matching error codes found.</p>
            </div>
          )}

          {!loading && !error && searchResults.map((errorCode, index) => (
            <div 
              key={errorCode.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <EnhancedErrorCard
                code={errorCode.code}
                meaning={errorCode.meaning}
                solution={errorCode.solution}
                systemName={title}
                difficulty={errorCode.difficulty || undefined}
                estimated_time={errorCode.estimated_time || undefined}
                manual_url={errorCode.manual_url || undefined}
                video_url={errorCode.video_url || undefined}
                related_codes={errorCode.related_codes || undefined}
                troubleshooting_steps={errorCode.troubleshooting_steps}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ButtonPage;
