from rest_framework import serializers

from .models import Note, NoteImage, NoteTag
from .sanitizer import sanitize_note_html

PREVIEW_LENGTH = 160
MAX_IMAGE_SIZE = 10 * 1024 * 1024


def _image_url(request, image):
    url = image.image.url
    return request.build_absolute_uri(url) if request else url


class NoteTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoteTag
        fields = ['id', 'title']
        read_only_fields = ['id']

    def validate_title(self, value):
        title = value.strip()
        if not title:
            raise serializers.ValidationError('Введите название тега')
        user = self.context['request'].user
        # iexact в SQLite не понимает кириллицу, поэтому сравниваем в Python
        same = NoteTag.objects.filter(user=user)
        if self.instance:
            same = same.exclude(pk=self.instance.pk)
        if any(tag.title.casefold() == title.casefold() for tag in same):
            raise serializers.ValidationError('Такой тег уже есть')
        return title


class NoteImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = NoteImage
        fields = ['id', 'image', 'url']
        read_only_fields = ['id', 'url']
        extra_kwargs = {'image': {'write_only': True}}

    def get_url(self, obj):
        return _image_url(self.context.get('request'), obj)

    def validate_image(self, value):
        if value.size > MAX_IMAGE_SIZE:
            raise serializers.ValidationError('Фото должно быть не больше 10 МБ')
        return value


class NoteListSerializer(serializers.ModelSerializer):
    """Карточка заметки в списке: без полного текста"""
    tags = NoteTagSerializer(many=True, read_only=True)
    preview = serializers.SerializerMethodField()
    cover = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = ['id', 'title', 'preview', 'cover', 'tags', 'created_at', 'updated_at']

    def get_preview(self, obj):
        text = obj.text
        if len(text) <= PREVIEW_LENGTH:
            return text
        return text[:PREVIEW_LENGTH].rstrip() + '…'

    def get_cover(self, obj):
        """Первое фото в тексте заметки"""
        images = {image.id: image for image in obj.images.all()}
        for image_id in obj.image_ids_in_content():
            if image_id in images:
                return _image_url(self.context.get('request'), images[image_id])
        return None


class NoteSerializer(NoteListSerializer):
    tag_ids = serializers.PrimaryKeyRelatedField(
        source='tags',
        many=True,
        write_only=True,
        required=False,
        queryset=NoteTag.objects.none(),
    )
    images = NoteImageSerializer(many=True, read_only=True)

    class Meta(NoteListSerializer.Meta):
        fields = NoteListSerializer.Meta.fields + ['content', 'images', 'tag_ids']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            self.fields['tag_ids'].child_relation.queryset = NoteTag.objects.filter(
                user=request.user)

    def validate_title(self, value):
        return value.strip()

    def validate_content(self, value):
        # Оставляем в тексте только фото, загруженные в эту заметку
        allowed = set(self.instance.images.values_list('id', flat=True)) if self.instance else set()
        return sanitize_note_html(value, allowed)
