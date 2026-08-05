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
from .services.gold import fetch_online_payload, maybe_auto_refresh, refresh_gold_price


class GoldPriceView(APIView):
    """Latest stored snapshot. Auto-refreshes from live source when stale."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        auto = request.query_params.get("auto", "1") not in ("0", "false", "no")
        gold = maybe_auto_refresh() if auto else GoldPrice.current()
        if not gold:
            return Response({"detail": "نرخ طلا موجود نیست."}, status=status.HTTP_404_NOT_FOUND)
        return Response(GoldPriceSerializer(gold).data)


class GoldPriceLiveView(APIView):
    """
    Fetch live market from Faraz/sekefarshad/goldbridge stack and persist a snapshot.
    Public read of the resulting rates (rate-limit via GOLD_STALE_SECONDS on auto path).
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        persist = request.query_params.get("persist", "1") not in ("0", "false", "no")
        payload, source = fetch_online_payload()
        if not payload:
            # Fall back to last stored row
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

        # Preview without writing
        preview = {
            **payload,
            "source": source,
            "mesghal": round(payload["price_18k_per_gram"] * 4.3318),
            "live": True,
            "persisted": False,
        }
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
