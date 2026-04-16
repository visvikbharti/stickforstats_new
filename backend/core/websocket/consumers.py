"""WebSocket consumers for real-time features."""

import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class AnalysisConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time analysis progress updates.

    Clients connect to ws/analysis/{session_id}/ and receive:
    - Progress updates during long-running analyses
    - Guardian violation alerts as they are detected
    - Final results when analysis completes
    """

    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.group_name = f"analysis_{self.session_id}"

        # Join the analysis session group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.send_json(
            {
                "type": "connection_established",
                "session_id": self.session_id,
            }
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name, self.channel_name
        )

    async def receive_json(self, content):
        """Handle incoming messages from clients."""
        msg_type = content.get("type", "")

        if msg_type == "ping":
            await self.send_json({"type": "pong"})
        elif msg_type == "cancel_analysis":
            # Broadcast cancellation to the group
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "analysis.cancelled",
                    "message": "Analysis cancelled by user",
                },
            )

    # -- Group message handlers ------------------------------------------------

    async def analysis_progress(self, event):
        """Send progress update to client."""
        await self.send_json(
            {
                "type": "progress",
                "progress": event.get("progress", 0),
                "stage": event.get("stage", ""),
                "message": event.get("message", ""),
            }
        )

    async def analysis_complete(self, event):
        """Send completed results to client."""
        await self.send_json(
            {
                "type": "complete",
                "results": event.get("results", {}),
            }
        )

    async def analysis_error(self, event):
        """Send error to client."""
        await self.send_json(
            {
                "type": "error",
                "error": event.get("error", "Unknown error"),
            }
        )

    async def guardian_alert(self, event):
        """Send Guardian violation alert to client."""
        await self.send_json(
            {
                "type": "guardian_alert",
                "violation": event.get("violation", {}),
                "severity": event.get("severity", "warning"),
            }
        )

    async def analysis_cancelled(self, event):
        """Send cancellation confirmation."""
        await self.send_json(
            {
                "type": "cancelled",
                "message": event.get("message", ""),
            }
        )


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for user notifications.

    Each authenticated user gets their own notification channel for:
    - Async task completion (manuscript processing, report generation)
    - System notifications
    - Collaboration alerts
    """

    async def connect(self):
        user = self.scope.get("user")
        if user and user.is_authenticated:
            self.group_name = f"notifications_{user.id}"
            await self.channel_layer.group_add(
                self.group_name, self.channel_name
            )
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )

    async def receive_json(self, content):
        """Handle incoming messages."""
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def task_complete(self, event):
        """Notify user that an async task completed."""
        await self.send_json(
            {
                "type": "task_complete",
                "task_id": event.get("task_id"),
                "task_type": event.get("task_type"),
                "result_url": event.get("result_url"),
                "message": event.get("message", "Task completed"),
            }
        )

    async def system_notification(self, event):
        """Send system notification."""
        await self.send_json(
            {
                "type": "notification",
                "title": event.get("title", ""),
                "message": event.get("message", ""),
                "level": event.get("level", "info"),
            }
        )
