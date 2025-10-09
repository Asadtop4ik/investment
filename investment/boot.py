import frappe

def boot_session(bootinfo):
    user = frappe.session.user
    if user == "Guest":
        return

    roles = frappe.get_roles(user)
    if "Operator" in roles:
        # Foydalanuvchi Operator bo‘lsa, uni to‘g‘ridan-to‘g‘ri shu page’ga yo‘naltiramiz
        bootinfo["home_page"] = "/app/installment-wizard"
