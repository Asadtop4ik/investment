import frappe
from frappe import _
from frappe.utils import nowdate, add_months, getdate, flt
from datetime import datetime
from dateutil.relativedelta import relativedelta
import json


@frappe.whitelist()
def create_installment_application(data):
    """
    Wizard'dan kelgan ma'lumotlarni qabul qilib,
    barcha kerakli DocType'larni yaratadi
    """
    try:
        data = json.loads(data) if isinstance(data, str) else data

        # 1. Mijozni yaratish yoki topish
        customer = create_or_get_customer(data['customer'])

        # 2. Mahsulotlarni yaratish
        products = []
        for product_data in data['products']:
            product = create_installment_product(product_data)
            products.append(product)

        # 3. Kalkulyator ma'lumotlarini saqlash
        calculator = create_installment_calculator(data['calculator'])

        # 4. Asosiy arizani yaratish
        application = create_application(customer, products, calculator, data)

        frappe.db.commit()

        return {
            'success': True,
            'application': application.name,
            'customer': customer.name,
            'message': _('Ariza muvaffaqiyatli yaratildi!')
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), 'Installment Application Error')
        frappe.throw(_('Xatolik yuz berdi: {0}').format(str(e)))


def create_or_get_customer(customer_data):
    """Mijozni yaratish yoki mavjud bo'lsa yangilash"""
    existing = frappe.db.exists('Mijozlar', {'passport_id': customer_data.get('passport_id')})

    if existing:
        customer = frappe.get_doc('Mijozlar', existing)
        customer.update(customer_data)
        customer.save()
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
            'karta_raqam': customer_data.get('karta_raqam')
        })
        customer.insert()

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

    start_date = getdate(calc_data.get('boshlanish_sanasi'))
    monthly_payment = flt(calc_data.get('oylik_tolov'))
    total_months = int(calc_data.get('muddat'))

    for month in range(1, total_months + 1):
        payment_date = add_months(start_date, month)
        calculator.append('installment_schedule', {
            'oy': month,
            'tolov_sanasi': payment_date,
            'tolov_summasi': monthly_payment,
            'tolangan': 0,
            'qolgan': monthly_payment
        })

    calculator.insert()
    return calculator


def create_application(customer, products, calculator, data):
    """
    Asosiy arizani yaratish — child table 'products' orqali
    """
    app = frappe.get_doc({
        'doctype': 'Installment Application',
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

    # ✅ Child tablega mahsulotlarni qo‘shamiz
    for product in products:
        app.append('products', {
            'product': product.name,              # Link to Installment Product
            'product_name': product.product_name, # Data
            'imei': product.imei,                 # Data
            'price': product.price,               # Currency
            'supplier': product.supplier,         # Link/Data
            'comment': product.comment            # Small Text
        })

    app.insert()

    # Mijoz tarixiga yozuv
    try:
        customer.append('sales_history', {
            'maxsulotlar': ', '.join([p.product_name for p in products]),
            'narx': calculator.tannarx,
            'sana': nowdate(),
            'status': 'Yangi'
        })
        customer.save()
    except Exception:
        pass

    return app


# 👇 Quyidagilar o‘z holicha qoldirilgan (ular to‘g‘ri ishlaydi)
@frappe.whitelist()
def get_customer_history(customer_id):
    customer = frappe.get_doc('Mijozlar', customer_id)
    return [
        {'products': i.maxsulotlar, 'amount': i.narx, 'date': i.sana, 'status': i.status}
        for i in customer.sales_history
    ]


@frappe.whitelist()
def calculate_installment(tannarx, boshlangich_tolov, muddat):
    tannarx, boshlangich_tolov = flt(tannarx), flt(boshlangich_tolov)
    muddat = int(muddat)
    qarz = tannarx - boshlangich_tolov
    yillik_foiz = 0.15
    oylik_foiz = yillik_foiz / 12

    if oylik_foiz > 0:
        oylik_tolov = qarz * (oylik_foiz * (1 + oylik_foiz) ** muddat) / ((1 + oylik_foiz) ** muddat - 1)
    else:
        oylik_tolov = qarz / muddat

    umumiy_tolov = boshlangich_tolov + (oylik_tolov * muddat)
    sof_foyda = umumiy_tolov - tannarx
    foiz = (sof_foyda / tannarx) * 100 if tannarx > 0 else 0

    return {
        'oylik_tolov': round(oylik_tolov, 2),
        'umumiy_tolov': round(umumiy_tolov, 2),
        'sof_foyda': round(sof_foyda, 2),
        'foiz': round(foiz, 2)
    }
