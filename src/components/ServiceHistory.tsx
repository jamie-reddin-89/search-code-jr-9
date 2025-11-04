import { useState, useEffect } from "react";
import { History, Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { auth } from "@/services/supabase/auth";
import { database } from "@/services/supabase/database";
import { useToast } from "./ui/use-toast";
import { Card } from "./ui/card";
import { format } from "date-fns";

interface ServiceRecord {
  id: string;
  system_name: string;
  error_code: string;
  repair_date: string;
  parts_replaced: any;
  labor_hours: number;
  total_cost: number;
  notes: string;
}

export const ServiceHistory = () => {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    system_name: "",
    error_code: "",
    repair_date: new Date().toISOString().split("T")[0],
    parts_replaced: "",
    labor_hours: "",
    total_cost: "",
    notes: "",
  });

  useEffect(() => {
    loadServiceHistory();
  }, []);

  const loadServiceHistory = async () => {
    const { data, error } = await database
      .from("service_history")
      .select("*")
      .order("repair_date", { ascending: false });

    if (error) {
      toast({
        title: "Error loading service history",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setRecords(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingNew(true);

    const user = await auth.getCurrentUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save service records",
        variant: "destructive",
      });
      setIsAddingNew(false);
      return;
    }

    const parts = formData.parts_replaced
      ? formData.parts_replaced.split(",").map((p) => {
          const [name, quantity, cost] = p.trim().split("|");
          return {
            name: name || "",
            quantity: parseFloat(quantity || "1"),
            cost: parseFloat(cost || "0"),
          };
        })
      : [];

    const { error } = await database.from("service_history").insert({
      user_id: user.id,
      system_name: formData.system_name,
      error_code: formData.error_code,
      repair_date: formData.repair_date,
      parts_replaced: parts,
      labor_hours: parseFloat(formData.labor_hours) || 0,
      total_cost: parseFloat(formData.total_cost) || 0,
      notes: formData.notes,
    });

    if (error) {
      toast({
        title: "Error saving record",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Service record saved",
        description: "Your service record has been saved successfully",
      });
      setFormData({
        system_name: "",
        error_code: "",
        repair_date: new Date().toISOString().split("T")[0],
        parts_replaced: "",
        labor_hours: "",
        total_cost: "",
        notes: "",
      });
      loadServiceHistory();
    }

    setIsAddingNew(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await database
      .from("service_history")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error deleting record",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Record deleted" });
      loadServiceHistory();
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="View service history">
          <History className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service History</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="system_name">System Name</Label>
              <Input
                id="system_name"
                value={formData.system_name}
                onChange={(e) =>
                  setFormData({ ...formData, system_name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="error_code">Error Code</Label>
              <Input
                id="error_code"
                value={formData.error_code}
                onChange={(e) =>
                  setFormData({ ...formData, error_code: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="repair_date">Repair Date</Label>
              <Input
                id="repair_date"
                type="date"
                value={formData.repair_date}
                onChange={(e) =>
                  setFormData({ ...formData, repair_date: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="labor_hours">Labor Hours</Label>
              <Input
                id="labor_hours"
                type="number"
                step="0.5"
                value={formData.labor_hours}
                onChange={(e) =>
                  setFormData({ ...formData, labor_hours: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="total_cost">Total Cost (€)</Label>
              <Input
                id="total_cost"
                type="number"
                step="0.01"
                value={formData.total_cost}
                onChange={(e) =>
                  setFormData({ ...formData, total_cost: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="parts_replaced">
              Parts Replaced (format: name|quantity|cost, separated by commas)
            </Label>
            <Input
              id="parts_replaced"
              value={formData.parts_replaced}
              onChange={(e) =>
                setFormData({ ...formData, parts_replaced: e.target.value })
              }
              placeholder="Heat Exchanger|1|350, Sensor|2|25"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isAddingNew} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Service Record
          </Button>
        </form>

        <div className="space-y-3">
          <h3 className="font-semibold">Recent Service Records</h3>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No service records yet
            </p>
          ) : (
            records.map((record) => (
              <Card key={record.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {record.system_name} - {record.error_code}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(record.repair_date), "PPP")}
                    </p>
                    {record.labor_hours > 0 && (
                      <p className="text-sm">
                        Labor: {record.labor_hours} hours
                      </p>
                    )}
                    {record.total_cost > 0 && (
                      <p className="text-sm">Cost: €{record.total_cost}</p>
                    )}
                    {record.notes && (
                      <p className="text-sm text-muted-foreground">
                        {record.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(record.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
