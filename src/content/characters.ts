/* 角色元数据与立绘配件 —— 自 v2 单文件抽取，键名沿用 v0.2。 */
import type { Character } from '../engine/types';

export const CH: Record<string, Character> = {
  nanao  :{n:"闹七", e:"👑", c:"#ff6ec7", h:"crown",   sub:"Null7323 · 群主 / 服主 / 音游皇帝"},
  yu     :{n:"一条鱼", e:"🐟", c:"#5ce1e6", h:"fish",  sub:"别问她为什么叫鱼 · 机械动力"},
  cat    :{n:"黄油猫", e:"🐱", c:"#ffd76e", h:"cat",   sub:"黄油猫是我妈妈，· 医学系守门猫"},
  g      :{n:"G", e:"🅶", c:"#a06bff", h:"star",       sub:"Lriltu · 反骨管理员"},
  shisuan:{n:"石蒜", e:"🧄", c:"#8be08b", h:"garlic",  sub:"信这个不如信我是男娘"},
  tttt   :{n:"Tttt", e:"🎭", c:"#ff9f6e", h:"mask",    sub:"起外号专家 · 面包是我的"},
  shei   :{n:"誰", e:"🥚", c:"#cfcfe8", h:"egg",       sub:"又名蛋蛋 · 群gal攻略中"},
  shiban :{n:"石斑鱼", e:"🐠", c:"#7fe0c0", h:"fin",   sub:"🪨🦓🐟 · 循环《冷漠群友不请我吃肯德基》"},
  taffy  :{n:"taffy", e:"🧦", c:"#ffb3d9", h:"bucket", sub:"看我落地水！"},
  c30586 :{n:"30586", e:"🍗", c:"#ffcf6e", h:"moon",   sub:"何时mc · 不来我人没了"},
  mianbao:{n:"面包", e:"🥖", c:"#f0c98a", h:"bread",  sub:"高冷发图人 · 拍框大王"},
  mibu   :{n:"咪猫布", e:"💊", c:"#7ad0c0", h:"pill",  sub:"医学系 · 一百三十斤的大飞猪"},
  linxi  :{n:"凛～～熙", e:"📈", c:"#9fc8ff", h:"chart",sub:"我是努力b！· 成绩图轰炸机"},
  gen    :{n:"根哥", e:"🧑‍🔧", c:"#7fb0ff", h:"wrench",sub:"Unity 实训开发 · 不是爸爸"},
  aka    :{n:"aka", e:"📉", c:"#9ad0ff", h:"wave",    sub:"token 情报商 · 降智预警"},
  moku   :{n:"蘑菇汤", e:"🍄", c:"#ff5a78", h:"mushroom",sub:"藤原氏 · 群规挑战者"},
  you    :{n:"我", e:"🙂", c:"#7d8fa8", h:"dot",       sub:"第 81 位群友"}
};

/* 半透明纯色剪影立绘：身体沿用宽版剪影，头部配件沿用 v0.2 的「角色专属小配件」。 */
const BODY = '<path d="M52 560 C52 432 96 372 150 372 C204 372 248 432 248 560 Z"/>'+
             '<path d="M134 330 L134 374 C134 386 166 386 166 374 L166 330 Z"/>'+
             '<circle cx="150" cy="292" r="52"/>';

/* 配件坐标系沿用 v0.2 的 100×100 头部框，整体放大 3 倍后下移 178。 */
export const ACC: Record<string, string> = {
  crown:'<path d="M32 17 L40 27 L50 12 L60 27 L68 17 L64 37 L36 37 Z" fill="{C}" opacity="0.92"/>',
  cat  :'<path d="M31 24 L35 5 L48 18 Z" fill="{C}" opacity="0.92"/><path d="M69 24 L65 5 L52 18 Z" fill="{C}" opacity="0.92"/>',
  fish :'<path d="M66 74 q14 -8 17 3 q-8 9 -17 4 z" fill="{C}" opacity="0.92"/><circle cx="76" cy="77" r="2.2" fill="#0b0910"/>',
  star :'<path d="M50 5 l5 12 13 1 -10 9 3 13 -11 -7 -11 7 3 -13 -10 -9 13 -1 z" fill="{C}" opacity="0.92"/>',
  garlic:'<path d="M50 7 q12 10 9 22 q-9 -6 -18 0 q-3 -12 9 -22 z" fill="{C}" opacity="0.92"/>',
  mask :'<ellipse cx="50" cy="42" rx="14" ry="9" fill="#0b0910" opacity="0.5"/><ellipse cx="44" cy="41" rx="3.2" ry="3.6" fill="{C}"/><ellipse cx="56" cy="41" rx="3.2" ry="3.6" fill="{C}"/>',
  egg  :'<ellipse cx="50" cy="27" rx="16" ry="12" fill="{C}" opacity="0.6"/>',
  fin  :'<path d="M50 6 q14 9 0 22 q-14 -13 0 -22 z" fill="{C}" opacity="0.92"/>',
  bucket:'<path d="M39 5 h22 v13 h-22 z" fill="{C}" opacity="0.92"/><path d="M44 5 q6 -9 12 0" stroke="{C}" fill="none" stroke-width="3" opacity="0.9"/>',
  moon :'<path d="M58 5 a12 12 0 1 0 7 22 a10 10 0 1 1 -7 -22 z" fill="{C}" opacity="0.92"/>',
  bread:'<path d="M29 11 q21 -11 42 0 v11 h-42 z" fill="{C}" opacity="0.92"/>',
  wrench:'<rect x="42" y="4" width="6" height="19" rx="3" fill="{C}" opacity="0.88"/><rect x="52" y="4" width="6" height="19" rx="3" fill="{C}" opacity="0.88"/>',
  wave :'<path d="M28 34 q6 -10 12 0 t12 0 t12 0" stroke="{C}" fill="none" stroke-width="3.4" opacity="0.9"/>',
  mushroom:'<path d="M25 27 q25 -26 50 0 q-25 10 -50 0 z" fill="{C}" opacity="0.92"/>',
  pill :'<g transform="rotate(-10 50 12)"><rect x="38" y="5" width="24" height="12" rx="6" fill="{C}" opacity="0.9"/><rect x="50" y="5" width="12" height="12" rx="6" fill="#0b0910" opacity="0.4"/></g>',
  chart:'<rect x="32" y="16" width="6" height="12" rx="2" fill="{C}" opacity="0.85"/><rect x="42" y="9" width="6" height="19" rx="2" fill="{C}" opacity="0.95"/><rect x="52" y="20" width="6" height="8" rx="2" fill="{C}" opacity="0.7"/><rect x="62" y="4" width="6" height="24" rx="2" fill="{C}" opacity="0.95"/>',
  dot  :'<circle cx="50" cy="16" r="5" fill="{C}" opacity="0.85"/>'
};

export function silhouette(key: string): string {
  const ch = CH[key]; if (!ch) return "";
  const acc = (ACC[ch.h] || ACC.dot).replace(/\{C\}/g, ch.c);
  return '<svg viewBox="0 0 300 560" xmlns="http://www.w3.org/2000/svg">' +
    '<g fill="' + ch.c + '" fill-opacity="0.8">' + BODY + '</g>' +
    '<g transform="translate(0,178) scale(3)">' + acc + '</g></svg>';
}
