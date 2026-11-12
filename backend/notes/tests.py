import io
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APITestCase

from users.models import User
from .models import Note, NoteImage, NoteTag
from .sanitizer import html_to_text, sanitize_note_html

MEDIA_ROOT = tempfile.mkdtemp()


def make_image(name='photo.png'):
    buffer = io.BytesIO()
    Image.new('RGB', (4, 4), 'green').save(buffer, format='PNG')
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')


class SanitizerTests(TestCase):
    def test_keeps_allowed_formatting(self):
        html = ('<p><b>Ж</b> <i>К</i> <u>П</u></p>'
                '<ul data-type="checklist"><li data-checked="true">Молоко</li><li>Хлеб</li></ul>'
                '<ol><li>Раз</li></ol>')
        self.assertEqual(sanitize_note_html(html), html)

    def test_strips_styles_scripts_and_links(self):
        html = ('<p style="font-family: Comic Sans" onclick="x()">Текст'
                '<a href="http://evil">ссылка</a><script>alert(1)</script></p>'
                '<span style="color:red">ещё</span>')
        self.assertEqual(sanitize_note_html(html), '<p>Текстссылка</p>ещё')

    def test_images_only_from_allowed_set(self):
        html = ('<figure data-image-id="1" data-align="left" data-size="m" contenteditable="false">'
                '<img data-image-id="1" src="http://x/1.png"><figcaption>Подпись</figcaption></figure>'
                '<figure data-image-id="2"><img data-image-id="2"></figure>')
        clean = sanitize_note_html(html, {1})
        self.assertIn('<img data-image-id="1">', clean)
        self.assertNotIn('data-image-id="2">', clean.split('<figure data-image-id="2">')[1])
        self.assertNotIn('src=', clean)
        self.assertNotIn('contenteditable', clean)

    def test_closes_unclosed_tags(self):
        self.assertEqual(sanitize_note_html('<p><b>жирный'), '<p><b>жирный</b></p>')

    def test_text_extraction(self):
        self.assertEqual(html_to_text('<p>Раз</p><ul><li>два</li></ul>'), 'Раз два')


@override_settings(MEDIA_ROOT=MEDIA_ROOT)
class NotesApiTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.user = User.objects.create_user(username='u', email='u@x.ru', password='pass12345')
        self.other = User.objects.create_user(username='o', email='o@x.ru', password='pass12345')
        self.client.force_authenticate(self.user)

    def test_crud_and_isolation(self):
        r = self.client.post('/api/notes/notes/', {'title': ' Покупки ', 'content': '<p>Молоко</p>'})
        self.assertEqual(r.status_code, 201)
        note_id = r.data['id']
        self.assertEqual(r.data['title'], 'Покупки')
        self.assertEqual(r.data['preview'], 'Молоко')

        r = self.client.patch(f'/api/notes/notes/{note_id}/', {'content': '<p>Хлеб</p>'})
        self.assertEqual(r.data['content'], '<p>Хлеб</p>')

        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f'/api/notes/notes/{note_id}/').status_code, 404)
        self.assertEqual(self.client.get('/api/notes/notes/').data, [])

        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.delete(f'/api/notes/notes/{note_id}/').status_code, 204)
        self.assertFalse(Note.objects.exists())

    def test_search_is_case_insensitive_for_cyrillic(self):
        Note.objects.create(user=self.user, title='Список', content='<p>Купить МОЛОКО</p>')
        Note.objects.create(user=self.user, title='Другое')
        r = self.client.get('/api/notes/notes/', {'search': 'молоко'})
        self.assertEqual([n['title'] for n in r.data], ['Список'])

    def test_tags(self):
        r = self.client.post('/api/notes/tags/', {'title': 'Дом'})
        self.assertEqual(r.status_code, 201)
        tag_id = r.data['id']
        self.assertEqual(self.client.post('/api/notes/tags/', {'title': 'дом'}).status_code, 400)

        foreign = NoteTag.objects.create(user=self.other, title='Чужой')
        r = self.client.post('/api/notes/notes/', {'title': 'x', 'tag_ids': [foreign.id]}, format='json')
        self.assertEqual(r.status_code, 400)

        r = self.client.post('/api/notes/notes/', {'title': 'x', 'tag_ids': [tag_id]}, format='json')
        self.assertEqual([t['id'] for t in r.data['tags']], [tag_id])
        Note.objects.create(user=self.user, title='без тега')
        filtered = self.client.get('/api/notes/notes/', {'tag': tag_id}).data
        self.assertEqual(len(filtered), 1)

    def test_image_upload_and_cover(self):
        note = Note.objects.create(user=self.user, title='Фото')
        r = self.client.post(f'/api/notes/notes/{note.id}/images/', {'image': make_image()},
                             format='multipart')
        self.assertEqual(r.status_code, 201)
        image_id = r.data['id']
        self.assertTrue(r.data['url'].startswith('http://testserver/media/notes/'))

        content = (f'<figure data-image-id="{image_id}" data-align="right">'
                   f'<img data-image-id="{image_id}"><figcaption>Кот</figcaption></figure><p>Текст</p>')
        r = self.client.patch(f'/api/notes/notes/{note.id}/', {'content': content})
        self.assertIn(f'<img data-image-id="{image_id}">', r.data['content'])
        self.assertEqual(r.data['cover'], r.data['images'][0]['url'])

        # Фото чужой заметки вставить нельзя
        other_note = Note.objects.create(user=self.user, title='Другая')
        r = self.client.patch(f'/api/notes/notes/{other_note.id}/', {'content': content})
        self.assertNotIn('<img', r.data['content'])

        note.delete()
        self.assertFalse(NoteImage.objects.filter(id=image_id).exists())

    def test_rejects_non_image(self):
        note = Note.objects.create(user=self.user)
        bad = SimpleUploadedFile('x.png', b'not an image', content_type='image/png')
        r = self.client.post(f'/api/notes/notes/{note.id}/images/', {'image': bad}, format='multipart')
        self.assertEqual(r.status_code, 400)
