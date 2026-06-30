import os
import httpx
import asyncio
from datetime import datetime

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

_last_alert_level = {}  # bridge_id -> last alert level sent

ALERT_EMOJIS = {
    "CRITICAL": "🚨",
    "WARNING": "⚠️",
    "WATCH": "👀",
    "NORMAL": "✅",
}

async def send_telegram_message(message: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML"
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(url, json=payload)
    except Exception as e:
        print(f"[telegram] Failed to send message: {e}")

async def check_and_send_alert(
    bridge_id: int,
    bridge_name: str,
    alert_level: str,
    health_score: float,
    water_level: float,
    vibration: float,
    strain: float,
    crack_gap: float,
    risk_score: float,
    anomaly_score: float,
):
    global _last_alert_level

    prev_level = _last_alert_level.get(bridge_id, "NORMAL")

    # Only send if alert level changed or is CRITICAL/WARNING
    if alert_level == prev_level and alert_level not in ("CRITICAL", "WARNING"):
        return

    _last_alert_level[bridge_id] = alert_level

    # Only send for WATCH, WARNING, CRITICAL
    if alert_level == "NORMAL" and prev_level == "NORMAL":
        return

    emoji = ALERT_EMOJIS.get(alert_level, "📊")
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if alert_level == "NORMAL" and prev_level != "NORMAL":
        message = (
            f"✅ <b>ALERT RESOLVED — {bridge_name}</b>\n"
            f"🕐 {now}\n"
            f"Bridge has returned to NORMAL status.\n"
            f"Health Score: <b>{health_score:.1f}/100</b>"
        )
    else:
        message = (
            f"{emoji} <b>{alert_level} ALERT — {bridge_name}</b>\n"
            f"🕐 {now}\n\n"
            f"📊 <b>Health Score:</b> {health_score:.1f}/100\n"
            f"💧 <b>Water Level:</b> {water_level:.2f}m\n"
            f"📳 <b>Vibration:</b> {vibration:.3f}g\n"
            f"🔩 <b>Strain:</b> {strain:.1f} MPa\n"
            f"🔍 <b>Crack Gap:</b> {crack_gap:.3f}mm\n"
            f"⚡ <b>Risk Score:</b> {risk_score*100:.1f}%\n"
            f"🤖 <b>Anomaly Score:</b> {anomaly_score:.3f}\n\n"
        )
        if alert_level == "CRITICAL":
            message += "🚨 <b>ACTION REQUIRED:</b> Deploy inspection team immediately. Consider emergency closure."
        elif alert_level == "WARNING":
            message += "⚠️ <b>ACTION REQUIRED:</b> Notify bridge engineer. Implement load restrictions. Inspect within 7 days."
        elif alert_level == "WATCH":
            message += "👀 <b>ACTION:</b> Increase monitoring frequency. Schedule inspection within 30 days."

    await send_telegram_message(message)

# Alias to support different import names
send_telegram_alert = send_telegram_message
