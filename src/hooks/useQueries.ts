import { useQuery } from "@tanstack/react-query";
import {
  fetchConcerns,
  fetchProcedures,
  fetchProcedureById,
  fetchProceduresByConcern,
  fetchProviders,
  fetchProviderById,
  fetchProvidersByIds,
  fetchProvidersByProcedure,
  fetchReviewsByProvider,
  fetchReviewsByProcedure,
  listProviderImages,
} from "@/lib/api";

export function useConcerns() {
  return useQuery({
    queryKey: ["concerns"],
    queryFn: fetchConcerns,
  });
}

export function useProcedures() {
  return useQuery({
    queryKey: ["procedures"],
    queryFn: fetchProcedures,
  });
}

export function useProcedureById(id: string | undefined) {
  return useQuery({
    queryKey: ["procedure", id],
    queryFn: () => fetchProcedureById(id!),
    enabled: !!id,
  });
}

export function useProceduresByConcern(concernId: string | undefined) {
  return useQuery({
    queryKey: ["procedures", "concern", concernId],
    queryFn: () => fetchProceduresByConcern(concernId!),
    enabled: !!concernId,
  });
}

export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });
}

export function useProviderById(id: string | undefined) {
  return useQuery({
    queryKey: ["provider", id],
    queryFn: () => fetchProviderById(id!),
    enabled: !!id,
  });
}

export function useProvidersByIds(ids: string[]) {
  return useQuery({
    queryKey: ["providers", "ids", ids],
    queryFn: () => fetchProvidersByIds(ids),
    enabled: ids.length >= 2,
  });
}

export function useProvidersByProcedure(procedureId: string | undefined) {
  return useQuery({
    queryKey: ["providers", "procedure", procedureId],
    queryFn: () => fetchProvidersByProcedure(procedureId!),
    enabled: !!procedureId,
  });
}

export function useReviewsByProvider(providerId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", "provider", providerId],
    queryFn: () => fetchReviewsByProvider(providerId!),
    enabled: !!providerId,
  });
}

export function useReviewsByProcedure(procedureId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", "procedure", procedureId],
    queryFn: () => fetchReviewsByProcedure(procedureId!),
    enabled: !!procedureId,
  });
}

export function useProviderImages(providerId: string | undefined) {
  return useQuery({
    queryKey: ["providerImages", providerId],
    queryFn: () => listProviderImages(providerId!),
    enabled: !!providerId,
  });
}
