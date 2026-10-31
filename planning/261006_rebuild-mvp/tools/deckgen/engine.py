"""Template-clone engine: builds slides by reusing the exact XML of tpl_user.pptx.

Markup inside text:
  {{red}}   -> FF0000 run          [[pink]] -> FF0066 run
  **bold**  -> bold run            ((gray)) -> 9E9E9E run
Body lines (list of str):
  '● x' lvl0 (bold 11) · '○ x' lvl1 · '■ x' lvl2 · '- x' / 'ㄴ x' / '※ x' continuation (<a:br/>) · '' blank
"""
import copy, re, sys, shutil, zipfile, subprocess
from pathlib import Path
from lxml import etree

SK = Path('/Users/yohanpark/.claude/skills/synced/179fe325-3310-436e-947d-b13c2bccd84e_66dce0b3-8460-4193-9c30-7cc19b8080c6/pptx/scripts')
sys.path.insert(0, str(SK))
from add_slide import add_slide  # noqa

HERE = Path(__file__).parent
NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
A = '{%s}' % NS['a']; P = '{%s}' % NS['p']
EMU = 914400
def E(inch): return int(round(inch * EMU))

def q(el, path): return el.find(path, NS)
def qa(el, path): return el.findall(path, NS)

# ---------- snippets ----------
SNIP = {}
def snip(name):
    if name not in SNIP:
        SNIP[name] = etree.fromstring((HERE / 'snip' / f'{name}.xml').read_bytes())
    return copy.deepcopy(SNIP[name])

# ---------- run markup ----------
TOK = re.compile(r'(\{\{.*?\}\}|\[\[.*?\]\]|\*\*.*?\*\*|\(\(.*?\)\))')
def parse_runs(text):
    out = []
    for part in TOK.split(text):
        if not part: continue
        if part.startswith('{{'): out.append((part[2:-2], 'FF0000', False))
        elif part.startswith('[['): out.append((part[2:-2], 'FF0066', False))
        elif part.startswith('**'): out.append((part[2:-2], None, True))
        elif part.startswith('(('): out.append((part[2:-2], '9E9E9E', False))
        else: out.append((part, None, False))
    return out

def mk_rpr(sz, color=None, bold=False, italic=False, scheme='dk1'):
    r = etree.SubElement(etree.Element('dummy'), A + 'rPr')
    if bold: r.set('b', '1')
    if italic: r.set('i', '1')
    r.set('lang', 'ko'); r.set('sz', str(int(sz)))
    sf = etree.SubElement(r, A + 'solidFill')
    if color: etree.SubElement(sf, A + 'srgbClr').set('val', color)
    else: etree.SubElement(sf, A + 'schemeClr').set('val', scheme)
    return r

def add_runs(p, text, sz, bold=False, base_color=None, italic=False):
    for t, c, b in parse_runs(text):
        r = etree.SubElement(p, A + 'r')
        r.append(mk_rpr(sz, c or base_color, bold or b, italic))
        tt = etree.SubElement(r, A + 't'); tt.text = t
        if t != t.strip(): tt.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')

def add_br(p, sz):
    br = etree.SubElement(p, A + 'br'); br.append(mk_rpr(sz))

def mk_ppr(lvl, sz, bullet=None, lnspc=130000, algn='l', marL=None, indent=None):
    pp = etree.Element(A + 'pPr')
    LV = {0: (136801, -120251), 1: (269999, -117075), 2: (399600, -117075), 3: (529200, -117075)}
    if bullet is None: m, i = 0, 0
    else: m, i = LV[lvl]
    if marL is not None: m = marL
    if indent is not None: i = indent
    pp.set('indent', str(i)); pp.set('lvl', str(lvl)); pp.set('marL', str(m)); pp.set('rtl', '0'); pp.set('algn', algn)
    ls = etree.SubElement(pp, A + 'lnSpc'); etree.SubElement(ls, A + 'spcPct').set('val', str(lnspc))
    sb = etree.SubElement(pp, A + 'spcBef'); etree.SubElement(sb, A + 'spcPts').set('val', '0')
    sa = etree.SubElement(pp, A + 'spcAft'); etree.SubElement(sa, A + 'spcPts').set('val', '0')
    if bullet:
        bc = etree.SubElement(pp, A + 'buClr'); etree.SubElement(bc, A + 'schemeClr').set('val', 'dk1')
        etree.SubElement(pp, A + 'buSzPts').set('val', str(int(sz)))
        etree.SubElement(pp, A + 'buChar').set('char', bullet)
    else:
        etree.SubElement(pp, A + 'buNone')
    return pp

def body_paragraphs(lines, fs=1050, lnspc=130000):
    """fs = body size in 1/100 pt (template 1050); lvl0 = fs+50"""
    paras = []
    cur = None
    for raw in lines:
        s = raw.strip()
        if s == '':
            p = etree.Element(A + 'p'); p.append(mk_ppr(0, fs, None, lnspc))
            paras.append(p); cur = None; continue
        head = s[:2]
        if head in ('● ', '○ ', '■ ', '□ '):
            lvl = {'● ': 0, '○ ': 1, '■ ': 2, '□ ': 3}[head]
            sz = fs + 50 if lvl == 0 else fs
            p = etree.Element(A + 'p'); p.append(mk_ppr(lvl, sz, head[0] if head[0] != '□' else '-', lnspc))
            add_runs(p, s[2:], sz, bold=(lvl == 0))
            paras.append(p); cur = (p, sz)
        elif s[0] in '-ㄴ※' and cur is not None:
            p, sz = cur
            add_br(p, sz)
            text = raw.lstrip()
            if text.startswith('※') and '[[' not in text: text = '[[' + text + ']]'
            if text.startswith('ㄴ'): text = '  ' + text
            add_runs(p, text, sz)
        else:  # plain paragraph (no bullet)
            p = etree.Element(A + 'p'); p.append(mk_ppr(0, fs, None, lnspc))
            add_runs(p, s, fs); paras.append(p); cur = (p, fs)
    for p in paras:
        e = etree.SubElement(p, A + 'endParaRPr'); e.set('sz', str(fs))
    return paras

# ---------- shape factory ----------
class Slide:
    def __init__(self, path):
        self.path = Path(path)
        self.tree = etree.parse(str(self.path))
        self.tree_root = self.tree.getroot()
        self.sp = q(self.tree_root, './/p:cSld/p:spTree')
        self.nid = 2000
    def next_id(self):
        self.nid += 1; return self.nid
    def save(self):
        self.tree.write(str(self.path), xml_declaration=True, encoding='UTF-8', standalone=True)
    def shapes(self):
        return [c for c in self.sp if etree.QName(c).localname in ('sp', 'graphicFrame', 'cxnSp', 'grpSp', 'pic')]
    def find_text(self, needle):
        for c in self.shapes():
            if needle in ''.join(c.itertext()): return c
    def remove(self, el):
        el.getparent().remove(el)
    def _place(self, el, x, y, w, h):
        idn = self.next_id()
        for cnv in el.iter(P + 'cNvPr'):
            cnv.set('id', str(idn)); cnv.set('name', f'shape {idn}'); idn = self.next_id()
        xf = q(el, './p:spPr/a:xfrm')
        if xf is None: xf = q(el, './p:grpSpPr/a:xfrm')
        if xf is not None:
            q(xf, 'a:off').set('x', str(E(x))); q(xf, 'a:off').set('y', str(E(y)))
            q(xf, 'a:ext').set('cx', str(E(w))); q(xf, 'a:ext').set('cy', str(E(h)))
        self.sp.append(el)
        return el

    def set_shape_text(self, el, text, sz=None, color=None, bold=None, algn=None):
        """Replace text keeping first run's rPr style. text may contain \n -> paragraphs."""
        tb = q(el, './/p:txBody')
        ps = qa(tb, 'a:p')
        p0 = ps[0]
        r0 = q(p0, 'a:r'); rpr = copy.deepcopy(q(r0, 'a:rPr')) if r0 is not None else mk_rpr(800)
        if sz: rpr.set('sz', str(sz))
        if bold is not None:
            if bold: rpr.set('b', '1')
            elif 'b' in rpr.attrib: del rpr.attrib['b']
        ppr = copy.deepcopy(q(p0, 'a:pPr'))
        if algn and ppr is not None: ppr.set('algn', algn)
        for p in ps: tb.remove(p)
        for line in text.split('\n'):
            p = etree.SubElement(tb, A + 'p')
            if ppr is not None: p.append(copy.deepcopy(ppr))
            for t, c, b in parse_runs(line):
                r = etree.SubElement(p, A + 'r'); rp = copy.deepcopy(rpr)
                col = c or color
                if col:
                    for f in list(rp): rp.remove(f)
                    sf = etree.SubElement(rp, A + 'solidFill'); etree.SubElement(sf, A + 'srgbClr').set('val', col)
                if b: rp.set('b', '1')
                r.append(rp); tt = etree.SubElement(r, A + 't'); tt.text = t
            e = etree.SubElement(p, A + 'endParaRPr'); e.set('sz', rpr.get('sz', '800'))
        return el

    # --- generic
    def text(self, x, y, w, h, lines, fs=1050, lnspc=130000, anchor='t'):
        el = snip('body')
        tb = q(el, './/p:txBody')
        q(tb, 'a:bodyPr').set('anchor', anchor)
        for p in qa(tb, 'a:p'): tb.remove(p)
        for p in body_paragraphs(lines, fs, lnspc): tb.append(p)
        return self._place(el, x, y, w, h)

    def node(self, kind, x, y, w, h, text, sz=None, color=None, fill=None, line=None, bold=None, algn=None, dash=None):
        el = snip(kind)
        self.set_shape_text(el, text, sz=sz, color=color, bold=bold, algn=algn)
        sppr = q(el, './p:spPr')
        if fill:
            old = q(sppr, 'a:solidFill')
            if old is None: old = q(sppr, 'a:noFill')
            nf = etree.Element(A + 'solidFill'); etree.SubElement(nf, A + 'srgbClr').set('val', fill)
            old.addprevious(nf); sppr.remove(old)
        if line or dash:
            ln = q(sppr, 'a:ln')
            if line:
                for f in qa(ln, 'a:solidFill') + qa(ln, 'a:noFill'): ln.remove(f)
                sf = etree.Element(A + 'solidFill'); etree.SubElement(sf, A + 'srgbClr').set('val', line); ln.insert(0, sf)
            if dash:
                d = q(ln, 'a:prstDash')
                if d is None: d = etree.SubElement(ln, A + 'prstDash')
                d.set('val', dash)
        return self._place(el, x, y, w, h)

    def label(self, x, y, text, kind='Y', w=0.5, h=0.18):
        el = snip('lblY' if kind == 'Y' else 'lblN')
        self.set_shape_text(el, text)
        return self._place(el, x, y, w, h)

    def arrow(self, x1, y1, x2, y2, bend=None, color=None):
        """straight if aligned; bend='hv' (horizontal first) or 'vh'."""
        if abs(x1 - x2) < 0.01 or abs(y1 - y2) < 0.01 or bend is None:
            el = snip('cxn'); prst = 'straightConnector1'; head_at_start = False
            sx, sy, ex, ey = x1, y1, x2, y2
        else:
            el = snip('cxn'); prst = 'bentConnector2'
            if bend == 'hv': sx, sy, ex, ey, head_at_start = x1, y1, x2, y2, False
            else: sx, sy, ex, ey, head_at_start = x2, y2, x1, y1, True
        nv = q(el, './/p:cNvCxnSpPr')
        for c in list(nv): nv.remove(c)
        sppr = q(el, './p:spPr')
        q(sppr, 'a:prstGeom').set('prst', prst)
        xf = q(sppr, 'a:xfrm')
        for k in ('flipH', 'flipV'):
            if k in xf.attrib: del xf.attrib[k]
        if sx > ex: xf.set('flipH', '1')
        if sy > ey: xf.set('flipV', '1')
        ln = q(sppr, 'a:ln')
        if head_at_start:
            q(ln, 'a:headEnd').set('type', 'triangle'); q(ln, 'a:tailEnd').set('type', 'none')
        if color:
            sf = q(ln, 'a:solidFill')
            for f in list(sf): sf.remove(f)
            etree.SubElement(sf, A + 'srgbClr').set('val', color)
        eff = q(sppr, 'a:effectLst')
        if eff is not None: sppr.remove(eff)
        return self._place(el, min(sx, ex), min(sy, ey), abs(ex - sx), abs(ey - sy))

    def checklist(self, x, y, w, h, title, items, sz=800):
        el = snip('input')
        sppr = q(el, './p:spPr')
        old = q(sppr, 'a:solidFill'); nf = etree.Element(A + 'solidFill'); etree.SubElement(nf, A + 'srgbClr').set('val', 'FFF2CC'); old.addprevious(nf); sppr.remove(old)
        ln = q(sppr, 'a:ln'); ln.set('w', '19050')
        for f in qa(ln, 'a:solidFill'): ln.remove(f)
        sf = etree.Element(A + 'solidFill'); etree.SubElement(sf, A + 'srgbClr').set('val', 'A6A6A6'); ln.insert(0, sf)
        q(ln, 'a:prstDash').set('val', 'lgDash')
        tb = q(el, './/p:txBody'); bp = q(tb, 'a:bodyPr')
        for k in ('lIns', 'rIns', 'tIns', 'bIns'): bp.set(k, '54000')
        for p in qa(tb, 'a:p'): tb.remove(p)
        p = etree.SubElement(tb, A + 'p'); p.append(mk_ppr(0, sz + 100, None, 130000))
        add_runs(p, title, sz + 100, bold=True, base_color='000000', italic=True)
        for it in items:
            p = etree.SubElement(tb, A + 'p'); p.append(mk_ppr(0, sz, '❑', 130000, marL=158399, indent=-101200))
            add_runs(p, it, sz)
        return self._place(el, x, y, w, h)

    def box(self, x, y, w, h, lines, fill='D9D9D9', sz=800, bullet='●', color=None, anchor='ctr', lnspc=130000):
        el = snip('yellowbox')
        sppr = q(el, './p:spPr')
        sf = q(sppr, 'a:solidFill'); c = q(sf, 'a:srgbClr'); c.set('val', fill)
        tb = q(el, './/p:txBody'); q(tb, 'a:bodyPr').set('anchor', anchor)
        for k in ('lIns', 'rIns', 'tIns', 'bIns'): q(tb, 'a:bodyPr').set(k, '45720')
        for p in qa(tb, 'a:p'): tb.remove(p)
        for line in lines:
            p = etree.SubElement(tb, A + 'p')
            if bullet and not line.startswith('!'):
                p.append(mk_ppr(0, sz, bullet, lnspc, marL=153346, indent=-95526))
            else:
                p.append(mk_ppr(0, sz, None, lnspc)); line = line.lstrip('!')
            add_runs(p, line, sz, base_color=color)
        return self._place(el, x, y, w, h)

    def keypoint(self, x, y, w, h, lines, sz=900):
        el = snip('keybody')
        tb = q(el, './/p:txBody')
        for p in qa(tb, 'a:p'): tb.remove(p)
        for line in lines:
            p = etree.SubElement(tb, A + 'p'); p.append(mk_ppr(0, sz, None, 115000, marL=35999))
            add_runs(p, line, sz, base_color='CC4125')
        self._place(el, x, y, w, h)
        lb = snip('keylbl'); self._place(lb, x + 0.05, y + 0.04, 0.9, 0.26)

    def legend(self, extra_fe=True):
        el = snip('legend')
        self.sp.append(el)
        for cnv in el.iter(P + 'cNvPr'):
            cnv.set('id', str(self.next_id()))
        for sp_ in el.iter(P + 'sp'):
            txt = ''.join(sp_.itertext())
            if '시스템' in txt or 'FE 액션' in txt:
                for r in sp_.iter(A + 'rPr'): r.set('sz', '550')
            if not extra_fe and 'FE 액션' in txt: sp_.getparent().remove(sp_)

    # --- tables
    def table(self, x, y, colw, rows, header=True, firstcol=True, fs=750, hfs=800, rowh=0.22, algns=None,
              hfill='D9D9D9', ffill='F3F3F3', lnspc=115000, bold_first=True, redrows=()):
        """rows: list of list; cell '' ok; cell '^' = merge with cell above; cell '<' = merge with left."""
        gf = snip('tblframe')
        tbl = q(gf, './/a:tbl')
        grid = q(tbl, 'a:tblGrid')
        for g in list(grid): grid.remove(g)
        for w in colw: etree.SubElement(grid, A + 'gridCol').set('w', str(E(w)))
        for tr in qa(tbl, 'a:tr'): tbl.remove(tr)
        nrows = len(rows)
        for ri, row in enumerate(rows):
            tr = etree.SubElement(tbl, A + 'tr'); tr.set('h', str(E(rowh)))
            for ci, val in enumerate(row):
                tc = etree.SubElement(tr, A + 'tc')
                ishdr = header and ri == 0
                isfirst = firstcol and ci == 0 and not ishdr
                # merges
                if val == '^':
                    tc.set('vMerge', '1'); val = ''
                    # set rowSpan on origin
                    rr = ri - 1
                    while rows[rr][ci] == '^': rr -= 1
                    origin = qa(qa(tbl, 'a:tr')[rr], 'a:tc')[ci]
                    origin.set('rowSpan', str(int(origin.get('rowSpan', '1')) + 1))
                elif val == '<':
                    tc.set('hMerge', '1'); val = ''
                    cc = ci - 1
                    while row[cc] == '<': cc -= 1
                    origin = qa(tr, 'a:tc')[cc]
                    origin.set('gridSpan', str(int(origin.get('gridSpan', '1')) + 1))
                txb = etree.SubElement(tc, A + 'txBody')
                etree.SubElement(txb, A + 'bodyPr'); etree.SubElement(txb, A + 'lstStyle')
                sz = hfs if ishdr else fs
                al = 'ctr' if ishdr else (algns[ci] if algns else 'l')
                for line in (str(val).split('\n') if val != '' else ['']):
                    p = etree.SubElement(txb, A + 'p'); p.append(mk_ppr(0, sz, None, lnspc, algn=al))
                    if line:
                        add_runs(p, line, sz, bold=ishdr or (isfirst and bold_first),
                                 base_color=('FF0000' if ri in redrows and not ishdr else None))
                    e = etree.SubElement(p, A + 'endParaRPr'); e.set('sz', str(sz))
                tcpr = etree.SubElement(tc, A + 'tcPr')
                for k, v in (('marT', '36000'), ('marB', '36000'), ('marR', '54000'), ('marL', '54000'), ('anchor', 'ctr')):
                    tcpr.set(k, v)
                for side in ('lnL', 'lnR', 'lnT', 'lnB'):
                    ln = etree.SubElement(tcpr, A + side); ln.set('cap', 'flat'); ln.set('cmpd', 'sng'); ln.set('w', '9525')
                    sf = etree.SubElement(ln, A + 'solidFill'); etree.SubElement(sf, A + 'srgbClr').set('val', 'A6A6A6')
                    etree.SubElement(ln, A + 'prstDash').set('val', 'solid')
                fillc = hfill if ishdr else (ffill if isfirst else None)
                if fillc:
                    sf = etree.SubElement(tcpr, A + 'solidFill'); etree.SubElement(sf, A + 'srgbClr').set('val', fillc)
        el = self._place(gf, x, y, sum(colw), rowh * nrows)
        xf = q(el, './p:xfrm')
        q(xf, 'a:off').set('x', str(E(x))); q(xf, 'a:off').set('y', str(E(y)))
        q(xf, 'a:ext').set('cx', str(E(sum(colw)))); q(xf, 'a:ext').set('cy', str(E(rowh * nrows)))
        return el


def extract_extra_snips(U):
    """body textbox + table frame from slide12.

    재구성한 템플릿(260924)에는 slide12 가 없다. 두 조각은 이미 snip/ 에 커밋돼 있으므로
    없으면 그대로 쓴다 — 여기서 다시 뽑는 것은 원본 템플릿이 있을 때의 편의였다.
    """
    src = U / 'ppt/slides/slide12.xml'
    if not src.exists():
        return
    t = etree.parse(str(src))
    for el in t.getroot().iter(P + 'sp'):
        if 'Google Shape;234;' in q(el, './/p:cNvPr').get('name'):
            (HERE / 'snip/body.xml').write_bytes(etree.tostring(el))
    gf = t.getroot().find('.//p:graphicFrame', NS)
    (HERE / 'snip/tblframe.xml').write_bytes(etree.tostring(gf))


def _card(self, x, y, w, h, title, items, dark=True, sz=710, anchor='t'):
    el = snip('card_dark' if dark else 'card_gray')
    base = 'FFFFFF' if dark else 'CC4125'
    subc = 'BFBFBF' if dark else '404040'
    tb = q(el, './/p:txBody'); bp = q(tb, 'a:bodyPr'); bp.set('anchor', anchor)
    for k in ('lIns', 'rIns'): bp.set(k, '72000')
    bp.set('tIns', '54000'); bp.set('bIns', '36000')
    for p in qa(tb, 'a:p'): tb.remove(p)
    p = etree.SubElement(tb, A + 'p'); p.append(mk_ppr(0, 887, None, 100000, algn='ctr'))
    add_runs(p, title, 887, bold=True, base_color=base); add_br(p, 887)
    e = etree.SubElement(p, A + 'endParaRPr'); e.set('sz', '444')
    for label, main, subs in items:
        p = etree.SubElement(tb, A + 'p'); p.append(mk_ppr(0, sz, '●', 115000, marL=153346, indent=-89807))
        add_runs(p, label, sz, bold=True, base_color=base)
        if main:
            add_runs(p, ': ', sz, bold=True, base_color=base)
            add_runs(p, main, sz, base_color=(base if dark else 'CC4125'))
        for s in subs:
            add_br(p, sz)
            for t, c, b in parse_runs(s):
                r = etree.SubElement(p, A + 'r'); r.append(mk_rpr(sz, c or subc, b, italic=dark))
                tt = etree.SubElement(r, A + 't'); tt.text = t
        e = etree.SubElement(p, A + 'endParaRPr'); e.set('sz', str(sz))
    return self._place(el, x, y, w, h)
Slide.card = _card
