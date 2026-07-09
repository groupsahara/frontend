import axios from "axios";

// Unauthenticated client for the public funnel pages (/forms/[slug],
// /project-preview/[slug]). Same host derivation as apiClient.ts.
const PANEL_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

const publicApiClient = axios.create({
  baseURL: PANEL_BASE.replace(/\/api\/?$/, ""),
  headers: {
    "Content-Type": "application/json",
  },
});

export default publicApiClient;
