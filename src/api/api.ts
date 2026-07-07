/**
 * Typed API surface for the app. Every function here goes through `apiClient`
 * and is meant to be consumed by TanStack Query (`useQuery` / `useMutation`).
 */
import { apiClient, API_BASE_URL, downloadFile, uploadFile } from "./apiClient";

/* ============================== Auth ==================================== */

export type Role = "USER" | "SERVICE_PROFESSIONAL" | "ADMIN" | "SUPER_ADMIN" | "STAFF";

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
  /** CRM permissions: "*" for admins, "module.action" list for STAFF. */
  permissions?: string[];
  /** RBAC role names a STAFF member holds (e.g. ["marketing"]); [] for admins. */
  roleNames?: string[];
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

  /** POST /v1/admin/change-password — reset the signed-in admin's password. */
  changePassword: (body: { newPassword: string }) =>
    apiClient.post<{ message: string }>("/v1/admin/change-password", body),
};

/** URL the "Continue with Google" button redirects to, to start OAuth. */
export const GOOGLE_AUTH_URL =
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL ?? `${API_BASE_URL}/v1/auth/google`;

/* ============================ Dashboard ================================= */

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

/** The full set of booking lifecycle states the backend can return. */
export type AdminBookingStatus =
  | "PENDING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "ON_THE_WAY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface AdminBooking {
  id: string;
  bookingId: number;
  customer: string;
  mobile: string | null;
  service: string;
  amount: number;
  status: AdminBookingStatus;
  paymentMode: string;
  date: string;
}

export interface AdminBookingListParams {
  status?: AdminBookingStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminBookingListResponse {
  bookings: AdminBooking[];
  /** Count per status plus an `all` total, for the filter tabs. */
  counts: Record<string, number>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/* ----------------------------- Dispatcher ------------------------------- */

export type PartnerOnboardingStatus = "PENDING" | "VERIFIED" | "ACTIVE" | "REJECTED";

export interface PartnerRow {
  professionalId: number;
  name: string;
  email: string | null;
  mobile: string | null;
  category: string | null;
  service: string | null;
  city: string | null;
  experience: number | null;
  description: string | null;
  rating: number;
  totalJobs: number;
  isOnline: boolean;
  isVerified: boolean;
  isBlocked: boolean;
  onboardingStatus: PartnerOnboardingStatus;
  walletBalance: number;
  profileImage: string | null;
  /** Dispatch team the partner belongs to (null = unassigned). */
  teamId: number | null;
}

export interface PartnerDocuments {
  aadharFront: string | null;
  aadharBack: string | null;
  licenseDoc: string | null;
  panCard: string | null;
  bankPassbook: string | null;
}

export interface PartnerDetail extends PartnerRow {
  categoryId: number | null;
  joinedAt: string;
  verifiedAt: string | null;
  activatedAt: string | null;
  rejectionReason: string | null;
  aadharNo: string | null;
  licenseNo: string | null;
  vehicleType: string | null;
  vehicleColor: string | null;
  documents: PartnerDocuments;
}

export interface PartnerStatusCounts {
  PENDING: number;
  VERIFIED: number;
  ACTIVE: number;
  REJECTED: number;
  ALL: number;
}

export interface UpdatePartnerInput {
  name?: string;
  city?: string;
  experience?: number;
  description?: string;
  categoryId?: number;
}

export interface WalletRow {
  walletId: number;
  professionalId: number;
  name: string;
  email: string | null;
  mobile: string | null;
  city: string | null;
  balance: number;
  transactionCount: number;
}

export interface WalletListResponse {
  totalBalance: number;
  wallets: WalletRow[];
}

/** Lifecycle of a partner payout (withdrawal) request. */
export type PayoutStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PayoutRequestRow {
  payoutRequestId: number;
  professionalId: number;
  name: string;
  email: string | null;
  mobile: string | null;
  city: string | null;
  amount: number;
  status: PayoutStatus;
  /** Partner-supplied note (e.g. preferred method / UPI id). */
  note: string | null;
  /** Admin note on approval or reason on rejection. */
  adminNote: string | null;
  /** The partner's live wallet balance, for context while reviewing. */
  walletBalance: number;
  createdAt: string;
  processedAt: string | null;
}

export interface PayoutStatusCounts {
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
  ALL: number;
}

export const dispatcherApi = {
  /** GET /v1/admin/partners — service partners (professionals), filterable by onboarding status. */
  listPartners: (search?: string, status?: PartnerOnboardingStatus | "ALL") =>
    apiClient.get<PartnerRow[]>(
      `/v1/admin/partners${toQueryString({ search, status: status && status !== "ALL" ? status : undefined })}`,
    ),

  /** GET /v1/admin/partners/status-counts — partner counts per onboarding bucket. */
  partnerStatusCounts: () =>
    apiClient.get<PartnerStatusCounts>(`/v1/admin/partners/status-counts`),

  /** GET /v1/admin/wallets — partner wallet balances. */
  listWallets: (search?: string) =>
    apiClient.get<WalletListResponse>(`/v1/admin/wallets${toQueryString({ search })}`),

  /** GET /v1/admin/partners/:id — a single partner's full profile. */
  getPartner: (professionalId: number) =>
    apiClient.get<PartnerDetail>(`/v1/admin/partners/${professionalId}`),

  /** PATCH /v1/admin/partners/:id — edit a partner's basic profile. */
  updatePartner: (professionalId: number, body: UpdatePartnerInput) =>
    apiClient.patch<{ message: string }>(`/v1/admin/partners/${professionalId}`, body),

  /** PATCH /v1/admin/partners/:id/block — block or unblock a partner. */
  setPartnerBlocked: (professionalId: number, isBlocked: boolean) =>
    apiClient.patch<{ message: string; isBlocked: boolean }>(
      `/v1/admin/partners/${professionalId}/block`,
      { isBlocked },
    ),

  /** PATCH /v1/admin/partners/:id/onboarding — verify / activate / reject a partner. */
  setPartnerOnboarding: (
    professionalId: number,
    status: PartnerOnboardingStatus,
    reason?: string,
  ) =>
    apiClient.patch<{ message: string; onboardingStatus: PartnerOnboardingStatus }>(
      `/v1/admin/partners/${professionalId}/onboarding`,
      { status, reason },
    ),

  /** DELETE /v1/admin/partners/:id — remove a partner. */
  deletePartner: (professionalId: number) =>
    apiClient.delete<{ message: string }>(`/v1/admin/partners/${professionalId}`),

  /** POST /v1/admin/wallets/:id/credit — add balance to a partner's wallet. */
  creditWallet: (professionalId: number, amount: number, description?: string) =>
    apiClient.post<unknown>(`/v1/admin/wallets/${professionalId}/credit`, { amount, description }),

  /** POST /v1/admin/wallets/:id/debit — deduct balance from a partner's wallet. */
  debitWallet: (professionalId: number, amount: number, description?: string) =>
    apiClient.post<unknown>(`/v1/admin/wallets/${professionalId}/debit`, { amount, description }),

  /** GET /v1/admin/payouts — partner payout requests, filterable by status. */
  listPayouts: (search?: string, status?: PayoutStatus | "ALL") =>
    apiClient.get<PayoutRequestRow[]>(
      `/v1/admin/payouts${toQueryString({
        search,
        status: status && status !== "ALL" ? status : undefined,
      })}`,
    ),

  /** GET /v1/admin/payouts/status-counts — payout counts per status bucket. */
  payoutStatusCounts: () =>
    apiClient.get<PayoutStatusCounts>(`/v1/admin/payouts/status-counts`),

  /** PATCH /v1/admin/payouts/:id/approve — approve a payout (debits the wallet). */
  approvePayout: (payoutRequestId: number, note?: string) =>
    apiClient.patch<{ payoutRequestId: number; status: PayoutStatus }>(
      `/v1/admin/payouts/${payoutRequestId}/approve`,
      { note },
    ),

  /** PATCH /v1/admin/payouts/:id/reject — reject a payout (with a reason). */
  rejectPayout: (payoutRequestId: number, reason?: string) =>
    apiClient.patch<{ payoutRequestId: number; status: PayoutStatus }>(
      `/v1/admin/payouts/${payoutRequestId}/reject`,
      { reason },
    ),
};

/* ------------------------------ Customers ------------------------------- */

export interface CustomerRow {
  userId: number;
  name: string;
  email: string | null;
  mobile: string | null;
  restaurantName: string | null;
  profileImage: string | null;
  bookingsCount: number;
  addressCount: number;
  joinedAt: string;
}

export interface CustomerAddress {
  id: number;
  label: string | null;
  address: string;
  city: string;
  state: string | null;
  zipCode: string;
  country: string | null;
  isDefault: boolean;
}

export interface CustomerBooking {
  id: string;
  service: string;
  variant: string | null;
  amount: number;
  status: "Completed" | "Pending" | "Cancelled";
  paymentMode: string;
  date: string;
}

export interface CustomerDetail {
  userId: number;
  name: string;
  email: string | null;
  mobile: string | null;
  dob: string | null;
  gstNumber: string | null;
  restaurantName: string | null;
  profileImage: string | null;
  joinedAt: string;
  stats: { totalBookings: number; completed: number; cancelled: number; totalSpent: number };
  addresses: CustomerAddress[];
  bookings: CustomerBooking[];
}

export interface AdminCoupon {
  couponId: number;
  code: string;
  description: string;
  discountPercent: number;
  source: "SIGNUP" | "ADMIN";
  isApplied: boolean;
  isUsed: boolean;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
  status: "ACTIVE" | "USED" | "EXPIRED";
}

export const customersApi = {
  /** GET /v1/admin/customers — all customers (USER accounts). */
  list: (search?: string) =>
    apiClient.get<CustomerRow[]>(`/v1/admin/customers${toQueryString({ search })}`),

  /** GET /v1/admin/customers/:id — a single customer's full profile. */
  get: (userId: number) => apiClient.get<CustomerDetail>(`/v1/admin/customers/${userId}`),

  /** GET /v1/admin/customers/:id/coupons — every coupon the customer holds. */
  coupons: (userId: number) =>
    apiClient.get<AdminCoupon[]>(`/v1/admin/customers/${userId}/coupons`),

  /** POST /v1/admin/customers/:id/coupons — grant N one-time 50%-off coupons. */
  grantCoupons: (userId: number, count: number) =>
    apiClient.post<{ issued: number; coupons: AdminCoupon[] }>(
      `/v1/admin/customers/${userId}/coupons`,
      { count },
    ),
};

/* ----------------------------- Analytics -------------------------------- */

/** Time-range presets accepted by GET /v1/admin/analytics. */
export type AnalyticsRange = "7d" | "30d" | "90d" | "12m";

export interface AnalyticsKpi {
  value: number;
  /** % change vs the previous period of equal length (percentage POINTS for rates). */
  delta: number;
}

export interface AnalyticsSeriesPoint {
  label: string;
  date: string;
  revenue: number;
  bookings: number;
  completed: number;
  cancelled: number;
}

export interface AnalyticsStatusSlice {
  status: AdminBookingStatus;
  count: number;
}

export interface AnalyticsPaymentMode {
  mode: string;
  bookings: number;
  amount: number;
}

export interface AnalyticsTopService {
  serviceId: number;
  name: string;
  bookings: number;
  revenue: number;
}

export interface AnalyticsTopCategory {
  categoryId: number;
  name: string;
  bookings: number;
  revenue: number;
}

export interface AnalyticsTopPartner {
  professionalId: number;
  name: string;
  jobs: number;
  revenue: number;
  rating: number | null;
}

export interface AnalyticsTopCity {
  city: string;
  bookings: number;
  revenue: number;
}

export interface AnalyticsRatings {
  average: number;
  count: number;
  distribution: { stars: number; count: number }[];
}

export interface AnalyticsResponse {
  range: AnalyticsRange;
  start: string;
  end: string;
  bucket: "day" | "week" | "month";
  kpis: {
    revenue: AnalyticsKpi;
    bookings: AnalyticsKpi;
    avgOrderValue: AnalyticsKpi;
    completionRate: AnalyticsKpi;
    cancellationRate: AnalyticsKpi;
    newCustomers: AnalyticsKpi;
    newPartners: AnalyticsKpi;
    payoutsPaid: AnalyticsKpi;
  };
  series: AnalyticsSeriesPoint[];
  statusBreakdown: AnalyticsStatusSlice[];
  paymentModes: AnalyticsPaymentMode[];
  topServices: AnalyticsTopService[];
  topCategories: AnalyticsTopCategory[];
  topPartners: AnalyticsTopPartner[];
  topCities: AnalyticsTopCity[];
  ratings: AnalyticsRatings;
}

export const dashboardApi = {
  /** GET /v1/admin/dashboard/overview — real metrics aggregated by the backend. */
  getOverview: () => apiClient.get<DashboardOverview>("/v1/admin/dashboard/overview"),

  /** GET /v1/admin/analytics — KPIs, series and breakdowns for a time range. */
  getAnalytics: (range: AnalyticsRange) =>
    apiClient.get<AnalyticsResponse>(`/v1/admin/analytics${toQueryString({ range })}`),

  /** GET /v1/admin/bookings — full, paginated booking history (admin). */
  listBookings: (params: AdminBookingListParams = {}) =>
    apiClient.get<AdminBookingListResponse>(
      `/v1/admin/bookings${toQueryString({
        status: params.status,
        search: params.search,
        page: params.page,
        limit: params.limit,
      })}`,
    ),
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
  /** Banner video shown on the category page — optional. */
  video?: File | null;
}

function categoryFormData(body: CategoryInput): FormData {
  const fd = new FormData();
  fd.append("name", body.name);
  if (body.description) fd.append("description", body.description);
  if (body.parentId != null) fd.append("parentId", String(body.parentId));
  if (body.image) fd.append("catagoryImage", body.image);
  if (body.banner) fd.append("bannerImage", body.banner);
  if (body.video) fd.append("bannerVideo", body.video);
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

  /** PATCH /v1/catagories/reorder — persist admin drag-and-drop order so the
   *  web storefront and customer app show categories in the same sequence. */
  reorder: (ids: number[]) =>
    apiClient.patch<{ message: string; count: number }>("/v1/catagories/reorder", { ids }),
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
  /** When true, the service appears in the landing "Popular services" row. */
  isFeatured?: boolean;
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
  /** Banner video shown on the category page (optional, takes priority over the image). */
  bannerVideo?: string | null;
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
  /** GET /v1/manage-cart/get-cart?sessionId — full cart with price summary.
   *  NOT skipAuth: when a token is present the backend (OptionalJwtAuthGuard)
   *  prioritises the user's cart over the guest sessionId — essential after
   *  login/merge, when the guest cart no longer exists. */
  get: (sessionId: string) =>
    apiClient.get<CartResponse>(
      `/v1/manage-cart/get-cart${toQueryString({ sessionId })}`,
    ),

  /** POST /v1/manage-cart/merge — fold the guest cart (sessionId) into the
   *  logged-in user's cart. Requires the Bearer token (JwtAuthGuard). */
  merge: (sessionId: string) =>
    apiClient.post<{ message: string; cartId?: number }>(
      "/v1/manage-cart/merge",
      { sessionId },
    ),

  /** POST /v1/manage-cart/add — add a service (optionally a variant).
   *  NOT skipAuth: a logged-in user must add to their own cart (resolved via the
   *  token), while guests add to the sessionId cart. Keeps add + get consistent. */
  add: (body: AddToCartBody) =>
    apiClient.post<unknown>("/v1/manage-cart/add", body),

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

  /**
   * POST /v1/auth/delete-account — self-service account deletion gated by OTP.
   * The caller first sends an OTP via `generateOtp`, then submits the mobile +
   * OTP here to permanently erase the account. No login/token required — this
   * powers the public /delete-account page linked from the Play Store listing.
   */
  deleteAccountWithOtp: (mobile: string, otpInput: string) =>
    apiClient
      .post<unknown>(
        "/v1/auth/delete-account",
        { mobile, otp_input: otpInput },
        { skipAuth: true },
      )
      .then(normalizeAuthResult),
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

  /** PATCH /v1/auth/user/:id/profile — update the customer's business profile
   *  (owner name, restaurant name, GST) captured at checkout. */
  updateProfile: (
    userId: string | number,
    payload: { name?: string; restaurantName?: string; gstNumber?: string },
  ) => apiClient.patch<unknown>(`/v1/auth/user/${userId}/profile`, payload),
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

/* ==================== Dispatcher: dispatch domain ======================= */
/* Teams, geofences (polygon zones), warehouses, auto-allocation settings
   and delivery pricing rules — all under /v1/admin/dispatch. */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Lightweight partner row shared by team + geofence pickers. */
export interface DispatchPartnerRow {
  professionalId: number;
  name: string;
  mobile: string | null;
  city: string | null;
  isOnline: boolean;
  profileImage: string | null;
  teamId: number | null;
}

export interface DispatchTeamRow {
  teamId: number;
  name: string;
  description: string | null;
  memberCount: number;
  geofenceCount: number;
  createdAt: string;
}

export interface DispatchTeamDetail {
  teamId: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  members: DispatchPartnerRow[];
  geofences: { geofenceId: number; name: string; color: string; isActive: boolean }[];
}

export interface GeofenceRow {
  geofenceId: number;
  name: string;
  description: string | null;
  color: string;
  polygon: LatLng[];
  isActive: boolean;
  team: { teamId: number; name: string } | null;
  partnerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceDetail {
  geofenceId: number;
  name: string;
  description: string | null;
  color: string;
  polygon: LatLng[];
  isActive: boolean;
  teamId: number | null;
  team: { teamId: number; name: string } | null;
  partners: DispatchPartnerRow[];
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceInput {
  name: string;
  description?: string;
  color?: string;
  polygon: LatLng[];
  /** null clears the team assignment; omit to leave it unchanged. */
  teamId?: number | null;
  /** Full assignment list — replaces the current partners when sent. */
  partnerIds?: number[];
  isActive?: boolean;
}

export interface WarehouseRow {
  warehouseId: number;
  name: string;
  address: string;
  city: string | null;
  latitude: number;
  longitude: number;
  contactName: string | null;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseInput {
  name: string;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
  contactName?: string;
  contactPhone?: string;
  isActive?: boolean;
}

/** How auto-allocation pushes leads to eligible partners. */
export type AllocationMethod = "BROADCAST" | "NEAREST" | "ROUND_ROBIN";

export interface AllocationSettings {
  settingId: number;
  /** Master switch — when false, new bookings are not broadcast at all. */
  enabled: boolean;
  method: AllocationMethod;
  radiusKm: number;
  /** Partner cap per lead for NEAREST / ROUND_ROBIN; 0 = no cap. */
  maxAgents: number;
  /** Restrict leads to partners of the geofence covering the booking point. */
  restrictToGeofence: boolean;
  updatedAt: string;
}

export interface PricingRuleRow {
  ruleId: number;
  name: string;
  baseFare: number;
  baseDistanceKm: number;
  perKmFare: number;
  perMinuteFare: number;
  waitingFarePerMin: number;
  minFare: number | null;
  teamId: number | null;
  geofenceId: number | null;
  team: { teamId: number; name: string } | null;
  geofence: { geofenceId: number; name: string } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRuleInput {
  name: string;
  baseFare: number;
  baseDistanceKm?: number;
  perKmFare?: number;
  perMinuteFare?: number;
  waitingFarePerMin?: number;
  minFare?: number;
  teamId?: number | null;
  geofenceId?: number | null;
  isActive?: boolean;
}

export const dispatchApi = {
  /** GET /v1/admin/dispatch/teams — teams with member/geofence counts. */
  listTeams: (search?: string) =>
    apiClient.get<DispatchTeamRow[]>(`/v1/admin/dispatch/teams${toQueryString({ search })}`),

  /** GET /v1/admin/dispatch/teams/:id — a team with members and geofences. */
  getTeam: (teamId: number) =>
    apiClient.get<DispatchTeamDetail>(`/v1/admin/dispatch/teams/${teamId}`),

  /** POST /v1/admin/dispatch/teams — create a team. */
  createTeam: (body: { name: string; description?: string }) =>
    apiClient.post<DispatchTeamRow>(`/v1/admin/dispatch/teams`, body),

  /** PATCH /v1/admin/dispatch/teams/:id — rename / redescribe a team. */
  updateTeam: (teamId: number, body: { name?: string; description?: string }) =>
    apiClient.patch<DispatchTeamRow>(`/v1/admin/dispatch/teams/${teamId}`, body),

  /** DELETE /v1/admin/dispatch/teams/:id — members/zones are unassigned, not deleted. */
  deleteTeam: (teamId: number) =>
    apiClient.delete<{ message: string }>(`/v1/admin/dispatch/teams/${teamId}`),

  /** PUT /v1/admin/dispatch/teams/:id/members — replace the full member list. */
  setTeamMembers: (teamId: number, professionalIds: number[]) =>
    apiClient.put<DispatchTeamDetail>(`/v1/admin/dispatch/teams/${teamId}/members`, {
      professionalIds,
    }),

  /** GET /v1/admin/dispatch/geofences — zones with team + partner counts. */
  listGeofences: (search?: string) =>
    apiClient.get<GeofenceRow[]>(`/v1/admin/dispatch/geofences${toQueryString({ search })}`),

  /** GET /v1/admin/dispatch/geofences/:id — polygon, team and partners. */
  getGeofence: (geofenceId: number) =>
    apiClient.get<GeofenceDetail>(`/v1/admin/dispatch/geofences/${geofenceId}`),

  /** POST /v1/admin/dispatch/geofences — create a zone. */
  createGeofence: (body: GeofenceInput) =>
    apiClient.post<GeofenceDetail>(`/v1/admin/dispatch/geofences`, body),

  /** PATCH /v1/admin/dispatch/geofences/:id — partnerIds (when sent) replaces assignments. */
  updateGeofence: (geofenceId: number, body: Partial<GeofenceInput>) =>
    apiClient.patch<GeofenceDetail>(`/v1/admin/dispatch/geofences/${geofenceId}`, body),

  /** DELETE /v1/admin/dispatch/geofences/:id */
  deleteGeofence: (geofenceId: number) =>
    apiClient.delete<{ message: string }>(`/v1/admin/dispatch/geofences/${geofenceId}`),

  /** GET /v1/admin/dispatch/warehouses */
  listWarehouses: (search?: string) =>
    apiClient.get<WarehouseRow[]>(`/v1/admin/dispatch/warehouses${toQueryString({ search })}`),

  /** POST /v1/admin/dispatch/warehouses */
  createWarehouse: (body: WarehouseInput) =>
    apiClient.post<WarehouseRow>(`/v1/admin/dispatch/warehouses`, body),

  /** PATCH /v1/admin/dispatch/warehouses/:id */
  updateWarehouse: (warehouseId: number, body: Partial<WarehouseInput>) =>
    apiClient.patch<WarehouseRow>(`/v1/admin/dispatch/warehouses/${warehouseId}`, body),

  /** DELETE /v1/admin/dispatch/warehouses/:id */
  deleteWarehouse: (warehouseId: number) =>
    apiClient.delete<{ message: string }>(`/v1/admin/dispatch/warehouses/${warehouseId}`),

  /** GET /v1/admin/dispatch/allocation — the auto-allocation settings singleton. */
  getAllocationSettings: () =>
    apiClient.get<AllocationSettings>(`/v1/admin/dispatch/allocation`),

  /** PUT /v1/admin/dispatch/allocation — update the auto-allocation settings. */
  updateAllocationSettings: (body: Partial<Omit<AllocationSettings, "settingId" | "updatedAt">>) =>
    apiClient.put<AllocationSettings>(`/v1/admin/dispatch/allocation`, body),

  /** GET /v1/admin/dispatch/pricing-rules */
  listPricingRules: () => apiClient.get<PricingRuleRow[]>(`/v1/admin/dispatch/pricing-rules`),

  /** POST /v1/admin/dispatch/pricing-rules */
  createPricingRule: (body: PricingRuleInput) =>
    apiClient.post<PricingRuleRow>(`/v1/admin/dispatch/pricing-rules`, body),

  /** PATCH /v1/admin/dispatch/pricing-rules/:id */
  updatePricingRule: (ruleId: number, body: Partial<PricingRuleInput>) =>
    apiClient.patch<PricingRuleRow>(`/v1/admin/dispatch/pricing-rules/${ruleId}`, body),

  /** DELETE /v1/admin/dispatch/pricing-rules/:id */
  deletePricingRule: (ruleId: number) =>
    apiClient.delete<{ message: string }>(`/v1/admin/dispatch/pricing-rules/${ruleId}`),
};

/* ============================ Query keys ================================ */

export const queryKeys = {
  me: ["auth", "me"] as const,
  dashboardOverview: ["dashboard", "overview"] as const,
  analytics: (range: string) => ["dashboard", "analytics", range] as const,
  adminBookings: (params: AdminBookingListParams) => ["admin-bookings", params] as const,
  partners: (search: string, status: string) =>
    ["dispatcher", "partners", status, search] as const,
  partnerStatusCounts: ["dispatcher", "partners", "status-counts"] as const,
  partner: (id: number) => ["dispatcher", "partner", id] as const,
  partnerWallets: (search: string) => ["dispatcher", "wallets", search] as const,
  payouts: (search: string, status: string) =>
    ["dispatcher", "payouts", status, search] as const,
  payoutStatusCounts: ["dispatcher", "payouts", "status-counts"] as const,
  dispatchTeams: (search: string) => ["dispatcher", "teams", search] as const,
  dispatchTeam: (id: number) => ["dispatcher", "team", id] as const,
  geofences: (search: string) => ["dispatcher", "geofences", search] as const,
  geofence: (id: number) => ["dispatcher", "geofence", id] as const,
  warehouses: (search: string) => ["dispatcher", "warehouses", search] as const,
  allocationSettings: ["dispatcher", "allocation"] as const,
  pricingRules: ["dispatcher", "pricing-rules"] as const,
  customers: (search: string) => ["customers", search] as const,
  customer: (id: number) => ["customer", id] as const,
  customerCoupons: (id: number) => ["customer", id, "coupons"] as const,
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
  contactSubmissions: (search: string) => ["contacts", search] as const,
};

/* ========================= Contact Enquiries ============================ */

export type ContactStatus = "UNREAD" | "READ" | "RESOLVED";

export interface ContactSubmission {
  enquiryId: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactStatus;
  createdAt: string;
  user?: {
    userId: number;
    name: string | null;
    email: string | null;
    mobile: string | null;
    restaurantName: string | null;
  } | null;
}

export interface ContactSubmitRequest {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export const contactApi = {
  /** POST /v1/contact — public endpoint, no auth required. */
  submit: (body: ContactSubmitRequest) =>
    apiClient.post<{ message: string }>("/v1/contact", body, { skipAuth: true }),

  /** GET /v1/admin/contact — admin only, lists all submissions. */
  list: (search?: string) =>
    apiClient.get<ContactSubmission[]>(
      `/v1/admin/contact${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),

  /** PATCH /v1/admin/contact/:id — update status (READ / RESOLVED). */
  updateStatus: (id: number, status: ContactStatus) =>
    apiClient.patch<{ message: string; data: ContactSubmission }>(`/v1/admin/contact/${id}`, { status }),
};

/* ============================== CRM / HR ================================ */
// Backed by the RBAC-gated /v1/crm, /v1/hr and /v1/rbac endpoints. Admins
// bypass every permission check; STAFF users only see what their roles grant
// (the login response carries `permissions`, "*" = everything).

export interface CrmSummary {
  customers: number;
  partners: number;
  bookingsToday: number;
  pendingLeaves: number;
  employees: number;
}

export interface CrmCustomerRow {
  userId: number;
  name: string | null;
  email: string | null;
  mobile: string | null;
  createdAt: string;
  bookingCount: number;
}

export interface CrmPartnerRow {
  professionalId: number;
  name: string | null;
  mobile: string | null;
  email: string | null;
  service: string | null;
  city: string | null;
  rating: number;
  totalJobs: number;
  isOnline: boolean;
  isBlocked: boolean;
  onboardingStatus: "PENDING" | "VERIFIED" | "ACTIVE" | "REJECTED";
  bookingCount: number;
  createdAt: string;
}

export interface CrmPage {
  total: number;
  page: number;
  limit: number;
}
export type CrmCustomerList = CrmPage & { customers: CrmCustomerRow[] };
export type CrmPartnerList = CrmPage & { partners: CrmPartnerRow[] };

export interface CrmBookingRow {
  bookingId: number;
  status: string;
  totalAmount: number;
  bookingDate: string;
  startTime: string;
  serviceCity: string;
  serviceAddress: string;
  paymentMode: string;
  createdAt: string;
  user: { userId: number; name: string | null; mobile: string | null } | null;
  service: { name: string } | null;
  variant: { name: string } | null;
  professional: { professionalId: number; user: { name: string | null } | null } | null;
}
export type CrmBookingList = CrmPage & { bookings: CrmBookingRow[] };

export const crmApi = {
  summary: () => apiClient.get<CrmSummary>("/v1/crm/summary"),
  customers: (params: { search?: string; page?: number; limit?: number }) =>
    apiClient.get<CrmCustomerList>(`/v1/crm/customers${toQueryString(params)}`),
  updateCustomer: (id: number, body: { name?: string; mobile?: string }) =>
    apiClient.patch(`/v1/crm/customers/${id}`, body),
  partners: (params: { search?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get<CrmPartnerList>(`/v1/crm/partners${toQueryString(params)}`),
  updatePartner: (id: number, body: { isBlocked?: boolean; onboardingStatus?: string }) =>
    apiClient.patch(`/v1/crm/partners/${id}`, body),
  bookings: (params: {
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => apiClient.get<CrmBookingList>(`/v1/crm/bookings${toQueryString(params)}`),
  updateBookingStatus: (id: number, status: "CANCELLED" | "COMPLETED") =>
    apiClient.patch(`/v1/crm/bookings/${id}/status`, { status }),
};

/* ------------------------------- RBAC ---------------------------------- */

export interface RbacRoleRow {
  roleId: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount?: number;
  permissions: string[];
  createdAt: string;
}

export interface PermissionCatalogEntry {
  module: string;
  actions: string[];
  keys: string[];
}

export interface StaffRow {
  userId: number;
  name: string | null;
  email: string | null;
  mobile: string | null;
  createdAt: string;
  roles: { roleId: number; name: string }[];
  employee: { employeeId: number; employeeCode: string; designation: string | null } | null;
}

export const rbacApi = {
  permissionCatalog: () => apiClient.get<PermissionCatalogEntry[]>("/v1/rbac/permissions"),
  myPermissions: () => apiClient.get<string[]>("/v1/rbac/me/permissions"),
  roles: () => apiClient.get<RbacRoleRow[]>("/v1/rbac/roles"),
  createRole: (body: { name: string; description?: string; permissions?: string[] }) =>
    apiClient.post<RbacRoleRow>("/v1/rbac/roles", body),
  updateRole: (id: number, body: { name?: string; description?: string; permissions?: string[] }) =>
    apiClient.patch<RbacRoleRow>(`/v1/rbac/roles/${id}`, body),
  deleteRole: (id: number) => apiClient.delete<{ message: string }>(`/v1/rbac/roles/${id}`),
  staff: () => apiClient.get<StaffRow[]>("/v1/rbac/staff"),
  createStaff: (body: {
    name: string;
    email: string;
    mobile?: string;
    password: string;
    roleIds?: number[];
  }) => apiClient.post<{ userId: number; message: string }>("/v1/rbac/staff", body),
  updateStaff: (
    userId: number,
    body: { name?: string; mobile?: string; password?: string; roleIds?: number[] },
  ) => apiClient.patch<{ message: string }>(`/v1/rbac/staff/${userId}`, body),
  deleteStaff: (userId: number) =>
    apiClient.delete<{ message: string }>(`/v1/rbac/staff/${userId}`),
};

/* -------------------------------- HR ----------------------------------- */

export interface DepartmentRow {
  departmentId: number;
  name: string;
  description: string | null;
  _count?: { employees: number };
}

export interface OfficeRow {
  officeId: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  _count?: { employees: number };
}

export interface EmployeeRow {
  employeeId: number;
  userId: number | null;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
  status: "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "RESIGNED";
  joinDate: string;
  salary: number | null;
  address: string | null;
  emergencyContact: string | null;
  department: { departmentId: number; name: string } | null;
  office: { officeId: number; name: string; radiusMeters: number } | null;
  manager: { employeeId: number; name: string } | null;
  user: { userId: number; email: string | null } | null;
}

export interface AttendanceRow {
  attendanceId: number;
  employeeId: number;
  date: string;
  checkInAt: string;
  checkInDistanceM: number;
  checkOutAt: string | null;
  checkOutDistanceM: number | null;
  workedMinutes: number | null;
  status: "PRESENT" | "LATE" | "HALF_DAY";
  employee?: {
    employeeId: number;
    name: string;
    employeeCode: string;
    designation: string | null;
    department: { name: string } | null;
  };
  office?: { name: string; radiusMeters?: number };
}

export interface MyAttendance {
  employee: { employeeId: number; name: string; office: OfficeRow | null };
  month: string;
  today: AttendanceRow | null;
  records: AttendanceRow[];
}

export interface LeaveTypeRow {
  leaveTypeId: number;
  name: string;
  annualAllowance: number;
  isPaid: boolean;
  carryForward: boolean;
}

export interface LeaveBalanceRow {
  balanceId: number;
  employeeId: number;
  leaveTypeId: number;
  year: number;
  allocated: number;
  used: number;
  leaveType: LeaveTypeRow;
}

export interface LeaveRequestRow {
  leaveRequestId: number;
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  rejectionReason: string | null;
  createdAt: string;
  leaveType: LeaveTypeRow;
  employee?: {
    employeeId: number;
    name: string;
    employeeCode: string;
    department: { name: string } | null;
  };
  approver?: { employeeId: number; name: string } | null;
}

export interface MyLeaves {
  employee: { employeeId: number; name: string };
  balances: LeaveBalanceRow[];
  requests: LeaveRequestRow[];
}

export interface AppraisalRow {
  appraisalId: number;
  employeeId: number;
  cycle: string;
  periodStart: string;
  periodEnd: string;
  overallRating: number | null;
  goals: string | null;
  strengths: string | null;
  improvements: string | null;
  comments: string | null;
  recommendation: "PROMOTE" | "INCREMENT" | "HOLD" | "PIP" | null;
  incrementPct: number | null;
  status: "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED";
  createdAt: string;
  employee?: {
    employeeId: number;
    name: string;
    employeeCode: string;
    designation: string | null;
    department: { name: string } | null;
  };
  reviewer?: { employeeId: number; name: string } | null;
}

export const hrApi = {
  departments: () => apiClient.get<DepartmentRow[]>("/v1/hr/departments"),
  createDepartment: (body: { name: string; description?: string }) =>
    apiClient.post<DepartmentRow>("/v1/hr/departments", body),
  updateDepartment: (id: number, body: { name?: string; description?: string }) =>
    apiClient.patch<DepartmentRow>(`/v1/hr/departments/${id}`, body),
  deleteDepartment: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/hr/departments/${id}`),

  offices: () => apiClient.get<OfficeRow[]>("/v1/hr/offices"),
  createOffice: (body: Partial<OfficeRow> & { name: string; address: string }) =>
    apiClient.post<OfficeRow>("/v1/hr/offices", body),
  updateOffice: (id: number, body: Partial<OfficeRow>) =>
    apiClient.patch<OfficeRow>(`/v1/hr/offices/${id}`, body),
  deleteOffice: (id: number) => apiClient.delete<{ message: string }>(`/v1/hr/offices/${id}`),

  employees: (params: { search?: string; departmentId?: number; status?: string }) =>
    apiClient.get<EmployeeRow[]>(`/v1/hr/employees${toQueryString(params)}`),
  employee: (id: number) =>
    apiClient.get<EmployeeRow & { leaveBalances: LeaveBalanceRow[]; appraisals: AppraisalRow[] }>(
      `/v1/hr/employees/${id}`,
    ),
  createEmployee: (body: Record<string, unknown>) =>
    apiClient.post<EmployeeRow>("/v1/hr/employees", body),
  updateEmployee: (id: number, body: Record<string, unknown>) =>
    apiClient.patch<EmployeeRow>(`/v1/hr/employees/${id}`, body),
  deleteEmployee: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/hr/employees/${id}`),

  checkIn: (body: { lat: number; lng: number }) =>
    apiClient.post<AttendanceRow>("/v1/hr/attendance/check-in", body),
  checkOut: (body: { lat: number; lng: number }) =>
    apiClient.post<AttendanceRow>("/v1/hr/attendance/check-out", body),
  myAttendance: (month?: string) =>
    apiClient.get<MyAttendance>(`/v1/hr/attendance/me${month ? `?month=${month}` : ""}`),
  attendance: (params: { date?: string; from?: string; to?: string; employeeId?: number }) =>
    apiClient.get<AttendanceRow[]>(`/v1/hr/attendance${toQueryString(params)}`),

  leaveTypes: () => apiClient.get<LeaveTypeRow[]>("/v1/hr/leave-types"),
  createLeaveType: (body: {
    name: string;
    annualAllowance: number;
    isPaid?: boolean;
    carryForward?: boolean;
  }) => apiClient.post<LeaveTypeRow>("/v1/hr/leave-types", body),
  updateLeaveType: (id: number, body: Partial<LeaveTypeRow>) =>
    apiClient.patch<LeaveTypeRow>(`/v1/hr/leave-types/${id}`, body),
  deleteLeaveType: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/hr/leave-types/${id}`),

  leaveBalances: (employeeId: number, year?: number) =>
    apiClient.get<LeaveBalanceRow[]>(
      `/v1/hr/leave-balances/${employeeId}${year ? `?year=${year}` : ""}`,
    ),
  adjustBalance: (balanceId: number, allocated: number) =>
    apiClient.patch<LeaveBalanceRow>(`/v1/hr/leave-balances/${balanceId}`, { allocated }),

  myLeaves: () => apiClient.get<MyLeaves>("/v1/hr/leaves/me"),
  applyLeave: (body: {
    leaveTypeId: number;
    startDate: string;
    endDate: string;
    reason?: string;
  }) => apiClient.post<LeaveRequestRow>("/v1/hr/leaves/apply", body),
  cancelLeave: (id: number) => apiClient.post<LeaveRequestRow>(`/v1/hr/leaves/${id}/cancel`, {}),
  leaves: (params: { status?: string; employeeId?: number }) =>
    apiClient.get<LeaveRequestRow[]>(`/v1/hr/leaves${toQueryString(params)}`),
  approveLeave: (id: number) => apiClient.post<LeaveRequestRow>(`/v1/hr/leaves/${id}/approve`, {}),
  rejectLeave: (id: number, reason?: string) =>
    apiClient.post<LeaveRequestRow>(`/v1/hr/leaves/${id}/reject`, { reason }),

  appraisals: (params: { cycle?: string; employeeId?: number; status?: string }) =>
    apiClient.get<AppraisalRow[]>(`/v1/hr/appraisals${toQueryString(params)}`),
  myAppraisals: () => apiClient.get<AppraisalRow[]>("/v1/hr/appraisals/me"),
  createAppraisal: (body: Record<string, unknown>) =>
    apiClient.post<AppraisalRow>("/v1/hr/appraisals", body),
  updateAppraisal: (id: number, body: Record<string, unknown>) =>
    apiClient.patch<AppraisalRow>(`/v1/hr/appraisals/${id}`, body),
  submitAppraisal: (id: number) => apiClient.post<AppraisalRow>(`/v1/hr/appraisals/${id}/submit`, {}),
  acknowledgeAppraisal: (id: number) =>
    apiClient.post<AppraisalRow>(`/v1/hr/appraisals/${id}/acknowledge`, {}),
  deleteAppraisal: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/hr/appraisals/${id}`),
};

export const crmQueryKeys = {
  summary: ["crm", "summary"] as const,
  crmCustomers: (p: object) => ["crm", "customers", p] as const,
  crmPartners: (p: object) => ["crm", "partners", p] as const,
  crmBookings: (p: object) => ["crm", "bookings", p] as const,
  rbacRoles: ["rbac", "roles"] as const,
  rbacCatalog: ["rbac", "catalog"] as const,
  rbacStaff: ["rbac", "staff"] as const,
  departments: ["hr", "departments"] as const,
  offices: ["hr", "offices"] as const,
  employees: (p: object) => ["hr", "employees", p] as const,
  employee: (id: number) => ["hr", "employee", id] as const,
  myAttendance: (month: string) => ["hr", "attendance", "me", month] as const,
  attendance: (p: object) => ["hr", "attendance", p] as const,
  leaveTypes: ["hr", "leave-types"] as const,
  leaveBalances: (employeeId: number, year?: number) =>
    ["hr", "leave-balances", employeeId, year] as const,
  myLeaves: ["hr", "leaves", "me"] as const,
  leaves: (p: object) => ["hr", "leaves", p] as const,
  appraisals: (p: object) => ["hr", "appraisals", p] as const,
  myAppraisals: ["hr", "appraisals", "me"] as const,
};

/* ============================ Resume builder ============================ */
// Tools → Resume Builder. Resumes are scoped server-side to the session user;
// `data` is the full editor document (see src/lib/resume.ts for the shape).

export interface ResumeSummaryRow {
  resumeId: number;
  title: string;
  template: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeDetail extends ResumeSummaryRow {
  userId: number;
  data: unknown;
}

export type ResumeAiMode = "improve" | "shorten" | "expand" | "grammar" | "keywords";

export interface AtsReport {
  score: number;
  wordCount: number;
  checks: { id: string; label: string; passed: boolean; tip: string; weight: number }[];
  aiSuggestions: string[];
  missingKeywords: string[];
  aiAvailable: boolean;
  targetRole: string | null;
}

export const resumeApi = {
  list: () => apiClient.get<ResumeSummaryRow[]>("/v1/resume"),
  get: (id: number) => apiClient.get<ResumeDetail>(`/v1/resume/${id}`),
  create: (body: { title?: string; template?: string; data?: unknown }) =>
    apiClient.post<ResumeDetail>("/v1/resume", body),
  update: (id: number, body: { title?: string; template?: string; data?: unknown }) =>
    apiClient.patch<ResumeDetail>(`/v1/resume/${id}`, body),
  remove: (id: number) => apiClient.delete<{ deleted: boolean }>(`/v1/resume/${id}`),
  duplicate: (id: number) => apiClient.post<ResumeDetail>(`/v1/resume/${id}/duplicate`),
  enhance: (body: { text: string; mode?: ResumeAiMode; context?: string }) =>
    apiClient.post<{ text: string; mode: ResumeAiMode }>("/v1/resume/ai/enhance", body),
  /** POST /v1/resume/ai/import — AI-structure an uploaded resume's plain text. */
  import: (body: { text: string }) => apiClient.post<unknown>("/v1/resume/ai/import", body),
  ats: (id: number, targetRole?: string) =>
    apiClient.post<AtsReport>(`/v1/resume/${id}/ats`, { targetRole: targetRole || undefined }),
};

export const resumeQueryKeys = {
  resumes: ["resumes"] as const,
  resume: (id: number) => ["resume", id] as const,
};
