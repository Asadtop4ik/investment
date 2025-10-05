frappe.pages['mijozlar_page'].on_page_load = function(wrapper) {
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Mijozlar',
        single_column: true
    });

    $(frappe.render_template("mijozlar_page", {})).appendTo(page.body);

    console.log("✅ Mijozlar sahifasi yuklandi");

    // --- Rasm upload (Attach Image) ---
    frappe.require("file_uploader.bundle.js", () => {
        new frappe.ui.FileUploader({
            wrapper: $("#rasm_uploader"),
            method: 'upload_file',
            restrictions: { allowed_file_types: ['image/*'] },
            on_success(file) {
                $("#rasm_uploader").attr("data-file-url", file.file_url);
                frappe.msgprint(`📸 Rasm yuklandi: ${file.file_name}`);
            }
        });
    });

    // --- Saqlash tugmasi bosilganda ---
    $("#save_mijoz").on("click", function() {
        let doc = {
            doctype: "Mijozlar",
            ism: $("#ism_input").val(),
            familya: $("#familya_input").val(),
            passport_id: $("#passport_id_input").val(),
            telefon_raqam: $("#telefon_input").val(),
            qoshimcha_raqam: $("#qoshimcha_input").val(),
            jshshir: $("#jshshir_input").val(),
            karta_raqam: $("#karta_input").val(),
            manzil: $("#manzil_input").val(),
            passport_nusxa: $("#passport_file")[0].files[0] ? $("#passport_file")[0].files[0].name : "",
            rasm: $("#rasm_uploader").attr("data-file-url") || ""
        };

        frappe.call({
            method: "frappe.client.insert",
            args: { doc: doc },
            freeze: true,
            freeze_message: "⏳ Ma'lumot saqlanmoqda...",
            callback: function(r) {
                if (!r.exc) {
                    frappe.msgprint("✅ Mijoz muvaffaqiyatli saqlandi!");
                    console.log("Saved Doc:", r.message);
                    load_sales_history(r.message.name);
                } else {
                    console.error(r.exc);
                    frappe.msgprint("❌ Xatolik: Ma’lumot saqlanmadi.");
                }
            }
        });
    });

    // --- Oldingi zakazlar (child table) ---
    function load_sales_history(mijoz_name) {
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Mijozlar",
                name: mijoz_name
            },
            callback: function(res) {
                if (res.message && res.message.sales_history && res.message.sales_history.length > 0) {
                    let rows = res.message.sales_history.map(row => `
                        <tr>
                            <td>${row.maxsulotlar || ""}</td>
                            <td>${row.narx || ""}</td>
                            <td>${row.sana || ""}</td>
                            <td>${row.status || ""}</td>
                        </tr>
                    `).join("");

                    $("#sales_history").html(`
                        <table class="table table-bordered table-striped mt-3">
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
                    $("#sales_history").html("<p class='text-danger'>❌ Oldingi zakazlar mavjud emas.</p>");
                }
            }
        });
    }
};

