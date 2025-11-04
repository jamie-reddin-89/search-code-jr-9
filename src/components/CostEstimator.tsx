import { useState } from "react";
import { Calculator } from "lucide-react";
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
import { Card } from "./ui/card";
import { auth } from "@/services/supabase/auth";
import { database } from "@/services/supabase/database";
import { useToast } from "./ui/use-toast";

export const CostEstimator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    error_code: "",
    system_name: "",
    parts_cost: "",
    labor_hours: "",
    labor_rate: "75",
  });

  const totalCost =
    parseFloat(formData.parts_cost || "0") +
    parseFloat(formData.labor_hours || "0") *
      parseFloat(formData.labor_rate || "0");

  const handleSave = async () => {
    const user = await auth.getCurrentUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save estimates",
        variant: "destructive",
      });
      return;
    }

    const { error } = await database.from("cost_estimates").insert({
      user_id: user.id,
      error_code: formData.error_code,
      system_name: formData.system_name,
      parts_cost: parseFloat(formData.parts_cost || "0"),
      labor_hours: parseFloat(formData.labor_hours || "0"),
      labor_rate: parseFloat(formData.labor_rate || "0"),
      total_cost: totalCost,
    });

    if (error) {
      toast({
        title: "Error saving estimate",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Estimate saved",
        description: "Cost estimate has been saved successfully",
      });
      setFormData({
        error_code: "",
        system_name: "",
        parts_cost: "",
        labor_hours: "",
        labor_rate: "75",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Estimate repair costs">
          <Calculator className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cost Estimator</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="system_name">System Name</Label>
              <Input
                id="system_name"
                value={formData.system_name}
                onChange={(e) =>
                  setFormData({ ...formData, system_name: e.target.value })
                }
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
              />
            </div>
          </div>

          <div>
            <Label htmlFor="parts_cost">Parts Cost (€)</Label>
            <Input
              id="parts_cost"
              type="number"
              step="0.01"
              value={formData.parts_cost}
              onChange={(e) =>
                setFormData({ ...formData, parts_cost: e.target.value })
              }
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="labor_rate">Labor Rate (€/hr)</Label>
              <Input
                id="labor_rate"
                type="number"
                step="1"
                value={formData.labor_rate}
                onChange={(e) =>
                  setFormData({ ...formData, labor_rate: e.target.value })
                }
              />
            </div>
          </div>

          <Card className="p-4 bg-primary/5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Parts:</span>
                <span>€{parseFloat(formData.parts_cost || "0").toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Labor:</span>
                <span>
                  €
                  {(
                    parseFloat(formData.labor_hours || "0") *
                    parseFloat(formData.labor_rate || "0")
                  ).toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total Estimate:</span>
                <span>€{totalCost.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <Button onClick={handleSave} className="w-full">
            Save Estimate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
