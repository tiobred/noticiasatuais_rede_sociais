# Workflow: PRD Interview
# Ativação: /prd-interview
# Descrição: Conduz entrevista estruturada para capturar escopo completo de qualquer sistema

## Objetivo

Coletar todas as informações necessárias para construir um sistema fullstack personalizado.
Faça as perguntas em blocos. Aguarde as respostas antes de avançar ao próximo bloco.

---

## Passo 1 — Identidade do Sistema

Pergunte ao usuário:

```
Vamos definir o escopo do seu sistema. Responda as perguntas abaixo:

1. Qual é o nome do sistema/produto?
2. Em uma frase: qual problema ele resolve?
3. Quem vai usar? (você mesmo, equipe, clientes)
4. Existe algum sistema parecido que serve de referência?
```

Aguarde resposta antes de continuar.

---

## Passo 2 — Fontes de Dados

Pergunte ao usuário:

```
Agora sobre os dados que o sistema vai coletar:

1. De quais sites/APIs você quer coletar dados?
2. Com que frequência? (a cada hora, 4 horas, diário)
3. Quais seções ou categorias são relevantes?
4. Há palavras-chave obrigatórias ou termos a evitar?
```

Aguarde resposta.

---

## Passo 3 — Processamento e IA

Pergunte ao usuário:

```
Sobre o que o sistema deve fazer com os dados coletados:

1. Só coletar, ou também resumir/analisar com IA?
2. Qual tom dos resumos? (jornalístico, técnico, casual, formal)
3. Deve gerar título, corpo e hashtags automaticamente?
4. Precisa de aprovação humana antes de publicar? (modo curadoria)
```

Aguarde resposta.

---

## Passo 4 — Publicação Social

Pergunte ao usuário:

```
Sobre os canais de publicação:

1. Quais redes: Instagram? WhatsApp? LinkedIn? X/Twitter?
2. Para Instagram: feed, stories ou ambos?
3. Para WhatsApp: grupos, broadcast list ou número específico?
4. Você já tem as credenciais/tokens das APIs? (não precisa compartilhar agora)
```

Aguarde resposta.

---

## Passo 5 — Dashboard e Monitoramento

Pergunte ao usuário:

```
Sobre o painel de controle:

1. Precisa de dashboard para acompanhar o sistema?
2. Quais métricas quer ver? (posts publicados, alcance, erros)
3. Acesso só para você ou múltiplos usuários com níveis diferentes?
4. Quer notificações de erro? (email, WhatsApp, Slack)
```

Aguarde resposta.

---

## Passo 6 — Infraestrutura

Pergunte ao usuário:

```
Sobre onde hospedar o sistema:

1. Preferência de deploy: Vercel, Railway, AWS, servidor próprio ou Docker local?
2. Tem banco de dados preferido? (PostgreSQL recomendado, ou MongoDB, SQLite)
3. Orçamento mensal estimado para infraestrutura?
4. Precisa de domínio personalizado?
```

Aguarde resposta.

---

## Passo 7 — Gerar PRD Final

Com todas as respostas coletadas, gere um documento PRD completo com esta estrutura:

```markdown
# PRD: [Nome do Sistema]
**Versão**: 1.0 | **Data**: [data atual] | **Status**: Draft

## Resumo Executivo
[2-3 frases]

## Objetivos
- [ ] ...

## Fontes de Dados
| Fonte | URL | Frequência | Filtros |
|-------|-----|-----------|---------|

## Agentes do Sistema
| Agente | Responsabilidade | Input | Output |
|--------|-----------------|-------|--------|

## Canais de Publicação
| Canal | Tipo | Frequência | Aprovação Humana |
|-------|------|-----------|-----------------|

## Stack Técnica Definida
[lista]

## Fora do Escopo (v1)
[o que não será feito agora]

## Critérios de Sucesso
[KPIs mensuráveis]

## Estimativa de Sprints
- Sprint 1 - Setup e Infraestrutura: X dias
- Sprint 2 - Scraper + Agente IA: X dias
- Sprint 3 - Dashboard + Auth: X dias
- Sprint 4 - Publicação Social: X dias
- Sprint 5 - Testes + Deploy: X dias
```

Após gerar o PRD, pergunte: "PRD aprovado? Posso iniciar a construção do sistema com /build-system?"
