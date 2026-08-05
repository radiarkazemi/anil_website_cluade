from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, ContentPage, GoldPrice, Product, SiteSettings, Wishlist
from .serializers import (
    CategorySerializer,
    ContentPageListSerializer,
    ContentPageSerializer,
    GoldPriceSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    SiteSettingsSerializer,
    WishlistSerializer,
)
from .services import price_cache
from .services.gold import fetch_online_payload, maybe_auto_refresh, refresh_gold_price


class GoldPriceView(APIView):
    """Latest quote — prefers live in-memory Faraz cache, else DB snapshot."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cached = price_cache.get_latest()
        if cached and cached.get("price_18k_per_gram"):
            return Response(cached)

        auto = request.query_params.get("auto", "1") not in ("0", "false", "no")
        gold = maybe_auto_refresh() if auto else GoldPrice.current()
        if not gold:
            return Response({"detail": "نرخ طلا موجود نیست."}, status=status.HTTP_404_NOT_FOUND)
        data = GoldPriceSerializer(gold).data
        price_cache.set_latest(data)
        return Response(data)


class GoldPriceLiveView(APIView):
    """
    Fetch live Faraz market (مثقال ۱۷ → گرم ۱۸) and optionally persist a snapshot.
    Prefer WebSocket /ws/gold/ for continuous streaming.
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        persist = request.query_params.get("persist", "1") not in ("0", "false", "no")
        payload, source = fetch_online_payload()
        if not payload:
            gold = GoldPrice.current()
            if not gold:
                return Response(
                    {"detail": "منبع آنلاین قیمت در دسترس نیست.", "source": None},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            data = GoldPriceSerializer(gold).data
            data["live"] = False
            data["live_error"] = "upstream_unavailable"
            return Response(data, status=status.HTTP_200_OK)

        if persist:
            row = refresh_gold_price(force_live=True, allow_jitter=False)
            data = GoldPriceSerializer(row).data
            data["live"] = True
            return Response(data)

        preview = price_cache.public_quote(payload, source=source or "faraz")
        preview["live"] = True
        preview["persisted"] = False
        return Response(preview)

    def post(self, request):
        """Force a live refresh and store a new snapshot (same as admin refresh)."""
        try:
            row = refresh_gold_price(force_live=True, allow_jitter=False)
        except Exception as exc:
            return Response(
                {"detail": str(exc), "source": None},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        data = GoldPriceSerializer(row).data
        data["live"] = True
        return Response(data, status=status.HTTP_201_CREATED)


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


class SiteSettingsView(APIView):
    """Public storefront layout/brand settings."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        settings_obj = SiteSettings.load()
        return Response(SiteSettingsSerializer(settings_obj, context={"request": request}).data)


class ContentPageListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = ContentPageListSerializer
    pagination_class = None

    def get_queryset(self):
        qs = ContentPage.objects.filter(is_published=True)
        ptype = self.request.query_params.get("type")
        if ptype in ("page", "blog"):
            qs = qs.filter(page_type=ptype)
        nav = self.request.query_params.get("nav")
        if nav in ("1", "true", "yes"):
            qs = qs.filter(show_in_nav=True)
        return qs


class ContentPageDetailView(generics.RetrieveAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = ContentPageSerializer
    lookup_field = "slug"
    queryset = ContentPage.objects.filter(is_published=True)
