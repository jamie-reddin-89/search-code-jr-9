import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, Users, Shield, Ban, KeyRound } from "lucide-react";
import TopRightControls from "@/components/TopRightControls";
import { getEvents, estimateDemographics } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string; // userId or deviceId
  username?: string;
  deviceId: string;
  role: "admin" | "user";
  banned?: boolean;
  email?: string;
  visits: number;
  city?: string;
  country?: string;
  topErrors: { code: string; count: number }[];
}

function readProfiles(): Record<string, UserProfile> {
  try {
    const raw = localStorage.getItem("jr_user_profiles");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeProfiles(p: Record<string, UserProfile>) { localStorage.setItem("jr_user_profiles", JSON.stringify(p)); }

export default function AdminUsers() {
  const events = getEvents();
  const [selected, setSelected] = useState<string | null>(null);
  const profilesMap = useMemo(() => readProfiles(), []);

  const users: UserProfile[] = useMemo(() => {
    const byUser = new Map<string, UserProfile>();
    for (const e of events) {
      const uid = e.userId || e.deviceId;
      const p = byUser.get(uid) || {
        id: uid,
        username: profilesMap[uid]?.username,
        deviceId: e.deviceId,
        role: profilesMap[uid]?.role || "user",
        banned: profilesMap[uid]?.banned || false,
        email: profilesMap[uid]?.email,
        visits: 0,
        city: undefined,
        country: undefined,
        topErrors: [],
      } as UserProfile;
      p.visits += e.type === "page_view" ? 1 : 0;
      if ((e as any).geo && (e as any).geo.lat) {
        p.city = `${(e as any).geo.lat.toFixed(2)}, ${(e as any).geo.lon.toFixed(2)}`;
      }
      if (e.type === "search") {
        const code = String(e.meta?.errorCode || "");
        if (code) {
          const idx = p.topErrors.findIndex(t => t.code === code);
          if (idx >= 0) p.topErrors[idx].count += 1; else p.topErrors.push({ code, count: 1 });
        }
      }
      byUser.set(uid, p);
    }
    const list = Array.from(byUser.values()).map(u => ({
      ...u,
      topErrors: u.topErrors.sort((a,b)=>b.count-a.count).slice(0,5)
    }));
    // attach demographics heuristic per user
    return list.map(u => {
      const evts = events.filter(e => (e.userId || e.deviceId) === u.id);
      const demo = estimateDemographics(evts);
      (u as any).estAge = demo.age; (u as any).estGender = demo.gender;
      return u;
    });
  }, [events, profilesMap]);

  const selectedUser = users.find(u => u.id === selected) || null;

  const updateProfile = (patch: Partial<UserProfile>) => {
    if (!selectedUser) return;
    const map = readProfiles();
    map[selectedUser.id] = { ...map[selectedUser.id], ...selectedUser, ...patch } as UserProfile;
    writeProfiles(map);
  };

  const resetPassword = async (email?: string) => {
    if (!email) { alert("Provide user email to send reset"); return; }
    try {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
      alert("Password reset email sent");
    } catch (e) {
      alert("Failed to send reset email");
    }
  };

  return (
    <div className="page-container">
      <TopRightControls />
      <header className="flex items-center justify-between mb-8 w-full max-w-xl">
        <div className="flex items-center gap-2">
          <Link to="/admin">
            <button className="home-button" aria-label="Back to Admin">
              <ArrowLeft className="inline mr-2" /> Back
            </button>
          </Link>
          <Link to="/">
            <button className="home-button" aria-label="Go Home">
              <Home className="inline mr-2" /> Home
            </button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users size={20}/> Users</h1>
        <div className="w-10" />
      </header>

      <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3 max-h-[60vh] overflow-auto">
          <h2 className="font-semibold mb-2">User List</h2>
          <ul className="space-y-1">
            {users.map(u => (
              <li key={u.id}>
                <button className={`w-full text-left home-button ${selected===u.id?"border-primary": ""}`} onClick={()=>setSelected(u.id)}>
                  <div className="font-medium">{u.username || u.email || u.id.slice(0,8)}</div>
                  <div className="text-xs text-muted-foreground">Visits: {u.visits} • Role: {u.role}{u.banned?" • BANNED":""}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border rounded p-3 min-h-[60vh]">
          <h2 className="font-semibold mb-2">Details</h2>
          {!selectedUser && <div className="text-sm text-muted-foreground">Select a user</div>}
          {selectedUser && (
            <div className="space-y-3">
              <div><span className="font-medium">ID:</span> {selectedUser.id}</div>
              <div><span className="font-medium">Device:</span> {selectedUser.deviceId}</div>
              <div><span className="font-medium">Location:</span> {selectedUser.city || "-"}</div>
              <div><span className="font-medium">Visits:</span> {selectedUser.visits}</div>
              <div><span className="font-medium">EST Gender:</span> {(selectedUser as any).estGender || "unknown"}</div>
              <div><span className="font-medium">EST Age:</span> {(selectedUser as any).estAge || "unknown"}</div>
              <div>
                <span className="font-medium">Top Error Codes:</span>
                <ul className="list-disc ml-5">
                  {selectedUser.topErrors.map(t => <li key={t.code}>{t.code} ({t.count})</li>)}
                  {selectedUser.topErrors.length===0 && <li>None</li>}
                </ul>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-2">
                <label className="block text-sm">Email</label>
                <input className="home-button w-full" placeholder="user@email" defaultValue={selectedUser.email} onBlur={(e)=>updateProfile({ email: e.target.value })} />
                <button className="home-button" onClick={()=>resetPassword(selectedUser.email)} aria-label="Reset Password"><KeyRound className="inline mr-2"/>Reset Password</button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm">Role</label>
                <select className="home-button" value={selectedUser.role} onChange={e=>updateProfile({ role: e.target.value as any })}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="inline"/> Changing role updates local profile only for now</div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm">Ban</label>
                <button className={`home-button ${selectedUser.banned?"border-destructive":""}`} onClick={()=>updateProfile({ banned: !selectedUser.banned })} aria-label="Ban user"><Ban className="inline mr-2"/>{selectedUser.banned?"Unban":"Ban"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
