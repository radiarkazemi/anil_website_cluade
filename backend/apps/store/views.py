from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, GoldPrice, Product, Wishlist
from .serializers import (
    CategorySerializer,
    GoldPriceSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    WishlistSerializer,
)


class GoldPriceView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        gold = GoldPrice.current()
        if not gold:
            return Response({"detail": "نرخ طلا موجود نیست."}, status=status.HTTP_404_NOT_FOUND)
        return Response(GoldPriceSerializer(gold).data)


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class ProductListView(generics.ListAPIView):
    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ["tag", "is_featured"]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "weight_g", "name"]

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).select_related("category").prefetch_related("images")
        category = self.request.query_params.get("category")
        if category and category != "all":
            qs = qs.filter(Q(category__slug=category) | Q(category__name=category))
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        ordering = request.query_params.get("ordering", "")
        if ordering in ("price", "-price"):
            products = list(qs)
            products.sort(key=lambda p: p.price, reverse=(ordering == "-price"))
            page = self.paginate_queryset(products)
            if page is not None:
                return self.get_paginated_response(self.get_serializer(page, many=True).data)
            return Response(self.get_serializer(products, many=True).data)
        return super().list(request, *args, **kwargs)


class ProductDetailView(generics.RetrieveAPIView):
    serializer_class = ProductDetailSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Product.objects.filter(is_active=True).select_related("category").prefetch_related("images")
    lookup_field = "slug"


class WishlistListCreateView(generics.ListCreateAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related("product__category")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WishlistDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)
