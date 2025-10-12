app_name = "investment"
app_title = "Investment"
app_publisher = "AsadStack"
app_description = "Yangi loyiha"
app_email = "asadbek.backend@gmail.com"
app_license = "mit"
# hooks.py
page_js = {
    "installment_proucts": "investment/page/installment_products/installment_products.js"
}

doc_events = {
    "Mijozlar": {
        "after_insert": "investment.investment.simple_integration.auto_sync_customer"
    },
    "Installment Product": {
        "after_insert": "investment.investment.simple_integration.auto_sync_item"
    }
}
# # === Daily background jobs ===
# scheduler_events = {
#     "daily": [
#         "investment.tasks.send_payment_reminders"
#     ]
# }
# # =====================================
# # DOCUMENT EVENTS
# # =====================================
# doc_events = {
#     "Installment Application": {
#         "on_submit": "investment.investment.erp_sync.on_application_submit",
#         "on_cancel": "investment.investment.erp_sync.on_application_cancel"
#     },
#  # Mijozlar → Customer sync
#     "Mijozlar": {
#         "after_insert": "investment.erp_sync.sync_mijoz_to_customer",
#         "on_update": "investment.erp_sync.sync_mijoz_to_customer"
#     },
#
#     # Installment Product → Item sync
#     "Installment Product": {
#         "after_insert": "investment.erp_sync.sync_product_to_item",
#         "on_update": "investment.erp_sync.sync_product_to_item"
#     }
# }
#
# # =====================================
# # CUSTOM FIELDS
# # =====================================
#
# # Bu fields avtomatik qo'shiladi (bench migrate'da)
# fixtures = [
#     {
#         "doctype": "Custom Field",
#         "filters": [
#             ["name", "in", [
#                 # Investment Application
#                 "Investment Application-accounting_section",
#                 "Investment Application-sales_invoice",
#                 "Investment Application-down_payment_entry",
#                 "Investment Application-total_paid",
#                 "Investment Application-remaining_amount",
#
#                 # Mijozlar
#                 "Mijozlar-customer_link",
#
#                 # Installment Product
#                 "Installment Product-item_link",
#
#                 # Customer (ERPNext)
#                 "Customer-custom_passport_id",
#                 "Customer-custom_mijoz_link",
#
#                 # Item (ERPNext)
#                 "Item-custom_imei",
#                 "Item-custom_product_link",
#
#                 # Sales Invoice (ERPNext)
#                 "Sales Invoice-custom_investment_application"
#             ]]
#         ]
#     }
# ]

