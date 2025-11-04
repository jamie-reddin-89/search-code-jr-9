const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // First, check if the current user is an admin
    const userToken = authHeader.replace("Bearer ", "");
    
    // Get current user's ID from auth
    const meResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (!meResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const me = await meResponse.json();
    const userId = me.id;

    // Check if user is admin in user_roles table
    const rolesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!rolesResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to check user role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roles = await rolesResponse.json();
    const userRole = roles?.[0];

    if (!userRole || userRole.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all auth users using Admin API
    const usersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (!usersResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const usersData = await usersResponse.json();
    const authUsers = usersData.users || [];

    // Fetch user_roles for all users to get role and ban status
    const userIds = authUsers.map((u: any) => u.id);
    
    let userRoles: Record<string, any> = {};
    if (userIds.length > 0) {
      const rolesQuery = userIds.map((id: string) => `user_id=eq.${id}`).join("&");
      const allRolesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/user_roles?${rolesQuery}`,
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      if (allRolesResponse.ok) {
        const allRoles = await allRolesResponse.json();
        userRoles = Object.fromEntries(allRoles.map((r: any) => [r.user_id, r]));
      }
    }

    // Combine auth users with their roles
    const enrichedUsers = authUsers.map((user: any) => {
      const roleData = userRoles[user.id];
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        role: roleData?.role || "user",
        banned: roleData?.banned || false,
      };
    });

    return new Response(JSON.stringify({ users: enrichedUsers }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in admin-users function:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
