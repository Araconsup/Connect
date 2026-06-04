
from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.contenttypes.models import ContentType
from .models import Post, MediaFile, Reel, Connect, Music, User, Like, Comment
from .serializers import PostSerializer, MediaFileSerializer, ReelSerializer, ConnectSerializer, MusicSerializer, UserSerializer, CommentSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction

class PostViewSet(viewsets.ModelViewSet):
	queryset = Post.objects.all().order_by('-created_at')
	serializer_class = PostSerializer
	permission_classes = [permissions.IsAuthenticatedOrReadOnly]

	@action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
	def like(self, request, pk=None):
		obj = self.get_object()
		ct = ContentType.objects.get_for_model(obj)
		like, created = Like.objects.get_or_create(user=request.user, content_type=ct, object_id=obj.pk)
		if not created:
			# Already liked, so remove
			like.delete()
			liked = False
		else:
			liked = True
		count = Like.objects.filter(content_type=ct, object_id=obj.pk).count()
		return Response({'success': True, 'liked': liked, 'likes_count': count})

	@action(detail=True, methods=['get', 'post'])
	def comments(self, request, pk=None):
		obj = self.get_object()
		ct = ContentType.objects.get_for_model(obj)
		if request.method == 'GET':
			comments = Comment.objects.filter(content_type=ct, object_id=obj.pk).order_by('-created_at')
			serializer = CommentSerializer(comments, many=True, context={'request': request})
			return Response(serializer.data)
		# POST
		if not request.user or not request.user.is_authenticated:
			return Response({'detail': 'Authentication required.'}, status=403)
		text = (request.data.get('text') or '').strip()
		if not text:
			return Response({'detail': 'Text is required.'}, status=400)
		comment = Comment.objects.create(user=request.user, content_type=ct, object_id=obj.pk, text=text)
		serializer = CommentSerializer(comment, context={'request': request})
		return Response(serializer.data, status=201)

	def create(self, request, *args, **kwargs):
		with transaction.atomic():
			post = Post.objects.create(user=request.user, caption=request.data.get('caption', ''))
			files = request.FILES.getlist('media')
			for f in files:
				MediaFile.objects.create(post=post, file=f)
			serializer = self.get_serializer(post)
			return Response(serializer.data)

	def get_queryset(self):
		queryset = super().get_queryset()
		user_id = self.request.query_params.get('user')
		if user_id:
			queryset = queryset.filter(user__id=user_id)
		return queryset

class ReelViewSet(viewsets.ModelViewSet):
	queryset = Reel.objects.all().order_by('-created_at')
	serializer_class = ReelSerializer
	permission_classes = [permissions.IsAuthenticatedOrReadOnly]
	parser_classes = [MultiPartParser, FormParser]

	def perform_create(self, serializer):
		serializer.save(user=self.request.user)

	@action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
	def like(self, request, pk=None):
		obj = self.get_object()
		ct = ContentType.objects.get_for_model(obj)
		like, created = Like.objects.get_or_create(user=request.user, content_type=ct, object_id=obj.pk)
		if not created:
			like.delete()
			liked = False
		else:
			liked = True
		count = Like.objects.filter(content_type=ct, object_id=obj.pk).count()
		return Response({'success': True, 'liked': liked, 'likes_count': count})

	@action(detail=True, methods=['get', 'post'])
	def comments(self, request, pk=None):
		obj = self.get_object()
		ct = ContentType.objects.get_for_model(obj)
		if request.method == 'GET':
			comments = Comment.objects.filter(content_type=ct, object_id=obj.pk).order_by('-created_at')
			serializer = CommentSerializer(comments, many=True, context={'request': request})
			return Response(serializer.data)
		if not request.user or not request.user.is_authenticated:
			return Response({'detail': 'Authentication required.'}, status=403)
		text = (request.data.get('text') or '').strip()
		if not text:
			return Response({'detail': 'Text is required.'}, status=400)
		comment = Comment.objects.create(user=request.user, content_type=ct, object_id=obj.pk, text=text)
		serializer = CommentSerializer(comment, context={'request': request})
		return Response(serializer.data, status=201)

class ConnectViewSet(viewsets.ModelViewSet):
	queryset = Connect.objects.all().order_by('-created_at')
	serializer_class = ConnectSerializer
	permission_classes = [permissions.IsAuthenticatedOrReadOnly]

	def perform_create(self, serializer):
		serializer.save(user=self.request.user)

	@action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
	def like(self, request, pk=None):
		obj = self.get_object()
		ct = ContentType.objects.get_for_model(obj)
		like, created = Like.objects.get_or_create(user=request.user, content_type=ct, object_id=obj.pk)
		if not created:
			like.delete()
			liked = False
		else:
			liked = True
		count = Like.objects.filter(content_type=ct, object_id=obj.pk).count()
		return Response({'success': True, 'liked': liked, 'likes_count': count})

	@action(detail=True, methods=['get', 'post'])
	def comments(self, request, pk=None):
		obj = self.get_object()
		ct = ContentType.objects.get_for_model(obj)
		if request.method == 'GET':
			comments = Comment.objects.filter(content_type=ct, object_id=obj.pk).order_by('-created_at')
			serializer = CommentSerializer(comments, many=True, context={'request': request})
			return Response(serializer.data)
		if not request.user or not request.user.is_authenticated:
			return Response({'detail': 'Authentication required.'}, status=403)
		text = (request.data.get('text') or '').strip()
		if not text:
			return Response({'detail': 'Text is required.'}, status=400)
		comment = Comment.objects.create(user=request.user, content_type=ct, object_id=obj.pk, text=text)
		serializer = CommentSerializer(comment, context={'request': request})
		return Response(serializer.data, status=201)

class MusicViewSet(viewsets.ModelViewSet):
	queryset = Music.objects.all().order_by('-created_at')
	serializer_class = MusicSerializer
	permission_classes = [permissions.IsAuthenticatedOrReadOnly]
	parser_classes = [MultiPartParser, FormParser]

	def perform_create(self, serializer):
		serializer.save(user=self.request.user)

	@action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
	def like(self, request, pk=None):
		obj = self.get_object()
		ct = ContentType.objects.get_for_model(obj)
		like, created = Like.objects.get_or_create(user=request.user, content_type=ct, object_id=obj.pk)
		if not created:
			like.delete()
			liked = False
		else:
			liked = True
		count = Like.objects.filter(content_type=ct, object_id=obj.pk).count()
		return Response({'success': True, 'liked': liked, 'likes_count': count})

	@action(detail=True, methods=['get', 'post'])
	def comments(self, request, pk=None):
		obj = self.get_object()
		ct = ContentType.objects.get_for_model(obj)
		if request.method == 'GET':
			comments = Comment.objects.filter(content_type=ct, object_id=obj.pk).order_by('-created_at')
			serializer = CommentSerializer(comments, many=True, context={'request': request})
			return Response(serializer.data)
		if not request.user or not request.user.is_authenticated:
			return Response({'detail': 'Authentication required.'}, status=403)
		text = (request.data.get('text') or '').strip()
		if not text:
			return Response({'detail': 'Text is required.'}, status=400)
		comment = Comment.objects.create(user=request.user, content_type=ct, object_id=obj.pk, text=text)
		serializer = CommentSerializer(comment, context={'request': request})
		return Response(serializer.data, status=201)

from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser

class UserViewSet(viewsets.ModelViewSet):
	queryset = User.objects.all()
	serializer_class = UserSerializer
	parser_classes = [MultiPartParser, FormParser]

	def get_permissions(self):
		if self.action in ['partial_update', 'update', 'destroy']:
			return [permissions.IsAuthenticated()]
		return [permissions.AllowAny()]

	def get_queryset(self):
		queryset = super().get_queryset()
		username = self.request.query_params.get('username')
		if username:
			queryset = queryset.filter(username=username)
		return queryset

	def partial_update(self, request, *args, **kwargs):
		user = self.get_object()
		if request.user != user:
			return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
		data = request.data
		if 'username' in data:
			user.username = data['username']
		if 'bio' in data:
			user.bio = data['bio']
		if 'profile_pic' in data:
			user.profile_pic = data['profile_pic']
		if 'password' in data and data['password']:
			user.set_password(data['password'])
		user.save()
		serializer = self.get_serializer(user)
		return Response(serializer.data, status=status.HTTP_200_OK)


