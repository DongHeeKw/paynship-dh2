# -*- coding: utf-8 -*-
"""정책서 md 렌더러 — deck_policy.py(정본) 를 읽어 01_정책서 md 를 굽는다.

PPTX 와 md 는 같은 출처에서 나온다. md 를 손으로 고치지 말 것 — 다음 빌드에서 덮어쓴다.
사용: python deck_to_md.py [출력경로] [정본 모듈명, 기본 deck_policy_pns]
"""
import re, sys
from pathlib import Path

import importlib
D = importlib.import_module(sys.argv[2] if len(sys.argv) > 2 else 'deck_policy_pns')

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else
           Path(__file__).resolve().parents[2] / '01_정책서_PayNShip-MVP.md')


def mk(text):
    """PPTX 마크업 → md"""
    text = re.sub(r'\{\{(.*?)\}\}', r'**\1**', text)
    text = re.sub(r'\[\[(.*?)\]\]', r'*\1*', text)
    text = re.sub(r'\(\((.*?)\)\)', r'\1', text)
    return text.replace('\n', ' ')


class Rec:
    """Slide 대역 — 그리는 대신 기록한다."""
    def __init__(self):
        self.out = []
        self.nodes = []
        self.edges = []

    # --- 본문
    def text(self, x, y, w, h, lines, **kw):
        buf = []
        for raw in lines:
            s = raw.strip()
            if not s:
                buf.append('')
                continue
            head, body = s[:2], s[2:]
            if head == '● ':
                buf.append(f'\n**{mk(body)}**\n')
            elif head == '○ ':
                buf.append(f'- {mk(body)}')
            elif head == '■ ':
                buf.append(f'  - {mk(body)}')
            elif head == '□ ':
                buf.append(f'    - {mk(body)}')
            elif s[0] in '-ㄴ※':
                buf.append(f'    {mk(s)}')
            else:
                buf.append(mk(s))
        self.out.append('\n'.join(buf))

    def table(self, x, y, colw, rows, header=True, **kw):
        if not rows:
            return
        width = max(len(r) for r in rows)
        def cell(v):
            v = '' if v is None else str(v)
            if v == '^':
                v = '〃'
            if v == '<':
                v = ''
            return mk(v).replace('|', '\\|')
        md = ['| ' + ' | '.join(cell(c) for c in rows[0]) + ' |',
              '|' + '---|' * width]
        for r in rows[1:]:
            md.append('| ' + ' | '.join(cell(c) for c in r) + ' |')
        self.out.append('\n'.join(md))

    # --- 도형(흐름도) : 텍스트로 요약
    def node(self, kind, x, y, w, h, text, **kw):
        self.nodes.append((round(y, 2), round(x, 2), kind, mk(text)))

    def arrow(self, *a, **kw):
        pass

    def label(self, x, y, text, kind='Y', **kw):
        self.edges.append(mk(text))

    def checklist(self, x, y, w, h, title, items, **kw):
        self.out.append(f'\n**{mk(title).lstrip("# ")}**\n\n' +
                        '\n'.join(f'- [ ] {mk(i)}' for i in items))

    def box(self, x, y, w, h, lines, **kw):
        self.out.append('\n'.join(f'- {mk(l.lstrip("!"))}' for l in lines))

    def keypoint(self, x, y, w, h, lines, **kw):
        self.out.append('> **Key Point** — ' + ' '.join(mk(l) for l in lines))

    def card(self, x, y, w, h, title, items, dark=True, **kw):
        buf = [f'\n**{mk(title)}**\n']
        for label, main, subs in items:
            buf.append(f'- **{mk(label)}**: {mk(main)}' if main else f'- **{mk(label)}**')
            buf += [f'    {mk(s)}' for s in subs]
        self.out.append('\n'.join(buf))

    def legend(self, *a, **kw):
        pass

    # --- 흐름도 정리
    def flush_flow(self):
        if not self.nodes:
            return
        rows = {}
        for y, x, kind, text in sorted(self.nodes):
            rows.setdefault(y, []).append(text.replace('\n', ' '))
        lines = ['\n**흐름** (상세 도식은 PPTX 참조)\n']
        for _, items in sorted(rows.items()):
            lines.append('- ' + ' → '.join(items))
        if self.edges:
            lines.append('- 분기: ' + ' · '.join(dict.fromkeys(self.edges)))
        self.out.append('\n'.join(lines))
        self.nodes, self.edges = [], []


def render():
    md = []
    for item in D.SPEC:
        kind = item[0]
        if kind == 'cover':
            _, t1, t2, ver, date, who = item
            md += [f'# {t1}{t2}', '',
                   f'> **이 문서는 생성물이다.** 정본은 `tools/deckgen/{D.__name__}.py` 이며, '
                   'PPTX(배포본)와 이 md 가 같은 출처에서 나온다. **md 를 직접 고치지 말 것.**', '',
                   '| | |', '|---|---|',
                   f'| **Document Ver.** | {ver} |',
                   f'| **Last Update** | {date} |',
                   f'| **In Charge** | {who} |', '']
        elif kind == 'history':
            md += ['## Document History', '',
                   '| Ver | 날짜 | 작성자 | 내용 |', '|---|---|---|---|']
            for r in item[1]:
                cells = [mk(c).replace('\n', '<br>') for c in r]
                md.append('| ' + ' | '.join(cells) + ' |')
            md.append('')
        elif kind == 'index':
            md += ['## Index', '']
            md += [f'- {t}' if i else f'**{t}**'
                   for i, t in enumerate(item[1])]
            md.append('')
            if len(item) > 2 and item[2]:
                md += ['', *[mk(l) for l in item[2]], '']
        elif kind == 'divider':
            md += ['', '---', '', f'# {item[1]}', '']
        elif kind == 'content':
            _, title, badge, fn = item
            rec = Rec()
            fn(rec)
            rec.flush_flow()
            body = '\n\n'.join(b for b in rec.out if b.strip())
            head = f'## {title}'
            if badge:
                head += f'  `{badge}`'
            md += [head, '', body, '']
        elif kind == 'thanks':
            pass
    text = '\n'.join(md)
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    OUT.write_text(text, encoding='utf-8')
    print(f'{OUT}  ({len(text.splitlines())} lines)')


if __name__ == '__main__':
    render()
