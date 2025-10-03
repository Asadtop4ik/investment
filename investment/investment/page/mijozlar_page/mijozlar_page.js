frappe.pages['mijozlar_page'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Mijozlar',
        single_column: true
    });

    // HTML formani yuklash
    $(frappe.render_template("mijozlar_page", {})).appendTo(page.body);

    console.log("✅ Mijozlar form yuklandi");

    // Rasm uchun uploader (Attach Image)
    frappe.require("file_uploader.bundle.js", () => {
        new frappe.ui.FileUploader({
            wrapper: $("#rasm_uploader"),
            method: 'upload_file',
            restrictions: { allowed_file_types: ['image/*'] },
            on_success: (file) => {
                $("#rasm_uploader").attr("data-file-url", file.file_url);
            }
        });
    });

    // Saqlash tugmasi bosilganda
    $("#save_mijoz").on("click", function() {
        let data = {
            doctype: "Mijozlar",
            ism: $("#ism_input").val(),
            familya: $("#familya_input").val(),
            passport_id: $("#passport_id_input").val(),
            telefon_raqam: $("#telefon_input").val(),
            qoshimcha_raqam: $("#qoshimcha_input").val(),
            jshshir: $("#jshshir_input").val(),
            karta_raqam: $("#karta_input").val(),
            manzil: $("#manzil_input").val(),
            passport__kopiya: $("#passport_file")[0].files[0] ? $("#passport_file")[0].files[0].name : "",
            rasm: $("#rasm_uploader").attr("data-file-url") || ""
        };

        frappe.call({
            method: "frappe.client.insert",
            args: { doc: data },
            callback: function(r) {
                if(!r.exc) {
                    frappe.msgprint("✅ Mijoz muvaffaqiyatli qo‘shildi!");

                    if(r.message.passport_id) {
                        load_sales_history(r.message.name);
                    }
                } else {
                    frappe.msgprint("❌ Xatolik: " + r.exc);
                }
            }
        });
    });

    // Zakaz tarixini yuklash
    function load_sales_history(mijoz_nomi) {
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Mijozlar",
                name: mijoz_nomi
            },
            callback: function(res) {
                if(res.message && res.message.sales_history && res.message.sales_history.length > 0) {
                    let rows = res.message.sales_history.map(row => `
                        <tr>
                          <td>${row.maxsulotlar || ""}</td>
                          <td>${row.narx || ""}</td>
                          <td>${row.sana || ""}</td>
                          <td>${row.status || ""}</td>
                        </tr>
                    `).join("");

                    $("#sales_history").html(`
                      <table class="table table-striped table-bordered">
                        <thead class="table-primary">
                          <tr>
                            <th>Maxsulot</th>
                            <th>Narx</th>
                            <th>Sana</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                      </table>
                    `);
                } else {
                    $("#sales_history").html("<p class='text-muted'>❌ Oldingi zakazlar mavjud emas.</p>");
                }
            }
        });
    }
};

