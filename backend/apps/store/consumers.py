from __future__ import annotations

import json

from channels.generic.websocket import AsyncWebsocketConsumer

from apps.store.services.streamer import GOLD_GROUP


class GoldPriceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add(GOLD_GROUP, self.channel_name)
        await self.accept()
        from apps.store.services import price_cache

        latest = price_cache.get_latest()
        if latest:
            await self.send(text_data=json.dumps({"type": "gold.price", "data": latest}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(GOLD_GROUP, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Clients may send ping; ignore payload
        if text_data == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))

    async def gold_price(self, event):
        await self.send(text_data=json.dumps({"type": "gold.price", "data": event.get("data")}))
