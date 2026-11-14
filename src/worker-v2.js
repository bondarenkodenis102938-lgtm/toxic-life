const SESSION_SECONDS = 60 * 60 * 24 * 14;
const PASSWORD_ITERATIONS = 310000;
const COOKIE_NAME = "nd_session";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) {
        if (request.method !== "GET" && request.method !== "HEAD" && !sameOrigin(request, url)) {
          return json({ error: "Origin not allowed" }, 403);
        }
        return await handleApi(request, env, url);
      }

      if (url.pathname === "/login" || url.pathname === "/login.html") {
        return env.ASSETS.fetch(new Request(new URL("/login.html", request.url), request));
      }

      if (url.pathname === "/join" || url.pathname === "/join.html") {
        return env.ASSETS.fetch(new Request(new URL("/join.html", request.url), request));
      }

      if (url.pathname === "/team" || url.pathname === "/team.html") {
        const user = await getUser(request, env);
        if (!user) return Response.redirect(new URL("/login", request.url), 302);
        if (user.role !== "owner") return Response.redirect(new URL("/study.html", request.url), 302);
        return env.ASSETS.fetch(new Request(new URL("/team.html", request.url), request));
      }

      if (url.pathname === "/setup" || url.pathname === "/setup.html") {
        const owner = await env.DB.prepare("SELECT id FROM users WHERE role = 'owner' LIMIT 1").first();
        if (owner) return Response.redirect(new URL("/login", request.url), 302);
        return env.ASSETS.fetch(new Request(new URL("/setup.html", request.url), request));
      }

      if (url.pathname === "/" || url.pathname.endsWith(".html")) {
        const user = await getUser(request, env);
        if (!user) {
          if (url.pathname === "/") {
            const owner = await env.DB.prepare("SELECT id FROM users WHERE role = 'owner' LIMIT 1").first();
            if (!owner) return Response.redirect(new URL("/setup", request.url), 302);
          }
          return Response.redirect(new URL("/login", request.url), 302);
        }
        if (url.pathname !== "/study.html") return Response.redirect(new URL("/study.html", request.url), 302);
        return env.ASSETS.fetch(new Request(new URL("/study.html", request.url), request));
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("Worker error:", error);
      return json({ error: "Server error" }, 500);
    }
  }
};

async function handleApi(request, env, url) {
  const path = url.pathname;
  if (path === "/api/setup" && request.method === "POST") return setupOwner(request, env);
  if (path === "/api/login" && request.method === "POST") return login(request, env);
  if (path === "/api/logout" && request.method === "POST") return logout(request, env);
  if (path === "/api/me" && request.method === "GET") {
    const user = await getUser(request, env);
    return json({ loggedIn: !!user, user: user ? publicUser(user) : null });
  }
  if (path === "/api/invitations/accept" && request.method === "POST") return acceptInvitation(request, env);

  const user = await getUser(request, env);
  if (!user) return json({ error: "Authentication required" }, 401);

  if (path === "/api/data" && request.method === "GET") return getStudyData(env);
  if (path === "/api/callouts" && request.method === "POST") return saveCallout(request, env, user);
  const calloutMatch = path.match(/^\/api\/callouts\/([a-zA-Z0-9_-]+)$/);
  if (calloutMatch && request.method === "DELETE") return deleteCallout(env, user, calloutMatch[1]);
  if (path === "/api/entries" && request.method === "POST") return saveEntry(request, env, user, null);

  const entryMatch = path.match(/^\/api\/entries\/([a-zA-Z0-9_-]+)$/);
  if (entryMatch && request.method === "PUT") return saveEntry(request, env, user, entryMatch[1]);
  if (entryMatch && request.method === "DELETE") return deleteEntry(url, env, user, entryMatch[1]);

  if (path === "/api/members" && request.method === "GET") {
    if (user.role !== "owner") return json({ error: "Owner access required" }, 403);
    const { results } = await env.DB.prepare(
      "SELECT id, username, display_name, role, is_active, created_at FROM users ORDER BY created_at"
    ).all();
    return json(results);
  }
  if (path === "/api/invitations" && request.method === "POST") {
    if (user.role !== "owner") return json({ error: "Owner access required" }, 403);
    return createInvitation(request, env, user);
  }
  const memberMatch = path.match(/^\/api\/members\/([a-zA-Z0-9_-]+)$/);
  if (memberMatch && request.method === "DELETE") {
    if (user.role !== "owner") return json({ error: "Owner access required" }, 403);
    return removeMember(env, user, memberMatch[1]);
  }

  return json({ error: "Not found" }, 404);
}

function sameOrigin(request, url) {
  const origin = request.headers.get("Origin");
  return !origin || origin === url.origin;
}

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}

function randomId() {
  return crypto.randomUUID();
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}

async function passwordHash(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PASSWORD_ITERATIONS, hash: "SHA-256" },
    material,
    256
  );
  return { salt: toBase64Url(salt), hash: toBase64Url(new Uint8Array(bits)) };
}

async function verifyPassword(password, stored) {
  const [saltText, expected] = String(stored || "").split(".");
  if (!saltText || !expected) return false;
  const result = await passwordHash(password, fromBase64Url(saltText));
  return constantTimeEqual(result.hash, expected);
}

function constantTimeEqual(a, b) {
  const left = new TextEncoder().encode(String(a));
  const right = new TextEncoder().encode(String(b));
  let diff = left.length ^ right.length;
  const size = Math.max(left.length, right.length);
  for (let i = 0; i < size; i++) diff |= (left[i] || 0) ^ (right[i] || 0);
  return diff === 0;
}

function sessionCookie(token) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function cookieValue(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index >= 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}

async function issueSession(userId, env) {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(randomId(), userId, await sha256(token), now + SESSION_SECONDS * 1000, now, now).run();
  return token;
}

async function getUser(request, env) {
  const token = cookieValue(request, COOKIE_NAME);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.username, u.display_name, u.role, u.is_active, s.id AS session_id, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? LIMIT 1`
  ).bind(await sha256(token)).first();
  if (!row || !row.is_active || row.expires_at <= Date.now()) {
    if (row?.session_id) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(row.session_id).run();
    return null;
  }
  return row;
}

function publicUser(user) {
  return { id: user.id, username: user.username, displayName: user.display_name, role: user.role };
}

async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

async function setupOwner(request, env) {
  if (!env.BOOTSTRAP_SECRET) return json({ error: "First-run setup is not configured" }, 503);
  const input = await readJson(request);
  if (!input || !constantTimeEqual(input.setupSecret || "", env.BOOTSTRAP_SECRET)) return json({ error: "Invalid setup secret" }, 403);
  const exists = await env.DB.prepare("SELECT id FROM users WHERE role = 'owner' LIMIT 1").first();
  if (exists) return json({ error: "Owner account already exists" }, 409);
  const username = String(input.username || "").trim();
  const displayName = String(input.displayName || username).trim();
  const password = String(input.password || "");
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username) || password.length < 12 || password.length > 200 || !displayName) {
    return json({ error: "Use a 3–32 character username and a password of at least 12 characters." }, 400);
  }
  const credentials = await passwordHash(password);
  const id = randomId(), now = Date.now();
  try {
    await env.DB.prepare(
      "INSERT INTO users (id, username, display_name, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, 'owner', ?, ?)"
    ).bind(id, username, displayName, credentials.salt + "." + credentials.hash, now, now).run();
  } catch {
    return json({ error: "Could not create the owner account. The username may already be taken." }, 409);
  }
  const token = await issueSession(id, env);
  return json({ user: { id, username, displayName, role: "owner" } }, 201, { "Set-Cookie": sessionCookie(token) });
}

async function login(request, env) {
  const input = await readJson(request);
  if (!input) return json({ error: "Invalid request" }, 400);
  const ipHash = await sha256(request.headers.get("CF-Connecting-IP") || "unknown");
  const now = Date.now();
  await env.DB.prepare("DELETE FROM login_attempts WHERE attempted_at < ?").bind(now - 24 * 60 * 60 * 1000).run();
  const cutoff = now - 15 * 60 * 1000;
  const attempts = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM login_attempts WHERE ip_hash = ? AND attempted_at > ?"
  ).bind(ipHash, cutoff).first();
  if (Number(attempts?.count || 0) >= 10) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
  const username = String(input.username || "").trim();
  const password = String(input.password || "");
  if (password.length > 200) return json({ error: "Incorrect username or password" }, 401);
  const user = await env.DB.prepare(
    "SELECT id, username, display_name, password_hash, role, is_active FROM users WHERE username = ? COLLATE NOCASE LIMIT 1"
  ).bind(username).first();
  if (!user || !user.is_active || !(await verifyPassword(password, user.password_hash))) {
    await env.DB.prepare("INSERT INTO login_attempts (ip_hash, attempted_at) VALUES (?, ?)").bind(ipHash, Date.now()).run();
    return json({ error: "Incorrect username or password" }, 401);
  }
  await env.DB.prepare("DELETE FROM login_attempts WHERE ip_hash = ?").bind(ipHash).run();
  const token = await issueSession(user.id, env);
  return json({ user: publicUser(user) }, 200, { "Set-Cookie": sessionCookie(token) });
}

async function logout(request, env) {
  const token = cookieValue(request, COOKIE_NAME);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } });
}

async function createInvitation(request, env, user) {
  const input = await readJson(request) || {};
  const hours = Math.min(168, Math.max(1, Number(input.validHours) || 72));
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO invitations (id, token_hash, created_by, role, expires_at, created_at) VALUES (?, ?, ?, 'cohost', ?, ?)"
  ).bind(randomId(), await sha256(token), user.id, now + hours * 3600000, now).run();
  return json({ token, role: "cohost", expiresAt: now + hours * 3600000 }, 201);
}

async function acceptInvitation(request, env) {
  const input = await readJson(request);
  if (!input) return json({ error: "Invalid request" }, 400);
  const token = String(input.token || "");
  const username = String(input.username || "").trim();
  const displayName = String(input.displayName || username).trim();
  const password = String(input.password || "");
  if (!token || !/^[a-zA-Z0-9_.-]{3,32}$/.test(username) || password.length < 12 || password.length > 200 || !displayName) {
    return json({ error: "Check the username, display name and password (minimum 12 characters)." }, 400);
  }
  const tokenHash = await sha256(token);
  const invite = await env.DB.prepare(
    "SELECT id FROM invitations WHERE token_hash = ? AND role = 'cohost' AND used_at IS NULL AND expires_at > ? LIMIT 1"
  ).bind(tokenHash, Date.now()).first();
  if (!invite) return json({ error: "Invitation is invalid, expired or already used" }, 410);
  const now = Date.now();
  const claimed = await env.DB.prepare(
    "UPDATE invitations SET used_at = ? WHERE id = ? AND used_at IS NULL AND expires_at > ?"
  ).bind(now, invite.id, now).run();
  if (!claimed.meta?.changes) return json({ error: "Invitation has already been used" }, 410);
  const credentials = await passwordHash(password), id = randomId();
  try {
    await env.DB.prepare(
      "INSERT INTO users (id, username, display_name, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, 'cohost', ?, ?)"
    ).bind(id, username, displayName, credentials.salt + "." + credentials.hash, now, now).run();
  } catch {
    return json({ error: "Username already exists. Ask the owner for a new invitation." }, 409);
  }
  const session = await issueSession(id, env);
  return json({ user: { id, username, displayName, role: "cohost" } }, 201, { "Set-Cookie": sessionCookie(session) });
}

async function saveCallout(request, env, user) {
  const input = await readJson(request) || {};
  const item = input.item || {};
  const id = String(item.id || randomId()), label = String(item.label || "").trim();
  if (!label) return json({ error: "Callout label is required" }, 400);
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO custom_callouts (id, label, icon, background_color, accent_color, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET label=excluded.label, icon=excluded.icon,
     background_color=excluded.background_color, accent_color=excluded.accent_color, updated_at=excluded.updated_at`
  ).bind(id, label, String(item.icon || "✦"), String(item.color || "#dfeee2"), String(item.accent || "#687f64"), user.id, now, now).run();
  return json({ id, saved: true }, 201);
}

async function deleteCallout(env, user, id) {
  await env.DB.prepare("DELETE FROM custom_callouts WHERE id = ?").bind(id).run();
  await env.DB.prepare(
    "INSERT INTO audit_log (actor_id, action, entity_type, entity_id, details_json, created_at) VALUES (?, 'delete', 'callout', ?, '{}', ?)"
  ).bind(user.id, id, Date.now()).run();
  return json({ deleted: true });
}

async function getStudyData(env) {
  const [wordRows, ruleRows, cardRows, linkRows, calloutRows] = await Promise.all([
    env.DB.prepare("SELECT * FROM words ORDER BY danish COLLATE NOCASE").all(),
    env.DB.prepare("SELECT * FROM rules ORDER BY updated_at DESC").all(),
    env.DB.prepare("SELECT * FROM similar_cards ORDER BY updated_at DESC").all(),
    env.DB.prepare(
      `SELECT scw.card_id, scw.position, scw.card_translation, scw.card_usage, scw.card_example,
              w.id, w.danish, w.translation, w.usage, w.example
       FROM similar_card_words scw JOIN words w ON w.id = scw.word_id
       ORDER BY scw.card_id, scw.position`
    ).all(),
    env.DB.prepare("SELECT id, label, icon, background_color, accent_color FROM custom_callouts ORDER BY created_at").all()
  ]);
  const links = new Map();
  for (const row of linkRows.results) {
    if (!links.has(row.card_id)) links.set(row.card_id, []);
    links.get(row.card_id).push({
      id: row.id, word: row.danish, translation: row.card_translation || row.translation,
      usage: row.card_usage || row.usage, example: row.card_example || row.example
    });
  }
  return json({
    words: wordRows.results.map(w => ({
      id: w.id, word: w.danish, translation: w.translation, family: w.legacy_family, familyNote: w.legacy_family_note, summary: w.summary,
      usage: w.usage, example: w.example, contentHtml: w.content_html
    })),
    rules: ruleRows.results.map(r => ({
      id: r.id, title: r.title, summary: r.summary, contentHtml: r.content_html
    })),
    similarCards: cardRows.results.map(c => ({
      id: c.id, category: c.category, title: c.title, topic: c.topic, summary: c.summary,
      note: c.note, sources: parseJson(c.sources_json, []), words: links.get(c.id) || []
    })),
    customBlocks: calloutRows.results.map(c => ({
      id: c.id, label: c.label, icon: c.icon, color: c.background_color, accent: c.accent_color
    }))
  });
}

function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

async function saveEntry(request, env, user, routeId) {
  const input = await readJson(request);
  if (!input || !["word", "rule", "similar"].includes(input.kind) || !input.item || typeof input.item !== "object") {
    return json({ error: "Invalid entry" }, 400);
  }
  const kind = input.kind, item = input.item, id = routeId || String(item.id || randomId());
  const now = Date.now();
  if (kind === "word") {
    const danish = String(item.word || "").trim();
    if (!danish) return json({ error: "Danish word is required" }, 400);
    await env.DB.prepare(
      `INSERT INTO words (id, danish, translation, legacy_family, legacy_family_note, summary, usage, example, content_html, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET danish=excluded.danish, translation=excluded.translation,
       legacy_family=excluded.legacy_family, legacy_family_note=excluded.legacy_family_note,
       summary=excluded.summary, usage=excluded.usage, example=excluded.example,
       content_html=excluded.content_html, updated_by=excluded.updated_by, updated_at=excluded.updated_at`
    ).bind(id, danish, String(item.translation || ""), String(item.family || ""), String(item.familyNote || ""),
      String(item.summary || ""), String(item.usage || ""), String(item.example || ""), String(item.contentHtml || ""), user.id, user.id, now, now).run();
  } else if (kind === "rule") {
    const title = String(item.title || "").trim();
    if (!title) return json({ error: "Rule title is required" }, 400);
    await env.DB.prepare(
      `INSERT INTO rules (id, title, summary, content_html, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, summary=excluded.summary,
       content_html=excluded.content_html, updated_by=excluded.updated_by, updated_at=excluded.updated_at`
    ).bind(id, title, String(item.summary || ""), String(item.contentHtml || ""), user.id, user.id, now, now).run();
  } else {
    const category = item.category === "meaning" ? "meaning" : item.category === "form" ? "form" : null;
    const title = String(item.title || "").trim();
    const seenWords = new Set();
    const cardWords = (Array.isArray(item.words) ? item.words : []).filter(entry => { const key = String(entry.word || "").trim().toLocaleLowerCase(); if (!key || seenWords.has(key)) return false; seenWords.add(key); return true; });
    if (!category || !title) return json({ error: "Card category and title are required" }, 400);
    if (cardWords.length < 2) return json({ error: "A comparison card must contain at least two words" }, 400);
    await env.DB.prepare(
      `INSERT INTO similar_cards (id, category, title, topic, summary, note, sources_json, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET category=excluded.category, title=excluded.title, topic=excluded.topic,
       summary=excluded.summary, note=excluded.note, sources_json=excluded.sources_json,
       updated_by=excluded.updated_by, updated_at=excluded.updated_at`
    ).bind(id, category, title, String(item.topic || ""), String(item.summary || ""), String(item.note || ""),
      JSON.stringify(Array.isArray(item.sources) ? item.sources : []), user.id, user.id, now, now).run();

    await env.DB.prepare("DELETE FROM similar_card_words WHERE card_id = ?").bind(id).run();
    for (let position = 0; position < cardWords.length; position++) {
      const entry = cardWords[position];
      const danish = String(entry.word || "").trim();
      if (!danish) continue;
      let word = await env.DB.prepare("SELECT id FROM words WHERE danish = ? COLLATE NOCASE LIMIT 1").bind(danish).first();
      if (!word) {
        const wordId = randomId();
        await env.DB.prepare(
          "INSERT INTO words (id, danish, translation, usage, example, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(wordId, danish, String(entry.translation || ""), String(entry.usage || ""), String(entry.example || ""),
          user.id, user.id, now, now).run();
        word = { id: wordId };
      }
      await env.DB.prepare(
        "INSERT INTO similar_card_words (card_id, word_id, position, card_translation, card_usage, card_example) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(id, word.id, position, String(entry.translation || ""), String(entry.usage || ""), String(entry.example || "")).run();
    }
  }
  await env.DB.prepare(
    "INSERT INTO audit_log (actor_id, action, entity_type, entity_id, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(user.id, routeId ? "update" : "create", kind, id, "{}", now).run();
  return json({ id, saved: true }, routeId ? 200 : 201);
}

async function deleteEntry(url, env, user, id) {
  const kind = url.searchParams.get("kind");
  const tables = { word: "words", rule: "rules", similar: "similar_cards" };
  const table = tables[kind];
  if (!table) return json({ error: "Unknown entry type" }, 400);
  if (kind === "word") {
    const linked = await env.DB.prepare("SELECT COUNT(*) AS count FROM similar_card_words WHERE word_id = ?").bind(id).first();
    if (Number(linked?.count || 0) > 0) return json({ error: "This word is used in comparison cards. Remove it from those cards first." }, 409);
  }
  const result = await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  if (!result.meta?.changes) return json({ error: "Entry not found" }, 404);
  await env.DB.prepare(
    "INSERT INTO audit_log (actor_id, action, entity_type, entity_id, details_json, created_at) VALUES (?, 'delete', ?, ?, '{}', ?)"
  ).bind(user.id, kind, id, Date.now()).run();
  return json({ deleted: true });
}

async function removeMember(env, owner, id) {
  if (id === owner.id) return json({ error: "The owner account cannot remove itself" }, 400);
  const member = await env.DB.prepare("SELECT id, role FROM users WHERE id = ?").bind(id).first();
  if (!member || member.role !== "cohost") return json({ error: "Co-host not found" }, 404);
  await env.DB.prepare("DELETE FROM users WHERE id = ? AND role = 'cohost'").bind(id).run();
  await env.DB.prepare(
    "INSERT INTO audit_log (actor_id, action, entity_type, entity_id, details_json, created_at) VALUES (?, 'remove_member', 'user', ?, '{}', ?)"
  ).bind(owner.id, id, Date.now()).run();
  return json({ removed: true });
}
