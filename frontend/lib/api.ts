// Default RELATIVE (same-origin): Next.js /api/* ko backend pe proxy karta hai.
// Is liye browser ko backend ka IP/host pata hona ZARURI NAHI — IP change pe rebuild nahi chahiye.
// (Purana tareeqa: NEXT_PUBLIC_API_URL set karna — ab optional fallback hai.)
const API = process.env.NEXT_PUBLIC_API_URL || "";

async function req(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API}${path}`, {
    credentials: "include", // session cookie har request ke sath (warna refresh = logout)
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e: any = new Error(body.error || `API ${r.status}: ${path}`);
    e.data = body;
    throw e;
  }
  return body;
}

export const api = {
  health: () => req("/api/health"),
  signup: (b: any) => req("/api/auth/signup", { method: "POST", body: JSON.stringify(b) }),
  login: (b: any) => req("/api/auth/login", { method: "POST", body: JSON.stringify(b) }),
  google: (credential: string) => req("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) }),
  me: () => req("/api/auth/me"),
  logout: () => req("/api/auth/logout", { method: "POST", body: "{}" }),
  authConfig: () => req("/api/auth/config"),
  connect: (token: string, business_id: string) =>
    req("/api/connect", { method: "POST", body: JSON.stringify({ token, business_id }) }),
  disconnect: () => req("/api/disconnect", { method: "POST" }),
  sync: () => req("/api/sync", { method: "POST" }),
  businesses: () => req("/api/businesses"),
  pages: (posting = false) => req(posting ? "/api/pages?posting=1" : "/api/pages"),
  createPost: (b: any) => req("/api/posts", { method: "POST", body: JSON.stringify(b) }),
  createPostForm: async (fd: FormData) => {
    const r = await fetch(`${API}/api/posts`, { method: "POST", body: fd });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e: any = new Error(body.error || `API ${r.status}`);
      e.data = body;
      throw e;
    }
    return body;
  },
  // XHR upload taake progress % mile
  createPostXHR: (fd: FormData, onp: (pct: number) => void) =>
    new Promise<any>((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open("POST", `${API}/api/posts`);
      x.withCredentials = true;
      x.upload.onprogress = (e) => { if (e.lengthComputable) onp(Math.round((e.loaded / e.total) * 100)); };
      x.onload = () => {
        try {
          const b = JSON.parse(x.responseText || "{}");
          if (x.status >= 200 && x.status < 300) resolve(b);
          else reject(Object.assign(new Error(b.error || `API ${x.status}`), { data: b }));
        } catch { reject(new Error("Upload failed")); }
      };
      x.onerror = () => reject(new Error("Network error — backend on hai?"));
      x.send(fd);
    }),
  watchers: () => req("/api/watchers"),
  createWatcher: (b: any) => req("/api/watchers", { method: "POST", body: JSON.stringify(b) }),
  updateWatcher: (id: number, b: any) => req(`/api/watchers/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  deleteWatcher: (id: number) => req(`/api/watchers/${id}`, { method: "DELETE" }),
  runWatcher: (id: number) => req(`/api/watchers/${id}/run`, { method: "POST" }),
  instant: () => req("/api/instant"),
  createInstant: (b: any) => req("/api/instant", { method: "POST", body: JSON.stringify(b) }),
  updateInstant: (id: number, b: any) => req(`/api/instant/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  deleteInstant: (id: number) => req(`/api/instant/${id}`, { method: "DELETE" }),
  scanInstant: (id: number) => req(`/api/instant/${id}/scan`, { method: "POST" }),
  posts: (q = "") => req(`/api/posts${q}`),
  scheduled: (pageId: string) => req(`/api/fb/${pageId}/scheduled_posts`),
  deletePost: (id: number) => req(`/api/posts/${id}`, { method: "DELETE" }),
  pageHealth: (pageId: string) => req(`/api/fb/${pageId}/health`),
  monetization: (pageId: string) => req(`/api/fb/${pageId}/monetization`),
  insights: (pageId: string, range = 28) => req(`/api/fb/${pageId}/insights?range=${range}`),
  topPosts: (pageId: string, sort = "reach") => req(`/api/fb/${pageId}/top-posts?sort=${sort}`),
  overview: (range = 28) => req(`/api/overview?range=${range}`),
  viralGlobal: (limit = 10) => req(`/api/viral-global?limit=${limit}`),
  history: (range = 28, pageId = "") => req(`/api/history?range=${range}${pageId ? `&page_id=${pageId}` : ""}`),
  logs: () => req("/api/logs"),
  tokenHealth: () => req("/api/token/health"),
};
