from django.test import TestCase
from rest_framework.test import APIClient

from apps.store.models import Category, GoldPrice, Product


class ApiSmokeTests(TestCase):
    def setUp(self):
        GoldPrice.objects.create(
            price_18k_per_gram=3_850_000,
            price_24k_per_gram=5_131_050,
            coin_emami=43_850_000,
            coin_half=24_100_000,
            coin_quarter=14_200_000,
            usd_toman=62_400,
            ounce_usd=2412,
        )
        cat = Category.objects.create(name="انگشتر", slug="انگشتر", order=0)
        self.product = Product.objects.create(
            name="انگشتر تست",
            slug="انگشتر-تست",
            category=cat,
            weight_g=4.2,
            fee_ratio=0.22,
            stone_value=8500000,
            tag="پرفروش",
        )
        self.client = APIClient()

    def test_health(self):
        r = self.client.get("/api/v1/health/")
        self.assertEqual(r.status_code, 200)

    def test_gold_price(self):
        r = self.client.get("/api/v1/gold-price/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["price_18k_per_gram"], 3_850_000)

    def test_products(self):
        r = self.client.get("/api/v1/products/")
        self.assertEqual(r.status_code, 200)
        results = r.json()["results"]
        self.assertEqual(len(results), 1)
        gold = 4.2 * 3_850_000
        fee = gold * 0.22
        tax = fee * 0.09
        expected = round(gold + fee + 8_500_000 + tax)
        self.assertEqual(results[0]["price"], expected)

    def test_product_detail(self):
        self.product.refresh_from_db()
        slug = self.product.slug
        r = self.client.get(f"/api/v1/products/{slug}/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("breakdown", r.json())

    def test_create_order(self):
        r = self.client.post(
            "/api/v1/orders/",
            {
                "full_name": "کاربر تست",
                "phone": "09121234567",
                "address": "تهران",
                "items": [{"product_id": str(self.product.id), "qty": 2}],
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        body = r.json()
        self.assertIn("AG-", body["order_number"])
        self.assertEqual(body["total"], body["items"][0]["unit_price"] * 2)

    def test_categories(self):
        r = self.client.get("/api/v1/categories/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)
