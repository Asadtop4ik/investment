frappe.ui.form.on("Installment Application", {
    refresh: function(frm) {
        // Print PDF tugmasini qo'shish
        frm.add_custom_button(__('📄 Print PDF'), function() {
            if (frm.doc.docstatus >= 0) {
                let url = frappe.urllib.get_full_url(
                    "/api/method/frappe.utils.print_format.download_pdf?"
                    + "doctype=" + encodeURIComponent(frm.doc.doctype)
                    + "&name=" + encodeURIComponent(frm.doc.name)
                    + "&format=" + encodeURIComponent("Print PDF") // sizning format nomi
                );
                window.open(url);
            } else {
                frappe.msgprint(__('Avval hujjatni saqlang.'));
            }
        }, __("Tools"));
    }
});
