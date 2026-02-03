"""PDF generation service using ReportLab for Windows compatibility"""
from io import BytesIO
from decimal import Decimal
from typing import Any
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas


def generate_invoice_pdf(invoice, settings_dict: dict[str, Any]) -> BytesIO:
    """Generate invoice PDF using ReportLab"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=15*mm, bottomMargin=15*mm)
    story = []
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    
    # Company info style
    normal_style = styles['Normal']
    
    # Title
    story.append(Paragraph("INVOICE", title_style))
    story.append(Spacer(1, 10*mm))
    
    # Invoice details table
    details_data = [
        ['Invoice Number:', invoice.invoice_number],
        ['Customer:', invoice.customer_name],
        ['Date:', invoice.issue_date.strftime('%Y-%m-%d')],
    ]
    
    details_table = Table(details_data, colWidths=[40*mm, 80*mm])
    details_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(details_table)
    story.append(Spacer(1, 10*mm))
    
    # Line items table
    items = invoice.items or []
    items_data = [['Description', 'Qty', 'Unit Price', 'Discount', 'Amount']]
    
    for item in items:
        items_data.append([
            item.get('description', ''),
            str(item.get('quantity', 0)),
            f"₵{float(item.get('unit_price', 0)):.2f}",
            f"{float(item.get('discount', 0)):.1f}%",
            f"₵{float(item.get('amount', 0)):.2f}",
        ])
    
    items_table = Table(items_data, colWidths=[60*mm, 20*mm, 30*mm, 25*mm, 30*mm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 10*mm))
    
    # Totals table
    levies = invoice.levies or {}
    totals_data = [['Subtotal:', f"₵{float(invoice.subtotal):.2f}"]]
    
    for levy_name, levy_amount in levies.items():
        totals_data.append([f"{levy_name}:", f"₵{float(levy_amount):.2f}"])
    
    totals_data.append(['Grand Total:', f"₵{float(invoice.grand_total):.2f}"])
    
    totals_table = Table(totals_data, colWidths=[40*mm, 30*mm], hAlign='RIGHT')
    totals_table.setStyle(TableStyle([
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
    ]))
    story.append(totals_table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_receipt_pdf(receipt) -> BytesIO:
    """Generate receipt PDF using ReportLab"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=15*mm, bottomMargin=15*mm)
    story = []
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#059669'),
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    
    # Title
    story.append(Paragraph("RECEIPT", title_style))
    story.append(Spacer(1, 10*mm))
    
    # Receipt details
    details_data = [
        ['Receipt Number:', receipt.receipt_number],
        ['Received From:', receipt.received_from],
        ['Date:', receipt.issue_date.strftime('%Y-%m-%d')],
        ['Amount:', f"₵{float(receipt.amount):.2f}"],
        ['Payment Method:', receipt.payment_method],
        ['Description:', receipt.description],
        ['Approved By:', receipt.approved_by],
    ]
    
    details_table = Table(details_data, colWidths=[40*mm, 80*mm])
    details_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(details_table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_waybill_pdf(waybill) -> BytesIO:
    """Generate waybill PDF using ReportLab"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=15*mm, bottomMargin=15*mm)
    story = []
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#7c3aed'),
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    
    # Title
    story.append(Paragraph("WAYBILL", title_style))
    story.append(Spacer(1, 10*mm))
    
    # Waybill details
    details_data = [
        ['Waybill Number:', waybill.waybill_number],
        ['Customer:', waybill.customer_name],
        ['Date:', waybill.issue_date.strftime('%Y-%m-%d')],
        ['Destination:', waybill.destination],
        ['Driver:', waybill.driver_name],
    ]
    
    details_table = Table(details_data, colWidths=[40*mm, 80*mm])
    details_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(details_table)
    story.append(Spacer(1, 10*mm))
    
    # Items table
    items = waybill.items or []
    if items:
        items_data = [['Description', 'Quantity', 'Weight']]
        
        for item in items:
            items_data.append([
                item.get('description', ''),
                str(item.get('quantity', 0)),
                f"{float(item.get('weight', 0)):.2f} kg",
            ])
        
        items_table = Table(items_data, colWidths=[80*mm, 30*mm, 30*mm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        story.append(items_table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer
