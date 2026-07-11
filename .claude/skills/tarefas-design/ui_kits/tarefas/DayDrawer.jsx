// DayDrawer.jsx — docked/resizable "Visão do Dia" panel + its expanded-modal twin.
function DayDrawerBody({ selectedDay, drawerBoards, shutdownOpen, onSetChoice }) {
  return (
    <>
      <div>
        <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Boards no dia</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {drawerBoards.map((b) => (
            <label key={b.id} onClick={b.toggle} style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-pill)', padding: '6px 12px 6px 8px', cursor: 'pointer', background: b.checked ? 'var(--surface-sunken)' : 'var(--surface)', opacity: b.checked ? 1 : 0.5 }}>
              <input type="checkbox" checked={b.checked} readOnly style={{ pointerEvents: 'none' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
              <span style={{ font: '600 12px var(--font-sans)', color: 'var(--text-primary)' }}>{b.name}</span>
            </label>
          ))}
        </div>
      </div>

      {!shutdownOpen ? (
        <>
          <div>
            <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>⭐ Prioridades do dia</div>
            {selectedDay.mitTasks.length > 0 ? selectedDay.mitTasks.map((mt) => (
              <div key={mt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--priority-bg)', border: '1px solid var(--priority-border)', borderRadius: 11, padding: '9px 11px', marginBottom: 6 }}>
                <span>⭐</span><span style={{ flex: 1, font: '600 13px var(--font-sans)' }}>{mt.name}</span>
              </div>
            )) : (
              <div style={{ border: '1.5px dashed var(--border-dashed)', borderRadius: 11, padding: 12, font: '500 12px var(--font-sans)', color: 'var(--text-tertiary)', textAlign: 'center' }}>Marque até 3 prioridades</div>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)' }} />
              <span style={{ font: '700 12.5px var(--font-sans)', color: 'var(--text-primary)' }}>Trabalho</span>
            </div>
            <div style={{ display: 'flex', gap: 6, font: '600 11px var(--font-sans)', color: 'var(--text-secondary)', background: 'var(--surface-sunken)', borderRadius: 9, padding: '8px 10px', marginBottom: 10 }}>
              <span>Previsto {selectedDay.planned}</span><span>·</span><span>Feito {selectedDay.done}</span><span>·</span><span>Resta {selectedDay.rest}</span>
            </div>
            {selectedDay.tasks.map((task) => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '8px 10px', marginBottom: 6, background: task.bg, borderLeft: `3px solid ${task.accent}` }}>
                <input type="checkbox" checked={task.completed} readOnly />
                <span style={{ flex: 1, font: '600 12.5px var(--font-sans)', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.name}</span>
                {task.duration && <span style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-meta)' }}>{task.duration}</span>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Fechar o dia</div>
          <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-meta)', marginBottom: 10 }}>O que fazer com as tarefas não concluídas?</div>
          {selectedDay.pendingTasks.length === 0 ? (
            <div style={{ border: '1px dashed var(--border-dashed)', borderRadius: 11, padding: 14, font: '500 12px var(--font-sans)', color: 'var(--text-tertiary)', textAlign: 'center' }}>Nenhuma tarefa pendente 🎉</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)' }} />
                <span style={{ font: '700 12.5px var(--font-sans)', color: 'var(--text-primary)' }}>Trabalho</span>
              </div>
              {selectedDay.pendingTasks.map((pt) => (
                <div key={pt.id} style={{ borderBottom: '1px solid var(--border-subtle)', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ flex: 1, minWidth: 120, font: '600 13px var(--font-sans)', color: 'var(--text-primary)' }}>{pt.name}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['amanha', 'outra', 'ignorar'].map((choice) => {
                      const labels = { amanha: 'Amanhã', outra: 'Outra data', ignorar: 'Ignorar' };
                      const active = pt.choice === choice;
                      return (
                        <button key={choice} type="button" onClick={() => onSetChoice(pt.id, choice)} style={{ border: 'none', borderRadius: 8, padding: '7px 12px', font: '700 11px var(--font-sans)', cursor: 'pointer', background: active ? 'var(--dark-action)' : 'var(--surface-neutral-button)', color: active ? '#fff' : 'var(--text-primary)' }}>{labels[choice]}</button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}

function DayDrawerFooter({ shutdownOpen, onOpenShutdown, onBackToNormal, onFinalize }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {!shutdownOpen ? (
        <button type="button" onClick={onOpenShutdown} style={{ flex: 1, border: 'none', background: 'var(--dark-action)', color: '#fff', font: '700 13px var(--font-sans)', padding: 12, borderRadius: 11, cursor: 'pointer' }}>Fechar o dia</button>
      ) : (
        <>
          <button type="button" onClick={onBackToNormal} style={{ flex: 1, border: 'none', background: 'var(--surface-neutral-button)', color: 'var(--text-primary)', font: '700 13px var(--font-sans)', padding: 12, borderRadius: 11, cursor: 'pointer' }}>Voltar</button>
          <button type="button" onClick={onFinalize} style={{ flex: 1, border: 'none', background: 'var(--dark-action)', color: '#fff', font: '700 13px var(--font-sans)', padding: 12, borderRadius: 11, cursor: 'pointer' }}>Encerrar</button>
        </>
      )}
    </div>
  );
}

function TarefasDayDrawer({ open, expanded, width, selectedDay, drawerBoards, shutdownOpen, onClose, onToggleExpand, onOpenShutdown, onBackToNormal, onFinalize, onSetChoice, onStartResize }) {
  if (expanded) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-scrim-strong)', zIndex: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .15s ease' }} onClick={onToggleExpand}>
        <div style={{ width: 680, maxWidth: '92vw', height: '78vh', background: 'var(--surface)', borderRadius: 'var(--radius-modal-lg)', boxShadow: 'var(--shadow-modal-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'modalIn .18s ease' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start' }}>
            <div>
              <div style={{ font: '800 19px var(--font-sans)', color: 'var(--text-primary)' }}>{selectedDay.fullLabel}</div>
              <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-tertiary)', marginTop: 2 }}>{shutdownOpen ? 'Fechando o dia' : 'Visão do dia'}</div>
            </div>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={onToggleExpand} title="Encaixar na lateral" style={{ border: 'none', background: 'var(--surface-neutral-button)', width: 30, height: 30, borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', flexShrink: 0, marginRight: 6 }}>⤡</button>
            <button type="button" onClick={onClose} style={{ border: 'none', background: 'var(--surface-neutral-button)', width: 30, height: 30, borderRadius: 8, color: 'var(--text-secondary)', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <DayDrawerBody {...{ selectedDay, drawerBoards, shutdownOpen, onSetChoice }} />
          </div>
          <div style={{ padding: '18px 26px', borderTop: '1px solid var(--border-subtle)' }}>
            <DayDrawerFooter {...{ shutdownOpen, onOpenShutdown, onBackToNormal, onFinalize }} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: open ? width : 0, flexShrink: 0, background: 'var(--surface)', borderLeft: open ? '1px solid var(--border-default)' : 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', transition: 'width .18s ease' }}>
      {open && (
        <div onMouseDown={onStartResize} title="Arraste para redimensionar" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 5 }} />
      )}
      <div style={{ width, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 22px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start' }}>
          <div>
            <div style={{ font: '800 17px var(--font-sans)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{selectedDay.fullLabel}</div>
            <div style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-tertiary)', marginTop: 2 }}>{shutdownOpen ? 'Fechando o dia' : 'Visão do dia'}</div>
          </div>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onToggleExpand} title="Abrir como pop-up" style={{ border: 'none', background: 'var(--surface-neutral-button)', width: 28, height: 28, borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', flexShrink: 0, marginRight: 6 }}>⤢</button>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'var(--surface-neutral-button)', width: 28, height: 28, borderRadius: 8, color: 'var(--text-secondary)', fontSize: 15, cursor: 'pointer', flexShrink: 0 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <DayDrawerBody {...{ selectedDay, drawerBoards, shutdownOpen, onSetChoice }} />
        </div>
        <div style={{ padding: '16px 22px', borderTop: '1px solid var(--border-subtle)' }}>
          <DayDrawerFooter {...{ shutdownOpen, onOpenShutdown, onBackToNormal, onFinalize }} />
        </div>
      </div>
    </div>
  );
}
window.TarefasDayDrawer = TarefasDayDrawer;
