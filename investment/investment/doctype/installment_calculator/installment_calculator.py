# Copyright (c) 2025, AsadStack and contributors
# For license information, please see license.txt

# import frappe

# -*- coding: utf-8 -*-
import json
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, cint, getdate, add_months


class InstallmentCalculator(Document):
    pass


@frappe.whitelist()
def calculate(doc):
    """
    Server-side calculation. `doc` may be a dict or JSON string.
    Returns dict with: umumiy_tolov, sof_foyda, foiz
    """
    if isinstance(doc, str):
        try:
            doc = json.loads(doc)
        except Exception:
            doc = frappe.get_doc("Installment Calculator", doc).as_dict()

    d = frappe._dict(doc or {})
    price   = flt(d.get("tannarx", 0))
    down    = flt(d.get("boshlangich_tolov", 0))
    months  = cint(d.get("muddat", 0))
    monthly = flt(d.get("oylik_tolov", 0))

    principal     = round(price - down, 2)
    monthly_total = round(monthly * months, 2)
    total_paid    = round(down + monthly_total, 2)
    sof_foyda     = round(monthly_total - max(0, principal), 2)
    foiz          = round((sof_foyda / principal) * 100, 2) if principal > 0 else 0.0

    return {"umumiy_tolov": total_paid, "sof_foyda": sof_foyda, "foiz": foiz}


@frappe.whitelist()
def generate_schedule(doc):
    """
    Build and RETURN schedule rows (does NOT save).
    Accepts doc name, JSON string, or dict.
    Returns list[dict] with keys matching CHILD FIELDS:
      oy, tolov_sanasi, tolov_summasi, tolangan, qolgan
    """
    if isinstance(doc, str):
        try:
            doc = json.loads(doc)
        except Exception:
            doc = frappe.get_doc("Installment Calculator", doc).as_dict()

    d = frappe._dict(doc or {})
    months  = cint(d.get("muddat", 0))
    monthly = flt(d.get("oylik_tolov", 0))
    start   = d.get("boshlanish_sanasi")

    rows = []
    try:
        start_date = getdate(start) if start else None
    except Exception:
        start_date = None

    for i in range(months):
        oy = i + 1
        sana_str = add_months(start_date, i).strftime("%Y-%m-%d") if start_date else None
        tolov_summasi = round(monthly, 2)

        # Boshlanganda: hali to'lanmagan
        tolangan = 0.0
        qolgan = tolov_summasi

        rows.append({
            "oy": oy,
            "tolov_sanasi": sana_str,
            "tolov_summasi": tolov_summasi,
            "tolangan": tolangan,
            "qolgan": qolgan
        })

    return rows


@frappe.whitelist()
def create_schedule(name):
    """
    Create/overwrite rows in the child table and SAVE the document.
    Called by the 'Jadval yarat' button.
    """
    doc = frappe.get_doc("Installment Calculator", name)

    months = cint(getattr(doc, "muddat", 0))
    if months <= 0:
        doc.set("installment_schedule", [])
        doc.save()
        return True

    rows = generate_schedule(doc.as_dict())

    doc.set("installment_schedule", [])
    for row in rows:
        doc.append("installment_schedule", row)

    doc.save()
    return True
