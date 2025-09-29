// Copyright (c) 2025, AsadStack and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Installment Calculator", {
// 	refresh(frm) {

// 	},
// });

// installment_calculator.js

// installment_calculator.js - robust version

// installment_calculator.js

// installment_calculator.js - server-call version with debug logs


// robust installment_calculator.js - try both app paths, fallback client calc


/* installment_calculator.js - updated robust version */


// installment_calculator.js

// installment_calculator.js (updated)
frappe.ui.form.on('Installment Calculator', {
    onload: function(frm) {
        try { do_calculate(frm); } catch(e){ console.log(e); }
    },
    refresh: function(frm) {
        render_action_buttons(frm);
    },
    tannarx: function(frm) { try { do_calculate(frm); } catch(e){ console.log(e); } },
    boshlangich_tolov: function(frm) { try { do_calculate(frm); } catch(e){ console.log(e); } },
    muddat: function(frm) { try { do_calculate(frm); } catch(e){ console.log(e); } },
    oylik_tolov: function(frm) { try { do_calculate(frm); } catch(e){ console.log(e); } }
});

function render_action_buttons(frm) {
    // Agar HTML field action_buttons bo'lsa, u yerga qo'yamiz
    if (frm.fields_dict && frm.fields_dict.action_buttons) {
        const wrapper = $(frm.fields_dict.action_buttons.wrapper);
        wrapper.empty();
        const html = `
            <style>
                .fi-calculator-actions { text-align: center; margin: 18px 0; }
                .fi-calculator-actions .btn { min-width: 120px; margin: 0 6px; }
            </style>
            <div class="fi-calculator-actions">
                <button class="btn btn-dark" id="fi_calc_btn">Hisobla</button>
                <button class="btn btn-default" id="fi_schedule_btn">Jadval yarat</button>
            </div>`;
        wrapper.append(html);
        wrapper.find('#fi_calc_btn').off('click').on('click', function(){ do_calculate(frm); });
        wrapper.find('#fi_schedule_btn').off('click').on('click', function(){ frappe.msgprint(__('Jadval yarat (hozir ishlamaydi)')); });
        return;
    }

    // Agar HTML field yo'q bo'lsa - pastga qo'yamiz
    if (!frm.__fi_actions_added) {
        $('.fi-calculator-actions-bottom').remove();
        const $container = $(`<div class="fi-calculator-actions-bottom" style="text-align:center; margin:18px 0;"></div>`);
        $container.append(`<button class="btn btn-dark" id="fi_calc_btn_bottom">Hisobla</button>`);
        $container.append(`<button class="btn btn-default" id="fi_schedule_btn_bottom" style="margin-left:8px;">Jadval yarat</button>`);
        const parent = $('.form-layout').first();
        if (parent.length) parent.append($container);
        else $('body').append($container);

        $container.find('#fi_calc_btn_bottom').on('click', function(){ do_calculate(frm); });
        $container.find('#fi_schedule_btn_bottom').on('click', function(){ frappe.msgprint(__('Jadval yarat (hozir ishlamaydi)')); });

        frm.__fi_actions_added = true;
    }
}

function safeFloat(v) {
    // null/undefined/'' -> 0, remove commas
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'string') {
        // remove spaces and commas
        v = v.replace(/\s+/g, '').replace(/,/g, '');
    }
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
}
function safeInt(v) {
    if (v === null || v === undefined || v === '') return 0;
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
}

function get_current_values(frm) {
    // foydalanish: har doim clientdagi eng so'nggi qiymatlarni oladi
    const price = safeFloat(frm.get_value ? frm.get_value('tannarx') : frm.doc.tannarx);
    const down = safeFloat(frm.get_value ? frm.get_value('boshlangich_tolov') : frm.doc.boshlangich_tolov);
    const months = safeInt(frm.get_value ? frm.get_value('muddat') : frm.doc.muddat);
    const monthly = safeFloat(frm.get_value ? frm.get_value('oylik_tolov') : frm.doc.oylik_tolov);
    return { price, down, months, monthly };
}

function do_calculate(frm) {
    const v = get_current_values(frm);

    if (!v.months || v.months <= 0) {
        // clear outputs
        frm.set_value('umumiy_tolov', 0);
        frm.set_value('sof_foyda', 0);
        frm.set_value('foiz', 0);
        frm.refresh_fields && frm.refresh_field('umumiy_tolov');
        frm.refresh_fields && frm.refresh_field('sof_foyda');
        frm.refresh_fields && frm.refresh_field('foiz');
        return;
    }

    const principal = Math.round((v.price - v.down) * 100) / 100; // tannarx - down
    const monthly_total = Math.round((v.monthly * v.months) * 100) / 100;
    const total_paid = Math.round((v.down + monthly_total) * 100) / 100;
    const sof_foyda = Math.round((monthly_total - Math.max(0, principal)) * 100) / 100;

    let foiz = 0;
    if (principal > 0) {
        foiz = Math.round((sof_foyda / principal) * 10000) / 100; // 2 decimal: 29.80
    } else {
        foiz = 0;
    }

    frm.set_value('umumiy_tolov', total_paid);
    frm.set_value('sof_foyda', sof_foyda);
    frm.set_value('foiz', foiz);

    frm.refresh_field && frm.refresh_field('umumiy_tolov');
    frm.refresh_field && frm.refresh_field('sof_foyda');
    frm.refresh_field && frm.refresh_field('foiz');

    frappe.show_alert({message: __('Hisoblandi'), indicator: 'green'});
}

