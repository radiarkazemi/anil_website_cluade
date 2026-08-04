from django.test import Client, TestCase

from store.models import Category, GoldPrice, Product


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
            category=cat,
            weight_g=4.2,
            fee_ratio=0.22,
            stone_value=8500000,
            tag="پرفروش",
        )
        self.client = Client()

    def test_health(self):
        r = self.client.get("/api/health/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "ok")

    def test_gold_price(self):
        r = self.client.get("/api/gold-price/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["price_18k_per_gram"], 3_850_000)

    def test_products_and_pricing(self):
        r = self.client.get("/api/products/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(len(data), 1)
        # gold=4.2*3850000; fee=gold*0.22; tax=fee*0.09; total=gold+fee+8500000+tax
        gold = 4.2 * 3_850_000
        fee = gold * 0.22
        tax = fee * 0.09
        expected = round(gold + fee + 8_500_000 + tax)
        self.assertEqual(data[0]["price"], expected)

    def test_create_order(self):
        r = self.client.post(
            "/api/orders/",
            data={
                "full_name": "کاربر تست",
                "phone": "09121234567",
                "address": "تهران",
                "items": [{"product_id": self.product.id, "qty": 2}],
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        body = r.json()
        self.assertEqual(body["gold_price"], 3_850_000)
        self.assertEqual(len(body["items"]), 1)
        self.assertEqual(body["total"], body["items"][0]["unit_price"] * 2)

    def test_storefront_renders(self):
        r = self.client.get("/")
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "گالری طلا آنیل")
        self.assertContains(r, "API = '/api'")
        self.assertContains(r, "/gold-price/")
