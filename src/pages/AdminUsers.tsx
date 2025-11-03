import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, Users, Shield, Ban, Check, KeyRound, RefreshCw, LogOut } from "lucide-react";
import TopRightControls from "@/components/TopRightControls";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  getUserStats,
  resetUserPassword,
  banUser,
  unbanUser,
  changeUserRole,
  getAllUsers,
  type UserStats,
} from "@/lib/userTracking";

interface UserWithRole {
  id: string;
  user_id: string;
  role: "admin" | "moderator" | "user";
  created_at: string | null;
  banned?: boolean;
  email?: string;
  username?: string;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Fetch all users with roles
      const allUsers = await getAllUsers();
      setUsers(allUsers);

      // Fetch user profiles for email display
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles" as any)
        .select("*");

      if (profilesError) {
        const pErrMsg = (profilesError as any)?.message ?? JSON.stringify(profilesError, Object.getOwnPropertyNames(profilesError));
        console.error("Error loading profiles:", pErrMsg, profilesError);
        toast({ title: "Error loading profiles", description: (profilesError as any)?.message ?? "An unexpected error occurred while loading profiles.", variant: "destructive" });
        // Ensure profiles map is empty to avoid undefined lookups
        setProfiles(new Map());
      }

      if (profilesData) {
        const profileMap = new Map(profilesData.map((p: UserProfile) => [p.id, p]));
        setProfiles(profileMap);

        // Add email to users
        const usersWithEmail = allUsers.map((user) => ({
          ...user,
          email: profileMap.get(user.user_id)?.email,
          username: profileMap.get(user.user_id)?.full_name,
        }));
        setUsers(usersWithEmail);
      }
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadUsers();
      toast({
        title: "Users refreshed",
        description: "User list has been updated",
      });
    } catch (error: any) {
      toast({
        title: "Error refreshing users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectUser = async (userId: string) => {
    setSelectedUserId(userId);
    const stats = await getUserStats(userId);
    setUserStats(stats);
  };

  const handleResetPassword = async (email?: string) => {
    if (!email) {
      toast({
        title: "Error",
        description: "User email not available",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await resetUserPassword(email);
      if (success) {
        toast({
          title: "Success",
          description: "Password reset email sent to " + email,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!confirm("Are you sure you want to ban this user?")) return;

    try {
      const success = await banUser(userId);
      if (success) {
        toast({
          title: "Success",
          description: "User has been banned",
        });
        handleRefresh();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (!confirm("Are you sure you want to unban this user?")) return;

    try {
      const success = await unbanUser(userId);
      if (success) {
        toast({
          title: "Success",
          description: "User has been unbanned",
        });
        handleRefresh();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleChangeRole = async (userId: string, newRole: "admin" | "moderator" | "user") => {
    try {
      const success = await changeUserRole(userId, newRole);
      if (success) {
        toast({
          title: "Success",
          description: `User role changed to ${newRole}`,
        });
        handleRefresh();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const selectedUser = users.find((u) => u.user_id === selectedUserId);
  const sortedUsers = [...users].sort((a, b) => {
    const aName = a.username || a.email || a.user_id.slice(0, 8);
    const bName = b.username || b.email || b.user_id.slice(0, 8);
    return aName.localeCompare(bName);
  });

  if (loading && users.length === 0) {
    return (
      <div className="page-container">
        <TopRightControls />
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <TopRightControls />
      <header className="flex items-center justify-between mb-8 w-full max-w-5xl">
        <div className="flex items-center gap-2">
          <Link to="/admin">
            <Button variant="ghost" size="icon" aria-label="Back to Admin">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="icon" aria-label="Go home">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users size={20} /> Users
        </h1>
        <div className="w-10" />
      </header>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User List */}
        <div className="border rounded p-4 max-h-[70vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">User List ({sortedUsers.length})</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh users"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="overflow-auto flex-1 pr-2" style={{ scrollbarWidth: "none" }}>
            <ul className="space-y-1">
              {sortedUsers.map((user) => (
                <li key={user.user_id}>
                  <button
                    className={`w-full text-left home-button p-2 rounded ${
                      selectedUserId === user.user_id ? "border-primary border-2" : ""
                    }`}
                    onClick={() => handleSelectUser(user.user_id)}
                  >
                    <div className="font-bold text-base">{user.username || user.email || user.user_id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">
                      Role: {user.role}
                      {user.banned && " • BANNED"}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* User Details */}
        <div className="border rounded p-4 min-h-[70vh] flex flex-col">
          <h2 className="font-semibold text-lg mb-4">Details</h2>
          {!selectedUser ? (
            <div className="text-sm text-muted-foreground">Select a user to view details</div>
          ) : (
            <div className="space-y-4 overflow-auto flex-1 pr-2" style={{ scrollbarWidth: "none" }}>
              {/* Basic Info */}
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Username:</span>
                  <div className="font-bold text-base">
                    {selectedUser.username || selectedUser.email || selectedUser.user_id.slice(0, 8)}
                  </div>
                </div>
                <div>
                  <span className="font-medium">User ID:</span>
                  <div className="text-xs font-mono break-all">{selectedUser.user_id}</div>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <div>{selectedUser.email || "-"}</div>
                </div>
                <div>
                  <span className="font-medium">Role:</span>
                  <div className="capitalize">{selectedUser.role}</div>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div className={selectedUser.banned ? "text-destructive font-bold" : "text-green-600"}>
                    {selectedUser.banned ? "BANNED" : "Active"}
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Activity Stats */}
              {userStats && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Activity Stats</h3>
                  <div>
                    <span className="font-medium text-sm">Login Count:</span>
                    <div>{userStats.loginCount}</div>
                  </div>
                  <div>
                    <span className="font-medium text-sm">Last Login:</span>
                    <div>
                      {userStats.lastLogin
                        ? new Date(userStats.lastLogin).toLocaleDateString() +
                          " " +
                          new Date(userStats.lastLogin).toLocaleTimeString()
                        : "Never"}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-sm">Most Viewed Page:</span>
                    <div className="text-xs break-all">{userStats.mostViewedPage || "-"}</div>
                  </div>
                  <div>
                    <span className="font-medium text-sm">Total Activities:</span>
                    <div>{userStats.totalActivityCount}</div>
                  </div>
                  {userStats.mostSearchedCodes.length > 0 && (
                    <div>
                      <span className="font-medium text-sm">Top Error Codes:</span>
                      <ul className="list-disc ml-5 text-xs">
                        {userStats.mostSearchedCodes.map((code) => (
                          <li key={code.code}>
                            {code.code} ({code.count} searches)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="h-px bg-border" />

              {/* Action Buttons */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Actions</h3>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleResetPassword(selectedUser.email)}
                  disabled={!selectedUser.email}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Reset Password
                </Button>

                {selectedUser.banned ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-green-600"
                    onClick={() => handleUnbanUser(selectedUser.user_id)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Allow User
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive"
                    onClick={() => handleBanUser(selectedUser.user_id)}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Ban User
                  </Button>
                )}

                <div>
                  <label className="text-sm font-medium block mb-2">Change Role:</label>
                  <Select defaultValue={selectedUser.role} onValueChange={(value) => handleChangeRole(selectedUser.user_id, value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
