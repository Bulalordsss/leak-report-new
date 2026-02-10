import { api } from './api';

export interface LeakReport {
  id: string;
  reportedBy: string;
  leakTypeId: number;
  refNo: string;
  reporterName: string;
  jmsCode: string;
  reportedLocation: string;
  reportedLandmark: string;
  referenceMtr: string;
  reportedNumber: string;
  dtReported: string;
  referenceRecaddrs: string | null;
  dispatchStat: number;
  reportType: number;
  priority: number;
  dmaCode: string;
  leakCovering: number;
  geometry: string | null;
  remarks: string;
  leakImage1: string;
  leakImage2: string;
  landmarkImage: string;
}

export interface LeakReportCounts {
  reportedCount: number;
  dispatchedCount: number;
  repairedCount: number;
  scheduledCount: number;
  turnoverCount: number;
  afterCount: number;
  notFoundCount: number;
  alreadyRepaired: number;
  totalCount: number;
}

export interface LeakReportsResponse {
  statusCode: number;
  message: string;
  data: {
    reports: LeakReport[];
  } & LeakReportCounts;
}

/**
 * Fetch leak reports for the current user by employee ID
 */
export async function fetchLeakReports(empId: string): Promise<LeakReportsResponse> {
  const response = await api.get<LeakReportsResponse>(
    `/dcwd-gis/api/v1/admin/GetLeakReports/mobile/user/${empId}`
  );
  return response.data;
}
