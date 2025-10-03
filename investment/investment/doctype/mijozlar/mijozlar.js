frappe.ui.form.on('Mijozlar', {
    passport_id: function(frm) {
        let passport_id = frm.doc.passport_id;

        // Agar hech narsa yozilmagan bo‘lsa chiqib ketamiz
        if (!passport_id) return;

        // Faqat to‘liq format bo‘lganda (2 harf + 7 raqam) chaqiramiz
        if (!/^[A-Z]{2}[0-9]{7}$/.test(passport_id.toUpperCase())) {
            return; // tugallanmaguncha hech narsa qilinmaydi
        }

        // API chaqirish
        frappe.call({
            method: "investment.investment.doctype.mijozlar.mijozlar.fetch_customer_data",
            args: { passport_id: passport_id },
            callback: function(r) {
                if (!r.message) return;

                let data = r.message;

                if (!data.customer) {
                    frappe.msgprint(__('Bu passport ID bo‘yicha mijoz topilmadi.'));
                    return;
                }

                // Asosiy maydonlarni to‘ldirish
                frm.set_value('ism', data.customer.ism);
                frm.set_value('familya', data.customer.familya);
                frm.set_value('telefon_raqam', data.customer.telefon_raqam);
                frm.set_value('manzil', data.customer.manzil);

                // Child table tozalash va yangilash
                frm.clear_table('previous_purchase');

                (data.sales || []).forEach(s => {
                    let row = frm.add_child('previous_purchase');
                    row.invoice = s.invoice;
                    row.maxsulot = s.maxsulot;
                    row.narx = s.narx;
                    row.sotilgan_vaqti = s.sotilgan_vaqti;
                    row.status = s.status;
                });

                frm.refresh_field('previous_purchase');
            }
        });
    }
});
