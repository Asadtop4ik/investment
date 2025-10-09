import frappe
from frappe.model.document import Document
class InstallmentApplication(Document):
    pass

class InstallmentApplication(Document):
    def validate(self):
        # 1. Umumiy summa (mahsulotlar bo‘yicha)
        total_price = 0
        for item in self.products:
            if item.price:
                total_price += item.price
        self.umumiy_summa = total_price





        # 3. Status hisoblash
      #   if self.qolgan_summa <= 0 and self.umumiy_summa > 0:
      #       self.status = "Paid"
      #   elif self.tolangan_summa >= 0 :
      #      self.status = "Active"
      #   elif self.qolgan_summa > 0 and self.status != "Draft":
      #       self.status = "Overdue"
      #   else:
      #       self.status = "Draft"
