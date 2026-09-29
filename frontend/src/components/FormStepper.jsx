import React from 'react'
import { FiCheck } from 'react-icons/fi'

/**
 * FormStepper – reusable multi-step wizard header
 * Props: steps (array of {label, icon}), currentStep (0-indexed), onStepClick
 */
export default function FormStepper({ steps, currentStep, onStepClick }) {
  return (
    <div style={styles.wrapper}>
      {steps.map((step, idx) => {
        const done    = idx < currentStep
        const active  = idx === currentStep
        const pending = idx > currentStep
        return (
          <React.Fragment key={idx}>
            <div
              style={styles.step}
              onClick={() => done && onStepClick && onStepClick(idx)}
              title={done ? `Go to: ${step.label}` : step.label}
            >
              <div style={{
                ...styles.circle,
                background: done ? 'var(--color-success)' : active ? 'var(--color-primary)' : '#E2E8F0',
                color:      done ? 'white'                : active ? 'white'                : '#94A3B8',
                cursor:     done ? 'pointer'              : 'default',
                boxShadow:  active ? '0 0 0 3px rgba(13,59,110,0.2)' : 'none',
                transform:  active ? 'scale(1.1)' : 'scale(1)',
              }}>
                {done ? <FiCheck size={14} /> : <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{idx + 1}</span>}
              </div>
              <span style={{
                ...styles.label,
                color:      active ? 'var(--color-primary)' : done ? 'var(--color-success)' : '#94A3B8',
                fontWeight: active ? 700 : 500,
              }}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div style={{
                ...styles.connector,
                background: done ? 'var(--color-success)' : '#E2E8F0',
              }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    border: '1px solid var(--color-border-light)',
    borderRadius: '12px',
    padding: '16px 24px',
    marginBottom: '16px',
    overflowX: 'auto',
    gap: '0',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    minWidth: '72px',
    flexShrink: 0,
  },
  circle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.25s ease',
  },
  label: {
    fontSize: '0.7rem',
    textAlign: 'center',
    lineHeight: 1.2,
    maxWidth: '72px',
    transition: 'color 0.25s',
  },
  connector: {
    flex: 1,
    height: '2px',
    minWidth: '20px',
    marginBottom: '18px',
    transition: 'background 0.3s',
  },
}
