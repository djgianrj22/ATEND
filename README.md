# Cardápio digital + KDS (Vercel)

1. Suba esta pasta para um repositório no GitHub e importe no Vercel (ou rode `vercel` na pasta).
2. No painel do projeto: **Storage → Marketplace → Upstash Redis** → criar e conectar ao projeto
   (isso cria as variáveis de ambiente do Redis; o código aceita `UPSTASH_REDIS_REST_*` ou `KV_REST_API_*`).
3. Em **Settings → Environment Variables**, crie `KDS_PIN` (ex.: 4–6 dígitos). Faça um novo deploy.
4. Cliente: `https://SEU-PROJETO.vercel.app/`  ·  Cozinha (KDS): `https://SEU-PROJETO.vercel.app/#cozinha` (pede o PIN).
   Gere um QR code por mesa apontando para a URL do cliente.
