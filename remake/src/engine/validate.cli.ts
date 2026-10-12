/**
 * 剧本校验 CLI。由 `npm run check:script` 调用，也是 `npm run build` 的前置步骤：
 * 剧本写坏则构建失败，而不是等玩家踩到。
 */
import { formatIssues, validateScript } from './validate';
import { CHARS, HERO_KEYS } from '../content/characters';
import { BEDATA, GE_SLOTS } from '../content/endings';
import { LABELS, SCRIPT } from '../content';

const issues = validateScript(SCRIPT, CHARS, BEDATA);
const errors = issues.filter(i => i.level === 'error');
const warns = issues.filter(i => i.level === 'warn');

if (issues.length > 0) console.log(formatIssues(issues));

if (errors.length > 0) {
  console.error(`\n剧本校验失败：${errors.length} 个错误，${warns.length} 个警告`);
  process.exit(1);
}

console.log(
  `角色 ${Object.keys(CHARS).length}（可攻略 ${HERO_KEYS.length}）　·　` +
  `节点 ${SCRIPT.length}（label ${Object.keys(LABELS).length}）　·　` +
  `坏结局 ${Object.keys(BEDATA).length}　·　角色线 ${GE_SLOTS.length}`,
);
console.log(`剧本校验通过：${SCRIPT.length} 个节点，${warns.length} 个警告`);
