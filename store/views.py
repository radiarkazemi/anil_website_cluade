from django.db.models import Q
from django.shortcuts import render
from django.views.decorators.http import require_GET
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Category, GoldPrice, Product
from .serializers import (
    CategorySerializer,
    GoldPriceSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    ProductSerializer,
)


class OrderCreateThrottle(AnonRateThrottle):
    rate = "20/hour"


@require_GET
def storefront(request):
    """Serve the Anil Gold storefront SPA."""
    return render(request, "store/index.html")


class GoldPriceView(APIView):
    def get(self, request):
        gold = GoldPrice.current()
        if not gold:
            return Response({"detail": "نرخ طلا موجود نیست."}, status=status.HTTP_404_NOT_FOUND)
        return Response(GoldPriceSerializer(gold).data)


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).select_related("category").prefetch_related("images")
        category = self.request.query_params.get("category")
        tag = self.request.query_params.get("tag")
        if category and category != "all":
            qs = qs.filter(Q(category__slug=category) | Q(category__name=category))
        if tag:
            qs = qs.filter(tag=tag)

        ordering = self.request.query_params.get("ordering", "")
        # price isn't a DB column — sort in Python for this catalog size
        if ordering in ("price", "-price", "weight_g", "-weight_g"):
            return qs
        return qs.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        qs = list(self.get_queryset())
        ordering = request.query_params.get("ordering", "")
        if ordering == "price":
            qs.sort(key=lambda p: p.price)
        elif ordering == "-price":
            qs.sort(key=lambda p: p.price, reverse=True)
        elif ordering == "weight_g":
            qs.sort(key=lambda p: float(p.weight_g))
        elif ordering == "-weight_g":
            qs.sort(key=lambda p: float(p.weight_g), reverse=True)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class ProductDetailView(generics.RetrieveAPIView):
    serializer_class = ProductSerializer
    queryset = Product.objects.filter(is_active=True).select_related("category").prefetch_related("images")


class OrderCreateView(APIView):
    throttle_classes = [OrderCreateThrottle]

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": "anil-gold"})
