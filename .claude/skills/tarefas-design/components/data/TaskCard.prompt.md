Unidade principal de conteúdo dentro de uma coluna de dia ou do drawer "Visão do Dia".

```jsx
<TaskCard name="Testes First Layer" duration="1h" urgent mit />
<TaskCard name="Atualizar ppt semanal NAC" completed />
```

O par borda-esquerda + fundo codifica o estado: normal (quase preto / off-white), urgente (terracota), concluída (cinza + tachado + opacidade 0.55). A prop `mit` exibe o marcador ⭐ "prioridade do dia".
