# investment/simple_integration.py
"""
ODDIY INTEGRATSIYA - Xatosiz
"""

import frappe
from frappe import _
from frappe.utils import flt, getdate


@frappe.whitelist()
def create_customer_from_mijoz(mijoz_name):
	"""
	Mijozlar'dan Customer yaratish (manual)
	"""

	mijoz = frappe.get_doc('Mijozlar', mijoz_name)
	customer_name = f"{mijoz.ism} {mijoz.familya}"

	# Mavjud Customer tekshiruvi
	if frappe.db.exists('Customer', {'customer_name': customer_name}):
		return frappe.db.get_value('Customer', {'customer_name': customer_name}, 'name')

	# Yangi Customer
	customer = frappe.get_doc({
		'doctype': 'Customer',
		'customer_name': customer_name,
		'customer_type': 'Individual',
		'customer_group': 'Individual',
		'territory': 'All Territories',
		'default_currency': 'USD',
		'mobile_no': mijoz.telefon_raqam
	})

	customer.insert(ignore_permissions=True)
	frappe.db.commit()

	frappe.msgprint(f'✅ Customer yaratildi: {customer.name}')

	return customer.name


@frappe.whitelist()
def create_item_from_product(product_name):
	"""
	Installment Product'dan Item yaratish (manual)
	"""

	product = frappe.get_doc('Installment Product', product_name)
	item_code = f"PROD-{product.name}"

	# Mavjud Item tekshiruvi
	if frappe.db.exists('Item', item_code):
		return item_code

	company = frappe.defaults.get_user_default('Company')
	abbr = frappe.get_cached_value('Company', company, 'abbr')

	# Yangi Item
	item = frappe.get_doc({
		'doctype': 'Item',
		'item_code': item_code,
		'item_name': product.product_name,
		'item_group': 'Products',
		'stock_uom': 'Nos',
		'is_stock_item': 0,
		'is_sales_item': 1,
		'standard_rate': flt(product.price)
	})

	item.append('item_defaults', {
		'company': company,
		'income_account': f'Sales - {abbr}',
		'expense_account': f'Cost of Goods Sold - {abbr}'
	})

	item.insert(ignore_permissions=True)
	frappe.db.commit()

	frappe.msgprint(f'✅ Item yaratildi: {item.name}')

	return item_code


@frappe.whitelist()
def test_integration():
	"""
	Test - hamma narsa ishlayaptimi?
	"""

	# 1. Company bormi?
	company = frappe.defaults.get_user_default('Company')
	if not company:
		return {'success': False, 'message': 'Company topilmadi!'}

	# 2. Accounts bormi?
	abbr = frappe.get_cached_value('Company', company, 'abbr')
	cash_account = f'Cash - USD - {abbr}'

	if not frappe.db.exists('Account', cash_account):
		return {'success': False, 'message': f'Account topilmadi: {cash_account}'}

	return {
		'success': True,
		'message': '✅ Hammasi tayyor!',
		'company': company,
		'cash_account': cash_account
	}

def auto_sync_customer(doc, method):
    """Avtomatik Customer yaratish"""
    try:
        create_customer_from_mijoz(doc.name)
    except Exception as e:
        frappe.log_error(str(e), 'Auto Customer Sync Error')

def auto_sync_item(doc, method):
    """Avtomatik Item yaratish"""
    try:
        create_item_from_product(doc.name)
    except Exception as e:
        frappe.log_error(str(e), 'Auto Item Sync Error')
