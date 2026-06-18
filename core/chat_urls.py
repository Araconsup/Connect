from django.urls import path
from .chat_views import ChatRoomListView, ChatMessageListView

urlpatterns = [
    path('rooms/', ChatRoomListView.as_view(), name='chat-rooms'),
    path('messages/', ChatMessageListView.as_view(), name='chat-messages'),
]
