frappe.pages['installment_wizard'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Nasiya Ariza Wizard',
        single_column: true
    });

    new InstallmentWizard(page);
};

class InstallmentWizard {
    constructor(page) {
        this.page = page;
        this.wrapper = $(this.page.body);
        this.current_step = 1;
        this.total_steps = 4;

        // Wizard ma'lumotlari
        this.wizard_data = {
            calculator: null,
            products: [],
            customer: null,
            application: null
        };

        this.init();
    }

    init() {
        this.wrapper.html(this.get_wizard_html());
        this.setup_navigation();
        this.render_step(1);
    }

    get_wizard_html() {
        return `
            <div class="installment-wizard">
                <!-- Progress Bar -->
                <div class="wizard-progress">
                    <div class="progress-steps">
                        <div class="step ${this.current_step >= 1 ? 'active' : ''}" data-step="1">
                            <div class="step-number">1</div>
                            <div class="step-label">Kalkulyator</div>
                        </div>
                        <div class="step ${this.current_step >= 2 ? 'active' : ''}" data-step="2">
                            <div class="step-number">2</div>
                            <div class="step-label">Mahsulotlar</div>
                        </div>
                        <div class="step ${this.current_step >= 3 ? 'active' : ''}" data-step="3">
                            <div class="step-number">3</div>
                            <div class="step-label">Mijoz</div>
                        </div>
                        <div class="step ${this.current_step >= 4 ? 'active' : ''}" data-step="4">
                            <div class="step-number">4</div>
                            <div class="step-label">Yakuniy</div>
                        </div>
                    </div>
                </div>

                <!-- Step Content -->
                <div class="wizard-content">
                    <div id="step-content"></div>
                </div>

                <!-- Navigation Buttons -->
                <div class="wizard-navigation">
                    <button class="btn btn-default btn-prev" style="display:none;">
                        <i class="fa fa-arrow-left"></i> Orqaga
                    </button>
                    <button class="btn btn-primary btn-next">
                        Keyingi <i class="fa fa-arrow-right"></i>
                    </button>
                    <button class="btn btn-success btn-submit" style="display:none;">
                        <i class="fa fa-check"></i> Tasdiqlash
                    </button>
                </div>
            </div>
        `;
    }

    setup_navigation() {
        const me = this;

        this.wrapper.find('.btn-next').on('click', () => {
            me.validate_and_next();
        });

        this.wrapper.find('.btn-prev').on('click', () => {
            me.go_to_step(me.current_step - 1);
        });

        this.wrapper.find('.btn-submit').on('click', () => {
            me.submit_application();
        });
    }

    render_step(step) {
        this.current_step = step;
        this.update_progress();
        this.update_navigation();

        const content = this.wrapper.find('#step-content');
        content.empty();

        switch(step) {
            case 1:
                this.render_calculator_step(content);
                break;
            case 2:
                this.render_products_step(content);
                break;
            case 3:
                this.render_customer_step(content);
                break;
            case 4:
                this.render_summary_step(content);
                break;
        }
    }

    // STEP 1: Calculator
    render_calculator_step(content) {
        const html = `
            <div class="step-container">
                <h3>Bo'lib to'lash kalkulyatori</h3>
                <div class="calculator-form">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Tannarx (USD)</label>
                                <input type="number" class="form-control" id="calc-tannarx" placeholder="0.00">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Boshlang'ich to'lov (USD)</label>
                                <input type="number" class="form-control" id="calc-boshlangich" placeholder="0.00">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Muddat (oy)</label>
                                <input type="number" class="form-control" id="calc-muddat" placeholder="0">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Boshlanish sanasi</label>
                                <input type="date" class="form-control" id="calc-sana">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-12">
                            <button class="btn btn-primary btn-block" id="calc-calculate">
                                <i class="fa fa-calculator"></i> Hisoblash
                            </button>
                        </div>
                    </div>
                    <div id="calc-results" style="display:none; margin-top: 20px;">
                        <div class="alert alert-info">
                            <h4>Hisoblash natijalari:</h4>
                            <table class="table table-bordered">
                                <tr>
                                    <td><strong>Oylik to'lov:</strong></td>
                                    <td id="result-oylik">0.00 USD</td>
                                </tr>
                                <tr>
                                    <td><strong>Umumiy to'lov:</strong></td>
                                    <td id="result-umumiy">0.00 USD</td>
                                </tr>
                                <tr>
                                    <td><strong>Sof foyda:</strong></td>
                                    <td id="result-foyda">0.00 USD</td>
                                </tr>
                                <tr>
                                    <td><strong>Foiz:</strong></td>
                                    <td id="result-foiz">0%</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        content.html(html);

        // Calculator logic
        content.find('#calc-calculate').on('click', () => {
            this.calculate();
        });

        // Agar avval hisoblangan bo'lsa, ma'lumotlarni yuklash
        if (this.wizard_data.calculator) {
            this.load_calculator_data();
        }
    }

    calculate() {
        const tannarx = parseFloat($('#calc-tannarx').val()) || 0;
        const boshlangich = parseFloat($('#calc-boshlangich').val()) || 0;
        const muddat = parseInt($('#calc-muddat').val()) || 0;
        const sana = $('#calc-sana').val();

        if (!tannarx || !muddat || !sana) {
            frappe.msgprint('Iltimos, barcha majburiy maydonlarni to\'ldiring!');
            return;
        }

        const qarz = tannarx - boshlangich;
        const foiz_stavka = 0.15; // 15% yillik foiz
        const oylik_foiz = foiz_stavka / 12;

        // Oylik to'lov formulasi
        const oylik = qarz * (oylik_foiz * Math.pow(1 + oylik_foiz, muddat)) /
                      (Math.pow(1 + oylik_foiz, muddat) - 1);

        const umumiy = boshlangich + (oylik * muddat);
        const foyda = umumiy - tannarx;
        const foiz = (foyda / tannarx) * 100;

        // Natijalarni saqlash
        this.wizard_data.calculator = {
            tannarx,
            boshlangich_tolov: boshlangich,
            muddat,
            boshlanish_sanasi: sana,
            oylik_tolov: oylik,
            umumiy_tolov: umumiy,
            sof_foyda: foyda,
            foiz: foiz
        };

        // Natijalarni ko'rsatish
        $('#result-oylik').text(oylik.toFixed(2) + ' USD');
        $('#result-umumiy').text(umumiy.toFixed(2) + ' USD');
        $('#result-foyda').text(foyda.toFixed(2) + ' USD');
        $('#result-foiz').text(foiz.toFixed(2) + '%');
        $('#calc-results').slideDown();
    }

    load_calculator_data() {
        const data = this.wizard_data.calculator;
        $('#calc-tannarx').val(data.tannarx);
        $('#calc-boshlangich').val(data.boshlangich_tolov);
        $('#calc-muddat').val(data.muddat);
        $('#calc-sana').val(data.boshlanish_sanasi);

        $('#result-oylik').text(data.oylik_tolov.toFixed(2) + ' USD');
        $('#result-umumiy').text(data.umumiy_tolov.toFixed(2) + ' USD');
        $('#result-foyda').text(data.sof_foyda.toFixed(2) + ' USD');
        $('#result-foiz').text(data.foiz.toFixed(2) + '%');
        $('#calc-results').show();
    }

    // STEP 2: Products
    render_products_step(content) {
        const html = `
            <div class="step-container">
                <h3>Mahsulotlarni tanlash</h3>
                <div class="products-section">
                    <button class="btn btn-success" id="add-product">
                        <i class="fa fa-plus"></i> Mahsulot qo'shish
                    </button>
                    <div id="products-list" style="margin-top: 20px;">
                        <!-- Mahsulotlar ro'yxati -->
                    </div>
                    <div class="products-summary" style="margin-top: 20px;">
                        <div class="alert alert-info">
                            <h4>Jami:</h4>
                            <p><strong>Mahsulotlar soni:</strong> <span id="products-count">0</span></p>
                            <p><strong>Umumiy narx:</strong> <span id="products-total">0.00 USD</span></p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        content.html(html);

        content.find('#add-product').on('click', () => {
            this.show_product_dialog();
        });

        this.render_products_list();
    }

    show_product_dialog() {
        const me = this;
        const dialog = new frappe.ui.Dialog({
            title: 'Mahsulot qo\'shish',
            fields: [
                {
                    fieldname: 'product_name',
                    label: 'Mahsulot nomi',
                    fieldtype: 'Data',
                    reqd: 1
                },
                {
                    fieldname: 'imei',
                    label: 'IMEI',
                    fieldtype: 'Data'
                },
                {
                    fieldname: 'phone_number',
                    label: 'Telefon raqami',
                    fieldtype: 'Data'
                },
                {
                    fieldname: 'icloud',
                    label: 'iCloud',
                    fieldtype: 'Data'
                },
                {
                    fieldname: 'price',
                    label: 'Narx (USD)',
                    fieldtype: 'Currency',
                    reqd: 1
                },
                {
                    fieldname: 'supplier',
                    label: 'Yetkazib beruvchi',
                    fieldtype: 'Link',
                    options: 'Supplier'
                },
                {
                    fieldname: 'comment',
                    label: 'Izoh',
                    fieldtype: 'Small Text'
                }
            ],
            primary_action_label: 'Qo\'shish',
            primary_action(values) {
                me.wizard_data.products.push(values);
                me.render_products_list();
                dialog.hide();
            }
        });

        dialog.show();
    }

    render_products_list() {
        const list = $('#products-list');
        list.empty();

        if (this.wizard_data.products.length === 0) {
            list.html('<p class="text-muted">Hech qanday mahsulot qo\'shilmagan</p>');
            $('#products-count').text('0');
            $('#products-total').text('0.00 USD');
            return;
        }

        let total = 0;
        this.wizard_data.products.forEach((product, index) => {
            total += parseFloat(product.price) || 0;

            const card = $(`
                <div class="product-card" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 5px;">
                    <div class="row">
                        <div class="col-md-8">
                            <h4>${product.product_name}</h4>
                            <p><strong>IMEI:</strong> ${product.imei || 'N/A'}</p>
                            <p><strong>Telefon:</strong> ${product.phone_number || 'N/A'}</p>
                            <p><strong>Narx:</strong> ${product.price} USD</p>
                            ${product.comment ? `<p><strong>Izoh:</strong> ${product.comment}</p>` : ''}
                        </div>
                        <div class="col-md-4 text-right">
                            <button class="btn btn-danger btn-sm btn-remove-product" data-index="${index}">
                                <i class="fa fa-trash"></i> O'chirish
                            </button>
                        </div>
                    </div>
                </div>
            `);

            list.append(card);
        });

        // O'chirish tugmasi
        $('.btn-remove-product').on('click', (e) => {
            const index = $(e.currentTarget).data('index');
            this.wizard_data.products.splice(index, 1);
            this.render_products_list();
        });

        $('#products-count').text(this.wizard_data.products.length);
        $('#products-total').text(total.toFixed(2) + ' USD');
    }

    // STEP 3: Customer
    render_customer_step(content) {
        const html = `
            <div class="step-container">
                <h3>Mijoz ma'lumotlari</h3>
                <div class="customer-form">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Ism *</label>
                                <input type="text" class="form-control" id="customer-ism">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Familya *</label>
                                <input type="text" class="form-control" id="customer-familya">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Passport ID *</label>
                                <input type="text" class="form-control" id="customer-passport">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>JSHSHIR</label>
                                <input type="text" class="form-control" id="customer-jshshir">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Telefon raqam *</label>
                                <input type="text" class="form-control" id="customer-telefon">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Qo'shimcha raqam</label>
                                <input type="text" class="form-control" id="customer-qoshimcha">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Manzil *</label>
                                <input type="text" class="form-control" id="customer-manzil">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Karta raqam</label>
                                <input type="text" class="form-control" id="customer-karta">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        content.html(html);

        // Agar avval kiritilgan bo'lsa
        if (this.wizard_data.customer) {
            this.load_customer_data();
        }
    }

    load_customer_data() {
        const data = this.wizard_data.customer;
        $('#customer-ism').val(data.ism);
        $('#customer-familya').val(data.familya);
        $('#customer-passport').val(data.passport_id);
        $('#customer-jshshir').val(data.jshshir);
        $('#customer-telefon').val(data.telefon_raqam);
        $('#customer-qoshimcha').val(data.qoshimcha_raqam);
        $('#customer-manzil').val(data.manzil);
        $('#customer-karta').val(data.karta_raqam);
    }

    // STEP 4: Summary
    render_summary_step(content) {
        const calc = this.wizard_data.calculator;
        const products = this.wizard_data.products;
        const customer = this.wizard_data.customer;

        let total_price = 0;
        products.forEach(p => total_price += parseFloat(p.price) || 0);

        const html = `
            <div class="step-container">
                <h3>Umumiy ma'lumotlar</h3>

                <!-- Mijoz ma'lumotlari -->
                <div class="summary-section">
                    <h4><i class="fa fa-user"></i> Mijoz</h4>
                    <table class="table table-bordered">
                        <tr><td><strong>F.I.O:</strong></td><td>${customer.ism} ${customer.familya}</td></tr>
                        <tr><td><strong>Passport:</strong></td><td>${customer.passport_id}</td></tr>
                        <tr><td><strong>Telefon:</strong></td><td>${customer.telefon_raqam}</td></tr>
                        <tr><td><strong>Manzil:</strong></td><td>${customer.manzil}</td></tr>
                    </table>
                </div>

                <!-- Mahsulotlar -->
                <div class="summary-section">
                    <h4><i class="fa fa-shopping-cart"></i> Mahsulotlar (${products.length} ta)</h4>
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Mahsulot</th>
                                <th>IMEI</th>
                                <th>Narx</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.map(p => `
                                <tr>
                                    <td>${p.product_name}</td>
                                    <td>${p.imei || 'N/A'}</td>
                                    <td>${p.price} USD</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="2">Jami:</th>
                                <th>${total_price.toFixed(2)} USD</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <!-- To'lov ma'lumotlari -->
                <div class="summary-section">
                    <h4><i class="fa fa-calculator"></i> To'lov ma'lumotlari</h4>
                    <table class="table table-bordered">
                        <tr><td><strong>Tannarx:</strong></td><td>${calc.tannarx.toFixed(2)} USD</td></tr>
                        <tr><td><strong>Boshlang'ich to'lov:</strong></td><td>${calc.boshlangich_tolov.toFixed(2)} USD</td></tr>
                        <tr><td><strong>Muddat:</strong></td><td>${calc.muddat} oy</td></tr>
                        <tr><td><strong>Oylik to'lov:</strong></td><td>${calc.oylik_tolov.toFixed(2)} USD</td></tr>
                        <tr><td><strong>Boshlanish sanasi:</strong></td><td>${calc.boshlanish_sanasi}</td></tr>
                        <tr class="success"><td><strong>Umumiy to'lov:</strong></td><td><strong>${calc.umumiy_tolov.toFixed(2)} USD</strong></td></tr>
                        <tr class="info"><td><strong>Sof foyda:</strong></td><td><strong>${calc.sof_foyda.toFixed(2)} USD (${calc.foiz.toFixed(2)}%)</strong></td></tr>
                    </table>
                </div>
            </div>
        `;

        content.html(html);
    }

    // Validation and Navigation
    validate_and_next() {
        if (this.current_step === 1) {
            if (!this.wizard_data.calculator) {
                frappe.msgprint('Iltimos, avval hisoblash tugmasini bosing!');
                return;
            }
        } else if (this.current_step === 2) {
            if (this.wizard_data.products.length === 0) {
                frappe.msgprint('Iltimos, kamida bitta mahsulot qo\'shing!');
                return;
            }
        } else if (this.current_step === 3) {
            const customer = {
                ism: $('#customer-ism').val(),
                familya: $('#customer-familya').val(),
                passport_id: $('#customer-passport').val(),
                telefon_raqam: $('#customer-telefon').val(),
                manzil: $('#customer-manzil').val(),
                jshshir: $('#customer-jshshir').val(),
                qoshimcha_raqam: $('#customer-qoshimcha').val(),
                karta_raqam: $('#customer-karta').val()
            };

            if (!customer.ism || !customer.familya || !customer.passport_id || !customer.telefon_raqam || !customer.manzil) {
                frappe.msgprint('Iltimos, majburiy maydonlarni to\'ldiring!');
                return;
            }

            this.wizard_data.customer = customer;
        }

        this.go_to_step(this.current_step + 1);
    }

    go_to_step(step) {
        if (step < 1 || step > this.total_steps) return;
        this.render_step(step);
    }

    update_progress() {
        this.wrapper.find('.step').each((i, el) => {
            const $el = $(el);
            const stepNum = parseInt($el.data('step'));

            if (stepNum < this.current_step) {
                $el.addClass('completed').removeClass('active');
            } else if (stepNum === this.current_step) {
                $el.addClass('active').removeClass('completed');
            } else {
                $el.removeClass('active completed');
            }
        });
    }

    update_navigation() {
        const prevBtn = this.wrapper.find('.btn-prev');
        const nextBtn = this.wrapper.find('.btn-next');
        const submitBtn = this.wrapper.find('.btn-submit');

        prevBtn.toggle(this.current_step > 1);
        nextBtn.toggle(this.current_step < this.total_steps);
        submitBtn.toggle(this.current_step === this.total_steps);
    }

    submit_application() {
        const me = this;

        frappe.confirm(
            'Barcha ma\'lumotlar to\'g\'rimi? Arizani tasdiqlamoqchimisiz?',
            () => {
                frappe.call({
                    method: 'investment.api.create_installment_application',
                    args: {
                        data: me.wizard_data
                    },
                    callback: (r) => {
                        if (r.message) {
                            frappe.msgprint({
                                title: 'Muvaffaqiyatli!',
                                message: 'Ariza muvaffaqiyatli yaratildi!',
                                indicator: 'green'
                            });

                            // Wizard'ni qayta boshlash
                            me.reset_wizard();
                        }
                    }
                });
            }
        );
    }

    reset_wizard() {
        this.wizard_data = {
            calculator: null,
            products: [],
            customer: null,
            application: null
        };
        this.render_step(1);
    }
}
