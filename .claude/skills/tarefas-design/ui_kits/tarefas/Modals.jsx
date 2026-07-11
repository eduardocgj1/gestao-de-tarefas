// Modals.jsx — Task, Event, Settings modals built from the DS Modal/Input/Button/Checkbox primitives.
function TarefasTaskModal({ task, onClose }) {
  const { Modal, Input, Checkbox, Button, IconButton } = window.TarefasDesignSystem_671953;
  return (
    <Modal width={360} onClose={onClose}>
      <IconButton size={26} onClick={onClose} style={{ position: 'absolute', top: 14, right: 16 }}>×</IconButton>
      <Input big value={task.name} />
      <div style={{ marginTop: 16 }}>
        <Input label="Data de entrega" type="date" value="2026-07-07" />
      </div>
      <div style={{ marginTop: 14 }}>
        <Input label="Duração prevista (min)" type="number" value={task.durationRaw} />
      </div>
      <div style={{ marginTop: 14 }}><Checkbox checked={task.urgent} label="Urgente" /></div>
      <div style={{ marginTop: 10, marginBottom: 16 }}><Checkbox checked={task.completed} label="Concluída" /></div>
      <Button variant="danger-soft" style={{ width: '100%' }}>Excluir tarefa</Button>
    </Modal>
  );
}

function TarefasEventModal({ onClose }) {
  const { Modal, Input, Button, IconButton } = window.TarefasDesignSystem_671953;
  return (
    <Modal width={360} onClose={onClose}>
      <IconButton size={26} onClick={onClose} style={{ position: 'absolute', top: 14, right: 16 }}>×</IconButton>
      <Input big value="Sprint Review" />
      <div style={{ display: 'flex', gap: 10, margin: '16px 0 14px' }}>
        <Input label="Início" type="date" value="2026-07-15" />
        <Input label="Final" type="date" value="2026-07-15" />
      </div>
      <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Boards relacionados</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {[{ name: 'Trabalho', color: 'var(--brand)' }, { name: 'Pessoal', color: 'var(--danger)' }].map((b) => (
          <label key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border-default)', borderRadius: 9, padding: '9px 11px', background: 'var(--surface-sunken)' }}>
            <input type="checkbox" defaultChecked /><span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} /><span style={{ font: '600 13px var(--font-sans)', color: 'var(--text-primary)' }}>{b.name}</span>
          </label>
        ))}
      </div>
      <div style={{ marginBottom: 10 }}><Button variant="brand" style={{ width: '100%' }}>Salvar evento</Button></div>
      <Button variant="danger-soft" style={{ width: '100%' }}>Excluir evento</Button>
    </Modal>
  );
}

function TarefasSettingsModal({ customFields, onClose }) {
  const { Modal, Input, Button, IconButton } = window.TarefasDesignSystem_671953;
  return (
    <Modal width={440} onClose={onClose}>
      <IconButton size={26} onClick={onClose} style={{ position: 'absolute', top: 16, right: 18 }}>×</IconButton>
      <div style={{ font: '800 17px var(--font-sans)', color: 'var(--text-primary)', marginBottom: 18 }}>Configurações</div>
      <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Campos personalizados</div>
      {customFields.map((field) => (
        <div key={field.id} style={{ border: '1px solid var(--border-default)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input defaultValue={field.name} style={{ flex: 1, border: 'none', background: 'transparent', font: '700 12.5px var(--font-sans)', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '.03em', padding: '2px 4px', outline: 'none' }} />
            <button type="button" style={{ border: 'none', background: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {field.values.map((val) => (
              <div key={val.name} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-sunken)', border: '1px solid var(--border-default)', borderRadius: 20, padding: '5px 10px 5px 8px' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: val.color, flexShrink: 0 }} />
                <span style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-primary)' }}>{val.name}</span>
              </div>
            ))}
            <button type="button" style={{ border: '1px dashed var(--sand-600)', background: 'none', borderRadius: 20, padding: '5px 10px', font: '600 11.5px var(--font-sans)', color: 'var(--text-tertiary)', cursor: 'pointer' }}>+ valor</button>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, margin: '6px 0 22px' }}>
        <Input placeholder="Novo campo personalizado" />
        <Button variant="brand" size="sm">Adicionar</Button>
      </div>
      <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Pomodoro</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Input label="Foco" type="number" value={25} />
        <Input label="Pausa curta" type="number" value={5} />
        <Input label="Pausa longa" type="number" value={15} />
      </div>
    </Modal>
  );
}

window.TarefasTaskModal = TarefasTaskModal;
window.TarefasEventModal = TarefasEventModal;
window.TarefasSettingsModal = TarefasSettingsModal;
