from rest_framework import serializers
from .models import ChatRoom, ChatMessage, User


class ChatRoomSerializer(serializers.ModelSerializer):
    unread_count = serializers.IntegerField(read_only=True, default=0)
    latest_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'key', 'room_type', 'title', 'participants', 'last_message_at', 'updated_at', 'unread_count', 'latest_message']

    def get_latest_message(self, obj):
        message = obj.messages.select_related('sender').order_by('-created_at', '-id').first()
        if not message:
            return None
        return {
            'id': message.id,
            'text': message.text,
            'created_at': message.created_at,
            'sender': {
                'id': message.sender_id,
                'username': message.sender.username,
            },
            'recipient_username': message.recipient_username,
            'is_private': message.is_private,
            'client_message_id': message.client_message_id,
        }


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'client_message_id', 'room', 'sender', 'recipient_username', 'text', 'is_private', 'created_at']

    def get_sender(self, obj):
        return {
            'id': obj.sender_id,
            'username': obj.sender.username,
        }
