#!/usr/bin/env python3
"""Проверка сайта: битые локальные ссылки/картинки, JSON-LD, уникальность title/description, длина description, alt/width/height."""
import json, re, sys
from pathlib import Path
from urllib.parse import urlparse, unquote
from html.parser import HTMLParser
ROOT = Path(__file__).resolve().parent
pages = [p for p in ROOT.rglob('*.html') if not any(x in p.parts for x in ('node_modules', 'builder', 'g-builder', 'wheel-builder', 'emblems', 'photos'))]
bad, titles, descs, issues = [], {}, {}, []
class P(HTMLParser):
    def __init__(s): super().__init__(); s.links=[]; s.imgs=[]; s.ld=[]; s._ld=False; s.title=''; s._t=False; s.meta={}; s.canon=None
    def handle_starttag(s,t,a):
        a=dict(a)
        if t in('a','link') and a.get('href'): s.links.append(a['href'])
        if t in('script','img','source','video') and a.get('src'): s.links.append(a['src'])
        if t=='img': s.imgs.append(a)
        if t=='script' and a.get('type')=='application/ld+json': s._ld=True
        if t=='title': s._t=True
        if t=='meta' and a.get('name'): s.meta[a['name']]=a.get('content','')
        if t=='link' and a.get('rel')=='canonical': s.canon=a.get('href')
    def handle_endtag(s,t):
        if t=='script': s._ld=False
        if t=='title': s._t=False
    def handle_data(s,d):
        if s._ld: s.ld.append(d)
        if s._t: s.title+=d
n=0
for f in pages:
    txt=f.read_text(encoding='utf-8'); p=P(); p.feed(txt); n+=1
    rel=f.relative_to(ROOT).as_posix()
    for l in p.links:
        if re.match(r'^(https?:|mailto:|tel:|tg:|#|data:|javascript:)',l): continue
        u=unquote(urlparse(l).path)
        t=(f.parent/u).resolve() if u else f
        if t.is_dir(): t=t/'index.html'
        if not t.exists(): bad.append((rel,l))
    for j in p.ld:
        try: json.loads(j)
        except Exception as e: issues.append((rel,'JSON-LD: '+str(e)))
    if rel.startswith(('ruli/','rul/')):
        titles.setdefault(p.title,[]).append(rel); d=p.meta.get('description','')
        descs.setdefault(d,[]).append(rel)
        if not 140<=len(d)<=160: issues.append((rel,f'description {len(d)} симв.'))
        if not p.canon: issues.append((rel,'нет canonical'))
        for i in p.imgs:
            if not (i.get('alt') and i.get('width') and i.get('height')): issues.append((rel,'img без alt/width/height'))
        if txt.count('<h1')!=1: issues.append((rel,'h1 != 1'))
for t,v in titles.items():
    if len(v)>1: issues.append((v[0],'дубль title у '+', '.join(v)))
for d,v in descs.items():
    if len(v)>1: issues.append((v[0],'дубль description у '+', '.join(v)))
print(f'Проверено страниц: {n}')
print('Битых ссылок:',len(bad)); [print('  ',b) for b in bad[:30]]
print('Замечаний:',len(issues)); [print('  ',i) for i in issues[:30]]
sys.exit(1 if bad or issues else 0)
