Primary action button used across headers, drawers, and modals in Tarefas.

```jsx
<Button variant="brand" onClick={save}>Adicionar</Button>
<Button variant="dark" size="lg">Fechar o dia</Button>
<Button variant="danger-soft">Excluir tarefa</Button>
```

Variants: `dark` (Fechar o dia / Encerrar), `brand` (Salvar evento, Adicionar),
`neutral` (Voltar, toolbar icons-as-text), `brand-soft` (Hoje pill),
`danger-soft` (Excluir tarefa / evento). Sizes: `sm` (compact pill actions like
Amanhã/Outra data/Ignorar), `md` (default), `lg` (full-width footer CTAs).
