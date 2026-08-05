from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services.mongodb import get_popular_products, get_price_history, log_product_view


class PriceHistoryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 50)), 500)
        history = get_price_history(limit=limit)
        for h in history:
            if "ts" in h:
                h["ts"] = h["ts"].isoformat()
        return Response(history)


class ProductViewLogView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"detail": "product_id required"}, status=status.HTTP_400_BAD_REQUEST)
        user_id = str(request.user.id) if request.user.is_authenticated else None
        log_product_view(str(product_id), user_id)
        return Response({"detail": "ok"})


class PopularProductsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        days = min(int(request.query_params.get("days", 30)), 365)
        limit = min(int(request.query_params.get("limit", 10)), 50)
        data = get_popular_products(days=days, limit=limit)
        return Response(data)
