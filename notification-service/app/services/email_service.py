import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logger = logging.getLogger(__name__)


async def send_email(to_email: str, subject: str, body_html: str) -> bool:
    """Send an email notification. Returns True if successful, False otherwise."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL", "noreply@foodordering.com")

    if not all([smtp_host, smtp_user, smtp_password]):
        logger.warning("SMTP not configured — skipping email send.")
        return False

    message = MIMEMultipart("alternative")
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.attach(MIMEText(body_html, "html"))

    try:
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            use_tls=True
        )
        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def build_order_confirmation_email(data: dict) -> tuple[str, str]:
    """Build an order confirmation email. Returns (subject, body_html)."""
    items_html = ""
    for item in (data.get("items") or []):
        items_html += f"<tr><td>{item.get('name', 'Item')}</td><td>{item.get('quantity', 1)}</td><td>${item.get('subtotal', 0):.2f}</td></tr>"

    subject = f"Order Confirmed — #{str(data.get('orderId', ''))[:8]}"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e74c3c;">🍔 Order Confirmation</h2>
      <p>Hi {data.get('userName', 'Customer')},</p>
      <p>Your order from <strong>{data.get('restaurantName', 'Restaurant')}</strong> has been placed successfully!</p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead><tr style="background: #e74c3c; color: white;"><th>Item</th><th>Qty</th><th>Subtotal</th></tr></thead>
        <tbody>{items_html}</tbody>
      </table>
      <p><strong>Total: ${data.get('totalAmount', 0):.2f}</strong></p>
      <p>Estimated delivery: <strong>{data.get('estimatedDeliveryTime', 45)} minutes</strong></p>
      <p style="color: #7f8c8d; font-size: 12px;">Thank you for ordering with us!</p>
    </body>
    </html>
    """
    return subject, body


def build_status_update_email(data: dict) -> tuple[str, str]:
    """Build a status update email. Returns (subject, body_html)."""
    status_labels = {
        "confirmed": "✅ Confirmed",
        "preparing": "👨‍🍳 Being Prepared",
        "out_for_delivery": "🚗 Out for Delivery",
        "delivered": "📦 Delivered",
        "cancelled": "❌ Cancelled"
    }
    status = data.get("status", "updated")
    label = status_labels.get(status, status.replace("_", " ").title())

    subject = f"Order Update — {label}"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif;">
      <h2>Order Status Update</h2>
      <p>Hi {data.get('userName', 'Customer')},</p>
      <p>Your order from <strong>{data.get('restaurantName', '')}</strong> is now: <strong>{label}</strong></p>
      <p>Order ID: {str(data.get('orderId', ''))[:8]}</p>
    </body>
    </html>
    """
    return subject, body
