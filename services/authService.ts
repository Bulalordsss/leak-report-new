import { api } from "./api";
import { LoginResponse } from "../utils/auth";

export const loginRequest = async (
  username: string,
  password: string,
  opts?: { bearer?: string }
) => {
  const url = "/dcwd-gis/api/v1/admin/userlogin/login";
  const payload = { username, password };
  const headers: Record<string, string> = { accept: "text/plain" };
  if (opts?.bearer) headers["Authorization"] = `Bearer ${opts.bearer}`;

  const response = await api.post<LoginResponse>(url, payload, { headers });
  return response.data;
};
