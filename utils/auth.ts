export interface BackendUser {
  id: string;
  fName: string;
  mName: string;
  lName: string;
  username: string | null;
  accesslevel: string;
  deptId: number;
  empId: string;
}

export interface LoginResponse {
  statusCode: number;
  message: string;
  data: BackendUser & {
    token: string;
    refreshToken: string;
    tokenExpiry: string;
  };
}