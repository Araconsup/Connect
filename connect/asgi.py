"""
ASGI config for connect project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""
import os
# Ensure settings module is set before importing Django parts
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'connect.settings')
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

django_asgi_app = get_asgi_application()

from core.routing import websocket_urlpatterns
from connect.token_auth_middleware import TokenAuthMiddlewareStack

application = ProtocolTypeRouter({
	'http': django_asgi_app,
	'websocket': TokenAuthMiddlewareStack(
		AuthMiddlewareStack(
			URLRouter(
				websocket_urlpatterns
			)
		)
	),
})
