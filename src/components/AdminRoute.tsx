import { ReactNode } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TopRightControls from "@/components/TopRightControls";

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useUserRole();

  if (loading) return <div className="page-container"><p>Loading...</p></div>;

  if (!isAdmin) {
    return (
      <div className="page-container">
        <TopRightControls />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p>You don't have permission to access this page.</p>
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
