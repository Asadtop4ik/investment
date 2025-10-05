frappe.pages['installment-page'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'To‘lov Kalkulyatori',
    single_column: true,
  });

  $(frappe.render_template('installment_page', {})).appendTo(page.body);

  const money = (n) =>
    '$' + (parseFloat(n || 0)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const pick = () => ({
    tannarx: $('#tannarx').val(),
    boshlangich_tolov: $('#boshlangich_tolov').val(),
    muddat: $('#muddat').val(),
    oylik_tolov: $('#oylik_tolov').val(),
    boshlanish_sanasi: $('#boshlanish_sanasi').val(),
  });

  // Hisoblash
  $('#calc_btn').off('click').on('click', function () {
    const data = pick();
    if (!data.muddat || !data.oylik_tolov) {
      frappe.msgprint(__('⚠️ Muddat va Oylik to‘lovni kiriting.'));
      return;
    }

    frappe.call({
      method: 'investment.investment.doctype.installment_calculator.installment_calculator.calculate',
      args: { doc: data },
      callback: function (r) {
        if (!r.message) return;
        const { umumiy_tolov, sof_foyda, foiz } = r.message;
        $('#natija').html(`
          <div class="alert alert-success mt-3" style="max-width:720px;margin:0 auto;">
            <h5>📊 Hisoblash natijasi</h5>
            <p><b>Umumiy to‘lov:</b> ${money(umumiy_tolov)}</p>
            <p><b>Sof foyda:</b> ${money(sof_foyda)}</p>
            <p><b>Foiz:</b> ${parseFloat(foiz || 0).toFixed(2)}%</p>
          </div>
        `);
      },
    });
  });

  // Jadval yaratish
  $('#schedule_btn').off('click').on('click', function () {
    const data = pick();
    frappe.call({
      method: 'investment.investment.doctype.installment_calculator.installment_calculator.generate_schedule',
      args: { doc: data },
      callback: function (r) {
        if (!r.message) return;

        const startVal = $('#boshlanish_sanasi').val();
        const startDate = startVal ? new Date(startVal) : null;

        const rows = r.message.map((row, index) => {
          let formattedDate = '';
          if (startDate && !isNaN(startDate)) {
            const d = new Date(startDate);
            d.setMonth(d.getMonth() + index);
            formattedDate = d.toISOString().split('T')[0];
          } else if (row.tolov_sanasi) {
            formattedDate = row.tolov_sanasi;
          }

          return `
            <tr data-index="${index}">
              <td>${index + 1}</td>
              <td>${row.oy}</td>
              <td><input type="date" class="form-control form-control-sm" value="${formattedDate}" data-field="tolov_sanasi"></td>
              <td><input type="number" class="form-control form-control-sm" value="${row.tolov_summasi}" data-field="tolov_summasi"></td>
              <td><input type="number" class="form-control form-control-sm" value="${row.tolangan}" data-field="tolangan"></td>
              <td><input type="number" class="form-control form-control-sm" value="${row.qolgan}" data-field="qolgan"></td>
            </tr>
          `;
        }).join('');

        $('#jadval').html(`
          <h4 class="mt-4">📅 To‘lov jadvali:</h4>
          <div class="table-responsive">
            <table id="schedule_table" class="table table-bordered table-striped table-hover mt-2">
              <thead class="table-dark">
                <tr>
                  <th>#</th>
                  <th>Oy</th>
                  <th>To‘lov sanasi</th>
                  <th>To‘lov summasi ($)</th>
                  <th>To‘langan ($)</th>
                  <th>Qolgan ($)</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `);
      },
    });
  });

  // Saqlash va davom etish
  $('#save_continue_btn').off('click').on('click', function () {
    const data = pick();

    frappe.call({
      method: 'investment.investment.doctype.installment_calculator.installment_calculator.save_and_continue',
      args: { doc: data },
      callback: function (r) {
        if (r.message === 'success') {
          frappe.show_alert({
            message: __("✅ Ma'lumotlar saqlandi. Keyingi sahifaga o'tilmoqda..."),
            indicator: 'green'
          });

          // 🔑 Keyingi sahifa: installment_products
          frappe.set_route("page", "installment_products");
        }
      },
    });
  });
};
