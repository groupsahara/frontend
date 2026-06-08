/**
 * Typed API surface for the app. Every function here goes through `apiClient`
 * and is meant to be consumed by TanStack Query (`useQuery` / `useMutation`).
 */
import { apiClient, API_BASE_URL, downloadFile, uploadFile } from "./apiClient";

/* ============================== Auth ==================================== */

export type Role = "USER" | "SERVICE_PROFESSIONAL" | "ADMIN" | "SUPER_ADMIN";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AdminUser {
  id: number;
  email: string | null;
  mobile: string | null;
  name: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpireTime: number;
  sessionId: string;
  user: AdminUser;
}

export const authApi = {
  /** POST /v1/admin/login — email + password, ADMIN / SUPER_ADMIN only. */
  login: (body: LoginRequest) =>
    apiClient.post<LoginResponse>("/v1/admin/login", body, { skipAuth: true }),

  /** POST /v1/admin/logout — destroys the current session. */
  logout: (sessionId: string) =>
    apiClient.post<{ message: string }>("/v1/admin/logout", { sessionId }),

  /** GET /v1/admin/me — the authenticated admin profile. */
  me: () => apiClient.get<AdminUser>("/v1/admin/me"),
};

/** URL the "Continue with Google" button redirects to, to start OAuth. */
export const GOOGLE_AUTH_URL =
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL ?? `${API_BASE_URL}/v1/auth/google`;

/* ============================ Dashboard ================================= */
/*
 * The analytics endpoints are not implemented on the backend yet, so these
 * functions return shaped sample data. They are still fully query-driven:
 * swap each body for the commented `apiClient.get(...)` call once the
 * backend routes exist — the components don't change.
 */

export interface StatCardData {
  key: string;
  label: string;
  value: string;
  /** percentage change vs previous period; positive = up */
  delta: number;
  spark: number[];
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  orders: number;
}

export interface TrafficSlice {
  label: string;
  value: number;
}

export interface RecentOrder {
  id: string;
  customer: string;
  service: string;
  amount: number;
  status: "Completed" | "Pending" | "Cancelled";
  date: string;
}

export interface DashboardOverview {
  stats: StatCardData[];
  revenue: RevenuePoint[];
  traffic: TrafficSlice[];
  recentOrders: RecentOrder[];
}

function delay<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const overviewSample: DashboardOverview = {
  stats: [
    {
      key: "revenue",
      label: "Total Revenue",
      value: "₹4,82,900",
      delta: 12.5,
      spark: [12, 18, 14, 22, 19, 28, 26, 34],
    },
    {
      key: "orders",
      label: "Bookings",
      value: "1,284",
      delta: 8.2,
      spark: [30, 26, 32, 28, 35, 31, 38, 42],
    },
    {
      key: "users",
      label: "Active Users",
      value: "9,531",
      delta: 3.1,
      spark: [20, 22, 21, 25, 24, 27, 29, 31],
    },
    {
      key: "refunds",
      label: "Refund Rate",
      value: "1.8%",
      delta: -0.4,
      spark: [8, 7, 9, 6, 5, 6, 4, 3],
    },
  ],
  revenue: [
    { month: "Jan", revenue: 32000, orders: 210 },
    { month: "Feb", revenue: 41000, orders: 248 },
    { month: "Mar", revenue: 38500, orders: 232 },
    { month: "Apr", revenue: 52000, orders: 301 },
    { month: "May", revenue: 47800, orders: 288 },
    { month: "Jun", revenue: 61200, orders: 356 },
    { month: "Jul", revenue: 58400, orders: 339 },
    { month: "Aug", revenue: 72500, orders: 401 },
  ],
  traffic: [
    { label: "Organic", value: 42 },
    { label: "Direct", value: 26 },
    { label: "Referral", value: 18 },
    { label: "Social", value: 14 },
  ],
  recentOrders: [
    {
      id: "#RC-10293",
      customer: "Aarav Sharma",
      service: "Deep Home Cleaning",
      amount: 2499,
      status: "Completed",
      date: "Jun 06, 2026",
    },
    {
      id: "#RC-10292",
      customer: "Diya Patel",
      service: "AC Repair",
      amount: 1299,
      status: "Pending",
      date: "Jun 06, 2026",
    },
    {
      id: "#RC-10291",
      customer: "Vivaan Mehta",
      service: "Electrician Visit",
      amount: 799,
      status: "Completed",
      date: "Jun 05, 2026",
    },
    {
      id: "#RC-10290",
      customer: "Ananya Iyer",
      service: "Salon at Home",
      amount: 1899,
      status: "Cancelled",
      date: "Jun 05, 2026",
    },
    {
      id: "#RC-10289",
      customer: "Kabir Singh",
      service: "Plumbing",
      amount: 649,
      status: "Completed",
      date: "Jun 04, 2026",
    },
  ],
};

export const dashboardApi = {
  /** GET /v1/admin/dashboard/overview (sample data for now). */
  getOverview: () =>
    // return apiClient.get<DashboardOverview>("/v1/admin/dashboard/overview");
    delay(overviewSample),
};

/* ============================== Vendors ================================= */

export type VendorStatus = "ACTIVE" | "AWAITING_APPROVAL" | "BLOCKED";

export interface Vendor {
  vendorId: number;
  name: string;
  email: string | null;
  mobile: string | null;
  icon: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  categoryId: number | null;
  isOpen: boolean;
  status: VendorStatus;
  offersServices: boolean;
  canAddCategory: boolean;
  commissionPercentage: number;
  createdAt: string;
  updatedAt: string;
  servicesCount: number;
}

export interface VendorListResponse {
  vendors: Vendor[];
  stats: {
    totalVendors: number;
    openVendors: number;
    totalServices: number;
    activeVendors: number;
  };
  tabs: { active: number; awaitingApproval: number; blocked: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface VendorInput {
  name: string;
  email?: string;
  mobile?: string;
  icon?: string;
  description?: string;
  address?: string;
  city?: string;
  isOpen?: boolean;
  status?: VendorStatus;
  offersServices?: boolean;
  canAddCategory?: boolean;
  commissionPercentage?: number;
}

export interface VendorListParams {
  status?: VendorStatus;
  search?: string;
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "";
  const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  return `?${qs}`;
}

export interface VendorWithCategory extends Vendor {
  category?: { categoryId: number; name: string } | null;
}

export const vendorApi = {
  list: (params: VendorListParams = {}) =>
    apiClient.get<VendorListResponse>(
      `/v1/vendor${toQueryString({ status: params.status, search: params.search })}`,
    ),
  get: (id: number) => apiClient.get<VendorWithCategory>(`/v1/vendor/${id}`),
  create: (body: VendorInput) => apiClient.post<Vendor>("/v1/vendor", body),
  update: (id: number, body: Partial<VendorInput>) =>
    apiClient.patch<Vendor>(`/v1/vendor/${id}`, body),
  remove: (id: number) => apiClient.delete<{ message: string }>(`/v1/vendor/${id}`),
};

/* ============================= Categories =============================== */

export interface Category {
  categoryId: number;
  name: string;
}

export interface CategoryInput {
  name: string;
  description?: string;
  /** Parent category id; omit/0 for a top-level category. */
  parentId?: number | null;
  /** Image file — required on create, optional on update. */
  image?: File | null;
}

function categoryFormData(body: CategoryInput): FormData {
  const fd = new FormData();
  fd.append("name", body.name);
  if (body.description) fd.append("description", body.description);
  if (body.parentId != null) fd.append("parentId", String(body.parentId));
  if (body.image) fd.append("catagoryImage", body.image);
  return fd;
}

export const categoryApi = {
  // GET /v1/catagories (public) — returns the full category tree.
  list: () => apiClient.get<Category[]>("/v1/catagories"),

  /** POST /v1/catagories/create-categories — multipart, image required. */
  create: (body: CategoryInput) =>
    uploadFile<CategoryTreeNode>(
      "/v1/catagories/create-categories",
      categoryFormData(body),
    ),

  /** PATCH /v1/catagories/:id — multipart, image optional. */
  update: (id: number, body: CategoryInput) =>
    uploadFile<CategoryTreeNode>(`/v1/catagories/${id}`, categoryFormData(body), "PATCH"),

  /** DELETE /v1/catagories/service-categories/:id */
  remove: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/catagories/service-categories/${id}`),
};

/* ====================== Services (catalog) & variants =================== */

export interface ServiceVariant {
  variantId: number;
  serviceId: number;
  name: string;
  price: number;
  durationMinutes: number | null;
  profileImage: string | null;
}

export interface CatalogService {
  serviceId: number;
  name: string;
  description: string | null;
  basePrice: number | null;
  categoryId: number;
  vendorId: number | null;
  durationMinutes: number | null;
  isActive: boolean;
  isFeatured: boolean;
  profileImage: string | null;
  createdAt: string;
  category?: { categoryId: number; name: string } | null;
  vendor?: { vendorId: number; name: string } | null;
  variantsCount?: number;
  variants?: ServiceVariant[];
}

export interface ServiceListResponse {
  services: CatalogService[];
  stats: {
    totalServices: number;
    publishedServices: number;
    featuredServices: number;
    newServices: number;
  };
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ServiceVariantInput {
  name: string;
  price: number;
  durationMinutes?: number;
}

export interface ServiceInput {
  name: string;
  categoryId: number;
  vendorId?: number;
  description?: string;
  basePrice?: number;
  durationMinutes?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  profileImage?: string;
  variants?: ServiceVariantInput[];
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: { row: number; message: string }[];
  message: string;
}

export interface ServiceListParams {
  vendorId?: number;
  categoryId?: number;
  search?: string;
}

export const serviceApi = {
  list: (params: ServiceListParams = {}) =>
    apiClient.get<ServiceListResponse>(
      `/v1/service${toQueryString({
        vendorId: params.vendorId,
        categoryId: params.categoryId,
        search: params.search,
      })}`,
    ),
  get: (id: number) => apiClient.get<CatalogService>(`/v1/service/${id}`),
  create: (body: ServiceInput) => apiClient.post<CatalogService>("/v1/service", body),
  update: (id: number, body: Partial<ServiceInput>) =>
    apiClient.patch<CatalogService>(`/v1/service/${id}`, body),
  remove: (id: number) => apiClient.delete<{ message: string }>(`/v1/service/${id}`),

  /** POST /v1/service/:id/image — multipart image upload to Cloudinary. */
  uploadImage: (id: number, image: File) => {
    const fd = new FormData();
    fd.append("serviceImage", image);
    return uploadFile<CatalogService>(`/v1/service/${id}/image`, fd);
  },

  listVariants: (serviceId: number) =>
    apiClient.get<{ variants: ServiceVariant[] }>(`/v1/service/${serviceId}/variants`),
  addVariant: (serviceId: number, body: ServiceVariantInput) =>
    apiClient.post<ServiceVariant>(`/v1/service/${serviceId}/variants`, body),
  removeVariant: (variantId: number) =>
    apiClient.delete<{ message: string }>(`/v1/service/variants/${variantId}`),

  import: (file: File, opts?: { vendorId?: number; categoryId?: number }) => {
    const fd = new FormData();
    fd.append("file", file);
    const qs = toQueryString({
      vendorId: opts?.vendorId,
      categoryId: opts?.categoryId,
    });
    return uploadFile<ImportResult>(`/v1/service/import${qs}`, fd);
  },
  downloadTemplate: () => downloadFile("/v1/service/import/template"),
};

/* ================== Category tree (public landing) ===================== */
/*
 * The public `/v1/catagories` endpoint returns the full storefront hierarchy:
 * category → groups (sub-categories) → services → variants. The landing page
 * is driven entirely from this, so no separate storefront/vendor API is needed.
 */

export interface CategoryTreeVariant {
  variantId: number;
  name: string;
  price: number;
  profileImage: string | null;
}

export interface CategoryTreeService {
  serviceId: number;
  name: string;
  description: string | null;
  price: number | null;
  durationMinutes: number | null;
  profileImage: string | null;
  variants: CategoryTreeVariant[];
}

export interface CategoryTreeGroup {
  groupId: number;
  name: string;
  profileImage: string | null;
  services: CategoryTreeService[];
}

export interface CategoryTreeNode {
  categoryId: number;
  name: string;
  description: string | null;
  profileImage: string;
  /** Services attached directly to this category (no sub-category). */
  services: CategoryTreeService[];
  groups: CategoryTreeGroup[];
}

export const categoryTreeApi = {
  /** GET /v1/catagories — full category → service → variant tree (public). */
  tree: () => apiClient.get<CategoryTreeNode[]>("/v1/catagories", { skipAuth: true }),
};

/* ============================== Banners ================================= */

export interface Banner {
  bannerId: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  imagePublicId: string | null;
  linkUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BannerInput {
  title?: string;
  subtitle?: string;
  linkUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  /** Image file — required on create, optional on update. */
  image?: File | null;
}

/** Recommended banner image dimensions / size (shown + validated in the panel). */
export const BANNER_SPEC = {
  width: 1920,
  height: 640,
  minWidth: 1200,
  maxBytes: 5 * 1024 * 1024,
  label: "1920 × 640 px (3:1), max 5 MB",
};

function bannerFormData(body: BannerInput): FormData {
  const fd = new FormData();
  if (body.title !== undefined) fd.append("title", body.title);
  if (body.subtitle !== undefined) fd.append("subtitle", body.subtitle);
  if (body.linkUrl !== undefined) fd.append("linkUrl", body.linkUrl);
  if (body.isActive !== undefined) fd.append("isActive", String(body.isActive));
  if (body.sortOrder !== undefined) fd.append("sortOrder", String(body.sortOrder));
  if (body.image) fd.append("bannerImage", body.image);
  return fd;
}

export const bannerApi = {
  /** GET /v1/banner — all banners (admin). */
  list: () => apiClient.get<Banner[]>("/v1/banner"),

  /** GET /v1/banner/active — active banners for the landing carousel (public). */
  listActive: () => apiClient.get<Banner[]>("/v1/banner/active", { skipAuth: true }),

  /** POST /v1/banner — multipart, image required. */
  create: (body: BannerInput) => uploadFile<Banner>("/v1/banner", bannerFormData(body)),

  /** PATCH /v1/banner/:id — multipart, image optional. */
  update: (id: number, body: BannerInput) =>
    uploadFile<Banner>(`/v1/banner/${id}`, bannerFormData(body), "PATCH"),

  /** DELETE /v1/banner/:id */
  remove: (id: number) => apiClient.delete<{ message: string }>(`/v1/banner/${id}`),
};

/* ============================ Query keys ================================ */

export const queryKeys = {
  me: ["auth", "me"] as const,
  dashboardOverview: ["dashboard", "overview"] as const,
  vendors: (params: VendorListParams) => ["vendors", params] as const,
  vendor: (id: number) => ["vendor", id] as const,
  categories: ["categories"] as const,
  services: (params: ServiceListParams) => ["services", params] as const,
  categoryTree: ["categoryTree"] as const,
  banners: ["banners"] as const,
  bannersActive: ["banners", "active"] as const,
};
