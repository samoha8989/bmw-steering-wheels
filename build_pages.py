#!/usr/bin/env python3
"""Генератор статических SEO-страниц сайта рулей.

Запуск (одна команда, из папки сайта):   python3 build_pages.py

Что делает:
  * из catalog.json собирает /ruli/ (хаб), страницы кузовов и серий, /rul/<номер>/ (страница каждого руля);
  * пересобирает sitemap.xml, robots.txt, stats-config.js;
  * вписывает в существующие страницы (главная, доставка, контакты и т.д.) canonical, Open Graph,
    description, подтверждение Яндекса, скрипты согласия и статистики (повторный запуск безопасен).

Все адреса берутся из site.config.json (site_url). Цены, сроки, условия — только из catalog.json и текстов сайта.
"""
import html
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path
from urllib.parse import quote, urlparse

from PIL import Image

ROOT = Path(__file__).resolve().parent
CFG = json.loads((ROOT / 'site.config.json').read_text(encoding='utf-8'))
SITE = CFG['site_url'].rstrip('/')
BRAND = CFG['brand']
TG = CFG['telegram']
VER = CFG.get('assets_version', '1')
NBSP = ' '

# ---------------------------------------------------------------- данные

# Кузова — ровно те, что уже есть на сайте (MODELS в studio.js): (коды, модель)
BODIES = {
    'E': [('E60', '5 серия'), ('E81 / E82 / E87 / E88', '1 серия'), ('E90 / E91 / E92 / E93', '3 серия'),
          ('E84', 'X1'), ('E70', 'X5'), ('E71', 'X6'), ('E89', 'Z4')],
    'F': [('F20 / F21 / F40', '1 серия'), ('F22 / F23 / F44 / F45', '2 серия'), ('F30 / F31 / F35', '3 серия'),
          ('F32 / F33 / F36', '4 серия'), ('F10 / F11 / F18', '5 серия'), ('F06 / F12 / F13', '6 серия'),
          ('F01 / F02 / F03', '7 серия'), ('F48 / F49', 'X1'), ('F39', 'X2'), ('F25', 'X3'), ('F26', 'X4'),
          ('F15', 'X5'), ('F16', 'X6'), ('F87', 'M2'), ('F80', 'M3'), ('F82 / F83', 'M4'), ('F10 / F90', 'M5'),
          ('F06 / F12 / F13', 'M6'), ('F91 / F92 / F93', 'M8'), ('F34', '3 GT'), ('F07', '5 GT')],
    'G': [('G20 / G21', '3 серия'), ('G22 / G23 / G26', '4 серия'), ('G30 / G31', '5 серия'),
          ('G60 / G61', '5 серия'), ('G11 / G12', '7 серия'), ('G01', 'X3'), ('G02', 'X4'), ('G05', 'X5'),
          ('G06', 'X6'), ('G07', 'X7'), ('G80 / G81', 'M3'), ('G82 / G83', 'M4')],
    'U': [('U06', '2 Active Tourer'), ('U10', 'X2 / iX2'), ('U11', 'X1 / iX1'), ('U12', 'X1 удлинённый, Китай')],
}
SERIES_TITLE = {'E': 'E-серия', 'F': 'F-серия', 'G': 'G-серия', 'U': 'U-кузова'}
SERIES_SLUG = {'E': 'bmw-e-kuzov', 'F': 'bmw-f-kuzov', 'G': 'bmw-g-kuzov'}
SERIES_NAME = {'E': 'BMW E-серии', 'F': 'BMW F-серии', 'G': 'BMW G-серии', 'Mercedes': 'Mercedes-Benz', 'Porsche': 'Porsche'}
SERIES_BRAND = {'E': 'BMW', 'F': 'BMW', 'G': 'BMW', 'Mercedes': 'Mercedes-Benz', 'Porsche': 'Porsche'}
OPT_LABELS = {'heat': 'Подогрев', 'carbon': 'Карбоновая отделка', 'led': 'LED-экран и подсветка',
              'acc': 'Адаптивный круиз', 'vib': 'Вибрация'}
VISIBLE = ('E', 'F', 'G', 'Mercedes', 'Porsche')  # Toyota и Audi на сайте скрыты

CATALOG = [p for p in json.loads((ROOT / 'catalog.json').read_text(encoding='utf-8')) if p['series'] in VISIBLE]
WARN = []


def warn(msg):
    WARN.append(msg)


# ---------------------------------------------------------------- утилиты

def esc(s):
    return html.escape(str(s), quote=True)


def money(n):
    return f'{int(n):,}'.replace(',', NBSP) + NBSP + '₽'


def plural(n, forms):
    n = abs(int(n)) % 100
    if 10 < n < 20:
        return forms[2]
    n %= 10
    return forms[0] if n == 1 else forms[1] if 2 <= n <= 4 else forms[2]


def absurl(path=''):
    return SITE + '/' + path.lstrip('/')


def fit(base, extras, lo, hi):
    out = base
    for e in extras:
        if len(out) + 1 + len(e) <= hi:
            out += ' ' + e
    if not lo <= len(out) <= hi:
        warn(f'description {len(out)} симв.: {out[:70]}…')
    return out


_img_cache = {}


def img_size(path):
    if path not in _img_cache:
        try:
            with Image.open(ROOT / path) as im:
                _img_cache[path] = im.size
        except Exception:
            _img_cache[path] = (800, 800)
            warn(f'нет файла/не читается: {path}')
    return _img_cache[path]


def thumb_of(p):
    cands = [p.get('thumb'), f"thumbs/{p['availability']}-{p['id']}.webp"]
    for c in cands:
        if c and (ROOT / c).exists():
            return c
    return p['photos'][0]


# ---------------------------------------------------------------- цены

def price_opts(p, branch=None):
    prices = p.get('prices') or {}
    if branch and branch in prices:
        o = prices[branch]
    elif 'default' in prices:
        o = prices['default']
    else:
        o = {}
        for v in prices.values():
            for k, x in v.items():
                if isinstance(x, (int, float)):
                    o[k] = min(o.get(k, x), x)
    return {k: v for k, v in o.items() if isinstance(v, (int, float))}


def pmin(p, branch=None):
    o = price_opts(p, branch)
    if o:
        return min(o.values())
    if p.get('optBase'):
        on = set(p.get('optDefaults') or [])
        return p['optBase'] + sum(x['price'] for x in p.get('opts', []) if x['k'] in on)
    return None


def heat_delta(p, branch=None):
    o = price_opts(p, branch)
    if 'heated' in o and 'unheated' in o:
        return o['heated'] - o['unheated']
    return None


# ---------------------------------------------------------------- слаги

def body_slugs():
    used, out = set(), {}
    for s in ('E', 'F', 'G', 'U'):
        for codes, name in BODIES[s]:
            first = codes.split(' / ')[0].lower()
            slug = f'bmw-{first}'
            if slug in used:
                slug = f"bmw-{name.lower().replace(' ', '').replace('/', '')}-{first}"
            used.add(slug)
            out[(s, codes, name)] = slug
    return out


def wheel_slugs():
    from collections import Counter
    cnt = Counter(p['displayNumber'].lower() for p in CATALOG)
    out = {}
    for p in CATALOG:
        s = p['displayNumber'].lower()
        if cnt[s] > 1:
            s += '-' + p['availability']
        out[p['id']] = s
    return out


BODY_SLUG = body_slugs()
WHEEL_SLUG = wheel_slugs()
WHEEL_BY_ID = {p['id']: p for p in CATALOG}


def series_wheels(s):
    key = 'G' if s == 'U' else s
    return [p for p in CATALOG if p['series'] == key or key in (p.get('compatibleSeries') or [])]


def branch_of(s, codes):
    if s == 'E':
        return 'E60' if codes == 'E60' else 'Eother'
    return None


# ---------------------------------------------------------------- оболочка страницы

_ep = urlparse(CFG.get('stats_endpoint') or '')
_ep_origin = f'{_ep.scheme}://{_ep.netloc}' if _ep.netloc and _ep.netloc not in ('script.google.com',) else ''
CSP = ("default-src 'self'; script-src 'self' https://mc.yandex.ru; style-src 'self' 'unsafe-inline'; "
       "font-src 'self'; img-src 'self' data: blob: https://mc.yandex.ru https://mc.yandex.com; "
       "media-src 'self' blob:; connect-src 'self' https://script.google.com https://script.googleusercontent.com "
       "https://mc.yandex.ru https://mc.yandex.com" + (' ' + _ep_origin if _ep_origin else '') +
       "; frame-src https://mc.yandex.ru https://mc.yandex.com; base-uri 'self'; object-src 'none'; form-action 'none'")


def seo_head(title, desc, canonical, image=None, robots=None):
    """Блок мета-тегов: description, canonical, Open Graph, подтверждение Яндекса."""
    parts = [f'<meta name="description" content="{esc(desc)}">',
             f'<link rel="canonical" href="{esc(canonical)}">',
             '<meta property="og:type" content="website">',
             f'<meta property="og:site_name" content="{esc(BRAND)}">',
             '<meta property="og:locale" content="ru_RU">',
             f'<meta property="og:title" content="{esc(title)}">',
             f'<meta property="og:description" content="{esc(desc)}">',
             f'<meta property="og:url" content="{esc(canonical)}">',
             f'<meta property="og:image" content="{esc(image or absurl("photos/001.jpg"))}">',
             '<meta name="twitter:card" content="summary_large_image">']
    if robots:
        parts.append(f'<meta name="robots" content="{robots}">')
    if CFG.get('yandex_verification'):
        parts.append(f'<meta name="yandex-verification" content="{esc(CFG["yandex_verification"])}">')
    return '\n'.join(parts)


def script_block(rel):
    return (f'<script src="{rel}stats-config.js?v={VER}" defer></script>'
            f'<script src="{rel}consent.js?v={VER}" defer></script>'
            f'<script src="{rel}analytics.js?v={VER}" defer></script>')


def ld(*items):
    return ''.join('<script type="application/ld+json">' + json.dumps(i, ensure_ascii=False, separators=(',', ':'))
                   .replace('</', '<\\/') + '</script>' for i in items)


def crumbs_html(rel, items):
    """items: [(название, путь_от_корня или None для текущей)]"""
    lis = []
    for i, (name, path) in enumerate(items):
        if path is None:
            lis.append(f'<li aria-current="page">{esc(name)}</li>')
        else:
            lis.append(f'<li><a href="{rel}{path}">{esc(name)}</a></li>')
    return '<nav class="crumbs" aria-label="Хлебные крошки"><ol>' + ''.join(lis) + '</ol></nav>'


def page(depth, path, title, desc, main, ld_html='', image=None, data=None, noindex=False):
    rel = '../' * depth
    attrs = ''.join(f' data-{k}="{esc(v)}"' for k, v in (data or {}).items())
    canonical = absurl(path)
    return f'''<!doctype html>
<html lang="ru"{attrs}><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<title>{esc(title)}</title>
{seo_head(title, desc, canonical, image, 'noindex' if noindex else None)}
<link rel="icon" href="{rel}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{rel}seo.css?v={VER}">
{ld_html}{script_block(rel)}
</head><body>
<a class="skip" href="#main">Перейти к содержимому</a>
<header class="top"><a class="logo" href="{rel}index.html">{esc(BRAND)}</a>
<nav aria-label="Основная навигация"><a href="{rel}ruli/">Рули по кузовам</a><a href="{rel}index.html#/build">Собрать руль</a><a href="{rel}index.html#/catalog">Каталог</a></nav></header>
<main id="main">{main}</main>
<footer class="foot"><nav aria-label="Нижняя навигация"><a href="{rel}ruli/">Рули по кузовам</a><a href="{rel}index.html#/build">Конструктор</a><a href="{rel}delivery.html">Доставка и оплата</a><a href="{rel}contacts.html">Контакты</a><a href="{rel}privacy.html">Политика конфиденциальности</a><a href="{rel}returns.html">Возврат и гарантия</a><button type="button" data-consent-open>Настройки статистики</button></nav>
<p>{esc(BRAND)} · Каталог BMW, Mercedes-Benz и Porsche · Совместимость проверяем перед заказом</p></footer>
</body></html>
'''


# ---------------------------------------------------------------- блоки

def tg_link(text):
    return f'https://t.me/{TG}?text={quote(text)}'


def card(rel, p, branch=None, alt_for=None):
    num = p['displayNumber']
    src = thumb_of(p)
    w, h = img_size(src)
    alt = f'Руль № {num} для {SERIES_NAME[p["series"]]}' + (f', подбор на {alt_for}' if alt_for else '')
    pr = pmin(p, branch)
    price = f'от{NBSP}{money(pr)}' if pr else 'Цена по запросу'
    mode = 'В наличии' if p['availability'] == 'stock' else 'Под заказ'
    mat = p.get('material')
    href = f'{rel}rul/{WHEEL_SLUG[p["id"]]}/'
    return (f'<article class="card"><a class="card-img" href="{href}"><img src="{rel}{src}" width="{w}" height="{h}" '
            f'loading="lazy" decoding="async" alt="{esc(alt)}"></a><div class="card-body">'
            f'<span class="tag{" stock" if p["availability"] == "stock" else ""}">{mode}</span>'
            f'<h3><a href="{href}">Руль № {esc(num)}</a></h3>'
            + (f'<p class="mat">{esc(mat)}</p>' if mat else '') +
            f'<p class="price">{price}</p></div></article>')


def faq_html(items):
    return '<div class="faq">' + ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>'
                                          for q, a in items) + '</div>'


def faq_ld(items):
    return {'@context': 'https://schema.org', '@type': 'FAQPage',
            'mainEntity': [{'@type': 'Question', 'name': q,
                            'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in items]}


def bc_ld(items):
    """items: [(название, путь)] — последний путь тоже обязателен для разметки."""
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList',
            'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': absurl(pth)}
                                for i, (n, pth) in enumerate(items)]}


def delivery_block(stock_note=True):
    li = [
        'Доставка по России и в другие страны (отправляем во все страны, где есть СДЭК).',
        'Самовывоз в Одинцово, 24/7 — договоритесь с менеджером о времени.',
        'Предоплата 3 000 ₽ (5 000 ₽ для рулей от 50 000 ₽), остальное при получении.',
        'Срок: под заказ около трёх недель.',
    ]
    if stock_note:
        li.append('Руль из наличия отправляем в день заказа, оплата при получении.')
    li.append('Гарантия на руль — 6 месяцев.')
    return ('<section class="block"><h2>Доставка и оплата</h2><ul class="list">' + ''.join(f'<li>{esc(x)}</li>' for x in li)
            + '</ul><p><a href="{REL}delivery.html">Подробнее о доставке и оплате</a></p></section>')


def cta_row(rel, text, buy_key, buy_label, builder):
    return (f'<div class="cta"><a class="btn primary" href="{esc(tg_link(text))}" data-buy="{esc(buy_key)}" '
            f'data-buy-label="{esc(buy_label)}" rel="noopener">Заказать в Telegram</a>'
            f'<a class="btn" href="{builder}">Собрать в конструкторе</a></div>'
            f'<p class="hint">В Telegram откроется готовое сообщение: «{esc(text)}».</p>')


def builder_link(rel, series):
    if series == 'F':
        return f'{rel}wheel-builder.html?model=bmw-fseries'
    if series in ('G', 'U'):
        return f'{rel}g-builder.html'
    return f'{rel}index.html#/build'


def feature_rows(wheels, branch=None, with_opts=False):
    rows = []
    deltas = [d for d in (heat_delta(p, branch) for p in wheels if not p.get('opts') or with_opts) if d]
    if deltas:
        lo, hi = min(deltas), max(deltas)
        val = f'доплата {money(lo)}' if lo == hi else f'доплата от {money(lo)} до {money(hi)} в зависимости от руля'
        rows.append(('Подогрев', val + ' (разница между комплектациями «с подогревом» и «без»)'))
    agg = {}
    for p in (wheels if with_opts else []):
        for o in p.get('opts', []):
            agg.setdefault(o['k'], []).append(o['price'])
    for k in ('heat', 'carbon', 'led', 'acc', 'vib'):
        if k in agg:
            lo, hi = min(agg[k]), max(agg[k])
            val = f'+{money(lo)}' if lo == hi else f'от +{money(lo)} до +{money(hi)}'
            rows.append((OPT_LABELS[k], val))
    return rows


def features_block(wheels, branch=None, series=None):
    rows = feature_rows(wheels, branch, series not in ('E', 'F', 'G', 'U'))
    extra = []
    have = {r[0] for r in rows}
    if series in ('E', 'F', 'G', 'U'):
        if 'Вибрация' not in have:
            extra.append(('Вибрация', 'выбирается в заявке; стоимость подтверждает менеджер'))
        if 'Адаптивный круиз' not in have:
            extra.append(('Круиз-контроль', 'выбирается в заявке; стоимость подтверждает менеджер'))
    body = ''.join(f'<tr><th scope="row">{esc(a)}</th><td>{esc(b)}</td></tr>' for a, b in rows + extra)
    return ('<section class="block"><h2>Функции и доплаты</h2><table class="tbl"><tbody>' + body + '</tbody></table>'
            '<p class="hint">Для отдельных рулей с карбоном или LED-экраном опции и цены указаны на странице самого руля. Установка нового руля сама по себе не добавляет подогрев, вибрацию или адаптивный круиз: '
            'выбор функции — пожелание к комплектации, возможность дооснащения обсуждается отдельно.</p></section>')


# ---------------------------------------------------------------- тексты кузова

def series_facts(s, wheels, codes=None, branch=None):
    n = len(wheels)
    stock = [p for p in wheels if p['availability'] == 'stock']
    if s == 'F' and stock:
        t = (f'Из них {len(stock)} {plural(len(stock), ("руль", "руля", "рулей"))} в наличии — такие отправляем в день заказа, '
             'остальные изготавливаем под заказ, это около трёх недель.')
    elif s == 'E':
        t = 'Рули E-серии доступны под заказ, срок около трёх недель, точный срок подтверждает менеджер.'
        t += (' Цены группы E60 действуют только для рестайлинга.' if branch == 'E60'
              else ' Цены указаны для группы «Другие кузова E».')
    elif s == 'U':
        t = 'Рули и цены — как у G-серии, отличаются кнопки: подберём их по фото вашего руля. Рули изготавливаем под заказ, это около трёх недель.'
    else:
        t = 'Рули этой серии изготавливаем под заказ, это около трёх недель.'
    return t


def body_paragraphs(idx, s, codes, name, wheels, cards, branch):
    lab = f'{name} {codes}' if not name.endswith('серия') else codes
    n = len(wheels)
    S = SERIES_TITLE[s if s != 'U' else 'G'].replace('-серия', '')
    prices = [pmin(p, branch) for p in cards if pmin(p, branch)]
    cmin, cmax = money(min(prices)), money(max(prices))
    deltas = [d for d in (heat_delta(p, branch) for p in wheels) if d]
    if deltas:
        lo, hi = min(deltas), max(deltas)
        heat = (f'Подогрев добавляется к цене: доплата {money(lo)}' if lo == hi
                else f'Подогрев добавляется к цене: доплата от {money(lo)} до {money(hi)} в зависимости от руля') + '.'
    else:
        heat = ''
    v = idx % 3
    p1 = [
        f'Ищете руль на BMW {codes}? Здесь собраны рули {S}-серии из нашего каталога: всего {n} {plural(n, ("вариант", "варианта", "вариантов"))}, у каждого есть реальные фотографии и цена. '
        f'В подборке ниже для этого кузова цены начинаются от {cmin}, самый дорогой вариант — {cmax}.',
        f'Для BMW {lab} ({name}) мы подбираем рули из {S}-серии: в каталоге их {n}. Смотрите фотографии, сравнивайте комплектации и ориентируйтесь на цену: '
        f'в подборке на этой странице она начинается от {cmin} и доходит до {cmax}.',
        f'Владельцам BMW {lab} ({name}) доступен каталог из {n} рулей {S}-серии. Мы показываем настоящие фотографии каждого руля, а цену указываем «от»: '
        f'итоговую сумму для вашей комплектации назовём в Telegram. Диапазон цен в подборке — {cmin} – {cmax}.',
    ][v]
    p2 = series_facts(s, wheels, codes, branch) + (' ' + heat if heat else '')
    p3 = [
        'Совместимость мы подтверждаем перед заказом: пришлите менеджеру кузов, год и фотографию вашего штатного руля, и мы проверим крепление, кнопки и разъёмы. '
        'Серия помогает сузить выбор, а окончательный подбор делаем под конкретный автомобиль.',
        'Чтобы руль подошёл, напишите менеджеру кузов, год выпуска и пришлите фото вашего нынешнего руля. Мы проверим крепление, кнопки и разъёмы: '
        'серия — лишь ориентир, окончательный подбор делается под автомобиль.',
        'Не уверены, какой руль подойдёт? Отправьте менеджеру фото штатного руля, кузов и год — подскажем, что подойдёт. '
        'Крепление, кнопки и разъёмы проверяем перед заказом, а не после.',
    ][(idx + 1) % 3]
    p4 = ('Подогрев, вибрацию и круиз-контроль можно выбрать в заявке, а можно собрать руль самому в конструкторе: материалы, цвет, строчка и отделка. '
          'Предоплата 3 000 ₽ (5 000 ₽ для рулей от 50 000 ₽), на руль даём гарантию 6 месяцев.')
    cp = sorted(cards, key=lambda p: pmin(p, branch))
    cheap, dear = cp[0], cp[-1]
    p5 = (f'В подборке на этой странице самый доступный вариант — руль № {cheap["displayNumber"]} от {money(pmin(cheap, branch))}, '
          f'а самый дорогой — руль № {dear["displayNumber"]} от {money(pmin(dear, branch))}. Каждый руль можно открыть, посмотреть все фотографии и комплектации.')
    p6 = ('Как заказать: откройте понравившийся руль и нажмите «Заказать в Telegram» — в сообщении будут номер модели и выбранные функции. '
          'Отправьте его менеджеру и приложите фото вашего руля.')
    return [p1, p2, p3, p5, p4, p6]


def build_body_page(idx, s, codes, name, slug, all_in_series):
    branch = branch_of(s, codes)
    wheels = series_wheels(s)
    # подборка из 12 карточек: сначала наличие, потом остальные, со сдвигом на странице (разные подборки на разных страницах)
    order = sorted(wheels, key=lambda p: (p['availability'] != 'stock',))
    stock = [p for p in order if p['availability'] == 'stock']
    rest = [p for p in order if p['availability'] != 'stock']
    off = (idx * 7) % max(1, len(rest))
    rest = rest[off:] + rest[:off]
    cards = (stock + [p for p in rest if pmin(p, branch)])[:12]
    rel = '../../'
    path = f'ruli/{slug}/'
    first = codes.split(' / ')[0]
    is_m = name.startswith('M') and name[1:].isdigit()
    named = not name.endswith('серия')
    lab = f'{name} {codes}' if named else codes
    h1 = f'Руль на BMW {lab}'
    sub = f'{name} · {SERIES_TITLE[s]}'
    title = f'Руль на BMW {lab} — карбон, алькантара, подогрев | {BRAND}'
    prices = [pmin(p, branch) for p in wheels if pmin(p, branch)]
    pmn = money(min(prices))
    desc = fit(f'Руль на BMW {lab}' + ('' if named else f' ({name})') + f': {len(wheels)} {plural(len(wheels), ("руль", "руля", "рулей"))} с фото и ценами от {pmn}.',
               ['Подогрев, вибрация, круиз.', 'Под заказ около 3 недель.', 'Доставка по России и в другие страны.',
                'Заказ в Telegram.', 'Самовывоз в Одинцово.'], 140, 160)
    paras = body_paragraphs(idx, s, codes, name, wheels, cards, branch)
    _sib = [(c, n) for c, n in BODIES[s]]
    _a, _b = _sib[idx - 1], _sib[(idx + 1) % len(_sib)]
    if len(_sib) > 2:
        paras.insert(4, f'Выбираете между кузовами {SERIES_TITLE[s].replace("-серия", "-серии")}? Посмотрите также {_a[1]} ({_a[0]}) и {_b[1]} ({_b[0]}): для них у нас отдельные страницы с подборкой рулей.')
    words = len(' '.join(paras).split())
    if not 150 <= words <= 300:
        warn(f'{slug}: текст {words} слов')
    text = ''.join(f'<p>{esc(x)}</p>' for x in paras)
    series_key = 'G' if s == 'U' else s
    heats = [pmin(p, branch) for p in wheels if heat_delta(p, branch)]
    hprices = [price_opts(p, branch).get('heated') for p in wheels if price_opts(p, branch).get('heated')]
    faq = [
        (f'Подойдёт ли руль на BMW {lab}?',
         f'Мы подбираем руль под конкретный автомобиль: пришлите менеджеру кузов, год и фото штатного руля, и мы проверим крепление, кнопки и разъёмы до заказа.'),
        (f'Сколько стоит руль на BMW {lab}?',
         f'Цены в каталоге начинаются от {pmn} за руль без подогрева' + (f', с подогревом — от {money(min(hprices))}' if hprices else '')
         + '. Точную сумму для вашей комплектации назовём в Telegram.'),
        ('Сколько ждать руль?',
         'Под заказ срок изготовления около трёх недель.' + (' Рули из наличия отправляем в день заказа.' if series_key == 'F' else '')),
        ('Нужна ли предоплата?', 'Да: 3 000 ₽, для рулей от 50 000 ₽ — 5 000 ₽. Остальное при получении.'),
        ('Куда доставляете и можно ли забрать самому?',
         'Отправляем по России и в другие страны, где есть СДЭК. Самовывоз — в Одинцово, 24/7, по договорённости с менеджером.'),
        ('Появятся ли подогрев, вибрация и круиз, если их не было?',
         'Выбор функции в каталоге — пожелание к комплектации. Установка нового руля сама по себе не добавляет подогрев, вибрацию или адаптивный круиз; возможность дооснащения нужно обсудить отдельно.'),
    ]
    sibs = [(c, n, BODY_SLUG[(s, c, n)]) for c, n in BODIES[s]]
    chips = ''.join(f'<a class="chip{" on" if sl == slug else ""}" href="{rel}ruli/{sl}/">{esc(c)} · {esc(n)}</a>'
                    for c, n, sl in sibs)
    sidx = [x[2] for x in sibs].index(slug)
    prev_, next_ = sibs[sidx - 1], sibs[(sidx + 1) % len(sibs)]
    grid = ''.join(card(rel, p, branch, f'BMW {codes}') for p in cards)
    series_page = f'{rel}ruli/{SERIES_SLUG[series_key]}/' if series_key in SERIES_SLUG else f'{rel}ruli/'
    crumbs = [('Главная', 'index.html'), ('Рули по кузовам', 'ruli/'),
              (SERIES_TITLE[series_key], f'ruli/{SERIES_SLUG[series_key]}/'), (h1, None)]
    msg = f'Хочу руль на BMW {codes}'
    main = (crumbs_html(rel, crumbs) + f'<h1>{esc(h1)}</h1><p class="lead">{esc(sub)}</p>'
            + cta_row(rel, msg, 'body:' + first, 'Заказать в Telegram (страница кузова)', builder_link(rel, s))
            + f'<section class="prose">{text}</section>'
            + f'<section class="block"><h2>Рули для BMW {esc(lab)}</h2><div class="grid">{grid}</div>'
              f'<p class="more"><a class="btn" href="{series_page}">Все {len(wheels)} {plural(len(wheels), ("руль", "руля", "рулей"))} {SERIES_TITLE[series_key]}</a></p></section>'
            + features_block(wheels, branch, s)
            + delivery_block(series_key == 'F').replace('{REL}', rel)
            + f'<section class="block"><h2>Вопросы про руль на BMW {esc(lab)}</h2>{faq_html(faq)}</section>'
            + f'<section class="block"><h2>Другие кузова: {SERIES_TITLE[s]}</h2><div class="chips">{chips}</div>'
              f'<p class="nav2"><a href="{rel}ruli/{prev_[2]}/">← {esc(prev_[0])}</a><a href="{rel}ruli/">Все кузова</a>'
              f'<a href="{rel}ruli/{next_[2]}/">{esc(next_[0])} →</a></p></section>')
    ldh = ld(bc_ld([(n, p_ if p_ else path) for n, p_ in crumbs]), faq_ld(faq))
    img = absurl(thumb_of(cards[0])) if cards else None
    return path, title, desc, main, ldh, img, {'route': path.rstrip('/'), 'kind': 'body'}


# ---------------------------------------------------------------- страницы серий, марок, хаб

def listing_page(path, key, h1, title, intro, wheels, crumbs, desc_extra, series_for_builder, bodies=None, branch=None):
    rel = '../../'
    prices = [pmin(p) for p in wheels if pmin(p)]
    pmn = money(min(prices))
    desc = fit(f'{h1}: {len(wheels)} {plural(len(wheels), ("руль", "руля", "рулей"))} с фото и ценами от {pmn}.', desc_extra, 140, 160)
    grid = ''.join(card(rel, p) for p in wheels)
    chips = ''
    if bodies:
        chips = ('<section class="block"><h2>Выберите кузов</h2><div class="chips">' + ''.join(
            f'<a class="chip" href="{rel}ruli/{sl}/">{esc(c)} · {esc(n)}</a>' for c, n, sl in bodies) + '</div></section>')
    rows = features_block(wheels, None, series_for_builder if series_for_builder in ('E', 'F', 'G') else None)
    faq = [
        ('Сколько стоит руль?', f'В каталоге цены начинаются от {pmn}. Цена указана «от», точную сумму для вашей комплектации назовём в Telegram.'),
        ('Сколько ждать?', 'Под заказ около трёх недель. Рули из наличия (если есть) отправляем в день заказа.'),
        ('Нужна ли предоплата?', 'Да: 3 000 ₽, для рулей от 50 000 ₽ — 5 000 ₽.'),
        ('Как проверить совместимость?', 'Пришлите менеджеру кузов, год и фото штатного руля — крепление, кнопки и разъёмы проверяем до заказа.'),
    ]
    main = (crumbs_html(rel, crumbs) + f'<h1>{esc(h1)}</h1>'
            + f'<section class="prose">{"".join(f"<p>{esc(x)}</p>" for x in intro)}</section>'
            + cta_row(rel, f'Хочу руль: {h1.replace("Рули ", "")}', 'list:' + key, 'Заказать в Telegram (страница серии)', builder_link(rel, series_for_builder))
            + chips
            + f'<section class="block"><h2>Все рули ({len(wheels)})</h2><div class="grid">{grid}</div></section>'
            + rows + delivery_block().replace('{REL}', rel)
            + f'<section class="block"><h2>Частые вопросы</h2>{faq_html(faq)}</section>')
    ldh = ld(bc_ld([(n, p_ if p_ else path) for n, p_ in crumbs]), faq_ld(faq))
    return path, title, desc, main, ldh, absurl(thumb_of(wheels[0])), {'route': path.rstrip('/'), 'kind': 'list'}


def build_hub():
    rel = '../'
    path = 'ruli/'
    title = f'Рули BMW, Mercedes-Benz и Porsche по кузовам — каталог и цены | {BRAND}'
    desc = fit('Руль на ваш BMW E, F, G, а также Mercedes-Benz и Porsche: выберите кузов, посмотрите фото и цены.',
               ['Под заказ около 3 недель.', 'Доставка по России и миру.', 'Заказ в Telegram.'], 140, 160)
    sec = []
    for s in ('E', 'F', 'G', 'U'):
        links = ''.join(f'<a class="chip" href="{rel}ruli/{BODY_SLUG[(s, c, n)]}/">{esc(c)} · {esc(n)}</a>' for c, n in BODIES[s])
        head = f'<a href="{rel}ruli/{SERIES_SLUG[s]}/">Рули BMW {SERIES_TITLE[s]}</a>' if s in SERIES_SLUG else 'Рули для U-кузовов BMW'
        sec.append(f'<section class="block"><h2>{head}</h2><div class="chips">{links}</div></section>')
    others = (f'<section class="block"><h2>Другие марки</h2><div class="chips">'
              f'<a class="chip" href="{rel}ruli/mercedes/">Рули Mercedes-Benz</a><a class="chip" href="{rel}ruli/porsche/">Рули Porsche</a></div></section>')
    crumbs = [('Главная', 'index.html'), ('Рули по кузовам', None)]
    intro = ('<section class="prose"><p>Выберите свой кузов — на странице будут рули из нашего каталога с реальными фотографиями, ценами «от», '
             'доплатами за функции и условиями доставки. Если кузова нет в списке или вы не уверены в выборе, пришлите менеджеру фото штатного руля: '
             'совместимость подтверждаем до заказа.</p><p>Вместо готового руля можно собрать свой в конструкторе: материалы, цвет, строчка, отделка.</p></section>')
    main = (crumbs_html(rel, crumbs) + '<h1>Рули по кузовам</h1>' + intro
            + cta_row(rel, 'Хочу руль на свой кузов', 'list:hub', 'Заказать в Telegram (хаб)', f'{rel}index.html#/build')
            + ''.join(sec) + others)
    ldh = ld(bc_ld([('Главная', 'index.html'), ('Рули по кузовам', path)]))
    return path, title, desc, main, ldh, None, {'route': 'ruli', 'kind': 'hub'}


def build_lists():
    out = []
    for s in ('E', 'F', 'G'):
        wheels = series_wheels(s)
        bodies = [(c, n, BODY_SLUG[(s, c, n)]) for c, n in BODIES[s]]
        if s == 'G':
            bodies += [(c, n, BODY_SLUG[('U', c, n)]) for c, n in BODIES['U']]
        h1 = f'Рули BMW {SERIES_TITLE[s]}'
        title = f'Руль BMW {SERIES_TITLE[s]} — все кузова, цены и фото | {BRAND}'
        intro = [f'В каталоге {len(wheels)} {plural(len(wheels), ("руль", "руля", "рулей"))} для {SERIES_NAME[s]}. '
                 f'У каждого есть реальные фотографии, цена «от» и комплектации. Выберите свой кузов, чтобы увидеть подборку, или пролистайте весь список.',
                 series_facts(s, wheels) + ' Совместимость подтверждаем перед заказом по кузову, году и фото вашего штатного руля.']
        out.append(listing_page(f'ruli/{SERIES_SLUG[s]}/', s, h1, title, intro, wheels,
                                [('Главная', 'index.html'), ('Рули по кузовам', 'ruli/'), (h1, None)],
                                ['Подогрев, вибрация, круиз.', 'Под заказ около 3 недель.', 'Доставка по России и миру.', 'Заказ в Telegram.', 'Гарантия 6 месяцев.'], s, bodies))
    mb = [p for p in CATALOG if p['series'] == 'Mercedes']
    out.append(listing_page('ruli/mercedes/', 'Mercedes', 'Рули Mercedes-Benz',
                            f'Руль Mercedes-Benz — каталог AMG, цены и фото | {BRAND}',
                            [f'В каталоге {len(mb)} {plural(len(mb), ("руль", "руля", "рулей"))} Mercedes-Benz. Все рули изготавливаем под заказ, срок около трёх недель.',
                             'Для каждого руля показываем фотографии, цену «от» и доступные опции: подогрев, карбоновую отделку, адаптивный круиз, вибрацию. '
                             'Совместимость подтверждаем перед заказом по модели, году и фото штатного руля.'],
                            mb, [('Главная', 'index.html'), ('Рули по кузовам', 'ruli/'), ('Рули Mercedes-Benz', None)],
                            ['Подогрев, вибрация, круиз.', 'Под заказ около 3 недель.', 'Доставка по России и миру.', 'Заказ в Telegram.', 'Гарантия 6 месяцев.'], 'Mercedes'))
    pb = [p for p in CATALOG if p['series'] == 'Porsche']
    out.append(listing_page('ruli/porsche/', 'Porsche', 'Рули Porsche',
                            f'Руль Porsche — каталог, цены и фото | {BRAND}',
                            [f'В каталоге {len(pb)} {plural(len(pb), ("руль", "руля", "рулей"))} Porsche. Все рули изготавливаем под заказ, срок около трёх недель.',
                             'У каждого руля есть реальные фотографии и цена. Совместимость подтверждаем перед заказом по модели, году и фото штатного руля.'],
                            pb, [('Главная', 'index.html'), ('Рули по кузовам', 'ruli/'), ('Рули Porsche', None)],
                            ['Подбор по фото руля.', 'Под заказ около 3 недель.', 'Доставка по России и миру.', 'Заказ в Telegram.', 'Гарантия 6 месяцев.'], 'Porsche'))
    return out


# ---------------------------------------------------------------- страница руля

def build_wheel(p, order):
    rel = '../../'
    slug = WHEEL_SLUG[p['id']]
    path = f'rul/{slug}/'
    num = p['displayNumber']
    s = p['series']
    sname = SERIES_NAME[s]
    brand = SERIES_BRAND[s]
    pr = pmin(p)
    stock = p['availability'] == 'stock'
    mat = p.get('material')
    dup = slug.endswith('-stock') or slug.endswith('-order')
    mtag = (' (в наличии)' if stock else ' (под заказ)') if dup else ''
    h1 = f'Руль № {num} — {sname}{mtag}'
    title = f'Руль № {num}{mtag} для {sname} — цена{" от " + money(pr) if pr else ""}, фото | {BRAND}'
    short = ''
    if mat:
        short = mat if len(mat) <= 70 else mat[:70].rsplit(' ', 1)[0].rstrip(',;·+ ')
    desc = fit(f'Руль № {num} для {sname}' + (f': {short}.' if short else '.') + (f' Цена от {money(pr)}.' if pr else ''),
               ['В наличии, отправка в день заказа.' if stock else 'Под заказ, около 3 недель.',
                'Фото, комплектации, заказ в Telegram.', 'Доставка по России и миру.', 'Гарантия 6 месяцев.', 'Предоплата 3 000 ₽.', 'Самовывоз в Одинцово.'], 140, 160)
    # фото
    imgs = []
    for i, ph in enumerate(p['photos']):
        w, h = img_size(ph)
        alt = f'Руль № {num} для {sname}, фото {i + 1}' + (f' — {short}' if short and i == 0 else '')
        attrs = 'fetchpriority="high"' if i == 0 else 'loading="lazy"'
        imgs.append(f'<img src="{rel}{ph}" width="{w}" height="{h}" {attrs} decoding="async" alt="{esc(alt)}">')
    gallery = f'<div class="gallery">{"".join(imgs)}</div>'
    # цены
    rows = []
    if p.get('optBase'):
        rows.append(f'<tr><th scope="row">{esc(p.get("baseLabel") or "Кожаный руль")}</th><td>{money(p["optBase"])}</td></tr>')
        on = set(p.get('optDefaults') or [])
        for o in p.get('opts', []):
            lab = o.get('l') or OPT_LABELS.get(o['k'], o['k'])
            rows.append(f'<tr><th scope="row">+ {esc(lab)}{" (входит в цену «от»)" if o["k"] in on else ""}</th><td>+{money(o["price"])}</td></tr>')
    else:
        prices = p.get('prices') or {}
        label = {'unheated': 'Без подогрева', 'heated': 'С подогревом', 'single': 'По каталогу'}
        for bk, o in prices.items():
            opt = {k: v for k, v in o.items() if isinstance(v, (int, float))}
            if not opt:
                continue
            pre = ''
            if len(prices) > 1:
                pre = {'E60': 'E60 (только рестайлинг): ', 'Eother': 'Другие кузова E: '}.get(bk, bk + ': ')
            for k in ('unheated', 'heated', 'single'):
                if k in opt:
                    rows.append(f'<tr><th scope="row">{pre}{label[k]}</th><td>{money(opt[k])}</td></tr>')
    ptable = ('<table class="tbl"><tbody>' + ''.join(rows) + '</tbody></table>') if rows else '<p>Цена по запросу</p>'
    price_line = f'<p class="bigprice">от{NBSP}{money(pr)}</p>' if pr else ''
    mode = ('В наличии — отправляем в день заказа, оплата при получении.' if stock
            else 'Под заказ — изготовление около трёх недель.')
    facts = [f'Руль № {num} из каталога {sname}.', mode]
    if mat:
        facts.append(f'Материалы и отделка: {mat}.')
    if p.get('hasScreen'):
        facts.append('Руль с экраном.')
    if p.get('video'):
        facts.append('В каталоге на сайте есть видео этого руля.')
    facts.append('Совместимость с вашим автомобилем подтверждаем перед заказом по кузову, году и фото штатного руля.')
    facts.append('Предоплата 3 000 ₽ (5 000 ₽ для рулей от 50 000 ₽), гарантия на руль 6 месяцев.')
    skey = 'G' if s == 'G' else s
    crumbs = [('Главная', 'index.html'), ('Рули по кузовам', 'ruli/')]
    if s in SERIES_SLUG:
        crumbs.append((SERIES_TITLE[s], f'ruli/{SERIES_SLUG[s]}/'))
    else:
        crumbs.append((SERIES_NAME[s], f'ruli/{s.lower()}/'))
    crumbs.append((f'Руль № {num}', None))
    # соседи по серии
    same = [x for x in order if x['series'] == s and x['id'] != p['id'] and pmin(x)]
    pos = [x['id'] for x in order if x['series'] == s].index(p['id'])
    ids = [x['id'] for x in order if x['series'] == s]
    near = [WHEEL_BY_ID[ids[(pos + k) % len(ids)]] for k in (1, 2, 3, 4)]
    near = [x for x in near if x['id'] != p['id']]
    bodies = ''
    if s in SERIES_SLUG:
        ch = [(c, n, BODY_SLUG[(s, c, n)]) for c, n in BODIES[s]]
        if s == 'G':
            ch += [(c, n, BODY_SLUG[('U', c, n)]) for c, n in BODIES['U']]
        bodies = ('<section class="block"><h2>Подобрать на свой кузов</h2><div class="chips">' + ''.join(
            f'<a class="chip" href="{rel}ruli/{sl}/">{esc(c)} · {esc(n)}</a>' for c, n, sl in ch) + '</div></section>')
    spa = f'{rel}index.html#/wheel/{p["availability"]}/{quote(p["id"])}/{s}'
    msg = f'Хочу руль № {num} ({sname})'
    main = (crumbs_html(rel, crumbs) + f'<h1>{esc(h1)}</h1>'
            + f'<div class="wheel-top">{gallery}<div class="wheel-info"><span class="tag{" stock" if stock else ""}">{"В наличии" if stock else "Под заказ"}</span>'
              f'{price_line}{ptable}'
              f'<div class="cta"><a class="btn primary" href="{esc(tg_link(msg))}" data-buy="{esc(p["id"])}" data-buy-label="Заказать в Telegram (страница руля)" rel="noopener">Заказать в Telegram</a>'
              f'<a class="btn" href="{spa}">Открыть в каталоге</a></div>'
              f'<p class="hint">В Telegram откроется сообщение: «{esc(msg)}».</p></div></div>'
            + '<section class="prose">' + ''.join(f'<p>{esc(x)}</p>' for x in facts) + '</section>'
            + bodies
            + delivery_block(stock).replace('{REL}', rel)
            + f'<section class="block"><h2>Ещё рули {esc(sname)}</h2><div class="grid">{"".join(card(rel, x) for x in near)}</div></section>')
    offers = []
    if pr:
        avail = 'https://schema.org/InStock' if stock else 'https://schema.org/PreOrder'
        if p.get('optBase'):
            offers.append({'@type': 'Offer', 'price': str(pmin(p)), 'priceCurrency': 'RUB', 'availability': avail,
                           'url': absurl(path), 'itemCondition': 'https://schema.org/NewCondition'})
        else:
            lab = {'unheated': 'Без подогрева', 'heated': 'С подогревом', 'single': 'По каталогу'}
            for bk, o in (p.get('prices') or {}).items():
                for k, v in o.items():
                    if isinstance(v, (int, float)) and k in lab:
                        offers.append({'@type': 'Offer', 'name': lab[k], 'price': str(int(v)), 'priceCurrency': 'RUB',
                                       'availability': avail, 'url': absurl(path),
                                       'itemCondition': 'https://schema.org/NewCondition'})
    prod = {'@context': 'https://schema.org', '@type': 'Product', 'name': f'Руль № {num} для {sname}',
            'sku': p['id'], 'mpn': num, 'brand': {'@type': 'Brand', 'name': brand},
            'image': [absurl(x) for x in p['photos'][:6]],
            'description': ' '.join(facts[:3])}
    if offers:
        prod['offers'] = offers[0] if len(offers) == 1 else offers
    ldh = ld(bc_ld([(n, p_ if p_ else path) for n, p_ in crumbs]), prod)
    return path, title, desc, main, ldh, absurl(p['photos'][0]), {'route': path.rstrip('/'), 'kind': 'wheel', 'product': p['id']}


# ---------------------------------------------------------------- существующие страницы

PAGE_META = {
    'index.html': None,  # у главной уже есть title/description, добавляем canonical, og:url, скрипты
    'delivery.html': ('Доставка и оплата рулей BMW — сроки, предоплата, самовывоз', 'Как мы доставляем рули BMW, Mercedes-Benz и Porsche: отправка по России и в другие страны, сроки изготовления под заказ, предоплата и самовывоз в Одинцово.'),
    'contacts.html': ('Контакты и данные продавца — BMW Steering Wheels', 'Как связаться с продавцом рулей BMW Steering Wheels: Telegram для заказа и подбора руля, данные продавца и порядок обращений.'),
    'returns.html': ('Возврат и гарантия на руль — BMW Steering Wheels', 'Условия возврата и гарантии на рули BMW Steering Wheels: гарантия 6 месяцев, порядок обращения и что делать при проблеме с товаром.'),
    'privacy.html': ('Политика обработки персональных данных — BMW Steering Wheels', 'Как сайт BMW Steering Wheels обрабатывает данные: анонимная статистика только с вашего согласия, Яндекс Метрика, cookie и ваши права по 152-ФЗ.'),
    'consent.html': ('Согласие на обработку данных — BMW Steering Wheels', 'Образец согласия на обработку персональных данных при обращении к продавцу рулей BMW Steering Wheels.'),
    'terms.html': ('Условия продажи — BMW Steering Wheels', 'Условия продажи рулей BMW Steering Wheels: заказ, оплата, доставка, возврат и гарантия.'),
    'wheel-builder.html': None,
    'g-builder.html': None,
}
NOINDEX_KEEP = {'consent.html', 'terms.html'}


def patch_html(text, fname):
    """Идемпотентно вписывает SEO-блок и скрипты в существующую страницу."""
    meta = PAGE_META.get(fname)
    canonical = absurl('' if fname == 'index.html' else fname)
    # убираем прежние версии
    text = re.sub(r'<!--seo-->.*?<!--/seo-->', '', text, flags=re.S)
    text = re.sub(r'<link rel="canonical"[^>]*>', '', text)
    text = re.sub(r'<meta name="yandex-verification"[^>]*>', '', text)
    text = re.sub(r'<meta property="og:(url|image|locale)"[^>]*>', '', text)
    text = re.sub(r'<script src="(stats-config|consent|analytics)\.js[^>]*></script>', '', text)
    title_m = re.search(r'<title>(.*?)</title>', text, flags=re.S)
    if meta:
        title, desc = meta
        text = re.sub(r'<title>.*?</title>', f'<title>{esc(title)}</title>', text, flags=re.S)
        text = re.sub(r'<meta name="description"[^>]*>', '', text)
        text = re.sub(r'<meta property="og:(type|site_name|title|description)"[^>]*>', '', text)
        block = seo_head(title, desc, canonical)
    else:
        title = html.unescape(title_m.group(1)) if title_m else BRAND
        dm = re.search(r'<meta name="description" content="([^"]*)"', text)
        desc = html.unescape(dm.group(1)) if dm else ''
        block = '\n'.join([f'<link rel="canonical" href="{esc(canonical)}">',
                           f'<meta property="og:url" content="{esc(canonical)}">',
                           f'<meta property="og:image" content="{esc(absurl("photos/001.jpg"))}">',
                           '<meta property="og:locale" content="ru_RU">']
                          + ([f'<meta name="yandex-verification" content="{esc(CFG["yandex_verification"])}">']
                             if CFG.get('yandex_verification') else []))
        if 'property="og:title"' not in text:
            block = seo_head(title, desc, canonical)
    if fname in PAGE_META and PAGE_META[fname] and fname not in NOINDEX_KEEP:
        text = re.sub(r'<meta name="robots" content="noindex">', '', text)
    # CSP: добавляем разрешения для Метрики и сборщика (только на этих доменах)
    text = re.sub(r'(<meta http-equiv="Content-Security-Policy" content=")[^"]*(")', lambda m: m.group(1) + CSP + m.group(2), text)
    text = text.replace('<head>', '<head>', 1)
    text = re.sub(r'(<meta charset="utf-8">)', r'\1<!--seo-->' + (block + script_block('')).replace('\\', '\\\\') + '<!--/seo-->', text, count=1)
    if fname == 'index.html':
        if 'href="ruli/"' not in text:
            text = text.replace('<a href="#/catalog" data-nav="catalog">Каталог</a>',
                                '<a href="#/catalog" data-nav="catalog">Каталог</a><a href="ruli/">Рули по кузовам</a>', 1)
            text = text.replace('<a href="privacy.html">Конфиденциальность</a>',
                                '<a href="ruli/">Рули по кузовам</a><a href="privacy.html">Конфиденциальность</a>', 1)
            text = text.replace('<nav aria-label="Документы и контакты"><a href="contacts.html">',
                                '<nav aria-label="Документы и контакты"><a href="ruli/">Рули по кузовам</a><a href="contacts.html">', 1)
            text = text.replace('<noscript><p>Включите JavaScript для подбора. Также можно',
                                '<noscript><p>Включите JavaScript для подбора или откройте <a href="ruli/">рули по кузовам</a>. Также можно', 1)
        if 'data-consent-open' not in text:
            text = text.replace('<footer class="legal-footer"', '<footer class="legal-footer"', 1)
            text = text.replace('<a href="returns.html">Возврат и гарантия</a>',
                                '<a href="returns.html">Возврат и гарантия</a><a href="#" data-consent-open>Настройки статистики</a>', 1)
    return text


def patch_existing():
    for fname in PAGE_META:
        f = ROOT / fname
        if not f.exists():
            continue
        f.write_text(patch_html(f.read_text(encoding='utf-8'), fname), encoding='utf-8')


# ---------------------------------------------------------------- запись

def write_page(spec):
    path, title, desc, main, ldh, img, data = spec
    depth = len(path.strip('/').split('/'))
    out = ROOT / path / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page(depth, path, title, desc, main, ldh, img, data), encoding='utf-8')
    return title, desc


def main():
    for d in ('ruli', 'rul'):
        shutil.rmtree(ROOT / d, ignore_errors=True)
    specs = [build_hub()] + build_lists()
    for s in ('E', 'F', 'G', 'U'):
        for i, (codes, name) in enumerate(BODIES[s]):
            specs.append(build_body_page(i, s, codes, name, BODY_SLUG[(s, codes, name)], BODIES[s]))
    order = sorted(CATALOG, key=lambda p: (p['series'], p['availability'] != 'stock', p['displayNumber']))
    for p in CATALOG:
        specs.append(build_wheel(p, order))
    seen_t, seen_d, urls = {}, {}, []
    for spec in specs:
        t, d = write_page(spec)
        if t in seen_t:
            warn(f'повтор title: {t}')
        if d in seen_d:
            warn(f'повтор description: {d[:60]}')
        seen_t[t] = seen_d[d] = 1
        urls.append(spec[0])
    # sitemap
    today = date.today().isoformat()
    entries = [('', 'weekly', '1.0'), ('ruli/', 'weekly', '0.9')]
    entries += [(u, 'weekly', '0.8') for u in urls if u.startswith('ruli/') and u != 'ruli/']
    entries += [(u, 'weekly', '0.6') for u in urls if u.startswith('rul/')]
    entries += [(f, 'monthly', '0.3') for f in ('delivery.html', 'contacts.html', 'returns.html', 'privacy.html')]
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u, cf, pr in entries:
        xml.append(f'  <url><loc>{esc(absurl(u))}</loc><lastmod>{today}</lastmod><changefreq>{cf}</changefreq><priority>{pr}</priority></url>')
    xml.append('</urlset>')
    (ROOT / 'sitemap.xml').write_text('\n'.join(xml) + '\n', encoding='utf-8')
    base = urlparse(SITE).path.rstrip('/')
    (ROOT / 'robots.txt').write_text(
        f'User-agent: *\nAllow: /\nDisallow: {base}/stats.html\nDisallow: {base}/stats.js\n\nSitemap: {SITE}/sitemap.xml\n', encoding='utf-8')
    (ROOT / 'stats-config.js').write_text(
        '/* Создаётся build_pages.py из site.config.json. Здесь нет паролей: адрес приёма событий (только запись) и номер счётчика Метрики. */\n'
        f'window.BMW_STATS_ENDPOINT={json.dumps(CFG.get("stats_endpoint", ""))};\n'
        f'window.BMW_METRIKA_ID={json.dumps(str(CFG.get("metrika_id", "")))};\n', encoding='utf-8')
    patch_existing()
    print(f'Готово: страниц сгенерировано {len(specs)} (хаб, серии, кузова, рули), в sitemap {len(entries)} адресов.')
    if WARN:
        print('Предупреждения:')
        for w in WARN:
            print(' -', w)
    return 0


if __name__ == '__main__':
    sys.exit(main())
