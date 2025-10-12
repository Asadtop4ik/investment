import frappe
from frappe import _
from frappe.utils import flt, getdate, add_months
from erpnext.selling.doctype.customer.customer import Customer
from erpnext.stock.doctype.item.item import Item


# =====================================
# STEP 1: MIJOZLAR → CUSTOMER SYNC
# =====================================

def sync_mijoz_to_customer(mijoz_doc, method=None):
	"""
	Mijozlar DocType save/update bo'lganda
	ERPNext Customer'ga avtomatik sync qilish

	Triggers: after_insert, on_update
	"""

	customer_name = f"{mijoz_doc.ism} {mijoz_doc.familya}"

	# Mavjud Customer borligini tekshirish
	existing_customer = frappe.db.get_value('Customer',
											{'custom_passport_id': mijoz_doc.passport_id},
											'name'
											)

	if existing_customer:
		# UPDATE existing customer
		customer = frappe.get_doc('Customer', existing_customer)
		customer.customer_name = customer_name
		customer.mobile_no = mijoz_doc.telefon_raqam
		customer.custom_passport_id = mijoz_doc.passport_id
		customer.save(ignore_permissions=True)

		frappe.logger().info(f"✅ Customer updated: {customer.name}")
	else:
		# CREATE new customer
		customer = frappe.get_doc({
			'doctype': 'Customer',
			'customer_name': customer_name,
			'customer_type': 'Individual',
			'customer_group': 'Individual',
			'territory': 'All Territories',
			'default_currency': 'USD',
			'custom_passport_id': mijoz_doc.passport_id,
			'custom_mijoz_link': mijoz_doc.name,
			'mobile_no': mijoz_doc.telefon_raqam
		})

		customer.insert(ignore_permissions=True)

		frappe.logger().info(f"✅ Customer created: {customer.name}")

	# Link back to Mijozlar
	mijoz_doc.db_set('customer_link', customer.name, update_modified=False)

	return customer.name


def get_customer_from_mijoz(mijoz_name):
	"""
	Mijozlar name'dan Customer name olish
	"""

	mijoz = frappe.get_doc('Mijozlar', mijoz_name)

	# Agar link mavjud bo'lsa
	if mijoz.get('customer_link') and frappe.db.exists('Customer', mijoz.customer_link):
		return mijoz.customer_link

	# Aks holda sync qilish
	return sync_mijoz_to_customer(mijoz)


# =====================================
# STEP 2: INSTALLMENT PRODUCT → ITEM SYNC
# =====================================

def sync_product_to_item(product_doc, method=None):
	"""
	Installment Product save bo'lganda
	ERPNext Item'ga avtomatik sync qilish

	Triggers: after_insert, on_update
	"""

	company = frappe.defaults.get_user_default('Company')
	abbr = frappe.get_cached_value('Company', company, 'abbr')

	# Item code (unique identifier)
	item_code = f"PROD-{product_doc.name}"

	# Mavjud Item borligini tekshirish
	if frappe.db.exists('Item', item_code):
		# UPDATE existing item
		item = frappe.get_doc('Item', item_code)
		item.item_name = product_doc.product_name
		item.standard_rate = flt(product_doc.price)
		item.description = f"{product_doc.product_name} - IMEI: {product_doc.imei or 'N/A'}"
		item.save(ignore_permissions=True)

		frappe.logger().info(f"✅ Item updated: {item.name}")
	else:
		# CREATE new item
		item = frappe.get_doc({
			'doctype': 'Item',
			'item_code': item_code,
			'item_name': product_doc.product_name,
			'item_group': 'Products',
			'stock_uom': 'Nos',
			'is_stock_item': 0,  # Service item
			'is_sales_item': 1,
			'is_purchase_item': 0,
			'standard_rate': flt(product_doc.price),
			'description': f"{product_doc.product_name} - IMEI: {product_doc.imei or 'N/A'}",
			'custom_imei': product_doc.imei,
			'custom_product_link': product_doc.name
		})

		# Item defaults (Income/Expense accounts)
		item.append('item_defaults', {
			'company': company,
			'income_account': f'Sales - {abbr}',
			'expense_account': f'Cost of Goods Sold - {abbr}'
		})

		item.insert(ignore_permissions=True)

		frappe.logger().info(f"✅ Item created: {item.name}")

	# Link back to Installment Product
	product_doc.db_set('item_link', item_code, update_modified=False)

	return item_code


def get_item_from_product(product_name):
	"""
	Installment Product name'dan Item code olish
	"""

	product = frappe.get_doc('Installment Product', product_name)

	# Agar link mavjud bo'lsa
	if product.get('item_link') and frappe.db.exists('Item', product.item_link):
		return product.item_link

	# Aks holda sync qilish
	return sync_product_to_item(product)


# =====================================
# STEP 3: INVESTMENT APPLICATION → SALES INVOICE
# =====================================

def create_sales_invoice_from_application(app_doc):
	"""
	Investment Application'dan Sales Invoice yaratish
	KO'P MAHSULOT bilan

	Algorithm:
	1. Customer sync (Mijozlar → Customer)
	2. Products sync (har bir mahsulot → Item)
	3. Sales Invoice yaratish (barcha items bilan)
	4. Payment Schedule qo'shish
	"""

	company = frappe.defaults.get_user_default('Company')

	# =====================================
	# 1. CUSTOMER SYNC
	# =====================================
	customer = get_customer_from_mijoz(app_doc.customer)

	# =====================================
	# 2. SALES INVOICE
	# =====================================
	invoice = frappe.get_doc({
		'doctype': 'Sales Invoice',
		'customer': customer,
		'posting_date': getdate(),
		'due_date': app_doc.start_date,
		'currency': 'USD',
		'company': company,
		'custom_investment_application': app_doc.name
	})

	# =====================================
	# 3. ITEMS (Ko'p mahsulot support)
	# =====================================
	total_products_amount = 0

	# Application Products child table'dan
	for product_row in app_doc.products:
		# Har bir mahsulot uchun Item sync
		item_code = get_item_from_product(product_row.product_name)

		invoice.append('items', {
			'item_code': item_code,
			'item_name': product_row.product_name,
			'description': f'{product_row.product_name} - IMEI: {product_row.imei or "N/A"}',
			'qty': 1,
			'rate': flt(product_row.price),
			'amount': flt(product_row.price)
		})

		total_products_amount += flt(product_row.price)

	# =====================================
	# 4. INTEREST (Foiz) - Generic Item
	# =====================================
	if flt(app_doc.profit) > 0:
		# Interest uchun generic item (bir marta yaratish)
		ensure_interest_item_exists()

		invoice.append('items', {
			'item_code': 'INTEREST-INCOME-USD',
			'item_name': 'Interest Income',
			'description': f'{app_doc.installment_period} months installment interest - {app_doc.foiz:.2f}%',
			'qty': 1,
			'rate': flt(app_doc.profit),
			'amount': flt(app_doc.profit)
		})

	# =====================================
	# 5. PAYMENT SCHEDULE
	# =====================================

	# Boshlang'ich to'lov
	if flt(app_doc.down_payment) > 0:
		invoice.append('payment_schedule', {
			'payment_term': 'Boshlang\'ich to\'lov',
			'description': 'Down payment',
			'due_date': app_doc.application_date,
			'invoice_portion': (flt(app_doc.down_payment) / flt(app_doc.total_amount)) * 100,
			'payment_amount': flt(app_doc.down_payment)
		})

	# Oylik to'lovlar (Installment Schedule'dan)
	calculator = frappe.get_doc('Installment Calculator', app_doc.calculator)

	for schedule_row in calculator.installment_schedule:
		invoice.append('payment_schedule', {
			'payment_term': f'{schedule_row.oy}-oy',
			'description': f'Monthly payment - Month {schedule_row.oy}',
			'due_date': schedule_row.tolov_sanasi,
			'invoice_portion': (flt(schedule_row.tolov_summasi) / flt(app_doc.total_amount)) * 100,
			'payment_amount': flt(schedule_row.tolov_summasi)
		})

	# =====================================
	# 6. SAVE & SUBMIT
	# =====================================
	invoice.insert(ignore_permissions=True)

	# Link to Application
	app_doc.db_set('sales_invoice', invoice.name)

	frappe.logger().info(
		f"✅ Sales Invoice created: {invoice.name} with {len(app_doc.products)} products")

	return invoice


def ensure_interest_item_exists():
	"""
	Interest Income item yaratish (generic - bir marta)
	"""

	if frappe.db.exists('Item', 'INTEREST-INCOME-USD'):
		return

	company = frappe.defaults.get_user_default('Company')
	abbr = frappe.get_cached_value('Company', company, 'abbr')

	item = frappe.get_doc({
		'doctype': 'Item',
		'item_code': 'INTEREST-INCOME-USD',
		'item_name': 'Interest Income',
		'item_group': 'Services',
		'stock_uom': 'Nos',
		'is_stock_item': 0,
		'is_sales_item': 1,
		'standard_rate': 0
	})

	item.append('item_defaults', {
		'company': company,
		'income_account': f'Sales - {abbr}',
		'expense_account': f'Cost of Goods Sold - {abbr}'
	})

	item.insert(ignore_permissions=True)
	frappe.logger().info("✅ Interest item created")


# =====================================
# STEP 4: PAYMENT ENTRY
# =====================================

@frappe.whitelist()
def record_payment(application_name, month, amount, mode_of_payment='Cash'):
	"""
	To'lovni Payment Entry orqali qabul qilish
	"""

	app = frappe.get_doc('Investment Application', application_name)

	if not app.sales_invoice:
		frappe.throw(_('Sales Invoice topilmadi!'))

	# Customer
	customer = get_customer_from_mijoz(app.customer)

	# Company settings
	company = frappe.defaults.get_user_default('Company')
	abbr = frappe.get_cached_value('Company', company, 'abbr')

	# Accounts
	receivable_account = frappe.get_cached_value('Company', company, 'default_receivable_account')

	if mode_of_payment == 'Cash':
		cash_account = f'Cash - USD - {abbr}'
	else:
		cash_account = f'Bank - USD - {abbr}'

	# Payment Entry
	payment = frappe.get_doc({
		'doctype': 'Payment Entry',
		'payment_type': 'Receive',
		'party_type': 'Customer',
		'party': customer,
		'posting_date': getdate(),
		'paid_amount': flt(amount),
		'received_amount': flt(amount),
		'source_exchange_rate': 1,
		'target_exchange_rate': 1,
		'paid_from': receivable_account,
		'paid_to': cash_account,
		'paid_from_account_currency': 'USD',
		'paid_to_account_currency': 'USD',
		'company': company,
		'mode_of_payment': mode_of_payment,
		'reference_no': f'{app.name}-Month-{month}',
		'reference_date': getdate()
	})

	# Link to Invoice & Payment Term
	payment_term = f'{month}-oy'

	payment.append('references', {
		'reference_doctype': 'Sales Invoice',
		'reference_name': app.sales_invoice,
		'payment_term': payment_term,
		'allocated_amount': flt(amount)
	})

	payment.insert(ignore_permissions=True)
	payment.submit()

	# Update schedules
	update_installment_schedule(app.calculator, month, amount)
	update_application_totals(app)

	frappe.msgprint(_('✅ To\'lov qabul qilindi: {0}').format(payment.name))

	return payment.name


def update_installment_schedule(calculator_name, month, amount):
	"""Installment Schedule yangilash"""

	calc = frappe.get_doc('Installment Calculator', calculator_name)

	for row in calc.installment_schedule:
		if row.oy == int(month):
			row.tolangan = flt(row.tolangan) + flt(amount)
			row.qolgan = flt(row.tolov_summasi) - flt(row.tolangan)
			break

	calc.save(ignore_permissions=True)


def update_application_totals(app):
	"""Application totals yangilash"""

	# Sales Invoice'dan outstanding olish
	invoice = frappe.get_doc('Sales Invoice', app.sales_invoice)

	total_paid = invoice.grand_total - invoice.outstanding_amount

	app.db_set('total_paid', total_paid, update_modified=False)
	app.db_set('remaining_amount', invoice.outstanding_amount, update_modified=False)

	# Status
	if invoice.outstanding_amount <= 0.01:
		app.db_set('payment_status', 'Completed', update_modified=False)
	elif total_paid > 0:
		app.db_set('payment_status', 'On Time', update_modified=False)


# =====================================
# MAIN WORKFLOW
# =====================================

def on_application_submit(doc, method):
	"""
	Investment Application submit bo'lganda
	"""

	if doc.status != 'Approved':
		return

	try:
		# Sales Invoice yaratish (avtomatik sync bilan)
		invoice = create_sales_invoice_from_application(doc)

		# Boshlang'ich to'lov (agar bor bo'lsa)
		if flt(doc.down_payment) > 0:
			payment = record_payment(doc.name, 0, doc.down_payment, 'Cash')
			doc.db_set('down_payment_entry', payment)

		frappe.msgprint(_('✅ Sales Invoice yaratildi: {0}').format(invoice.name))

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), 'Application Submit Error')
		frappe.throw(_('Xatolik: {0}').format(str(e)))


def on_application_cancel(doc, method):
	"""Cancel qilishda"""

	# Cancel Sales Invoice
	if doc.sales_invoice:
		try:
			invoice = frappe.get_doc('Sales Invoice', doc.sales_invoice)
			if invoice.docstatus == 1:
				invoice.cancel()
		except Exception as e:
			frappe.log_error(str(e), 'Invoice Cancel Error')

	# Cancel Payment Entries
	payments = frappe.get_all('Payment Entry',
							  filters={'docstatus': 1},
							  fields=['name']
							  )

	for payment in payments:
		try:
			pe = frappe.get_doc('Payment Entry', payment.name)
			for ref in pe.references:
				if ref.reference_name == doc.sales_invoice:
					pe.cancel()
					break
		except Exception as e:
			frappe.log_error(str(e), 'Payment Cancel Error')


# =====================================
# QUERIES & REPORTS
# =====================================

@frappe.whitelist()
def get_customer_statement(application_name):
	"""Mijoz statement"""

	app = frappe.get_doc('Investment Application', application_name)
	invoice = frappe.get_doc('Sales Invoice', app.sales_invoice)

	# Payment Schedule
	schedule = []
	for term in invoice.payment_schedule:
		schedule.append({
			'term': term.payment_term,
			'due_date': str(term.due_date),
			'amount': term.payment_amount,
			'paid': term.paid_amount,
			'outstanding': term.payment_amount - term.paid_amount
		})

	# Payment History
	payments = frappe.get_all('Payment Entry',
							  filters={'docstatus': 1},
							  fields=['name', 'posting_date', 'paid_amount', 'mode_of_payment']
							  )

	payment_history = []
	for pe in payments:
		pe_doc = frappe.get_doc('Payment Entry', pe.name)
		for ref in pe_doc.references:
			if ref.reference_name == app.sales_invoice:
				payment_history.append({
					'date': str(pe.posting_date),
					'amount': pe.paid_amount,
					'mode': pe.mode_of_payment,
					'entry': pe.name
				})
				break

	return {
		'customer': invoice.customer_name,
		'total': invoice.grand_total,
		'paid': invoice.grand_total - invoice.outstanding_amount,
		'outstanding': invoice.outstanding_amount,
		'schedule': schedule,
		'payment_history': payment_history
	}


@frappe.whitelist()
def get_all_customers_outstanding():
	"""Barcha qarzdorlar"""

	query = """
        SELECT
            si.name as invoice,
            si.customer_name,
            si.grand_total as total,
            si.outstanding_amount as outstanding,
            ia.name as application,
            (SELECT ps.due_date
             FROM `tabPayment Schedule` ps
             WHERE ps.parent = si.name
             AND ps.paid_amount < ps.payment_amount
             ORDER BY ps.due_date LIMIT 1) as next_due
        FROM
            `tabSales Invoice` si
        INNER JOIN
            `tabInvestment Application` ia ON si.custom_investment_application = ia.name
        WHERE
            si.docstatus = 1
            AND si.outstanding_amount > 0
        ORDER BY
            next_due
    """

	return frappe.db.sql(query, as_dict=1)
