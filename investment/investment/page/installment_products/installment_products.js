frappe.pages['installment_products'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Mahsulot Qo‘shish',
        single_column: true
    });

    // UI
    page.main.html(`
        <div class="p-4">
            <h3 class="mb-3">Yangi Mahsulot Qo‘shish</h3>
            <div style="overflow:auto;">
                <table class="table table-bordered" id="products_table" style="min-width:980px;">
                    <thead class="table-light">
                        <tr>
                            <th style="width:40px">#</th>
                            <th>Mahsulot nomi *</th>
                            <th>Narx *</th>
                            <th>IMEI</th>
                            <th>iCloud</th>
                            <th>Telefon raqami *</th>
                            <th>Yetkazib beruvchi *</th>
                            <th style="width:80px">O‘chirish</th>
                        </tr>
                    </thead>
                    <tbody id="products-table_tbody"></tbody>
                    <tfoot>
                        <tr>
                            <th colspan="2" class="text-right">Jami narx:</th>
                            <th id="total-sum">0</th>
                            <th colspan="5"></th>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div id="prodError" style="color:red; display:none;"></div>
            <div id="saveMessage" style="color:green; display:none; margin-top:10px;"></div>
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div>
                    <button id="addRowBtn" class="btn btn-primary">+ Mahsulot qo'shish</button>
                    <button class="btn btn-success ms-2" id="saveAllBtn">Saqlash&Keyingi</button>
                    <button class="btn btn-outline-secondary ms-2" id="backBtn">Orqaga</button>
                </div>
                <div class="text-muted">* majburiy maydonlar</div>
            </div>
        </div>
    `);

    let rowCount = 0;
    let suppliers = [];

    // Supplierlarni olish
    function loadSuppliers() {
        return new Promise((resolve) => {
            frappe.call({
                method: 'frappe.client.get_list',
                args: { doctype: 'Supplier', fields: ['name'], limit_page_length: 0 },
                callback: (r) => {
                    suppliers = (r.message || []).map(s => s.name);
                    resolve();
                },
                error: () => {
                    suppliers = [];
                    resolve();
                }
            });
        });
    }

    // Supplier option render
    function renderSupplierOptions(selectEl, current = "") {
        selectEl.empty();
        if (suppliers.length > 0) {
            suppliers.forEach(s => {
                const opt = $('<option>').val(s).text(s);
                selectEl.append(opt);
            });
        } else {
            selectEl.append($('<option>').val("").text("Supplierlar yo‘q"));
        }
        selectEl.append($('<option>').val("add_new").text("+ Yangi yetkazib beruvchi"));
        if (current && suppliers.includes(current)) {
            selectEl.val(current);
        }
    }

    // Qator qo‘shish
    function addProductRow(data = {}) {
        rowCount++;
        const newRow = $(`
            <tr data-row-id="${rowCount}">
                <td class="align-middle text-center row-index">${rowCount}</td>
                <td><input type="text" class="form-control" data-field="product_name" placeholder="Mahsulot nomi" value="${data.product_name || ''}"></td>
                <td><input type="number" class="form-control" data-field="price" placeholder="Narx" value="${data.price || ''}"></td>
                <td><input type="text" class="form-control" data-field="imei" placeholder="IMEI" value="${data.imei || ''}"></td>
                <td><input type="text" class="form-control" data-field="icloud" placeholder="iCloud" value="${data.icloud || ''}"></td>
                <td><input type="text" class="form-control" data-field="phone_number" placeholder="Telefon raqami" value="${data.phone_number || ''}"></td>
                <td><select class="form-select prod-supplier" required></select></td>
                <td class="text-center align-middle">
                    <button class="btn btn-sm btn-danger remove-row">X</button>
                </td>
            </tr>
        `);

        page.main.find('#products-table_tbody').append(newRow);

        const sel = newRow.find('.prod-supplier');
        renderSupplierOptions(sel, data.supplier || "");

        sel.on('change', function() {
            if (this.value === "add_new") {
                const newSup = prompt("Yangi yetkazib beruvchi nomini kiriting:");
                if (newSup && newSup.trim()) {
                    frappe.call({
                        method: 'frappe.client.insert',
                        args: {
                            doc: { doctype: 'Supplier', supplier_name: newSup.trim(), supplier_type: 'Company' }
                        },
                        callback: (r) => {
                            if (!r.exc) {
                                suppliers.push(newSup.trim());
                                page.main.find('.prod-supplier').each((i, s) => renderSupplierOptions($(s)));
                                sel.val(newSup.trim());
                            } else {
                                showError("Supplier qo‘shishda xato!");
                            }
                        }
                    });
                } else {
                    sel.val("");
                }
            }
        });

        newRow.find('.remove-row').on('click', function() {
            newRow.remove();
            reorderRows();
            updateTotal();
        });

        newRow.find('[data-field="price"]').on('input', updateTotal);
    }

    // indexlarni yangilash
    function reorderRows() {
        page.main.find('#products-table_tbody tr').each((i, r) => {
            $(r).find('.row-index').text(i + 1);
        });
    }

    // jami hisoblash
    function updateTotal() {
        let total = 0;
        page.main.find('#products-table_tbody [data-field="price"]').each(function() {
            total += parseFloat($(this).val()) || 0;
        });
        page.main.find('#total-sum').text(total.toLocaleString());
    }

    // Saqlash tugmasi
    function validateAndSaveProducts() {
        const rows = page.main.find('#products-table_tbody tr');
        if (!rows.length) {
            showError("Kamida bitta mahsulot qo‘shing!");
            return;
        }

        const products = [];
        let hasError = false;

        rows.each(function() {
            const row = $(this);
            const product_name = row.find('[data-field="product_name"]').val().trim();
            const price = parseFloat(row.find('[data-field="price"]').val());
            const imei = row.find('[data-field="imei"]').val().trim();
            const icloud = row.find('[data-field="icloud"]').val().trim();
            const phone_number = row.find('[data-field="phone_number"]').val().trim();
            const supplier = row.find('.prod-supplier').val();

            if (!product_name || isNaN(price) || !phone_number || !supplier || supplier === "add_new") {
                hasError = true;
                return false;
            }

            products.push({
                doctype: 'Installment Product',
                product_name,
                price,
                imei,
                icloud,
                phone_number,
                supplier,
                is_active: 1
            });
        });

        if (hasError) {
            showError("Majburiy maydonlarni to‘ldiring!");
            return;
        }

        let savedCount = 0;
        products.forEach((doc) => {
            frappe.call({
                method: 'frappe.client.insert',
                args: { doc },
                callback: (r) => {
                    if (!r.exc) {
                        savedCount++;
                        if (savedCount === products.length) {
                            showSuccessMessage("Mahsulotlar saqlandi!");
                            // ❌ Endi list page’ga o‘tmaydi
                            // ✅ Keyingi page o‘zingiz qo‘shganingizda bu yerga route qo‘shasiz
                            // masalan: frappe.set_route('installment_step2');
                        }
                    } else {
                        showError("Xatolik: " + r.exc);
                    }
                }
            });
        });
    }

    function showError(txt) {
        const box = page.main.find('#prodError');
        box.text(txt).show();
        setTimeout(() => box.hide(), 4000);
    }

    function showSuccessMessage(txt) {
        const box = page.main.find('#saveMessage');
        box.text(txt).show();
        setTimeout(() => box.hide(), 4000);
    }

    loadSuppliers().then(() => {
        page.main.find('#addRowBtn').on('click', () => addProductRow());
        page.main.find('#saveAllBtn').on('click', validateAndSaveProducts);
        page.main.find('#backBtn').on('click', () => history.back());
        addProductRow();
    });
};
