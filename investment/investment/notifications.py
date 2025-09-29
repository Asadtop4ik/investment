# -*- coding: utf-8 -*-
import frappe

def get_notification_config():
    """
    Minimal notification config returned to frappe.desk.notifications
    Must return a mapping with keys: for_doctype, for_module, for_other, targets
    Keep minimal to avoid errors.
    """
    return {
        "for_doctype": {
            # Provide a simple entry for our Doctype so notifications loader can iterate it
            "Installment Product": {}
        },
        "for_module": {},
        "for_other": {},
        "targets": {}
    }
