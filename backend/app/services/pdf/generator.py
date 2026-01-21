from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from app.models.exercise import Exercise

def generate_pdf_file(exercise: Exercise, output_path: str):
    doc = SimpleDocTemplate(output_path, pagesize=A4)
    styles = getSampleStyleSheet()
    content = []

    # Títol i Instruccions
    content.append(Paragraph(f"<b>{exercise.title} ({exercise.type})</b>", styles['Heading2']))
    content.append(Paragraph(exercise.instructions, styles['Normal']))
    content.append(Spacer(1, 12))

    # Text Principal
    if exercise.text:
        # Reemplaçar salts de línia per <br/> per a ReportLab
        formatted_text = exercise.text.replace("\n", "<br/>")
        content.append(Paragraph(formatted_text, styles['Normal']))
        content.append(Spacer(1, 12))
    # Preguntes
    if exercise.questions:
        for q in exercise.questions:
            
            # CAS ESPECIAL: PART 4 (Key Word Transformation)
            if exercise.type == "reading_and_use_of_language4":
                q_num = q.question
                content.append(Paragraph(f"<b>{q_num}</b>", styles['Heading4']))
                
                # 1. Frase Original
                if q.original_sentence:
                    content.append(Paragraph(f"{q.original_sentence}", styles['Normal']))
                
                # 2. Paraula Clau
                if q.keyword:
                    content.append(Paragraph(f"<b>{q.keyword}</b>", styles['Normal']))
                    
                # 3. Frase Segona (amb espai per escriure)
                # Si ve plena de l'IA, la mostrem, si no, posem el buit
                sec_sent = q.second_sentence or "..."
                if "___" not in sec_sent: 
                    # Truc visual per si l'IA no posa la línia
                    sec_sent = sec_sent.replace("...", "______________________") 
                
                content.append(Paragraph(f"{sec_sent}", styles['Normal']))
                content.append(Spacer(1, 12))
                continue  # Saltem a la següent pregunta per no aplicar la lògica genèrica
            
            # --- LÒGICA GENÈRICA PER PARTS 1, 2, 3 ---
            
            # 1. Encapçalament
            content.append(Paragraph(f"<b>{q.question}</b>", styles['Heading4']))
            
            # 2. Stem
            if q.stem:
                 content.append(Paragraph(q.stem, styles['Normal']))

            # 3. Opcions (Part 1)
            if q.options:
                for i, opt in enumerate(q.options):
                    label = chr(65 + i)
                    content.append(Paragraph(f"   {label}) {opt.text}", styles['Normal']))
            
            # 4. Short Answer (Part 2 i 3)
            elif q.answer_type == "short_answer":
                if q.keyword:
                    text_line = f"   Answer: _______________________  (Root: <b>{q.keyword}</b>)"
                else:
                    text_line = "   Answer: _______________________"
                content.append(Paragraph(text_line, styles['Normal']))

            content.append(Spacer(1, 12))
    doc.build(content)
    return output_path