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
        wrapper.find('#fi_schedule_btn').off('click').on('click', function(){ generate_schedule_client(frm); });
        return;
    }

    if (!frm.__fi_actions_added) {
        $('.fi-calculator-actions-bottom').remove();
        const $container = $(`<div class="fi-calculator-actions-bottom" style="text-align:center; margin:18px 0;"></div>`);
        $container.append(`<button class="btn btn-dark" id="fi_calc_btn_bottom">Hisobla</button>`);
        $container.append(`<button class="btn btn-default" id="fi_schedule_btn_bottom" style="margin-left:8px;">Jadval yarat</button>`);
        const parent = $('.form-layout').first();
        if (parent.length) parent.append($container);
        else $('body').append($container);

        $container.find('#fi_calc_btn_bottom').on('click', function(){ do_calculate(frm); });
        $container.find('#fi_schedule_btn_bottom').off('click').on('click', function(){ generate_schedule_client(frm); });

        frm.__fi_actions_added = true;
    }
}

function generate_schedule_client(frm) {
    frappe.call({
        method: "investment.investment.doctype.installment_calculator.installment_calculator.generate_schedule",
        args: { doc: frm.doc },
        callback: function(r) {
            if (r.message) {
                frm.clear_table("installment_schedule");
                r.message.forEach(row => {
                    let child = frm.add_child("installment_schedule");
                    child.oy = row.oy;
                    child.tolov_sanasi = row.tolov_sanasi;
                    child.tolov_summasi = row.tolov_summasi;
                    child.tolangan = row.tolangan;
                    child.qolgan = row.qolgan;
                });
                frm.refresh_field("installment_schedule");
            }
        }
    });
}

// --- Child tabledagi eventlar ---
frappe.ui.form.on('Installment Schedule', {
    // Sana o'zgarsa: keyingi oylarga ham shu sanani qo'yish
    tolov_sanasi: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.tolov_sanasi) return;

        let start_date = frappe.datetime.str_to_obj(row.tolov_sanasi);
        let start_index = frm.doc.installment_schedule.findIndex(r => r.name === row.name);

        frm.doc.installment_schedule.forEach((r, idx) => {
            if (idx > start_index) {
                let new_date = frappe.datetime.add_months(start_date, idx - start_index);
                r.tolov_sanasi = frappe.datetime.obj_to_str(new_date);
            }
        });

        frm.refresh_field("installment_schedule");
    },

    // To'langan o'zgarsa: ortiqcha summani keyingi oylarga taqsimlash
    tolangan: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.tolangan) row.tolangan = 0;

        if (row.tolangan >= row.tolov_summasi) {
            let extra = row.tolangan - row.tolov_summasi;
            row.qolgan = 0;

            let distribute = false;
            frm.doc.installment_schedule.forEach(r => {
                if (distribute && extra > 0) {
                    let old_val = r.tolov_summasi;
                    if (extra >= old_val) {
                        r.tolangan = old_val;
                        r.qolgan = 0;
                        extra -= old_val;
                    } else {
                        r.tolangan = extra;
                        r.qolgan = old_val - extra;
                        extra = 0;
                    }
                }
                if (r.name === row.name) distribute = true;
            });
        } else {
            row.qolgan = row.tolov_summasi - row.tolangan;
        }

        frm.refresh_field("installment_schedule");
    }
});

function safeFloat(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'string') {
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
    const price = safeFloat(frm.get_value ? frm.get_value('tannarx') : frm.doc.tannarx);
    const down = safeFloat(frm.get_value ? frm.get_value('boshlangich_tolov') : frm.doc.boshlangich_tolov);
    const months = safeInt(frm.get_value ? frm.get_value('muddat') : frm.doc.muddat);
    const monthly = safeFloat(frm.get_value ? frm.get_value('oylik_tolov') : frm.doc.oylik_tolov);
    return { price, down, months, monthly };
}

function do_calculate(frm) {
    const v = get_current_values(frm);
    if (!v.months || v.months <= 0) {
        frm.set_value('umumiy_tolov', 0);
        frm.set_value('sof_foyda', 0);
        frm.set_value('foiz', 0);
        frm.refresh_field('umumiy_tolov');
        frm.refresh_field('sof_foyda');
        frm.refresh_field('foiz');
        return;
    }

    const principal = Math.round((v.price - v.down) * 100) / 100;
    const monthly_total = Math.round((v.monthly * v.months) * 100) / 100;
    const total_paid = Math.round((v.down + monthly_total) * 100) / 100;
    const sof_foyda = Math.round((monthly_total - Math.max(0, principal)) * 100) / 100;

    let foiz = 0;
    if (principal > 0) {
        foiz = Math.round((sof_foyda / principal) * 10000) / 100;
    }

    frm.set_value('umumiy_tolov', total_paid);
    frm.set_value('sof_foyda', sof_foyda);
    frm.set_value('foiz', foiz);

    frm.refresh_field('umumiy_tolov');
    frm.refresh_field('sof_foyda');
    frm.refresh_field('foiz');

    frappe.show_alert({message: __('Hisoblandi'), indicator: 'green'});
}
