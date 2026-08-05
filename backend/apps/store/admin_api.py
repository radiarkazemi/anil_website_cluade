from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import generics, parsers, serializers, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminRole
from apps.orders.models import Order, OrderItem
from apps.orders.serializers import OrderSerializer
from apps.store.models import Category, GoldPrice, Product, ProductImage
from apps.store.serializers import CategorySerializer, GoldPriceSerializer, ProductImageSerializer
from apps.store.services.gold import refresh_gold_price

User = get_user_model()


class AdminProductWriteSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    price = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "category_name",
            "weight_g",
            "karat",
            "fee_ratio",
            "stone_value",
            "tag",
            "description",
            "placeholder_label",
            "sku",
            "stock",
            "is_active",
            "is_featured",
            "meta_title",
            "meta_description",
            "images",
            "price",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "price", "created_at", "updated_at", "images"]

    def get_price(self, obj):
        return obj.price_breakdown()["total"]


class AdminUserManageSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "phone",
            "email",
            "full_name",
            "role",
            "is_active",
            "is_staff",
            "national_code",
            "address",
            "city",
            "postal_code",
            "avatar",
            "email_verified",
            "phone_verified",
            "created_at",
        ]
        read_only_fields = ["id", "phone", "created_at", "avatar", "is_staff"]

    def update(self, instance, validated_data):
        role = validated_data.get("role", instance.role)
        instance = super().update(instance, validated_data)
        instance.is_staff = role in (User.Role.ADMIN, User.Role.STAFF)
        instance.save(update_fields=["is_staff"])
        return instance


class DashboardView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        gold = GoldPrice.current()
        today = timezone.now().date()
        start = today - timedelta(days=13)
        orders_today = Order.objects.filter(created_at__date=today)
        paid_qs = Order.objects.exclude(status=Order.Status.CANCELLED)

        daily = (
            paid_qs.filter(created_at__date__gte=start)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(revenue=Sum("total"), orders=Count("id"))
            .order_by("day")
        )
        by_day = {row["day"]: row for row in daily}
        revenue_series = []
        for i in range(14):
            d = start + timedelta(days=i)
            row = by_day.get(d)
            revenue_series.append(
                {
                    "date": d.isoformat(),
                    "label": d.strftime("%m/%d"),
                    "revenue": int(row["revenue"] or 0) if row else 0,
                    "orders": int(row["orders"] or 0) if row else 0,
                }
            )

        status_counts = {
            row["status"]: row["c"]
            for row in Order.objects.values("status").annotate(c=Count("id"))
        }
        orders_by_status = [
            {"status": key, "label": label, "count": status_counts.get(key, 0)}
            for key, label in Order.Status.choices
        ]

        top_products = list(
            OrderItem.objects.values("product_name")
            .annotate(qty=Sum("qty"), revenue=Sum(F("unit_price") * F("qty")))
            .order_by("-qty")[:6]
        )

        gold_history = list(
            GoldPrice.objects.order_by("-created_at")[:14].values(
                "price_18k_per_gram", "created_at", "source"
            )
        )
        gold_history.reverse()

        role_counts = {
            row["role"]: row["c"] for row in User.objects.values("role").annotate(c=Count("id"))
        }

        return Response(
            {
                "products_total": Product.objects.count(),
                "products_active": Product.objects.filter(is_active=True).count(),
                "products_featured": Product.objects.filter(is_featured=True).count(),
                "categories_total": Category.objects.count(),
                "orders_total": Order.objects.count(),
                "orders_pending": Order.objects.filter(status=Order.Status.PENDING).count(),
                "orders_today": orders_today.count(),
                "revenue_total": paid_qs.aggregate(s=Sum("total"))["s"] or 0,
                "revenue_today": orders_today.exclude(status=Order.Status.CANCELLED).aggregate(
                    s=Sum("total")
                )["s"]
                or 0,
                "avg_order_value": int(
                    (paid_qs.aggregate(s=Sum("total"))["s"] or 0) / max(paid_qs.count(), 1)
                ),
                "users_total": User.objects.count(),
                "users_by_role": role_counts,
                "gold_price_18k": gold.price_18k_per_gram if gold else 0,
                "gold_updated_at": gold.created_at if gold else None,
                "revenue_series": revenue_series,
                "orders_by_status": orders_by_status,
                "top_products": top_products,
                "gold_history": gold_history,
                "recent_orders": OrderSerializer(
                    Order.objects.prefetch_related("items")[:10], many=True
                ).data,
                "low_stock": AdminProductWriteSerializer(
                    Product.objects.filter(stock__lte=2, is_active=True)[:8],
                    many=True,
                    context={"request": request},
                ).data,
            }
        )


class AdminProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = AdminProductWriteSerializer
    lookup_field = "id"
    search_fields = ["name", "sku", "description"]
    filterset_fields = ["category", "tag", "is_active", "is_featured"]
    ordering_fields = ["created_at", "name", "stock", "weight_g"]

    def get_queryset(self):
        return Product.objects.select_related("category").prefetch_related("images").all()


class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = CategorySerializer
    queryset = Category.objects.all()
    lookup_field = "id"
    pagination_class = None


class AdminGoldPriceListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = GoldPriceSerializer
    queryset = GoldPrice.objects.all()

    def perform_create(self, serializer):
        serializer.save(source="admin")


class AdminGoldRefreshView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        row = refresh_gold_price()
        return Response(GoldPriceSerializer(row).data)


class AdminOrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = OrderSerializer
    http_method_names = ["get", "patch", "head", "options"]
    lookup_field = "order_number"
    search_fields = ["order_number", "full_name", "phone"]
    filterset_fields = ["status"]

    def get_queryset(self):
        return Order.objects.prefetch_related("items").all()


class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = AdminUserManageSerializer
    http_method_names = ["get", "patch", "head", "options"]
    queryset = User.objects.all().order_by("-created_at")
    search_fields = ["phone", "full_name", "email"]
    filterset_fields = ["role", "is_active"]


class AdminProductImageUploadView(APIView):
    permission_classes = [IsAdminRole]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"detail": "محصول یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "فایل تصویر الزامی است."}, status=status.HTTP_400_BAD_REQUEST)

        obj = ProductImage.objects.create(
            product=product,
            image=image,
            alt=request.data.get("alt", product.name),
            order=int(request.data.get("order", 0)),
            is_primary=str(request.data.get("is_primary", "false")).lower() in ("1", "true", "yes"),
        )
        if obj.is_primary:
            ProductImage.objects.filter(product=product).exclude(id=obj.id).update(is_primary=False)
        return Response(
            ProductImageSerializer(obj, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, product_id):
        image_id = request.query_params.get("image_id")
        deleted, _ = ProductImage.objects.filter(product_id=product_id, id=image_id).delete()
        if not deleted:
            return Response({"detail": "تصویر یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
