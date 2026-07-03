'use client';

/**
 * overflow.examples.tsx
 *
 * 13 interactive examples covering every orientation and compositional pattern,
 * including both OverflowActions placements:
 *   • inside OverflowGroup (space reserved in overflow math)
 *   • outside OverflowGroup (independent trailing actions)
 * Imports directly from ./overflow — no inline implementation shims.
 */

import type { ReactNode } from 'react';

import React, { useState, useCallback, useEffect, useRef } from 'react';

import type { OverflowInfo } from './overflow';

import {
  Overflow,
  OverflowGroup,
  OverflowItem,
  OverflowIndicator,
  OverflowActions,
  OverflowAnnouncer,
  OverflowSeparator,
  useOverflow,
  useOverflowItem,
} from './overflow';

// ═══════════════════════════════════════════════════════════════════════════════
// Design tokens — applied to demo chrome only, never to Overflow components.
// ═══════════════════════════════════════════════════════════════════════════════

const C = {
  bg: '#07090d',
  surface: '#0d1117',
  raised: '#111722',
  border: '#1c2333',
  dim: '#151d28',
  muted: '#3a4559',
  subtle: '#64748b',
  body: '#94a3b8',
  heading: '#e2e8f0',
  blue: '#3b82f6',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  lime: '#84cc16',
  mono: "'JetBrains Mono','Fira Code',monospace",
  sans: 'system-ui,-apple-system,sans-serif',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Demo shell primitives
// ═══════════════════════════════════════════════════════════════════════════════

function Shell({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
          }}>
          <h2
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: C.heading,
              letterSpacing: '-0.02em',
            }}>
            {title}
          </h2>
          {badge && (
            <span
              style={{
                padding: '1px 7px',
                borderRadius: 999,
                fontSize: 10,
                fontFamily: C.mono,
                background: C.blue + '18',
                border: `1px solid ${C.blue}33`,
                color: C.blue,
              }}>
              {badge}
            </span>
          )}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: C.subtle,
            lineHeight: 1.55,
            fontFamily: C.sans,
          }}>
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function Box({
  w,
  h,
  children,
}: {
  w?: number | string;
  h?: number | string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        padding: 10,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        background: C.surface,
        flexShrink: 0,
      }}>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  unit = 'px',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 10,
            color: C.muted,
            fontFamily: C.mono,
            letterSpacing: '0.12em',
          }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: C.blue, fontFamily: C.mono }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type='range'
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: C.blue, cursor: 'pointer' }}
      />
    </div>
  );
}

function ActionButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 12,
        fontFamily: C.sans,
        border: `1px solid ${hov ? C.blue : C.border}`,
        background: hov ? C.blue + '18' : 'transparent',
        color: hov ? C.blue : C.subtle,
        transition: 'all 0.12s',
      }}>
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Reusable overflow slot patterns
// ═══════════════════════════════════════════════════════════════════════════════

// +N badge — static OverflowIndicator child that reads state via useOverflow()
function PlusNBadge() {
  const { hiddenCount } = useOverflow();
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 11,
        background: C.raised,
        border: `1px solid ${C.border}`,
        color: C.muted,
        fontFamily: C.mono,
        whiteSpace: 'nowrap',
      }}>
      +{hiddenCount}
    </span>
  );
}

// Dropdown that renders hidden items via the hiddenChildren render-function API
function DropdownMore({ hiddenCount, hiddenChildren }: OverflowInfo) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', fn);
    return () => document.removeEventListener('pointerdown', fn);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: '5px 10px',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          border: `1px solid ${open ? C.blue : C.border}`,
          background: open ? C.blue + '18' : C.raised,
          color: open ? C.blue : C.subtle,
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: C.sans,
        }}>
        +{hiddenCount}
        <svg width='8' height='8' viewBox='0 0 8 8' fill='none'>
          <path
            d={open ? 'M1 5.5l3-3 3 3' : 'M1 2.5l3 3 3-3'}
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
          />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            zIndex: 50,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 4,
            minWidth: 160,
            boxShadow: '0 16px 40px rgba(0,0,0,.6)',
          }}>
          {hiddenChildren.map((child, i) => (
            <div
              key={i}
              style={{ borderRadius: 4 }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = C.raised;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}>
              {child}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1 · Horizontal — nav bar with dropdown overflow + OverflowActions
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  'Dashboard',
  'Analytics',
  'Deployments',
  'Logs',
  'Settings',
  'Integrations',
  'Team',
  'Billing',
  'Security',
  'Audit',
];

function NavPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 13px',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 12,
        fontFamily: C.sans,
        border: active ? `1px solid ${C.blue}` : '1px solid transparent',
        background: active ? C.blue + '22' : hov ? C.raised : 'transparent',
        color: active ? '#93c5fd' : hov ? C.heading : C.subtle,
        transition: 'all 0.1s',
        whiteSpace: 'nowrap',
      }}>
      {label}
    </button>
  );
}

function NavCountBadge() {
  const { isOverflowing, hiddenCount } = useOverflow();
  if (!isOverflowing) return null;
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: 10,
        fontFamily: C.mono,
        background: C.amber + '18',
        border: `1px solid ${C.amber}33`,
        color: C.amber,
      }}>
      {hiddenCount} hidden
    </span>
  );
}

function Ex1() {
  const [active, setActive] = useState('Dashboard');
  const [w, setW] = useState(380);

  return (
    <Shell
      title='1 · Horizontal — nav bar + OverflowActions outside group'
      badge='registration'
      description='Outside-group placement: actions stay pinned at the edge and are not part of overflow packing. Choose this when actions should remain independent from item flow.'>
      <Box w={w} h={42}>
        <Overflow
          orientation='horizontal'
          style={{ height: '100%', alignItems: 'center', gap: '6px' }}>
          <OverflowAnnouncer />
          <OverflowGroup
            fill={false}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '100%',
            }}>
            {NAV_ITEMS.map((t) => (
              <OverflowItem key={t}>
                <NavPill label={t} active={active === t} onClick={() => setActive(t)} />
              </OverflowItem>
            ))}
            <OverflowIndicator>{(info) => <DropdownMore {...info} />}</OverflowIndicator>
          </OverflowGroup>
          <OverflowActions
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
            <NavCountBadge />
          </OverflowActions>
        </Overflow>
      </Box>
      <Slider label='WIDTH' value={w} min={120} max={680} onChange={setW} />
      <span style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>active: "{active}"</span>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2 · Horizontal — breadcrumb with static indicator children
// ═══════════════════════════════════════════════════════════════════════════════

const BREADCRUMBS = [
  'Home',
  'Projects',
  'Acme Corp',
  'Q1 2025',
  'Analytics',
  'Reports',
  'Revenue',
  'Monthly',
  'March',
  'Detail',
];

function Ex2() {
  const [w, setW] = useState(300);
  return (
    <Shell
      title='2 · Horizontal — breadcrumb, static OverflowIndicator children'
      badge='static children'
      description='OverflowIndicator with a static ReactNode (not a render function). useOverflow() inside it reads hiddenCount reactively.'>
      <Box w={w} h={36}>
        <Overflow orientation='horizontal' style={{ height: '100%', alignItems: 'center' }}>
          <OverflowGroup
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '100%',
            }}>
            {BREADCRUMBS.map((l, i) => (
              <OverflowItem
                key={l}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}>
                {i > 0 && (
                  <span style={{ color: C.muted, fontSize: 12, userSelect: 'none' }}>/</span>
                )}
                <span
                  style={{
                    fontSize: 12,
                    color: C.body,
                    whiteSpace: 'nowrap',
                    fontFamily: C.sans,
                  }}>
                  {l}
                </span>
              </OverflowItem>
            ))}
            <OverflowIndicator>
              <PlusNBadge />
            </OverflowIndicator>
          </OverflowGroup>
        </Overflow>
      </Box>
      <Slider label='WIDTH' value={w} min={100} max={680} onChange={setW} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 · Horizontal — avatar stack with keepMounted=false
// ═══════════════════════════════════════════════════════════════════════════════

const AVATARS = [
  { name: 'Alice', color: C.blue },
  { name: 'Bob', color: C.pink },
  { name: 'Carol', color: C.green },
  { name: 'David', color: C.amber },
  { name: 'Eva', color: C.purple },
  { name: 'Frank', color: C.red },
  { name: 'Grace', color: C.cyan },
  { name: 'Hector', color: C.lime },
];

function Ex3() {
  const [w, setW] = useState(160);
  return (
    <Shell
      title='3 · Horizontal — avatar stack, keepMounted=false'
      badge='keepMounted'
      description='keepMounted=false: hidden items are fully unmounted. Compare with keepMounted=true (default) where they stay in DOM with aria-hidden + tabIndex=-1.'>
      <Box w={w} h={44}>
        <Overflow orientation='horizontal' style={{ height: '100%', alignItems: 'center' }}>
          <OverflowGroup style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            {AVATARS.map(({ name, color }) => (
              <OverflowItem key={name} keepMounted={false}>
                <div
                  title={name}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: color + '28',
                    border: '2px solid #0d1117',
                    outline: `1.5px solid ${color}55`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    color,
                    fontWeight: 700,
                    fontFamily: C.sans,
                  }}>
                  {name[0]}
                </div>
              </OverflowItem>
            ))}
            <OverflowIndicator>
              {({ hiddenCount }) => (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: C.raised,
                    border: '2px solid #0d1117',
                    outline: `1.5px solid ${C.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: C.body,
                    fontWeight: 600,
                    fontFamily: C.sans,
                  }}>
                  +{hiddenCount}
                </div>
              )}
            </OverflowIndicator>
          </OverflowGroup>
        </Overflow>
      </Box>
      <Slider label='WIDTH' value={w} min={50} max={360} onChange={setW} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4 · Horizontal — toolbar with forceMount indicator + CSS fade
// ═══════════════════════════════════════════════════════════════════════════════

const TOOLS = [
  'Edit',
  'Cut',
  'Copy',
  'Paste',
  'Bold',
  'Italic',
  'Underline',
  'Link',
  'Image',
  'Table',
  'Code',
  'Quote',
];

function ToolButton({ label }: { label: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 10px',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 12,
        fontFamily: C.sans,
        border: `1px solid ${hov ? C.border : 'transparent'}`,
        background: hov ? C.raised : 'transparent',
        color: hov ? C.heading : C.subtle,
        transition: 'all 0.1s',
        whiteSpace: 'nowrap',
      }}>
      {label}
    </button>
  );
}

function Ex4() {
  const [w, setW] = useState(340);
  return (
    <Shell
      title='4 · Horizontal — toolbar, forceMount + CSS transition'
      badge='forceMount'
      description='OverflowIndicator forceMount=true: always in the DOM, data-visible toggles. Opacity transition driven purely by CSS — no JS animation.'>
      {/* BUG-7 fix: scoped style prevents bleeding into every OverflowIndicator on the page */}
      <style>{`
        #ex4-demo [data-slot="overflow-indicator"] { opacity: 0; transition: opacity 0.2s; pointer-events: none; }
        #ex4-demo [data-slot="overflow-indicator"][data-visible] { opacity: 1; pointer-events: auto; }
      `}</style>
      <div id='ex4-demo'>
        <Box w={w} h={40}>
          <Overflow orientation='horizontal' style={{ height: '100%', alignItems: 'center' }}>
            <OverflowGroup
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                height: '100%',
              }}>
              {TOOLS.map((label) => (
                <OverflowItem key={label}>
                  <ToolButton label={label} />
                </OverflowItem>
              ))}
              <OverflowIndicator forceMount>
                {({ hiddenCount }) => (
                  <button
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontFamily: C.mono,
                      border: `1px solid ${C.border}`,
                      background: C.raised,
                      color: C.muted,
                      letterSpacing: '0.1em',
                    }}>
                    +{hiddenCount} ···
                  </button>
                )}
              </OverflowIndicator>
            </OverflowGroup>
          </Overflow>
        </Box>
      </div>
      <Slider label='WIDTH' value={w} min={80} max={680} onChange={setW} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5 · Vertical — notification feed + OverflowActions with "View all"
// ═══════════════════════════════════════════════════════════════════════════════

const NOTIFS = [
  {
    icon: '🚀',
    text: 'Build deployed to production',
    time: 'just now',
    accent: C.blue,
  },
  {
    icon: '⚠️',
    text: 'Memory threshold exceeded on pod-2',
    time: '2m',
    accent: C.amber,
  },
  {
    icon: '✅',
    text: 'All health checks passing',
    time: '5m',
    accent: C.green,
  },
  { icon: '🔴', text: 'Database migration failed', time: '12m', accent: C.red },
  {
    icon: '👤',
    text: 'New signup: j.doe@example.com',
    time: '18m',
    accent: C.purple,
  },
  { icon: '🔑', text: 'API key rotated by admin', time: '34m', accent: C.pink },
  { icon: '📊', text: 'Weekly report ready', time: '1h', accent: C.cyan },
];

function ViewAllButton() {
  const { isOverflowing, hiddenCount } = useOverflow();
  if (!isOverflowing) return null;
  return <ActionButton>View {hiddenCount} more</ActionButton>;
}

function Ex5() {
  const [h, setH] = useState(180);
  return (
    <Shell
      title='5 · Vertical — notification feed + OverflowActions'
      badge='useOverflow'
      description='Inside-group placement: action space is reserved by overflow math, so indicator + actions stay in one coordinated flow. Use this when actions should hug the overflow UI.'>
      <Box w={320} h={h}>
        <Overflow
          orientation='vertical'
          style={{ flexDirection: 'column', height: '100%', gap: '6px' }}>
          <OverflowGroup
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              flex: 1,
              minHeight: 0,
            }}>
            {NOTIFS.map((n, i) => (
              <OverflowItem key={i}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 9,
                    padding: '7px 8px',
                    borderRadius: 6,
                    background: n.accent + '0b',
                    borderLeft: `2px solid ${n.accent}50`,
                    minHeight: 36,
                  }}>
                  <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1.45 }}>{n.icon}</span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: C.body,
                      lineHeight: 1.4,
                      fontFamily: C.sans,
                    }}>
                    {n.text}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: C.muted,
                      flexShrink: 0,
                      fontFamily: C.mono,
                    }}>
                    {n.time}
                  </span>
                </div>
              </OverflowItem>
            ))}
            <OverflowIndicator>
              {({ hiddenCount }) => (
                <button
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    border: `1px dashed ${C.border}`,
                    background: 'transparent',
                    color: C.muted,
                    fontSize: 12,
                    fontFamily: C.sans,
                    textAlign: 'left',
                  }}>
                  + {hiddenCount} more notification
                  {hiddenCount !== 1 ? 's' : ''}
                </button>
              )}
            </OverflowIndicator>
            <OverflowActions style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ViewAllButton />
            </OverflowActions>
          </OverflowGroup>
        </Overflow>
      </Box>
      <Slider label='HEIGHT' value={h} min={50} max={420} onChange={setH} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6 · Vertical — sidebar menu with render=<nav />
// ═══════════════════════════════════════════════════════════════════════════════

const MENU_ITEMS = [
  { icon: '▪', label: 'Dashboard' },
  { icon: '📈', label: 'Analytics' },
  { icon: '🗂', label: 'Projects' },
  { icon: '👥', label: 'Team' },
  { icon: '🔔', label: 'Notifications' },
  { icon: '📁', label: 'Documents' },
  { icon: '💬', label: 'Messages' },
  { icon: '⚙', label: 'Settings' },
  { icon: '🔑', label: 'API Keys' },
  { icon: '🧾', label: 'Billing' },
];

function MenuItem({ icon, label }: { icon: string; label: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 6,
        background: hov ? C.raised : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span
        style={{
          fontSize: 12,
          color: hov ? C.heading : C.body,
          fontFamily: C.sans,
        }}>
        {label}
      </span>
    </div>
  );
}

function Ex6() {
  const [h, setH] = useState(220);
  return (
    <Shell
      title='6 · Vertical — sidebar nav, render=&lt;nav /&gt;'
      badge='render prop'
      description="render={<nav />} on OverflowGroup swaps the root div for a semantic nav element via base-ui's render prop API. No layout changes needed.">
      <Box w={190} h={h}>
        <Overflow orientation='vertical' style={{ height: '100%' }}>
          <OverflowGroup
            render={<nav />}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              height: '100%',
            }}>
            {MENU_ITEMS.map((m) => (
              <OverflowItem key={m.label}>
                <MenuItem icon={m.icon} label={m.label} />
              </OverflowItem>
            ))}
            <OverflowIndicator>
              {({ hiddenCount }) => (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    color: C.muted,
                    fontSize: 11,
                    fontFamily: C.mono,
                    cursor: 'pointer',
                  }}>
                  <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                    <circle cx='6' cy='6' r='5' stroke='currentColor' strokeWidth='1.2' />
                    <path
                      d='M4 6h4M6 4v4'
                      stroke='currentColor'
                      strokeWidth='1.2'
                      strokeLinecap='round'
                    />
                  </svg>
                  {hiddenCount} more
                </div>
              )}
            </OverflowIndicator>
          </OverflowGroup>
        </Overflow>
      </Box>
      <Slider label='HEIGHT' value={h} min={60} max={440} onChange={setH} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7 · Wrap — tag cloud with interactive removes
// ═══════════════════════════════════════════════════════════════════════════════

const INIT_TAGS: [string, string][] = [
  ['TypeScript', C.blue],
  ['React', '#61dafb'],
  ['Next.js', C.heading],
  ['Node.js', C.lime],
  ['PostgreSQL', '#336791'],
  ['Redis', C.red],
  ['Docker', '#0ea5e9'],
  ['Kubernetes', C.blue],
  ['GraphQL', C.pink],
  ['tRPC', '#398ccb'],
  ['Drizzle', '#a3e635'],
  ['Prisma', '#818cf8'],
  ['Tailwind', '#38bdf8'],
  ['Vitest', '#86efac'],
];

function Ex7() {
  const [tags, setTags] = useState(INIT_TAGS);
  const [w, setW] = useState(360);
  const [h, setH] = useState(72);
  return (
    <Shell
      title='7 · Wrap — tag cloud, ResizeObserver auto-recalc'
      badge='wrap'
      description='Removing a tag triggers ResizeObserver on the container — previously hidden tags appear automatically. No manual recalculation needed.'>
      <Box w={w} h={h}>
        <Overflow orientation='wrap' style={{ height: '100%' }}>
          <OverflowGroup
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '5px',
              alignContent: 'flex-start',
              height: '100%',
            }}>
            {tags.map(([l, c]) => (
              <OverflowItem key={l}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 4px 3px 9px',
                    borderRadius: 999,
                    fontSize: 11,
                    background: c + '14',
                    border: `1px solid ${c}30`,
                    color: c,
                    fontFamily: C.mono,
                    whiteSpace: 'nowrap',
                  }}>
                  {l}
                  <button
                    onClick={() => setTags((p) => p.filter(([x]) => x !== l))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      padding: '1px 3px',
                      borderRadius: 3,
                      fontSize: 13,
                      lineHeight: 1,
                      opacity: 0.6,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = '0.6';
                    }}>
                    ×
                  </button>
                </span>
              </OverflowItem>
            ))}
            <OverflowIndicator>
              <PlusNBadge />
            </OverflowIndicator>
          </OverflowGroup>
        </Overflow>
      </Box>
      <Slider label='WIDTH' value={w} min={120} max={680} onChange={setW} />
      <Slider label='HEIGHT' value={h} min={28} max={160} onChange={setH} />
      <button
        onClick={() => setTags(INIT_TAGS)}
        style={{
          alignSelf: 'flex-start',
          padding: '4px 12px',
          borderRadius: 6,
          border: `1px solid ${C.border}`,
          background: 'transparent',
          color: C.subtle,
          fontSize: 11,
          cursor: 'pointer',
          fontFamily: C.mono,
        }}>
        reset tags
      </button>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8 · Wrap — member card grid + OverflowActions count badge
// ═══════════════════════════════════════════════════════════════════════════════

const MEMBERS = [
  { name: 'Alice Nguyen', role: 'Eng', color: C.blue },
  { name: 'Bob Park', role: 'Design', color: C.pink },
  { name: 'Carol Meyers', role: 'Eng', color: C.green },
  { name: 'David Lim', role: 'Product', color: C.amber },
  { name: 'Eva Santos', role: 'Eng', color: C.purple },
  { name: 'Frank Adeyemi', role: 'Data', color: C.red },
  { name: 'Grace Kowalski', role: 'Eng', color: C.cyan },
  { name: 'Hector Rosales', role: 'Design', color: C.lime },
  { name: 'Iris Tanaka', role: 'Product', color: '#f97316' },
  { name: "James O'Brien", role: 'Eng', color: '#a78bfa' },
];

function TeamCountActions() {
  const { isOverflowing, visibleCount, hiddenCount } = useOverflow();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontFamily: C.mono,
        color: C.muted,
      }}>
      <span>{visibleCount} shown</span>
      {isOverflowing && <span style={{ color: C.amber }}>{hiddenCount} hidden</span>}
    </div>
  );
}

function Ex8() {
  const [w, setW] = useState(360);
  const [h, setH] = useState(200);
  return (
    <Shell
      title='8 · Wrap — member cards + OverflowActions live count'
      badge='useOverflow + OverflowActions'
      description='OverflowActions renders a live count of visible/hidden members. Both values update reactively via useOverflow() as you resize.'>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            width: w,
            flexShrink: 0,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            background: C.surface,
            padding: 10,
            transition: 'width 0.06s',
          }}>
          <Overflow orientation='wrap' style={{ flexDirection: 'column', gap: '8px', height: h }}>
            <OverflowGroup
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignContent: 'flex-start',
                height: '100%',
              }}>
              {MEMBERS.map(({ name, role, color }) => (
                <OverflowItem key={name}>
                  <div
                    style={{
                      width: 76,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 5,
                      padding: '9px 5px',
                      borderRadius: 8,
                      background: color + '0a',
                      border: `1px solid ${color}22`,
                    }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: color + '20',
                        border: `2px solid ${color}44`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        color,
                        fontWeight: 700,
                        fontFamily: C.sans,
                      }}>
                      {name[0]}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: 10,
                          color: C.body,
                          fontFamily: C.sans,
                          lineHeight: 1.3,
                        }}>
                        {name.split(' ')[0]}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: C.muted,
                          fontFamily: C.sans,
                        }}>
                        {role}
                      </div>
                    </div>
                  </div>
                </OverflowItem>
              ))}
              <OverflowIndicator>
                {({ hiddenCount }) => (
                  <div
                    style={{
                      width: 76,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '9px 5px',
                      borderRadius: 8,
                      background: C.raised,
                      border: `1px dashed ${C.border}`,
                      minHeight: 80,
                    }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: C.border,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        color: C.muted,
                        fontWeight: 700,
                        fontFamily: C.sans,
                      }}>
                      +{hiddenCount}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: C.muted,
                        fontFamily: C.sans,
                      }}>
                      more
                    </div>
                  </div>
                )}
              </OverflowIndicator>
              <OverflowActions
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 4,
                }}>
                <TeamCountActions />
                <ActionButton>Manage team</ActionButton>
              </OverflowActions>
            </OverflowGroup>
          </Overflow>
        </div>
        <Slider label='WIDTH' value={w} min={100} max={680} onChange={setW} />
        <Slider label='HEIGHT' value={h} min={80} max={400} onChange={setH} />
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9 · Grid — auto-fit / minmax (the motivating use-case)
// ═══════════════════════════════════════════════════════════════════════════════

const PROJECTS = [
  {
    name: 'Pulse Analytics',
    status: 'live',
    color: C.green,
    updated: '2m ago',
  },
  {
    name: 'Admin Dashboard',
    status: 'building',
    color: C.blue,
    updated: '18m ago',
  },
  { name: 'Auth Service', status: 'live', color: C.green, updated: '1h ago' },
  {
    name: 'Data Pipeline',
    status: 'paused',
    color: C.amber,
    updated: '3h ago',
  },
  { name: 'Mobile API', status: 'live', color: C.green, updated: '5h ago' },
  {
    name: 'Design System',
    status: 'building',
    color: C.blue,
    updated: '1d ago',
  },
  {
    name: 'Billing Service',
    status: 'live',
    color: C.green,
    updated: '2d ago',
  },
  { name: 'Search Index', status: 'error', color: C.red, updated: '2d ago' },
  {
    name: 'Notification Hub',
    status: 'paused',
    color: C.amber,
    updated: '3d ago',
  },
  {
    name: 'CMS Integration',
    status: 'building',
    color: C.blue,
    updated: '4d ago',
  },
];

const STATUS_ICON: Record<string, string> = {
  live: '●',
  building: '◌',
  paused: '◫',
  error: '✕',
};

function GridCountActions() {
  const { isOverflowing, hiddenCount } = useOverflow();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {isOverflowing && (
        <span style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
          {hiddenCount} project{hiddenCount !== 1 ? 's' : ''} not shown
        </span>
      )}
      <ActionButton>All projects</ActionButton>
    </div>
  );
}

function Ex9() {
  const [w, setW] = useState(580);
  const [h, setH] = useState(220);
  const [min, setMin] = useState(200);

  return (
    <Shell
      title='9 · Grid — auto-fit / minmax, OverflowActions below'
      badge='grid + registration'
      description='orientation="grid" + h-full. Items register their own refs — no clones, no grid wrapper issues. OverflowActions is inside OverflowGroup and spans the full row with a live count.'>
      <div
        style={{
          width: w,
          height: h,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          background: C.surface,
          padding: 10,
          transition: 'width 0.06s',
          flexShrink: 0,
        }}
        className='overflow-hidden'>
        <Overflow
          orientation='grid'
          style={{ flexDirection: 'column', gap: '8px', height: '100%' }}>
          <OverflowAnnouncer />
          <OverflowGroup
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
              gap: '12px',
              alignContent: 'start',
            }}>
            {PROJECTS.map(({ name, status, color, updated }) => (
              <OverflowItem key={name}>
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 8,
                    background: C.raised,
                    border: `1px solid ${C.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.heading,
                        fontFamily: C.sans,
                        lineHeight: 1.3,
                      }}>
                      {name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color,
                        fontFamily: C.mono,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        padding: '2px 7px',
                        borderRadius: 999,
                        background: color + '14',
                        border: `1px solid ${color}30`,
                      }}>
                      {STATUS_ICON[status]} {status}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: C.muted, fontFamily: C.mono }}>
                    updated {updated}
                  </span>
                </div>
              </OverflowItem>
            ))}
            <OverflowIndicator>
              {({ hiddenCount }) => (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: `1px dashed ${C.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minHeight: 80,
                    cursor: 'pointer',
                  }}>
                  <span style={{ fontSize: 20, color: C.muted }}>⊕</span>
                  <span style={{ fontSize: 12, color: C.muted, fontFamily: C.sans }}>
                    {hiddenCount} more project{hiddenCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </OverflowIndicator>
            <OverflowActions
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <GridCountActions />
            </OverflowActions>
          </OverflowGroup>
        </Overflow>
      </div>
      <Slider label='CONTAINER WIDTH' value={w} min={200} max={800} onChange={setW} />
      <Slider label='CONTAINER HEIGHT' value={h} min={80} max={500} onChange={setH} />
      <Slider label='MIN COLUMN (minmax)' value={min} min={100} max={320} onChange={setMin} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10 · Grid — fixed columns + metric cards
// ═══════════════════════════════════════════════════════════════════════════════

const METRICS = [
  {
    label: 'Total Requests',
    value: '2.4M',
    delta: '+12%',
    up: true,
    color: C.blue,
  },
  {
    label: 'Error Rate',
    value: '0.08%',
    delta: '-0.02%',
    up: true,
    color: C.green,
  },
  {
    label: 'P95 Latency',
    value: '142ms',
    delta: '+8ms',
    up: false,
    color: C.amber,
  },
  {
    label: 'Active Users',
    value: '8,291',
    delta: '+341',
    up: true,
    color: C.cyan,
  },
  {
    label: 'DB Query Time',
    value: '23ms',
    delta: '-4ms',
    up: true,
    color: C.green,
  },
  {
    label: 'Cache Hit Rate',
    value: '94.2%',
    delta: '+1.1%',
    up: true,
    color: C.lime,
  },
  {
    label: 'Ingested Events',
    value: '184K',
    delta: '+22K',
    up: true,
    color: C.purple,
  },
  { label: 'Failed Jobs', value: '3', delta: '+3', up: false, color: C.red },
];

function Ex10() {
  const [cols, setCols] = useState(3);
  const [h, setH] = useState(210);

  return (
    <Shell
      title='10 · Grid — fixed column count (2 / 3 / 4 cols)'
      badge='grid'
      description='Explicit repeat(N, 1fr). Column-index arithmetic in the measurement engine keeps the overflow slot on the same row as the last visible item.'>
      <div
        style={{
          width: 660,
          height: h,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          background: C.surface,
          padding: 10,
          flexShrink: 0,
        }}
        className='overflow-hidden'>
        <Overflow
          orientation='grid'
          style={{ flexDirection: 'column', gap: '8px', height: '100%' }}>
          <OverflowGroup
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: '10px',
              alignContent: 'start',
            }}>
            {METRICS.map(({ label, value, delta, up, color }) => (
              <OverflowItem key={label}>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: C.raised,
                    border: `1px solid ${C.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}>
                  <span
                    style={{
                      fontSize: 10,
                      color: C.muted,
                      fontFamily: C.mono,
                      letterSpacing: '0.08em',
                    }}>
                    {label.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color,
                      fontFamily: C.mono,
                      lineHeight: 1,
                    }}>
                    {value}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: up ? C.green : C.red,
                      fontFamily: C.mono,
                    }}>
                    {up ? '↑' : '↓'} {delta}
                  </span>
                </div>
              </OverflowItem>
            ))}
            <OverflowIndicator>
              {({ hiddenCount }) => (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: `1px dashed ${C.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    minHeight: 88,
                  }}>
                  <span style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
                    +{hiddenCount} more
                  </span>
                </div>
              )}
            </OverflowIndicator>
            <OverflowActions
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                gap: '6px',
                justifyContent: 'flex-end',
              }}>
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setCols(n)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: C.mono,
                    border: `1px solid ${cols === n ? C.blue : C.border}`,
                    background: cols === n ? C.blue + '22' : 'transparent',
                    color: cols === n ? '#93c5fd' : C.subtle,
                    transition: 'all 0.1s',
                  }}>
                  {n} cols
                </button>
              ))}
            </OverflowActions>
          </OverflowGroup>
        </Overflow>
      </div>
      <Slider label='CONTAINER HEIGHT' value={h} min={80} max={500} onChange={setH} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11 · useOverflowItem — per-item animation via isHidden
// ═══════════════════════════════════════════════════════════════════════════════

function AnimatedPill({ label, color }: { label: string; color: string }) {
  const { isHidden } = useOverflowItem();
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 11,
        background: color + '14',
        border: `1px solid ${color}30`,
        color,
        whiteSpace: 'nowrap',
        fontFamily: C.mono,
        opacity: isHidden ? 0 : 1,
        transform: isHidden ? 'scale(0.8)' : 'scale(1)',
        transition: 'opacity 0.15s, transform 0.15s',
      }}>
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

const SKILL_TAGS: [string, string][] = [
  ['TypeScript', C.blue],
  ['React', '#61dafb'],
  ['Next.js', C.heading],
  ['Tailwind', '#38bdf8'],
  ['Drizzle', '#a3e635'],
  ['tRPC', '#398ccb'],
  ['Vitest', '#86efac'],
  ['Prisma', '#818cf8'],
  ['Playwright', '#2dd4bf'],
];

function Ex11() {
  const [w, setW] = useState(320);
  const [h, setH] = useState(60);

  return (
    <Shell
      title='11 · useOverflowItem — per-item opacity transition'
      badge='useOverflowItem'
      description='AnimatedPill calls useOverflowItem() to read isHidden directly. Items scale down before they disappear — driven by inline style, no extra CSS needed.'>
      <Box w={w} h={h}>
        <Overflow orientation='wrap' style={{ height: '100%' }}>
          <OverflowGroup
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '5px',
              alignContent: 'flex-start',
              height: '100%',
            }}>
            {SKILL_TAGS.map(([label, color]) => (
              <OverflowItem key={label}>
                <AnimatedPill label={label} color={color} />
              </OverflowItem>
            ))}
            <OverflowIndicator>
              <PlusNBadge />
            </OverflowIndicator>
          </OverflowGroup>
        </Overflow>
      </Box>
      <Slider label='WIDTH' value={w} min={120} max={680} onChange={setW} />
      <Slider label='HEIGHT' value={h} min={28} max={160} onChange={setH} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12 · onOverflowChange callback + defaultVisibleCount SSR hint
// ═══════════════════════════════════════════════════════════════════════════════

function Ex12() {
  const [w, setW] = useState(380);
  const [log, setLog] = useState<string[]>([]);

  const handleChange = useCallback((isOverflowing: boolean) => {
    setLog((prev) =>
      [
        `${new Date().toLocaleTimeString()}: ${isOverflowing ? 'overflowing' : 'not overflowing'}`,
        ...prev,
      ].slice(0, 4),
    );
  }, []);

  return (
    <Shell
      title='12 · onOverflowChange + defaultVisibleCount'
      badge='callbacks + SSR'
      description='onOverflowChange fires only when isOverflowing transitions. defaultVisibleCount=5 pre-populates the store for SSR — the first server render shows 5 items instead of a flash of all items.'>
      <Box w={w} h={40}>
        <Overflow
          orientation='horizontal'
          onOverflowChange={handleChange}
          defaultVisibleCount={5}
          style={{ height: '100%', alignItems: 'center' }}>
          <OverflowGroup
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '100%',
            }}>
            {NAV_ITEMS.map((t) => (
              <OverflowItem key={t}>
                <span
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: C.sans,
                    background: C.raised,
                    border: `1px solid ${C.border}`,
                    color: C.body,
                    whiteSpace: 'nowrap',
                  }}>
                  {t}
                </span>
              </OverflowItem>
            ))}
            <OverflowIndicator>
              <PlusNBadge />
            </OverflowIndicator>
          </OverflowGroup>
        </Overflow>
      </Box>
      <Slider label='WIDTH' value={w} min={120} max={680} onChange={setW} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {log.length === 0 ? (
          <span style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
            drag the slider to trigger onOverflowChange
          </span>
        ) : (
          log.map((entry, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                color: i === 0 ? C.blue : C.muted,
                fontFamily: C.mono,
              }}>
              {entry}
            </span>
          ))
        )}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13 · OverflowSeparator — auto-hiding dividers between groups
// ═══════════════════════════════════════════════════════════════════════════════

const TOOLBAR_GROUPS = [
  [
    { label: 'Bold', icon: 'B' },
    { label: 'Italic', icon: 'I' },
  ],
  [
    { label: 'Underline', icon: 'U' },
    { label: 'Link', icon: '⌘K' },
  ],
  [
    { label: 'Image', icon: '⌘I' },
    { label: 'Code Block', icon: '<>' },
  ],
  [
    { label: 'Quote', icon: '"' },
    { label: 'Bullet List', icon: '≡' },
    { label: 'Numbered', icon: '1.' },
  ],
];

function ToolbarBtn({ icon, label }: { icon: string; label: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 5,
        border: 'none',
        cursor: 'pointer',
        background: hov ? C.raised : 'transparent',
        color: hov ? C.heading : C.body,
        fontSize: icon.length > 1 ? 10 : 13,
        fontFamily: C.mono,
        transition: 'all 0.1s',
      }}>
      {icon}
    </button>
  );
}

function Ex13() {
  const [w, setW] = useState(340);

  return (
    <Shell
      title='13 · OverflowSeparator — auto-hiding dividers'
      badge='OverflowSeparator'
      description='Separators register as isSeparator=true. The measurement engine trims any separator that would land as the last visible item — no dangling dividers even as the toolbar shrinks.'>
      <Box w={w} h={46}>
        <Overflow orientation='horizontal' style={{ height: '100%', alignItems: 'center' }}>
          <OverflowGroup
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              height: '100%',
              padding: '0 4px',
            }}>
            {TOOLBAR_GROUPS.map((group, gi) => (
              <React.Fragment key={gi}>
                {gi > 0 && <OverflowSeparator style={{ margin: '0 3px', height: 20 }} />}
                {group.map(({ icon, label }) => (
                  <OverflowItem key={label}>
                    <ToolbarBtn icon={icon} label={label} />
                  </OverflowItem>
                ))}
              </React.Fragment>
            ))}
            <OverflowSeparator style={{ margin: '0 3px', height: 20 }} />
            <OverflowIndicator>
              <PlusNBadge />
            </OverflowIndicator>
          </OverflowGroup>
        </Overflow>
      </Box>
      <Slider label='WIDTH' value={w} min={80} max={680} onChange={setW} />
      <span style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
        drag left — separators auto-hide so the toolbar never ends with a divider
      </span>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════════

interface Section {
  label: string;
  color: string;
  examples: (() => React.JSX.Element)[];
}

const SECTIONS: Section[] = [
  { label: 'HORIZONTAL', color: C.blue, examples: [Ex1, Ex2, Ex3, Ex4] },
  { label: 'VERTICAL', color: C.green, examples: [Ex5, Ex6] },
  { label: 'WRAP', color: C.amber, examples: [Ex7, Ex8] },
  { label: 'GRID', color: '#a78bfa', examples: [Ex9, Ex10] },
  { label: 'FEATURES', color: C.cyan, examples: [Ex11, Ex12, Ex13] },
];

export default function OverflowContainerExamples() {
  const [active, setActive] = useState<string | null>(null);
  const visible = active ? SECTIONS.filter((s) => s.label === active) : SECTIONS;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.heading,
        fontFamily: C.sans,
      }}>
      {/* sticky header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: C.bg + 'ee',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.dim}`,
          padding: '12px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
        <div>
          <span
            style={{
              fontSize: 10,
              color: C.muted,
              fontFamily: C.mono,
              letterSpacing: '0.15em',
            }}>
            OVERFLOW
          </span>
          <span
            style={{
              fontSize: 12,
              color: C.subtle,
              marginLeft: 12,
              fontFamily: C.mono,
            }}>
            13 examples · v3
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(
            [['ALL', null], ...SECTIONS.map((s) => [s.label, s.label])] as [string, string | null][]
          ).map(([label, val]) => {
            const sec = SECTIONS.find((s) => s.label === val);
            const isOn = active === val;
            return (
              <button
                key={label}
                onClick={() => setActive(val)}
                style={{
                  padding: '4px 11px',
                  borderRadius: 5,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: C.mono,
                  transition: 'all 0.1s',
                  background: isOn ? (sec ? sec.color + '20' : C.raised) : 'transparent',
                  color: isOn ? (sec ? sec.color : C.heading) : C.muted,
                }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* content */}
      <div
        style={{
          maxWidth: 860,
          margin: '0 auto',
          padding: '36px 28px 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 48,
        }}>
        {visible.map(({ label, color, examples }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 3,
                  height: 16,
                  background: color,
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color,
                  fontFamily: C.mono,
                  letterSpacing: '0.18em',
                }}>
                {label}
              </span>
              <div style={{ flex: 1, height: 1, background: C.dim }} />
            </div>
            {examples.map((Ex, i) => (
              <div
                key={i}
                style={{
                  padding: '20px 24px',
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                }}>
                <Ex />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
