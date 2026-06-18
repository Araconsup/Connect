from urllib.parse import parse_qs

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken


class TokenAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Work on a copy of scope so we don't mutate shared state
        scope = dict(scope)
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]
        if token:
            try:
                access_token = AccessToken(token)
                user_id = access_token.get('user_id')
                if user_id:
                    User = get_user_model()
                    try:
                        user = await database_sync_to_async(User.objects.get)(id=user_id)
                        scope['user'] = user
                    except Exception:
                        scope['user'] = AnonymousUser()
                else:
                    scope['user'] = AnonymousUser()
            except Exception:
                scope['user'] = AnonymousUser()
        else:
            scope.setdefault('user', AnonymousUser())

        return await self.inner(scope, receive, send)


def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(inner)
