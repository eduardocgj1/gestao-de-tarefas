Centered dialog with scrim backdrop — task modal (360px), event modal (360px),
settings modal (440px), or the expanded day-drawer popup (`large`, 680px/78vh).

```jsx
<Modal width={360} onClose={close}>
  <IconButton onClick={close} style={{ position: 'absolute', top: 14, right: 16 }}>×</IconButton>
  <Input big value="Nome da tarefa" />
</Modal>
```
