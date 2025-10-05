import re
import frappe
from frappe.model.document import Document


class Mijozlar(Document):
    def validate(self):
        """
        Passport ID formatini tekshirish (2 ta katta harf + 7 raqam).
        """
        if self.passport_id:
            self.passport_id = self.passport_id.upper()
            if not re.match(r"^[A-Z]{2}[0-9]{7}$", self.passport_id):
                frappe.throw("❌ Passport ID formati noto‘g‘ri! (masalan: AB1234567)")

    def after_insert(self):
        """
        Yangi mijoz kiritilganda → ma'lumotlarni va tarixni yuklash
        """
        data = fetch_customer_data(self.passport_id)

        # Agar mijoz oldin mavjud bo'lsa → fieldlarni avtomatik to'ldiramiz
        if data.get("customer_data"):
            cust = data["customer_data"]
            self.ism = cust.get("ism") or self.ism
            self.familya = cust.get("familya") or self.familya
            self.telefon_raqam = cust.get("telefon_raqam") or self.telefon_raqam
            self.manzil = cust.get("manzil") or self.manzil
            self.rasm = cust.get("rasm") or self.rasm
            self.passport_nusxa = cust.get("passport_nusxa") or self.passport_nusxa


        # Eski tarixni o'chirib tashlaymiz
        self.set("sales_history", [])

        # Tarixni qo'shamiz
        for row_data in data.get("history", []):
            row = self.append("sales_history", {})
            row.maxsulotlar = row_data["maxsulotlar"]
            row.narx = row_data["narx"]
            row.sana = row_data["sana"]   # endi ariza sanasi olinadi
            row.status = row_data["status"]

        frappe.msgprint("✅ Mijoz ma'lumotlari va tarixi yuklandi.")


@frappe.whitelist()
def fetch_customer_data(passport_id):
    """
    Passport ID orqali Mijoz ma'lumotlarini va Installment Application tarixini qaytaradi
    """
    if not passport_id:
        return {"error": "Passport ID required"}

    passport_id = passport_id.upper()
    if not re.match(r"^[A-Z]{2}[0-9]{7}$", passport_id):
        return {"skip": True}

    # Mijozni topamiz
    customer = frappe.get_all(
        "Mijozlar",
        filters={"passport_id": passport_id},
        fields=["name", "ism", "familya", "telefon_raqam", "manzil", "rasm", "passport_nusxa"],
        limit_page_length=1
    )
    customer = customer[0] if customer else None

    history = []
    if customer:
        # Shu mijozga tegishli Installment Application larni topamiz
        apps = frappe.get_all(
            "Installment Application",
            filters={"customer": customer["name"]},
            fields=["name", "application_date", "umumiy_summa", "status"],
            order_by="application_date desc"
        )

        for app in apps:
            # Mahsulotlarni yig'amiz
            items = frappe.get_all(
                "Installment Product",   # ⚠️ bu child doctype nomini aniq yozing
                filters={"parent": app["name"]},
                fields=["mahsulot_nomi"]
            )
            product_names = ", ".join([i["mahsulot_nomi"] for i in items]) if items else ""

            history.append({
                "sana": app["application_date"],     # endi ariza sanasi
                "maxsulotlar": product_names,
                "narx": app["umumiy_summa"],
                "status": app["status"]
            })

    return {"customer_data": customer, "history": history}
