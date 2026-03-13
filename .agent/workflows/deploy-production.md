---
description: Pipeline de Deploy para Produção (Docker + VPS)
---

# Pipeline de Deploy para Produção

Este workflow automatiza o processo de build e atualização da aplicação Verbalia na VPS do usuário.

## Pré-requisitos
- Docker e Docker Compose instalados na VPS.
- Arquivo `.env` configurado na raiz do projeto.

## Passos do Deploy

1. **Sincronizar Arquivos**
Certifique-se de que as últimas alterações do código (especialmente `Dockerfile`, `docker-compose.yml` e o código fonte refatorado) estão na VPS.

// turbo
2. **Build da Imagem Docker**
Gera uma nova imagem local contendo as últimas correções de permissões e inicialização lazy.
```powershell
docker build -t tiobred/verbalia:latest .
```

// turbo
3. **Atualizar Container**
Reinicia o serviço baseado na nova imagem, mantendo as variáveis de ambiente e volumes.
```powershell
docker-compose up -d
```

// turbo
4. **Verificar Logs**
Confirma se a aplicação subiu sem erros de permissão ou de inicialização.
```powershell
docker-compose logs --tail=50 -f
```

## Notas Adicionais
- Se houver novos modelos ou campos no banco de dados, o comando `npx prisma migrate deploy` deve ser executado (geralmente via comando customizado no container ou antes do build).
- O arquivo `Dockerfile` agora garante a criação da pasta `/app/tmp` com permissões corretas para evitar o erro `EACCES`.
