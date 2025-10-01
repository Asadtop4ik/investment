frappe.pages['installment-page'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: ' ',
    single_column: true,
  });

  $(frappe.render_template('installment_page', {})).appendTo(page.body);

  // Helpers
  const money = (n) =>
    '$' +
    (parseFloat(n || 0))
      .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const pick = () => ({
    tannarx: $('#tannarx').val(),
    boshlangich_tolov: $('#boshlangich_tolov').val(),
    muddat: $('#muddat').val(),
    oylik_tolov: $('#oylik_tolov').val(),
    boshlanish_sanasi: $('#boshlanish_sanasi').val(),
  });

  // ========== HISOBLA ==========
  $('#calc_btn')
    .off('click')
    .on('click', function () {
      const data = pick();
      if (!data.muddat || !data.oylik_tolov) {
        frappe.msgprint(__('Muddat va Oylik to‘lovni kiriting.'));
        return;
      }

      frappe.call({
        method:
          'investment.investment.doctype.installment_calculator.installment_calculator.calculate',
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

  // ========== JADVAL YARAT ==========
  $('#schedule_btn')
    .off('click')
    .on('click', function () {
      const data = pick();

      frappe.call({
        method:
          'investment.investment.doctype.installment_calculator.installment_calculator.generate_schedule',
        args: { doc: data },
        callback: function (r) {
          if (!r.message) return;

          const startVal = $('#boshlanish_sanasi').val();
          const startDate = startVal ? new Date(startVal) : null;

          const rows = r.message
            .map((row, index) => {
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
                  <td><input type="date" class="form-control form-control-sm"
                      value="${formattedDate}" data-field="tolov_sanasi"></td>
                  <td><input type="number" class="form-control form-control-sm"
                      value="${row.tolov_summasi}" data-field="tolov_summasi"></td>
                  <td><input type="number" class="form-control form-control-sm"
                      value="${row.tolangan}" data-field="tolangan"></td>
                  <td><input type="number" class="form-control form-control-sm"
                      value="${row.qolgan}" data-field="qolgan"></td>
                </tr>
              `;
            })
            .join('');

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

          enableRowEditing();
        },
      });
    });

  // ========== SAQLASH & DAVOM ETISH ==========
  $('#save_continue_btn')
    .off('click')
    .on('click', function () {
      const data = pick();

      frappe.call({
        method:
          'investment.investment.doctype.installment_calculator.installment_calculator.save_and_continue',
        args: { doc: data },
        callback: function (r) {
          if (r.message === 'success') {
            frappe.msgprint({
              title: '✅ Saqlandi',
              message: "Ma'lumotlar muvaffaqiyatli saqlandi. Davom etishingiz mumkin.",
              indicator: 'green',
            });
          }
        },
      });
    });

  // ========== JADVAL EDIT LOGIKASI ==========
  function enableRowEditing() {
    $('#schedule_table input')
      .off('change')
      .on('change', function () {
        const $input = $(this);
        const field = $input.data('field');
        const row = $input.closest('tr');
        const rowIndex = parseInt(row.data('index'));

        let scheduled =
          parseFloat(row.find("input[data-field='tolov_summasi']").val()) || 0;
        let paid = parseFloat(row.find("input[data-field='tolangan']").val()) || 0;
        let remain = parseFloat(row.find("input[data-field='qolgan']").val()) || 0;

        // 🔹 Agar to‘langan o‘zgarsa -> qolgan yangilanadi
        if (field === 'tolangan') {
          remain = scheduled - paid;
          if (remain < 0) remain = 0;
          row.find("input[data-field='qolgan']").val(remain);
        }

        // 🔹 Agar qolgan o‘zgarsa -> to‘langan qayta hisoblanadi
        if (field === 'qolgan') {
          paid = scheduled - remain;
          if (paid < 0) paid = 0;
          row.find("input[data-field='tolangan']").val(paid);
        }

        // 🔹 Extra to‘lovni keyingi oylarga taqsimlash
        if (paid > scheduled) {
          let extra = paid - scheduled;
          row.find("input[data-field='tolangan']").val(scheduled);
          row.find("input[data-field='qolgan']").val(0);

          $('#schedule_table tbody tr').each(function (i, r) {
            if (i > rowIndex && extra > 0) {
              const $r = $(r);
              const nextScheduled =
                parseFloat($r.find("input[data-field='tolov_summasi']").val()) || 0;
              const nextPaid =
                parseFloat($r.find("input[data-field='tolangan']").val()) || 0;
              const need = Math.max(nextScheduled - nextPaid, 0);

              if (extra >= need) {
                $r.find("input[data-field='tolangan']").val(nextPaid + need);
                $r.find("input[data-field='qolgan']").val(0);
                extra -= need;
              } else {
                $r.find("input[data-field='tolangan']").val(nextPaid + extra);
                $r.find("input[data-field='qolgan']").val(nextScheduled - (nextPaid + extra));
                extra = 0;
              }
            }
          });
        }

        // 🔹 Sana o‘zgarsa -> keyingi oylarni ham surish
        if (field === 'tolov_sanasi') {
          const newDate = new Date($input.val());
          if (!isNaN(newDate)) {
            let step = 0;
            row.nextAll().each(function () {
              step++;
              const nextDate = new Date(newDate);
              nextDate.setMonth(nextDate.getMonth() + step);
              const formatted = nextDate.toISOString().split('T')[0];
              $(this).find("input[data-field='tolov_sanasi']").val(formatted);
            });
          }
        }
      });
  }
};
