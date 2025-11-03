-- Service History Log table
CREATE TABLE public.service_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  system_name TEXT NOT NULL,
  error_code TEXT NOT NULL,
  repair_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parts_replaced JSONB DEFAULT '[]'::jsonb,
  labor_hours DECIMAL(5,2),
  total_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own service history"
ON public.service_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Equipment Scanner table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  qr_code TEXT UNIQUE NOT NULL,
  system_name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  installation_date DATE,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own equipment"
ON public.equipment
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Cost Estimates table
CREATE TABLE public.cost_estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  error_code TEXT NOT NULL,
  system_name TEXT NOT NULL,
  parts_cost DECIMAL(10,2) DEFAULT 0,
  labor_hours DECIMAL(5,2) DEFAULT 0,
  labor_rate DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cost_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cost estimates"
ON public.cost_estimates
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Diagnostic Photos table
CREATE TABLE public.diagnostic_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  ai_analysis TEXT,
  equipment_identified TEXT,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnostic_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own diagnostic photos"
ON public.diagnostic_photos
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for diagnostic photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('diagnostic-photos', 'diagnostic-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for diagnostic photos
CREATE POLICY "Users can upload diagnostic photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'diagnostic-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own diagnostic photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'diagnostic-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own diagnostic photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'diagnostic-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Trigger for updating updated_at columns
CREATE TRIGGER update_service_history_updated_at
BEFORE UPDATE ON public.service_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();