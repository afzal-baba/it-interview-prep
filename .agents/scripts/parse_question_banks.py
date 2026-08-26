from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Iterable

import fitz
from docx import Document

ROOT = Path("/home/runner/workspace")
ASSETS = ROOT / "attached_assets"
OUTPUT = ROOT / ".agents" / "outputs" / "question-bank"
OUTPUT.mkdir(parents=True, exist_ok=True)

Level = str
LEVELS = ("beginner", "intermediate", "advanced")


def clean_text(value: str) -> str:
    value = value.replace("\u00a0", " ").replace("\u2011", "-")
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"^\*+|\*+$", "", value).strip()
    return value


def normalize(value: str) -> str:
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def read_pdf(path: Path) -> str:
    doc = fitz.open(path)
    return "\n".join(page.get_text("text") for page in doc)


def meaningful_lines(text: str) -> list[str]:
    lines: list[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            lines.append("")
            continue
        if re.fullmatch(r"--- PAGE \d+ ---", line):
            continue
        if re.fullmatch(r".*Page \d+", line) and "Practice Exam" in line:
            continue
        lines.append(line)
    return lines


def strip_markdown(value: str) -> str:
    return clean_text(value.replace("**", "").replace("__", ""))


def section_ranges(lines: list[str]) -> list[tuple[Level, int, int]]:
    hits: list[tuple[Level, int]] = []
    for index, line in enumerate(lines):
        if "answer key" in line.lower():
            continue
        match = re.search(r"\b(beginner|intermediate|advanced)\s+level\b", line, re.I)
        if match:
            hits.append((match.group(1).lower(), index))
    ranges: list[tuple[Level, int, int]] = []
    for position, (level, start) in enumerate(hits):
        end = hits[position + 1][1] if position + 1 < len(hits) else len(lines)
        ranges.append((level, start, end))
    return ranges


def question_start(line: str) -> tuple[int, str] | None:
    line = line.strip().replace("**", "").replace("__", "")
    match = re.match(r"^\*{0,2}(?:Q\s*)?(\d+)[.):]\s+(.*?)\*{0,2}$", line, re.I)
    if not match:
        return None
    return int(match.group(1)), clean_text(match.group(2))


def parse_structured_questions(lines: list[str]) -> list[dict]:
    starts: list[tuple[int, int, str]] = []
    for index, line in enumerate(lines):
        found = question_start(line)
        if found:
            starts.append((index, found[0], found[1]))

    questions: list[dict] = []
    for position, (start, number, first_text) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        block = lines[start:end]
        question_parts = [first_text] if first_text else []
        options: list[str] = []
        current_option: int | None = None
        for line in block[1:]:
            if not line or "answer key" in line.lower():
                continue
            option_match = re.match(r"^\*{0,2}([A-D])[.)]\s*(.*?)\*{0,2}$", line, re.I)
            if option_match:
                options.append(clean_text(option_match.group(2)))
                current_option = len(options) - 1
            elif current_option is not None:
                options[current_option] = clean_text(f"{options[current_option]} {line}")
            else:
                question_parts.append(line)
        if len(options) == 4:
            questions.append({
                "number": number,
                "text": clean_text(" ".join(question_parts)),
                "options": options,
            })
    return questions


def parse_answers(lines: Iterable[str]) -> dict[int, tuple[int, str]]:
    answers: dict[int, tuple[int, str]] = {}
    for line in lines:
        normalized = strip_markdown(line)
        table = re.match(r"^\|\s*(\d+)\s*\|\s*([A-D])\s*\|\s*(.*?)\s*\|?$", normalized, re.I)
        if table:
            number = int(table.group(1))
            answer = ord(table.group(2).upper()) - ord("A")
            answers[number] = (answer, clean_text(table.group(3)))
            continue
        structured = re.search(
            r"(?:Q\s*)?(\d+)\s+Answer\s*:\s*([A-D])(?:\s*/\s*[A-D])?\s*(?:[-—:]\s*)?(.*)$",
            normalized,
            re.I,
        )
        if structured:
            number = int(structured.group(1))
            answer = ord(structured.group(2).upper()) - ord("A")
            explanation = clean_text(structured.group(3))
            answers[number] = (answer, explanation)
            continue

        generic = re.match(r"^\s*(\d+)\.\s*([A-D])\s*[—-]\s*(.*)$", normalized, re.I)
        if generic:
            number = int(generic.group(1))
            answer = ord(generic.group(2).upper()) - ord("A")
            answers[number] = (answer, clean_text(generic.group(3)))
    return answers


def parse_level_block(lines: list[str], level: Level) -> list[dict]:
    answer_key_index = next(
        (index for index, line in enumerate(lines) if "answer key" in line.lower()),
        len(lines),
    )
    question_lines = lines[:answer_key_index]
    answer_lines = lines[answer_key_index:]
    questions = parse_structured_questions(question_lines)
    answers = parse_answers(answer_lines)
    output: list[dict] = []
    for question in questions:
        answer = answers.get(question["number"])
        if not answer:
            continue
        correct_index, explanation = answer
        if not 0 <= correct_index < 4:
            continue
        output.append({
            "level": level,
            "text": question["text"],
            "options": question["options"],
            "correctOptionIndex": correct_index,
            "explanation": explanation or None,
        })
    return output


def parse_course_segment(lines: list[str], name: str) -> list[dict]:
    questions: list[dict] = []
    for level, start, end in section_ranges(lines):
        questions.extend(parse_level_block(lines[start:end], level))
    for question in questions:
        question["course"] = name
    return questions


def split_pdf_courses(text: str, source: str) -> list[tuple[str, list[str]]]:
    lines = meaningful_lines(text)
    if source == "detailed-41":
        marker = re.compile(r"^\d{2}_[A-Za-z0-9_-]+\.md$")
        indices = [i for i, line in enumerate(lines) if marker.fullmatch(line)]
    else:
        marker = re.compile(r"^Course File:\s+\d{2}_[A-Za-z0-9_-]+\.md$")
        indices = [i for i, line in enumerate(lines) if marker.fullmatch(line)]
    segments: list[tuple[str, list[str]]] = []
    for position, start in enumerate(indices):
        end = indices[position + 1] if position + 1 < len(indices) else len(lines)
        segment = lines[start:end]
        course_line = next(
            (line for line in segment[:12] if re.match(r"^\*{0,2}Course\s*:", line, re.I)),
            "",
        )
        if course_line:
            name = clean_text(re.sub(r"^\*{0,2}Course\s*:\s*", "", course_line, flags=re.I))
        else:
            name = clean_text(re.sub(r"^(?:Course File:\s*)?|\d{2}_|\.md$", "", segment[0]))
        name = re.sub(r"^\d{2}_", "", name)
        name = re.sub(r"\.md$", "", name)
        segments.append((name, segment))
    return segments


def parse_topic_pdf(text: str) -> list[dict]:
    lines = meaningful_lines(text)
    starts: list[int] = []
    for index, line in enumerate(lines[:-1]):
        if re.match(r"^\d+\.\s+.+$", line) and lines[index + 1].lower().startswith("category:"):
            starts.append(index)
    output: list[dict] = []
    for position, start in enumerate(starts):
        end = starts[position + 1] if position + 1 < len(starts) else len(lines)
        segment = lines[start:end]
        name = clean_text(re.sub(r"^\d+\.\s*", "", segment[0]))
        output.extend(parse_course_segment(segment, name))
    return output


def parse_docx(path: Path) -> list[dict]:
    document = Document(path)
    lines = [clean_text(paragraph.text) for paragraph in document.paragraphs]
    headings = [
        i for i, line in enumerate(lines)
        if re.search(r"\(30\s+Questions\)\s*$", line, re.I)
    ]
    output: list[dict] = []
    for position, start in enumerate(headings):
        end = headings[position + 1] if position + 1 < len(headings) else len(lines)
        segment = lines[start:end]
        name = clean_text(re.sub(r"^📝\s*", "", segment[0]))
        name = re.sub(r"\s*\(30\s+Questions\)\s*$", "", name)
        name = re.sub(r"\s+Practice Exam\s*$", "", name, flags=re.I)
        name = re.sub(r"^[^\w.#+]+", "", name, flags=re.UNICODE)
        ranges = section_ranges(segment)
        for level, level_start, level_end in ranges:
            block = segment[level_start:level_end]
            answer_key_index = next(
                (i for i, line in enumerate(block) if "answer key" in line.lower()),
                len(block),
            )
            question_lines = [line for line in block[:answer_key_index] if line]
            answer_lines = [line for line in block[answer_key_index:] if line]
            answer_matches = [
                re.match(r"^([a-d])\)\s*(.*?)\s*[—-]\s*(.*)$", line, re.I)
                for line in answer_lines
            ]
            answers = [
                (ord(match.group(1).upper()) - ord("A"), clean_text(match.group(3)))
                for match in answer_matches
                if match
            ]
            for index, line in enumerate(question_lines[: len(answers)]):
                match = re.match(
                    r"^(.*?)\s+a\)\s*(.*?)\s+b\)\s*(.*?)\s+c\)\s*(.*?)\s+d\)\s*(.*)$",
                    line,
                    re.I,
                )
                if not match:
                    continue
                output.append({
                    "course": name,
                    "level": level,
                    "text": clean_text(match.group(1)),
                    "options": [clean_text(match.group(i)) for i in range(2, 6)],
                    "correctOptionIndex": answers[index][0],
                    "explanation": answers[index][1] or None,
                })
    return output


def main() -> None:
    all_questions: list[dict] = []
    source_counts: dict[str, int] = {}

    source_files = [
        ("detailed-41", ASSETS / "All-Courses-Complete-41_1787047718025.pdf"),
        ("exams-36", ASSETS / "All-Courses-Complete-Exams_1787047718026.pdf"),
        ("topics-56", ASSETS / "IT_56_Topics_30_Question_Practice_Exam_1787047718026.pdf"),
    ]
    for source, path in source_files:
        text = read_pdf(path)
        if source == "topics-56":
            parsed = parse_topic_pdf(text)
        else:
            parsed = []
            for name, lines in split_pdf_courses(text, source):
                parsed.extend(parse_course_segment(lines, name))
        for question in parsed:
            question["source"] = source
        source_counts[source] = len(parsed)
        all_questions.extend(parsed)

    docx_questions = parse_docx(ASSETS / "New_Microsoft_Word_Document_(2)_1787047718026.docx")
    for question in docx_questions:
        question["source"] = "docx"
    source_counts["docx"] = len(docx_questions)
    all_questions.extend(docx_questions)

    # Deduplicate within each source first, preserving the first complete explanation.
    deduplicated: list[dict] = []
    seen: set[tuple] = set()
    for question in all_questions:
        key = (
            normalize(question["course"]),
            question["level"],
            normalize(question["text"]),
            tuple(normalize(option) for option in question["options"]),
        )
        if key in seen:
            continue
        seen.add(key)
        deduplicated.append(question)

    report = {
        "sourceCounts": source_counts,
        "parsedCount": len(all_questions),
        "deduplicatedCount": len(deduplicated),
        "courses": {},
        "questions": deduplicated,
    }
    for question in deduplicated:
        key = question["course"]
        report["courses"].setdefault(key, {level: 0 for level in LEVELS})
        report["courses"][key][question["level"]] += 1

    (OUTPUT / "question-bank.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({
        "sourceCounts": source_counts,
        "parsedCount": len(all_questions),
        "deduplicatedCount": len(deduplicated),
        "courseCount": len(report["courses"]),
        "courseBreakdown": report["courses"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()