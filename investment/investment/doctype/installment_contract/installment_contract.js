frappe.ui.form.on('Installment Contract', {
  refresh(frm) {
    if (!frm.is_new()) {
      frm.add_custom_button(__('Print / PDF'), () => {
        frappe.call({
          method: 'investment.contract_api.pdf',
          args: { contract_name: frm.doc.name },
          callback(r) {
            const url = r?.message?.file_url;
            if (url) window.open(url, '_blank');
            else frappe.msgprint(__('PDF link topilmadi'));
          }
        });
      }, __('Actions'));
    }
  }
});
