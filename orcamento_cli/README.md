# orcamento_cli

Interface de linha de comando do SCO, desenhada para **agentes**.

O `orcamento_client` serve humanos, o `orcamento_cli` serve agentes. São dois clientes da mesma API, com ergonomias diferentes de propósito: a tela otimiza clique e descoberta visual, o CLI otimiza contexto e encadeamento.

```
node orcamento_cli/sco.js --ajuda
```

## Por que existe

Um agente que opera o SCO pela API crua paga três impostos: precisa carregar um catálogo de rotas escrito à mão para descobrir os campos de um recurso, recebe JSON completo quando queria quatro colunas, e autentica de novo a cada invocação. O CLI existe para zerar os três.

## Os três princípios

**1. Nada de contrato copiado.** Campos, tipos, obrigatórios, filtros de listagem e regras entre campos saem do Joi vivo do `server/` em tempo de execução, via `describe()`. Não existe arquivo gerado, catálogo em markdown nem documentação paralela para apodrecer. Se o schema mudar, o `sco schema` muda no mesmo commit.

O limite disso é conhecido e tratado: o `describe()` não enxerga os comentários dos `*_schema.js`, e é neles que mora o porquê (que `valor_nc` não muda por devolução, por exemplo). Por isso `lib/regras.js` guarda a prosa curada, curta, só do que o Joi não sabe dizer. **Forma vem do Joi; porquê vem da prosa ao lado.**

**2. Saída compacta por padrão.** O consumidor tem janela finita. O padrão é TSV recortado nas colunas que importam; `--json` continua devolvendo tudo, para quem vai encadear.

**3. O guardrail mora na interface.** Validação local antes do envio e confirmação de ação irreversível ficam aqui, não na skill que chama. Skill é de um cliente só; a interface serve todos.

## Uso

```bash
# contrato (não gasta rede nem credencial)
node orcamento_cli/sco.js schema            # lista os recursos
node orcamento_cli/sco.js schema nc         # campos, tipos, regras da NC

# dia a dia
sco saldo                       # quanto falta empenhar e liquidar (total do PDR)
sco saldo --nd 339040           # o mesmo, por natureza de despesa
sco secao3 --mes 7              # a Seção 3 do RPCMTec em markdown
sco secao3 --mes 7 --docx       # a mesma, em DOCX para colar no Google Docs

# CRUD
sco nc listar --ano 2026 --campos numero,cod_nd,valor_nc
sco nc criar --data '{...}' --dry-run       # valida offline, não envia
sco nc lancar --data '{...}' --anexo nota.pdf   # cria e anexa numa invocação
sco nc deletar --id 9 --confirmar 9

# sessão
sco status    # o SCO está no ar? há token em cache?
sco login     # autentica uma vez, guarda o token (~1h)
```

## Ambiente

Nunca ponha senha na linha de comando. Catálogo das chaves no `env-guia.md` do vault.

| Variável | Para quê |
|---|---|
| `ORCAMENTO_SERVER` | URL do backend, ex.: `http://IP:3016` |
| `ORCAMENTO_USER` | login de admin |
| `ORCAMENTO_SENHA` | senha (preferir a variável ao `--senha`) |
| `ORCAMENTO_TOKEN` | JWT pronto, dispensa o login |

O token fica em cache em `~/.sco/sessao-<servidor>.json`, com validade lida do próprio JWT. Um arquivo por servidor, para não misturar a instância local com a de produção. `--sem-cache` desliga.

## O que o CLI protege

- **Validação local**: o corpo é conferido contra o Joi antes de sair da máquina. Corpo torto falha em milissegundos, com o contrato do campo errado impresso junto, em vez de custar um round-trip e um 400 genérico.
- **Campo descartado em silêncio**: o servidor valida o corpo com `stripUnknown`, então campo com nome errado (ou descartado por regra condicional, como o `pdr_item_id` de uma NC Extra-PDR) some sem erro. O CLI avisa. É a diferença entre "gravei" e "achei que gravei".
- **Exclusão irreversível**: `deletar` exige `--confirmar` com o identificador repetido.
- **Falha parcial do `lancar`**: não há transação entre criar o registro e anexar o arquivo. Se o anexo falhar, o CLI diz explicitamente para não repetir o `lancar` (duplicaria) e dá o comando de reenviar só o anexo.

## Testes

```bash
cd orcamento_cli && npm test
```

Rodam com o `node:test` embutido, sem instalar nada. Os testes de schema rodam **contra os schemas reais do `server/`**, não contra mocks: o valor do CLI é não ter cópia do contrato, e testar com schema falso testaria justamente a cópia. Em troca, eles quebram quando o contrato do SCO muda, que é exatamente o alarme que se quer ter.

## Dependências

Nenhuma. Só o Node e o `server/` (de onde vem o Joi, através dos próprios arquivos de schema). Isso é o que permite rodar o `sco` num clone recém-baixado, sem `npm install` na pasta do CLI.

## Estrutura

```
sco.js              roteador e mapa de ajuda
lib/args.js         parser de argumentos próprio
lib/config.js       ambiente, cliente do auth, caminho da sessão
lib/http.js         requisição, envelope, cache de token, multipart
lib/recursos.js     registry: rota, módulo de schema, colunas padrão
lib/schema.js       joi.describe() -> contrato legível; validação local
lib/regras.js       a prosa curada que o describe() não alcança
lib/saida.js        TSV, tabela, JSON, --campos
comandos/           schema, crud, relatorio (saldo/secao3), dominio, sessao
```

## Replicar noutro sistema

O padrão é portável para o SCA e o SAP, que compartilham a mesma stack. O que muda por sistema é `lib/recursos.js` (a registry) e `lib/regras.js` (a prosa); o resto é infraestrutura. Ver a página `agent-first` na wiki do vault.
