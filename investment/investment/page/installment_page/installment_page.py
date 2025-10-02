import frappe
import json
from frappe.utils import flt, cint, getdate, add_months

@frappe.whitelist()
def calculate(doc):
    if isinstance(doc, str):
        doc = json.loads(doc)
    d = frappe._dict(doc or {})

    price = flt(d.get("tannarx", 0))
    down = flt(d.get("boshlangich_tolov", 0))
    months = cint(d.get("muddat", 0))
    monthly = flt(d.get("oylik_tolov", 0))

    principal = round(price - down, 2)
    monthly_total = round(monthly * months, 2)
    total_paid = round(down + monthly_total, 2)
    sof_foyda = round(monthly_total - max(0, principal), 2)
    foiz = round((sof_foyda / principal) * 100, 2) if principal > 0 else 0.0

    return {"umumiy_tolov": total_paid, "sof_foyda": sof_foyda, "foiz": foiz}

@frappe.whitelist()
def generate_schedule(doc):
    if isinstance(doc, str):
        doc = json.loads(doc)
    d = frappe._dict(doc or {})

    months = cint(d.get("muddat", 0))
    monthly = flt(d.get("oylik_tolov", 0))
    start = d.get("boshlanish_sanasi")

    rows = []
    start_date = getdate(start) if start else None
    for i in range(months):
        sana_str = add_months(start_date, i).strftime("%Y-%m-%d") if start_date else None
        rows.append({
            "oy": i+1,
            "tolov_sanasi": sana_str,
            "tolov_summasi": monthly,
            "tolangan": 0,
            "qolgan": monthly
        })
    return rows
@frappe.whitelist()
def save_and_continue(doc):
    data = frappe._dict(doc)

    # Doctype ichiga yozib qo'yish (masalan Installment Calculator)
    new_doc = frappe.get_doc({
        "doctype": "Installment Calculator",
        "tannarx": data.tannarx,
        "boshlangich_tolov": data.boshlangich_tolov,
        "muddat": data.muddat,
        "oylik_tolov": data.oylik_tolov,
        "boshlanish_sanasi": data.boshlanish_sanasi
    })
    new_doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return "success"

