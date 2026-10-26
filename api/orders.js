// Pedidos: cliente cria (POST) e consulta os próprios (GET ?ids=); cozinha lista e atualiza com PIN.
const { Redis } = require("@upstash/redis");
const r = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});
const K = "orders";
const isKds = (req) => !!process.env.KDS_PIN && req.headers["x-pin"] === process.env.KDS_PIN;

module.exports = async (req, res) => {
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
    res.status(500).json({ error: "erro interno" });
  }
};
