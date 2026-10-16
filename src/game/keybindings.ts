/** Atalhos de teclado remapeáveis (NADAR e RESPIRAR). */

export type Action = 'swim' | 'breathe';
export type Bindings = Record<Action, string[]>;

export const DEFAULT_BINDINGS: Bindings = {
  swim: ['Space'],
  breathe: ['ControlLeft', 'ControlRight', 'ArrowUp'],
};

/** Teclas reservadas para outras funções (pausa) — não podem ser usadas. */
export const RESERVED_KEYS = ['Escape', 'KeyP', 'Tab', 'F5', 'MetaLeft', 'MetaRight'];

export const ACTION_LABEL: Record<Action, string> = { swim: 'NADAR', breathe: 'RESPIRAR' };

const NAMES: Record<string, string> = {
  Space: 'ESPAÇO',
  ControlLeft: 'CTRL',
  ControlRight: 'CTRL DIR.',
  ShiftLeft: 'SHIFT',
  ShiftRight: 'SHIFT DIR.',
  AltLeft: 'ALT',
  AltRight: 'ALT GR',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Enter: 'ENTER',
  NumpadEnter: 'ENTER (NUM)',
  Backspace: 'BACKSPACE',
  CapsLock: 'CAPS LOCK',
};

export function keyLabel(code: string): string {
  if (NAMES[code]) return NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6)}`;
  return code.toUpperCase();
}

/** Rótulo curto de uma ação: "CTRL / ↑". Ctrl esquerdo e direito aparecem como um só. */
export function bindingLabel(codes: string[]): string {
  const labels = codes.map(keyLabel).map((l) => (l === 'CTRL DIR.' ? 'CTRL' : l));
  return Array.from(new Set(labels)).join(' / ');
}

export function actionFor(code: string, b: Bindings): Action | null {
  if (b.swim.includes(code)) return 'swim';
  if (b.breathe.includes(code)) return 'breathe';
  return null;
}

/** Valida uma nova tecla. Retorna a mensagem de erro, ou null se puder usar. */
export function validateKey(action: Action, code: string, b: Bindings): string | null {
  if (RESERVED_KEYS.includes(code)) return 'Essa tecla é reservada (pausa/sistema). Escolha outra.';
  const other: Action = action === 'swim' ? 'breathe' : 'swim';
  if (b[other].includes(code)) return `Essa tecla já é usada para ${ACTION_LABEL[other]}. NADAR e RESPIRAR precisam de teclas diferentes.`;
  return null;
}

/** Ctrl esquerdo e direito andam juntos para facilitar. */
export function expandCode(code: string): string[] {
  if (code === 'ControlLeft' || code === 'ControlRight') return ['ControlLeft', 'ControlRight'];
  if (code === 'ShiftLeft' || code === 'ShiftRight') return ['ShiftLeft', 'ShiftRight'];
  return [code];
}

const KEY = 'dfm-bindings-v1';

export function loadBindings(): Bindings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_BINDINGS;
    const b = JSON.parse(raw) as Bindings;
    if (!Array.isArray(b.swim) || !Array.isArray(b.breathe) || !b.swim.length || !b.breathe.length) return DEFAULT_BINDINGS;
    if (b.swim.some((c) => b.breathe.includes(c))) return DEFAULT_BINDINGS;
    return b;
  } catch {
    return DEFAULT_BINDINGS;
  }
}

export function saveBindings(b: Bindings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* modo privado: fica só na memória */
  }
}
