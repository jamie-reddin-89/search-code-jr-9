import { useState } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { Card } from "./ui/card";

export const PhotoDiagnosis = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [analysis, setAnalysis] = useState<string>("");
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzePhoto = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use photo diagnosis",
        variant: "destructive",
      });
      setIsAnalyzing(false);
      return;
    }

    try {
      // Upload photo to storage
      const fileName = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("diagnostic-photos")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Convert image to base64 for AI analysis
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        // Call edge function for AI analysis
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
          "photo-diagnosis",
          {
            body: { imageBase64: base64Image },
          }
        );

        if (analysisError) throw analysisError;

        const aiAnalysis = analysisData?.analysis || "Unable to analyze the image";
        setAnalysis(aiAnalysis);

        // Save to database
        await supabase.from("diagnostic_photos").insert({
          user_id: user.id,
          storage_path: fileName,
          ai_analysis: aiAnalysis,
        });

        toast({
          title: "Analysis complete",
          description: "Photo has been analyzed successfully",
        });
      };
    } catch (error) {
      console.error("Error analyzing photo:", error);
      toast({
        title: "Analysis failed",
        description: "Could not analyze the photo",
        variant: "destructive",
      });
    }

    setIsAnalyzing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Upload photo for diagnosis">
          <Camera className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Photo Diagnosis</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-64 mx-auto rounded"
              />
            ) : (
              <div className="space-y-2">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Upload a photo of the equipment
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => document.getElementById("photo-input")?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Select Photo
            </Button>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              onClick={analyzePhoto}
              disabled={!selectedFile || isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Photo"
              )}
            </Button>
          </div>

          {analysis && (
            <Card className="p-4">
              <h3 className="font-semibold mb-2">AI Analysis:</h3>
              <p className="text-sm whitespace-pre-wrap">{analysis}</p>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
