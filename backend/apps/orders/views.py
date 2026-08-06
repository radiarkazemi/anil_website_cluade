from django.conf import settings
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import generics, permissions, status, throttling
from rest_framework.response import Response
from rest_framework.views import APIView
import re

from .models import Order
from .payments import get_gateway, list_gateways, mark_order_paid
from .serializers import OrderCreateSerializer, OrderSerializer


class BurstAnonThrottle(throttling.AnonRateThrottle):
    scope = "burst_anon"


class OrderCreateThrottle(throttling.AnonRateThrottle):
    scope = "order_create"


class PaymentStartThrottle(throttling.AnonRateThrottle):
    scope = "payment_start"


class OrderCreateView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OrderCreateThrottle]

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        order = serializer.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "order_number"

    def get_queryset(self):
        if self.request.user.is_staff:
            return Order.objects.all().prefetch_related("items")
        return Order.objects.filter(user=self.request.user).prefetch_related("items")


class OrderTrackView(APIView):
    """Public order tracker — phone + order_number (rate-limited)."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [BurstAnonThrottle]

    def post(self, request):
        order_number = (request.data.get("order_number") or "").strip()
        phone = (request.data.get("phone") or "").strip()
        if not order_number or not phone:
            return Response({"detail": "شماره سفارش و تلفن الزامی است."}, status=400)
        order = (
            Order.objects.filter(order_number=order_number, phone=phone)
            .prefetch_related("items")
            .first()
        )
        if not order:
            return Response({"detail": "سفارشی یافت نشد."}, status=404)
        return Response(OrderSerializer(order).data)


class GatewayListView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [BurstAnonThrottle]

    def get(self, request):
        return Response({"gateways": list_gateways(), "sandbox": getattr(settings, "PAYMENT_SANDBOX", True)})


class OrderPayView(APIView):
    """Start payment for an existing pending order."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PaymentStartThrottle]

    def post(self, request, order_number):
        gateway_code = (request.data.get("gateway") or "zarinpal").strip().lower()
        phone = (request.data.get("phone") or "").strip()
        order = Order.objects.filter(order_number=order_number).first()
        if not order:
            return Response({"detail": "سفارش یافت نشد."}, status=404)
        # Guest must confirm phone; owner/staff can skip
        user = request.user
        if not (user.is_authenticated and (user.is_staff or order.user_id == user.id)):
            if not phone or phone != order.phone:
                return Response({"detail": "تأیید شماره تماس برای پرداخت الزامی است."}, status=403)
        if order.status not in (Order.Status.PENDING,):
            return Response({"detail": f"وضعیت سفارش قابل پرداخت نیست ({order.get_status_display()})."}, status=400)
        if order.total <= 0:
            return Response({"detail": "مبلغ سفارش نامعتبر است."}, status=400)

        try:
            gw = get_gateway(gateway_code)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        result = gw.start(order)
        if not result.ok:
            return Response({"detail": result.message or "خطا در اتصال به درگاه"}, status=502)

        order.payment_gateway = gateway_code
        order.payment_authority = result.authority
        order.payment_raw = {"start": result.raw or {}}
        order.save(update_fields=["payment_gateway", "payment_authority", "payment_raw", "updated_at"])

        return Response(
            {
                "order_number": order.order_number,
                "gateway": gateway_code,
                "authority": result.authority,
                "payment_url": result.payment_url,
                "sandbox": result.sandbox,
                "message": result.message,
                "amount": order.total,
            }
        )


class PaymentCallbackView(APIView):
    """Gateway return URL — verifies and marks paid (or returns failure)."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, gateway):
        return self._handle(request, gateway, request.query_params)

    def post(self, request, gateway):
        data = request.data if hasattr(request, "data") else {}
        # merge query for gateways that mix GET+POST
        merged = {**dict(request.query_params.items()), **dict(data.items())}
        return self._handle(request, gateway, merged)

    def _handle(self, request, gateway, params):
        gateway = (gateway or "").lower()
        try:
            gw = get_gateway(gateway)
        except ValueError:
            return Response({"detail": "درگاه نامعتبر"}, status=400)

        authority = (
            params.get("Authority")
            or params.get("authority")
            or params.get("id")
            or ""
        )
        status_flag = (
            params.get("Status")
            or params.get("status")
            or ""
        )
        # Zarinpal cancel
        if str(status_flag).upper() in ("NOK", "FAILED", "3", "canceled"):
            return Response({"detail": "پرداخت لغو شد.", "ok": False}, status=400)

        order = Order.objects.filter(payment_authority=authority, payment_gateway=gateway).first()
        if not order and authority:
            order = Order.objects.filter(payment_authority=authority).first()
        if not order:
            return Response({"detail": "سفارش متناظر یافت نشد."}, status=404)
        if order.status == Order.Status.PAID:
            return Response(
                {
                    "ok": True,
                    "already_paid": True,
                    "order_number": order.order_number,
                    "ref_id": order.payment_ref_id,
                }
            )

        result = gw.verify(order, authority=authority, amount=order.total, **dict(params))
        if not result.ok:
            return Response({"ok": False, "detail": result.message, "order_number": order.order_number}, status=400)

        mark_order_paid(
            order,
            gateway=gateway,
            authority=authority,
            ref_id=result.ref_id,
            raw={"verify": result.raw, "callback": dict(params)},
        )
        frontend = getattr(settings, "FRONTEND_URL", "http://localhost:5180").rstrip("/")
        return Response(
            {
                "ok": True,
                "order_number": order.order_number,
                "ref_id": result.ref_id,
                "redirect": f"{frontend}/account?paid={order.order_number}",
            }
        )


class PaymentSandboxConfirmView(APIView):
    """Dev helper: simulate successful payment without visiting the real gateway."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PaymentStartThrottle]

    def post(self, request, order_number):
        if not getattr(settings, "PAYMENT_SANDBOX", True):
            return Response({"detail": "فقط در حالت sandbox"}, status=403)
        order = Order.objects.filter(order_number=order_number).first()
        if not order:
            return Response({"detail": "سفارش یافت نشد."}, status=404)
        # Require matching phone so strangers cannot mark arbitrary orders paid
        phone = re.sub(r"\D", "", str(request.data.get("phone", "")))
        order_phone = re.sub(r"\D", "", order.phone or "")
        if not phone or phone != order_phone:
            return Response({"detail": "شماره موبایل با سفارش مطابقت ندارد."}, status=403)
        if order.status == Order.Status.PAID:
            return Response({"ok": True, "already_paid": True, "order": OrderSerializer(order).data})
        authority = order.payment_authority or f"SANDBOX-MANUAL-{order.order_number}"
        mark_order_paid(
            order,
            gateway=order.payment_gateway or "zarinpal",
            authority=authority,
            ref_id=f"DEV-{order.order_number}",
            raw={"sandbox_confirm": True},
        )
        return Response({"ok": True, "order": OrderSerializer(order).data})
