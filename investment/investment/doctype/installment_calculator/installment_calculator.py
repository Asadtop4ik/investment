# Copyright (c) 2025, AsadStack and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class InstallmentCalculator(Document):
	pass


# -*- coding: utf-8 -*-
import frappe
import json
from frappe import _
from frappe.utils import flt, cint, getdate, add_months

@frappe.whitelist()
def calculate(doc):
    """
    Server-side calculation. `doc` may be a dict or JSON string.
    Returns dict with umumiy_tolov, sof_foyda, foiz
    """
    if isinstance(doc, str):
        try:
            doc = json.loads(doc)
        except Exception:
            # fallback: try to get document by name
            doc = frappe.get_doc("Installment Calculator", doc).as_dict()

    d = frappe._dict(doc or {})
    price = flt(d.get("tannarx", 0))
    down = flt(d.get("boshlangich_tolov", d.get("boshlangich_to'lov", 0)))
    months = cint(d.get("muddat", 0))
    monthly = flt(d.get("oylik_tolov", d.get("oylik_to_lov", 0)))

    principal = round(price - down, 2)
    monthly_total = round(monthly * months, 2)
    total_paid = round(down + monthly_total, 2)
    sof_foyda = round(monthly_total - max(0, principal), 2)
    foiz = 0.0
    if principal > 0:
        foiz = round((sof_foyda / principal) * 100, 2)

    return {"umumiy_tolov": total_paid, "sof_foyda": sof_foyda, "foiz": foiz}

@frappe.whitelist()
def generate_schedule(doc):
    """
    Return a list of rows for the child table.
    Each row is dict with keys: oy, sana, tolov_summasi, tolangan, qolgan
    """
    if isinstance(doc, str):
        try:
            doc = json.loads(doc)
        except Exception:
            doc = frappe.get_doc("Installment Calculator", doc).as_dict()

    d = frappe._dict(doc or {})
    price = flt(d.get("tannarx", 0))
    down = flt(d.get("boshlangich_tolov", d.get("boshlangich_to'lov", 0)))
    months = cint(d.get("muddat", 0))
    monthly = flt(d.get("oylik_tolov", d.get("oylik_to_lov", 0)))
    start = d.get("boshlanish_sanasi") or d.get("boshlanish_sana")

    principal = round(price - down, 2)
    rows = []

    # parse start date safely
    try:
        start_date = getdate(start) if start else None
    except Exception:
        start_date = None

    for i in range(months):
        oy = i + 1
        if start_date:
            sana = add_months(start_date, i)
            sana_str = sana.strftime("%Y-%m-%d")
        else:
            sana_str = None
        tolov_summasi = round(monthly, 2)
        tolangan = 0.0
        # qolgan after this payment
        paid_so_far = round(monthly * (i + 1), 2)
        qolgan = round(max(0, principal - paid_so_far), 2)
        rows.append({
            "oy": oy,
            "sana": sana_str,
            "tolov_summasi": tolov_summasi,
            "tolangan": tolangan,
            "qolgan": qolgan
        })

    return rows
