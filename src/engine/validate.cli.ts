/* 剧本校验 CLI：npm run check:script（构建前置步骤）。 */
import { validateScript } from './validate';

const { errors, warnings, stats } = validateScript();

console.log(`角色 ${stats.chars}　·　节点 ${stats.nodes}（可达 ${stats.reachable}）　·　结局 ${stats.endings}　·　GE 槽位 ${stats.geSlots}　·　可攻略线 ${stats.routes}`);

if (warnings.length) {
  console.log('\n⚠ 警告');
  warnings.forEach(w => console.log('  · ' + w));
}

if (errors.length) {
  console.log(`\n✗ 剧本校验失败（${errors.length} 条）`);
  errors.forEach(e => console.log('  · ' + e));
  process.exit(1);
}

console.log('\n✓ 剧本校验通过：跳转、引用与角色线可达性均正常。');