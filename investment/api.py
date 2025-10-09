import frappe
from frappe import _
from frappe.utils import nowdate, add_months, getdate, flt
import json


@frappe.whitelist()
def create_installment_application(data):
	"""
	Wizard'dan kelgan ma'lumotlarni qabul qilib,
	barcha kerakli DocType'larni yaratadi
	"""
	try:
		data = json.loads(data) if isinstance(data, str) else data

		# Debug logging
		frappe.logger().info(f"Received customer_photo: {bool(data.get('customer_photo'))}")
		frappe.logger().info(f"Received passport_file_url: {bool(data.get('passport_file_url'))}")

		# Rasm va passport faylini saqlash
		customer_photo = None
		passport_file = None

		# Base64 rasmni saqlash
		if data.get('customer_photo'):
			try:
				customer_photo = save_base64_image(
					data.get('customer_photo'),
					'customer_photo.jpg'
				)
				frappe.logger().info(f"Saved customer photo: {customer_photo}")
			except Exception as e:
				frappe.log_error(f"Error saving customer photo: {str(e)}", "Photo Save Error")
				# Don't fail if photo doesn't save
				customer_photo = None

		if data.get('passport_file_url'):
			passport_file = data.get('passport_file_url')

		# Customer ma'lumotlariga qo'shish
		customer_data = data['customer'].copy()
		if customer_photo:
			customer_data['rasm'] = customer_photo
		if passport_file:
			customer_data['passport_nusxa'] = passport_file

		# 1. Mijozni yaratish yoki topish
		customer = create_or_get_customer(customer_data)

		# 2. Mahsulotlarni yaratish
		products = []
		for product_data in data['products']:
			product = create_installment_product(product_data)
			products.append(product)

		# 3. Calculator ma'lumotlarini saqlash
		calculator = create_installment_calculator(data['calculator'])

		# 4. Asosiy arizani yaratish
		application = create_application(
			customer=customer,
			products=products,
			calculator=calculator,
			data=data
		)

		frappe.db.commit()

		return {
			'success': True,
			'application': application.name,
			'customer': customer.name,
			'customer_photo_saved': bool(customer_photo),
			'message': _('Ariza muvaffaqiyatli yaratildi!')
		}

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), 'Installment Application Error')
		frappe.throw(_('Xatolik yuz berdi: {0}').format(str(e)))

def create_or_get_customer(customer_data):
	"""Mijozni yaratish yoki mavjud bo'lsa topish"""

	# Passport ID bo'yicha tekshirish
	existing = frappe.db.get_value('Mijozlar',
								   {'passport_id': customer_data.get('passport_id')},
								   'name'
								   )

	if existing:
		customer = frappe.get_doc('Mijozlar', existing)
		# Ma'lumotlarni yangilash
		customer.ism = customer_data.get('ism')
		customer.familya = customer_data.get('familya')
		customer.telefon_raqam = customer_data.get('telefon_raqam')
		customer.manzil = customer_data.get('manzil')
		customer.jshshir = customer_data.get('jshshir')
		customer.qoshimcha_raqam = customer_data.get('qoshimcha_raqam')
		customer.karta_raqam = customer_data.get('karta_raqam')

		# Passport nusxasi - faqat agar yangi file bo'lsa
		if customer_data.get('passport_nusxa'):
			customer.passport_nusxa = customer_data.get('passport_nusxa')

		# Rasm - faqat agar yangi rasm bo'lsa
		if customer_data.get('rasm'):
			customer.rasm = customer_data.get('rasm')
			frappe.logger().info(f"Updated customer photo: {customer.rasm}")

		customer.flags.ignore_permissions = True
		customer.save()
		frappe.logger().info(f"Updated customer {customer.name}")
	else:
		customer = frappe.get_doc({
			'doctype': 'Mijozlar',
			'ism': customer_data.get('ism'),
			'familya': customer_data.get('familya'),
			'passport_id': customer_data.get('passport_id'),
			'telefon_raqam': customer_data.get('telefon_raqam'),
			'manzil': customer_data.get('manzil'),
			'jshshir': customer_data.get('jshshir'),
			'qoshimcha_raqam': customer_data.get('qoshimcha_raqam'),
			'karta_raqam': customer_data.get('karta_raqam'),
			'passport_nusxa': customer_data.get('passport_nusxa'),
			'rasm': customer_data.get('rasm')
		})
		customer.flags.ignore_permissions = True
		customer.insert()
		frappe.logger().info(f"Created new customer {customer.name} with photo: {customer.rasm}")

	return customer



def create_installment_product(product_data):
	"""Mahsulotni yaratish"""

	product = frappe.get_doc({
		'doctype': 'Installment Product',
		'product_name': product_data.get('product_name'),
		'imei': product_data.get('imei'),
		'phone_number': product_data.get('phone_number'),
		'icloud': product_data.get('icloud'),
		'price': product_data.get('price'),
		'supplier': product_data.get('supplier'),
		'active': 1,
		'comment': product_data.get('comment')
	})
	product.insert()

	return product


def create_installment_calculator(calc_data):
	"""Kalkulyator ma'lumotlarini saqlash"""

	calculator = frappe.get_doc({
		'doctype': 'Installment Calculator',
		'tannarx': calc_data.get('tannarx'),
		'boshlangich_tolov': calc_data.get('boshlangich_tolov'),
		'muddat': calc_data.get('muddat'),
		'oylik_tolov': calc_data.get('oylik_tolov'),
		'boshlanish_sanasi': calc_data.get('boshlanish_sanasi'),
		'umumiy_tolov': calc_data.get('umumiy_tolov'),
		'sof_foyda': calc_data.get('sof_foyda'),
		'foiz': calc_data.get('foiz')
	})

	# To'lov jadvalini yaratish
	start_date = getdate(calc_data.get('boshlanish_sanasi'))
	monthly_payment = flt(calc_data.get('oylik_tolov'))
	total_months = int(calc_data.get('muddat'))

	for month in range(1, total_months + 1):
		payment_date = add_months(start_date, month)

		calculator.append('installment_schedule', {
			'oy': month,
			'tolov_sanasi': payment_date,
			'tolov_summasi': monthly_payment,
			'qolgan': monthly_payment
		})

	calculator.insert()

	return calculator


def create_application(customer, products, calculator, data):


	application = frappe.get_doc({
		'doctype': 'Installment Application',  # Bu DocType yaratilishi kerak
		'customer': customer.name,
		'customer_name': f"{customer.ism} {customer.familya}",
		'application_date': nowdate(),
		'calculator': calculator.name,
		'total_amount': calculator.tannarx,
		'down_payment': calculator.boshlangich_tolov,
		'installment_period': calculator.muddat,
		'monthly_payment': calculator.oylik_tolov,
		'start_date': calculator.boshlanish_sanasi,
		'status': 'Draft'
	})

	# Mahsulotlarni qo'shish
	for product in products:
		application.append('products', {
			'product': product.name,
			'product_name': product.product_name,
			'imei': product.imei,
			'price': product.price,
			'supplier': product.supplier,
			'comment': product.comment
		})

	application.insert()

	# Mijoz tarixiga qo'shish
	customer.append('sales_history', {
		'maxsulotlar': ', '.join([p.product_name for p in products]),
		'narx': calculator.tannarx,
		'sana': nowdate(),
		'status': 'Yangi'
	})
	customer.save()

	return application


@frappe.whitelist()
def get_customer_history(customer_id):
	"""Mijoz tarixini olish"""

	customer = frappe.get_doc('Mijozlar', customer_id)

	history = []
	for item in customer.sales_history:
		history.append({
			'products': item.maxsulotlar,
			'amount': item.narx,
			'date': item.sana,
			'status': item.status
		})

	return history


@frappe.whitelist()
def calculate_installment(tannarx, boshlangich_tolov, muddat):
	"""
	Bo'lib to'lashni hisoblash
	"""
	tannarx = flt(tannarx)
	boshlangich_tolov = flt(boshlangich_tolov)
	muddat = int(muddat)

	if muddat <= 0:
		frappe.throw(_('Muddat 0 dan katta bo\'lishi kerak'))

	# Qarz summasi
	qarz = tannarx - boshlangich_tolov

	# Yillik foiz stavkasi (15%)
	yillik_foiz = 0.15
	oylik_foiz = yillik_foiz / 12

	# Oylik to'lov (annuitet formulasi)
	if oylik_foiz > 0:
		oylik_tolov = qarz * (oylik_foiz * (1 + oylik_foiz) ** muddat) / \
					  ((1 + oylik_foiz) ** muddat - 1)
	else:
		oylik_tolov = qarz / muddat

	# Umumiy to'lov
	umumiy_tolov = boshlangich_tolov + (oylik_tolov * muddat)

	# Sof foyda
	sof_foyda = umumiy_tolov - tannarx

	# Foiz
	foiz = (sof_foyda / tannarx) * 100 if tannarx > 0 else 0

	return {
		'oylik_tolov': round(oylik_tolov, 2),
		'umumiy_tolov': round(umumiy_tolov, 2),
		'sof_foyda': round(sof_foyda, 2),
		'foiz': round(foiz, 2)
	}


@frappe.whitelist()
def search_products(query):
	"""Mahsulotlarni qidirish"""

	products = frappe.get_all('Installment Product',
							  filters={
								  'active': 1,
								  'product_name': ['like', f'%{query}%']
							  },
							  fields=['name', 'product_name', 'imei', 'price', 'supplier'],
							  limit=20
							  )

	return products


@frappe.whitelist()
def get_payment_schedule(calculator_name):
	"""To'lov jadvalini olish"""

	calculator = frappe.get_doc('Installment Calculator', calculator_name)

	schedule = []
	for item in calculator.installment_schedule:
		schedule.append({
			'month': item.oy,
			'payment_date': item.tolov_sanasi,
			'amount': item.tolov_summasi,
			'remaining': item.qolgan
		})

	return schedule


@frappe.whitelist()
def update_payment(calculator_name, month, paid_amount):
	"""To'lovni yangilash"""

	calculator = frappe.get_doc('Installment Calculator', calculator_name)

	for item in calculator.installment_schedule:
		if item.oy == int(month):
			item.qolgan = flt(item.tolov_summasi) - flt(paid_amount)
			break

	calculator.save()
	frappe.db.commit()

	return {'success': True, 'message': _('To\'lov yangilandi')}


import frappe


@frappe.whitelist()
def check_customer_by_passport(passport_id):
	"""
	Passport ID bo'yicha mijozni tekshirish
	"""
	try:
		# ❌ AVVALGI (XATO):
		# existing = frappe.db.exists('Mijozlar', {'passport_id': passport_id})

		# ✅ YANGI (TO'G'RI):
		# Mijozlar DocType'ida 'passport_id' field nomi to'g'ri ekanligini tekshirish
		existing = frappe.db.get_value('Mijozlar',
									   {'passport_id': passport_id},
									   'name'
									   )

		if existing:
			customer = frappe.get_doc('Mijozlar', existing)

			# Sotuvlar tarixini olish
			sales_history = []
			for item in customer.sales_history:
				sales_history.append({
					'maxsulotlar': item.maxsulotlar,
					'narx': item.narx,
					'sana': str(item.sana) if item.sana else '',
					'status': item.status
				})

			return {
				'exists': True,
				'customer': {
					'name': customer.name,
					'ism': customer.ism,
					'familya': customer.familya,
					'passport_id': customer.passport_id,
					'jshshir': customer.jshshir or '',
					'telefon_raqam': customer.telefon_raqam,
					'qoshimcha_raqam': customer.qoshimcha_raqam or '',
					'manzil': customer.manzil,
					'karta_raqam': customer.karta_raqam or '',
					'rasm': customer.rasm or ''
				},
				'sales_history': sales_history
			}
		else:
			return {
				'exists': False
			}

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), 'Check Customer Error')
		frappe.throw(_('Xatolik: {0}').format(str(e)))


def save_base64_image(base64_string, filename, attached_to_doctype=None, attached_to_name=None):
	"""
	Base64 rasmni saqlash
	"""
	import base64
	import os
	from frappe.utils import get_site_path

	try:
		if not base64_string:
			return None

		# Remove data:image/jpeg;base64, prefix
		if 'base64,' in base64_string:
			base64_string = base64_string.split('base64,')[1]

		# Decode base64
		image_data = base64.b64decode(base64_string)

		# Generate unique filename
		import time
		timestamp = str(int(time.time()))
		filename = f"customer_photo_{timestamp}.jpg"

		# Direct file save approach (more reliable)
		filepath = get_site_path('public', 'files', filename)

		# Ensure directory exists
		os.makedirs(os.path.dirname(filepath), exist_ok=True)

		# Write file
		with open(filepath, 'wb') as f:
			f.write(image_data)

		# Create File document for tracking (optional)
		try:
			file_doc = frappe.get_doc({
				'doctype': 'File',
				'file_name': filename,
				'file_url': f'/files/{filename}',
				'is_private': 0,
				'folder': 'Home/Attachments'
			})

			if attached_to_doctype and attached_to_name:
				file_doc.attached_to_doctype = attached_to_doctype
				file_doc.attached_to_name = attached_to_name

			file_doc.insert(ignore_permissions=True)
			frappe.db.commit()
		except Exception as e:
			frappe.log_error(f"File document creation error: {str(e)}", "File Doc Error")
		# Continue anyway, file is saved

		return f'/files/{filename}'

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), 'Save Image Error')
		return None
