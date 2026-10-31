"""Assemble a deck from tpl_user.pptx using a spec list (see deck_policy.py)."""
import copy, os, re, shutil, subprocess, sys, zipfile
from pathlib import Path
from lxml import etree
import engine
from engine import Slide, NS, A, P, q, qa, E, add_slide, extract_extra_snips, add_runs, mk_ppr, add_br

HERE = Path(__file__).parent
TPL = HERE / 'tpl_paynship.pptx'   # tpl_user.pptx(레스토지니 출퇴근 정책서 틀)에서 로고 2개만 PayNShip 으로 교체
SK = engine.SK

# 템플릿 안에서 어떤 슬라이드를 무슨 틀로 쓰는가.
#
# 원본 「조직관리 - 사용자 관리 정책 및 로직 설계」(v0.2) 덱이 유실되어(260924),
# 우리가 만든 v1.3 배포본에서 템플릿을 **재구성**했다 —
#   표지 · 이력 · 목차 · 마지막장은 원래 틀 그대로 남아 있었고,
#   본문 틀은 생성된 도형(`shape NNNN`)만 걷어내 222(쪽번호) · 223(제목) · 224(선) · 226(배지)만 남겼다.
#   간지는 본래 3도형(156 제목 · 157 선 · 158 그림)이라 손댈 것이 없었다.
# 그래서 슬라이드 번호가 원본과 다르다. 번호를 코드 곳곳에 박지 않고 여기 모아 둔다.
TPL_SLIDE = {
    'cover':   'slide1.xml',
    'history': 'slide2.xml',
    'index':   'slide3.xml',
    'thanks':  'slide47.xml',
    'content': 'slide48.xml',
    'divider': 'slide49.xml',
}


def unpack(dst):
    if dst.exists(): shutil.rmtree(dst)
    zipfile.ZipFile(TPL).extractall(dst)


def slide_order(B, names):
    pres = B / 'ppt/presentation.xml'
    rels = (B / 'ppt/_rels/presentation.xml.rels').read_text()
    rid = {}
    for m in re.finditer(r'<Relationship [^>]*?Id="(rId\d+)"[^>]*?Target="slides/(slide\d+\.xml)"', rels):
        rid[m.group(2)] = m.group(1)
    for m in re.finditer(r'<Relationship [^>]*?Target="slides/(slide\d+\.xml)"[^>]*?Id="(rId\d+)"', rels):
        rid[m.group(1)] = m.group(2)
    t = etree.parse(str(pres)); lst = q(t.getroot(), 'p:sldIdLst')
    by_rid = {s.get('{%s}id' % NS['r']): s for s in lst}
    for s in list(lst): lst.remove(s)
    for n in names: lst.append(by_rid[rid[n]])
    t.write(str(pres), xml_declaration=True, encoding='UTF-8', standalone=True)


# ---------- fixed slides ----------
def fill_cover(s, title1, title2, ver, date, who):
    ph = [c for c in s.shapes() if 'Google Shape;99;' in q(c, './/p:cNvPr').get('name')][0]
    tb = q(ph, './/p:txBody'); ps = qa(tb, 'a:p')
    def reset(p, text):
        rs = qa(p, 'a:r'); rpr = copy.deepcopy(q(rs[0], 'a:rPr'))
        for r in rs: p.remove(r)
        r = etree.Element(A + 'r'); r.append(rpr); t = etree.SubElement(r, A + 't'); t.text = text
        t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        q(p, 'a:pPr').addnext(r)
    reset(ps[0], title1); reset(ps[1], title2)
    val = [c for c in s.shapes() if 'Google Shape;102;' in q(c, './/p:cNvPr').get('name')][0]
    for p, v in zip(qa(q(val, './/p:txBody'), 'a:p'), (ver, date, who)):
        rs = qa(p, 'a:r'); rs[0].find(A + 't').text = v
        for r in rs[1:]: p.remove(r)


def fill_table_like(tbl_el, rows, keep_header=True, body_template_row=1, sizes=None):
    tbl = q(tbl_el, './/a:tbl'); trs = qa(tbl, 'a:tr')
    tmpl = copy.deepcopy(trs[body_template_row])
    for tr in trs[(1 if keep_header else 0):]: tbl.remove(tr)
    for row in rows:
        tr = copy.deepcopy(tmpl)
        for tc, val in zip(qa(tr, 'a:tc'), row):
            txb = q(tc, 'a:txBody'); ps = qa(txb, 'a:p')
            p0 = ps[0]; ppr = copy.deepcopy(q(p0, 'a:pPr'))
            r0 = q(p0, 'a:r'); rpr = copy.deepcopy(q(r0, 'a:rPr')) if r0 is not None else None
            for p in ps: txb.remove(p)
            for line in str(val).split('\n'):
                if line.lstrip('{').startswith('-') and qa(txb, 'a:p'):
                    p = qa(txb, 'a:p')[-1]; p.remove(q(p, 'a:endParaRPr'))
                    br = etree.SubElement(p, A + 'br'); br.append(copy.deepcopy(rpr))
                else:
                    p = etree.SubElement(txb, A + 'p'); p.append(copy.deepcopy(ppr))
                for t, c, b in engine.parse_runs(line):
                    r = etree.SubElement(p, A + 'r'); rp = copy.deepcopy(rpr)
                    if sizes: rp.set('sz', str(sizes))
                    if c:
                        for f in list(rp): rp.remove(f)
                        sf = etree.SubElement(rp, A + 'solidFill'); etree.SubElement(sf, A + 'srgbClr').set('val', c)
                    if b: rp.set('b', '1')
                    r.append(rp); tt = etree.SubElement(r, A + 't'); tt.text = t
                    tt.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
                e = etree.SubElement(p, A + 'endParaRPr'); e.set('sz', rpr.get('sz') if rpr is not None else '900')
        tbl.append(tr)


def content_frame(s, title, badge):
    for c in s.shapes():
        nm = q(c, './/p:cNvPr').get('name')
        if ';225;' in nm: s.remove(c)
        elif ';223;' in nm: s.set_shape_text(c, title)
        elif ';226;' in nm:
            if not badge: s.remove(c)
            else:
                s.set_shape_text(c, badge)
                if '추가' in badge:
                    q(c, './p:spPr/a:solidFill/a:srgbClr').set('val', '00B050')


def build(spec, out):
    B = HERE / 'B'
    unpack(B)
    extract_extra_snips(B)
    names = []
    plan = []
    for item in spec:
        kind = item[0]
        if kind == 'cover': names.append(TPL_SLIDE['cover'])
        elif kind == 'history': names.append(TPL_SLIDE['history'])
        elif kind == 'index': names.append(TPL_SLIDE['index'])
        elif kind == 'thanks': names.append(TPL_SLIDE['thanks'])
        elif kind == 'divider': names.append(add_slide(B, TPL_SLIDE['divider']).split('/')[-1])
        elif kind == 'content': names.append(add_slide(B, TPL_SLIDE['content']).split('/')[-1])
        plan.append((names[-1], item))
    slide_order(B, names)
    subprocess.run([sys.executable, str(SK / 'clean.py'), str(B)], check=True, capture_output=True)
    for name, item in plan:
        s = Slide(B / 'ppt/slides' / name)
        kind = item[0]
        if kind == 'cover': fill_cover(s, *item[1:])
        elif kind == 'history':
            tbl = [c for c in s.shapes() if etree.QName(c).localname == 'graphicFrame'][0]
            fill_table_like(tbl, item[1], sizes=800)
            # 이력은 판을 거듭할수록 길어진다 — 넘치지 않게 셋을 같이 한다.
            #   ① 표를 위로 올리고  ② 셀 여백을 줄이고
            #   ③ **행 높이를 내용에 맡긴다** — 템플릿 행의 h(약 0.42")를 그대로
            #      물려받으면 글이 한 줄이든 세 줄이든 같은 높이를 먹어, 판이 하나
            #      늘 때마다 0.42"씩 바닥으로 내려간다(v1.4에서 여백 0.14"까지 갔다).
            #      h 를 최소값으로 낮추면 PowerPoint 가 글에 맞춰 늘려 준다.
            q(tbl, './p:xfrm/a:off').set('y', str(E(0.9)))
            for tc in tbl.iter(A + 'tcPr'):
                tc.set('marT', '27432'); tc.set('marB', '27432')
            for i, tr in enumerate(qa(q(tbl, './/a:tbl'), 'a:tr')):
                if i: tr.set('h', str(E(0.2)))
            # widen content column rows height auto
        elif kind == 'index':
            tbl = [c for c in s.shapes() if etree.QName(c).localname == 'graphicFrame'][0]
            rows = item[1]
            # row1 template = section head (marL 144000); items use row 2 template
            t = q(tbl, './/a:tbl'); trs = qa(t, 'a:tr')
            head_t, item_t = copy.deepcopy(trs[1]), copy.deepcopy(trs[2])
            for tr in trs[1:]: t.remove(tr)
            for i, r in enumerate(rows):
                tr = copy.deepcopy(head_t if i == 0 else item_t)
                tc = q(tr, 'a:tc'); txb = q(tc, 'a:txBody'); p = q(txb, 'a:p')
                rs = qa(p, 'a:r'); rs[0].find(A + 't').text = r
                for x in rs[1:]: p.remove(x)
                t.append(tr)
            if len(item) > 2 and item[2]:
                s.text(4.6, 1.15, 5.1, 1.2, item[2], fs=900)
        elif kind == 'divider':
            ph = s.shapes()[0]
            for c in s.shapes():
                if q(c, './/p:txBody') is not None: ph = c; break
            s.set_shape_text(ph, item[1])
            q(ph, './p:spPr/a:xfrm/a:ext').set('cx', str(E(8.6)))
        elif kind == 'content':
            _, title, badge, fn = item
            content_frame(s, title, badge)
            fn(s)
        s.save()
    outp = HERE / out
    if outp.exists(): outp.unlink()
    cwd = os.getcwd(); os.chdir(B)
    subprocess.run(['zip', '-qXr', str(outp), '.'], check=True)
    os.chdir(cwd)
    return outp


if __name__ == '__main__':
    import importlib
    mod = importlib.import_module(sys.argv[1])
    p = build(mod.SPEC, sys.argv[2])
    print('built', p)
