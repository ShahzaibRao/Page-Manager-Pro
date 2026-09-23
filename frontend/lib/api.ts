const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function req(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API}${path}`, {
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
  posts: (q = "") => req(`/api/posts${q}`),
  scheduled: (pageId: string) => req(`/api/fb/${pageId}/scheduled_posts`),
  deletePost: (id: number) => req(`/api/posts/${id}`, { method: "DELETE" }),
  pageHealth: (pageId: string) => req(`/api/fb/${pageId}/health`),
  monetization: (pageId: string) => req(`/api/fb/${pageId}/monetization`),
  insights: (pageId: string, range = 28) => req(`/api/fb/${pageId}/insights?range=${range}`),
  topPosts: (pageId: string, sort = "reach") => req(`/api/fb/${pageId}/top-posts?sort=${sort}`),
  overview: (range = 28) => req(`/api/overview?range=${range}`),
  viralGlobal: (limit = 10) => req(`/api/viral-global?limit=${limit}`),
  logs: () => req("/api/logs"),
  tokenHealth: () => req("/api/token/health"),
};
