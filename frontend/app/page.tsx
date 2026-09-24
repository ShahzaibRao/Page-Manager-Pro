"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area,
} from "recharts";
import { api } from "../lib/api";
import { LANGS, THEMES, t, type Lang, type Theme } from "../lib/i18n";

/* ---------- tiny inline icons ---------- */
const I = ({ d, cls = "w-4 h-4" }: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" className={cls}><path d={d} /></svg>
);
const Ic = {
  dash: (c: string) => <I cls={c} d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" />,
  pages: (c: string) => <I cls={c} d="M4 4h16v12H4zM8 20h8M12 16v4" />,
  plus: (c: string) => <I cls={c} d="M12 5v14M5 12h14" />,
  clock: (c: string) => <I cls={c} d="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />,
  report: (c: string) => <I cls={c} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  chart: (c: string) => <I cls={c} d="M3 3v18h18M7 15l4-6 4 3 5-8" />,
  cash: (c: string) => <I cls={c} d="M2 7h20v10H2zM16 12h.01M2 10h20" />,
  flame: (c: string) => <I cls={c} d="M12 22c4 0 7-2.7 7-6.5 0-4-3-6-3-9-3 1-4 3-4 3S9 7 9 4C5 7 5 12 5 15.5 5 19.3 8 22 12 22z" />,
  logout: (c: string) => <I cls={c} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  zap: (c: string) => <I cls={c} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  folder: (c: string) => <I cls={c} d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
  gear: (c: string) => <I cls={c} d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />,
  users: (c: string) => <I cls={c} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />,
  eye: (c: string) => <I cls={c} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
  heart: (c: string) => <I cls={c} d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />,
  play: (c: string) => <I cls={c} d="M6 4l14 8-14 8z" />,
  check: (c: string) => <I cls={c} d="M20 6L9 17l-5-5" />,
  bell: (c: string) => <I cls={c} d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10.3 21a2 2 0 0 0 3.4 0" />,
  shield: (c: string) => <I cls={c} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  trash: (c: string) => <I cls={c} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  cal: (c: string) => <I cls={c} d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />,
  refresh: (c: string) => <I cls={c} d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15" />,
};

const NAV = [
  { id: "dashboard", k: "nav_dashboard", icon: Ic.dash },
  { id: "pages", k: "nav_pages", subk: "sub_bm", icon: Ic.pages },
  { id: "create", k: "nav_create", icon: Ic.plus },
  { id: "scheduled", k: "nav_scheduled", icon: Ic.clock },
  { id: "reports", k: "nav_reports", icon: Ic.report },
  { id: "folders", k: "nav_folders", icon: Ic.folder },
  { id: "creator", k: "nav_creator", icon: Ic.zap },
  { id: "insights", k: "nav_insights", icon: Ic.chart },
  { id: "monetization", k: "nav_monetization", icon: Ic.cash },
  { id: "viral", k: "nav_viral", icon: Ic.flame },
  { id: "settings", k: "nav_settings", icon: Ic.gear },
];
const TITLE_KEYS: Record<string, string> = {
  dashboard: "t_dashboard", pages: "t_pages", create: "t_create",
  scheduled: "t_scheduled", reports: "t_reports", folders: "t_folders", creator: "t_creator", insights: "t_insights",
  monetization: "t_monetization", viral: "t_viral", settings: "t_settings",
};
const fmt = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : `${n || 0}`;
const avatarOf = (name: string) => (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const Empty = ({ title, sub, action }: any) => (
  <div className="rounded-[18px] t-card border t-line p-10 text-center max-w-[560px]">
    <div className="w-12 h-12 mx-auto rounded-full bg-[#1877F2]/15 border border-[#1877F2]/20 flex items-center justify-center">{Ic.shield("w-5 h-5 text-[#6AA8FF]")}</div>
    <div className="font-semibold mt-4">{title}</div>
    <div className="text-[13px] t-m2 mt-1">{sub}</div>
    {action}
  </div>
);

export default function Dashboard() {
  // NOTE: localStorage sirf mount ke baad parho — warna server/client HTML mismatch (hydration error)
  const [lang, setLang] = useState<Lang>("ur");
  const [theme, setTheme] = useState<Theme>("dark");
  const [selId, setSelId] = useState("");
  useEffect(() => {
    try {
      const s = localStorage.getItem("pmp_page");
      if (s) setSelId(s);
      const l = localStorage.getItem("pmp_lang") as Lang;
      if (l) setLang(l);
      const th = localStorage.getItem("pmp_theme") as Theme;
      if (th) setTheme(th);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("pmp_lang", lang); } catch {}
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  useEffect(() => {
    try { localStorage.setItem("pmp_theme", theme); } catch {}
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  const [tab, setTab] = useState("dashboard");
  const [backendUp, setBackendUp] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pages, setPages] = useState<any[]>([]);
  useEffect(() => {
    try { localStorage.setItem("pmp_page", selId || ""); } catch {}
  }, [selId]);
  const [insights, setInsights] = useState<any>(null);
  const [range, setRange] = useState(28);
  const [health, setHealth] = useState<any>(null);
  const [monet, setMonet] = useState<any>(null);
  const [viral, setViral] = useState<any>(null);
  const [viralSort, setViralSort] = useState("reach");
  const [queue, setQueue] = useState<any>({ local: [], remote: [] });
  const [logs, setLogs] = useState<any[]>([]);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [postAs, setPostAs] = useState("feed");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  // auto-folder watchers
  const [watchers, setWatchers] = useState<any[]>([]);
  // instant watchers
  const [iwatches, setIwatches] = useState<any[]>([]);
  const [iwfFolder, setIwfFolder] = useState("");
  const [iwfPage, setIwfPage] = useState("");
  const [iwfMode, setIwfMode] = useState("reel");
  const [iwfPerScan, setIwfPerScan] = useState(5);
  const [wfFolder, setWfFolder] = useState("");
  const [wfPage, setWfPage] = useState("");
  const [wfTime, setWfTime] = useState("20:00");
  const [wfMode, setWfMode] = useState("reel");
  const [wfPerRun, setWfPerRun] = useState(1);
  const [schedAt, setSchedAt] = useState("");
  const [toast, setToast] = useState("");
  const [pageFilter, setPageFilter] = useState<"access" | "all">("access");
  const [pageSearch, setPageSearch] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [drop, setDrop] = useState(false);
  const [connToken, setConnToken] = useState("");
  const [connBiz, setConnBiz] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<any>(null);
  const [gviral, setGviral] = useState<any>(null);
  const [gloading, setGloading] = useState(false);
  const [hist, setHist] = useState<any>(null);
  const [hrange, setHrange] = useState(28);
  const sel = selId === "GLOBAL"
    ? { id: "GLOBAL", name: "All Pages", category: "Global • overall insights", followers_count: overview?.kpis?.followers ?? 0, can_post: false }
    : (pages.find((p) => p.id === selId) || pages.find((p) => p.can_post) || pages[0]);
  const isGlobal = selId === "GLOBAL";
  const accessPages = useMemo(() => pages.filter((p) => p.can_post), [pages]);
  const [pageSort, setPageSort] = useState("followers_desc");
  const filteredPages = useMemo(() => {
    const base = pageFilter === "access" ? accessPages : pages;
    const q = pageSearch.trim().toLowerCase();
    let out = q ? base.filter((p) => (p.name || "").toLowerCase().includes(q)) : [...base];
    if (pageSort === "followers_desc") out.sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0));
    else if (pageSort === "followers_asc") out.sort((a, b) => (a.followers_count || 0) - (b.followers_count || 0));
    else out.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return out;
  }, [pageFilter, accessPages, pages, pageSearch, pageSort]);
  // pages pagination (200 per page)
  const PAGE_SIZE = 200;
  const [pageNum, setPageNum] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredPages.length / PAGE_SIZE));
  const safePageNum = Math.min(pageNum, totalPages);
  const pagedPages = filteredPages.slice((safePageNum - 1) * PAGE_SIZE, safePageNum * PAGE_SIZE);
  const goPage = (n: number) => setPageNum(Math.max(1, Math.min(totalPages, n)));
  useEffect(() => { setPageNum(1); }, [pageFilter, pageSearch, pages.length, pageSort]);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(""), 4000); };

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [booted, setBooted] = useState(false); // pehli data-load complete — is se pehle neutral UI (no flash)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authCfg, setAuthCfg] = useState<any>({ google: false, google_client_id: "" });
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const refreshPages = async () => {
    try {
      const h = await api.health();
      setBackendUp(true); setConnected(h.connected);
      if (!h.connected) { setPages([]); return; }
      const b = await api.businesses();
      const all = (b.businesses || []).flatMap((x: any) => x.pages || []);
      // fallback: direct pages endpoint (can_post flag ke sath)
      let list = all;
      try {
        const pg = await api.pages();
        if ((pg.pages || []).length >= list.length) list = pg.pages;
      } catch (e: any) {
        if (e?.data?.need_login) return; // login nahi — backend off nahi
        throw e;
      }
      setPages(list);
      if (list.length && selId !== "GLOBAL") {
        const cur = list.find((p: any) => p.id === selId);
        const preferred = cur || list.find((p: any) => p.can_post) || list[0];
        if (preferred.id !== selId) setSelId(preferred.id);
      }
    } catch (e: any) {
      if (e?.data?.need_login) return; // backend up hai, bas login chahiye
      setBackendUp(false);
    }
  };

  useEffect(() => { (async () => {
    try { setAuthCfg(await api.authConfig()); } catch {}
    try { const m = await api.me(); setUser(m.user); } catch {}
    setAuthChecked(true);
  })(); }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => { await refreshPages(); setLoading(false); setBooted(true); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const doAuth = async () => {
    setAuthErr("");
    if (!authEmail.trim() || authPass.length < 6) { setAuthErr(authPass.length < 6 ? "Password min 6 characters" : "Email?"); return; }
    setAuthBusy(true);
    try {
      const r = authMode === "signup"
        ? await api.signup({ email: authEmail.trim(), password: authPass, name: authName.trim() })
        : await api.login({ email: authEmail.trim(), password: authPass });
      setUser(r.user);
      setAuthPass("");
    } catch (e: any) { setAuthErr(e.message || "Failed"); }
    setAuthBusy(false);
  };
  const doGoogle = async (credential: string) => {
    setAuthErr(""); setAuthBusy(true);
    try {
      const r = await api.google(credential);
      setUser(r.user);
    } catch (e: any) { setAuthErr(e.message || "Google failed"); }
    setAuthBusy(false);
  };
  const doLogout = async () => {
    try { await api.logout(); } catch {}
    setUser(null); setPages([]); setConnected(false); setSelId(""); setTab("dashboard");
    setInsights(null); setMonet(null); setViral(null); setOverview(null); setGviral(null); setHist(null);
  };
  // Google button (GIS) — sirf tab jab backend ne client id di ho
  useEffect(() => {
    if (user || !authCfg.google || !authCfg.google_client_id) return;
    const w = window as any;
    const render = () => {
      if (!w.google || !googleBtnRef.current) return;
      w.google.accounts.id.initialize({ client_id: authCfg.google_client_id, callback: (r: any) => doGoogle(r.credential), auto_select: false });
      w.google.accounts.id.renderButton(googleBtnRef.current, { theme: "filled_blue", size: "large", width: 320 });
    };
    if (w.google) { render(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true; s.onload = render;
    document.head.appendChild(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authCfg]);

  useEffect(() => {
    if (!sel || sel.id === "GLOBAL") return;
    // core: dashboard ke liye (chart, KPIs, monet mini, queue badge)
    (async () => {
      try {
        const [ins, mo, q] = await Promise.all([
          api.insights(sel.id, range).catch((e) => e.data || { error: true }),
          api.monetization(sel.id).catch((e) => e.data || { error: true }),
          api.scheduled(sel.id).catch(() => ({ local: [], remote: [] })),
        ]);
        setInsights(ins.error ? null : ins);
        setMonet(mo.error ? null : mo);
        setQueue(q);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, range]);

  // lazy: top posts SIRF viral tab khulne pe (sab se slow call)
  useEffect(() => {
    if (!sel || sel.id === "GLOBAL" || tab !== "viral") return;
    setViral(null);
    (async () => {
      try {
        const vi = await api.topPosts(sel.id, viralSort).catch((e) => e.data || { error: true });
        setViral(vi.error ? null : vi);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, viralSort, tab]);

  // lazy: page health SIRF settings tab pe
  useEffect(() => {
    if (!sel || sel.id === "GLOBAL" || tab !== "settings") return;
    (async () => {
      try {
        const hh = await api.pageHealth(sel.id).catch((e) => e.data || { error: true });
        setHealth(hh.error ? null : hh);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, tab]);

  // global data (sab posting-access pages)
  useEffect(() => {
    if (selId !== "GLOBAL") return;
    setGloading(true);
    (async () => {
      try {
        const [o, v] = await Promise.all([api.overview(range), api.viralGlobal(10)]);
        setOverview(o); setGviral(v);
      } catch {}
      setGloading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, range]);

  // posting history (dashboard widget + reports)
  useEffect(() => {
    if (!backendUp) return;
    if (tab !== "dashboard" && tab !== "reports") return;
    if (selId !== "GLOBAL" && !sel) return;
    (async () => {
      try {
        const h = await api.history(hrange, selId === "GLOBAL" ? "" : (sel?.id || ""));
        setHist(h);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, hrange, selId, backendUp]);

  useEffect(() => {
    if (tab === "settings" && backendUp) {
      api.logs().then((l) => setLogs(l.logs || [])).catch(() => {});
      api.tokenHealth().then(setTokenInfo).catch(() => {});
    }
  }, [tab, backendUp]);

  const chartData = useMemo(() => {
    if (!insights?.series) return [];
    return (insights.series.labels || []).map((l: string, i: number) => ({
      name: l, reach: insights.series.reach[i], engagement: insights.series.engagement[i],
    }));
  }, [insights]);

  const doConnect = async () => {
    if (!connToken.trim()) return say("System User Token paste karein");
    setConnecting(true);
    try {
      const r = await api.connect(connToken.trim(), connBiz.trim());
      setConnToken("");
      say(`Connected ✓ ${r.me?.name || ""} — ${r.pages} pages (${r.with_access ?? 0} posting access)${(r.notes || []).length ? " • " + r.notes.join("; ") : ""}`);
      await refreshPages();
    } catch (e: any) { say(e.message || "Connect failed"); }
    setConnecting(false);
  };
  const doSync = async () => {
    try { const r = await api.sync(); say(`Synced ✓ ${r.pages} pages (${r.with_access ?? 0} posting access)${(r.notes || []).length ? " • " + r.notes.join("; ") : ""}`); await refreshPages(); }
    catch (e: any) { say(e.message || "Sync failed"); }
  };
  const doDisconnect = async () => {
    try { await api.disconnect(); setPages([]); setConnected(false); say("Disconnected — token hata diya"); }
    catch (e: any) { say(e.message); }
  };

  const hasVideo = files.some((f) => f.type.startsWith("video"));
  const addFiles = (list: FileList | null, kind: "image" | "video") => {
    if (!list) return;
    const arr = Array.from(list).filter((f) => kind === "video" ? f.type.startsWith("video") : f.type.startsWith("image"));
    if (!arr.length) return say(kind === "video" ? "Video file select karein" : "Photo file select karein");
    if (kind === "video") setFiles((prev) => [...prev.filter((f) => !f.type.startsWith("video")), arr[0]]);
    else setFiles((prev) => [...prev, ...arr].slice(0, 10));
  };

  const publish = async (scheduled: boolean) => {
    if (isGlobal) return say("Pehle header se koi page select karein");
    if (!msg.trim() && !photoUrl.trim() && !linkUrl.trim() && !files.length) return say("Pehle text, photo, video ya link dein");
    if (scheduled && (!schedAt || new Date(schedAt) <= new Date())) return say("Future date/time select karein");
    if (files.filter((f) => f.type.startsWith("video")).length > 1) return say("Ek post me sirf 1 video");
    setUploading(true); setProgress(0);
    try {
      const fd = new FormData();
      fd.append("page_id", sel.id);
      fd.append("message", msg);
      fd.append("link_url", linkUrl);
      fd.append("photo_url", photoUrl);
      fd.append("post_as", hasVideo ? postAs : "feed");
      if (scheduled) fd.append("scheduled_time", schedAt);
      files.forEach((f) => fd.append("files", f));
      const r = await api.createPostXHR(fd, setProgress);
      setMsg(""); setLinkUrl(""); setPhotoUrl(""); setSchedAt(""); setFiles([]); setPostAs("feed"); setProgress(0);
      const q = await api.scheduled(sel.id); setQueue(q);
      say(scheduled ? `Scheduled ✓ ${r.note || ""}` : `Published ✓ (fb id: ${r.fb?.id || r.fb?.post_id || ""}) ${r.note || ""}`);
    } catch (e: any) { say(e.data?.warning ? "Queued (FB warning)" : (e.message || "Publish failed")); }
    setUploading(false);
  };
  const delPost = async (id: number) => {
    try {
      await api.deletePost(id);
      setQueue({ ...queue, local: queue.local.filter((p: any) => p.id !== id) });
      say("Scheduled post delete ✓");
    } catch (e: any) { say(e.message); }
  };

  // ---- auto-folder watchers ----
  const loadWatchers = async () => {
    try { const w = await api.watchers(); setWatchers(w.watchers || []); } catch {}
  };
  useEffect(() => { if (tab === "folders" && backendUp) loadWatchers(); }, [tab, backendUp]);
  const createWatcher = async () => {
    if (!wfFolder.trim()) return say("Folder path dein (e.g. C:\\Videos\\Uploads)");
    if (!wfPage) return say("Page select karein");
    if (!wfTime) return say("Daily time select karein");
    try {
      await api.createWatcher({ folder_path: wfFolder.trim(), page_id: wfPage, daily_time: wfTime, post_as: wfMode, per_run: wfPerRun });
      setWfFolder("");
      await loadWatchers();
      say("Auto-folder setup ✓ — roz us time pe upload hoga");
    } catch (e: any) { say(e.message); }
  };
  const toggleWatcher = async (w: any) => {
    try { await api.updateWatcher(w.id, { status: w.status === "active" ? "paused" : "active" }); await loadWatchers(); }
    catch (e: any) { say(e.message); }
  };
  const delWatcher = async (id: number) => {
    try { await api.deleteWatcher(id); await loadWatchers(); say("Watcher delete ✓ (files untouched)"); }
    catch (e: any) { say(e.message); }
  };
  const runWatcherNow = async (id: number) => {
    say("Uploading next file...");
    try { const r = await api.runWatcher(id); await loadWatchers(); say(r.uploaded ? `${r.uploaded} file upload ✓ (deleted from folder)` : "Folder khali hai"); }
    catch (e: any) { say(e.message); }
  };

  // ---- stock alerts (auto-folder low files) ----
  const [alerts, setAlerts] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifiedRef = useRef<Set<number>>(new Set());
  const stockMeta = (s: string) => s === "critical"
    ? { label: t(lang, "notif_critical"), color: "#FF6B6B" }
    : s === "watch"
    ? { label: t(lang, "notif_watch"), color: "#FFB86A" }
    : { label: t(lang, "notif_low"), color: "#FFD166" };
  const loadAlerts = async () => {
    try {
      const w = await api.watchers();
      const low = (w.watchers || []).filter((x: any) => x.stock && x.stock !== "ok");
      setAlerts(low);
      for (const x of low) {
        if (x.stock === "critical" && !notifiedRef.current.has(x.id)) {
          notifiedRef.current.add(x.id);
          say(`🔴 ${x.name}: ${x.files} files (${x.days_left} ${t(lang, "days_unit")}) — ${t(lang, "notif_critical")}`);
        }
      }
    } catch {}
  };
  useEffect(() => {
    if (!backendUp) return;
    loadAlerts();
    const iv = setInterval(loadAlerts, 60000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUp, lang]);
  const loadInstant = async () => {
    try { const w = await api.instant(); setIwatches(w.watchers || []); } catch {}
  };
  useEffect(() => { if (tab === "creator" && backendUp) loadInstant(); }, [tab, backendUp]);
  const createInstant = async () => {
    if (!iwfFolder.trim()) return say("Folder path dein (e.g. C:\\Videos\\Instant)");
    if (!iwfPage) return say("Page select karein");
    try {
      await api.createInstant({ folder_path: iwfFolder.trim(), page_id: iwfPage, post_as: iwfMode, per_scan: iwfPerScan });
      setIwfFolder("");
      await loadInstant();
      say("Instant folder setup ✓ — nayi file ate hi upload hogi");
    } catch (e: any) { say(e.message); }
  };
  const toggleInstant = async (w: any) => {
    try { await api.updateInstant(w.id, { status: w.status === "active" ? "paused" : "active" }); await loadInstant(); }
    catch (e: any) { say(e.message); }
  };
  const delInstant = async (id: number) => {
    try { await api.deleteInstant(id); await loadInstant(); say("Instant watcher delete ✓ (files untouched)"); }
    catch (e: any) { say(e.message); }
  };
  const scanInstantNow = async (id: number) => {
    say("Scanning folder...");
    try { const r = await api.scanInstant(id); await loadInstant(); say(r.uploaded ? `${r.uploaded} file upload ✓ (deleted)` : "Koi stable file nahi (copy ho rahi hogi ya khali)"); }
    catch (e: any) { say(e.message); }
  };

  const kpis = insights?.kpis;
  const ml = { reach: t(lang, "k_views"), engagement: t(lang, "k_eng") };
  const cards = [
    { label: t(lang, "k_followers"), value: fmt(kpis?.followers ?? sel?.followers_count ?? 0), icon: Ic.users, color: "#1877F2" },
    { label: `${ml.reach} • ${range}d`, value: fmt(kpis?.reach ?? 0), icon: Ic.eye, color: "#8B5CF6" },
    { label: ml.engagement, value: fmt(kpis?.engagement ?? 0), icon: Ic.heart, color: "#EC4899" },
    { label: t(lang, "k_videos"), value: fmt(kpis?.video_views_3s ?? 0), icon: Ic.play, color: "#3DD598" },
  ];
  const queuedCount = (queue.local || []).length;

  const rangeBtns = (val: number, set: (n: number) => void) => (
    <div className="flex gap-2">{[7, 28, 90].map((r) => (
      <button key={r} onClick={() => set(r)} className={`h-7 px-3 rounded-full text-[12px] ${val === r ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>{r}d</button>
    ))}</div>
  );
  const histWidget = hist ? (
    <div className="rounded-[18px] t-card border t-line p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-[15px] font-semibold">{t(lang, "rep_daily")} • {hrange}d{isGlobal ? "" : ` • ${sel?.name || ""}`}</h3>
        <div className="flex items-center gap-2">
          {rangeBtns(hrange, setHrange)}
          <button onClick={() => setTab("reports")} className="h-7 px-3 rounded-full text-[12px] t-panel border t-line3 t-m1">{t(lang, "rep_view")} →</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
        {[[t(lang, "rep_total"), hist.total, "#1877F2"], [t(lang, "rep_text"), (hist.by_type.text || 0) + (hist.by_type.link || 0), "#8B5CF6"], [t(lang, "rep_photos"), hist.by_type.photo || 0, "#EC4899"], [t(lang, "rep_videos"), hist.by_type.video || 0, "#3DD598"], [t(lang, "rep_reels"), hist.by_type.reel || 0, "#FFB86A"]].map(([l, v, c]: any) => (
          <div key={String(l)} className="rounded-[12px] t-inner border t-line p-3 text-center">
            <div className="text-[20px] font-semibold" style={{ color: c }}>{v}</div>
            <div className="text-[11px] t-m2 mt-0.5">{l}</div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  /* ================= AUTH SCREEN ================= */
  const AuthScreen = (
    <div className="min-h-screen t-bg t-text flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] rounded-[20px] t-card border t-line p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-[#1877F2]/15 blur-[60px] rounded-full" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#1877F2] flex items-center justify-center font-bold text-[16px] shadow-[0_0_20px_rgba(24,119,242,0.4)]">P</div>
          <div>
            <div className="font-semibold text-[16px]">Page Manager Pro</div>
            <div className="text-[11px] t-m2">{t(lang, "auth_tag")}</div>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          {(["login", "signup"] as const).map((m) => (
            <button key={m} onClick={() => { setAuthMode(m); setAuthErr(""); }}
              className={`flex-1 h-9 rounded-full text-[13px] font-medium ${authMode === m ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>
              {m === "login" ? t(lang, "auth_login") : t(lang, "auth_signup")}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {authMode === "signup" && (
            <input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder={t(lang, "auth_name")}
              className="w-full h-11 rounded-[12px] t-bg border t-line px-4 text-[13px] focus:outline-none" />
          )}
          <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder={t(lang, "auth_email")} type="email" autoComplete="email"
            className="w-full h-11 rounded-[12px] t-bg border t-line px-4 text-[13px] focus:outline-none" onKeyDown={(e) => e.key === "Enter" && doAuth()} />
          <input value={authPass} onChange={(e) => setAuthPass(e.target.value)} placeholder={t(lang, "auth_password")} type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"}
            className="w-full h-11 rounded-[12px] t-bg border t-line px-4 text-[13px] focus:outline-none" onKeyDown={(e) => e.key === "Enter" && doAuth()} />
        </div>
        {authErr && <div className="mt-3 p-2.5 rounded-[10px] bg-[#2A1515] border border-red-900 text-[12px] text-red-400">{authErr}</div>}
        <button onClick={doAuth} disabled={authBusy}
          className="mt-4 w-full h-11 rounded-full bg-[#1877F2] text-[14px] font-medium hover:bg-[#166FE5] disabled:opacity-50">
          {authBusy ? "..." : authMode === "login" ? t(lang, "auth_login") : t(lang, "auth_signup")}
        </button>
        <button onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthErr(""); }}
          className="mt-3 w-full text-center text-[12px] t-m2 t-texth">
          {authMode === "login" ? t(lang, "auth_new") : t(lang, "auth_have")}
        </button>
        {authCfg.google && (
          <>
            <div className="my-4 flex items-center gap-3 text-[11px] t-m3">
              <span className="flex-1 border-t t-line" /><span>OR</span><span className="flex-1 border-t t-line" />
            </div>
            <div ref={googleBtnRef} className="flex justify-center min-h-[40px]" />
          </>
        )}
      </div>
    </div>
  );

  /* ================= CONNECT SCREEN ================= */
  const ConnectCard = (
    <div className="max-w-[640px] rounded-[20px] t-card border t-line p-6 lg:p-8 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-[#1877F2]/15 blur-[60px] rounded-full" />
      <div className="flex items-center gap-2 text-[12px] font-semibold">
        <div className="w-6 h-6 rounded-full bg-[#1877F2]/20 flex items-center justify-center">{Ic.shield("w-3.5 h-3.5 text-[#1877F2]")}</div>
        {t(lang, "c_title")}
      </div>
      <h2 className="text-[20px] font-semibold mt-3">{t(lang, "sys_token")}</h2>
      <p className="text-[13px] t-m2 mt-1">{t(lang, "c_desc")}</p>
      <ol className="mt-4 space-y-2 text-[13px] t-m1 list-decimal list-inside">
        <li>{t(lang, "c_s1")}</li>
        <li>{t(lang, "c_s2")}</li>
        <li>{t(lang, "c_s3")}</li>
      </ol>
      <input type="password" value={connToken} onChange={(e) => setConnToken(e.target.value)} placeholder={t(lang, "c_token_ph")}
        className="mt-5 w-full h-11 rounded-[12px] t-bg border t-line px-4 text-[13px] focus:outline-none focus:border-[#1877F2]/60" />
      <input value={connBiz} onChange={(e) => setConnBiz(e.target.value)} placeholder={t(lang, "c_biz_ph")}
        className="mt-3 w-full h-11 rounded-[12px] t-bg border t-line px-4 text-[13px] focus:outline-none focus:border-[#1877F2]/60" />
      <button onClick={doConnect} disabled={connecting}
        className="mt-4 h-11 px-8 rounded-full bg-[#1877F2] text-[14px] font-medium hover:bg-[#166FE5] disabled:opacity-50 shadow-[0_0_20px_rgba(24,119,242,0.35)]">
        {connecting ? t(lang, "c_ing") : t(lang, "c_btn")}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen t-bg t-text flex antialiased" style={{ fontFamily: "Inter,system-ui" }}>
      {/* ===== SIDEBAR ===== */}
      <aside className="hidden lg:flex w-[272px] shrink-0 flex-col border-r t-line2 sticky top-0 h-screen">
        <div className="h-[72px] flex items-center px-6 gap-3 border-b t-line2">
          <div className="w-8 h-8 rounded-[9px] bg-[#1877F2] flex items-center justify-center font-bold text-[14px] shadow-[0_0_20px_rgba(24,119,242,0.4)]">P</div>
          <div>
            <div className="font-semibold tracking-tight text-[15px]">Page Manager Pro</div>
            <div className="text-[11px] t-m2 mt-1 font-medium tracking-wide">{t(lang, "business_suite")}</div>
          </div>
        </div>
        <div className="p-3 flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-widest t-m3 uppercase">{t(lang, "workspace")}</div>
          <nav className="space-y-[2px] mt-1">
            {NAV.map((n) => {
              const on = tab === n.id;
              return (
                <button key={n.id} onClick={() => setTab(n.id)}
                  className={`w-full flex items-center gap-3 px-3 py-[11px] rounded-[10px] text-[14px] font-medium transition-all text-left ${on ? "t-card t-text shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]" : "t-m1 t-texth t-hover"}`}>
                  {n.icon(`w-[18px] h-[18px] ${on ? "text-[#1877F2]" : "t-m2"}`)}
                  <span className="flex-1">{t(lang, n.k as any)}</span>
                  {n.subk && <span className="text-[10px] px-1.5 py-0.5 rounded t-chip">{t(lang, n.subk as any)}</span>}
                  {n.id === "scheduled" && queuedCount > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#1877F2] min-w-[20px] text-center">{queuedCount}</span>}
                  {on && <div className="w-1 h-4 bg-[#1877F2] rounded-full" />}
                </button>
              );
            })}
          </nav>
          <div className="mt-6 mx-3 p-4 rounded-[14px] t-card border t-line relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#1877F2]/20 blur-[30px] rounded-full" />
            <div className="flex items-center gap-2 text-[12px] font-semibold">
              <div className="w-6 h-6 rounded-full bg-[#1877F2]/20 flex items-center justify-center">{Ic.shield("w-3.5 h-3.5 text-[#1877F2]")}</div>
              {t(lang, "sys_token")}
            </div>
            <p className="text-[11px] t-m2 mt-2 leading-[1.5]">{t(lang, "sys_token_desc")}</p>
            <div className={`mt-3 flex items-center gap-2 text-[11px] font-medium ${!booted ? "t-m2" : connected ? "text-[#3DD598]" : "text-[#FFB86A]"}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${!booted ? "bg-current" : connected ? "bg-[#3DD598]" : "bg-[#FFB86A]"}`} />
              {!booted ? "…" : connected ? `${t(lang, "token_on")} • ${pages.length} ${t(lang, "jwt_pages")}` : t(lang, "token_off")}
            </div>
          </div>
        </div>
        <div className="p-3 border-t t-line2">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] t-card border t-line">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1877F2] to-[#0A58CA] flex items-center justify-center text-[12px] font-bold">{(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{user?.name || user?.email || ""}</div>
              <div className="text-[11px] t-m2 truncate">{user?.email || ""}</div>
            </div>
          </div>
        </div>
      </aside>

      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[280px] t-bg border-r t-line2 flex flex-col">
            <div className="h-[64px] flex items-center px-5 gap-3 border-b t-line2">
              <div className="w-8 h-8 rounded-[9px] bg-[#1877F2] flex items-center justify-center font-bold">P</div>
              <div className="font-semibold">Page Manager Pro</div>
              <button onClick={() => setDrawer(false)} className="ml-auto t-m2">✕</button>
            </div>
            <div className="p-3 flex-1 overflow-auto">
              {NAV.map((n) => (
                <button key={n.id} onClick={() => { setTab(n.id); setDrawer(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-[10px] text-[14px] ${tab === n.id ? "t-card" : "t-m1"}`}>
                  {n.icon("w-5 h-5")} {t(lang, n.k as any)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setDrawer(false)} />
        </div>
      )}

      {/* ===== MAIN ===== */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[64px] lg:h-[72px] sticky top-0 z-20 t-bg/80 backdrop-blur-[16px] border-b t-line2 flex items-center px-4 lg:px-8 gap-3">
          <button className="lg:hidden p-2 -ml-2" onClick={() => setDrawer(true)}>
            <div className="w-5 h-5 flex flex-col justify-center gap-1">
              <span className="h-0.5 w-5 t-invbtn rounded" /><span className="h-0.5 w-5 t-invbtn rounded" /><span className="h-0.5 w-5 t-invbtn rounded" />
            </div>
          </button>
          <div className="hidden md:flex items-center gap-2 text-[13px]">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${!booted ? "t-card border t-line t-m2" : connected ? "bg-[#132E1F] border-[#1E4A2E] text-[#3DD598]" : "bg-[#2A1F15] border-[#4A3520] text-[#FFB86A]"}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${!booted ? "bg-current" : connected ? "bg-[#3DD598]" : "bg-[#FFB86A]"}`} />
              {!booted ? "…" : connected ? t(lang, "connected") : t(lang, "not_connected")}
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full t-card border t-line t-m1 text-[12px]">
              {Ic.shield("w-3.5 h-3.5 t-m2")} {t(lang, "sys_token")}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {connected && pages.length > 0 && (
              <div className="relative">
                <button onClick={() => setDrop(!drop)} className="flex items-center gap-2.5 h-9 px-3 rounded-full t-card border t-line t-hover" title={sel?.can_post ? sel?.name : t(lang, "create_warn")}>
                  {isGlobal
                    ? <div className="w-6 h-6 rounded-full bg-[#3DD598]/15 border border-[#3DD598]/30 flex items-center justify-center text-[12px]">🌐</div>
                    : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1877F2] to-[#0A58CA] flex items-center justify-center text-[11px] font-bold">{avatarOf(sel?.name)}</div>}
                  <div className="hidden sm:block text-[13px] font-medium">{sel?.name}</div>
                  {!sel?.can_post && <span className="hidden sm:block text-[10px] px-1.5 py-0.5 rounded bg-[#2A1F15] text-[#FFB86A]">{t(lang, "no_access")}</span>}
                  <span className="t-m2 text-xs">▾</span>
                </button>
                {drop && (
                  <div className="absolute right-0 mt-2 w-[320px] rounded-[16px] t-card border t-line3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden z-50">
                    <div className="p-3 text-[11px] font-semibold tracking-widest t-m3 uppercase">{t(lang, "switcher_title")} • {accessPages.length} {t(lang, "jwt_pages")}</div>
                    <div className="max-h-[320px] overflow-auto">
                    <button onClick={() => { setSelId("GLOBAL"); setDrop(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-3 t-hover text-left ${isGlobal ? "t-selrow" : ""}`}>
                      <div className="w-9 h-9 rounded-full bg-[#3DD598]/15 border border-[#3DD598]/30 flex items-center justify-center text-[16px]">🌐</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium">{t(lang, "all_pages_global")}</div>
                        <div className="text-[12px] t-m2 truncate">{accessPages.length} {t(lang, "overall_sub")}</div>
                      </div>
                      {isGlobal && <span className="text-[#1877F2]">{Ic.check("w-4 h-4")}</span>}
                    </button>
                    <div className="mx-3 border-t t-line" />
                    {accessPages.map((p) => (
                      <button key={p.id} onClick={() => { setSelId(p.id); setDrop(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-3 t-hover text-left ${p.id === selId ? "t-selrow" : ""}`}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1877F2] to-[#0A58CA] flex items-center justify-center font-bold text-[12px]">{avatarOf(p.name)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-medium truncate">{p.name}</div>
                          <div className="text-[12px] t-m2 truncate">{fmt(p.followers_count)} followers • {p.category}</div>
                        </div>
                        {p.id === selId && <span className="text-[#1877F2]">{Ic.check("w-4 h-4")}</span>}
                      </button>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {connected && (
              <button onClick={doSync} title="Re-sync from Facebook" className="h-9 px-3 rounded-full t-card border t-line flex items-center gap-1.5 text-[12px] t-m1 t-texth">{Ic.refresh("w-3.5 h-3.5")} Sync</button>
            )}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} title={t(lang, "notif_title")}
                className="w-9 h-9 rounded-full t-card border t-line flex items-center justify-center t-m1 t-texth relative">
                {Ic.bell("w-4 h-4")}
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{alerts.length}</span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[320px] rounded-[16px] t-card border t-line3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden z-50">
                  <div className="p-3 text-[11px] font-semibold tracking-widest t-m3 uppercase">{t(lang, "notif_title")} • {alerts.length}</div>
                  <div className="max-h-[320px] overflow-auto">
                    {alerts.length === 0 && <div className="px-4 py-5 text-[13px] t-m2">{t(lang, "notif_empty")}</div>}
                    {alerts.map((a) => {
                      const m = stockMeta(a.stock);
                      return (
                        <button key={a.id} onClick={() => { setNotifOpen(false); setTab("folders"); }}
                          className="w-full flex items-center gap-3 px-4 py-3 t-hover text-left">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
                          <span className="flex-1 min-w-0">
                            <span className="text-[13px] font-medium block truncate">{a.name}</span>
                            <span className="text-[11px] t-m2 block">{a.files} files • {a.days_left} {t(lang, "days_unit")} • <b style={{ color: m.color }}>{m.label}</b></span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => { setNotifOpen(false); setTab("folders"); }}
                    className="w-full py-2.5 text-[12px] t-m1 border-t t-line t-hover">{t(lang, "notif_view")} →</button>
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#1877F2] flex items-center justify-center text-[12px] font-bold" title={user?.email || ""}>{(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}</div>
            <button onClick={doLogout} title={t(lang, "auth_logout")}
              className="w-8 h-8 rounded-full t-card border t-line hidden sm:flex items-center justify-center t-m2 hover:text-red-400">{Ic.logout("w-3.5 h-3.5")}</button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1440px] w-full mx-auto">
          <div>
            <h1 className="text-[22px] lg:text-[28px] font-semibold tracking-tight">{t(lang, (TITLE_KEYS[tab] || "t_dashboard") as any)}</h1>
            <p className="text-[14px] t-m2 mt-1">
              {tab === "pages" ? t(lang, "sub_pages")
                : sel ? `${sel.name} • ${sel.category || ""}` : t(lang, "sub_real")}
            </p>
          </div>

          {!backendUp && !loading && (
            <div className="p-3 rounded-[12px] bg-[#2A1F15] border border-[#4A3520] text-[13px] text-[#FFB86A]">
              {t(lang, "backend_off")} <code>cd backend && npm start</code>
            </div>
          )}

          {!authChecked || loading || (user && !booted) ? (
            <div className="t-m2 text-[14px]">{t(lang, "loading")}</div>
          ) : !user ? (
            <>{AuthScreen}</>
          ) : !connected || pages.length === 0 ? (
            <>{ConnectCard}</>
          ) : (
            <>
              {/* ===== DASHBOARD ===== */}
              {/* ===== DASHBOARD: GLOBAL ===== */}
              {tab === "dashboard" && isGlobal && (
                gloading && !overview ? <div className="t-m2 text-[14px]">{t(lang, "loading_overall")} ({accessPages.length} {t(lang, "jwt_pages")})...</div> : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: t(lang, "k_followers"), value: fmt(overview?.kpis?.followers ?? 0), icon: Ic.users, color: "#1877F2" },
                      { label: `${t(lang, "k_views")} • ${range}d`, value: fmt(overview?.kpis?.reach ?? 0), icon: Ic.eye, color: "#8B5CF6" },
                      { label: t(lang, "k_eng"), value: fmt(overview?.kpis?.engagement ?? 0), icon: Ic.heart, color: "#EC4899" },
                      { label: t(lang, "k_videos"), value: fmt(overview?.kpis?.video_views_3s ?? 0), icon: Ic.play, color: "#3DD598" },
                    ].map((c) => (
                      <div key={c.label} className="rounded-[18px] t-card border t-line p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20" style={{ background: c.color }} />
                        <div className="w-9 h-9 rounded-[10px] t-chip border flex items-center justify-center">{c.icon("w-4 h-4 t-m1")}</div>
                        <div className="mt-4"><div className="text-[28px] font-semibold leading-none">{c.value}</div>
                          <div className="text-[13px] t-m2 mt-1.5 font-medium">{c.label} • {overview?.pages ?? 0} {t(lang, "jwt_pages")}</div></div>
                      </div>
                    ))}
                  </div>
                  {histWidget}
                  <div className="rounded-[18px] t-card border t-line p-5 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div><h3 className="text-[15px] font-semibold">{t(lang, "global_title")}</h3>
                        <p className="text-[12px] t-m2 mt-0.5">{t(lang, "last_days")} {range} days • {t(lang, "summed")} {overview?.pages ?? 0} {t(lang, "jwt_pages")}</p></div>
                      <div className="flex items-center gap-2">
                        {[7, 28, 90].map((r) => (
                          <button key={r} onClick={() => setRange(r)} className={`h-7 px-3 rounded-full text-[12px] ${range === r ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>{r}d</button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-6 h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={(overview?.series?.labels || []).map((l: string, i: number) => ({ name: l, reach: overview.series.reach[i], engagement: overview.series.engagement[i] }))}>
                          <XAxis dataKey="name" stroke="#3A3A3A" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#3A3A3A" fontSize={11} tickLine={false} axisLine={false} width={40} />
                          <Tooltip contentStyle={{ background: "#1F1F1F", border: "1px solid #2A2A2A", borderRadius: 12, fontSize: 12 }} />
                          <Line type="monotone" dataKey="reach" stroke="#1877F2" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="engagement" stroke="#EC4899" strokeWidth={2.5} dot={false} />
                          <Area type="monotone" dataKey="reach" stroke="none" fill="#1877F2" fillOpacity={0.08} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="rounded-[18px] t-card border t-line overflow-hidden">
                    <div className="p-5 flex items-center gap-2 border-b t-line">
                      <span className="text-[15px] font-semibold">{t(lang, "viral_global")}</span>
                      <span className="text-[11px] t-m3 ml-auto">{gviral?.rule || ""}</span>
                    </div>
                    <div className="divide-y t-divide">
                      {(gviral?.posts || []).map((p: any) => (
                        <div key={p.fb_post_id} className="p-4 flex gap-3 items-center t-hover">
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] truncate">{p.message || "(no text)"}</div>
                            <div className="text-[11px] t-m2 mt-0.5">{p.page_name} • {p.created_time ? new Date(p.created_time).toLocaleDateString() : ""} • 👍{p.likes} 💬{p.comments} ↗{p.shares}</div>
                          </div>
                          <div className="text-[13px] font-semibold shrink-0">{fmt(p.engagement)} {t(lang, "eng_h")}</div>
                          {p.viral && <span className="text-[10px] px-2 py-1 rounded-full bg-[#1877F2] font-bold shrink-0">VIRAL</span>}
                        </div>
                      ))}
                      {!(gviral?.posts || []).length && <div className="p-6 text-center t-m2 text-[13px]">{t(lang, "no_posts")}</div>}
                    </div>
                  </div>
                  <div className="rounded-[18px] t-card border t-line overflow-hidden">
                    <div className="p-5 border-b t-line font-semibold text-[15px]">{t(lang, "breakdown")}</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-[11px] tracking-widest uppercase t-m3 border-b t-line">
                          <tr><th className="p-4 font-medium">{t(lang, "page_h")}</th><th className="p-4 font-medium">{t(lang, "followers_h")}</th><th className="p-4 font-medium">{t(lang, "k_views")}</th><th className="p-4 font-medium">{t(lang, "eng_h")}</th></tr>
                        </thead>
                        <tbody className="divide-y t-divide">
                          {(overview?.per_page || []).map((p: any) => (
                            <tr key={p.id} className="t-hover cursor-pointer" onClick={() => setSelId(p.id)}>
                              <td className="p-4 text-[13px] font-medium">{p.name}</td>
                              <td className="p-4 text-[13px]">{fmt(p.followers)}</td>
                              <td className="p-4 text-[13px]">{fmt(p.views)}</td>
                              <td className="p-4 text-[13px]">{fmt(p.engagements)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                )
              )}

              {/* ===== DASHBOARD: SINGLE ===== */}
              {tab === "dashboard" && !isGlobal && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cards.map((c) => (
                      <div key={c.label} className="rounded-[18px] t-card border t-line p-5 relative overflow-hidden t-line3h">
                        <div className="absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20" style={{ background: c.color }} />
                        <div className="flex items-center justify-between">
                          <div className="w-9 h-9 rounded-[10px] t-chip border flex items-center justify-center">{c.icon("w-4 h-4 t-m1")}</div>
                        </div>
                        <div className="mt-4"><div className="text-[28px] font-semibold leading-none">{c.value}</div>
                          <div className="text-[13px] t-m2 mt-1.5 font-medium">{c.label}</div></div>
                      </div>
                    ))}
                  </div>
                  {histWidget}
                  {!insights ? (
                    <Empty title={t(lang, "insights_unavail")} sub={t(lang, "insights_unavail_sub")}
                      action={<button onClick={doSync} className="mt-4 h-9 px-5 rounded-full bg-[#1877F2] text-[13px] font-medium">{t(lang, "resync")}</button>} />
                  ) : (
                    <div className="rounded-[18px] t-card border t-line p-5 lg:p-6">
                      <div className="flex items-center justify-between">
                        <div><h3 className="text-[15px] font-semibold">{ml.reach} vs {ml.engagement}</h3>
                          <p className="text-[12px] t-m2 mt-0.5">Last {range} days • {sel?.name}</p></div>
                        <div className="flex items-center gap-2">
                          {[7, 28, 90].map((r) => (
                            <button key={r} onClick={() => setRange(r)} className={`h-7 px-3 rounded-full text-[12px] ${range === r ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>{r}d</button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-6 h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <XAxis dataKey="name" stroke="#3A3A3A" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#3A3A3A" fontSize={11} tickLine={false} axisLine={false} width={40} />
                            <Tooltip contentStyle={{ background: "#1F1F1F", border: "1px solid #2A2A2A", borderRadius: 12, fontSize: 12 }} />
                            <Line type="monotone" dataKey="reach" stroke="#1877F2" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="engagement" stroke="#EC4899" strokeWidth={2.5} dot={false} />
                            <Area type="monotone" dataKey="reach" stroke="none" fill="#1877F2" fillOpacity={0.08} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {(insights.warnings || []).map((w: string) => (
                        <div key={w} className="mt-2 text-[12px] text-[#FFB86A]">{w}</div>
                      ))}
                    </div>
                  )}
                  {/* quick composer */}
                  <div className="rounded-[18px] t-card border t-line p-5 lg:p-6 max-w-[720px]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1877F2] to-[#0A58CA] flex items-center justify-center text-[12px] font-bold">{avatarOf(sel?.name)}</div>
                      <h3 className="text-[14px] font-semibold">{t(lang, "quick_post")}</h3>
                      <span className="ml-auto text-[11px] px-2 py-1 rounded-full bg-[#1877F2]/15 text-[#6AA8FF] border border-[#1877F2]/20">{t(lang, "for_label")} {sel?.name}</span>
                    </div>
                    <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={`${t(lang, "whats_happening")} ${sel?.name}?`}
                      className="mt-4 w-full min-h-[96px] rounded-[14px] t-inner border t-line p-3.5 text-[14px] focus:outline-none resize-none" />
                    <div className="mt-4 flex items-center gap-2">
                      <button onClick={() => setTab("create")} className="h-8 px-3 rounded-full t-panel border t-line3 text-[12px] flex items-center gap-1.5 t-hover">{Ic.clock("w-3.5 h-3.5")} {t(lang, "sched_btn")}</button>
                      <button onClick={() => publish(false)} className="ml-auto h-8 px-4 rounded-full bg-[#1877F2] text-[13px] font-medium hover:bg-[#166FE5]">{t(lang, "publish_btn")}</button>
                    </div>
                    <div className="mt-2 text-[11px] text-[#FFB86A]">{t(lang, "publish_warn")} {sel?.name} {t(lang, "confirm_first")}</div>
                  </div>
                </div>
              )}

              {/* ===== PAGES ===== */}
              {tab === "pages" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setPageFilter("access")}
                      className={`h-8 px-4 rounded-full text-[13px] font-medium ${pageFilter === "access" ? "bg-[#1877F2]" : "t-card border t-line t-m1"}`}>
                      {t(lang, "pages_access")} ({accessPages.length})
                    </button>
                    <button onClick={() => setPageFilter("all")}
                      className={`h-8 px-4 rounded-full text-[13px] font-medium ${pageFilter === "all" ? "bg-[#1877F2]" : "t-card border t-line t-m1"}`}>
                      {t(lang, "pages_all")} ({pages.length})
                    </button>
                    <input value={pageSearch} onChange={(e) => setPageSearch(e.target.value)} placeholder={t(lang, "search_pages")}
                      className="h-8 px-3 rounded-full t-card border t-line text-[13px] focus:outline-none w-[200px]" />
                    <select value={pageSort} onChange={(e) => setPageSort(e.target.value)}
                      className="h-8 px-2 rounded-full t-card border t-line text-[12px] focus:outline-none" title={t(lang, "sort_l")}>
                      <option value="followers_desc">{t(lang, "sort_top")}</option>
                      <option value="followers_asc">{t(lang, "sort_low")}</option>
                      <option value="name">{t(lang, "sort_az")}</option>
                    </select>
                    <span className="text-[12px] t-m3 ml-auto">{t(lang, "showing")} {(safePageNum - 1) * PAGE_SIZE + 1}–{Math.min(safePageNum * PAGE_SIZE, filteredPages.length)} {t(lang, "of")} {filteredPages.length}</span>
                  </div>
                  {pageFilter === "access" && accessPages.length === 0 && (
                    <div className="p-3 rounded-[12px] bg-[#2A1F15] border border-[#4A3520] text-[13px] text-[#FFB86A]">
                      {t(lang, "no_access_pages_warn")}
                    </div>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {pagedPages.map((p) => (
                    <div key={p.id} onClick={() => setSelId(p.id)}
                      className={`rounded-[20px] border p-6 relative overflow-hidden cursor-pointer ${p.id === selId ? "t-card2 border-[#1877F2]/50 shadow-[0_0_30px_rgba(24,119,242,0.15)]" : "t-card t-line t-line3h"}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1877F2] to-[#0A58CA] flex items-center justify-center font-bold">{avatarOf(p.name)}</div>
                          <div><div className="font-semibold">{p.name}</div>
                            <div className="text-[12px] t-m2">{p.category} • {p.fb_page_id}</div></div>
                        </div>
                        {p.id === selId && <span className="text-[11px] px-2 py-1 rounded-full bg-[#1877F2]">{t(lang, "selected")}</span>}
                        {!p.can_post && <span className="text-[10px] px-2 py-1 rounded-full t-panel border t-line3 t-m2">{t(lang, "no_access")}</span>}
                      </div>
                      <div className="mt-6 grid grid-cols-3 gap-3">
                        {[[t(lang, "followers_h"), fmt(p.followers_count)], [t(lang, "status_h"), p.is_published ? t(lang, "live") : t(lang, "hidden")], [t(lang, "verified_h"), p.verification_status === "verified" ? t(lang, "yes") : "—"]].map(([l, v]) => (
                          <div key={l} className="rounded-[12px] t-inner border t-line p-3 text-center">
                            <div className="text-[16px] font-semibold">{v}</div><div className="text-[11px] t-m2">{l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2">
                      <button onClick={() => goPage(safePageNum - 1)} disabled={safePageNum <= 1}
                        className="h-8 px-3 rounded-full t-panel border t-line3 text-[12px] disabled:opacity-40">← Prev</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePageNum) <= 2)
                        .reduce<(number | "…")[]>((acc, n) => {
                          const prev = acc[acc.length - 1];
                          if (typeof prev === "number" && (n as number) - prev > 1) acc.push("…");
                          acc.push(n);
                          return acc;
                        }, [])
                        .map((n, i) => n === "…" ? (
                          <span key={"e" + i} className="text-[12px] t-m3 px-1">…</span>
                        ) : (
                          <button key={n} onClick={() => goPage(n)}
                            className={`h-8 min-w-[32px] px-2 rounded-full text-[12px] font-medium ${n === safePageNum ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>{n}</button>
                        ))}
                      <button onClick={() => goPage(safePageNum + 1)} disabled={safePageNum >= totalPages}
                        className="h-8 px-3 rounded-full t-panel border t-line3 text-[12px] disabled:opacity-40">Next →</button>
                    </div>
                  )}
                </div>
              )}

              {/* ===== CREATE ===== */}
              {tab === "create" && (isGlobal ? (
                <Empty title={t(lang, "pick_page")} sub={t(lang, "pick_page_sub")} action={null} />
              ) : (
                <div className="max-w-[720px] rounded-[20px] t-card border t-line p-6 lg:p-8">
                  {!sel?.can_post && (
                    <div className="mb-4 p-3 rounded-[12px] bg-[#2A1F15] border border-[#4A3520] text-[13px] text-[#FFB86A]">
                      {sel?.name} {t(lang, "create_warn")}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1877F2] to-[#0A58CA] flex items-center justify-center font-bold">{avatarOf(sel?.name)}</div>
                    <div><div className="font-medium">{sel?.name}</div>
                      <div className="text-[12px] t-m2 flex items-center gap-1"><span className="w-2 h-2 bg-[#3DD598] rounded-full" /> {t(lang, "publishing_via")}</div></div>
                  </div>
                  <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t(lang, "whats_mind")}
                    className="mt-6 w-full min-h-[140px] rounded-[16px] t-bg border t-line p-4 text-[15px] focus:outline-none resize-none" />
                  <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder={t(lang, "link_ph")}
                    className="mt-3 w-full h-11 rounded-[12px] t-bg border t-line px-4 text-[13px] focus:outline-none" />
                  <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder={t(lang, "photo_ph")}
                    className="mt-3 w-full h-11 rounded-[12px] t-bg border t-line px-4 text-[13px] focus:outline-none" />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="rounded-[12px] t-bg border border-dashed t-line3 p-4 flex items-center gap-3 t-hover cursor-pointer">
                      <span className="text-xl">📷</span>
                      <span><span className="text-[13px] font-medium block">{t(lang, "photos_from")}</span>
                        <span className="text-[11px] t-m3">{t(lang, "photos_multi")}</span></span>
                      <input type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files, "image"); e.target.value = ""; }} />
                    </label>
                    <label className="rounded-[12px] t-bg border border-dashed t-line3 p-4 flex items-center gap-3 t-hover cursor-pointer">
                      <span className="text-xl">🎬</span>
                      <span><span className="text-[13px] font-medium block">{t(lang, "video_from")}</span>
                        <span className="text-[11px] t-m3">{t(lang, "one_per_post")}</span></span>
                      <input type="file" accept="video/*" hidden onChange={(e) => { addFiles(e.target.files, "video"); e.target.value = ""; }} />
                    </label>
                  </div>
                  {files.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {files.map((f, i) => (
                        <div key={i} className="relative aspect-square rounded-[12px] overflow-hidden t-bg border t-line">
                          {f.type.startsWith("video")
                            ? <video src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                            : <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />}
                          <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-[12px]">✕</button>
                          <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/70">{(f.size / 1048576).toFixed(1)}MB</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {hasVideo && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[12px] t-m2">{t(lang, "video_as")}</span>
                      {[[t(lang, "video_post"), "feed"], [t(lang, "reel"), "reel"]].map(([l, v]) => (
                        <button key={v} onClick={() => setPostAs(v)} className={`h-8 px-4 rounded-full text-[12px] font-medium ${postAs === v ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>{l}</button>
                      ))}
                    </div>
                  )}
                  {hasVideo && schedAt && (
                    <div className="mt-2 text-[11px] t-m2">{t(lang, "video_sched_note")}</div>
                  )}
                  {uploading && (
                    <div className="mt-4">
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="t-m1">{t(lang, "uploading")}</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full t-panel overflow-hidden">
                        <div className="h-full bg-[#1877F2] rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="mt-4 p-3 rounded-[12px] t-inner border t-line flex items-center gap-2">
                    {Ic.cal("w-4 h-4 t-m2")}
                    <input type="datetime-local" value={schedAt} onChange={(e) => setSchedAt(e.target.value)} className="flex-1 bg-transparent text-[13px] t-m1 focus:outline-none" />
                    <span className="text-[11px] t-m3">Asia/Karachi</span>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-[12px] t-m3">{t(lang, "graph_note")} /{sel?.fb_page_id}/feed {t(lang, "secure")}</div>
                    <div className="flex gap-2">
                      <button onClick={() => publish(true)} disabled={uploading} className="h-10 px-5 rounded-full t-panel border t-line3 text-[13px] disabled:opacity-50">{t(lang, "sched_btn2")}</button>
                      <button onClick={() => publish(false)} disabled={uploading} className="h-10 px-6 rounded-full bg-[#1877F2] text-[13px] font-medium shadow-[0_0_20px_rgba(24,119,242,0.4)] disabled:opacity-50">{uploading ? `${t(lang, "uploading")}` : t(lang, "publish_now")}</button>
                    </div>
                  </div>
                </div>
              ))}

              {/* ===== SCHEDULED ===== */}
              {tab === "scheduled" && (isGlobal ? (
                <Empty title={t(lang, "pick_page")} sub={t(lang, "pick_page_sub")} action={null} />
              ) : (
                <div className="rounded-[18px] t-card border t-line overflow-hidden max-w-[900px]">
                  <div className="p-6 border-b t-line flex items-center justify-between">
                    <h3 className="font-semibold">{t(lang, "queue_title")} • {queuedCount} {t(lang, "local_q")}{queue.remote?.length ? ` + ${queue.remote.length} ${t(lang, "on_fb")}` : ""}</h3>
                    <div className="text-[12px] t-m2">{t(lang, "queue_auto")}</div>
                  </div>
                  <div className="divide-y t-divide">
                    {queuedCount === 0 && (!queue.remote || queue.remote.length === 0) && (
                      <div className="p-8 text-center t-m2 text-[13px]">{t(lang, "empty_sched")}</div>
                    )}
                    {(queue.local || []).map((p: any) => (
                      <div key={p.id} className="p-5 flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-[10px] t-inner border t-line flex items-center justify-center">{Ic.clock("w-5 h-5 t-m3")}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px]">{p.message || "(no text)"}</div>
                          <div className="text-[11px] t-m2 mt-1">{p.scheduled_time ? new Date(p.scheduled_time).toLocaleString() : ""} • {p.type}{p.error_note ? ` • ⚠ ${p.error_note}` : ""}</div>
                        </div>
                        <span className="text-[11px] px-2.5 py-1 rounded-full t-panel border t-line3">{t(lang, "queued")}</span>
                        <button onClick={() => delPost(p.id)} className="t-m2 hover:text-red-400">{Ic.trash("w-4 h-4")}</button>
                      </div>
                    ))}
                    {(queue.remote || []).map((p: any) => (
                      <div key={p.id} className="p-5 flex gap-4 items-center opacity-80">
                        <div className="w-12 h-12 rounded-[10px] t-inner border t-line flex items-center justify-center">{Ic.clock("w-5 h-5 text-[#1877F2]")}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px]">{p.message || "(no text)"}</div>
                          <div className="text-[11px] t-m2 mt-1">{t(lang, "fb_sched")} • {p.scheduled_publish_time ? new Date(p.scheduled_publish_time * 1000).toLocaleString() : ""}</div>
                        </div>
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#1877F2]/15 border border-[#1877F2]/30 text-[#6AA8FF]">{t(lang, "on_fb")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* ===== AUTO FOLDER ===== */}
              {tab === "folders" && (
                <div className="space-y-4 max-w-[900px]">
                  <div className="rounded-[18px] t-card border t-line p-6">
                    <h3 className="font-semibold">{t(lang, "f_new")}</h3>
                    <p className="text-[12px] t-m2 mt-1">{t(lang, "f_desc")}</p>
                    <div className="mt-4 grid sm:grid-cols-2 gap-3">
                      <input value={wfFolder} onChange={(e) => setWfFolder(e.target.value)} placeholder={t(lang, "f_folder_ph")}
                        className="h-11 rounded-[12px] t-bg border t-line px-4 text-[13px] focus:outline-none sm:col-span-2" />
                      <select value={wfPage} onChange={(e) => setWfPage(e.target.value)}
                        className="h-11 rounded-[12px] t-bg border t-line px-3 text-[13px] focus:outline-none">
                        <option value="">{t(lang, "f_page_sel")}</option>
                        {accessPages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="time" value={wfTime} onChange={(e) => setWfTime(e.target.value)}
                        className="h-11 rounded-[12px] t-bg border t-line px-4 text-[13px] focus:outline-none" />
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] t-m2">{t(lang, "f_video_as")}</span>
                        {[[t(lang, "reel"), "reel"], [t(lang, "video_post"), "feed"]].map(([l, v]) => (
                          <button key={v} onClick={() => setWfMode(v)} className={`h-8 px-4 rounded-full text-[12px] font-medium ${wfMode === v ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>{l}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] t-m2">{t(lang, "f_per_day")}</span>
                        <input type="number" min={1} max={20} value={wfPerRun} onChange={(e) => setWfPerRun(+e.target.value)}
                          className="h-8 w-16 rounded-[10px] t-bg border t-line px-2 text-[13px] focus:outline-none" />
                      </div>
                    </div>
                    <button onClick={createWatcher} className="mt-4 h-10 px-6 rounded-full bg-[#1877F2] text-[13px] font-medium shadow-[0_0_20px_rgba(24,119,242,0.4)]">{t(lang, "f_setup")}</button>
                  </div>
                  {watchers.length === 0 && (
                    <div className="text-[13px] t-m2">{t(lang, "f_empty")}</div>
                  )}
                  {watchers.map((w) => (
                    <div key={w.id} className="rounded-[18px] t-card border t-line p-5 flex flex-wrap gap-4 items-center">
                      <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center ${w.status === "active" ? "bg-[#132E1F] border border-[#1E4A2E]" : "t-panel border t-line3"}`}>
                        {Ic.folder(w.status === "active" ? "w-5 h-5 text-[#3DD598]" : "w-5 h-5 t-m3")}
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-medium text-[14px]">{w.name} <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full ${w.status === "active" ? "bg-[#132E1F] text-[#3DD598]" : "t-panel t-m2"}`}>{w.status}</span></div>
                        <div className="text-[12px] t-m2 mt-0.5 truncate">{w.folder_path}</div>
                        <div className="text-[12px] t-m2">→ {w.page_name} • {t(lang, "f_daily")} {w.daily_time} • {w.post_as === "reel" ? t(lang, "reel") : t(lang, "video_post")} • {w.per_run}/{t(lang, "f_daily")} • {w.files} {t(lang, "f_files")} • {t(lang, "f_last")}: {w.last_run || "—"}</div>
                        {w.stock && w.stock !== "ok" && (() => { const m = stockMeta(w.stock); return (
                          <div className="text-[12px] mt-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: m.color }} />
                            <b style={{ color: m.color }}>{m.label}</b>
                            <span className="t-m2">• {w.files} files = {w.days_left} {t(lang, "days_unit")}</span>
                          </div>
                        ); })()}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => runWatcherNow(w.id)} className="h-8 px-3 rounded-full t-panel border t-line3 text-[12px]">{t(lang, "f_run")}</button>
                        <button onClick={() => toggleWatcher(w)} className="h-8 px-3 rounded-full t-panel border t-line3 text-[12px]">{w.status === "active" ? t(lang, "f_pause") : t(lang, "f_resume")}</button>
                        <button onClick={() => delWatcher(w.id)} className="h-8 w-8 rounded-full t-panel border t-line3 t-m2 hover:text-red-400">{Ic.trash("w-3.5 h-3.5 mx-auto")}</button>
                      </div>
                    </div>
                  ))}

                                  </div>
              )}

              {/* ===== CREATOR WATCH ===== */}
              {tab === "creator" && (
                <div className="space-y-4 max-w-[900px]">
{/* ---- INSTANT ---- */}
                  <div className="rounded-[18px] t-card border t-line p-6">
                    <h3 className="font-semibold">⚡ {t(lang, "inst_new")}</h3>
                    <p className="text-[12px] t-m2 mt-1">{t(lang, "inst_desc")}</p>
                    <div className="mt-4 grid sm:grid-cols-2 gap-3">
                      <input value={iwfFolder} onChange={(e) => setIwfFolder(e.target.value)} placeholder={t(lang, "f_folder_ph")}
                        className="h-11 rounded-[12px] t-bg border t-line px-4 text-[13px] focus:outline-none sm:col-span-2" />
                      <select value={iwfPage} onChange={(e) => setIwfPage(e.target.value)}
                        className="h-11 rounded-[12px] t-bg border t-line px-3 text-[13px] focus:outline-none">
                        <option value="">{t(lang, "f_page_sel")}</option>
                        {accessPages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] t-m2">{t(lang, "f_video_as")}</span>
                        {[[t(lang, "reel"), "reel"], [t(lang, "video_post"), "feed"]].map(([l, v]) => (
                          <button key={v} onClick={() => setIwfMode(v)} className={`h-8 px-4 rounded-full text-[12px] font-medium ${iwfMode === v ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>{l}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] t-m2">{t(lang, "f_per_scan")}</span>
                        <input type="number" min={1} max={20} value={iwfPerScan} onChange={(e) => setIwfPerScan(+e.target.value)}
                          className="h-8 w-16 rounded-[10px] t-bg border t-line px-2 text-[13px] focus:outline-none" />
                      </div>
                    </div>
                    <button onClick={createInstant} className="mt-4 h-10 px-6 rounded-full bg-[#1877F2] text-[13px] font-medium shadow-[0_0_20px_rgba(24,119,242,0.4)]">{t(lang, "inst_setup")}</button>
                  </div>
                  {iwatches.length === 0 && (
                    <div className="text-[13px] t-m2">{t(lang, "inst_empty")}</div>
                  )}
                  {iwatches.map((w) => (
                    <div key={w.id} className="rounded-[18px] t-card border t-line p-5 flex flex-wrap gap-4 items-center">
                      <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center ${w.status === "active" ? "bg-[#132E1F] border border-[#1E4A2E]" : "t-panel border t-line3"}`}>
                        <span className="text-[18px]">⚡</span>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-medium text-[14px]">{w.name} <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full ${w.status === "active" ? "bg-[#132E1F] text-[#3DD598]" : "t-panel t-m2"}`}>{w.status}</span></div>
                        <div className="text-[12px] t-m2 mt-0.5 truncate">{w.folder_path}</div>
                        <div className="text-[12px] t-m2">→ {w.page_name} • {w.post_as === "reel" ? t(lang, "reel") : t(lang, "video_post")} • {w.per_scan}/{t(lang, "f_daily")} • {w.files} {t(lang, "f_files")}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => scanInstantNow(w.id)} className="h-8 px-3 rounded-full t-panel border t-line3 text-[12px]">{t(lang, "inst_scan_now")}</button>
                        <button onClick={() => toggleInstant(w)} className="h-8 px-3 rounded-full t-panel border t-line3 text-[12px]">{w.status === "active" ? t(lang, "f_pause") : t(lang, "f_resume")}</button>
                        <button onClick={() => delInstant(w.id)} className="h-8 w-8 rounded-full t-panel border t-line3 t-m2 hover:text-red-400">{Ic.trash("w-3.5 h-3.5 mx-auto")}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ===== INSIGHTS ===== */}
              {tab === "insights" && (isGlobal ? (
                !overview ? <div className="t-m2 text-[14px]">{t(lang, "loading_overall")}...</div> : (
                <div className="rounded-[18px] t-card border t-line p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold">{t(lang, "global_title")} • {t(lang, "last_days")} {range}d</h3>
                    <div className="flex gap-2">{[7, 28, 90].map((r) => (
                      <button key={r} onClick={() => setRange(r)} className={`h-7 px-3 rounded-full text-[12px] ${range === r ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>{r}d</button>
                    ))}</div>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={(overview?.series?.labels || []).map((l: string, i: number) => ({ name: l, reach: overview.series.reach[i], engagement: overview.series.engagement[i] }))}>
                        <XAxis dataKey="name" stroke="#3A3A3A" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#3A3A3A" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: "#1F1F1F", border: "1px solid #2A2A2A", borderRadius: 12 }} />
                        <Line type="monotone" dataKey="reach" stroke="#1877F2" strokeWidth={3} dot={{ r: 4, fill: "#1877F2" }} />
                        <Line type="monotone" dataKey="engagement" stroke="#EC4899" strokeWidth={3} dot={{ r: 4, fill: "#EC4899" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                )
              ) : (
                !insights ? (
                  <Empty title="Insights unavailable" sub="read_insights permission chahiye. FB App me permission add karke dobara Sync karein."
                    action={<button onClick={doSync} className="mt-4 h-9 px-5 rounded-full bg-[#1877F2] text-[13px] font-medium">Re-sync</button>} />
                ) : (
                  <div className="rounded-[18px] t-card border t-line p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold">Performance Overview • Last {range} days (Live: {ml.reach} vs {ml.engagement})</h3>
                      <div className="flex gap-2">{[7, 28, 90].map((r) => (
                        <button key={r} onClick={() => setRange(r)} className={`h-7 px-3 rounded-full text-[12px] ${range === r ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>{r}d</button>
                      ))}</div>
                    </div>
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <XAxis dataKey="name" stroke="#3A3A3A" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#3A3A3A" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ background: "#1F1F1F", border: "1px solid #2A2A2A", borderRadius: 12 }} />
                          <Line type="monotone" dataKey="reach" stroke="#1877F2" strokeWidth={3} dot={{ r: 4, fill: "#1877F2" }} />
                          <Line type="monotone" dataKey="engagement" stroke="#EC4899" strokeWidth={3} dot={{ r: 4, fill: "#EC4899" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {(insights.warnings || []).map((w: string) => (
                      <div key={w} className="mt-2 text-[12px] text-[#FFB86A]">{w}</div>
                    ))}
                  </div>
                )
              ))}

              {/* ===== MONETIZATION ===== */}

              {/* ===== MONETIZATION ===== */}
              {tab === "monetization" && (isGlobal ? (
                <Empty title={t(lang, "pick_page")} sub={t(lang, "pick_page_sub")} action={null} />
              ) : (
                !monet ? (
                  <Empty title={t(lang, "monet_unavail")} sub={t(lang, "monet_resync")} action={null} />
                ) : monet.mode === "ESTIMATE" ? (
                  <div className="max-w-[720px] space-y-4">
                    <div className="p-3 rounded-[12px] bg-[#2A1F15] border border-[#4A3520] text-[12px] text-[#FFB86A]">{monet.note}</div>
                    {(monet.criteria || []).map((c: any) => (
                      <div key={c.key} className="rounded-[18px] t-card border t-line p-5">
                        <div className="flex justify-between text-[14px]"><span className="font-medium">{c.label}</span>
                          <span className={c.met ? "text-[#3DD598]" : "text-[#FFB86A]"}>{c.met ? t(lang, "criteria_met") : t(lang, "not_yet")}</span></div>
                        <div className="text-[12px] t-m2 mt-1">{t(lang, "required")}: {c.need} • {t(lang, "yours")}: {fmt(c.have)} {c.extra}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[18px] t-card border t-line p-6 max-w-[720px]">
                    <h3 className="font-semibold">{t(lang, "monet_live")}</h3>
                    <pre className="mt-4 text-[12px] t-m1 whitespace-pre-wrap">{JSON.stringify(monet.raw, null, 2)}</pre>
                  </div>
                )
              ))}

              {/* ===== VIRAL ===== */}

              {/* ===== VIRAL ===== */}
              {tab === "viral" && (isGlobal ? (
                !(gviral?.posts || []).length ? (
                  <Empty title={t(lang, "no_posts")} sub={t(lang, "no_posts_sub")}
                    action={<button onClick={doSync} className="mt-4 h-9 px-5 rounded-full bg-[#1877F2] text-[13px] font-medium">{t(lang, "resync")}</button>} />
                ) : (
                  <div className="rounded-[18px] t-card border t-line overflow-hidden">
                    <div className="p-4 border-b t-line flex items-center gap-2">
                      <span className="text-[13px] font-semibold">{t(lang, "viral_global")} ({gviral.pages_scanned} {t(lang, "jwt_pages")})</span>
                      <span className="ml-auto text-[11px] t-m3">{gviral.rule}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-[11px] tracking-widest uppercase t-m3 border-b t-line">
                          <tr><th className="p-4 font-medium">{t(lang, "page_h")}</th><th className="p-4 font-medium">{t(lang, "post_h")}</th><th className="p-4 font-medium">{t(lang, "eng_h")}</th><th className="p-4 font-medium">{t(lang, "status_h")}</th></tr>
                        </thead>
                        <tbody className="divide-y t-divide">
                          {gviral.posts.map((p: any) => (
                            <tr key={p.fb_post_id} className="t-hover">
                              <td className="p-4 text-[13px] font-medium whitespace-nowrap">{p.page_name}</td>
                              <td className="p-4 text-[13px] max-w-[380px]"><div className="truncate">{p.message || "(no text)"}</div>
                                <div className="text-[11px] t-m3">{p.created_time ? new Date(p.created_time).toLocaleDateString() : ""} • 👍{p.likes} 💬{p.comments} ↗{p.shares}</div></td>
                              <td className="p-4 text-[13px] font-medium">{fmt(p.engagement)}</td>
                              <td className="p-4">{p.viral && <span className="text-[10px] px-2 py-1 rounded-full bg-[#1877F2] font-bold">VIRAL</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ) : (
                !viral ? (
                  <div className="t-m2 text-[14px]">{t(lang, "loading")}</div>
                ) : !viral.posts?.length ? (
                  <Empty title={t(lang, "no_posts")} sub={t(lang, "no_posts_sub")}
                    action={<button onClick={doSync} className="mt-4 h-9 px-5 rounded-full bg-[#1877F2] text-[13px] font-medium">{t(lang, "resync")}</button>} />
                ) : (
                  <div className="rounded-[18px] t-card border t-line overflow-hidden">
                    <div className="p-4 border-b t-line flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] t-m2">{t(lang, "sort_l")}</span>
                      {[[t(lang, "highest_reach"), "reach"], [t(lang, "highest_eng"), "engagement"]].map(([l, v]) => (
                        <button key={v} onClick={() => setViralSort(v)} className={`h-7 px-3 rounded-full text-[12px] ${viralSort === v ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>{l}</button>
                      ))}
                      <span className="ml-auto text-[11px] t-m3">{viral.viral_rule}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-[11px] tracking-widest uppercase t-m3 border-b t-line">
                          <tr><th className="p-4 font-medium">{t(lang, "post_h")}</th><th className="p-4 font-medium">{t(lang, "reach_h")}</th><th className="p-4 font-medium">{t(lang, "likes_h")}</th><th className="p-4 font-medium">{t(lang, "comments_h")}</th><th className="p-4 font-medium">{t(lang, "shares_h")}</th><th className="p-4 font-medium">{t(lang, "status_h")}</th></tr>
                        </thead>
                        <tbody className="divide-y t-divide">
                          {viral.posts.map((p: any) => (
                            <tr key={p.fb_post_id} className="t-hover">
                              <td className="p-4 text-[13px] max-w-[380px]"><div className="truncate">{p.message || "(no text)"}</div>
                                <div className="text-[11px] t-m3">{p.created_time ? new Date(p.created_time).toLocaleDateString() : ""} • {p.type}</div></td>
                              <td className="p-4 text-[13px] font-medium">{p.reach ? fmt(p.reach) : "—"}</td>
                              <td className="p-4 text-[13px]">{p.likes}</td>
                              <td className="p-4 text-[13px]">{p.comments}</td>
                              <td className="p-4 text-[13px]">{p.shares}</td>
                              <td className="p-4">{p.viral && <span className="text-[10px] px-2 py-1 rounded-full bg-[#1877F2] font-bold">VIRAL</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ))}

              {/* ===== SETTINGS ===== */}

              {/* ===== SETTINGS ===== */}
              {/* ===== REPORTS ===== */}
              {tab === "reports" && (
                <div className="space-y-6 max-w-[1080px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] t-m2">{isGlobal ? t(lang, "all_pages_global") : sel?.name}</span>
                    <span className="ml-auto" />
                    {rangeBtns(hrange, setHrange)}
                  </div>
                  {hist ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {[[t(lang, "rep_total"), hist.total, "#1877F2"], [t(lang, "rep_text"), (hist.by_type.text || 0) + (hist.by_type.link || 0), "#8B5CF6"], [t(lang, "rep_photos"), hist.by_type.photo || 0, "#EC4899"], [t(lang, "rep_videos"), hist.by_type.video || 0, "#3DD598"], [t(lang, "rep_reels"), hist.by_type.reel || 0, "#FFB86A"]].map(([l, v, c]: any) => (
                        <div key={String(l)} className="rounded-[18px] t-card border t-line p-5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20" style={{ background: c }} />
                          <div className="text-[28px] font-semibold leading-none">{v}</div>
                          <div className="text-[13px] t-m2 mt-1.5 font-medium">{l} • {hrange}d</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="t-m2 text-[14px]">{t(lang, "loading")}</div>
                  )}
                  <div className="rounded-[18px] t-card border t-line overflow-hidden">
                    <div className="p-5 border-b t-line font-semibold text-[15px]">{t(lang, "rep_daily")} • {hrange}d</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-[11px] tracking-widest uppercase t-m3 border-b t-line">
                          <tr>
                            <th className="p-4 font-medium">{t(lang, "rep_daily").split(" ")[0]}</th>
                            <th className="p-4 font-medium">{t(lang, "page_h")}</th>
                            <th className="p-4 font-medium">{t(lang, "rep_published")}</th>
                            <th className="p-4 font-medium">{t(lang, "rep_failed")}</th>
                            <th className="p-4 font-medium">{t(lang, "rep_errors")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y t-divide">
                          {(hist?.daily || []).map((r: any, i: number) => (
                            <tr key={i} className="t-hover">
                              <td className="p-4 text-[13px] whitespace-nowrap">{r.date}</td>
                              <td className="p-4 text-[13px] font-medium">{r.page_name}</td>
                              <td className="p-4 text-[13px] font-medium" style={{ color: r.published ? "#3DD598" : undefined }}>{r.published}</td>
                              <td className="p-4 text-[13px] font-medium" style={{ color: r.failed ? "#FF6B6B" : undefined }}>{r.failed}</td>
                              <td className="p-4 text-[11px] t-m2 max-w-[320px]"><div className="truncate" title={r.errors}>{r.errors || "—"}</div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!(hist?.daily || []).length && <div className="p-6 text-center t-m2 text-[13px]">{t(lang, "rep_empty")}</div>}
                  </div>
                </div>
              )}

              {tab === "settings" && (
                <div className="max-w-[720px] space-y-4">
                  <div className="rounded-[18px] t-card border t-line p-6">
                    <h3 className="font-semibold">{t(lang, "appearance")}</h3>
                    <div className="mt-4 grid sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[12px] t-m2 mb-1.5">{t(lang, "language")}</div>
                        <div className="flex flex-wrap gap-2">
                          {LANGS.map((l) => (
                            <button key={l.id} onClick={() => setLang(l.id)}
                              className={`h-8 px-3 rounded-full text-[12px] font-medium ${lang === l.id ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>{l.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[12px] t-m2 mb-1.5">{t(lang, "theme")}</div>
                        <div className="flex flex-wrap gap-2">
                          {THEMES.map((th) => (
                            <button key={th.id} onClick={() => setTheme(th.id)}
                              className={`h-8 px-3 rounded-full text-[12px] font-medium flex items-center gap-1.5 ${theme === th.id ? "bg-[#1877F2]" : "t-panel border t-line3 t-m1"}`}>
                              <span className="w-3 h-3 rounded-full border t-line3" style={{ background: th.id === "dark" ? "#1A1A1A" : th.id === "black" ? "#000" : "#fff" }} />
                              {th.id === "dark" ? t(lang, "th_dark") : th.id === "black" ? t(lang, "th_black") : t(lang, "th_light")}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[18px] t-card border t-line p-6">
                    <h3 className="font-semibold">{t(lang, "conn_title")}</h3>
                    <p className="text-[13px] t-m2 mt-2">{t(lang, "conn_desc")}</p>
                    <div className="mt-4 flex items-center gap-2 text-[12px] px-3 py-2 rounded-[10px] bg-[#132E1F] border border-[#1E4A2E] text-[#3DD598] w-fit">
                      <span className="w-2 h-2 bg-[#3DD598] rounded-full animate-pulse" />
                      {t(lang, "token_valid")}{tokenInfo?.me ? ` • ${tokenInfo.me.name}` : ""}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={doSync} className="h-9 px-5 rounded-full t-panel border t-line3 text-[13px]">{t(lang, "resync_pages")}</button>
                      <button onClick={doDisconnect} className="h-9 px-5 rounded-full bg-transparent border border-red-900 text-[13px] text-red-400">{t(lang, "disconnect")}</button>
                    </div>
                  </div>
                  <div className="rounded-[18px] t-card border t-line p-6">
                    <h3 className="font-semibold mb-3">{t(lang, "health_title")}</h3>
                    {!health ? <div className="text-[13px] t-m2">{t(lang, "no_data")}</div> : (
                      <div className="text-[13px] t-m1 space-y-1">
                        <div>{t(lang, "published_l")}: {health.page_status?.is_published ? `${t(lang, "yes")} ✓` : "No"}</div>
                        <div>{t(lang, "verification_l")}: {health.page_status?.verification_status || "—"}</div>
                        <div>{t(lang, "followers_l")}: {fmt(health.page_status?.followers_count || 0)}</div>
                      </div>
                    )}
                  </div>
                  <div className="rounded-[18px] t-card border t-line p-6">
                    <h3 className="font-semibold mb-3">{t(lang, "log_title")}</h3>
                    <div className="space-y-2 max-h-[300px] overflow-auto">
                      {logs.length === 0 && <div className="text-[12px] t-m3">{t(lang, "no_activity")}</div>}
                      {logs.map((l: any) => (
                        <div key={l.id} className="text-[12px] flex gap-2 py-1.5 border-b t-line">
                          <span className="text-[#1877F2] font-medium shrink-0">{l.action}</span>
                          <span className="t-m2 truncate flex-1">{l.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="pt-8 pb-4 text-center text-[11px] t-m3">
            {t(lang, "footer")}
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full t-panel border t-line3 text-[13px] shadow-xl z-[60]">{toast}</div>
      )}
    </div>
  );
}
