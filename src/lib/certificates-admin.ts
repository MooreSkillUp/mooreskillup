import { useCallback, useEffect, useState } from "react";
import { authenticatedRequest, buildApiUrl } from "./authenticated-api";

export interface CertificateTemplate {
  institutionName: string;
  signatoryName: string;
  signatoryTitle: string;
  accentColor: string;
  signatureText: string;
  sealText: string;
  updatedAt?: string;
}

export interface AdminCertificate {
  id: string;
  courseTitle: string;
  studentName: string;
  certificateCode: string;
  issuedAt: string;
  verificationUrl: string;
  isRevoked: boolean;
}

export interface CertificateVerifyResult {
  valid: boolean;
  certificateCode?: string;
  studentName?: string;
  courseTitle?: string;
  issuedAt?: string;
  institution?: string;
}

/** Public verification — no auth required. */
export async function verifyCertificate(code: string): Promise<CertificateVerifyResult> {
  const response = await fetch(buildApiUrl(`/api/certificates/verify/${encodeURIComponent(code)}/`));
  if (!response.ok) return { valid: false };
  return (await response.json()) as CertificateVerifyResult;
}

export function useCertificateTemplate() {
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setTemplate(await authenticatedRequest<CertificateTemplate>("/api/admin/certificates/template/"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load template.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveTemplate = useCallback(async (patch: Partial<CertificateTemplate>) => {
    const updated = await authenticatedRequest<CertificateTemplate>(
      "/api/admin/certificates/template/",
      { method: "PATCH", body: JSON.stringify(patch) },
    );
    setTemplate(updated);
    return updated;
  }, []);

  return { template, isLoading, error, saveTemplate };
}

export function useAdminCertificates() {
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setCertificates(await authenticatedRequest<AdminCertificate[]>("/api/admin/certificates/"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load certificates.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setRevoked = useCallback(async (certificateId: string, revoke: boolean) => {
    const updated = await authenticatedRequest<AdminCertificate>(
      `/api/admin/certificates/${certificateId}/revoke/`,
      { method: "POST", body: JSON.stringify({ revoke }) },
    );
    setCertificates((current) => current.map((item) => (item.id === certificateId ? updated : item)));
    return updated;
  }, []);

  return { certificates, isLoading, error, refresh, setRevoked };
}
