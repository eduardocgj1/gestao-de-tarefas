Dialog centralizado com backdrop de scrim — modal de tarefa (360px), modal de evento (360px), configurações (440px) ou o popup expandido do drawer do dia (`large`, 680px / 78vh).

```jsx
<Modal width={360} onClose={close}>
  <IconButton onClick={close} style={{ position: 'absolute', top: 14, right: 16 }}>×</IconButton>
  <Input big value="Nome da tarefa" />
</Modal>
```
