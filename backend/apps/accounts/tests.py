from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class SeparatedLoginTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            phone="09121111111",
            password="customer-pass-1",
            full_name="مشتری تست",
            role=User.Role.CUSTOMER,
        )
        self.admin = User.objects.create_user(
            phone="radiar9841",
            password="test-admin-pass-1",
            full_name="مدیر تست",
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True,
        )

    def test_customer_can_use_client_login(self):
        r = self.client.post(
            "/api/v1/auth/login/",
            {"phone": "09121111111", "password": "customer-pass-1"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("access", r.data)
        self.assertEqual(r.data.get("user", {}).get("role"), "customer")

    def test_admin_rejected_from_client_login(self):
        r = self.client.post(
            "/api/v1/auth/login/",
            {"phone": "radiar9841", "password": "test-admin-pass-1"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_use_admin_login(self):
        r = self.client.post(
            "/api/v1/auth/admin/login/",
            {"phone": "radiar9841", "password": "test-admin-pass-1"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("access", r.data)
        self.assertEqual(r.data.get("user", {}).get("role"), "admin")

    def test_customer_rejected_from_admin_login(self):
        r = self.client.post(
            "/api/v1/auth/admin/login/",
            {"phone": "09121111111", "password": "customer-pass-1"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_register_always_customer(self):
        r = self.client.post(
            "/api/v1/auth/register/",
            {
                "phone": "09123334444",
                "full_name": "جدید",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["user"]["role"], "customer")
        user = User.objects.get(phone="09123334444")
        self.assertFalse(user.is_staff)
