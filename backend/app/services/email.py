import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def send_password_reset_email(
    to_email: str,
    reset_token: str,
    frontend_url: str,
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    smtp_from: str,
) -> None:
    reset_url = f"{frontend_url.rstrip('/')}/reset-password?token={reset_token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Redefinição de senha — Roterizador"
    msg["From"] = smtp_from
    msg["To"] = to_email

    text_body = (
        f"Olá,\n\n"
        f"Recebemos uma solicitação para redefinir a senha da sua conta.\n\n"
        f"Acesse o link abaixo para criar uma nova senha (válido por 1 hora):\n"
        f"{reset_url}\n\n"
        f"Se você não solicitou isso, ignore este email.\n\n"
        f"— Equipe Roterizador\n"
    )
    html_body = f"""<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h2 style="color:#1a1a1a;margin-top:0">Redefinição de senha</h2>
    <p style="color:#555">Recebemos uma solicitação para redefinir a senha da sua conta.</p>
    <p style="color:#555">Clique no botão abaixo para criar uma nova senha (válido por <strong>1 hora</strong>):</p>
    <a href="{reset_url}"
       style="display:inline-block;background:#166534;color:#fff;padding:12px 24px;
              border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0">
      Redefinir senha
    </a>
    <p style="color:#999;font-size:0.85em">
      Se o botão não funcionar, copie e cole este link no seu navegador:<br>
      <a href="{reset_url}" style="color:#166534">{reset_url}</a>
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#bbb;font-size:0.8em">
      Se você não solicitou a redefinição de senha, ignore este email.
    </p>
  </div>
</body>
</html>"""

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
        server.ehlo()
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from, [to_email], msg.as_string())

    logger.info("[email] Password reset email sent to %s", to_email)
