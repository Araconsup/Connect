from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType


class User(AbstractUser):
    bio = models.TextField(blank=True, null=True)
    profile_pic = models.ImageField(upload_to='profile_pics/', blank=True, null=True)

    def __str__(self):
        return self.username


class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    caption = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    likes = GenericRelation('Like', related_query_name='post')
    comments = GenericRelation('Comment', related_query_name='post')

    def __str__(self):
        return f"{self.user.username} - {self.caption[:20]}"


class MediaFile(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='media_files')
    file = models.FileField(upload_to='media_files/')

    def __str__(self):
        return f"Media for {self.post.id}"


class Reel(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reels')
    video = models.FileField(upload_to='reels/')
    caption = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reel by {self.user.username}"

    likes = GenericRelation('Like', related_query_name='reel')
    comments = GenericRelation('Comment', related_query_name='reel')


class Connect(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='connects')
    text = models.CharField(max_length=280)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Connect by {self.user.username}: {self.text[:20]}"

    likes = GenericRelation('Like', related_query_name='connect')
    comments = GenericRelation('Comment', related_query_name='connect')


class Music(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='musics')
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255, blank=True, null=True)
    cover = models.ImageField(upload_to='music_covers/', blank=True, null=True)
    file = models.FileField(upload_to='music/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        artist_part = f" by {self.artist}" if self.artist else ''
        return f"Music: {self.title}{artist_part} (uploaded by {self.user.username})"

    likes = GenericRelation('Like', related_query_name='music')
    comments = GenericRelation('Comment', related_query_name='music')


class ChatRoom(models.Model):
    ROOM_PUBLIC = 'public'
    ROOM_PRIVATE = 'private'
    ROOM_TYPES = (
        (ROOM_PUBLIC, 'Public'),
        (ROOM_PRIVATE, 'Private'),
    )

    key = models.CharField(max_length=255, unique=True)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPES, default=ROOM_PUBLIC)
    title = models.CharField(max_length=255, blank=True, default='')
    participants = models.JSONField(default=list, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_chat_rooms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def participant_names(self):
        value = self.participants or []
        return [str(item) for item in value if str(item).strip()]

    def __str__(self):
        return self.title or self.key


class ChatMessage(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    recipient_username = models.CharField(max_length=150, blank=True, default='')
    client_message_id = models.CharField(max_length=80, blank=True, default='')
    text = models.TextField()
    is_private = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']

    def __str__(self):
        return f'{self.sender.username}: {self.text[:20]}'


class Like(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes')
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'content_type', 'object_id')
        ordering = ['-created_at']


class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.text[:20]}"
