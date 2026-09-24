// Live Facebook Graph API service — Business Method (System User Token)
// Koi mock/fake data NAHI. Token na ho to {not_connected} error milta hai.
const axios = require('axios');

const VERSION = process.env.FB_API_VERSION || 'v26.0';
const getToken = () => process.env.FB_SYSTEM_USER_TOKEN || '';
const isConnected = () => !!getToken();
const needConn = () => { const e = new Error('NOT_CONNECTED'); e.code = 'NOT_CONNECTED'; throw e; };

async function g(path, params = {}, token) {
  const t = token || getToken();
  if (!t) needConn();
  const url = `https://graph.facebook.com/${VERSION}${path}`;
  const { data } = await axios.get(url, { params: { access_token: t, ...params }, timeout: 20000 });
  return data;
}
async function post(path, body = {}, token) {
  const t = token || getToken();
  if (!t) needConn();
  const url = `https://graph.facebook.com/${VERSION}${path}`;
  const { data } = await axios.post(url, { access_token: t, ...body }, { timeout: 30000 });
  return data;
}
const fbErr = (e) => e?.response?.data?.error || { message: e.message || 'FB request failed' };

// ---- validation: token kiska hai? ----
async function validateToken(token) {
  const me = await g('/me', { fields: 'id,name' }, token);
  return me; // {id, name} — system user ka naam
}

// ---- businesses of this system user ----
async function getBusinesses(token) {
  try {
    const r = await g('/me/businesses', { fields: 'id,name' }, token);
    return r.data || [];
  } catch (e) {
    // fallback: .env me di hui business id
    const bizId = process.env.FB_BUSINESS_ID || '';
    if (!bizId) throw e;
    const b = await g(`/${bizId}`, { fields: 'id,name' }, token);
    return [b];
  }
}

// ---- single page ka access_token (system token se, jahan access ho) ----
async function getPageToken(fbPageId, token) {
  try {
    const r = await g(`/${fbPageId}`, { fields: 'access_token' }, token);
    return r.access_token || '';
  } catch { return ''; }
}

// ---- cursor pagination: saari items lao (limit khatam) ----
async function getAll(path, params = {}, token, maxRounds = 100) {
  const all = [];
  let after = undefined;
  for (let i = 0; i < maxRounds; i++) {
    const r = await g(path, { ...params, ...(after ? { after } : {}) }, token);
    all.push(...(r.data || []));
    const nxt = r.paging && r.paging.cursors && r.paging.cursors.after;
    if (!nxt || !(r.data || []).length) break;
    after = nxt;
  }
  return all;
}

// ---- batch: kai pages ke page-tokens ek sath (50 per call) ----
async function getPageTokensBatch(fbIds, token) {
  const out = {};
  for (let i = 0; i < fbIds.length; i += 50) {
    const chunk = fbIds.slice(i, i + 50);
    try {
      const r = await g('/', { ids: chunk.join(','), fields: 'access_token' }, token);
      for (const [id, obj] of Object.entries(r || {})) {
        if (obj && obj.access_token) out[id] = obj.access_token;
      }
    } catch {}
  }
  return out;
}

// ---- pages directly accessible to this token (business ke baghair bhi) ----
async function getDirectPages(token) {
  return getAll('/me/accounts', {
    fields: 'id,name,category,followers_count,verification_status,is_published,link,picture{url},access_token', limit: 100,
  }, token);
}

// ---- pages of a business (owned + client) ----
async function getBusinessPages(businessId, token) {
  const fields = 'id,name,category,followers_count,verification_status,is_published,link,picture{url}';
  const out = new Map();
  for (const edge of ['owned_pages', 'client_pages']) {
    try {
      for (const p of await getAll(`/${businessId}/${edge}`, { fields, limit: 100 }, token)) out.set(p.id, p);
    } catch {}
  }
  return [...out.values()];
}

// ---- single page info (real) ----
async function getPageInfo(fbPageId, token) {
  return g(`/${fbPageId}`, {
    fields: 'id,name,category,followers_count,verification_status,is_published,link,picture{url}',
  }, token);
}

// ---- page posts with real engagement ----
async function getPagePosts(fbPageId, limit = 25, token) {
  const r = await g(`/${fbPageId}/posts`, {
    fields: 'id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares',
    limit,
  }, token);
  return r.data || [];
}

// ---- per-post reach (insights) — koshish, na mile to null ----
async function getPostReach(fbPostId, token) {
  try {
    const r = await g(`/${fbPostId}/insights`, { metric: 'post_impressions,post_engaged_users' }, token);
    let reach = 0, eng = 0;
    for (const m of r.data || []) {
      const v = m.values && m.values[0] ? m.values[0].value : 0;
      if (m.name === 'post_impressions') reach = v;
      if (m.name === 'post_engaged_users') eng = v;
    }
    return { reach, eng };
  } catch { return null; }
}

// ---- concurrency limiter (no deps) ----
function pLimit(n) {
  let active = 0;
  const q = [];
  const next = () => {
    if (active >= n || !q.length) return;
    active++;
    q.shift()().finally(() => { active--; next(); });
  };
  return (fn) => new Promise((resolve, reject) => {
    q.push(() => fn().then(resolve, reject));
    next();
  });
}

// ---- page insights series (day-wise) ----
// NOTE (new Pages experience): page_impressions / page_engaged_users / page_fans
// Meta ne deprecate kar diye. Jo metrics REAL me kaam karte hain:
// page views trend, post engagements trend, video views.
async function getPageInsights(fbPageId, days = 28, token) {
  const until = new Date();
  const since = new Date(Date.now() - (days - 1) * 86400000);
  const fmtD = (d) => d.toISOString().slice(0, 10);
  const out = {};
  const defs = [
    ['page_views_total', 'views'],
    ['page_post_engagements', 'engagements'],
    ['page_video_views', 'video'],
  ];
  await Promise.all(defs.map(async ([metric, key]) => {
    try {
      const r = await g(`/${fbPageId}/insights`, {
        metric, period: 'day', since: fmtD(since), until: fmtD(until),
      }, token);
      out[key] = (r.data && r.data[0] && r.data[0].values) || [];
    } catch (e) { out[key] = { error: fbErr(e) }; }
  }));
  return out;
}

// ---- scheduled posts on FB ----
async function getScheduledPosts(fbPageId, token) {
  try {
    const r = await g(`/${fbPageId}/scheduled_posts`, {
      fields: 'id,message,created_time,scheduled_publish_time,permalink_url', limit: 50,
    }, token);
    return r.data || [];
  } catch { return []; }
}

// ---- PHOTO file upload (local file) ----
// unpublished=true → sirf media_fbid wapas (multi-photo attach ke liye)
async function uploadPhotoFile(fbPageId, filePath, caption = '', opts = {}, token) {
  const t = token || getToken();
  if (!t) needConn();
  const FormData = require('form-data');
  const fs = require('fs');
  const form = new FormData();
  form.append('access_token', t);
  form.append('source', fs.createReadStream(filePath));
  if (caption) form.append('caption', caption);
  if (opts.unpublished) form.append('published', 'false');
  if (opts.scheduled_time) {
    form.append('published', 'false');
    form.append('scheduled_publish_time', String(Math.floor(new Date(opts.scheduled_time).getTime() / 1000)));
  }
  const axios = require('axios');
  const { data } = await axios.post(`https://graph.facebook.com/${VERSION}/${fbPageId}/photos`, form, {
    headers: form.getHeaders(), timeout: 0, maxBodyLength: Infinity, maxContentLength: Infinity,
  });
  return data; // {id, post_id?}
}

// ---- VIDEO file upload (local file, feed video) ----
async function uploadVideoFile(fbPageId, filePath, description = '', token) {
  const t = token || getToken();
  if (!t) needConn();
  const FormData = require('form-data');
  const fs = require('fs');
  const form = new FormData();
  form.append('access_token', t);
  form.append('source', fs.createReadStream(filePath));
  if (description) form.append('description', description);
  const axios = require('axios');
  const { data } = await axios.post(`https://graph.facebook.com/${VERSION}/${fbPageId}/videos`, form, {
    headers: form.getHeaders(), timeout: 0, maxBodyLength: Infinity, maxContentLength: Infinity,
  });
  return data; // {id}
}

// ---- REEL upload (3-phase: start → transfer → finish+publish) ----
async function publishReelFile(fbPageId, filePath, description = '', token) {
  const t = token || getToken();
  if (!t) needConn();
  const axios = require('axios');
  const fs = require('fs');
  // 1) start
  const { data: st } = await axios.post(`https://graph.facebook.com/${VERSION}/${fbPageId}/video_reels`, {
    access_token: t, upload_phase: 'start',
  }, { timeout: 30000 });
  if (!st.upload_url || !st.video_id) throw new Error('Reel start failed: ' + JSON.stringify(st).slice(0, 200));
  // 2) transfer (binary upload)
  await axios.post(st.upload_url, fs.createReadStream(filePath), {
    headers: { Authorization: 'OAuth ' + t, 'Content-Type': 'application/octet-stream' },
    params: { upload_phase: 'transfer', start_offset: 0, upload_session_id: st.video_id },
    timeout: 0, maxBodyLength: Infinity, maxContentLength: Infinity,
  });
  // 3) finish + publish as reel
  const { data: fin } = await axios.post(`https://graph.facebook.com/${VERSION}/${fbPageId}/video_reels`, {
    access_token: t, upload_phase: 'finish', video_id: st.video_id,
    video_state: 'PUBLISHED', description,
  }, { timeout: 60000 });
  return fin;
}

// ---- feed post with attached (unpublished) photos ----
async function publishFeedWithMedia(fbPageId, message, mediaFbids, token) {
  return post(`/${fbPageId}/feed`, {
    message, attached_media: mediaFbids.map((id) => ({ media_fbid: id })),
  }, token);
}
async function scheduleFeedWithMedia(fbPageId, message, mediaFbids, scheduled_time, token) {
  return post(`/${fbPageId}/feed`, {
    message,
    attached_media: mediaFbids.map((id) => ({ media_fbid: id })),
    published: false,
    scheduled_publish_time: Math.floor(new Date(scheduled_time).getTime() / 1000),
  }, token);
}

// ---- publish NOW to real page ----
async function publishNow(fbPageId, { message, link_url, photo_url }, token) {
  if (photo_url) {
    return post(`/${fbPageId}/photos`, { url: photo_url, caption: message }, token);
  }
  return post(`/${fbPageId}/feed`, { message, ...(link_url ? { link: link_url } : {}) }, token);
}

// ---- schedule on FB (FB khud publish karega) ----
async function scheduleOnFB(fbPageId, { message, link_url, photo_url, scheduled_time }, token) {
  const ts = Math.floor(new Date(scheduled_time).getTime() / 1000);
  if (photo_url) {
    return post(`/${fbPageId}/photos`, {
      url: photo_url, caption: message, published: false, scheduled_publish_time: ts,
    }, token);
  }
  return post(`/${fbPageId}/feed`, {
    message, ...(link_url ? { link: link_url } : {}), published: false, scheduled_publish_time: ts,
  }, token);
}

// ---- delete (post id) ----
async function deletePost(fbPostId, token) {
  const url = `https://graph.facebook.com/${VERSION}/${fbPostId}`;
  const { data } = await axios.delete(url, { params: { access_token: token || getToken() }, timeout: 15000 });
  return data;
}

// ---- monetization: real endpoint try, na mile to public-criteria estimate ----
async function getMonetization(fbPageId, followers, token) {
  try {
    const r = await g(`/${fbPageId}/monetization_eligibility`, {}, token);
    return { mode: 'LIVE', raw: r, page_status: null };
  } catch (e) {
    // Public criteria (Meta documented): In-Stream Ads needs 10k followers etc.
    // Ye "estimate" hai — clearly label hota hai, fake eligible flag NAHI.
    return {
      mode: 'ESTIMATE',
      note: 'Meta ne is API ka access nahi diya — exact status Business Suite > Monetization me dekhein. Neeche public criteria ke hisab se estimate hai.',
      error: fbErr(e),
      criteria: [
        { key: 'in_stream_ads', label: 'In-Stream Ads', need: '10,000 followers', have: followers, met: followers >= 10000, extra: '+ 600k minutes viewed (last 60d) + 5 active videos' },
        { key: 'stars', label: 'Stars', need: '1,000 followers', have: followers, met: followers >= 1000, extra: '' },
        { key: 'subscriptions', label: 'Subscriptions', need: '10,000 followers', have: followers, met: followers >= 10000, extra: '' },
      ],
    };
  }
}

module.exports = {
  isConnected, getToken, pLimit,
  validateToken, getBusinesses, getDirectPages, getBusinessPages, getPageToken, getPageTokensBatch, getPageInfo,
  getPagePosts, getPostReach, getPageInsights, getScheduledPosts,
  publishFeedWithMedia, scheduleFeedWithMedia,
  publishNow, scheduleOnFB, uploadPhotoFile, uploadVideoFile, publishReelFile, deletePost, getMonetization, fbErr,
};
