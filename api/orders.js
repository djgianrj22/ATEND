// Pedidos: cliente cria (POST) e consulta os próprios (GET ?ids=); cozinha lista e atualiza com PIN.
const { Redis } = require("@upstash/redis");

// Procura a variável do Redis por qualquer prefixo (KV_, STORAGE_KV_, UPSTASH_REDIS_...)
const pick = (re) => {
  const k = Object.keys(process.env).find((k) => re.test(k) && process.env[k]);
  return k ? process.env[k] : undefined;
};
const url = pick(/REST_(API_)?URL$/);
const token = pick(/REST_(API_)?TOKEN$/);
const r = url && token ? new Redis({ url, token }) : null;

const K = "orders";
const isKds = (req) => !!process.env.KDS_PIN && req.headers["x-pin"] === process.env.KDS_PIN;

module.exports = async (req, res) => {
  if (!r) return res.status(500).json({ error: "Redis não conectado: conecte o Upstash Redis ao projeto e faça um Redeploy" });
  try {
    if (req.method === "POST") {
      const b = req.body || {};
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 60)
        .map((i) => ({ n: String(i.n).slice(0, 100), q: Math.min(99, Math.max(1, +i.q || 1)) }));
      const mesa = String(b.mesa || "").slice(0, 10);
      if (!items.length || !mesa) return res.status(400).json({ error: "pedido inválido" });
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const o = { id, mesa, obs: String(b.obs || "").slice(0, 200), items, total: +b.total || 0, status: "novo", createdAt: Date.now() };
      await r.hset(K, { [id]: o });
      return res.status(201).json(o);
    }
    if (req.method === "GET") {
      const all = Object.values((await r.hgetall(K)) || {});
      if (isKds(req)) return res.json(all.sort((a, b) => a.createdAt - b.createdAt));
      const ids = String(req.query.ids || "").split(",");
      return res.json(all.filter((o) => ids.includes(o.id)).map(({ id, status, mesa, total, items }) => ({ id, status, mesa, total, items })));
    }
    if (req.method === "PATCH") {
      if (!isKds(req)) return res.status(401).json({ error: "PIN inválido" });
      const { id, status } = req.body || {};
      if (!["preparando", "pronto", "entregue"].includes(status)) return res.status(400).json({ error: "status inválido" });
      if (status === "entregue") await r.hdel(K, id);
      else { const o = await r.hget(K, id); if (o) await r.hset(K, { [id]: { ...o, status } }); }
      return res.json({ ok: true });
    }
    res.status(405).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e && e.message) });
  }
};
