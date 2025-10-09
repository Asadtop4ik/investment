import frappe
from frappe.model.document import Document

class InstallmentApplication(Document):
    def validate(self):
        # 1. Umumiy summa (mahsulotlar bo'yicha)
        total_price = 0
        for item in self.products:
            if item.price:
                total_price += item.price
        self.total_amount = total_price





        # 3. Status hisoblash
      #   if self.remaining_amount <= 0 and self.total_amount > 0:
      #       self.status = "Paid"
      #   elif self.total_paid >= 0 :
      #      self.status = "Active"
      #   elif self.remaining_amount > 0 and self.status != "Draft":
      #       self.status = "Overdue"
      #   else:
      #       self.status = "Draft"
