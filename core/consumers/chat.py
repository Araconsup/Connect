from __future__ import annotations

import json
from datetime import timezone

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from core.chat_utils import PUBLIC_ROOM_KEY, is_private_room, room_participants_from_key, safe_group_name
from core.models import ChatMessage, ChatRoom


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs'].get('room_name') or PUBLIC_ROOM_KEY
        self.room_group_name = safe_group_name(self.room_name)
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        try:
            data = json.loads(text_data)
        except Exception:
            return

        text = (data.get('text') or data.get('message') or '').strip()
        if not text:
            return

        user = self.scope.get('user')
        if not user or not getattr(user, 'is_authenticated', False):
            return

        recipient_username = str(data.get('to') or '').strip()
        private = bool(data.get('private') or is_private_room(self.room_name) or recipient_username)
        participants = room_participants_from_key(self.room_name)
        if private and recipient_username:
            participants = sorted({*(participants or []), user.username, recipient_username})
        elif not participants:
            participants = [user.username] if self.room_name != PUBLIC_ROOM_KEY else []

        room = await self._get_or_create_room(participants, private)
        client_message_id = str(data.get('client_id') or data.get('client_message_id') or data.get('id') or '').strip()

        message = await self._save_message(
            room=room,
            sender=user,
            text=text,
            recipient_username=recipient_username,
            private=private,
            client_message_id=client_message_id,
        )

        payload = {
            'id': message.id,
            'client_id': message.client_message_id or client_message_id,
            'room': self.room_name,
            'text': message.text,
            'message': message.text,
            'username': user.username,
            'user': {
                'id': user.id,
                'username': user.username,
            },
            'private': message.is_private,
            'to': message.recipient_username,
            'recipient_username': message.recipient_username,
            'created_at': message.created_at.isoformat(),
        }

        await self.channel_layer.group_send(self.room_group_name, {
            'type': 'chat.message',
            'payload': payload,
        })

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event.get('payload', {})))

    @database_sync_to_async
    def _get_or_create_room(self, participants, private):
        room, _ = ChatRoom.objects.get_or_create(
            key=self.room_name,
            defaults={
                'room_type': ChatRoom.ROOM_PRIVATE if private else ChatRoom.ROOM_PUBLIC,
                'participants': participants or [],
                'title': 'Public chat' if self.room_name == PUBLIC_ROOM_KEY else '',
            },
        )
        changed = False
        if participants and room.participants != participants:
            room.participants = participants
            changed = True
        expected_type = ChatRoom.ROOM_PRIVATE if private else ChatRoom.ROOM_PUBLIC
        if room.room_type != expected_type:
            room.room_type = expected_type
            changed = True
        if changed:
            room.save(update_fields=['participants', 'room_type', 'updated_at'])
        return room

    @database_sync_to_async
    def _save_message(self, room, sender, text, recipient_username, private, client_message_id):
        if client_message_id:
            message, created = ChatMessage.objects.get_or_create(
                room=room,
                sender=sender,
                client_message_id=client_message_id,
                defaults={
                    'recipient_username': recipient_username,
                    'text': text,
                    'is_private': private,
                },
            )
            if not created:
                room.last_message_at = message.created_at
                room.save(update_fields=['last_message_at', 'updated_at'])
                return message
        message = ChatMessage.objects.create(
            room=room,
            sender=sender,
            recipient_username=recipient_username,
            text=text,
            is_private=private,
            client_message_id=client_message_id,
        )
        room.last_message_at = message.created_at
        room.save(update_fields=['last_message_at', 'updated_at'])
        return message
