# [Nome da Feature]

> Copie este arquivo para `docs/features/nome-da-feature/spec.md` ao documentar uma nova feature.

## Objetivo

O que o usuário consegue fazer com essa feature que não conseguia antes? (1–2 frases)

## Problema

Qual dor ou dificuldade essa feature resolve? Seja específico — descreva a situação concreta que o usuário enfrenta hoje.

## Solução

Como a feature resolve o problema? Descreva o comportamento principal sem entrar em detalhes de implementação ainda.

## Escopo

### Dentro do escopo
- O que essa feature FAZ

### Fora do escopo
- O que essa feature NÃO faz (igualmente importante — evita scope creep)

## Jornada do usuário

Passo a passo de como o usuário interage com a feature, do gatilho até o resultado.

1. Usuário faz X
2. App responde com Y
3. ...

## Referências técnicas

Informações que a IA precisa para implementar sem ter que deduzir:

- **Onde adicionar no frontend:** qual arquivo, qual função, qual linha aproximada
- **Dados disponíveis:** quais variáveis/funções já existem e podem ser reaproveitadas
- **Persistência:** o que precisa ser salvo via `save()`, o que pode ficar só em memória ou `localStorage`
- **Novos campos no banco:** se precisar de novos campos, listar aqui com os tipos (lembrar de adicionar em `schema.sql` E no mapeamento em `server.js`)

## Design

Descreva o visual e comportamento esperado. Se houver protótipo, referencie aqui:

- Protótipo: `prototype/` ou `prototype.dc.html` (abrir no browser)
- Paleta e componentes: seguir o padrão de `public/styles.css`

## Status

- [ ] Especificado
- [ ] Protótipo aprovado
- [ ] Implementado
- [ ] Testado
