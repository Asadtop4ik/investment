import frappe
from frappe import _
from frappe.utils import flt, getdate, add_months

def _r2(x): return round(flt(x), 2)

def _recompute_totals(app):
    app.umumiy_tolov = _r2(flt(app.boshlangich_tolov) + flt(app.muddat) * flt(app.oylik_tolov))
    profit = flt(app.umumiy_tolov) - flt(app.tannarx)
    app.foyda_som = _r2(profit)
    app.foiz_percent = _r2((profit / flt(app.tannarx) * 100.0) if flt(app.tannarx) else 0)

@frappe.whitelist()
def create_application():
    doc = frappe.new_doc("Installment Application")
    doc.current_step = 1
    doc.status = "In Progress"
    doc.insert(ignore_permissions=True)
    return {"application": doc.name}

@frappe.whitelist()
def save_step1(app_name, tannarx, boshlangich_tolov, muddat, oylik_tolov, boshlanish_sanasi):
    app = frappe.get_doc("Installment Application", app_name)
    app.tannarx = flt(tannarx)
    app.boshlangich_tolov = flt(boshlangich_tolov)
    app.muddat = int(muddat)
    app.oylik_tolov = flt(oylik_tolov)
    app.boshlanish_sanasi = getdate(boshlanish_sanasi)
    _recompute_totals(app)
    app.current_step = max(2, int(app.current_step or 1))
    app.save(ignore_permissions=True)
    return {"ok": True}

@frappe.whitelist()
def save_step2(app_name, items: dict | None = None):
    app = frappe.get_doc("Installment Application", app_name)
    app.set("application_products", [])
    if items:
        for it in items:
            r = app.append("application_products", {})
            r.product_name = (it or {}).get("product_name")
            r.imei = (it or {}).get("imei")
            r.price = flt((it or {}).get("price"))
            r.supplier = (it or {}).get("supplier")
            r.comment = (it or {}).get("comment")
    app.current_step = max(3, int(app.current_step or 1))
    app.save(ignore_permissions=True)
    return {"ok": True, "count": len(app.application_products)}

@frappe.whitelist()
def save_step3(app_name, customer, branch=None):
    app = frappe.get_doc("Installment Application", app_name)
    if not customer:
        frappe.throw(_("Customer majburiy"))
    app.customer = customer
    app.branch = branch or app.branch
    app.current_step = max(4, int(app.current_step or 1))
    app.save(ignore_permissions=True)
    return {"ok": True}

@frappe.whitelist()
def get(app_name):
    app = frappe.get_doc("Installment Application", app_name)
    return app.as_dict(no_default_fields=False)

def _generate_schedule(contract):
    contract.set("installment_schedule", [])
    start = getdate(contract.boshlanish_sanasi)
    monthly = _r2(contract.oylik_tolov)
    months = int(contract.muddat)
    for i in range(1, months + 1):
        row = contract.append("installment_schedule", {})
        row.oy = i
        row.tolov_sanasi = add_months(start, i - 1)
        row.tolov_summasi = monthly
        row.tolangan = 0
        row.qolgan = monthly

@frappe.whitelist()
def create_contract_from_application(app_name):
    app = frappe.get_doc("Installment Application", app_name)
    for f in ["tannarx","boshlangich_tolov","muddat","oylik_tolov","boshlanish_sanasi","customer"]:
        if not app.get(f):
            frappe.throw(_("Application field is missing: {0}").format(f))

    contract = frappe.new_doc("Installment Contract")
    contract.customer = app.customer
    contract.branch = app.branch
    contract.tannarx = app.tannarx
    contract.boshlangich_tolov = app.boshlangich_tolov
    contract.muddat = app.muddat
    contract.oylik_tolov = app.oylik_tolov
    contract.boshlanish_sanasi = app.boshlanish_sanasi
    contract.umumiy_tolov = _r2(app.umumiy_tolov)
    contract.set("foiz_%", _r2(app.foiz_percent))
    contract.foyda_som = _r2(app.foyda_som)

    _generate_schedule(contract)
    contract.status = "Active"
    contract.insert(ignore_permissions=True)

    # print (PDF)
    html = frappe.get_print("Installment Contract", contract.name, "Installment Contract (PDF)")
    from frappe.utils.pdf import get_pdf
    pdf_bytes = get_pdf(html)
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": f"{contract.name}.pdf",
        "attached_to_doctype": "Installment Contract",
        "attached_to_name": contract.name,
        "content": pdf_bytes,
        "is_private": 1
    })
    file_doc.insert(ignore_permissions=True)

    app.status = "Completed"
    app.save(ignore_permissions=True)

    return {"contract": contract.name, "pdf_url": file_doc.file_url}
