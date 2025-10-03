import frappe
from frappe.model.document import Document

class InstallmentApplication(Document):
    def validate(self):
        # 1. Umumiy summa (mahsulotlar bo‘yicha)
        total_price = 0
        for item in self.application_products:
            if item.price:
                total_price += item.price
        self.umumiy_summa = total_price

        # 2. To'langan va qolgan summa (jadval bo‘yicha)
        total_paid = 0
        if self.tolov_jadvali:
            for row in self.tolov_jadvali:
                total_paid += row.tolangan or 0

        self.tolangan_summa = total_paid
        self.qolgan_summa = self.umumiy_summa - self.tolangan_summa

        # 3. Status hisoblash
        if self.qolgan_summa <= 0 and self.umumiy_summa > 0:
            self.status = "Paid"
        elif self.tolangan_summa > 0 and self.qolgan_summa > 0:
            self.status = "Active"
        elif self.qolgan_summa > 0 and self.status != "Draft":
            self.status = "Overdue"
        else:
            self.status = "Draft"
