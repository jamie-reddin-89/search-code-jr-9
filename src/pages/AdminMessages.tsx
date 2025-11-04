import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, Mail, RefreshCw, Trash2, Download } from "lucide-react";
import TopRightControls from "@/components/TopRightControls";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const subscription = (supabase as any)
      .channel("contact_messages_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contact_messages",
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      setDeleting(true);
      const { error } = await (supabase as any)
        .from("contact_messages")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setMessages(messages.filter((m) => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      toast({
        title: "Success",
        description: "Message deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadMessages = () => {
    const csv = convertToCSV(messages);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `messages-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: ContactMessage[]): string => {
    const headers = ["ID", "Name", "Email", "Subject", "Message", "Created At"];
    const rows = data.map((msg) => [
      msg.id,
      `"${msg.name.replace(/"/g, '""')}"`,
      msg.email,
      `"${msg.subject.replace(/"/g, '""')}"`,
      `"${msg.message.replace(/"/g, '""')}"`,
      msg.created_at,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  };

  if (loading && messages.length === 0) {
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
      <header className="flex items-center justify-between mb-8 w-full max-w-6xl">
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
          <Mail size={20} /> Messages
        </h1>
        <div className="w-10" />
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 border rounded p-4 max-h-[70vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Messages ({messages.length})</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMessages}
              disabled={loading}
              aria-label="Refresh messages"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="overflow-auto flex-1" style={{ scrollbarWidth: "none" }}>
            <div className="space-y-1">
              {messages.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 text-center">No messages</div>
              ) : (
                messages.map((msg) => (
                  <button
                    key={msg.id}
                    className={`w-full text-left home-button p-3 rounded text-sm border ${
                      selectedMessage?.id === msg.id ? "border-primary border-2" : ""
                    }`}
                    onClick={() => setSelectedMessage(msg)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{msg.name}</span>
                      <span className="text-xs text-muted-foreground">{msg.email}</span>
                    </div>
                    <div className="text-xs font-medium truncate">{msg.subject}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(msg.created_at).toLocaleString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="border rounded p-4 min-h-[70vh] flex flex-col gap-4">
          <div className="flex-1 overflow-auto pr-2" style={{ scrollbarWidth: "none" }}>
            {!selectedMessage ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Select a message to view details
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-2">From</h3>
                  <p className="text-sm">{selectedMessage.name}</p>
                  <p className="text-xs text-muted-foreground break-all">{selectedMessage.email}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">Subject</h3>
                  <p className="text-sm">{selectedMessage.subject}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">Message</h3>
                  <p className="text-sm break-words whitespace-pre-wrap bg-muted p-2 rounded">
                    {selectedMessage.message}
                  </p>
                </div>

                <div>
                  <span className="font-medium text-xs">Received:</span>
                  <div className="text-xs text-muted-foreground">
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                  disabled={deleting}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Message
                </Button>
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-2">
            <Button
              onClick={handleDownloadMessages}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
