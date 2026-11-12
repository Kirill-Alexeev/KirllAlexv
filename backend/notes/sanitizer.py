"""Очистка HTML заметок.

Редактор на фронтенде умеет только жирный, курсив, подчёркивание, списки
(маркированный, нумерованный, чекбоксы) и блоки фото с подписью. Всё остальное
(стили, шрифты, ссылки, скрипты) выбрасывается, текст при этом сохраняется.
"""
import re
from html import escape
from html.parser import HTMLParser

IMAGE_ID = re.compile(r'^\d+$')

# тег -> {атрибут: проверка значения}
ALLOWED = {
    'p': {},
    'div': {},
    'br': {},
    'b': {},
    'strong': {},
    'i': {},
    'em': {},
    'u': {},
    'ol': {},
    'ul': {'data-type': lambda v: v == 'checklist'},
    'li': {'data-checked': lambda v: v == 'true'},
    'figure': {
        'data-image-id': IMAGE_ID.match,
        'data-align': lambda v: v in ('left', 'right'),
        'data-size': lambda v: v in ('s', 'm', 'l'),
    },
    'figcaption': {},
    'img': {'data-image-id': IMAGE_ID.match},
}
VOID = {'br', 'img'}
# Содержимое этих тегов не показываем вовсе
DROP_CONTENT = {'script', 'style', 'template', 'iframe', 'object', 'noscript', 'head', 'title'}
BLOCKS = {'p', 'div', 'li', 'ul', 'ol', 'figure', 'figcaption', 'br'}


class _Sanitizer(HTMLParser):
    def __init__(self, allowed_image_ids):
        super().__init__(convert_charrefs=True)
        self.allowed_image_ids = allowed_image_ids
        self.out = []
        self.stack = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in DROP_CONTENT:
            self.skip_depth += 1
            return
        if self.skip_depth or tag not in ALLOWED:
            return
        rules = ALLOWED[tag]
        clean = []
        for name, value in attrs:
            check = rules.get(name)
            if check and value is not None and check(value):
                clean.append((name, value))
        if tag == 'img':
            image_id = dict(clean).get('data-image-id')
            if not image_id or (
                self.allowed_image_ids is not None and int(image_id) not in self.allowed_image_ids
            ):
                return
        rendered = ''.join(f' {name}="{escape(value)}"' for name, value in clean)
        self.out.append(f'<{tag}{rendered}>')
        if tag not in VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.stack and self.stack[-1] == tag:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag in DROP_CONTENT:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if self.skip_depth or tag in VOID or tag not in self.stack:
            return
        # Закрываем всё, что осталось открытым внутри
        while self.stack:
            current = self.stack.pop()
            self.out.append(f'</{current}>')
            if current == tag:
                break

    def handle_data(self, data):
        if not self.skip_depth:
            self.out.append(escape(data, quote=False))

    def result(self):
        self.close()
        while self.stack:
            self.out.append(f'</{self.stack.pop()}>')
        return ''.join(self.out)


def sanitize_note_html(value, allowed_image_ids=None):
    """allowed_image_ids — id фото, которые можно оставить в тексте (None — любые)"""
    if not value:
        return ''
    parser = _Sanitizer(allowed_image_ids)
    parser.feed(value)
    return parser.result().strip()


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in DROP_CONTENT:
            self.skip_depth += 1
        elif tag in BLOCKS:
            self.parts.append(' ')

    def handle_endtag(self, tag):
        if tag in DROP_CONTENT:
            self.skip_depth = max(0, self.skip_depth - 1)
        elif tag in BLOCKS:
            self.parts.append(' ')

    def handle_data(self, data):
        if not self.skip_depth:
            self.parts.append(data)


def html_to_text(value):
    if not value:
        return ''
    parser = _TextExtractor()
    parser.feed(value)
    parser.close()
    return ' '.join(''.join(parser.parts).split())
