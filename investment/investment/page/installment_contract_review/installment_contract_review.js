frappe.pages['installment-contract-review'].on_page_load = function(wrapper) {
  const appName = (frappe.route_options && frappe.route_options.app_name) || null;
  const autoPdf = (frappe.route_options && frappe.route_options.auto_pdf) || 0;

  const $page = $(wrapper).find('.layout-main-section');
  $page.html(`
    <div class="card">
      <div class="card-body">
        <h3 class="mb-3">Shartnoma — Yakuniy ko'rinish</h3>
        <div id="summary">Yuklanmoqda...</div>
        <div class="mt-3 d-flex gap-2">
          <button class="btn btn-primary" id="create-contract">Create Contract</button>
          <a class="btn btn-outline-default" id="print-pdf" style="display:none" target="_blank">Print / PDF</a>
        </div>
      </div>
    </div>
  `);

  if (!appName) {
    $('#summary').html('<span class="text-danger">Application topilmadi (route_options.app_name kerak).</span>');
    return;
  }

  function renderSummary(data) {
    $('#summary').html(`
      <h5>Umumiy</h5>
      <table class="table table-bordered">
        <tr><td>Application</td><td>${frappe.utils.escape_html(data.name)}</td></tr>
        <tr><td>Mijoz</td><td>${frappe.utils.escape_html(data.customer || '-')}</td></tr>
        <tr><td>Tannarx</td><td>${data.tannarx || 0}</td></tr>
        <tr><td>Boshlang'ich</td><td>${data.boshlangich_tolov || 0}</td></tr>
        <tr><td>Muddat (oy)</td><td>${data.muddat || 0}</td></tr>
        <tr><td>Oylik to'lov</td><td>${data.oylik_tolov || 0}</td></tr>
        <tr><td>Boshlanish sanasi</td><td>${data.boshlanish_sanasi || ''}</td></tr>
        <tr><td>Umumiy to'lov</td><td>${data.umumiy_tolov || 0}</td></tr>
        <tr><td>Foiz %</td><td>${data.foiz_percent || 0}</td></tr>
        <tr><td>Foida</td><td>${data.foyda_som || 0}</td></tr>
      </table>
      <h5>Mahsulotlar (${(data.application_products||[]).length})</h5>
      ${
        (data.application_products||[]).length
          ? `<ul>${data.application_products.map(p=>`<li>${frappe.utils.escape_html(p.product_name||'')} — ${p.price||0}</li>`).join('')}</ul>`
          : `<div class="text-muted">Mahsulot tanlanmagan</div>`
      }
    `);
  }

  function loadApp() {
    frappe.call({
      method: 'investment.app_wizard.get',
      args: { app_name: appName },
      callback: (r) => {
        const data = r.message || {};
        renderSummary(data);
        if (autoPdf) $('#create-contract').trigger('click');
      }
    });
  }

  $('#create-contract').on('click', function() {
    frappe.call({
      method: 'investment.app_wizard.create_contract_from_application',
      args: { app_name: appName },
      callback: (r) => {
        const { contract, pdf_url } = r.message || {};
        if (contract) frappe.msgprint(`Contract yaratildi: <b>${contract}</b>`);
        if (pdf_url) {
          $('#print-pdf').attr('href', pdf_url).show();
          window.open(pdf_url, '_blank');
        }
      }
    });
  });

  loadApp();
};
