# Previsão do Tempo

**Status:** `[x] Discovery` → `[x] Design` → `[ ] Discovery Técnico` → `[ ] Em desenvolvimento` → `[ ] Em revisão` → `[ ] Concluído`

**Branch:** `feature/previsao-do-tempo`
**Criado em:** 2026-07-12
**Última atualização:** 2026-07-12

---

## v1 — Discovery

### Objetivo
O usuário vê a previsão do tempo de cada dia diretamente no cabeçalho das colunas do board, e a previsão do dia atual na Visão do Dia — com localização automática ou cidade escolhida manualmente.

### Problema
O usuário planeja tarefas que dependem do clima (reuniões externas, deslocamentos, atividades físicas) sem ter a informação de tempo visível enquanto organiza a semana. Precisa sair do app para consultar o clima.

### Solução
Exibir temperatura e condição climática no cabeçalho de cada coluna de dia usando a API gratuita Open-Meteo. A localização é detectada automaticamente pelo browser (`navigator.geolocation`) ou definida pelo usuário via busca de cidade. A cidade selecionada fica salva em `localStorage`.

### Escopo

**Dentro do escopo**
- Ícone do clima + temperatura mín/máx no `col-header` de cada coluna de dia
- Previsão do dia atual + local na Visão do Dia (popup `renderDayPopup`)
- Detecção automática de localização via `navigator.geolocation`
- Campo de busca de cidade (geocoding via Open-Meteo Geocoding API) como alternativa/override
- Persistência da cidade escolhida em `localStorage` (chave `weather-location`)
- Estados de loading e erro tratados silenciosamente (sem quebrar o layout)

**Fora do escopo**
- Previsão por hora
- Múltiplas cidades salvas
- Notificações ou alertas climáticos
- Exibição no calendário mensal
- Persistência da cidade no banco de dados (Supabase)

---

## v2 — Design

### Experiência e visual

**No cabeçalho das colunas (`col-header`)**

O cabeçalho atual tem dois blocos: `col-header-top` (título + anel de progresso) e `col-stats` (contagem de tarefas e tempo). O clima entra como um terceiro bloco discreto abaixo de `col-stats`:

```
13/jul – Segunda          ◑
9 tarefas · 0 concluídas · 0%
Previsto 0min · Feito 0min · Resta 0min
🌤 23° / 17°
```

- Ícone emoji do clima (mapeado a partir do `weathercode` da Open-Meteo)
- Temperatura máxima e mínima do dia
- Fonte e cor discretas (mesmo estilo de `col-stats`)
- Se dados ainda não chegaram: sem espaço reservado — o bloco simplesmente não aparece
- Se erro ou localização negada: idem, sem mensagem de erro no cabeçalho

**Na Visão do Dia (`renderDayPopup`)**

No topo do popup, abaixo da data, aparece um bloco de clima mais completo:

```
📍 São Paulo   [trocar cidade]
🌤 Parcialmente nublado · 25° / 18°
```

- Nome da cidade detectada ou escolhida
- Link "trocar cidade" abre inline um campo de busca com autocomplete
- Busca chama Open-Meteo Geocoding API em tempo real (debounce 400ms)
- Usuário seleciona da lista → cidade salva em `localStorage` → previsão atualiza

### Estados da interface

| Elemento | Vazio/Carregando | Com dados | Erro/Negado |
|---|---|---|---|
| `col-header` | Bloco oculto | Ícone + temp min/max | Bloco oculto |
| Visão do Dia | "Carregando..." | Cidade + condição + temp | "Localização indisponível · [buscar cidade]" |
| Campo de busca | Placeholder "Buscar cidade..." | Lista de sugestões | "Nenhuma cidade encontrada" |

### Mapeamento de ícones (weathercode → emoji)

| Código | Condição | Emoji |
|---|---|---|
| 0 | Céu limpo | ☀️ |
| 1–3 | Parcialmente nublado | 🌤 / ⛅ / 🌥 |
| 45–48 | Neblina | 🌫 |
| 51–67 | Garoa / Chuva fraca a forte | 🌦 / 🌧 |
| 71–77 | Neve | 🌨 |
| 80–82 | Pancadas de chuva | 🌧 |
| 95–99 | Tempestade | ⛈ |

---

## v3 — Discovery Técnico

### Visão geral técnica

Adicionar um módulo de clima em `app.js` que: (1) busca localização via browser ou `localStorage`, (2) chama Open-Meteo para obter previsão diária dos próximos 7 dias, (3) injeta os dados nos cabeçalhos das colunas após o `render()`, e (4) exibe clima expandido na Visão do Dia. Sem mudanças no servidor ou banco de dados.

### Arquivos a modificar

| Arquivo | O que muda | Impacto |
|---|---|---|
| `public/app.js` | Módulo de clima: fetch, cache, render nos headers e no DayPopup | Alto |
| `public/styles.css` | Estilo do bloco `.col-weather` e do bloco de clima no DayPopup | Baixo |
| `public/index.html` | Nenhuma mudança necessária | — |
| `server.js` | Nenhuma mudança necessária | — |

### Novos campos no banco
Nenhuma mudança necessária. Tudo em `localStorage`.

### Chaves de localStorage

| Chave | Tipo | Conteúdo |
|---|---|---|
| `weather-location` | JSON | `{ name, latitude, longitude }` |
| `weather-cache` | JSON | `{ fetchedAt, daily: { time[], temperature_2m_max[], temperature_2m_min[], weathercode[] } }` |

Cache válido por 1 hora. Se expirado ou ausente, refaz o fetch.

### APIs utilizadas (gratuitas, sem chave)

**Geocoding:**
```
GET https://geocoding-api.open-meteo.com/v1/search?name={query}&count=5&language=pt
```

**Previsão:**
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lon}
  &daily=temperature_2m_max,temperature_2m_min,weathercode
  &timezone=auto
  &forecast_days=14
```

### Funções a criar em `app.js`

```js
// Retorna localização salva ou detecta via browser
async function getWeatherLocation()

// Busca previsão (com cache de 1h)
async function fetchWeather(lat, lon)

// Retorna { icon, max, min } para uma dateKey específica
function weatherForDay(dateKey)

// Injeta .col-weather em cada .col-header após render()
function renderWeatherOnColumns()

// Renderiza bloco de clima dentro do DayPopup
function renderWeatherInDayPopup(dateKey)

// Campo de busca com autocomplete (usado na Visão do Dia)
async function searchCity(query)
```

### Integração com código existente

- `render()` (linha 666) → adicionar chamada `renderWeatherOnColumns()` ao final
- `renderDayPopup()` (linha 2166) → adicionar chamada `renderWeatherInDayPopup(dayPopupDate)` no topo do popup
- Não chamar `save()` — clima não é persistido no servidor

### Riscos e pontos de atenção

- **Geolocation negada pelo usuário:** fallback para campo de busca; nunca travar a UI esperando permissão
- **Sem conexão:** usar cache mesmo expirado se disponível; senão ocultar silenciosamente
- **Open-Meteo fora do ar:** raro, mas tratar com try/catch; ocultar bloco de clima sem mensagem de erro no header
- **`forecast_days=14`** garante cobertura de qualquer semana navegada, não só a atual
- **Fuso horário:** usar `timezone=auto` para que os índices de dia da API correspondam à localização do usuário

---

## Tasks de implementação

### ⚙️ Infraestrutura de clima
- [ ] `weather-01` Criar `getWeatherLocation()`: lê `localStorage`, se vazio chama `navigator.geolocation`, persiste resultado
- [ ] `weather-02` Criar `fetchWeather(lat, lon)`: chama Open-Meteo, salva resultado em `weather-cache` com timestamp
- [ ] `weather-03` Criar `weatherForDay(dateKey)`: lookup no cache, retorna `{ icon, max, min }` ou `null`

### 🎨 Frontend — colunas
- [ ] `weather-04` Adicionar estilo `.col-weather` em `styles.css`
- [ ] `weather-05` Criar `renderWeatherOnColumns()`: injeta `.col-weather` nos `.col-header` após `render()`
- [ ] `weather-06` Chamar `renderWeatherOnColumns()` ao final de `render()` e após mudança de cidade

### 🎨 Frontend — Visão do Dia
- [ ] `weather-07` Criar `renderWeatherInDayPopup(dateKey)`: bloco com cidade, condição e temperatura
- [ ] `weather-08` Implementar campo de busca de cidade com debounce + autocomplete via Geocoding API
- [ ] `weather-09` Ao selecionar cidade: salvar em `localStorage`, refazer fetch, atualizar colunas e popup

### ✅ Critérios de conclusão
- [ ] Clima aparece nos cabeçalhos de todas as colunas da semana visível
- [ ] Clima da cidade atual aparece na Visão do Dia
- [ ] Trocar cidade atualiza cabeçalhos e Visão do Dia imediatamente
- [ ] Permissão de localização negada não quebra nenhuma parte do app
- [ ] Cache evita chamadas repetidas à API na mesma hora
- [ ] Testado com localização automática e com busca manual de cidade
- [ ] Nenhuma funcionalidade existente foi quebrada
