from __future__ import annotations

from django.db.models import Max
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .chat_serializers import ChatMessageSerializer, ChatRoomSerializer
from .authentication import OptionalJWTAuthentication
from .chat_utils import PUBLIC_ROOM_KEY, is_private_room, room_participants_from_key
from .models import ChatMessage, ChatRoom
from .chat_utils import safe_group_name


class ChatRoomListView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = [OptionalJWTAuthentication]

    def get(self, request):
        username = getattr(request.user, 'username', '') if getattr(request.user, 'is_authenticated', False) else ''
        rooms = list(
            ChatRoom.objects.all()
            .annotate(latest_at=Max('messages__created_at'))
            .order_by('-last_message_at', '-updated_at', '-id')
        )
        visible = []
        for room in rooms:
            participants = room.participants or []
            if room.key == PUBLIC_ROOM_KEY or not is_private_room(room.key) or (username and username in participants):
                visible.append(room)
        serializer = ChatRoomSerializer(visible, many=True, context={'request': request})
        return Response(serializer.data)


class ChatMessageListView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = [OptionalJWTAuthentication]

    def _room_payload(self, room):
        return {
            'id': room.id,
            'key': room.key,
            'room_type': room.room_type,
            'participants': room.participants,
            'title': room.title,
            'last_message_at': room.last_message_at,
        }

    def _room_for_request(self, request, room_key, allow_anonymous_public=True):
        is_authenticated = getattr(request.user, 'is_authenticated', False)
        room, _ = ChatRoom.objects.get_or_create(
            key=room_key,
            defaults={
                'room_type': 'private' if is_private_room(room_key) else 'public',
                'participants': room_participants_from_key(room_key),
                'created_by': request.user if is_authenticated else None,
                'title': 'Public chat' if room_key == PUBLIC_ROOM_KEY else '',
            },
        )
        if room.key == PUBLIC_ROOM_KEY and allow_anonymous_public:
            return room, True, ''
        is_private = room.key != PUBLIC_ROOM_KEY and is_private_room(room.key)
        username = getattr(request.user, 'username', '') if is_authenticated else ''
        if is_private and (not is_authenticated or username not in (room.participants or [])):
            return room, False, username
        return room, True, username

    def get(self, request):
        room_key = (request.query_params.get('room') or PUBLIC_ROOM_KEY).strip() or PUBLIC_ROOM_KEY
        room, allowed, _ = self._room_for_request(request, room_key)
        if not allowed:
            return Response({'detail': 'Not allowed.'}, status=403)

        limit = min(int(request.query_params.get('limit') or 150), 300)
        messages = list(room.messages.select_related('sender').order_by('-created_at', '-id')[:limit])
        messages.reverse()
        serializer = ChatMessageSerializer(messages, many=True, context={'request': request})
        return Response({
            'room': self._room_payload(room),
            'messages': serializer.data,
        })

    def post(self, request):
        room_key = str(request.data.get('room') or PUBLIC_ROOM_KEY).strip() or PUBLIC_ROOM_KEY
        room, allowed, username = self._room_for_request(request, room_key, allow_anonymous_public=False)
        if not getattr(request.user, 'is_authenticated', False):
            return Response({'detail': 'Authentication required.'}, status=401)
        if not allowed:
            return Response({'detail': 'Not allowed.'}, status=403)

        text = str(request.data.get('text') or request.data.get('message') or '').strip()
        if not text:
            return Response({'detail': 'Message text is required.'}, status=400)

        recipient_username = str(request.data.get('to') or request.data.get('recipient_username') or '').strip()
        private = bool(request.data.get('private') or room.key != PUBLIC_ROOM_KEY or recipient_username)
        participants = room_participants_from_key(room.key)
        if private and recipient_username:
            participants = sorted({*(participants or []), request.user.username, recipient_username})
        elif not participants and room.key != PUBLIC_ROOM_KEY:
            participants = [request.user.username]

        if room.participants != participants:
            room.participants = participants
            room.save(update_fields=['participants', 'updated_at'])

        client_message_id = str(request.data.get('client_id') or request.data.get('client_message_id') or request.data.get('id') or '').strip()
        message, created = ChatMessage.objects.get_or_create(
            room=room,
            sender=request.user,
            client_message_id=client_message_id,
            defaults={
                'recipient_username': recipient_username,
                'text': text,
                'is_private': private,
            },
        )
        if not created:
            # Refresh room timestamp and return the existing message for idempotent retries.
            room.last_message_at = message.created_at
            room.save(update_fields=['last_message_at', 'updated_at'])
        else:
            room.last_message_at = message.created_at
            room.save(update_fields=['last_message_at', 'updated_at'])

        payload = {
            'id': message.id,
            'client_id': message.client_message_id or client_message_id,
            'client_message_id': message.client_message_id or client_message_id,
            'room': room.key,
            'text': message.text,
            'message': message.text,
            'username': request.user.username,
            'user': {
                'id': request.user.id,
                'username': request.user.username,
            },
            'sender': {
                'id': request.user.id,
                'username': request.user.username,
            },
            'private': message.is_private,
            'to': message.recipient_username,
            'recipient_username': message.recipient_username,
            'created_at': message.created_at.isoformat(),
        }

        channel_layer = get_channel_layer()
        if channel_layer is not None:
            async_to_sync(channel_layer.group_send)(safe_group_name(room.key), {
                'type': 'chat.message',
                'payload': payload,
            })

        serializer = ChatMessageSerializer(message, context={'request': request})
        return Response({
            'room': self._room_payload(room),
            'message': serializer.data,
        }, status=201)

