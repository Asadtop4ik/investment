
frappe.pages['installment-products'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Installment Products'),
        single_column: true
    });

    page.main.html(`
        <div class="installment-products-container">
            <h3>📦 Mahsulotlar ro‘yxati</h3>
            <table class="table table-bordered table-hover" id="products-table">
                <thead class="thead-dark">
                    <tr>
                        <th>№</th>
                        <th>Mahsulot nomi</th>
                        <th>IMEI</th>
                        <th>Telefon raqami</th>
                        <th>iCloud</th>
                        <th>Narx</th>
                        <th>Yetkazib beruvchi</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
            <div class="text-right mt-3">
                <button class="btn btn-primary" id="add-product">+ Mahsulot qo‘shish</button>
            </div>
            <h4 class="mt-3">Jami summa: <span id="total-sum">0</span> so‘m</h4>
        </div>
    `);

    // Backenddan ma’lumot yuklash
    function load_products() {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Installment Product",
                fields: ["name", "product_name", "imei", "phone_number", "icloud", "price", "supplier"],
                limit_page_length: 100
            },
            callback: function(r) {
                if (r.message && r.message.length) {
                    let rows = "";
                    let total = 0;

                    r.message.forEach((row, i) => {
                        total += (row.price || 0);
                        rows += `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${row.product_name || ""}</td>
                                <td>${row.imei || ""}</td>
                                <td>${row.phone_number || ""}</td>
                                <td>${row.icloud || ""}</td>
                                <td>${(row.price || 0).toLocaleString()}</td>
                                <td>${row.supplier || ""}</td>
                            </tr>
                        `;
                    });

                    $("#products-table tbody").html(rows);
                    $("#total-sum").text(total.toLocaleString());
                } else {
                    $("#products-table tbody").html("<tr><td colspan='7' class='text-center'>Mahsulotlar mavjud emas</td></tr>");
                    $("#total-sum").text("0");
                }
            },
            error: function(err) {
                console.error("Error loading Installment Product:", err);
                $("#products-table tbody").html("<tr><td colspan='7' class='text-center text-danger'>Xatolik yuz berdi</td></tr>");
                $("#total-sum").text("0");
            }
        });
    }

    // Sahifa yuklanganda productlarni chiqaramiz
    load_products();

    // Qo‘shish tugmasi
    $(document).on("click", "#add-product", function() {
        frappe.new_doc("Installment Product");
    });
};
