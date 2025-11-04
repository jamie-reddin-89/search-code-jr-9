import { useEffect, useState } from "react";
import { Lightbulb, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Card } from "./ui/card";
import { database } from "@/services/supabase/database";

interface Brand {
  id: string;
  name: string;
}

interface Model {
  id: string;
  brand_id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface ErrorCode {
  code: string;
  meaning: string;
  solution: string;
  system_name: string;
}

export const TroubleshootingWizard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorCodes, setErrorCodes] = useState<ErrorCode[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedBrand) {
      loadModels(selectedBrand);
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedModel && selectedBrand) {
      loadErrorCodes(selectedBrand, selectedModel);
    }
  }, [selectedModel, selectedBrand]);

  const loadInitialData = async () => {
    try {
      const [brandsResult, categoriesResult] = await Promise.all([
        database.from("brands").select("*").order("name"),
        database.from("categories").select("*").order("name"),
      ]);

      if (brandsResult.data) setBrands(brandsResult.data);
      if (categoriesResult.data) setCategories(categoriesResult.data);
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  };

  const loadModels = async (brandId: string) => {
    try {
      const { data } = await database
        .from("models")
        .select("*")
        .eq("brand_id", brandId)
        .order("name");

      if (data) setModels(data);
    } catch (error) {
      console.error("Error loading models:", error);
    }
  };

  const loadErrorCodes = async (brandId: string, modelId: string) => {
    try {
      const { data } = await database
        .from("error_codes_db")
        .select("code, meaning, solution, system_name")
        .order("code");

      if (data) setErrorCodes(data);
    } catch (error) {
      console.error("Error loading error codes:", error);
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && (!selectedBrand || !selectedModel || !selectedCategory || !errorCode)) {
      return;
    }

    const followUpSteps = 3;
    if (currentStep < followUpSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      generateDiagnosis();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateDiagnosis = () => {
    const selectedErrorCode = errorCodes.find((ec) => ec.code === errorCode);
    const selectedBrandName = brands.find((b) => b.id === selectedBrand)?.name || "Unknown Brand";
    const selectedModelName = models.find((m) => m.id === selectedModel)?.name || "Unknown Model";

    let result = `Equipment: ${selectedBrandName} ${selectedModelName}\n`;
    result += `Category: ${categories.find((c) => c.id === selectedCategory)?.name || "Unknown"}\n`;
    result += `\nError Code: ${errorCode}\n`;

    if (selectedErrorCode) {
      result += `\nMeaning: ${selectedErrorCode.meaning}\n`;
      result += `\nSolution:\n${selectedErrorCode.solution}\n`;
    } else {
      result += "\nNo specific error code information found.\n";
    }

    result += "\nAdditional Troubleshooting Steps:\n";
    if (answers.issue === "heating") {
      result += "• Check outdoor unit for ice buildup\n";
      result += "• Verify refrigerant levels\n";
      result += "• Inspect compressor operation\n";
    } else if (answers.issue === "cooling") {
      result += "• Check air filters\n";
      result += "• Verify outdoor unit operation\n";
      result += "• Check refrigerant pressure\n";
    } else if (answers.issue === "noise") {
      result += "• Inspect fan blades for damage\n";
      result += "• Check mounting bolts\n";
      result += "• Verify compressor operation\n";
    } else if (answers.issue === "leak") {
      result += "• Inspect condensate drain\n";
      result += "• Check pipe connections\n";
      result += "• Verify pressure relief valve\n";
    }

    if (answers.onset === "sudden") {
      result += "\nPriority: Check for electrical issues and look for recent system changes\n";
    }

    result += "\nRecommended: Contact certified technician if issue persists or worsens";

    setDiagnosis(result);
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setSelectedBrand("");
    setSelectedModel("");
    setSelectedCategory("");
    setErrorCode("");
    setAnswers({});
    setDiagnosis("");
  };

  const filteredErrorCodes = errorCode
    ? errorCodes.filter((ec) => ec.code.toLowerCase().includes(errorCode.toLowerCase()))
    : [];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetWizard();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open troubleshooting wizard">
          <Lightbulb className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Troubleshooting Wizard</DialogTitle>
        </DialogHeader>

        {!diagnosis ? (
          <div className="space-y-6">
            {currentStep === 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Step 1: Select Equipment</h3>

                <div className="space-y-2">
                  <Label htmlFor="brand-select">Brand</Label>
                  <select
                    id="brand-select"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Select a brand...</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model-select">Model</Label>
                  <select
                    id="model-select"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={!selectedBrand}
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground disabled:opacity-50"
                  >
                    <option value="">Select a model...</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category-select">Equipment Category</Label>
                  <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Select a category...</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="error-code-input">Error Code</Label>
                  <input
                    id="error-code-input"
                    type="text"
                    value={errorCode}
                    onChange={(e) => setErrorCode(e.target.value.toUpperCase())}
                    placeholder="Enter error code (e.g., E01)"
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  />
                  {filteredErrorCodes.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto border rounded p-2 bg-muted">
                      {filteredErrorCodes.map((code) => (
                        <button
                          key={code.code}
                          onClick={() => setErrorCode(code.code)}
                          className="block w-full text-left px-2 py-1 hover:bg-background rounded text-sm"
                        >
                          {code.code}: {code.meaning}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Step 2: What type of issue are you experiencing?</h3>
                <RadioGroup
                  value={answers.issue || ""}
                  onValueChange={(value) => setAnswers({ ...answers, issue: value })}
                >
                  {[
                    { value: "heating", label: "No heating" },
                    { value: "cooling", label: "No cooling" },
                    { value: "noise", label: "Unusual noise" },
                    { value: "leak", label: "Water leak" },
                    { value: "error", label: "Error code displayed" },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="cursor-pointer flex-1">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Step 3: When did the problem start?</h3>
                <RadioGroup
                  value={answers.onset || ""}
                  onValueChange={(value) => setAnswers({ ...answers, onset: value })}
                >
                  {[
                    { value: "sudden", label: "Suddenly/immediately" },
                    { value: "gradual", label: "Gradually over time" },
                    { value: "intermittent", label: "Comes and goes" },
                    { value: "startup", label: "After installation/startup" },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="cursor-pointer flex-1">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Step 4: Have you checked the basics?</h3>
                <RadioGroup
                  value={answers.basics || ""}
                  onValueChange={(value) => setAnswers({ ...answers, basics: value })}
                >
                  {[
                    { value: "power", label: "Power supply is on" },
                    { value: "thermostat", label: "Thermostat set correctly" },
                    { value: "filters", label: "Filters are clean" },
                    { value: "breaker", label: "Circuit breaker not tripped" },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="cursor-pointer flex-1">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={
                  currentStep === 0 &&
                  (!selectedBrand || !selectedModel || !selectedCategory || !errorCode)
                }
              >
                {currentStep === 3 ? "Get Diagnosis" : "Next"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Diagnosis & Recommendations:</h3>
              <pre className="whitespace-pre-wrap text-sm">{diagnosis}</pre>
            </Card>
            <Button onClick={resetWizard} className="w-full">
              Start New Diagnosis
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
