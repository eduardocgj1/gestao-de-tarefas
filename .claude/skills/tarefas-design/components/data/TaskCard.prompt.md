The primary content unit inside a day column or the "Visão do Dia" drawer.

```jsx
<TaskCard name="Testes First Layer" duration="1h" urgent mit />
<TaskCard name="Atualizar ppt semanal NAC" completed />
```

Left-border + background pair encodes state: normal (near-black/off-white),
urgent (terracotta), completed (gray + strikethrough + 0.55 opacity). `mit`
shows the ⭐ "priority of the day" marker.
