# apps/investment/investment/api.py
import frappe
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

@frappe.whitelist()
def calculate(price, down, months, monthly):
    """
    Kiruvchi qiymatlar string sifatida keladi.
    Return: dict {umumiy_tolov, sof_foyda, foiz}
    """
    try:
        price = float(price or 0)
        down = float(down or 0)
        months = int(float(months or 0))
        monthly = float(monthly or 0)
    except Exception:
        frappe.throw("Noto'g'ri kirish qiymatlari")

    if months <= 0:
        return {"umumiy_tolov": 0.0, "sof_foyda": 0.0, "foiz": 0.0}

    principal = round(max(0.0, price - down), 2)
    monthly_total = round(monthly * months, 2)
    total_paid = round(down + monthly_total, 2)
    sof_foyda = round(max(0.0, monthly_total - principal), 2)

    foiz = 0.0
    if principal > 0:
        foiz = round((sof_foyda / principal) * 100, 2)

    return {
        "umumiy_tolov": total_paid,
        "sof_foyda": sof_foyda,
        "foiz": foiz
    }

@frappe.whitelist()
def generate_schedule(price, down, months, monthly, start_date):
    """
    Jadval yaratish: ro'yxat qaytaradi
    har bir element: {oy, sana, tolov_summasi, tolangan, qolgan}
    """
    try:
        price = float(price or 0)
        down = float(down or 0)
        months = int(float(months or 0))
        monthly = float(monthly or 0)
    except Exception:
        frappe.throw("Noto'g'ri kirish qiymatlari")

    # start_date kelishi "YYYY-MM-DD" yoki boshqa format bo'lishi mumkin
    try:
        if not start_date:
            start = datetime.today().date()
        else:
            start = datetime.strptime(start_date.split("T")[0], "%Y-%m-%d").date()
    except Exception:
        start = datetime.today().date()

    principal = round(max(0.0, price - down), 2)
    rows = []
    remaining = principal
    # agar down > 0, principal dan ayiramiz (biz shu asosda qolganni ko'rsatamiz)
    for i in range(1, months + 1):
        pay_date = start + relativedelta(months=i-1)
        tolov_summasi = round(monthly, 2)
        tolangan = 0.0
        # default qolgan = oldingi qolgan - oylik
        remaining = round(max(0.0, remaining - tolov_summasi), 2)
        rows.append({
            "oy": i,
            "sana": pay_date.strftime("%Y-%m-%d"),
            "tolov_summasi": tolov_summasi,
            "tolangan": 0.0,
            "qolgan": remaining
        })

    return rows
