frappe.pages['installment_wizard'].on_page_load = function(wrapper) {
    let page = frappe.ui.make_app_page({
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

        this.wizard_data = {
            calculator: null,
            products: [],
            customer: null,
            customer_photo: null,
            passport_file_url: null,
            existing_customer: null
        };

        this.setup();
    }

    setup() {
        this.make_ui();
        this.setup_navigation();
        this.show_step(1);
    }

    make_ui() {
        const html = `
            <div class="wizard-container" style="max-width: 1200px; margin: 20px auto;">
                <div class="progress-bar-container" style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <div class="steps-wrapper" style="display: flex; justify-content: space-between; position: relative;">
                        ${this.get_progress_steps_html()}
                    </div>
                </div>

                <div class="step-content" style="min-height: 500px; padding: 30px; background: white; border: 1px solid #d1d8dd; border-radius: 8px;">
                    <!-- Step content will be loaded here -->
                </div>

                <div class="navigation-buttons" style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px; display: flex; justify-content: space-between;">
                    <button class="btn btn-default btn-prev" style="display: none;">
                        <i class="fa fa-arrow-left"></i> Orqaga
                    </button>
                    <button class="btn btn-primary btn-next" style="margin-left: auto;">
                        Keyingi <i class="fa fa-arrow-right"></i>
                    </button>
                    <button class="btn btn-success btn-submit" style="display: none; margin-left: auto;">
                        <i class="fa fa-check"></i> Tasdiqlash
                    </button>
                </div>
            </div>
        `;

        this.wrapper.html(html);
    }

    get_progress_steps_html() {
        const steps = ['Kalkulyator', 'Mahsulotlar', 'Mijoz', 'Yakuniy'];
        return steps.map((label, i) => `
            <div class="step-item" data-step="${i + 1}" style="flex: 1; text-align: center; position: relative;">
                <div class="step-circle" style="width: 50px; height: 50px; border-radius: 50%; background: #e0e0e0; color: #666; display: inline-flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; margin-bottom: 10px;">
                    ${i + 1}
                </div>
                <div class="step-label" style="font-size: 14px; color: #666;">${label}</div>
            </div>
        `).join('');
    }

    setup_navigation() {
        this.wrapper.find('.btn-next').on('click', () => {
            this.validate_and_next();
        });

        this.wrapper.find('.btn-prev').on('click', () => {
            this.show_step(this.current_step - 1);
        });

        this.wrapper.find('.btn-submit').on('click', () => {
            this.submit_application();
        });
    }

    show_step(step) {
        this.current_step = step;
        this.update_progress_ui();
        this.update_navigation_buttons();
        this.render_step_content();
    }

    update_progress_ui() {
        this.wrapper.find('.step-item').each((i, el) => {
            const $el = $(el);
            const stepNum = parseInt($el.data('step'));
            const $circle = $el.find('.step-circle');
            const $label = $el.find('.step-label');

            if (stepNum < this.current_step) {
                $circle.css({background: '#28a745', color: 'white'});
                $label.css({color: '#28a745', fontWeight: 'bold'});
            } else if (stepNum === this.current_step) {
                $circle.css({background: '#2490ef', color: 'white', boxShadow: '0 0 0 4px rgba(36,144,239,0.2)'});
                $label.css({color: '#2490ef', fontWeight: 'bold'});
            } else {
                $circle.css({background: '#e0e0e0', color: '#666', boxShadow: 'none'});
                $label.css({color: '#666', fontWeight: 'normal'});
            }
        });
    }

    update_navigation_buttons() {
        this.wrapper.find('.btn-prev').toggle(this.current_step > 1);
        this.wrapper.find('.btn-next').toggle(this.current_step < this.total_steps);
        this.wrapper.find('.btn-submit').toggle(this.current_step === this.total_steps);
    }

    render_step_content() {
        const content = this.wrapper.find('.step-content');

        switch(this.current_step) {
            case 1:
                this.render_calculator(content);
                break;
            case 2:
                this.render_products(content);
                break;
            case 3:
                this.render_customer(content);
                break;
            case 4:
                this.render_summary(content);
                break;
        }
    }

    // STEP 1: CALCULATOR
    render_calculator(content) {
        const html = `
            <h3 style="margin-bottom: 25px; padding-bottom: 10px; border-bottom: 2px solid #2490ef;">Bo'lib to'lash kalkulyatori</h3>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Tannarx (USD) *</label>
                        <input type="number" class="form-control" id="tannarx" value="${this.wizard_data.calculator?.tannarx || ''}">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Boshlang'ich to'lov (USD) *</label>
                        <input type="number" class="form-control" id="boshlangich_tolov" value="${this.wizard_data.calculator?.boshlangich_tolov || ''}">
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <label>Muddat (oy) *</label>
                        <input type="number" class="form-control" id="muddat" value="${this.wizard_data.calculator?.muddat || ''}">
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label>Oylik to'lov (USD) *</label>
                        <input type="number" class="form-control" id="oylik_tolov" value="${this.wizard_data.calculator?.oylik_tolov || ''}">
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label>Boshlanish sanasi *</label>
                        <input type="date" class="form-control" id="boshlanish_sanasi" value="${this.wizard_data.calculator?.boshlanish_sanasi || ''}">
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <button class="btn btn-primary btn-block" id="btn-calculate">
                        <i class="fa fa-calculator"></i> Hisoblash
                    </button>
                </div>
                <div class="col-md-6">
                    <button class="btn btn-success btn-block" id="btn-create-schedule" style="display: none;">
                        <i class="fa fa-table"></i> Jadval yaratish
                    </button>
                </div>
            </div>

            <div id="calc-results" style="display: none; margin-top: 20px;">
                <div class="alert alert-info">
                    <h4>Natijalar:</h4>
                    <table class="table table-bordered">
                        <tr><td><strong>Umumiy to'lov:</strong></td><td id="res-umumiy">0</td></tr>
                        <tr><td><strong>Sof foyda:</strong></td><td id="res-foyda">0</td></tr>
                        <tr><td><strong>Foiz:</strong></td><td id="res-foiz">0%</td></tr>
                    </table>
                </div>
            </div>

            <div id="schedule-table" style="display: none; margin-top: 20px;">
                <h4>To'lov jadvali</h4>
                <div class="table-responsive">
                    <table class="table table-bordered">
                        <thead class="table-primary">
                            <tr>
                                <th>Oy</th>
                                <th>Sana</th>
                                <th>Summa</th>
                                <th>To'langan</th>
                                <th>Qolgan</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="schedule-body"></tbody>
                    </table>
                </div>
            </div>
        `;

        content.html(html);

        content.find('#btn-calculate').on('click', () => this.calculate());
        content.find('#btn-create-schedule').on('click', () => this.create_schedule());

        if (this.wizard_data.calculator?.schedule) {
            this.show_schedule();
        }
    }

    calculate() {
        const tannarx = parseFloat($('#tannarx').val()) || 0;
        const boshlangich = parseFloat($('#boshlangich_tolov').val()) || 0;
        const muddat = parseInt($('#muddat').val()) || 0;
        const oylik = parseFloat($('#oylik_tolov').val()) || 0;
        const sana = $('#boshlanish_sanasi').val();

        if (!tannarx || !muddat || !oylik || !sana) {
            frappe.msgprint('Barcha maydonlarni to\'ldiring!');
            return;
        }

        const umumiy = boshlangich + (oylik * muddat);
        const foyda = umumiy - tannarx;
        const foiz = (foyda / tannarx) * 100;

        this.wizard_data.calculator = {
            tannarx, boshlangich_tolov: boshlangich, muddat,
            oylik_tolov: oylik, boshlanish_sanasi: sana,
            umumiy_tolov: umumiy, sof_foyda: foyda, foiz: foiz,
            schedule: []
        };

        $('#res-umumiy').text(umumiy.toFixed(2) + ' USD');
        $('#res-foyda').text(foyda.toFixed(2) + ' USD');
        $('#res-foiz').text(foiz.toFixed(2) + '%');
        $('#calc-results').show();
        $('#btn-create-schedule').show();
    }

    create_schedule() {
        const calc = this.wizard_data.calculator;
        const start = new Date(calc.boshlanish_sanasi);
        calc.schedule = [];

        for (let i = 1; i <= calc.muddat; i++) {
            const payDate = new Date(start);
            payDate.setMonth(payDate.getMonth() + i);

            calc.schedule.push({
                oy: i,
                tolov_sanasi: payDate.toISOString().split('T')[0],
                tolov_summasi: calc.oylik_tolov,
                tolangan: 0,
                qolgan: calc.oylik_tolov
            });
        }

        this.show_schedule();
    }

    show_schedule() {
        const tbody = $('#schedule-body');
        tbody.empty();

        this.wizard_data.calculator.schedule.forEach((row, idx) => {
            tbody.append(`
                <tr>
                    <td>${row.oy}</td>
                    <td><input type="date" class="form-control form-control-sm" value="${row.tolov_sanasi}" data-idx="${idx}" data-field="tolov_sanasi"></td>
                    <td><input type="number" class="form-control form-control-sm" value="${row.tolov_summasi}" data-idx="${idx}" data-field="tolov_summasi"></td>
                    <td><input type="number" class="form-control form-control-sm" value="${row.tolangan}" data-idx="${idx}" data-field="tolangan"></td>
                    <td>${row.qolgan.toFixed(2)}</td>
                    <td><button class="btn btn-danger btn-sm btn-del" data-idx="${idx}"><i class="fa fa-trash"></i></button></td>
                </tr>
            `);
        });

        tbody.find('input').on('change', (e) => {
            const idx = $(e.target).data('idx');
            const field = $(e.target).data('field');
            const val = $(e.target).val();

            this.wizard_data.calculator.schedule[idx][field] = field === 'tolov_sanasi' ? val : parseFloat(val);

            const item = this.wizard_data.calculator.schedule[idx];
            item.qolgan = item.tolov_summasi - item.tolangan;

            this.show_schedule();
        });

        tbody.find('.btn-del').on('click', (e) => {
            const idx = $(e.target).closest('button').data('idx');
            this.wizard_data.calculator.schedule.splice(idx, 1);
            this.show_schedule();
        });

        $('#schedule-table').show();
    }

  // STEP 2: PRODUCTS
    render_products(content) {
        const html = `
            <h3 style="margin-bottom: 25px; padding-bottom: 10px; border-bottom: 2px solid #2490ef;">Mahsulotlar</h3>

            <button class="btn btn-success" id="btn-add-product">
                <i class="fa fa-plus"></i> Mahsulot qo'shish
            </button>

            <div id="products-list" style="margin-top: 20px;"></div>

            <div class="alert alert-info" style="margin-top: 20px;">
                <strong>Jami:</strong> <span id="total-products">0</span> ta mahsulot |
                <strong>Summa:</strong> <span id="total-price">0.00</span> USD
            </div>

            <div id="price-warning" class="alert alert-warning" style="display: none; margin-top: 10px;">
                <i class="fa fa-exclamation-triangle"></i>
                <strong>Ogohlantirish:</strong> Mahsulotlar umumiy narxi (<span id="products-sum">0</span> USD)
                kalkulyatordagi tannarxga (<span id="calculator-tannarx">0</span> USD) teng emas!
            </div>
        `;

        content.html(html);

        content.find('#btn-add-product').on('click', () => this.show_product_dialog());

        this.render_products_list();
        this.check_price_match();
    }

    show_product_dialog(edit_index = null) {
        const isEdit = edit_index !== null;
        const editData = isEdit ? this.wizard_data.products[edit_index] : {};

        const d = new frappe.ui.Dialog({
            title: isEdit ? 'Mahsulotni tahrirlash' : 'Mahsulot qo\'shish',
            fields: [
                {
                    fieldname: 'product_name',
                    label: 'Mahsulot nomi',
                    fieldtype: 'Data',
                    reqd: 1,
                    default: editData.product_name || ''
                },
                {
                    fieldname: 'imei',
                    label: 'IMEI',
                    fieldtype: 'Data',
                    default: editData.imei || ''
                },
                {
                    fieldname: 'price',
                    label: 'Narx (USD)',
                    fieldtype: 'Currency',
                    reqd: 1,
                    default: editData.price || 0
                },
                {
                    fieldname: 'supplier',
                    label: 'Yetkazib beruvchi',
                    fieldtype: 'Link',
                    options: 'Supplier',
                    default: editData.supplier || ''
                },
                {
                    fieldname: 'comment',
                    label: 'Izoh',
                    fieldtype: 'Small Text',
                    default: editData.comment || ''
                }
            ],
            primary_action_label: isEdit ? 'Saqlash' : 'Qo\'shish',
            primary_action: (values) => {
                if (isEdit) {
                    this.wizard_data.products[edit_index] = values;
                } else {
                    this.wizard_data.products.push(values);
                }
                this.render_products_list();
                this.check_price_match();
                d.hide();
            }
        });
        d.show();
    }

    render_products_list() {
        const list = $('#products-list');
        list.empty();

        let total = 0;
        this.wizard_data.products.forEach((p, i) => {
            total += parseFloat(p.price) || 0;

            list.append(`
                <div class="card" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 5px;">
                    <div class="row">
                        <div class="col-md-8">
                            <h4>${p.product_name}</h4>
                            <p><strong>IMEI:</strong> ${p.imei || 'N/A'} | <strong>Narx:</strong> ${p.price} USD</p>
                            ${p.comment ? `<p><em>${p.comment}</em></p>` : ''}
                        </div>
                        <div class="col-md-4 text-right">
                            <button class="btn btn-primary btn-sm" onclick="window.wizard.edit_product(${i})" style="margin-right: 5px;">
                                <i class="fa fa-edit"></i> Tahrirlash
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="window.wizard.remove_product(${i})">
                                <i class="fa fa-trash"></i> O'chirish
                            </button>
                        </div>
                    </div>
                </div>
            `);
        });

        $('#total-products').text(this.wizard_data.products.length);
        $('#total-price').text(total.toFixed(2));
        $('#products-sum').text(total.toFixed(2));

        window.wizard = this;
    }

    edit_product(index) {
        this.show_product_dialog(index);
    }

    remove_product(index) {
        frappe.confirm(
            'Bu mahsulotni o\'chirmoqchimisiz?',
            () => {
                this.wizard_data.products.splice(index, 1);
                this.render_products_list();
                this.check_price_match();
            }
        );
    }

    check_price_match() {
        if (!this.wizard_data.calculator) {
            return;
        }

        const calculator_tannarx = parseFloat(this.wizard_data.calculator.tannarx) || 0;
        const products_total = this.wizard_data.products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

        $('#calculator-tannarx').text(calculator_tannarx.toFixed(2));

        if (Math.abs(calculator_tannarx - products_total) > 0.01) {
            $('#price-warning').show();
            return false;
        } else {
            $('#price-warning').hide();
            return true;
        }
    }
    // STEP 3: CUSTOMER
    render_customer(content) {
        const html = `
            <h3 style="margin-bottom: 25px; padding-bottom: 10px; border-bottom: 2px solid #2490ef;">Mijoz ma'lumotlari</h3>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Passport ID *</label>
                        <input type="text" class="form-control" id="passport_id" value="${this.wizard_data.customer?.passport_id || ''}">
                    </div>
                </div>
                <div class="col-md-6">
                    <button class="btn btn-info" id="btn-check-customer" style="margin-top: 25px;">
                        <i class="fa fa-search"></i> Tekshirish
                    </button>
                </div>
            </div>

            <div id="customer-exists" style="display:none; margin-bottom: 15px;">
                <div class="alert alert-warning">
                    <i class="fa fa-exclamation-triangle"></i> Bu mijoz avval ro'yxatdan o'tgan!
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Ism *</label>
                        <input type="text" class="form-control" id="ism" value="${this.wizard_data.customer?.ism || ''}">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Familya *</label>
                        <input type="text" class="form-control" id="familya" value="${this.wizard_data.customer?.familya || ''}">
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Telefon raqam *</label>
                        <input type="text" class="form-control" id="telefon_raqam" value="${this.wizard_data.customer?.telefon_raqam || ''}">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Manzil *</label>
                        <input type="text" class="form-control" id="manzil" value="${this.wizard_data.customer?.manzil || ''}">
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>JSHSHIR</label>
                        <input type="text" class="form-control" id="jshshir" value="${this.wizard_data.customer?.jshshir || ''}">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Karta raqam</label>
                        <input type="text" class="form-control" id="karta_raqam" value="${this.wizard_data.customer?.karta_raqam || ''}">
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Passport nusxasi</label>
                        <input type="file" class="form-control" id="passport_nusxa" accept=".pdf,.jpg,.jpeg,.png">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Mijoz rasmi</label>
                        <button class="btn btn-primary btn-block" id="btn-camera">
                            <i class="fa fa-camera"></i> Rasm olish
                        </button>
                    </div>
                </div>
            </div>

            <div id="camera-section" style="display:none; margin-top: 15px;">
                <video id="video" width="100%" height="300" autoplay style="border: 2px solid #ddd; border-radius: 5px;"></video>
                <button class="btn btn-success btn-block" id="btn-capture" style="margin-top: 10px;">Suratga olish</button>
                <canvas id="canvas" style="display:none;"></canvas>
            </div>

            <div id="photo-preview" style="display:none; margin-top: 15px;">
                <img id="captured-img" width="100%" style="max-height: 300px; border: 2px solid #ddd; border-radius: 5px;">
                <button class="btn btn-warning btn-block" id="btn-retake" style="margin-top: 10px;">Qayta olish</button>
            </div>

            <div id="sales-history" style="display:none; margin-top: 20px;">
                <h4>Sotuvlar tarixi</h4>
                <table class="table table-bordered">
                    <thead><tr><th>Mahsulotlar</th><th>Narx</th><th>Sana</th><th>Status</th></tr></thead>
                    <tbody id="history-body"></tbody>
                </table>
            </div>
        `;

        content.html(html);

        content.find('#btn-check-customer').on('click', () => this.check_customer());
        content.find('#btn-camera').on('click', () => this.start_camera());
        content.find('#btn-capture').on('click', () => this.capture_photo());
        content.find('#btn-retake').on('click', () => this.retake_photo());
    }

    check_customer() {
        const passport_id = $('#passport_id').val();

        if (!passport_id) {
            frappe.msgprint('Passport ID kiriting!');
            return;
        }

        frappe.call({
            method: 'investment.api.check_customer_by_passport',
            args: {passport_id: passport_id},
            callback: (r) => {
                if (r.message && r.message.exists) {
                    const c = r.message.customer;

                    // Maydonlarni to'ldirish
                    $('#ism').val(c.ism || '');
                    $('#familya').val(c.familya || '');
                    $('#telefon_raqam').val(c.telefon_raqam || '');
                    $('#manzil').val(c.manzil || '');
                    $('#jshshir').val(c.jshshir || '');
                    $('#karta_raqam').val(c.karta_raqam || '');

                    // Ogohlantirish ko'rsatish
                    $('#customer-exists').show();

                    // Sotuvlar tarixini ko'rsatish
                    if (r.message.sales_history && r.message.sales_history.length > 0) {
                        this.render_sales_history(r.message.sales_history);
                    } else {
                        $('#sales-history').hide();
                    }

                    frappe.show_alert({
                        message: 'Mijoz ma\'lumotlari topildi va yuklandi!',
                        indicator: 'blue'
                    }, 5);

                } else {
                    // Yangi mijoz
                    $('#customer-exists').hide();
                    $('#sales-history').hide();

                    frappe.show_alert({
                        message: 'Bu yangi mijoz',
                        indicator: 'green'
                    }, 3);
                }
            },
            error: (r) => {
                frappe.msgprint({
                    title: 'Xatolik',
                    message: 'Mijozni tekshirishda xatolik yuz berdi',
                    indicator: 'red'
                });
                console.error('Check customer error:', r);
            }
        });
    }

    render_sales_history(history) {
        const tbody = $('#history-body');
        tbody.empty();

        if (!history || history.length === 0) {
            $('#sales-history').hide();
            return;
        }

        history.forEach(item => {
            const statusClass = item.status === 'To\'langan' ? 'success' :
                               item.status === 'Qarzdor' ? 'danger' : 'warning';

            const row = `
                <tr>
                    <td>${item.maxsulotlar || 'N/A'}</td>
                    <td>${item.narx ? item.narx + ' USD' : '0 USD'}</td>
                    <td>${item.sana || 'N/A'}</td>
                    <td><span class="label label-${statusClass}">${item.status || 'Noma\'lum'}</span></td>
                </tr>
            `;

            tbody.append(row);
        });

        $('#sales-history').show();
    }

    start_camera() {
        navigator.mediaDevices.getUserMedia({video: true})
            .then(stream => {
                this.stream = stream;
                const video = document.getElementById('video');
                video.srcObject = stream;
                $('#camera-section').show();
                $('#btn-camera').hide();
            })
            .catch(err => {
                frappe.msgprint('Kamera xatosi: ' + err.message);
            });
    }

    capture_photo() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        this.wizard_data.customer_photo = canvas.toDataURL('image/jpeg');

        $('#captured-img').attr('src', this.wizard_data.customer_photo);
        $('#camera-section').hide();
        $('#photo-preview').show();

        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
        }
    }

    retake_photo() {
        $('#photo-preview').hide();
        $('#btn-camera').show();
        this.wizard_data.customer_photo = null;
    }

    // STEP 4: SUMMARY
    render_summary(content) {
        const calc = this.wizard_data.calculator;
        const prods = this.wizard_data.products;
        const cust = this.wizard_data.customer;

        let total_price = 0;
        prods.forEach(p => total_price += parseFloat(p.price) || 0);

        const html = `
            <h3 style="margin-bottom: 25px; padding-bottom: 10px; border-bottom: 2px solid #2490ef;">Umumiy ma'lumotlar</h3>

            <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                <h4><i class="fa fa-user"></i> Mijoz</h4>
                <p><strong>F.I.O:</strong> ${cust.ism} ${cust.familya}</p>
                <p><strong>Passport:</strong> ${cust.passport_id}</p>
                <p><strong>Telefon:</strong> ${cust.telefon_raqam}</p>
            </div>

            <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                <h4><i class="fa fa-shopping-cart"></i> Mahsulotlar (${prods.length} ta)</h4>
                ${prods.map(p => `<p>• ${p.product_name} - ${p.price} USD</p>`).join('')}
                <p><strong>Jami:</strong> ${total_price.toFixed(2)} USD</p>
            </div>

            <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                <h4><i class="fa fa-calculator"></i> To'lov</h4>
                <p><strong>Tannarx:</strong> ${calc.tannarx} USD</p>
                <p><strong>Boshlang'ich:</strong> ${calc.boshlangich_tolov} USD</p>
                <p><strong>Muddat:</strong> ${calc.muddat} oy</p>
                <p><strong>Oylik:</strong> ${calc.oylik_tolov} USD</p>
                <p><strong>Umumiy:</strong> ${calc.umumiy_tolov.toFixed(2)} USD</p>
                <p><strong>Foyda:</strong> ${calc.sof_foyda.toFixed(2)} USD (${calc.foiz.toFixed(2)}%)</p>
            </div>
        `;

        content.html(html);
    }

    // VALIDATION & NAVIGATION
    validate_and_next() {
        if (this.current_step === 1) {
            if (!this.wizard_data.calculator) {
                frappe.msgprint('Hisoblash tugmasini bosing!');
                return;
            }
            if (!this.wizard_data.calculator.schedule || this.wizard_data.calculator.schedule.length === 0) {
                frappe.msgprint('Jadval yarating!');
                return;
            }
        } else if (this.current_step === 2) {
            if (this.wizard_data.products.length === 0) {
                frappe.msgprint('Kamida bitta mahsulot qo\'shing!');
                return;
            }
            // Step 2 da narx tekshiruvi:
			if (!this.check_price_match()) {
				frappe.confirm('Davom etmoqchimisiz?', () => {
					// Continue
				});
				return;
			}
        } else if (this.current_step === 3) {
            const cust = {
                passport_id: $('#passport_id').val(),
                ism: $('#ism').val(),
                familya: $('#familya').val(),
                telefon_raqam: $('#telefon_raqam').val(),
                manzil: $('#manzil').val(),
                jshshir: $('#jshshir').val(),
                karta_raqam: $('#karta_raqam').val()
            };

            if (!cust.passport_id || !cust.ism || !cust.familya || !cust.telefon_raqam || !cust.manzil) {
                frappe.msgprint('Majburiy maydonlarni to\'ldiring!');
                return;
            }

            this.wizard_data.customer = cust;

            // Upload passport file if exists
            const file = $('#passport_nusxa')[0].files[0];
            if (file) {
                this.upload_file(file);
            }
        }

        this.show_step(this.current_step + 1);
    }

    upload_file(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_private', 1);

        fetch('/api/method/upload_file', {
            method: 'POST',
            headers: {
                'X-Frappe-CSRF-Token': frappe.csrf_token
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                this.wizard_data.passport_file_url = data.message.file_url;
            }
        })
        .catch(err => {
            console.error('File upload error:', err);
        });
    }

    submit_application() {
        frappe.confirm(
            'Barcha ma\'lumotlar to\'g\'ri? Arizani tasdiqlamoqchimisiz?',
            () => {
                // Prepare data
                const submitData = {
                    calculator: this.wizard_data.calculator,
                    products: this.wizard_data.products,
                    customer: this.wizard_data.customer,
                    customer_photo: this.wizard_data.customer_photo || null,
                    passport_file_url: this.wizard_data.passport_file_url || null,
                    existing_customer: this.wizard_data.existing_customer || null
                };

                // Log for debugging
                console.log('Submitting data:', {
                    has_photo: !!submitData.customer_photo,
                    has_passport_file: !!submitData.passport_file_url,
                    customer: submitData.customer
                });

                frappe.call({
                    method: 'investment.api.create_installment_application',
                    args: {
                        data: submitData
                    },
                    freeze: true,
                    freeze_message: 'Ariza yaratilmoqda...',
                    callback: (r) => {
                        if (r.message && r.message.success) {
                            frappe.msgprint({
                                title: 'Muvaffaqiyatli!',
                                message: `Ariza yaratildi: ${r.message.application}<br>Mijoz: ${r.message.customer}`,
                                indicator: 'green'
                            });

                            // Reset wizard
                            setTimeout(() => {
                                this.wizard_data = {
                                    calculator: null,
                                    products: [],
                                    customer: null,
                                    customer_photo: null,
                                    passport_file_url: null,
                                    existing_customer: null
                                };
                                this.show_step(1);
                            }, 2000);
                        }
                    },
                    error: (r) => {
                        console.error('Submit error:', r);
                        frappe.msgprint({
                            title: 'Xatolik',
                            message: 'Ariza yaratishda xatolik yuz berdi! Console\'ni tekshiring.',
                            indicator: 'red'
                        });
                    }
                });
            }
        );
    }
}
