import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Proforma, ProformaQuestion, Report, ReportAnswer } from '../types';
import { DEFAULT_PROFORMA_QUESTIONS } from '../utils/defaultProforma';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// Get proforma for a restaurant (falls back to default template)
export function useProforma(restaurantId: string) {
  return useQuery({
    queryKey: ['proforma', restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('proformas')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (data) return data as Proforma;

      // Return default template if none exists
      return {
        id: 'default',
        restaurant_id: restaurantId,
        title: 'Customer Experience Report',
        questions: DEFAULT_PROFORMA_QUESTIONS.map(q => ({ ...q, id: uuidv4() })),
        version: 1,
        created_at: new Date().toISOString(),
      } as Proforma;
    },
    enabled: !!restaurantId,
  });
}

// Save/update a proforma
export function useSaveProforma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (proforma: Omit<Proforma, 'created_at'>) => {
      if (proforma.id === 'default') {
        const { data, error } = await supabase
          .from('proformas')
          .insert({
            restaurant_id: proforma.restaurant_id,
            title: proforma.title,
            questions: proforma.questions,
            version: 1,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('proformas')
        .update({ questions: proforma.questions, title: proforma.title, version: proforma.version + 1 })
        .eq('id', proforma.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proforma', variables.restaurant_id] });
    },
  });
}

// Get or create a draft report for an assignment
export function useReport(assignmentId: string, dinerId: string, restaurantId: string) {
  return useQuery({
    queryKey: ['report', assignmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('diner_id', dinerId)
        .single();

      if (data) return data as Report;

      // Create a fresh draft
      const { data: created, error } = await supabase
        .from('reports')
        .insert({
          assignment_id: assignmentId,
          diner_id: dinerId,
          restaurant_id: restaurantId,
          answers: {},
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return created as Report;
    },
    enabled: !!assignmentId && !!dinerId && !!restaurantId,
  });
}

// Auto-save draft answers
export function useSaveDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, answers }: { reportId: string; answers: Record<string, ReportAnswer> }) => {
      const { error } = await supabase
        .from('reports')
        .update({ answers })
        .eq('id', reportId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report'] });
    },
  });
}

// Submit a completed report
export function useSubmitReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
    },
  });
}

// Upload a photo for a report
export function useUploadPhoto() {
  return useMutation({
    mutationFn: async ({ reportId, uri }: { reportId: string; uri: string }) => {
      const filename = `${reportId}/${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('report-photos')
        .upload(filename, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('report_photos')
        .insert({ report_id: reportId, storage_path: filename });

      if (dbError) throw dbError;

      return filename;
    },
  });
}

// Get photos for a report
export function useReportPhotos(reportId: string) {
  return useQuery({
    queryKey: ['report-photos', reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_photos')
        .select('*')
        .eq('report_id', reportId)
        .order('uploaded_at', { ascending: true });
      if (error) throw error;

      // Get signed URLs for each photo
      const withUrls = await Promise.all(
        (data ?? []).map(async (photo: any) => {
          const { data: urlData } = await supabase.storage
            .from('report-photos')
            .createSignedUrl(photo.storage_path, 3600);
          return { ...photo, url: urlData?.signedUrl };
        })
      );
      return withUrls;
    },
    enabled: !!reportId && reportId !== '',
  });
}
