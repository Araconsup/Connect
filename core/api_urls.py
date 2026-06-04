from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, ReelViewSet, ConnectViewSet, MusicViewSet, UserViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')
router.register(r'reels', ReelViewSet, basename='reel')
router.register(r'connects', ConnectViewSet, basename='connect')
router.register(r'musics', MusicViewSet, basename='music')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('chat/', include('core.chat_urls')),
]
