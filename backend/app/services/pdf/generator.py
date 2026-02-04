from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def generate_pdf_file(exercise_data, output_path: str):
    """
    Genera un PDF a partir d'un diccionari d'exercici.
    Accepta tant objectes Pydantic com diccionaris purs.
    """
    # Funció auxiliar per accedir a propietats tant si és objecte com dict
    def get_attr(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    doc = SimpleDocTemplate(output_path, pagesize=A4)
    styles = getSampleStyleSheet()
    content = []

    # 1. Títol i Instruccions
    title = get_attr(exercise_data, "title", "Exercise")
    ex_type = get_attr(exercise_data, "type", "General")
    instructions = get_attr(exercise_data, "instructions", "Follow the instructions below.")

    content.append(Paragraph(f"<b>{title} ({ex_type})</b>", styles['Heading2']))
    content.append(Paragraph(instructions, styles['Normal']))
    content.append(Spacer(1, 12))

    # 2. Text Principal
    raw_text = get_attr(exercise_data, "text", "")
    if raw_text:
        # Reemplaçar salts de línia per <br/> per a ReportLab
        formatted_text = raw_text.replace("\n", "<br/>")
        content.append(Paragraph(formatted_text, styles['Normal']))
        content.append(Spacer(1, 12))

    # 3. Preguntes
    questions = get_attr(exercise_data, "questions", [])
    if questions:
        for q in questions:
            
            # Recuperem dades de la pregunta
            q_num = get_attr(q, "question", "Q")
            q_stem = get_attr(q, "stem", "")
            q_keyword = get_attr(q, "keyword", "")
            
            # --- CAS ESPECIAL: PART 4 (Key Word Transformation) ---
            if ex_type == "reading_and_use_of_language4":
                content.append(Paragraph(f"<b>{q_num}</b>", styles['Heading4']))
                
                # A. Frase Original
                original_sentence = get_attr(q, "original_sentence", "")
                if original_sentence:
                    content.append(Paragraph(f"{original_sentence}", styles['Normal']))
                
                # B. Paraula Clau
                if q_keyword:
                    content.append(Paragraph(f"<b>{q_keyword}</b>", styles['Normal']))
                    
                # C. Frase Segona (amb espai per escriure)
                second_sentence = get_attr(q, "second_sentence", "...")
                
                # Truc visual per si l'IA no posa la línia de buit
                if "___" not in second_sentence: 
                    second_sentence = second_sentence.replace("...", "______________________") 
                
                content.append(Paragraph(f"{second_sentence}", styles['Normal']))
                content.append(Spacer(1, 12))
                continue  # Saltem a la següent pregunta
            
            # --- LÒGICA GENÈRICA (Parts 1, 2, 3, Grammar, Vocab) ---
            
            # Encapçalament (Número de pregunta)
            # A vegades "question" és el número (1, 2) o el text. Si és curt, és un índex.
            content.append(Paragraph(f"<b>{q_num}</b>", styles['Heading4']))
            
            # Stem (Text de la pregunta)
            if q_stem:
                 content.append(Paragraph(q_stem, styles['Normal']))

            # Opcions (Multiple Choice - Part 1)
            options = get_attr(q, "options", [])
            answer_type = get_attr(q, "answer_type", "multiple_choice")

            if options:
                for i, opt in enumerate(options):
                    label = chr(65 + i) # A, B, C...
                    # Si 'opt' és un dict (com sol ser en Pydantic complexos), accedim al text
                    opt_text = opt if isinstance(opt, str) else get_attr(opt, "text", str(opt))
                    content.append(Paragraph(f"   {label}) {opt_text}", styles['Normal']))
            
            # Short Answer (Part 2, 3, Open Cloze)
            # Si no hi ha opcions, assumim que és espai per omplir
            elif not options or answer_type == "short_answer":
                if q_keyword:
                    # Típic de Word Formation (Part 3)
                    text_line = f"   Answer: _______________________  (Root: <b>{q_keyword}</b>)"
                else:
                    text_line = "   Answer: _______________________"
                content.append(Paragraph(text_line, styles['Normal']))

            content.append(Spacer(1, 12))

    doc.build(content)
    return output_path