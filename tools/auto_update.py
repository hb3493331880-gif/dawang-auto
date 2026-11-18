#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""大王来了 · 服务端定时更新（GitHub Actions / cron 通用）

放仓库 tools/auto_update.py（文件名框填 tools/auto_update.py）。
做的事：按 data/endpoints.json 抓官方接口 -> 用与页面 mergeCoef 完全相同的口径，
把能严格对齐的新系数写回 data/base.json 的 vars.__LIVE__.matches[].o/.odds
-> 同步 data/manifest.json 的版本指纹（页面 30s 轮询发现变化会自动 reload）
-> 更新 data/last_update.json。

适配：你的仓库把发布内容套在「大王来了_更新_1118」这一层里，SITE 指向它。
若以后把文件夹去掉、index.html 回到仓库根，把 SITE 改回 ROOT 即可。

铁律（和浏览器端一致）：
  · 任一接口失败一律保留旧值，不写 0、不写空、不编造
  · 全部失败 / 零场对齐 => 一个字节都不写（workflow 靠 git diff 自动跳过提交）
  · 只改系数，字段级合并；伤停 / autoScores / 期池 / 2串1 定稿一律不动
  · 不换任九期号、不重算 12 维、不生成新定稿 —— 那是 refresh.py all 的事

用法：python3 tools/auto_update.py
"""
import json
import os
import sys
import time
import hashlib
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / '大王来了_更新_1118'
DATA = SITE / 'data'
BASE = DATA / 'base.json'
EPS = DATA / 'endpoints.json'
MANIFEST = DATA / 'manifest.json'
LAST = DATA / 'last_update.json'

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')


def read_json(p, fallback):
    try:
        with open(p, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print('[读取失败] %s -> %s' % (p, e))
        return fallback


def short_md5(b):
    return hashlib.md5(b).hexdigest()[:8]


def make_url(ep, cfg):
    if ep.get('abs'):
        return ep['abs'] + (('?' + ep['qs']) if ep.get('qs') else '')
    return cfg.get('base', '') + ep.get('path', '') + (('?' + ep['qs']) if ep.get('qs') else '')


def expand(cfg, live):
    """与页面 expand() 同口径：each 按当前场次 num 展开，最多 30 场。"""
    out, seen = [], set()
    for ep in cfg.get('probe', []):
        if ep.get('each') and live:
            for m in live[:30]:
                mid = m.get('num', m.get('no', m.get('matchId')))
                if mid is None:
                    continue
                key = '%s:%s' % (ep.get('key'), mid)
                if key in seen:
                    continue
                seen.add(key)
                out.append({
                    'key': key,
                    'path': ep.get('path', ''),
                    'qs': (ep.get('qs') or '').replace('{id}', str(mid)),
                    'text': bool(ep.get('text')),
                })
        else:
            out.append(ep)
    return out


def fetch_one(ep, cfg):
    url = make_url(ep, cfg)
    if not url.startswith('http'):
        return {'ok': False, 'key': ep.get('key'), 'code': 'bad_url'}
    try:
        req = urllib.request.Request(
            url, headers={'User-Agent': UA, 'Accept': 'application/json,text/plain,*/*'})
        with urllib.request.urlopen(req, timeout=cfg.get('timeout', 8)) as r:
            raw = r.read().decode('utf-8', 'replace')
        if ep.get('text'):
            return {'ok': True, 'key': ep.get('key'), 'data': raw, 'text': True}
        return {'ok': True, 'key': ep.get('key'), 'data': json.loads(raw), 'text': False}
    except Exception as e:
        return {'ok': False, 'key': ep.get('key'), 'code': type(e).__name__}


def walk_coef(x, out, depth=0):
    """复刻页面 mergeCoef 的 walk：只认 {num/no, o/odds} 且三个以上 >1 的数字。"""
    if not isinstance(x, (dict, list)) or depth > 6:
        return
    if isinstance(x, list):
        if x and isinstance(x[0], dict) and (
                ('num' in x[0] or 'no' in x[0]) and
                isinstance(x[0].get('o', x[0].get('odds')), list)):
            for it in x:
                out.append(it)
        else:
            for it in x[:40]:
                walk_coef(it, out, depth + 1)
        return
    for k in list(x.keys())[:30]:
        walk_coef(x[k], out, depth + 1)


def merge_coef(base, payloads):
    """按 num/no 严格对齐，只覆盖 o/.odds，其余字段一律保留。"""
    vars_ = base.setdefault('vars', {})
    live = vars_.get('__LIVE__')
    if not isinstance(live, dict) or not isinstance(live.get('matches'), list):
        return 0
    matches = live['matches']
    changed = 0
    for data in payloads:
        items = []
        walk_coef(data, items)
        for it in items:
            if not isinstance(it, dict):
                continue
            num = str(it.get('num', it.get('no', '')))
            arr = it.get('o', it.get('odds'))
            if not isinstance(arr, list) or len(arr) < 3:
                continue
            if not all(isinstance(z, (int, float)) and not isinstance(z, bool) and z > 1 for z in arr):
                continue
            for m in matches:
                if str(m.get('num', m.get('no', ''))) == num:
                    m['o'] = list(arr)
                    m['odds'] = list(arr)
                    changed += 1
                    break
    return changed


def main():
    cfg = read_json(EPS, {})
    base = read_json(BASE, {})
    if not isinstance(cfg, dict) or not isinstance(base, dict):
        print('[配置/基线不可读] 保留上一版，未改动任何文件')
        return 0
    live = (base.get('vars', {}).get('__LIVE__') or {}).get('matches') or []
    eps = expand(cfg, live)
    report = {'ts': time.strftime('%Y-%m-%d %H:%M:%S'), 'ok': 0, 'fail': 0,
              'changed': 0, 'kept': True, 'items': []}

    with ThreadPoolExecutor(max_workers=cfg.get('concurrency', 3)) as pool:
        results = list(pool.map(lambda e: fetch_one(e, cfg), eps))
    payloads = []
    for r in results:
        if r['ok']:
            report['ok'] += 1
            report['items'].append({'key': r['key'], 'status': 200})
            if not r.get('text'):
                payloads.append(r['data'])
        else:
            report['fail'] += 1
            report['items'].append({'key': r['key'], 'status': r.get('code')})
            print('[接口失败·保留旧值] %s -> %s' % (r['key'], r.get('code')))

    changed = merge_coef(base, payloads) if payloads else 0
    report['changed'] = changed

    if changed == 0:
        report['kept'] = True
        print('[未写入] 成功 %d 路 / 对齐 0 场，保留上一版，一个字节都不改' % report['ok'])
        return 0

    # 1) 写回基线，重算内置 md5 字段（生成器口径：文件内容的短 md5）
    base['built'] = time.strftime('%Y-%m-%d %H:%M:%S')
    base['md5'] = short_md5(json.dumps(base, ensure_ascii=False, sort_keys=True).encode('utf-8'))
    raw = json.dumps(base, ensure_ascii=False, indent=1).encode('utf-8')
    with open(BASE, 'w', encoding='utf-8') as f:
        f.write(raw.decode('utf-8'))

    # 2) manifest：md5 改成新版本指纹 -> 页面 30s 轮询发现变化自动 reload
    man = read_json(MANIFEST, {})
    if not isinstance(man, dict):
        man = {}
    old = man.get('md5')
    if old and not man.get('page_md5'):
        man['page_md5'] = old
    man['md5'] = short_md5(raw)
    man['auto'] = True
    man['interval'] = 1800
    man['updated'] = base['built']
    man['last_result'] = '%d 路成功 / %d 场系数更新' % (report['ok'], changed)
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=1)

    # 3) 时间戳文件：页面「数据更新于 X 前」据此变新
    last = read_json(LAST, {})
    if not isinstance(last, dict):
        last = {}
    last['started'] = base['built']
    last['finished'] = base['built']
    last['reason'] = 'auto-update'
    last['ok'] = True
    last['tail'] = ['自动更新: %d 路成功 / 失败 %d / %d 场系数更新' %
                    (report['ok'], report['fail'], changed)]
    with open(LAST, 'w', encoding='utf-8') as f:
        json.dump(last, f, ensure_ascii=False, indent=1)

    report['kept'] = False
    print('[已更新] %d 路成功 / %d 场系数 / manifest %s -> %s' %
          (report['ok'], changed, old, man['md5']))
    return 0


if __name__ == '__main__':
    sys.exit(main())
