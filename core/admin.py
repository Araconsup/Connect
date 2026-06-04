from django.contrib import admin
from .models import User, Post, MediaFile, Reel, Connect, Music, ChatRoom, ChatMessage


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'is_staff', 'is_active')


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('user', 'caption', 'created_at')


@admin.register(MediaFile)
class MediaFileAdmin(admin.ModelAdmin):
    list_display = ('post', 'file')


@admin.register(Reel)
class ReelAdmin(admin.ModelAdmin):
    list_display = ('user', 'caption', 'created_at')


@admin.register(Connect)
class ConnectAdmin(admin.ModelAdmin):
    list_display = ('user', 'text', 'created_at')


@admin.register(Music)
class MusicAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'created_at')


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ('key', 'room_type', 'last_message_at', 'updated_at')
    search_fields = ('key', 'title')
    list_filter = ('room_type',)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('room', 'sender', 'recipient_username', 'is_private', 'created_at')
    search_fields = ('text', 'sender__username', 'recipient_username', 'room__key')
    list_filter = ('is_private', 'created_at')
