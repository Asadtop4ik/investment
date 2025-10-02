frappe.listview_settings['Installment Product'] = {
    onload(listview) {
        // Umumiy narxni hisoblash
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Installment Product",
                fields: ["price"],
                limit_page_length: 0
            },
            callback: function (r) {
                if (r.message) {
                    let total = r.message.reduce((sum, row) => sum + (row.price || 0), 0);
                    let formatted = total.toLocaleString();

                    // Headerga qo‘shish
                    let $area = $(listview.page.wrapper).find('.listview-heading');
                    if (!$area.find('.total-sum-box').length) {
                        $area.append(
                            `<div class="total-sum-box text-muted" style="margin-left:20px; font-weight:bold;">
                                Jami narx: ${formatted}
                             </div>`
                        );
                    } else {
                        $area.find('.total-sum-box').text("Jami narx: " + formatted);
                    }
                }
            }
        });
    }
};
