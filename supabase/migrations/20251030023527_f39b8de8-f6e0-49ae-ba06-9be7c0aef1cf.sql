-- Fix search analytics public exposure
-- Drop the public SELECT policy that allows anyone to view analytics
DROP POLICY IF EXISTS "Anyone can view analytics" ON public.search_analytics;

-- Create admin-only SELECT policy
CREATE POLICY "Admins can view analytics" 
ON public.search_analytics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Keep the public INSERT policy for tracking (already exists)
-- This allows the app to track searches without authentication
-- but restricts reading the data to admins only