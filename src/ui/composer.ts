import type { ChoiceOption, HubOption } from '../engine/types';

/**
 * 选项区 —— 外观是 QQ 的输入条，承载的却是选项。
 *
 * 结构：候选面板（从输入框上方「弹出」的选项）＋ 输入条（左表情位 / 圆角输入条 / 右发送位，
 * 纯装饰）。提示语作为输入条里的「草稿」显示，不用网页按钮列表。
 *
 * 与重做前一致的行为：渲染前清空上一次；被选中的按钮立刻切回等待态再 resolve，
 * 因此索引与引擎侧天然一致；按钮文字用 textContent 设置，不解析 HTML。
 */
export interface Composer {
  /** 渲染选项，返回被选中项的下标 */
  askChoice(prompt: string, options: readonly ChoiceOption[]): Promise<number>;
  /** 渲染枢纽选项（已由引擎过滤掉已触发的 once 项） */
  askHub(prompt: string, options: readonly HubOption[]): Promise<number>;
  /** 渲染等待态 */
  idle(): void;
}

/** 输入条：纯外观。左右图标位与发送位都是装饰性的，不是可点控件。
 *  NTQQ 的工具栏图标多一些，多出来的两个只在宽屏显示（.wide-only）。 */
function buildBar(field: HTMLElement): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'c-bar';

  const icon = (cls: string, glyph: string): HTMLElement => {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = glyph;
    s.setAttribute('aria-hidden', 'true');
    return s;
  };

  bar.append(
    icon('c-ic', '😀'),
    icon('c-ic wide-only', '🖼'),
    icon('c-ic wide-only', '📎'),
    field,
    icon('c-send', '↑'),
  );
  return bar;
}

function buildField(text: string, cls: string): HTMLElement {
  const field = document.createElement('div');
  field.className = 'c-field';
  const span = document.createElement('span');
  span.className = cls;
  span.textContent = text;
  field.appendChild(span);
  return field;
}

export function createComposer(host: HTMLElement): Composer {
  const idle = (): void => {
    host.innerHTML = '';
    host.appendChild(buildBar(buildField('……', 'c-idle')));
  };

  function render(
    prompt: string,
    entries: readonly { label: string; pick: () => void }[],
  ): void {
    host.innerHTML = '';

    const cands = document.createElement('div');
    cands.className = 'c-cands';
    for (const e of entries) {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = e.label;
      b.onclick = () => { idle(); e.pick(); };
      cands.appendChild(b);
    }

    host.append(cands, buildBar(buildField(prompt, 'c-prompt')));
  }

  function ask<T extends { label: string }>(
    prompt: string,
    options: readonly T[],
  ): Promise<number> {
    return new Promise(resolve => {
      render(prompt, options.map((o, i) => ({ label: o.label, pick: () => resolve(i) })));
    });
  }

  return {
    idle,
    askChoice: (prompt, options) => ask(prompt, options),
    askHub: (prompt, options) => ask(prompt, options),
  };
}
