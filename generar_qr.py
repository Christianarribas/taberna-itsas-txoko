"""Genera los QR de las mesas (PDF para imprimir + un PNG por mesa).
Uso:  python3 generar_qr.py            (usa la dirección de abajo)
Hace falta:  pip install qrcode pillow reportlab"""
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

URL_BASE = "https://christianarribas.github.io/taberna-itsas-txoko/"
MESAS = 12
AZUL, GRANATE, DORADO, CREMA = HexColor("#14262e"), HexColor("#8c2a35"), HexColor("#b98d3e"), HexColor("#f6f0e4")

def hacer_qr(mesa):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=2)
    qr.add_data(f"{URL_BASE}?mesa={mesa}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="#14262e", back_color="white").convert("RGB")
    img.save(f"qr/mesa-{mesa:02d}.png")
    return img

def tarjeta(c, x, y, ancho, alto, mesa, img):
    c.setFillColor(CREMA); c.setStrokeColor(DORADO); c.setLineWidth(1.2)
    c.roundRect(x, y, ancho, alto, 10, fill=1, stroke=1)
    c.setStrokeColor(DORADO); c.setLineWidth(.4)
    c.roundRect(x + 6, y + 6, ancho - 12, alto - 12, 7, fill=0, stroke=1)
    cx = x + ancho / 2
    c.setFillColor(AZUL); c.setFont("Times-Bold", 17)
    c.drawCentredString(cx, y + alto - 30, "Taberna Itsas Txoko")
    c.setFillColor(DORADO); c.setFont("Helvetica", 6.5)
    c.drawCentredString(cx, y + alto - 41, "PINTXOS Y COCINA DE MERCADO")
    lado = 108
    c.setFillColor(HexColor("#ffffff")); c.setStrokeColor(HexColor("#e4dac5"))
    c.roundRect(cx - lado / 2 - 6, y + alto - 55 - lado - 12, lado + 12, lado + 12, 6, fill=1, stroke=1)
    c.drawImage(ImageReader(img), cx - lado / 2, y + alto - 55 - lado - 6, lado, lado)
    c.setFillColor(GRANATE); c.setFont("Times-Bold", 24)
    c.drawCentredString(cx, y + 46, f"Mesa {mesa}")
    c.setFillColor(AZUL); c.setFont("Helvetica", 8)
    c.drawCentredString(cx, y + 32, "Escanea con la cámara del móvil")
    c.drawCentredString(cx, y + 21, "para ver la carta y pedir desde tu mesa")

c = canvas.Canvas("qr-mesas.pdf", pagesize=A4)
c.setTitle("QR de las mesas · Taberna Itsas Txoko")
ancho, alto = 245, 245
margen_x = (A4[0] - 2 * ancho - 20) / 2
for mesa in range(1, MESAS + 1):
    pos = (mesa - 1) % 6
    if pos == 0 and mesa > 1: c.showPage()
    col, fila = pos % 2, pos // 2
    x = margen_x + col * (ancho + 20)
    y = A4[1] - 35 - (fila + 1) * alto - fila * 20
    tarjeta(c, x, y, ancho, alto, mesa, hacer_qr(mesa))
c.save()
print("Hecho: qr-mesas.pdf y qr/mesa-XX.png")
