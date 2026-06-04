from rest_framework import serializers
from .models import User, Post, MediaFile, Reel, Connect, Music, Like, Comment

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    class Meta:
        model = User
        fields = ['id', 'username', 'bio', 'profile_pic', 'password']
        extra_kwargs = {
            'profile_pic': {'required': False},
            'bio': {'required': False},
            'username': {'required': False},
            'password': {'write_only': True, 'required': False},
        }

class MediaFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaFile
        fields = ['id', 'file']

class PostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    media_files = MediaFileSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()
    class Meta:
        model = Post
        fields = ['id', 'user', 'caption', 'created_at', 'media_files', 'likes_count', 'comments_count', 'liked']

    def get_likes_count(self, obj):
        try:
            return obj.likes.count()
        except Exception:
            return 0

    def get_comments_count(self, obj):
        try:
            return obj.comments.count()
        except Exception:
            return 0

    def get_liked(self, obj):
        request = self.context.get('request') if self.context else None
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return obj.likes.filter(user=user).exists()

class ReelSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()
    class Meta:
        model = Reel
        fields = ['id', 'user', 'video', 'caption', 'created_at', 'likes_count', 'comments_count', 'liked']

    def get_likes_count(self, obj):
        try:
            return obj.likes.count()
        except Exception:
            return 0

    def get_comments_count(self, obj):
        try:
            return obj.comments.count()
        except Exception:
            return 0

    def get_liked(self, obj):
        request = self.context.get('request') if self.context else None
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return obj.likes.filter(user=user).exists()

class ConnectSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()
    class Meta:
        model = Connect
        fields = ['id', 'user', 'text', 'created_at', 'likes_count', 'comments_count', 'liked']

    def get_likes_count(self, obj):
        try:
            return obj.likes.count()
        except Exception:
            return 0

    def get_comments_count(self, obj):
        try:
            return obj.comments.count()
        except Exception:
            return 0

    def get_liked(self, obj):
        request = self.context.get('request') if self.context else None
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return obj.likes.filter(user=user).exists()

class MusicSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()
    class Meta:
        model = Music
        fields = ['id', 'user', 'title', 'artist', 'cover', 'file', 'created_at', 'likes_count', 'comments_count', 'liked']

    def get_likes_count(self, obj):
        try:
            return obj.likes.count()
        except Exception:
            return 0

    def get_comments_count(self, obj):
        try:
            return obj.comments.count()
        except Exception:
            return 0

    def get_liked(self, obj):
        request = self.context.get('request') if self.context else None
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return obj.likes.filter(user=user).exists()


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'user', 'text', 'created_at']
