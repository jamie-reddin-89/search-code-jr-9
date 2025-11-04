import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Info } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { useTheme } from "@/contexts/ThemeContext";
import { Input } from "./ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ContactForm from '@/components/ContactForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { getAllDevices, generateRouteSlug } from "@/lib/deviceManager";

const APP_VERSION = "1.9.14";

type DeviceOption = { id: string; brandName: string; modelName: string; slug: string };

export const Settings = () => {
  // General tab local (batched) state
  const [offlineMode, setOfflineMode] = useState(localStorage.getItem("offlineMode") === "true");
  const [notifications, setNotifications] = useState(localStorage.getItem("notifications") !== "false");
  const [enableTooltips, setEnableTooltips] = useState(localStorage.getItem("enableTooltips") === "true");
  const [slimLineMode, setSlimLineMode] = useState(localStorage.getItem("slimLineMode") === "true");
  const [defaultLandingSlug, setDefaultLandingSlug] = useState<string | undefined>(localStorage.getItem("defaultLandingSlug") || undefined);
  const [unitTemperature, setUnitTemperature] = useState<string>(localStorage.getItem("unitTemperature") || "C");
  const [currency, setCurrency] = useState<string>(localStorage.getItem("currency") || "EUR");
  const [language, setLanguage] = useState<string>(localStorage.getItem("language") || "en");
  const [dataSaver, setDataSaver] = useState(localStorage.getItem("dataSaver") === "true");
  const [confirmOnDelete, setConfirmOnDelete] = useState(localStorage.getItem("confirmOnDelete") !== "false");

  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  // Devices for default landing model
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const list = await getAllDevices();
        const opts: DeviceOption[] = (list || []).map((m: any) => ({
          id: m.id,
          brandName: m.brand?.name || "",
          modelName: m.name,
          slug: generateRouteSlug(m.brand?.name || "", m.name),
        }));
        setDevices(opts.sort((a, b) => (a.brandName + a.modelName).localeCompare(b.brandName + b.modelName)));
      } catch (e) {
        // Ignore fetch issues; keep empty options
      }
    })();
  }, []);

  // Apply slim-line on open
  useEffect(() => {
    if (localStorage.getItem("slimLineMode") === "true") document.body.classList.add("slim-line");
  }, []);

  // Account Tab state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles" as any).select("full_name, email").eq("id", user.id).single();
          setUsername(profile?.full_name || "");
          setEmail(profile?.email || "");
        }
      } catch (err) {
        console.warn("Error loading profile in settings:", err);
      }
    };
    load();
  }, []);

  // Save all general settings at once
  const handleSaveGeneral = () => {
    localStorage.setItem("offlineMode", String(offlineMode));
    localStorage.setItem("notifications", String(notifications));
    localStorage.setItem("enableTooltips", String(enableTooltips));
    localStorage.setItem("slimLineMode", String(slimLineMode));
    localStorage.setItem("defaultLandingSlug", defaultLandingSlug || "");
    localStorage.setItem("unitTemperature", unitTemperature);
    localStorage.setItem("currency", currency);
    localStorage.setItem("language", language);
    localStorage.setItem("dataSaver", String(dataSaver));
    localStorage.setItem("confirmOnDelete", String(confirmOnDelete));

    if (offlineMode) {
      window.dispatchEvent(new CustomEvent("downloadOfflineData"));
    }
    window.dispatchEvent(new CustomEvent("tooltipsChanged"));
    if (slimLineMode) document.body.classList.add("slim-line"); else document.body.classList.remove("slim-line");

    toast({ title: "Settings saved" });
  };

  const handleSaveUsername = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles" as any).upsert({ id: user.id, full_name: username }, { returning: "minimal" });
      if (error) throw error;
      toast({ title: "Username updated" });
    } catch (err: any) {
      toast({ title: "Error updating username", description: err?.message ?? String(err), variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!email) throw new Error("No email available");
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) throw error;
      toast({ title: "Password reset email sent" });
    } catch (err: any) {
      toast({ title: "Error sending reset", description: err?.message ?? String(err), variant: "destructive" });
    }
  };

  const handleExportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { data: favorites } = await supabase.from("favorites" as any).select("*").eq("user_id", user.id);
      const { data: activity } = await supabase.from("user_activity" as any).select("*").eq("user_id", user.id);

      const payload = { favorites: favorites || [], activity: activity || [] };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export started" });
    } catch (err: any) {
      toast({ title: "Error exporting data", description: err?.message ?? String(err), variant: "destructive" });
    }
  };

  const handleDeleteAccount = async () => {
    const shouldDelete = confirmOnDelete ? confirm("This will delete your profile and sign you out. Are you sure?") : true;
    if (!shouldDelete) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      await supabase.from("user_roles" as any).delete().eq("user_id", user.id);
      await supabase.from("profiles" as any).delete().eq("id", user.id);
      await supabase.auth.signOut();
      toast({ title: "Account deleted and signed out" });
    } catch (err: any) {
      toast({ title: "Error deleting account", description: err?.message ?? String(err), variant: "destructive" });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open settings">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Settings</DialogTitle>
            {/* About tab primary action */}
            <div className="hidden sm:block">
              <ContactForm />
            </div>
          </div>
        </DialogHeader>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme-toggle" className="flex flex-col gap-1">
                  <span className="font-medium">Dark Mode</span>
                  <span className="text-sm text-muted-foreground">Toggle application theme</span>
                </Label>
                <Switch id="theme-toggle" checked={theme === "dark"} onCheckedChange={(checked) => { const isDark = theme === "dark"; if (checked !== isDark) toggleTheme(); }} />
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="offline-mode" className="flex flex-col gap-1">
                    <span className="font-medium">Offline Mode</span>
                    <span className="text-sm text-muted-foreground">Download error codes for field work</span>
                  </Label>
                  <Switch id="offline-mode" checked={offlineMode} onCheckedChange={setOfflineMode} />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications" className="flex flex-col gap-1">
                    <span className="font-medium">Notifications</span>
                    <span className="text-sm text-muted-foreground">Enable app notifications</span>
                  </Label>
                  <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="tooltips" className="flex flex-col gap-1">
                    <span className="font-medium">Enable Tooltips</span>
                    <span className="text-sm text-muted-foreground">Show tooltips on hover for buttons</span>
                  </Label>
                  <Switch id="tooltips" checked={enableTooltips} onCheckedChange={setEnableTooltips} />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="slimline" className="flex flex-col gap-1">
                    <span className="font-medium">Slim Line Mode</span>
                    <span className="text-sm text-muted-foreground">Compact UI with reduced padding</span>
                  </Label>
                  <Switch id="slimline" checked={slimLineMode} onCheckedChange={setSlimLineMode} />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Landing Model</Label>
                  <Select value={defaultLandingSlug} onValueChange={setDefaultLandingSlug}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a model (Brand — Model)" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((d) => (
                        <SelectItem key={d.slug} value={d.slug}>{d.brandName} — {d.modelName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Temperature Units</Label>
                  <Select value={unitTemperature} onValueChange={setUnitTemperature}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C">°C</SelectItem>
                      <SelectItem value="F">°F</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="data-saver" className="flex flex-col gap-1">
                    <span className="font-medium">Data Saver</span>
                    <span className="text-sm text-muted-foreground">Reduce image/media usage</span>
                  </Label>
                  <Switch id="data-saver" checked={dataSaver} onCheckedChange={setDataSaver} />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="confirm-delete" className="flex flex-col gap-1">
                    <span className="font-medium">Confirm on Delete</span>
                    <span className="text-sm text-muted-foreground">Ask before deleting items</span>
                  </Label>
                  <Switch id="confirm-delete" checked={confirmOnDelete} onCheckedChange={setConfirmOnDelete} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveGeneral}>Save</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-semibold">Profile</h4>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={username} onChange={(e) => setUsername((e as any).target.value)} />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveUsername}>Save</Button>
                    <Button variant="ghost" onClick={() => { setUsername(""); }}>Clear</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} readOnly />
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-semibold">Security</h4>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Button onClick={handleResetPassword} disabled={!email}>Send Reset Email</Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3 md:col-span-2">
                <h4 className="font-semibold">Data</h4>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleExportData}>Export My Data</Button>
                  <Button variant="destructive" onClick={handleDeleteAccount}>Delete Account</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="about" className="space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Heat Pump Error Code Assistant</h3>
                  <div className="sm:hidden">
                    <ContactForm />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Heat Pump Error Code Assistant: Professional diagnostic tool for HVAC technicians.</p>
                <p className="text-sm text-muted-foreground">Features: AI diagnosis, offline mode, service history, cost estimation, QR scanning, photo analysis.</p>
              </div>
            </div>
            <Separator />
            <div className="text-sm">
              <p>
                Created by: <a href="https://jayreddin.github.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Jamie Reddin</a>, Version: {APP_VERSION}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
