from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.otlLib.builder import buildAnchor, buildMarkBasePosSubtable, buildLookup
import uharfbuzz as hb
import unicodedata

import argparse
parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--style', choices=['Serif', 'Sans'], required=True)
args = parser.parse_args()
src = args.source
out = args.output
weight = 'Regular' if args.style == 'Serif' else 'Light'
f=TTFont(src, recalcBBoxes=False); cmap=f.getBestCmap(); gs=f.getGlyphSet()
def bounds(g):
    p=BoundsPen(gs); gs[g].draw(p); return p.bounds
# Use exactly the acute contour from the font's precomposed ó.
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
acute=cmap[0x301]
spacing=cmap[0xB4]; sb=bounds(spacing); old=bounds(acute)
dx=(old[0]+old[2]-sb[0]-sb[2])/2; dy=old[1]-sb[1]
cs=f['CFF '].cff.topDictIndex[0].CharStrings
original_cs=cs[acute]
pen=T2CharStringPen(0,gs)
gs[spacing].draw(TransformPen(pen,(1,0,0,1,dx,dy)))
cs[acute]=pen.getCharString(private=original_cs.private,globalSubrs=original_cs.globalSubrs)
f['hmtx'].metrics[acute]=(0,round(sb[0]+dx))
gs=f.getGlyphSet()
ab=bounds(acute)
print('Acute dimensions:',(old[2]-old[0],old[3]-old[1]),'->',(ab[2]-ab[0],ab[3]-ab[1]),flush=True)
marks={acute:(0,buildAnchor(round((ab[0]+ab[2])/2),round(ab[1])))}
bases={}; expected={}
for u in range(0xAC00,0xD7A4):
    g=cmap[u]; b=bounds(g)
    x=round((b[0]+b[2])/2); y=round(b[3]+50)
    bases[g]={0:buildAnchor(x,y)}; expected[u]=(x,y)
# Keep each subtable comfortably within OpenType's 16-bit internal offsets.
names=list(bases); subs=[]
for i in range(0,len(names),1000):
    subs.append(buildMarkBasePosSubtable(marks,{g:bases[g] for g in names[i:i+1000]},f.getReverseGlyphMap()))
t=f['GPOS'].table; idx=len(t.LookupList.Lookup)
t.LookupList.Lookup.append(buildLookup(subs,table="GPOS",extension=True)); t.LookupList.LookupCount=len(t.LookupList.Lookup)
for r in t.FeatureList.FeatureRecord:
    if r.FeatureTag=='mark':
        r.Feature.LookupListIndex.append(idx);r.Feature.LookupCount=len(r.Feature.LookupListIndex)
family=f'JGantts Hangul {args.style}'; ps=f'JGanttsHangul{args.style}-{weight}'
vals={1:family,2:weight,3:'1.000;'+ps,4:family+' '+weight,5:'Version 1.000; Hangul acute positioning patch; shorter acute',6:ps,16:family,17:weight}
for r in list(f['name'].names):
    if r.nameID in vals: f['name'].setName(vals[r.nameID],r.nameID,r.platformID,r.platEncID,r.langID)
for n,v in vals.items(): f['name'].setName(v,n,3,1,0x409)
top=f['CFF '].cff.topDictIndex[0];f['CFF '].cff.fontNames=[ps];top.FamilyName=family;top.FullName=family+' '+weight
# Allow room for the newly attached accents in applications that use font metrics.
peak=max(y for x,y in expected.values())+ab[3]-ab[1]
f['hhea'].ascent=max(f['hhea'].ascent,round(peak+20))
f['OS/2'].sTypoAscender=max(f['OS/2'].sTypoAscender,round(peak+20))
f['OS/2'].usWinAscent=max(f['OS/2'].usWinAscent,round(peak+20))
if 'DSIG' in f: del f['DSIG']
f.save(out)
p=TTFont(out); original=hb.Font(hb.Face(src.read_bytes())); patched=hb.Font(hb.Face(out.read_bytes()))
def shape(font,s):
    b=hb.Buffer();b.add_str(s);b.guess_segment_properties();hb.shape(font,b)
    return [(i.codepoint,(v.x_advance,v.y_advance,v.x_offset,v.y_offset)) for i,v in zip(b.glyph_infos,b.glyph_positions)]
for u,(x,y) in expected.items():
    s=chr(u)+'\u0301'; result=shape(patched,s)
    assert len(result)==2,(u,result)
    base,mark=result
    assert mark[0]==p.getGlyphID(acute)
    assert base[1][0]+mark[1][2]+round((ab[0]+ab[2])/2)==x,(u,result)
    assert mark[1][3]+round(ab[1])==y,(u,result)
    assert mark[1][0]==0
    assert sum(v[0] for _,v in result)==sum(v[0] for _,v in shape(original,chr(u)))
    assert shape(patched,chr(u))==shape(original,chr(u))
for s in ['ASCII 0123456789 !@#$%', 'á é ó ñ', 'ㄱㄴㄷ', '中文 日本語', 'ㄓ́']:
    assert shape(original,s)==shape(patched,s),s
assert shape(patched,'로́쌰뽀́')==shape(patched,unicodedata.normalize('NFD','로́쌰뽀́'))
assert f['hmtx'].metrics==p['hmtx'].metrics
print('PASS: 11,172 accented syllables centered with 50-unit clearance and unchanged original advance widths; representative other scripts unchanged; decomposed example equivalent.')
print('Output:',out.resolve()); print('Example:',shape(patched,'로́쌰뽀́'));print('Ascent:',p['hhea'].ascent)

# Keep all Hangul and layout closure, but let existing fonts supply Latin/Han.
from fontTools import subset
options = subset.Options()
options.layout_features = ['*']
options.name_IDs = ['*']
options.name_languages = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=[0x301, *range(0x1100,0x1200), *range(0x3130,0x3190), *range(0xa960,0xa980), *range(0xac00,0xd800)])
subsetter.subset(p)
p.flavor = 'woff2'
p.save(out.with_suffix('.woff2'))
print('Webfont:', out.with_suffix('.woff2'))
