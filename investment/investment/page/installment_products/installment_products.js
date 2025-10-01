frappe.pages['installment_products'].on_page_load = function(wrapper) {
    console.log('installment-products page loaded successfully'); // Debugging uchun

    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Installment Products - Qo‘shish',
        single_column: true
    });

    // Editable jadvalni render qilish (save qilishdan oldin)
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
                            <th style="width:80px">O'chirish</th>
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
                    <button id="addRowBtn" class="btn btn-primary" style="background-color: blue; color: white;">+ Mahsulot qo'shish</button>
                    <button class="btn btn-success ms-2" style="background-color: green; color: white;" id="saveAllBtn">Save & Continue</button>
                    <button class="btn btn-outline-secondary ms-2" id="backBtn">Orqaga</button>
                </div>
                <div class="text-muted">* majburiy maydonlar</div>
            </div>
        </div>
    `);

    let rowCount = 0; // Row raqamlari
    let suppliers = []; // Dinamik supplierlar

    // Supplierlarni yuklash
    function loadSuppliers() {
        return new Promise((resolve) => {
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Supplier',
                    fields: ['name'],
                    limit_page_length: 0
                },
                callback: (r) => {
                    if (r.message) {
                        suppliers = r.message.map(s => s.name);
                        console.log('Supplierlar yuklandi:', suppliers); // Debug uchun
                    } else {
                        console.warn('Supplierlar topilmadi yoki xato:', r.exc);
                        suppliers = []; // Agar xato bo‘lsa, bo‘sh massiv qoldirish
                    }
                    resolve();
                },
                error: (err) => {
                    console.error('Supplier yuklashda xato:', err);
                    suppliers = [];
                    resolve();
                }
            });
        });
    }

    // Sahifa yuklanganda supplierlarni yuklash
    loadSuppliers().then(() => {
        // Yangi mahsulot qo'shish
        page.main.find('#addRowBtn').on('click', addProductRow);

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

            // Supplier selectni to'ldirish
            const sel = newRow.find('.prod-supplier');
            renderSupplierOptions(sel, data.supplier || "");

            sel.on('change', function() {
                if (this.value === "add_new") {
                    const newSup = prompt("Yangi yetkazib beruvchi nomini kiriting:");
                    if (newSup && newSup.trim()) {
                        frappe.call({
                            method: 'frappe.client.insert',
                            args: {
                                doc: {
                                    doctype: 'Supplier',
                                    supplier_name: newSup.trim(),
                                    supplier_type: 'Company'
                                }
                            },
                            callback: (r) => {
                                if (!r.exc) {
                                    suppliers.push(newSup.trim());
                                    page.main.find('.prod-supplier').each((i, s) => renderSupplierOptions($(s)));
                                    this.value = newSup.trim();
                                    console.log('Yangi supplier qo‘shildi:', newSup); // Debug uchun
                                } else {
                                    showError('Yangi supplier qo\'shishda xato: ' + r.exc);
                                }
                            }
                        });
                    } else {
                        this.value = "";
                    }
                }
            });

            // Remove row
            newRow.find('.remove-row').on('click', function() {
                newRow.remove();
                reorderRows();
                updateTotal();
            });

            // Price o'zgarganda jami ni yangilash
            newRow.find('[data-field="price"]').on('input', updateTotal);

            return newRow;
        }

        // Row indexlarini qayta tartibga solish
        function reorderRows() {
            page.main.find('#products-table_tbody tr').each((i, r) => {
                $(r).find('.row-index').text(i + 1);
            });
        }

        // Jami summani yangilash
        function updateTotal() {
            let total = 0;
            page.main.find('#products-table_tbody [data-field="price"]').each(function() {
                total += parseFloat($(this).val()) || 0;
            });
            page.main.find('#total-sum').text(total.toLocaleString());
        }

        // Dastlab 1 yangi satr qo'shish
        addProductRow();

        // Save & Continue
        page.main.find('#saveAllBtn').on('click', validateAndSaveProducts);

        function validateAndSaveProducts() {
            const rows = page.main.find('#products-table_tbody tr');
            if (rows.length === 0) {
                showError("Iltimos, kamida bitta mahsulot qo'shing.");
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
                    return false; // Break the loop
                }

                products.push({
                    product_name,
                    price,
                    imei,
                    icloud,
                    phone_number,
                    supplier
                });
            });

            if (hasError) {
                showError("Barcha satrlar uchun: Mahsulot nomi, Narx, Telefon raqami va Yetkazib beruvchi majburiy.");
                return;
            }

            // Saqlash va standart list sahifasiga o'tish
            let savedCount = 0;
            products.forEach((doc) => {
                frappe.call({
                    method: 'frappe.client.insert',
                    args: {
                        doc: {
                            doctype: 'installment_product',
                            product_name: doc.product_name,
                            price: doc.price,
                            imei: doc.imei,
                            icloud: doc.icloud,
                            phone_number: doc.phone_number,
                            supplier: doc.supplier,
                            is_active: 1
                        }
                    },
                    callback: (r) => {
                        if (!r.exc) {
                            savedCount++;
                            if (savedCount === products.length) {
                                showSuccessMessage('Mahsulotlar muvaffaqiyatli saqlandi!');
                                setTimeout(() => {
                                    frappe.set_route('list', 'installment_product');
                                }, 2000);
                            }
                        } else {
                            showError('Xato: ' + r.exc);
                        }
                    }
                });
            });
        }

        // Xatolik ko‘rsatish
        function showError(txt) {
            const box = page.main.find('#prodError');
            box.css('display', 'block').text(txt);
            setTimeout(() => box.css('display', 'none'), 5000);
        }

        // Muvaffaqiyat xabarini ko‘rsatish
        function showSuccessMessage(txt) {
            const box = page.main.find('#saveMessage');
            box.css('display', 'block').text(txt);
            setTimeout(() => box.css('display', 'none'), 5000);
        }

        // Orqaga tugmasi
        page.main.find('#backBtn').on('click', () => history.back());
    });

    // Supplier options render
    function renderSupplierOptions(selectEl, current = "") {
        selectEl.empty();
        if (suppliers.length > 0) {
            suppliers.forEach(s => {
                const opt = $('<option>').val(s).text(s);
                selectEl.append(opt);
            });
        } else {
            console.warn('Supplierlar ro‘yxati bo‘sh!');
            const opt = $('<option>').val("").text("Supplierlar yuklanmadi");
            selectEl.append(opt);
        }
        const addOpt = $('<option>').val("add_new").text("+ Yangi yetkazib beruvchi qo'shish");
        selectEl.append(addOpt);

        if (current && suppliers.includes(current)) {
            selectEl.val(current);
        } else if (!current && suppliers.length > 0) {
            selectEl.val(suppliers[0]); // Avvalgi qiymat bo‘lmasa, birinchi supplier’ni tanlash
        }
    }
};
