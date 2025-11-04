import { auth } from '@/services/supabase/auth';
import { database } from '@/services/supabase/database';
import { functions } from '@/services/supabase/functions';

export interface UserSession {
  id: string;
  user_id: string | null;
  session_start: string;
  session_end: string | null;
  ip_address: string | null;
  device_info: any | null;
  created_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string | null;
  activity_type: string;
  path: string | null;
  meta: any | null;
  timestamp: string;
}

export interface UserStats {
  loginCount: number;
  lastLogin: string | null;
  mostViewedPage: string | null;
  mostSearchedCodes: { code: string; count: number }[];
  totalActivityCount: number;
}

/**
 * Create or update a user session
 */
export async function createUserSession(userId?: string): Promise<UserSession | null> {
  try {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };

    const { data, error } = await database
      .from("user_sessions")
      .insert([
        {
          user_id: userId || null,
          session_start: new Date().toISOString(),
          ip_address: null,
          device_info: deviceInfo,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating user session:", error);
    return null;
  }
}

/**
 * End a user session
 */
export async function endUserSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await database
      .from("user_sessions")
      .update({ session_end: new Date().toISOString() })
      .eq("id", sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error ending user session:", error);
    return false;
  }
}

/**
 * Track user activity
 */
export async function trackUserActivity(
  userId: string | null,
  activityType: string,
  path?: string,
  meta?: any
): Promise<UserActivity | null> {
  try {
    const { data, error } = await database
      .from("user_activity")
      .insert([
        {
          user_id: userId || null,
          activity_type: activityType,
          path: path || window.location.hash,
          meta: meta || null,
          timestamp: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error tracking user activity:", error);
    .
    return null;
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<UserStats | null> {
  try {
    const [sessionsResult, activitiesResult, searchAnalyticsResult] = await Promise.all([
      database
        .from("user_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("session_start", { ascending: false }),
      database
        .from("user_activity")
        .select("*")
        .eq("user_id", userId),
      database
        .from("search_analytics")
        .select("*")
        .eq("user_id", userId),
    ]);

    const sessions = sessionsResult.data || [];
    const activities = activitiesResult.data || [];
    const searchAnalytics = searchAnalyticsResult.data || [];

    // Count logins (completed sessions)
    const loginCount = sessions.filter((s: UserSession) => s.session_end !== null).length;
    const lastLogin = sessions.length > 0 ? sessions[0].session_start : null;

    // Get most viewed page
    const pageViews = activities
      .filter((a: UserActivity) => a.activity_type === "page_view")
      .reduce(
        (acc, a: UserActivity) => {
          acc[a.path || "unknown"] = (acc[a.path || "unknown"] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    const mostViewedPage = Object.entries(pageViews).sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    // Get most searched error codes
    const codeCounts = searchAnalytics.reduce(
      (acc, a: any) => {
        const code = a.error_code;
        acc[code] = (acc[code] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const mostSearchedCodes = Object.entries(codeCounts)
      .map(([code, count]) => ({ code, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      loginCount,
      lastLogin,
      mostViewedPage,
      mostSearchedCodes,
      totalActivityCount: activities.length,
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    return null;
  }
}

/**
 * Ban a user (prevent login)
 */
export async function banUser(userId: string): Promise<boolean> {
  try {
    const { error } = await database
      .from("user_roles")
      .update({ banned: true })
      .eq("user_id", userId);

    if (error) throw error;

    // End all active sessions
    const { error: sessionError } = await database
      .from("user_sessions")
      .update({ session_end: new Date().toISOString() })
      .eq("user_id", userId)
      .is("session_end", null);

    if (sessionError) throw sessionError;

    return true;
  } catch (error) {
    console.error("Error banning user:", error);
    return false;
  }
}

/**
 * Unban a user (allow login)
 */
export async function unbanUser(userId: string): Promise<boolean> {
  try {
    const { error } = await database
      .from("user_roles")
      .update({ banned: false })
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error unbanning user:", error);
    return false;
  }
}

/**
 * Change user role
 */
export async function changeUserRole(userId: string, role: "admin" | "moderator" | "user"): Promise<boolean> {
  try {
    const { error } = await database
      .from("user_roles")
      .update({ role })
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error changing user role:", error);
    return false;
  }
}

/**
 * Reset user password via Supabase Auth
 */
export async function resetUserPassword(email: string): Promise<boolean> {
  try {
    const { error } = await auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error resetting password:", error);
    return false;
  }
}

/**
 * Get all users with their role info and auth details
 */
export async function getAllUsers(): Promise<any[]> {
  try {
    // Fetch user_roles table
    const { data: userRoles, error: rolesError } = await database
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: false });

    if (rolesError) throw rolesError;

    const roles = userRoles || [];
    if (roles.length === 0) return [];

    // Fetch profiles to get email and created_at from auth
    const { data: profiles, error: profilesError } = await database
      .from("profiles")
      .select("*");

    if (profilesError) {
      console.warn("Error fetching profiles:", profilesError);
    }

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // Combine user_roles with profile data to get email and auth timestamps
    const enrichedUsers = roles.map((role: any) => {
      const profile = profileMap.get(role.user_id);
      return {
        id: role.id,
        user_id: role.user_id,
        email: profile?.email,
        created_at: role.created_at || profile?.created_at,
        role: role.role,
        banned: role.banned || false,
      };
    });

    return enrichedUsers;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

/**
 * Get user with stats
 */
export async function getUserWithStats(userId: string): Promise<any | null> {
  try {
    const [userRole, stats] = await Promise.all([
      database.from("user_roles").select("*").eq("user_id", userId).single(),
      getUserStats(userId),
    ]);

    if (userRole.error) throw userRole.error;

    return {
      ...userRole.data,
      stats,
    };
  } catch (error) {
    console.error("Error fetching user with stats:", error);
    return null;
  }
}

/**
 * Create a new user with auth and role
 */
export async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: "user" | "moderator" | "admin" = "user"
): Promise<{ success: boolean; error?: string; user?: any }> {
  try {
    const { data, error } = await functions.invokeFunction('create-user', {
      email,
      password,
      full_name: fullName,
      role,
    });

    if (error) {
      return { success: false, error: error.message || "Failed to create user" };
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    };
  }
}
