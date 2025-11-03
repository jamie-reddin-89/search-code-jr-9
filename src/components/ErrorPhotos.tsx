import { useState, useEffect } from "react";
import * as React from "react";
const { useState, useEffect } = React;
import * as React from "react";
const { useState, useEffect } = React;
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { toast } from "sonner";
import { Trash2, Upload, Image as ImageIcon } from "lucide-react";

interface ErrorPhotosProps {
  systemName: string;
  errorCode: string;
  userId: string | undefined;
}

interface Photo {
  id: string;
  storage_path: string;
  description: string | null;
  created_at: string;
}

export function ErrorPhotos({ systemName, errorCode, userId }: ErrorPhotosProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchPhotos();
    }
  }, [systemName, errorCode, userId]);

  const fetchPhotos = async () => {
    const { data, error } = await (supabase as any)
      .from("error_photos" as any)
      .select("*")
      .eq("system_name", systemName)
      .eq("error_code", errorCode)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching photos:", error);
    } else {
      setPhotos(data || []);
    }
  };

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !userId) return;

    const file = event.target.files[0];
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("error-photos")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Failed to upload photo");
      console.error(uploadError);
      setUploading(false);
      return;
    }

    const { error: dbError } = await (supabase as any).from("error_photos" as any).insert({
      system_name: systemName,
      error_code: errorCode,
      storage_path: fileName,
      user_id: userId,
    });

    if (dbError) {
      toast.error("Failed to save photo record");
      console.error(dbError);
    } else {
      toast.success("Photo uploaded");
      fetchPhotos();
    }

    setUploading(false);
    event.target.value = "";
  };

  const deletePhoto = async (photo: Photo) => {
    const { error: storageError } = await supabase.storage
      .from("error-photos")
      .remove([photo.storage_path]);

    if (storageError) {
      toast.error("Failed to delete photo from storage");
      return;
    }

    const { error: dbError } = await (supabase as any)
      .from("error_photos" as any)
      .delete()
      .eq("id", photo.id)
      .eq("user_id", userId);

    if (dbError) {
      toast.error("Failed to delete photo record");
    } else {
      toast.success("Photo deleted");
      fetchPhotos();
    }
  };

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from("error-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  if (!userId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Photos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="file"
            accept="image/*"
            onChange={uploadPhoto}
            disabled={uploading}
            className="cursor-pointer"
          />
          {uploading && <p className="text-sm text-muted-foreground mt-2">Uploading...</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              <CardContent className="p-2">
                <div className="relative aspect-square">
                  <img
                    src={getPhotoUrl(photo.storage_path)}
                    alt={photo.description || "Error photo"}
                    className="w-full h-full object-cover rounded"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => deletePhoto(photo)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {photo.description && (
                  <p className="text-xs mt-2">{photo.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(photo.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No photos yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
