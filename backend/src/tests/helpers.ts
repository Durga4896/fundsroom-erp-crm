/**
 * Test helpers: login and get an auth token for a given role.
 */
import request from "supertest";

const BASE_URL = "http://localhost:5001";

export const loginAs = async (
  role: "ADMIN" | "OPERATIONS" | "SALES"
): Promise<string> => {
  const credentials: Record<string, { email: string; password: string }> = {
    ADMIN: {
      email: "admin@fundsroom.com",
      password: process.env.ADMIN_PASSWORD || "Admin1234",
    },
    OPERATIONS: {
      email: "operations@fundsroom.com",
      password: process.env.OPERATIONS_PASSWORD || "Operations1234",
    },
    SALES: {
      email: "sales@fundsroom.com",
      password: process.env.SALES_PASSWORD || "Sales1234",
    },
  };

  const { email, password } = credentials[role];
  const res = await request(BASE_URL)
    .post("/api/auth/login")
    .send({ email, password });

  if (!res.body?.data?.token) {
    throw new Error(`Failed to login as ${role}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token;
};

export const api = (token: string) => ({
  get: (path: string) =>
    request(BASE_URL)
      .get(path)
      .set("Authorization", `Bearer ${token}`),

  post: (path: string) =>
    request(BASE_URL)
      .post(path)
      .set("Authorization", `Bearer ${token}`),

  patch: (path: string) =>
    request(BASE_URL)
      .patch(path)
      .set("Authorization", `Bearer ${token}`),

  put: (path: string) =>
    request(BASE_URL)
      .put(path)
      .set("Authorization", `Bearer ${token}`),

  delete: (path: string) =>
    request(BASE_URL)
      .delete(path)
      .set("Authorization", `Bearer ${token}`),
});
