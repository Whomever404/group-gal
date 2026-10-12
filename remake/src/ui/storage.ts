import type { Session } from '../engine/types';
import { migrateSave, serializeSession } from '../engine/persist';
import { SCRIPT } from '../content/chapters';

/**
 * 本地存档仓储——**全项目唯一允许碰 localStorage 的地方**。
 * `src/engine/` 保持零 DOM，序列化与校验在 engine/persist.ts，这里只负责读写与降级。
 *
 * 所有访问都包了 try/catch：隐私模式、配额超限、被策略禁用时
 * `localStorage` 会直接抛错，游戏不得因此崩掉——最差情况就是「存不了」。
 */

export type SaveSlotId = 'auto' | 's1' | 's2' | 's3';

/** 3 个手动槽。自动存档单独一个 id。 */
export const SAVE_SLOTS = ['s1', 's2', 's3'] as const;
export const AUTOSAVE_ID = 'auto';

const ALL_SLOTS: readonly SaveSlotId[] = [AUTOSAVE_ID, ...SAVE_SLOTS];

const PREFIX = 'group-gal/';
const slotKey = (id: SaveSlotId): string => `${PREFIX}save/${id}`;
export const SETTINGS_KEY = `${PREFIX}settings`;

export interface SlotInfo {
  readonly id: SaveSlotId;
  readonly empty: boolean;
  readonly savedAt: number | null;
  readonly ip: number | null;
  readonly water: number | null;
}

export type TextSpeed = 'slow' | 'normal' | 'fast';

export interface SettingsData {
  readonly bgm: boolean;
  readonly speed: TextSpeed;
}

export const DEFAULT_SETTINGS: SettingsData = { bgm: true, speed: 'normal' };

/* ---------- 安全的存储访问 ---------- */

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

function safeRemove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* 删不掉就算了 */ }
}

/* ---------- 存档槽 ---------- */

/** 读出并校验。任何畸形（含手改、半截写入）一律 null。 */
export function readSlot(id: SaveSlotId): Session | null {
  const raw = safeGet(slotKey(id));
  if (raw === null) return null;

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }

  return migrateSave(parsed, SCRIPT.length);
}

export function writeSlot(id: SaveSlotId, s: Session): boolean {
  // savedAt 是元数据，persist 的反序列化会忽略未知字段
  const payload = { ...(JSON.parse(serializeSession(s)) as Record<string, unknown>), savedAt: Date.now() };
  return safeSet(slotKey(id), JSON.stringify(payload));
}

export function deleteSlot(id: SaveSlotId): void {
  safeRemove(slotKey(id));
}

export function listSlots(): SlotInfo[] {
  return ALL_SLOTS.map(id => {
    const session = readSlot(id);
    if (!session) return { id, empty: true, savedAt: null, ip: null, water: null };

    let savedAt: number | null = null;
    const raw = safeGet(slotKey(id));
    if (raw !== null) {
      try {
        const meta = JSON.parse(raw) as { savedAt?: unknown };
        if (typeof meta.savedAt === 'number' && Number.isFinite(meta.savedAt)) savedAt = meta.savedAt;
      } catch { /* 元数据读不出不影响主体 */ }
    }

    return { id, empty: false, savedAt, ip: session.ip, water: session.state.water };
  });
}

/* ---------- 设置 ---------- */

/** 逐项校验并回落——单个字段坏了不该丢掉其它字段。 */
export function readSettings(): SettingsData {
  const raw = safeGet(SETTINGS_KEY);
  if (raw === null) return { ...DEFAULT_SETTINGS };

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { ...DEFAULT_SETTINGS }; }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ...DEFAULT_SETTINGS };
  }

  const p = parsed as Record<string, unknown>;
  return {
    bgm: typeof p.bgm === 'boolean' ? p.bgm : DEFAULT_SETTINGS.bgm,
    speed: p.speed === 'slow' || p.speed === 'normal' || p.speed === 'fast'
      ? p.speed
      : DEFAULT_SETTINGS.speed,
  };
}

export function writeSettings(patch: Partial<SettingsData>): void {
  safeSet(SETTINGS_KEY, JSON.stringify({ ...readSettings(), ...patch }));
}
