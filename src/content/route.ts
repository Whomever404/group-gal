/* 分岔优先序与各角色线的入口节点。 */
import type { CharKey } from '../engine/types';

export const PRIORITY: readonly CharKey[] = ["nanao","yu","cat","g","shisuan","tttt","shei","shiban","taffy","c30586","mianbao","mibu","linxi","gen","aka"];

export const ROUTE_START: Record<string, string> = {nanao:"r_nao1",yu:"r_yu1",cat:"r_cat1",g:"r_g1",shisuan:"r_ss1",
  tttt:"r_t1",shei:"r_shei1",shiban:"r_ban1",taffy:"r_taf1",c30586:"r_3051",
  mianbao:"r_bread1",mibu:"r_mibu1",linxi:"r_lin1",gen:"r_gen1",aka:"r_aka1"};
