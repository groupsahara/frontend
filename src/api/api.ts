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
  /** Square icon image — required on create, optional on update. */
  image?: File | null;
  /** Wide banner image shown on the category page — optional. */
  banner?: File | null;
}

function categoryFormData(body: CategoryInput): FormData {
  const fd = new FormData();
  fd.append("name", body.name);
  if (body.description) fd.append("description", body.description);
  if (body.parentId != null) fd.append("parentId", String(body.parentId));
  if (body.image) fd.append("catagoryImage", body.image);
  if (body.banner) fd.append("bannerImage", body.banner);
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
  /** Wide banner image shown on the category page (optional). */
  bannerImage?: string | null;
  /** Services attached directly to this category (no sub-category). */
  services: CategoryTreeService[];
  groups: CategoryTreeGroup[];
}

export const categoryTreeApi = {
  /** GET /v1/catagories — full category → service → variant tree (public). */
  tree: () => apiClient.get<CategoryTreeNode[]>("/v1/catagories", { skipAuth: true }),
};

/* ============================== Banners ================================= */

/** Where a banner is shown: the web storefront or the mobile app. */
export type BannerPlatform = "WEB" | "MOBILE";

export interface Banner {
  bannerId: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  imagePublicId: string | null;
  linkUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  /** Defaults to WEB for banners created before the platform field existed. */
  platform?: BannerPlatform;
  createdAt: string;
  updatedAt: string;
}

export interface BannerInput {
  title?: string;
  subtitle?: string;
  linkUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  platform?: BannerPlatform;
  /** Image file — required on create, optional on update. */
  image?: File | null;
}

/** Recommended banner image dimensions / size, per platform. */
export interface BannerSpec {
  width: number;
  height: number;
  minWidth: number;
  maxBytes: number;
  aspect: string;
  label: string;
}

export const BANNER_SPECS: Record<BannerPlatform, BannerSpec> = {
  // Web storefront hero — wide landscape.
  WEB: {
    width: 1920,
    height: 640,
    minWidth: 1200,
    maxBytes: 5 * 1024 * 1024,
    aspect: "3:1",
    label: "1920 × 640 px (3:1), max 5 MB",
  },
  // Mobile app banner — matches the app's full-width 2:1 hero.
  MOBILE: {
    width: 1080,
    height: 540,
    minWidth: 720,
    maxBytes: 5 * 1024 * 1024,
    aspect: "2:1",
    label: "1080 × 540 px (2:1), max 5 MB",
  },
};

/** Back-compat default spec (web). */
export const BANNER_SPEC = BANNER_SPECS.WEB;

function bannerFormData(body: BannerInput): FormData {
  const fd = new FormData();
  if (body.title !== undefined) fd.append("title", body.title);
  if (body.subtitle !== undefined) fd.append("subtitle", body.subtitle);
  if (body.linkUrl !== undefined) fd.append("linkUrl", body.linkUrl);
  if (body.isActive !== undefined) fd.append("isActive", String(body.isActive));
  if (body.sortOrder !== undefined) fd.append("sortOrder", String(body.sortOrder));
  if (body.platform !== undefined) fd.append("platform", body.platform);
  if (body.image) fd.append("bannerImage", body.image);
  return fd;
}

export const bannerApi = {
  /** GET /v1/banner — all banners (admin). */
  list: () => apiClient.get<Banner[]>("/v1/banner"),

  /** GET /v1/banner/active — active banners for a platform (public). */
  listActive: (platform?: BannerPlatform) =>
    apiClient.get<Banner[]>(
      `/v1/banner/active${platform ? toQueryString({ platform }) : ""}`,
      { skipAuth: true },
    ),

  /** POST /v1/banner — multipart, image required. */
  create: (body: BannerInput) => uploadFile<Banner>("/v1/banner", bannerFormData(body)),

  /** PATCH /v1/banner/:id — multipart, image optional. */
  update: (id: number, body: BannerInput) =>
    uploadFile<Banner>(`/v1/banner/${id}`, bannerFormData(body), "PATCH"),

  /** DELETE /v1/banner/:id */
  remove: (id: number) => apiClient.delete<{ message: string }>(`/v1/banner/${id}`),
};

/* =============================== Cart ==================================== */
/*
 * Guest-friendly cart. The backend uses an OptionalJwtAuthGuard, so for the
 * public storefront we identify the cart purely by a client-generated
 * `sessionId` (no customer login required). All calls skip auth so the
 * admin token is never attached to a shopper's cart.
 */

export interface CartItemData {
  id: number;
  serviceId: number;
  variantId: number | null;
  quantity: number;
  name: string;
  image: string | null;
  price: number;
  total: number;
  variantName: string | null;
}

export interface CartPriceSummary {
  itemTotal?: number;
  platformFee?: number;
  tax?: number;
  discount?: number;
  grandTotal?: number;
}

export interface CartResponse {
  id: number | null;
  items: CartItemData[];
  priceSummary: CartPriceSummary;
}

export interface AddToCartBody {
  serviceId: number;
  quantity?: number;
  variantId?: number;
  sessionId: string;
}

export interface UpdateCartBody {
  serviceId: number;
  variantId?: number | null;
  quantity: number;
  action: "increment" | "decrement";
}

export const cartApi = {
  /** GET /v1/manage-cart/get-cart?sessionId — full cart with price summary. */
  get: (sessionId: string) =>
    apiClient.get<CartResponse>(
      `/v1/manage-cart/get-cart${toQueryString({ sessionId })}`,
      { skipAuth: true },
    ),

  /** POST /v1/manage-cart/add — add a service (optionally a variant). */
  add: (body: AddToCartBody) =>
    apiClient.post<unknown>("/v1/manage-cart/add", body, { skipAuth: true }),

  /** PATCH /v1/manage-cart/update?cartId — change an item's quantity. */
  updateQuantity: (cartId: number, body: UpdateCartBody) =>
    apiClient.patch<unknown>(
      `/v1/manage-cart/update${toQueryString({ cartId })}`,
      body,
      { skipAuth: true },
    ),

  /** DELETE /v1/manage-cart/delete/:cartItemId — remove one line item. */
  deleteItem: (cartItemId: number) =>
    apiClient.delete<{ message: string }>(
      `/v1/manage-cart/delete/${cartItemId}`,
      { skipAuth: true },
    ),
};

/* =========================== Customer auth ============================== */
/*
 * The storefront customer signs in with a mobile number + OTP (the same flow as
 * the React Native app). This is distinct from the admin email/password login.
 * Responses are loosely shaped, so we normalize tokens + user out of them.
 */

export interface CustomerUser {
  id: string;
  name?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface CustomerAuthResult {
  success?: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  user?: CustomerUser;
  raw?: unknown;
}

export interface VerifyOtpRequest {
  otp_input: string;
  mobile: string;
  fcmToken: string;
  deviceId: string;
  platform: string;
}

/** Strip a country code / non-digits down to a bare 10-digit Indian number. */
export function normalizeMobileNumber(value: string): string {
  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.startsWith("91") && digitsOnly.length === 12) {
    return digitsOnly.slice(2);
  }
  return digitsOnly;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function collectRecords(value: unknown): Record<string, unknown>[] {
  const visited = new Set<Record<string, unknown>>();
  const queue: unknown[] = [value];
  const records: Record<string, unknown>[] = [];
  while (queue.length > 0) {
    const current = asRecord(queue.shift());
    if (!current || visited.has(current)) continue;
    visited.add(current);
    records.push(current);
    for (const key of ["data", "payload", "result", "tokens", "auth", "user", "profile", "booking"]) {
      if (current[key] && typeof current[key] === "object") queue.push(current[key]);
    }
  }
  return records;
}

function pickString(records: Record<string, unknown>[], keys: string[]): string | undefined {
  for (const record of records) {
    for (const key of keys) {
      const v = record[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return undefined;
}

function pickNumber(records: Record<string, unknown>[], keys: string[]): number | undefined {
  for (const record of records) {
    for (const key of keys) {
      const v = record[key];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
    }
  }
  return undefined;
}

function pickBoolean(records: Record<string, unknown>[], keys: string[]): boolean | undefined {
  for (const record of records) {
    for (const key of keys) {
      if (typeof record[key] === "boolean") return record[key] as boolean;
    }
  }
  return undefined;
}

function normalizeCustomerUser(records: Record<string, unknown>[]): CustomerUser | undefined {
  for (const record of records) {
    const hasShape =
      ("id" in record || "userId" in record || "mobile" in record || "phone" in record || "email" in record) &&
      !("accessToken" in record) &&
      !("refreshToken" in record);
    if (!hasShape) continue;
    const idCandidate = record.id ?? record.userId ?? record._id;
    const id =
      typeof idCandidate === "string"
        ? idCandidate
        : typeof idCandidate === "number"
          ? String(idCandidate)
          : undefined;
    const mobile = pickString([record], ["mobile", "phone"]);
    const email = pickString([record], ["email"]);
    const name = pickString([record], ["name"]);
    if (!id && !mobile && !email) continue;
    return { ...record, id: id ?? mobile ?? email ?? "user", mobile, phone: mobile, email, name };
  }
  return undefined;
}

function normalizeAuthResult(value: unknown): CustomerAuthResult {
  const records = collectRecords(value);
  return {
    success: pickBoolean(records, ["success", "ok"]),
    message: pickString(records, ["message", "msg"]),
    accessToken: pickString(records, ["accessToken", "access_token", "token"]),
    refreshToken: pickString(records, ["refreshToken", "refresh_token"]),
    sessionId: pickString(records, ["sessionId", "session_id"]),
    user: normalizeCustomerUser(records),
    raw: value,
  };
}

export const customerAuthApi = {
  /** POST /v1/auth/otp-generate-user — send an OTP to the mobile number. */
  generateOtp: (mobile: string) =>
    apiClient
      .post<unknown>("/v1/auth/otp-generate-user", { mobile }, { skipAuth: true })
      .then(normalizeAuthResult),

  /** POST /v1/auth/resend-otp — re-send the OTP. */
  resendOtp: (mobile: string) =>
    apiClient
      .post<unknown>("/v1/auth/resend-otp", { mobile }, { skipAuth: true })
      .then(normalizeAuthResult),

  /** POST /v1/auth/otp-verify-user — verify the OTP, returns tokens + user. */
  verifyOtp: (body: VerifyOtpRequest) =>
    apiClient
      .post<unknown>("/v1/auth/otp-verify-user", body, { skipAuth: true })
      .then(normalizeAuthResult),

  /** POST /v1/auth/deleteAccountById — permanently delete the signed-in account. */
  deleteAccount: () => apiClient.post<unknown>("/v1/auth/deleteAccountById"),
};

/* ============================ User addresses ============================ */

export interface UserAddress {
  id?: number | string;
  addressId?: number | string;
  label: string;
  address: string;
  city: string;
  state?: string;
  country?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface AddAddressPayload {
  label: string;
  address: string;
  city: string;
  zipCode?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export const userApi = {
  /** GET /v1/auth/user/:id/addresses — the user's saved addresses. */
  getAddresses: (userId: string | number) =>
    apiClient.get<unknown>(`/v1/auth/user/${userId}/addresses`),

  /** POST /v1/auth/user/:id/addresses — save a new address. */
  addAddress: (userId: string | number, payload: AddAddressPayload) =>
    apiClient.post<unknown>(`/v1/auth/user/${userId}/addresses`, payload),
};

/* =============================== Booking ================================ */

export interface AvailableSlot {
  id: string;
  label: string;
  startTime: string;
  endTime?: string;
  professionalId: number | null;
  professionalName?: string;
}

export interface CreateBookingPayload {
  userId?: number;
  professionalId: number | null;
  serviceId: number;
  variantId: number | null;
  bookingDate: string;
  startTime: string;
  totalAmount: number;
  serviceLat: number;
  serviceLng: number;
  serviceCity: string;
  serviceAddress: string;
  paymentMode: string;
}

export interface BookingSummary {
  bookingId: number;
  status: string;
  message?: string;
  raw?: unknown;
}

function normalizeBookingResponse(value: unknown): BookingSummary {
  const records = collectRecords(value);
  return {
    bookingId: pickNumber(records, ["bookingId", "id"]) ?? 0,
    status: pickString(records, ["status", "bookingStatus", "action"]) ?? "Pending",
    message: pickString(records, ["message", "msg"]),
    raw: value,
  };
}

/** The professional assigned to a booking (who accepted it). */
export interface BookingProfessional {
  professionalId?: number;
  rating?: number | null;
  user?: { name?: string | null; email?: string | null; mobile?: string | null } | null;
}

/** A booking row as returned by GET /v1/booking/get (loosely shaped). */
export interface BookingRecord {
  bookingId?: number;
  id?: number;
  serviceId?: number;
  variantId?: number | null;
  serviceName?: string;
  variantName?: string | null;
  service?: { serviceId?: number; name?: string; profileImage?: string | null } | null;
  variant?: { variantId?: number; name?: string } | null;
  professionalId?: number | null;
  professional?: BookingProfessional | null;
  bookingDate?: string;
  startTime?: string;
  totalAmount?: number;
  paymentMode?: string;
  status?: string;
  otpVerified?: boolean;
  createdAt?: string;
}

export interface UserBookingsResponse {
  bookings: BookingRecord[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export const bookingApi = {
  /** GET /v1/booking/get/slots — professional availability for a service+date. */
  getAvailableSlots: (params: { serviceId: number; variantId: number; date: string }) =>
    apiClient.get<unknown>(
      `/v1/booking/get/slots${toQueryString({
        serviceId: params.serviceId,
        variantId: params.variantId,
        date: params.date,
      })}`,
    ),

  /** POST /v1/booking/book — create a booking for one cart item. */
  create: (payload: CreateBookingPayload) =>
    apiClient.post<unknown>("/v1/booking/book", payload).then(normalizeBookingResponse),

  /** GET /v1/booking/get?userId — the signed-in customer's bookings. */
  listByUser: (userId: string | number, page = 1, limit = 50) =>
    apiClient.get<UserBookingsResponse>(
      `/v1/booking/get${toQueryString({ userId, page, limit })}`,
    ),

  /** POST /v1/booking/cancel — cancel a booking by id. */
  cancel: (bookingId: number) =>
    apiClient.post<unknown>("/v1/booking/cancel", { bookingId }).then(normalizeBookingResponse),
};

/* =============================== Payments =============================== */

export interface CreatedRazorpayOrder {
  id: string;
  amount: number; // in paise
  currency: string;
  receipt?: string;
  status?: string;
  keyId: string;
}

export interface VerifyRazorpayPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface VerifyRazorpayResult {
  success: boolean;
  message?: string;
  isValid?: boolean;
}

export const paymentsApi = {
  /** POST /v1/payments/create-order — amount in INR (backend converts to paise). */
  createOrder: (amount: number, currency = "INR") =>
    apiClient.post<CreatedRazorpayOrder>("/v1/payments/create-order", { amount, currency }),

  /** POST /v1/payments/verify — verify the Razorpay signature server-side. */
  verify: (payload: VerifyRazorpayPayload) =>
    apiClient.post<VerifyRazorpayResult>("/v1/payments/verify", payload),
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
  cart: (sessionId: string) => ["cart", sessionId] as const,
  userAddresses: (userId: string | number) => ["addresses", userId] as const,
  userBookings: (userId: string | number) => ["bookings", "user", userId] as const,
};
