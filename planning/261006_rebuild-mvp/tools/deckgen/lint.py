import sys, zipfile, re
from lxml import etree
A='{http://schemas.openxmlformats.org/drawingml/2006/main}'
z=zipfile.ZipFile(sys.argv[1]); bad=0
for n in z.namelist():
    if not re.match(r'ppt/slides/slide\d+\.xml$', n): continue
    t=etree.fromstring(z.read(n)); ids=[]
    for p in t.iter(A+'p'):
        kids=[etree.QName(c).localname for c in p]
        if kids.count('endParaRPr')>1 or ('endParaRPr' in kids and kids[-1]!='endParaRPr') or ('pPr' in kids and kids[0]!='pPr'):
            bad+=1; print(n,'para order',kids[:6])
    for c in t.iter('{http://schemas.openxmlformats.org/presentationml/2006/main}cNvPr'): ids.append(c.get('id'))
    if len(ids)!=len(set(ids)): bad+=1; print(n,'dup ids')
    for rp in t.iter(A+'rPr'):
        kids=[etree.QName(c).localname for c in rp]
        if kids.count('solidFill')>1: bad+=1; print(n,'dup fill')
print('issues',bad)
