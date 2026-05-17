import io
import base64
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

def generate_pdf(data):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph("Algorithm Complexity Analysis Report", styles['Title']))
    elements.append(Spacer(1, 12))

    # Meta Info
    algorithm = data.get('algorithm', 'Unknown').replace('_', ' ').title()
    case_type = data.get('case_type', 'Unknown').title()
    elements.append(Paragraph(f"<b>Algorithm:</b> {algorithm}", styles['Normal']))
    elements.append(Paragraph(f"<b>Case Type:</b> {case_type}", styles['Normal']))
    elements.append(Spacer(1, 12))

    # Analysis Summary
    summary = f"This report provides an empirical analysis of the execution time for {algorithm} in the {case_type.lower()} case. "
    summary += "Theoretical complexity overlays were used to compare real-world performance against expected mathematical bounds."
    elements.append(Paragraph(summary, styles['Normal']))
    elements.append(Spacer(1, 12))

    # Graph Image
    graph_base64 = data.get('graph_image', '')
    if graph_base64:
        try:
            if ',' in graph_base64:
                graph_base64 = graph_base64.split(',')[1]
            img_data = base64.b64decode(graph_base64)
            img_io = io.BytesIO(img_data)
            img = Image(img_io, width=500, height=250)
            elements.append(img)
            elements.append(Spacer(1, 12))
        except Exception as e:
            elements.append(Paragraph(f"(Error loading graph: {str(e)})", styles['Normal']))
            elements.append(Spacer(1, 12))

    # Results Table
    results = data.get('results', [])
    if results:
        table_data = [['Input Size (n)', 'Execution Time (ms)']]
        for res in results:
            table_data.append([str(res.get('n', 0)), f"{res.get('time', 0):.4f}"])
        
        t = Table(table_data, colWidths=[200, 200])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ecf0f1')),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(t)

    doc.build(elements)
    buffer.seek(0)
    return buffer
