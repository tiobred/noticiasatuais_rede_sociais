# Workflow: Security Audit
# Ativação: /security-audit
# Descrição: Auditoria de segurança completa antes do deploy em produção

## Passo 1 — Scan de Dependências

// turbo
```bash
# Verificar vulnerabilidades nas dependências
npm audit

# Atualizar pacotes com vulnerabilidades
npm audit fix

# Scan mais detalhado com snyk (opcional)
npx snyk test
```

---

## Passo 2 — Verificar Variáveis de Ambiente

Verifique no código-fonte:

```bash
# Procurar por secrets hardcoded (NUNCA deve haver)
grep -r "sk-ant-" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "EAAg" . --exclude-dir=node_modules --exclude-dir=.git  # tokens Meta
grep -r "password" . --exclude-dir=node_modules --include="*.ts" --include="*.js"

# Verificar se .env está no .gitignore
cat .gitignore | grep ".env"
```

---

## Passo 3 — Verificar Endpoints de API

Para cada endpoint em `app/api/`, verificar:

```typescript
// ✅ CORRETO: Autenticação verificada
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Validação com Zod
  const body = PostSchema.parse(await req.json());
  // ...
}

// ❌ ERRADO: Sem autenticação
export async function POST(req: Request) {
  const body = await req.json();
  await db.post.create({ data: body }); // VULNERÁVEL
}
```

Liste todos os endpoints sem autenticação e corrija.

---

## Passo 4 — Verificar Headers de Segurança

```typescript
// Verificar next.config.js
// Deve ter todos estes headers:
const securityHeaders = [
  'X-Content-Type-Options: nosniff',
  'X-Frame-Options: DENY', 
  'X-XSS-Protection: 1; mode=block',
  'Strict-Transport-Security: max-age=63072000',
  'Referrer-Policy: strict-origin-when-cross-origin',
];
```

---

## Passo 5 — Verificar Rate Limiting

```bash
# Testar se rate limiting está ativo:
for i in {1..20}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/posts
done
# Deve retornar 429 após o limite
```

---

## Passo 6 — Relatório Final

Gere um relatório de segurança:

```markdown
# Relatório de Segurança — [data]

## ✅ Aprovado
- [ ] Dependências sem vulnerabilidades críticas
- [ ] Nenhum secret hardcoded encontrado
- [ ] .env no .gitignore
- [ ] Todos os endpoints autenticados
- [ ] Zod validation nos inputs
- [ ] Headers de segurança configurados
- [ ] Rate limiting ativo
- [ ] HTTPS obrigatório (em produção)

## ⚠️ Atenção
[listar itens que precisam de atenção]

## ❌ Bloqueadores (corrigir antes do deploy)
[listar problemas críticos]
```
